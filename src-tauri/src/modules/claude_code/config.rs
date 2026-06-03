//! Claude Code configuration file management.
//!
//! Manages `~/.gencode/claude-config/settings.json` for GenCode-scoped
//! Claude Code settings, keeping them isolated from the user's global
//! `~/.claude/settings.json`.

use std::path::{Path, PathBuf};

use serde_json::{json, Value};

const CHINESE_LOCALE: &str = "zh_CN.UTF-8";
const CHINESE_LANGUAGE: &str = "chinese";

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

/// Path to the user's global Claude Code settings.json (`~/.claude/settings.json`).
pub fn user_claude_settings_path() -> Result<PathBuf, String> {
    Ok(dirs::home_dir()
        .ok_or_else(|| "无法解析用户主目录".to_string())?
        .join(".claude")
        .join("settings.json"))
}

/// Merge Chinese locale defaults into a settings object without clobbering unrelated keys.
pub fn merge_chinese_locale(mut settings: Value) -> Value {
    if !settings.is_object() {
        settings = json!({});
    }
    let obj = settings.as_object_mut().unwrap();
    obj.entry("language")
        .or_insert_with(|| json!(CHINESE_LANGUAGE));

    let env = obj.entry("env").or_insert_with(|| json!({}));
    if !env.is_object() {
        *env = json!({});
    }
    let env_obj = env.as_object_mut().unwrap();
    env_obj
        .entry("LANG")
        .or_insert_with(|| json!(CHINESE_LOCALE));
    env_obj
        .entry("LC_ALL")
        .or_insert_with(|| json!(CHINESE_LOCALE));
    #[cfg(unix)]
    env_obj
        .entry("LC_MESSAGES")
        .or_insert_with(|| json!(CHINESE_LOCALE));

    settings
}

fn read_json_file(path: &Path) -> Result<Value, String> {
    match std::fs::read_to_string(path) {
        Ok(s) if !s.trim().is_empty() => {
            serde_json::from_str(&s).map_err(|e| format!("{} 格式错误: {e}", path.display()))
        }
        Ok(_) => Ok(json!({})),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(json!({})),
        Err(e) => Err(format!("读取 {}: {e}", path.display())),
    }
}

fn write_json_file_atomic(path: &Path, settings: &Value) -> Result<(), String> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| format!("创建 {}: {e}", dir.display()))?;
    }
    let tmp = path.with_extension("json.gencode-tmp");
    let out = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(&tmp, &out).map_err(|e| format!("写入 {}: {e}", tmp.display()))?;
    std::fs::rename(&tmp, path).map_err(|e| {
        let _ = std::fs::remove_file(&tmp);
        format!("保存 {}: {e}", path.display())
    })
}

/// Ensure GenCode-scoped and user Claude Code settings include Chinese locale defaults.
pub fn ensure_chinese_locale() -> Result<(), String> {
    ensure_config_dir()?;
    let gencode = merge_chinese_locale(read_settings()?);
    write_settings(&gencode)?;

    let user_path = user_claude_settings_path()?;
    let user = merge_chinese_locale(read_json_file(&user_path)?);
    write_json_file_atomic(&user_path, &user)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn merge_chinese_locale_is_idempotent() {
        let once = merge_chinese_locale(json!({}));
        let twice = merge_chinese_locale(once.clone());
        assert_eq!(once, twice);
        assert_eq!(once["language"], CHINESE_LANGUAGE);
        assert_eq!(once["env"]["LANG"], CHINESE_LOCALE);
    }

    #[test]
    fn merge_chinese_locale_preserves_existing_language() {
        let input = json!({ "language": "japanese" });
        let out = merge_chinese_locale(input);
        assert_eq!(out["language"], "japanese");
    }

    #[test]
    fn merge_chinese_locale_preserves_unrelated_keys() {
        let input = json!({ "permissions": { "allow": ["Bash"] } });
        let out = merge_chinese_locale(input);
        assert_eq!(out["permissions"]["allow"][0], "Bash");
        assert_eq!(out["language"], CHINESE_LANGUAGE);
    }
}
