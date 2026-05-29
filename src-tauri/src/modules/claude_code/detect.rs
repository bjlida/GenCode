//! Claude Code source detection and resolution.
//!
//! Detects system-installed and GenCode-bundled Claude Code, then resolves
//! which one to use based on user preference. Handles cross-platform
//! differences in installation paths and binary naming.

use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};

// ── Platform ────────────────────────────────────────────────────────────────

/// Normalized OS + arch pair matching the Claude Code release CDN layout.
pub struct Platform {
    pub os: String,
    pub arch: String,
    /// "musl" or "".
    pub libc: String,
}

impl Platform {
    /// Detect the current platform (matches bootstrap.sh / bootstrap.ps1 logic).
    pub fn detect() -> Self {
        let os = match std::env::consts::OS {
            "macos" => "darwin",
            "windows" => "win32",
            "linux" => "linux",
            other => other,
        }
        .to_string();

        let arch = match std::env::consts::ARCH {
            "x86_64" | "amd64" => "x64",
            "aarch64" | "arm64" => "arm64",
            other => other,
        }
        .to_string();

        // Linux musl detection (like bootstrap.sh's check).
        let libc = if os == "linux" && is_musl() {
            "musl"
        } else {
            ""
        };

        Platform { os, arch, libc: libc.to_string() }
    }

    /// CDN platform directory name, e.g. "darwin-arm64", "win32-x64", "linux-x64-musl".
    pub fn platform_string(&self) -> String {
        let base = format!("{}-{}", self.os, self.arch);
        if self.libc.is_empty() {
            base
        } else {
            format!("{}-{}", base, self.libc)
        }
    }

    /// Binary filename for this platform ("claude" or "claude.exe").
    pub fn binary_name(&self) -> String {
        if self.os == "win32" {
            "claude.exe".to_string()
        } else {
            "claude".to_string()
        }
    }
}

fn is_musl() -> bool {
    // Check for musl libc indicators.
    if Path::new("/lib/libc.musl-x86_64.so.1").exists()
        || Path::new("/lib/libc.musl-aarch64.so.1").exists()
    {
        return true;
    }
    // Check ldd output as fallback.
    if let Ok(out) = Command::new("ldd").arg("/bin/ls").output() {
        if !out.status.success() {
            return false;
        }
        let s = String::from_utf8_lossy(&out.stdout);
        if s.contains("musl") {
            return true;
        }
    }
    false
}

// ── Source preference ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub enum SourcePreference {
    #[serde(rename = "auto")]
    #[default]
    Auto,
    #[serde(rename = "system")]
    System,
    #[serde(rename = "bundled")]
    Bundled,
}

impl SourcePreference {
    pub fn as_str(&self) -> &str {
        match self {
            SourcePreference::Auto => "auto",
            SourcePreference::System => "system",
            SourcePreference::Bundled => "bundled",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "system" => SourcePreference::System,
            "bundled" => SourcePreference::Bundled,
            _ => SourcePreference::Auto,
        }
    }
}

// ── Detection results ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SourceType {
    #[serde(rename = "system")]
    System,
    #[serde(rename = "bundled")]
    Bundled,
    #[serde(rename = "not_found")]
    NotFound,
}

#[derive(Debug, Clone)]
pub struct DetectedClaude {
    pub path: PathBuf,
    pub version: String,
}

#[derive(Debug, Clone)]
pub struct ActiveClaude {
    pub path: PathBuf,
    pub version: String,
    pub source: SourceType,
}

// ── Version query ───────────────────────────────────────────────────────────

/// Run `claude --version` and return the trimmed output.
pub fn version_from_binary(path: &Path) -> Result<String, String> {
    let output = Command::new(path)
        .arg("--version")
        .output()
        .map_err(|e| format!("failed to run claude --version: {e}"))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err("claude --version returned non-zero".to_string())
    }
}

// ── System detection ────────────────────────────────────────────────────────

/// Detect Claude Code installed on the system PATH or known locations.
pub fn detect_system_claude() -> Option<DetectedClaude> {
    let platform = Platform::detect();
    let binary = platform.binary_name();

    // 1. Check PATH via which/where.
    let path_candidates = find_on_path(&binary);

    // 2. Check known paths (may not be in PATH for GUI apps).
    let known_paths = known_install_paths(&platform, &binary);

    let candidates: Vec<PathBuf> = path_candidates
        .into_iter()
        .chain(known_paths)
        .collect();

    for path in candidates {
        if path.exists() {
            if let Ok(version) = version_from_binary(&path) {
                return Some(DetectedClaude { path, version });
            }
        }
    }
    None
}

