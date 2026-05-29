//! Security sandbox — state management and Tauri commands.
//!
//! Provides user-configurable security policies that gate AI-initiated
//! file, command, and network operations.

mod enforce;
mod policy;

use std::collections::HashMap;
use std::sync::Mutex;

use tauri::State;

pub use enforce::{check_command, check_read, EnforcementResult};
pub use policy::{
    permissive_preset, read_policy, standard_preset, strict_preset, write_policy, SecurityPolicy,
};

/// Runtime sandbox state tracking active AI sessions.
#[derive(Default)]
pub struct SandboxState {
    /// Per-session process counts (session_id -> count).
    #[allow(dead_code)]
    pub process_counts: Mutex<HashMap<u32, u32>>,
    /// Currently active policy.
    pub policy: Mutex<SecurityPolicy>,
}

impl SandboxState {
    pub fn new(policy: SecurityPolicy) -> Self {
        Self {
            process_counts: Mutex::new(HashMap::new()),
            policy: Mutex::new(policy),
        }
    }
}

// ---- Policy management commands ----

#[tauri::command]
pub fn sandbox_get_policy(state: State<'_, SandboxState>) -> Result<SecurityPolicy, String> {
    let policy = state.policy.lock().map_err(|e| e.to_string())?;
    Ok(policy.clone())
}

#[tauri::command]
pub fn sandbox_update_policy(
    state: State<'_, SandboxState>,
    policy: SecurityPolicy,
) -> Result<(), String> {
    write_policy(&policy)?;
    let mut current = state.policy.lock().map_err(|e| e.to_string())?;
    *current = policy;
    Ok(())
}

#[tauri::command]
pub fn sandbox_reset_policy(state: State<'_, SandboxState>) -> Result<(), String> {
    let default_policy = standard_preset();
    write_policy(&default_policy)?;
    let mut current = state.policy.lock().map_err(|e| e.to_string())?;
    *current = default_policy;
    Ok(())
}

#[tauri::command]
pub fn sandbox_policy_presets() -> Result<HashMap<String, SecurityPolicy>, String> {
    let mut presets = HashMap::new();
    presets.insert("permissive".to_string(), permissive_preset());
    presets.insert("standard".to_string(), standard_preset());
    presets.insert("strict".to_string(), strict_preset());
    Ok(presets)
}

// ---- Enforcement commands ----

#[derive(Debug, Clone, serde::Serialize)]
pub struct EnforcementResponse {
    pub allowed: bool,
    pub needs_approval: bool,
    pub reason: Option<String>,
}

impl From<EnforcementResult> for EnforcementResponse {
    fn from(r: EnforcementResult) -> Self {
        match r {
            EnforcementResult::Allowed => EnforcementResponse {
                allowed: true,
                needs_approval: false,
                reason: None,
            },
            EnforcementResult::NeedsApproval => EnforcementResponse {
                allowed: true,
                needs_approval: true,
                reason: None,
            },
            EnforcementResult::Denied(reason) => EnforcementResponse {
                allowed: false,
                needs_approval: false,
                reason: Some(reason),
            },
        }
    }
}

#[tauri::command]
pub fn sandbox_check_read(
    state: State<'_, SandboxState>,
    path: String,
) -> Result<EnforcementResponse, String> {
    let policy = state.policy.lock().map_err(|e| e.to_string())?;
    Ok(enforce::check_read(&policy, &path).into())
}

#[tauri::command]
pub fn sandbox_check_write(
    state: State<'_, SandboxState>,
    path: String,
) -> Result<EnforcementResponse, String> {
    let policy = state.policy.lock().map_err(|e| e.to_string())?;
    Ok(enforce::check_write(&policy, &path).into())
}

#[tauri::command]
pub fn sandbox_check_command(
    state: State<'_, SandboxState>,
    command: String,
) -> Result<EnforcementResponse, String> {
    let policy = state.policy.lock().map_err(|e| e.to_string())?;
    Ok(enforce::check_command(&policy, &command).into())
}

#[tauri::command]
pub fn sandbox_check_network(
    state: State<'_, SandboxState>,
    domain: String,
) -> Result<EnforcementResponse, String> {
    let policy = state.policy.lock().map_err(|e| e.to_string())?;
    Ok(enforce::check_network(&policy, &domain).into())
}
