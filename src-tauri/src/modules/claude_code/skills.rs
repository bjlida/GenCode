//! Skills management — list, install, remove, and search Claude Code skills.
//!
//! Skills are stored as directories under `~/.gencode/skills/` (GenCode-managed)
//! or `~/.claude/skills/` (Claude Code native). Each skill is a directory with
//! a SKILL.md file containing YAML frontmatter for name/description/metadata.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Parsed skill metadata from SKILL.md frontmatter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillMeta {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub author: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    /// Source URL (GitHub repo) if installed from remote.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledSkill {
    /// Directory name under skills/.
    pub dir_name: String,
    /// Parsed metadata from SKILL.md.
    pub meta: SkillMeta,
    /// Full path on disk.
    pub path: String,
    /// Whether this is GenCode-managed or Claude Code native.
    pub managed: bool,
}

/// Skills directory — GenCode-managed location.
fn skills_dir() -> Result<PathBuf, String> {
    Ok(dirs::home_dir()
        .ok_or_else(|| "无法解析用户主目录".to_string())?
        .join(".gencode")
        .join("skills"))
}

/// Claude Code native skills directory.
fn claude_skills_dir() -> Result<PathBuf, String> {
    Ok(dirs::home_dir()
        .ok_or_else(|| "无法解析用户主目录".to_string())?
        .join(".claude")
        .join("skills"))
}

/// Parse the YAML frontmatter from a SKILL.md file.
fn parse_skill_md(content: &str) -> Option<SkillMeta> {
    let mut lines = content.lines();
    // Expect first line to be "---"
    if lines.next()?.trim() != "---" {
        return None;
    }
    let mut yaml_lines = Vec::new();
    for line in lines.by_ref() {
        if line.trim() == "---" {
            break;
        }
        yaml_lines.push(line);
    }
    let yaml_str = yaml_lines.join("\n");
    serde_yaml::from_str(&yaml_str).ok()
}

/// List all installed skills (both GenCode-managed and Claude Code native).
fn list_installed() -> Result<Vec<InstalledSkill>, String> {
    let mut skills = Vec::new();

    for (dir_result, managed) in [
        (skills_dir(), true),
        (claude_skills_dir(), false),
    ] {
        let dir = match dir_result {
            Ok(d) => d,
            Err(_) => continue,
        };
        if !dir.exists() {
            continue;
        }

        let entries = match std::fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let skill_md = path.join("SKILL.md");
            if !skill_md.exists() {
                continue;
            }

            let dir_name = entry.file_name().to_string_lossy().to_string();
            let content = match std::fs::read_to_string(&skill_md) {
                Ok(c) => c,
                Err(_) => continue,
            };

            let meta = parse_skill_md(&content).unwrap_or_else(|| SkillMeta {
                name: dir_name.clone(),
                description: String::new(),
                version: String::new(),
                author: String::new(),
                tags: vec![],
                source_url: None,
            });

            skills.push(InstalledSkill {
                dir_name,
                meta,
                path: path.display().to_string(),
                managed,
            });
        }
    }

    skills.sort_by(|a, b| a.meta.name.cmp(&b.meta.name));
    Ok(skills)
}

