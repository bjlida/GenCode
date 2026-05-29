pub mod file;
pub mod grep;
pub mod mutate;
pub mod search;
pub mod tree;
pub mod watch;

use std::path::{Path, PathBuf};

use crate::modules::sandbox::{check_read, read_policy};
use crate::modules::workspace::{resolve_path, WorkspaceEnv, WorkspaceRegistry};

/// Resolve `path` against the workspace, canonicalize, verify it is within
/// an authorized workspace root, AND check it against the sandbox policy's
/// denied_paths list. Returns the resolved path.
///
/// For existing paths, canonicalizes and checks the path itself.
/// For non-existing paths, canonicalizes the nearest existing ancestor.
///
/// The sandbox policy file is read on each call — it is a tiny JSON file and
/// the I/O is negligible compared to the actual filesystem operations being
/// gated. This keeps call sites simple: no extra parameter needed.
pub fn require_authorized(
    registry: &WorkspaceRegistry,
    workspace: &WorkspaceEnv,
    path: &str,
) -> Result<PathBuf, String> {
    let resolved = resolve_path(path, workspace);
    // Check sandbox denied_paths before any filesystem operation.
    if let Ok(policy) = read_policy() {
        let check_path = to_canon(&resolved);
        if check_read(&policy, &check_path).is_denied() {
            return Err(format!("路径被安全策略禁止: {}", resolved.display()));
        }
    }
    // Try canonicalizing the path itself (for reads, stats, deletes).
    if let Ok(canon) = std::fs::canonicalize(&resolved) {
        if registry.is_authorized(&canon) {
            // Post-check: re-canonicalize to detect symlink swaps during
            // the authorization check (TOCTOU). If the resolved path
            // changed, a concurrent process replaced it with a symlink.
            if let Ok(recheck) = std::fs::canonicalize(&resolved) {
                if recheck != canon {
                    return Err("path changed during authorization (symlink race)".to_string());
                }
            }
            return Ok(canon);
        }
        return Err(format!("path outside workspace: {}", canon.display()));
    }
    // Path doesn't exist yet — walk up to the nearest existing ancestor so
    // we can still enforce authorization for creates and writes to new files.
    let mut cursor = resolved.clone();
    loop {
        match cursor.parent() {
            Some(parent) => {
                cursor = parent.to_path_buf();
                if let Ok(canon_parent) = std::fs::canonicalize(&cursor) {
                    if registry.is_authorized(&canon_parent) {
                        return Ok(resolved);
                    }
                    return Err(format!(
                        "path outside workspace: {}",
                        canon_parent.display()
                    ));
                }
            }
            None => return Err("path has no parent".to_string()),
        }
    }
}

/// The single canonical-to-display conversion: forward slashes, Windows
/// verbatim `\\?\` prefix stripped. Route every such conversion through here.
pub fn to_canon(p: impl AsRef<Path>) -> String {
    let s = p.as_ref().to_string_lossy();
    #[cfg(windows)]
    {
        strip_verbatim(&s)
    }
    #[cfg(not(windows))]
    {
        // Backslashes are legal in Unix filenames; never rewrite them.
        s.into_owned()
    }
}

// Pure so it stays unit-testable on any host. `\\?\C:\x` -> `C:/x`.
#[cfg_attr(not(windows), allow(dead_code))]
fn strip_verbatim(s: &str) -> String {
    let stripped = if let Some(rest) = s.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{rest}")
    } else if let Some(rest) = s.strip_prefix(r"\\?\") {
        rest.to_string()
    } else {
        s.to_string()
    };
    stripped.replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::strip_verbatim;

    #[test]
    fn strips_drive_verbatim_prefix() {
        assert_eq!(strip_verbatim(r"\\?\C:\Users\foo"), "C:/Users/foo");
    }

    #[test]
    fn rewrites_verbatim_unc_to_share_path() {
        assert_eq!(
            strip_verbatim(r"\\?\UNC\server\share\dir"),
            "//server/share/dir"
        );
    }

    #[test]
    fn passes_through_plain_windows_path() {
        assert_eq!(strip_verbatim(r"C:\Users\foo"), "C:/Users/foo");
    }

    #[test]
    fn leaves_forward_slash_path_unchanged() {
        assert_eq!(strip_verbatim("C:/Users/foo"), "C:/Users/foo");
    }

    #[test]
    fn handles_drive_root() {
        assert_eq!(strip_verbatim(r"\\?\C:\"), "C:/");
    }
}