/// Find a binary on PATH.
fn find_on_path(name: &str) -> Vec<PathBuf> {
    let which_cmd = if cfg!(target_os = "windows") { "where" } else { "which" };
    if let Ok(out) = Command::new(which_cmd).arg(name).output() {
        if out.status.success() {
            let s = String::from_utf8_lossy(&out.stdout);
            return s
                .lines()
                .map(|l| PathBuf::from(l.trim()))
                .filter(|p| p.exists())
                .collect();
        }
    }
    vec![]
}

/// Known install paths not necessarily on PATH.
fn known_install_paths(platform: &Platform, binary: &str) -> Vec<PathBuf> {
    let mut paths = Vec::new();

    match platform.os.as_str() {
        "darwin" => {
            // Homebrew on Intel Macs.
            paths.push(PathBuf::from("/usr/local/bin").join(binary));
            // Homebrew on Apple Silicon.
            paths.push(PathBuf::from("/opt/homebrew/bin").join(binary));
            // Official install script default.
            if let Some(home) = dirs::home_dir() {
                paths.push(home.join(".local/bin").join(binary));
            }
        }
        "linux" => {
            if let Some(home) = dirs::home_dir() {
                paths.push(home.join(".local/bin").join(binary));
            }
            paths.push(PathBuf::from("/usr/local/bin").join(binary));
            paths.push(PathBuf::from("/usr/bin").join(binary));
        }
        "win32" => {
            // Official install script / winget default.
            if let Some(home) = dirs::home_dir() {
                paths.push(home.join(".local/bin").join(binary));
            }
            // LocalAppData winget installs.
            if let Some(localappdata) = std::env::var_os("LOCALAPPDATA") {
                let base = PathBuf::from(localappdata);
                paths.push(base.join("Programs/ClaudeCode").join(binary));
            }
        }
        _ => {}
    }

    paths
}

// ── Bundled detection ───────────────────────────────────────────────────────

/// Detect GenCode-bundled Claude Code in the runtime directory.
pub fn detect_bundled_claude(runtime_root: &Path) -> Option<DetectedClaude> {
    let platform = Platform::detect();
    let binary_name = platform.binary_name();
    let claude_path = runtime_root.join("claude").join(&binary_name);

    if claude_path.exists() {
        if let Ok(version) = version_from_binary(&claude_path) {
            return Some(DetectedClaude {
                path: claude_path,
                version,
            });
        }
    }
    None
}

// ── Resolution ──────────────────────────────────────────────────────────────

/// Minimum supported Claude Code version.
pub const MIN_CLAUDE_VERSION: &str = "2.0.0";

/// Resolve which Claude Code to use based on preference and availability.
pub fn resolve_claude(
    preference: &SourcePreference,
    runtime_root: &Path,
) -> Result<ActiveClaude, String> {
    let system = detect_system_claude();
    let bundled = detect_bundled_claude(runtime_root);

    match preference {
        SourcePreference::Bundled => {
            match bundled {
                Some(b) => Ok(ActiveClaude {
                    path: b.path,
                    version: b.version,
                    source: SourceType::Bundled,
                }),
                None => Err("GenCode 内置 Claude Code 未安装，请在设置中安装。".to_string()),
            }
        }
        SourcePreference::System => {
            match system {
                Some(s) => Ok(ActiveClaude {
                    path: s.path,
                    version: s.version,
                    source: SourceType::System,
                }),
                None => Err("系统中未安装 Claude Code。请先安装：\n  macOS: brew install claude-code\n  Linux: curl -fsSL https://claude.ai/install.sh | bash\n  Windows: winget install Anthropic.ClaudeCode".to_string()),
            }
        }
        SourcePreference::Auto => {
            // Prefer system if available and recent enough.
            if let Some(ref s) = system {
                if version_gte(&s.version, MIN_CLAUDE_VERSION) {
                    return Ok(ActiveClaude {
                        path: s.path.clone(),
                        version: s.version.clone(),
                        source: SourceType::System,
                    });
                }
            }
            // Fallback to bundled.
            match bundled {
                Some(b) => Ok(ActiveClaude {
                    path: b.path,
                    version: b.version,
                    source: SourceType::Bundled,
                }),
                None => {
                    // System version exists but too old — give specific message.
                    if let Some(ref s) = system {
                        Err(format!(
                            "系统 Claude Code 版本过旧 ({}，需要 ≥ {})。请升级或在设置中安装内置版本。",
                            s.version, MIN_CLAUDE_VERSION
                        ))
                    } else {
                        Err("未找到 Claude Code。请在设置中安装。".to_string())
                    }
                }
            }
        }
    }
}

/// Simple semver comparison (assumes well-formed "x.y.z" strings).
pub fn version_gte(candidate: &str, baseline: &str) -> bool {
    let a = parse_version(candidate);
    let b = parse_version(baseline);
    a >= b
}

fn parse_version(v: &str) -> Vec<u32> {
    v.trim_start_matches('v')
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect()
}

