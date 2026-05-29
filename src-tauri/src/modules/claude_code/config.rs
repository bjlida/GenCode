//! Claude Code configuration file management.
//!
//! Manages `~/.gencode/claude-config/settings.json` for GenCode-scoped
//! Claude Code settings, keeping them isolated from the user's global
//! `~/.claude/settings.json`.

use std::path::PathBuf;

use serde_json::{json, Value};

/// Path to the GenCode-scoped Claude Code config directory.
pub fn config_dir() -> Result<PathBuf, String> {
    Ok(dirs::home_dir()
        .ok_or_else(|| "无法解析用户主目录".to_string())?
        .join(".gencode")
        .join("claude-config"))
}

/// Path to GenCode's Claude Code settings.json.
pub fn settings_path() -> Result<PathBuf, String> {
    Ok(config_dir()?.join("settings.json"))
}

/// Path to GenCode's MCP config file.
pub fn mcp_config_path() -> Result<PathBuf, String> {
    Ok(config_dir()?.join(".mcp.json"))
}

/// Ensure the config directory exists.
pub fn ensure_config_dir() -> Result<(), String> {
    let dir = config_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建配置目录失败: {e}"))
}

/// Read the current settings.json, returning empty object if absent or unparseable.
pub fn read_settings() -> Result<Value, String> {
    let path = settings_path()?;
    match std::fs::read_to_string(&path) {
        Ok(s) if !s.trim().is_empty() => {
            serde_json::from_str(&s).map_err(|e| format!("settings.json 格式错误: {e}"))
        }
        _ => Ok(json!({})),
    }
}

/// Write settings.json atomically (sibling temp + rename).
pub fn write_settings(settings: &Value) -> Result<(), String> {
    ensure_config_dir()?;
    let path = settings_path()?;
    let tmp = path.with_extension("json.gencode-tmp");
    let out = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(&tmp, &out).map_err(|e| format!("写入配置失败: {e}"))?;
    std::fs::rename(&tmp, &path).map_err(|e| {
        let _ = std::fs::remove_file(&tmp);
        format!("保存配置失败: {e}")
    })
}

/// Update a specific key in Claude Code settings.
pub fn set_config_value(key: &str, value: Value) -> Result<(), String> {
    let mut settings = read_settings()?;
    if let Some(obj) = settings.as_object_mut() {
        obj.insert(key.to_string(), value);
    }
    write_settings(&settings)
}

/// Get a specific key from Claude Code settings.
pub fn get_config_value(key: &str) -> Result<Option<Value>, String> {
    let settings = read_settings()?;
    Ok(settings.get(key).cloned())
}
