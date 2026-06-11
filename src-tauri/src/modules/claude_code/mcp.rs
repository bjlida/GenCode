//! MCP (Model Context Protocol) server configuration and management.
//!
//! Reads and writes `~/.gencode/claude-config/.mcp.json`, which Claude Code
//! picks up natively. GenCode provides a visual editor for this config
//! so users don't need to hand-edit JSON.

use serde::{Deserialize, Serialize};

use super::config;

/// A single MCP server entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub name: String,
    pub command: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub args: Vec<String>,
    #[serde(default, skip_serializing_if = "std::collections::HashMap::is_empty")]
    pub env: std::collections::HashMap<String, String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

/// Full MCP configuration file contents — matches Claude Code's expected format.
/// See https://docs.anthropic.com/en/docs/claude-code/mcp
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct McpConfig {
    #[serde(
        rename = "mcpServers",
        default,
        skip_serializing_if = "std::collections::HashMap::is_empty"
    )]
    pub mcp_servers: std::collections::HashMap<String, McpServerConfig>,
}

/// Read the MCP configuration from disk.
pub fn read_config() -> Result<McpConfig, String> {
    let path = config::mcp_config_path()?;
    match std::fs::read_to_string(&path) {
        Ok(s) if !s.trim().is_empty() => {
            serde_json::from_str(&s).map_err(|e| format!(".mcp.json 格式错误: {e}"))
        }
        _ => Ok(McpConfig::default()),
    }
}

/// Write the MCP configuration to disk atomically.
pub fn write_config(cfg: &McpConfig) -> Result<(), String> {
    config::ensure_config_dir()?;
    let path = config::mcp_config_path()?;
    let tmp = path.with_extension("json.gencode-tmp");
    let out = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    std::fs::write(&tmp, &out).map_err(|e| format!("写入 MCP 配置失败: {e}"))?;
    std::fs::rename(&tmp, &path).map_err(|e| {
        let _ = std::fs::remove_file(&tmp);
        format!("保存 MCP 配置失败: {e}")
    })
}

/// Check if a command is executable by probing it with `--version`.
/// Also validates that the command path does not contain traversal components
/// or unexpected path separators that could escape a trusted directory.
pub fn validate_command(command: &str) -> Result<bool, String> {
    // Reject path traversal and embedded separators in the command name.
    if command.contains("..") {
        return Err("命令路径包含路径穿越 (..)".to_string());
    }
    // If it looks like a path (contains / or \), require it to be absolute.
    if command.contains('/') || command.contains('\\') {
        let path = std::path::Path::new(command);
        if !path.is_absolute() {
            return Err("命令路径必须是绝对路径或简单的可执行文件名".to_string());
        }
    }
    let mut cmd = std::process::Command::new(command);
    cmd.arg("--version");
    cmd.stdout(std::process::Stdio::null());
    cmd.stderr(std::process::Stdio::null());
    match cmd.status() {
        Ok(s) => Ok(s.success()),
        Err(_) => Ok(false),
    }
}

// ---- Tauri commands ----

#[tauri::command]
pub fn mcp_list_servers() -> Result<Vec<McpServerConfig>, String> {
    read_config().map(|c| c.mcp_servers.into_values().collect())
}

#[tauri::command]
pub fn mcp_add_server(server: McpServerConfig) -> Result<(), String> {
    let mut cfg = read_config()?;
    cfg.mcp_servers.insert(server.name.clone(), server);
    write_config(&cfg)
}

#[tauri::command]
pub fn mcp_remove_server(name: String) -> Result<(), String> {
    let mut cfg = read_config()?;
    cfg.mcp_servers.remove(&name);
    write_config(&cfg)
}

#[tauri::command]
pub fn mcp_toggle_server(name: String, enabled: bool) -> Result<(), String> {
    let mut cfg = read_config()?;
    if let Some(s) = cfg.mcp_servers.get_mut(&name) {
        s.enabled = enabled;
    }
    write_config(&cfg)
}

#[tauri::command]
pub fn mcp_validate_server(command: String) -> Result<bool, String> {
    validate_command(&command)
}