// ── Version endpoint ────────────────────────────────────────────────────────

/// Fetch the latest available Claude Code version from the CDN.
pub fn fetch_latest_version() -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let url = "https://downloads.claude.ai/claude-code-releases/latest";
    let resp = client
        .get(url)
        .send()
        .map_err(|e| format!("获取最新版本失败: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("版本服务器返回 HTTP {}", resp.status()));
    }

    let version = resp.text().map_err(|e| e.to_string())?;
    Ok(version.trim().to_string())
}

// ── Binary download ─────────────────────────────────────────────────────────

/// Download the Claude Code native binary for the current platform.
/// Returns the bytes and the version string.
pub fn download_claude_binary(
    version: &str,
    dest_dir: &Path,
) -> Result<PathBuf, String> {
    let platform = Platform::detect();
    let binary_name = platform.binary_name();
    let platform_str = platform.platform_string();

    let url = format!(
        "https://downloads.claude.ai/claude-code-releases/{version}/{platform_str}/{binary_name}"
    );

    log::info!("downloading Claude Code {version} for {platform_str}");

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(&url)
        .send()
        .map_err(|e| format!("下载失败: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("下载失败: HTTP {}", resp.status()));
    }

    let bytes = resp.bytes().map_err(|e| e.to_string())?;

    std::fs::create_dir_all(dest_dir).map_err(|e| format!("创建目录失败: {e}"))?;

    let dest_path = dest_dir.join(&binary_name);
    std::fs::write(&dest_path, &bytes).map_err(|e| format!("写入文件失败: {e}"))?;

    // Make executable on Unix.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = std::fs::metadata(&dest_path) {
            let mut perms = meta.permissions();
            perms.set_mode(0o755);
            let _ = std::fs::set_permissions(&dest_path, perms);
        }
    }

    log::info!("Claude Code downloaded to {}", dest_path.display());
    Ok(dest_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn platform_detection_returns_valid_string() {
        let p = Platform::detect();
        let s = p.platform_string();
        assert!(!s.is_empty());
        assert!(
            s.contains("darwin") || s.contains("linux") || s.contains("win32"),
            "unexpected os: {s}"
        );
    }

    #[test]
    fn binary_name_darwin() {
        let p = Platform {
            os: "darwin".into(),
            arch: "arm64".into(),
            libc: "".into(),
        };
        assert_eq!(p.binary_name(), "claude");
    }

    #[test]
    fn binary_name_windows() {
        let p = Platform {
            os: "win32".into(),
            arch: "x64".into(),
            libc: "".into(),
        };
        assert_eq!(p.binary_name(), "claude.exe");
    }

    #[test]
    fn platform_string_darwin_arm64() {
        let p = Platform {
            os: "darwin".into(),
            arch: "arm64".into(),
            libc: "".into(),
        };
        assert_eq!(p.platform_string(), "darwin-arm64");
    }

    #[test]
    fn platform_string_linux_musl() {
        let p = Platform {
            os: "linux".into(),
            arch: "x64".into(),
            libc: "musl".into(),
        };
        assert_eq!(p.platform_string(), "linux-x64-musl");
    }

    #[test]
    fn platform_string_win32_x64() {
        let p = Platform {
            os: "win32".into(),
            arch: "x64".into(),
            libc: "".into(),
        };
        assert_eq!(p.platform_string(), "win32-x64");
    }

    #[test]
    fn version_gte_works() {
        assert!(version_gte("2.1.19", "2.0.0"));
        assert!(version_gte("2.0.0", "2.0.0"));
        assert!(version_gte("2.1.0", "2.0.36"));
        assert!(!version_gte("1.9.0", "2.0.0"));
        assert!(!version_gte("2.0.0", "2.0.1"));
    }

    #[test]
    fn parse_version_strips_v_prefix() {
        assert_eq!(parse_version("v2.1.19"), vec![2, 1, 19]);
        assert_eq!(parse_version("2.0.0"), vec![2, 0, 0]);
    }

    #[test]
    fn source_preference_roundtrip() {
        assert_eq!(SourcePreference::from_str("auto"), SourcePreference::Auto);
        assert_eq!(SourcePreference::from_str("system"), SourcePreference::System);
        assert_eq!(SourcePreference::from_str("bundled"), SourcePreference::Bundled);
        assert_eq!(SourcePreference::from_str("unknown"), SourcePreference::Auto);
        assert_eq!(SourcePreference::from_str(""), SourcePreference::Auto);
    }

    #[test]
    fn source_preference_serialization() {
        let v = serde_json::to_value(SourcePreference::Auto).unwrap();
        assert_eq!(v, serde_json::json!("auto"));
        let v = serde_json::to_value(SourcePreference::System).unwrap();
        assert_eq!(v, serde_json::json!("system"));
    }
}
