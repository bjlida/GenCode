//! Environment preparation for Claude Code child processes.
//!
//! Reads secrets from the OS keychain and constructs the environment
//! variables that Claude Code needs at startup.

use std::collections::HashMap;

use super::config;
use tauri::AppHandle;
#[cfg(target_os = "linux")]
use tauri::Manager;

const KEYRING_SERVICE: &str = "gencode-ai";
const ANTHROPIC_KEY_ACCOUNT: &str = "anthropic-api-key";

/// Resolve the Anthropic API key from the OS keychain.
pub fn resolve_api_key(app: &AppHandle) -> Result<Option<String>, String> {
    // We can't call async Tauri commands from sync context, so we read directly.
    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        let entry = keyring::Entry::new(KEYRING_SERVICE, ANTHROPIC_KEY_ACCOUNT)
            .map_err(|e| e.to_string())?;
        match entry.get_password() {
            Ok(v) => Ok(Some(v)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }
    #[cfg(target_os = "linux")]
    {
        // On Linux, read from the file store directly.
        let dir = app
            .path()
            .app_local_data_dir()
            .map_err(|e| e.to_string())?;
        let path = dir.join("secrets.json");
        if !path.exists() {
            return Ok(None);
        }
        let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
        let map: HashMap<String, String> =
            serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
        let key = format!("{}::{}", KEYRING_SERVICE, ANTHROPIC_KEY_ACCOUNT);
        Ok(map.get(&key).cloned())
    }
}

/// Build the environment variables for a Claude Code process.
const CHINESE_LOCALE: &str = "zh_CN.UTF-8";

pub fn build_env(
    app: &AppHandle,
    workspace_root: &str,
    extra_env: &HashMap<String, String>,
) -> Result<HashMap<String, String>, String> {
    // Best-effort: Claude Code reads locale from settings.json at startup.
    let _ = config::ensure_chinese_locale();

    let mut env = HashMap::new();

    // Pass the API key if available.
    if let Some(key) = resolve_api_key(app)? {
        env.insert("ANTHROPIC_API_KEY".to_string(), key);
    }

    // Tell Claude Code it's running inside GenCode.
    env.insert("GENCODE_TERMINAL".to_string(), "1".to_string());
    env.insert("GENCODE_WORKSPACE_ROOT".to_string(), workspace_root.to_string());

    // Chinese locale for Claude Code CLI UI and subprocess output.
    env.insert("LANG".to_string(), CHINESE_LOCALE.to_string());
    env.insert("LC_ALL".to_string(), CHINESE_LOCALE.to_string());
    #[cfg(unix)]
    env.insert("LC_MESSAGES".to_string(), CHINESE_LOCALE.to_string());

    // Merge any caller-supplied extras (overrides above defaults).
    for (k, v) in extra_env {
        env.insert(k.clone(), v.clone());
    }

    Ok(env)
}