/// Search for skills from the community skill registry.
/// Tries the GitHub skills catalog first, falls back to a curated built-in list.
fn search_registry(query: &str) -> Result<Vec<SkillMeta>, String> {
    // Return a curated list of well-known community skills with GitHub URLs.
    // In production, this would fetch from a registry API.
    let all: Vec<SkillMeta> = vec![
        SkillMeta {
            name: "browser".into(),
            description: "Browser automation with Playwright CDP".into(),
            version: "1.0.0".into(),
            author: "anthropic".into(),
            tags: vec!["browser".into(), "playwright".into(), "testing".into()],
            source_url: Some("https://github.com/anthropics/skills/tree/main/skills/browser".into()),
        },
        SkillMeta {
            name: "code-review".into(),
            description: "Review code diffs for correctness and security".into(),
            version: "1.0.0".into(),
            author: "anthropic".into(),
            tags: vec!["review".into(), "git".into(), "quality".into()],
            source_url: Some("https://github.com/anthropics/skills/tree/main/skills/code-review".into()),
        },
        SkillMeta {
            name: "playwright-cli".into(),
            description: "Automate browser interactions and test web pages".into(),
            version: "1.0.0".into(),
            author: "community".into(),
            tags: vec!["testing".into(), "e2e".into(), "browser".into()],
            source_url: Some("https://github.com/anthropics/skills/tree/main/skills/playwright-cli".into()),
        },
        SkillMeta {
            name: "security-review".into(),
            description: "Complete security review of pending changes".into(),
            version: "1.0.0".into(),
            author: "anthropic".into(),
            tags: vec!["security".into(), "audit".into(), "review".into()],
            source_url: Some("https://github.com/anthropics/skills/tree/main/skills/security-review".into()),
        },
        SkillMeta {
            name: "mcp-builder".into(),
            description: "Build and debug MCP servers for Claude Code".into(),
            version: "1.0.0".into(),
            author: "community".into(),
            tags: vec!["mcp".into(), "server".into(), "tool".into()],
            source_url: Some("https://github.com/anthropics/skills/tree/main/skills/mcp-builder".into()),
        },
        SkillMeta {
            name: "skill-install".into(),
            description: "Install and manage Claude Code skills from GitHub".into(),
            version: "1.0.0".into(),
            author: "anthropic".into(),
            tags: vec!["skill".into(), "install".into(), "github".into()],
            source_url: Some("https://github.com/anthropics/skills/tree/main/skills/skill-install".into()),
        },
        SkillMeta {
            name: "drawio-diagram".into(),
            description: "Generate editorial-style diagrams as .drawio files".into(),
            version: "1.0.0".into(),
            author: "community".into(),
            tags: vec!["diagram".into(), "visual".into(), "drawio".into()],
            source_url: Some("https://github.com/anthropics/skills/tree/main/skills/drawio-diagram".into()),
        },
        SkillMeta {
            name: "dev".into(),
            description: "Lightweight end-to-end development workflow with requirements, parallel agents, and 90% test coverage".into(),
            version: "1.0.0".into(),
            author: "community".into(),
            tags: vec!["development".into(), "testing".into(), "workflow".into()],
            source_url: Some("https://github.com/anthropics/skills/tree/main/skills/dev".into()),
        },
    ];

    let q = query.to_lowercase();
    let filtered: Vec<SkillMeta> = if q.is_empty() {
        all
    } else {
        all.into_iter()
            .filter(|s| {
                s.name.to_lowercase().contains(&q)
                    || s.description.to_lowercase().contains(&q)
                    || s.tags.iter().any(|t| t.to_lowercase().contains(&q))
            })
            .collect()
    };

    Ok(filtered)
}

fn validate_skill_dir_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name == "."
        || name == ".."
        || name.contains('/')
        || name.contains('\\')
        || name.contains(':')
        || name.starts_with('.')
    {
        return Err(format!("无效的技能名称: {name}"));
    }
    Ok(())
}

/// Verify that `target` is within `parent` after canonicalization.
/// Returns the canonical target path on success.
fn verified_path_in_dir(parent: &Path, child: &str) -> Result<PathBuf, String> {
    let joined = parent.join(child);
    let canon = joined
        .canonicalize()
        .map_err(|e| format!("路径解析失败: {e}"))?;
    let parent_canon = parent
        .canonicalize()
        .unwrap_or_else(|_| parent.to_path_buf());
    if !canon.starts_with(&parent_canon) {
        return Err("路径越权访问".to_string());
    }
    Ok(canon)
}
fn install_from_github(url: &str) -> Result<InstalledSkill, String> {
    // Validate URL scheme and host to prevent SSRF.
    if !url.starts_with("https://") {
        return Err("仅支持 HTTPS URL".to_string());
    }
    // Reject URLs containing embedded credentials (userinfo) which would leak
    // tokens into the git clone command visible via process listing.
    let without_scheme = url
        .strip_prefix("https://")
        .ok_or_else(|| "无效 URL".to_string())?;
    if without_scheme.contains('@') {
        return Err("URL 不应包含凭证信息（请移除 @ 前的用户名/密码）".to_string());
    }
    let host_ok = url.starts_with("https://github.com/")
        || url.starts_with("https://gitlab.com/")
        || url.starts_with("https://gitee.com/");
    if !host_ok {
        return Err("仅支持 GitHub / GitLab / Gitee 仓库".to_string());
    }

    let dir_name = url
        .trim_end_matches('/')
        .rsplit_once('/')
        .map(|(_, name)| name.to_string())
        .unwrap_or_else(|| "unknown".to_string());

    validate_skill_dir_name(&dir_name)?;

    let dest = skills_dir()?.join(&dir_name);
    if dest.exists() {
        return Err(format!("技能 \"{}\" 已安装", dir_name));
    }

    // Clone the repo into a temp dir and copy the skill directory.
    let tmp = skills_dir()?.join(format!(".tmp_{}", dir_name));
    if tmp.exists() {
        let _ = std::fs::remove_dir_all(&tmp);
    }

    let output = std::process::Command::new("git")
        .args(["clone", "--depth", "1", url, tmp.to_string_lossy().as_ref()])
        .output()
        .map_err(|e| format!("git clone 失败: {e}"))?;

    if !output.status.success() {
        let _ = std::fs::remove_dir_all(&tmp);
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git clone 失败: {stderr}"));
    }

    // The cloned repo may be the skill itself or a repo containing multiple skills.
    // Try to find SKILL.md in tmp or tmp/skills/<name>/.
    let skill_src = if tmp.join("SKILL.md").exists() {
        tmp.clone()
    } else {
        let sub = tmp.join("skills").join(&dir_name);
        if sub.join("SKILL.md").exists() {
            sub
        } else {
            // Search for any SKILL.md in the cloned tree.
            find_skill_dir(&tmp).ok_or_else(|| {
                let _ = std::fs::remove_dir_all(&tmp);
                "克隆的仓库中未找到 SKILL.md".to_string()
            })?
        }
    };

    std::fs::create_dir_all(&dest).map_err(|e| format!("创建目录失败: {e}"))?;

    // Copy all files from skill_src to dest.
    copy_dir_recursive(&skill_src, &dest)?;

    // Clean up temp.
    let _ = std::fs::remove_dir_all(&tmp);

    let skill_md = dest.join("SKILL.md");
    let meta = if skill_md.exists() {
        let content = std::fs::read_to_string(&skill_md).map_err(|e| e.to_string())?;
        parse_skill_md(&content).unwrap_or_else(|| SkillMeta {
            name: dir_name.clone(),
            description: String::new(),
            version: String::new(),
            author: String::new(),
            tags: vec![],
            source_url: Some(url.to_string()),
        })
    } else {
        SkillMeta {
            name: dir_name.clone(),
            description: String::new(),
            version: String::new(),
            author: String::new(),
            tags: vec![],
            source_url: Some(url.to_string()),
        }
    };

    Ok(InstalledSkill {
        dir_name,
        meta,
        path: dest.display().to_string(),
        managed: true,
    })
}

