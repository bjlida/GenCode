//! Security policy model, presets, and persistence.
//!
//! Policies are stored as `~/.gencode/security-policy.json`.
//! Three built-in presets: permissive, standard, strict.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

/// Categories of operations that may require user approval.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ApprovalCategory {
    #[serde(rename = "file_write")]
    FileWrite,
    #[serde(rename = "file_delete")]
    FileDelete,
    #[serde(rename = "command_exec")]
    CommandExec,
    #[serde(rename = "network")]
    Network,
    #[serde(rename = "process_mgmt")]
    ProcessMgmt,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityPolicy {
    /// Base workspace directory — paths outside this are denied by default.
    pub workspace_root: String,

    /// Additional paths the AI is allowed to access (beyond workspace_root).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub allowed_paths: Vec<String>,

    /// Paths that are always denied, even within workspace_root or allowed_paths.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub denied_paths: Vec<String>,

    /// Shell commands the AI is allowed to run.
    /// Empty = all commands allowed (subject to existing security checks).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub allowed_commands: Vec<String>,

    /// Shell commands that are always denied.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub denied_commands: Vec<String>,

    /// Network domains the AI is allowed to reach.
    /// Empty = all domains allowed (subject to existing SSRF protection).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub allowed_domains: Vec<String>,

    /// Maximum file size the AI can read, in MB. 0 = unlimited.
    #[serde(default)]
    pub max_file_size_mb: u32,

    /// Maximum number of concurrent subprocesses the AI can spawn. 0 = unlimited.
    #[serde(default)]
    pub max_process_count: u32,

    /// Operation categories that require explicit user approval.
    #[serde(default = "default_approvals")]
    pub require_approval_for: Vec<ApprovalCategory>,

    /// Human-readable name of this policy preset.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub preset_name: Option<String>,
}

fn default_approvals() -> Vec<ApprovalCategory> {
    vec![
        ApprovalCategory::FileWrite,
        ApprovalCategory::FileDelete,
        ApprovalCategory::CommandExec,
        ApprovalCategory::ProcessMgmt,
    ]
}

impl Default for SecurityPolicy {
    fn default() -> Self {
        standard_preset()
    }
}

/// 宽松 (Permissive) — broad access, minimal friction.
pub fn permissive_preset() -> SecurityPolicy {
    let home = dirs::home_dir()
        .map(|p| p.display().to_string())
        .unwrap_or_default();

    SecurityPolicy {
        workspace_root: home.clone(),
        allowed_paths: vec![home],
        denied_paths: vec![],
        allowed_commands: vec![],
        denied_commands: vec![],
        allowed_domains: vec![],
        max_file_size_mb: 0,
        max_process_count: 0,
        require_approval_for: vec![ApprovalCategory::FileWrite, ApprovalCategory::FileDelete],
        preset_name: Some("宽松".to_string()),
    }
}

/// 标准 (Standard) — workspace-scoped, balanced safety. Default.
pub fn standard_preset() -> SecurityPolicy {
    SecurityPolicy {
        workspace_root: String::new(),
        allowed_paths: vec![],
        denied_paths: vec![
            ".env".to_string(),
            ".env.*".to_string(),
            "*.pem".to_string(),
            "*.key".to_string(),
            ".ssh/".to_string(),
            ".gnupg/".to_string(),
            ".aws/".to_string(),
            ".kube/".to_string(),
        ],
        allowed_commands: vec![],
        denied_commands: vec![
            "rm -rf /".to_string(),
            "mkfs".to_string(),
            "fdisk".to_string(),
            "dd if=".to_string(),
        ],
        allowed_domains: vec![],
        max_file_size_mb: 50,
        max_process_count: 8,
        require_approval_for: vec![
            ApprovalCategory::FileWrite,
            ApprovalCategory::FileDelete,
            ApprovalCategory::CommandExec,
            ApprovalCategory::ProcessMgmt,
        ],
        preset_name: Some("标准".to_string()),
    }
}

/// 严格 (Strict) — maximum safety, minimal trust.
pub fn strict_preset() -> SecurityPolicy {
    SecurityPolicy {
        workspace_root: String::new(),
        allowed_paths: vec![],
        denied_paths: vec![
            ".env".to_string(),
            ".env.*".to_string(),
            "*.pem".to_string(),
            "*.key".to_string(),
            ".ssh/".to_string(),
            ".gnupg/".to_string(),
            ".aws/".to_string(),
            ".kube/".to_string(),
            "/etc/".to_string(),
            "/proc/".to_string(),
            "/sys/".to_string(),
            "/dev/".to_string(),
        ],
        allowed_commands: vec![
            "ls".to_string(),
            "cat".to_string(),
            "head".to_string(),
            "tail".to_string(),
            "grep".to_string(),
            "find".to_string(),
            "wc".to_string(),
            "sort".to_string(),
            "uniq".to_string(),
        ],
        denied_commands: vec![],
        allowed_domains: vec![],
        max_file_size_mb: 10,
        max_process_count: 2,
        require_approval_for: vec![
            ApprovalCategory::FileWrite,
            ApprovalCategory::FileDelete,
            ApprovalCategory::CommandExec,
            ApprovalCategory::Network,
            ApprovalCategory::ProcessMgmt,
        ],
        preset_name: Some("严格".to_string()),
    }
}

/// Path to the security policy file.
fn policy_path() -> Result<PathBuf, String> {
    Ok(dirs::home_dir()
        .ok_or_else(|| "无法解析用户主目录".to_string())?
        .join(".gencode")
        .join("security-policy.json"))
}

/// Read the current policy from disk, falling back to standard preset.
pub fn read_policy() -> Result<SecurityPolicy, String> {
    let path = policy_path()?;
    match std::fs::read_to_string(&path) {
        Ok(s) if !s.trim().is_empty() => {
            serde_json::from_str(&s).map_err(|e| format!("安全策略文件格式错误: {e}"))
        }
        _ => Ok(SecurityPolicy::default()),
    }
}

/// Write policy to disk atomically.
pub fn write_policy(policy: &SecurityPolicy) -> Result<(), String> {
    let path = policy_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("创建配置目录失败: {e}"))?;
    }
    let tmp = path.with_extension("json.gencode-tmp");
    let out = serde_json::to_string_pretty(policy).map_err(|e| e.to_string())?;
    std::fs::write(&tmp, &out).map_err(|e| format!("写入安全策略失败: {e}"))?;
    std::fs::rename(&tmp, &path).map_err(|e| {
        let _ = std::fs::remove_file(&tmp);
        format!("保存安全策略失败: {e}")
    })
}
