pub mod config;
pub mod detect;
mod env;
pub mod mcp;
mod runtime;
mod session;
pub mod skills;

use std::collections::HashMap;

use tauri::ipc::Channel;
use tauri::ipc::Response;
use tauri::AppHandle;
use tauri::State;

pub use detect::SourcePreference;
pub use runtime::{ClaudeCodeState, RuntimeStatus};

use crate::modules::pty;

// ---- Runtime commands ----

#[tauri::command]
pub async fn claude_code_status(
    app: AppHandle,
    state: State<'_, ClaudeCodeState>,
) -> Result<RuntimeStatus, String> {
    let preference = load_preference();
    let app_ref = app.clone();
    let pref_clone = preference.clone();
    let status = tokio::task::spawn_blocking(move || runtime::check_status(&app_ref, &pref_clone))
        .await
        .map_err(|e| e.to_string())?;
    if let Ok(mut cached) = state.status.lock() {
        *cached = Some(status.clone());
    }
    Ok(status)
}

#[tauri::command]
pub async fn claude_code_install(app: AppHandle) -> Result<(), String> {
    let app_ref = app.clone();
    tokio::task::spawn_blocking(move || {
        runtime::install_claude_code(&app_ref)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn claude_code_update(app: AppHandle) -> Result<(), String> {
    let app_ref = app.clone();
    tokio::task::spawn_blocking(move || runtime::update_claude(&app_ref))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn claude_code_check_updates(app: AppHandle) -> Result<RuntimeStatus, String> {
    let preference = load_preference();
    let app_ref = app.clone();
    tokio::task::spawn_blocking(move || runtime::check_status(&app_ref, &preference))
        .await
        .map_err(|e| e.to_string())
}

// ---- Source preference commands ----

/// Get the current source preference (auto/system/bundled).
#[tauri::command]
pub fn claude_code_get_source_preference() -> Result<SourcePreference, String> {
    Ok(load_preference())
}

/// Set the source preference.
#[tauri::command]
pub fn claude_code_set_source_preference(preference: SourcePreference) -> Result<(), String> {
    save_preference(&preference)
}

fn load_preference() -> SourcePreference {
    config::get_config_value("source_preference")
        .ok()
        .flatten()
        .and_then(|v| v.as_str().map(SourcePreference::from_str))
        .unwrap_or_default()
}

fn save_preference(pref: &SourcePreference) -> Result<(), String> {
    let val = serde_json::Value::String(pref.as_str().to_string());
    config::set_config_value("source_preference", val)
}

// ---- Session commands ----

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn claude_code_spawn(
    app: AppHandle,
    state: State<'_, pty::PtyState>,
    cols: u16,
    rows: u16,
    prompt: String,
    cwd: Option<String>,
    model: Option<String>,
    workspace_root: String,
    extra_env: Option<HashMap<String, String>>,
    on_data: Channel<Response>,
    on_exit: Channel<i32>,
) -> Result<u32, String> {
    let preference = load_preference();

    let cfg = session::ClaudeCodeSessionConfig {
        prompt,
        cwd,
        model,
        extra_env: extra_env.unwrap_or_default(),
        workspace_root,
        preference,
    };

    let cmd = session::build_command(&app, &cfg)?;

    pty::pty_open_command(app, state, cols, rows, cmd, on_data, on_exit).await
}

#[tauri::command]
pub async fn claude_code_send(
    state: State<'_, pty::PtyState>,
    session_id: u32,
    instruction: String,
) -> Result<(), String> {
    let data = session::build_followup_instruction(&instruction);
    pty::pty_write(state, session_id, data)
}

#[tauri::command]
pub async fn claude_code_kill(
    state: State<'_, pty::PtyState>,
    session_id: u32,
) -> Result<(), String> {
    pty::pty_close(state, session_id)
}

// ---- Config commands ----

#[tauri::command]
pub async fn claude_code_get_config(key: String) -> Result<Option<serde_json::Value>, String> {
    config::get_config_value(&key)
}

#[tauri::command]
pub async fn claude_code_set_config(key: String, value: serde_json::Value) -> Result<(), String> {
    config::set_config_value(&key, value)
}