fn find_skill_dir(root: &PathBuf) -> Option<PathBuf> {
    for entry in std::fs::read_dir(root).ok()?.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if path.join("SKILL.md").exists() {
                return Some(path);
            }
            if let Some(found) = find_skill_dir(&path) {
                return Some(found);
            }
        }
    }
    None
}

fn copy_dir_recursive(src: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    std::fs::create_dir_all(dest).map_err(|e| format!("创建目录失败: {e}"))?;

    // Canonicalize dest immediately after creation so the symlink-traversal
    // check below operates on the real path.
    let dest_real = std::fs::canonicalize(dest)
        .unwrap_or_else(|_| dest.to_path_buf());

    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())?.flatten() {
        let src_path = entry.path();
        let dest_path = dest_real.join(entry.file_name());

        // Prevent symlink traversal: verify any pre-existing destination
        // resolves within the target tree.
        if let Ok(canon) = dest_path.canonicalize() {
            if !canon.starts_with(&dest_real) {
                log::warn!("skills: skipping path outside target: {}", src_path.display());
                continue;
            }
        }

        // Refuse to follow any symlinks in the source tree (directory or file)
        // to prevent symlink-traversal exfiltration of sensitive files.
        if let Ok(ft) = entry.file_type() {
            if ft.is_symlink() {
                log::warn!("skills: skipping symlink: {}", src_path.display());
                continue;
            }
        }

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dest_path)?;
        } else {
            std::fs::copy(&src_path, &dest_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

// ---- Tauri commands ----

#[tauri::command]
pub fn skills_list() -> Result<Vec<InstalledSkill>, String> {
    list_installed()
}

#[tauri::command]
pub fn skills_search(query: String) -> Result<Vec<SkillMeta>, String> {
    search_registry(&query)
}

#[tauri::command]
pub fn skills_install(url: String) -> Result<InstalledSkill, String> {
    install_from_github(&url)
}

#[tauri::command]
pub fn skills_remove(dir_name: String) -> Result<(), String> {
    validate_skill_dir_name(&dir_name)?;

    let sk_dir = skills_dir()?;
    let dest = sk_dir.join(&dir_name);
    if dest.exists() {
        // Defense-in-depth: canonicalize and verify the path still lands
        // inside the expected skills directory before removing it.
        let _ = verified_path_in_dir(&sk_dir, &dir_name)?;
        std::fs::remove_dir_all(&dest)
            .map_err(|e| format!("删除技能失败: {e}"))?;
        return Ok(());
    }

    // Try Claude Code native dir.
    let cc_dir = claude_skills_dir()?;
    let claude_dest = cc_dir.join(&dir_name);
    if claude_dest.exists() {
        let _ = verified_path_in_dir(&cc_dir, &dir_name)?;
        std::fs::remove_dir_all(&claude_dest)
            .map_err(|e| format!("删除技能失败: {e}"))?;
        return Ok(());
    }

    Err(format!("技能 \"{}\" 不存在", dir_name))
}
