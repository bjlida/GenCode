//! Managed Claude Code session — builds the spawn command and tracks state.

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use super::config;
use super::detect;
use super::env;
use super::runtime;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeCodeSessionConfig {
    pub prompt: String,
    pub cwd: Option<String>,
    pub model: Option<String>,
    pub extra_env: HashMap<String, String>,
    pub workspace_root: String,
    pub preference: detect::SourcePreference,
}

/// Build the full Command to spawn Claude Code in a PTY.
///
/// Resolves the binary based on the source preference (system vs bundled),
/// configures environment variables, and sets the working directory.
pub fn build_command(
    app: &AppHandle,
    cfg: &ClaudeCodeSessionConfig,
) -> Result<Command, String> {
    let active = runtime::find_claude_code(app, &cfg.preference)?;

    // Ensure the GenCode config directory exists for Claude Code settings.
    config::ensure_config_dir()?;

    let env_vars = env::build_env(app, &cfg.workspace_root, &cfg.extra_env)?;

    // Execute the native binary directly.
    let mut cmd = Command::new(&active.path);

    // Pass the user's prompt as a positional argument.
    if !cfg.prompt.is_empty() {
        cmd.arg("-p");
        cmd.arg(&cfg.prompt);
    }

    // Model override.
    if let Some(ref model) = cfg.model {
        cmd.arg("--model");
        cmd.arg(model);
    }

    // Working directory.
    if let Some(ref cwd) = cfg.cwd {
        cmd.current_dir(PathBuf::from(cwd));
    }

    // Inject environment variables.
    for (k, v) in &env_vars {
        cmd.env(k, v);
    }

    Ok(cmd)
}

/// Build a command to send a follow-up message to a running Claude Code session.
/// This writes the instruction to the PTY stdin.
pub fn build_followup_instruction(instruction: &str) -> String {
    // Send the instruction followed by a newline.
    format!("{}\n", instruction)
}
