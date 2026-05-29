//! Claude Code native binary runtime — download, install, version management.
//!
//! GenCode manages a bundled copy of the Claude Code native binary in the app
//! data directory. It can also detect and use a system-installed Claude Code.
//! The active source (system vs bundled) is configurable via SourcePreference.

use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri::Manager;

use super::detect;

const RUNTIME_DIR: &str = "runtime";
const CLAUDE_DIR: &str = "claude";

/// Display info about the current Claude Code runtime.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeStatus {
    /// Whether Claude Code is available (either system or bundled).
    pub installed: bool,
    /// Currently active version string (e.g. "2.1.19").
    pub version: Option<String>,
    /// Latest available version from the CDN.
    pub latest_version: Option<String>,
    /// Whether an update is available.
    pub update_available: bool,
    /// Where the active Claude Code comes from.
    pub source: detect::SourceType,
    /// Path to the active binary.
    pub binary_path: Option<String>,
}

#[derive(Default)]
pub struct ClaudeCodeState {
    pub status: Mutex<Option<RuntimeStatus>>,
}

fn runtime_root(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join(RUNTIME_DIR);
    std::fs::create_dir_all(&dir).map_err(|e| format!("create runtime dir: {e}"))?;
    Ok(dir)
}

fn bundled_claude_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(runtime_root(app)?.join(CLAUDE_DIR))
}

/// Resolve the active Claude Code binary path based on preference.
pub fn find_claude_code(
    app: &AppHandle,
    preference: &detect::SourcePreference,
) -> Result<detect::ActiveClaude, String> {
    let root = runtime_root(app)?;
    detect::resolve_claude(preference, &root)
}

// ── Status ──────────────────────────────────────────────────────────────────

/// Check status of Claude Code (system + bundled + latest version from CDN).
pub fn check_status(
    app: &AppHandle,
    preference: &detect::SourcePreference,
) -> RuntimeStatus {
    let root = match runtime_root(app) {
        Ok(r) => r,
        Err(_) => {
            return RuntimeStatus {
                installed: false,
                version: None,
                latest_version: None,
                update_available: false,
                source: detect::SourceType::NotFound,
                binary_path: None,
            };
        }
    };

    let active = detect::resolve_claude(preference, &root);
    let latest_version = detect::fetch_latest_version().ok();

    let (installed, version, source, binary_path) = match &active {
        Ok(a) => (true, Some(a.version.clone()), a.source.clone(), Some(a.path.display().to_string())),
        Err(_) => (false, None, detect::SourceType::NotFound, None),
    };

    let update_available = match (&version, &latest_version) {
        (Some(current), Some(latest)) => detect::version_gte(latest, current),
        _ => false,
    };

    RuntimeStatus {
        installed,
        version,
        latest_version,
        update_available,
        source,
        binary_path,
    }
}

// ── Install / Update ────────────────────────────────────────────────────────

/// Download and install the latest Claude Code native binary into GenCode's
/// runtime directory.
pub fn install_claude_code(app: &AppHandle) -> Result<(), String> {
    let version = detect::fetch_latest_version()?;
    let dest_dir = bundled_claude_dir(app)?;
    detect::download_claude_binary(&version, &dest_dir)?;
    log::info!("Claude Code {version} installed to {}", dest_dir.display());
    Ok(())
}

/// Update Claude Code to the latest version.
pub fn update_claude(app: &AppHandle) -> Result<(), String> {
    // Same as install — download fresh binary to the same dir.
    install_claude_code(app)
}
