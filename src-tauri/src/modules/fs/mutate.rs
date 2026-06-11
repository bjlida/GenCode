use std::fs::OpenOptions;
use std::path::Path;

use crate::modules::workspace::{resolve_path, WorkspaceEnv, WorkspaceRegistry};

/// Creates a new empty file. Fails if the file already exists.
/// Uses `create_new(true)` (O_EXCL / CREATE_NEW) so the existence check
/// and creation are atomic — no TOCTOU window where a concurrent writer
/// would be silently truncated.
fn fs_create_file_impl(
    path: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<(), String> {
    let p = super::require_authorized(registry, workspace, path)?;
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&p)
        .map(drop)
        .map_err(|e| {
            log::debug!("fs_create_file({}) failed: {e}", p.display());
            if e.kind() == std::io::ErrorKind::AlreadyExists {
                format!("already exists: {}", p.display())
            } else {
                e.to_string()
            }
        })
}

#[tauri::command]
pub fn fs_create_file(
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<(), String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    fs_create_file_impl(&path, &workspace, &registry)
}

/// Creates a new directory. Fails if the directory already exists.
/// Parents are created as needed — matches the common "new folder" UX
/// where typing "a/b/c" creates the full chain.
///
/// Parent creation uses `create_dir_all`; the final component uses `create_dir`
/// which fails atomically if the directory already exists.
fn fs_create_dir_impl(
    path: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<(), String> {
    let p = super::require_authorized(registry, workspace, path)?;
    // Create parent directories first.
    if let Some(parent) = p.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| {
                log::debug!("fs_create_dir parent({}) failed: {e}", parent.display());
                e.to_string()
            })?;
        }
    }
    // Atomic create of the final component — fails if it already exists.
    std::fs::create_dir(&p).map_err(|e| {
        log::debug!("fs_create_dir({}) failed: {e}", p.display());
        if e.kind() == std::io::ErrorKind::AlreadyExists {
            format!("already exists: {}", p.display())
        } else {
            e.to_string()
        }
    })
}

#[tauri::command]
pub fn fs_create_dir(
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<(), String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    fs_create_dir_impl(&path, &workspace, &registry)
}

/// Renames (or moves) a path.
///
/// The target-existence check is best-effort: on Linux `rename(2)` atomically
/// replaces the target, so a concurrent file creation between check and rename
/// would be silently overwritten. On Windows the syscall generally fails if the
/// target exists. Callers that need strict no-overwrite semantics should use a
/// dedicated atomic-move primitive.
fn fs_rename_impl(
    from: &str,
    to: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<(), String> {
    let from_p = super::require_authorized(registry, workspace, from)?;
    let to_p = super::require_authorized(registry, workspace, to)?;
    if !from_p.exists() {
        return Err(format!("not found: {}", from_p.display()));
    }
    if to_p.exists() {
        return Err(format!("already exists: {}", to_p.display()));
    }
    std::fs::rename(&from_p, &to_p).map_err(|e| {
        log::debug!(
            "fs_rename({} -> {}) failed: {e}",
            from_p.display(),
            to_p.display()
        );
        e.to_string()
    })
}

#[tauri::command]
pub fn fs_rename(
    from: String,
    to: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<(), String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    fs_rename_impl(&from, &to, &workspace, &registry)
}

/// Deletes a file or directory (recursively for dirs). Callers are
/// responsible for confirming destructive operations with the user.
fn fs_delete_impl(
    path: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<(), String> {
    let resolved = resolve_path(path, workspace);

    // If the path is a symlink, delete the link itself — never follow it.
    if let Ok(meta) = std::fs::symlink_metadata(&resolved) {
        if meta.file_type().is_symlink() {
            // Authorize using the parent directory so we don't canonicalize
            // through the symlink to the target.
            if let Some(parent) = resolved.parent() {
                let canon_parent =
                    std::fs::canonicalize(parent).map_err(|e| format!("无法解析父目录: {e}"))?;
                if !registry.is_authorized(&canon_parent) {
                    return Err(format!(
                        "path outside workspace: {}",
                        canon_parent.display()
                    ));
                }
            }
            return std::fs::remove_file(&resolved).map_err(|e| {
                log::warn!("fs_delete symlink({}) failed: {e}", resolved.display());
                e.to_string()
            });
        }
    }

    let p = super::require_authorized(registry, workspace, path)?;
    let meta = std::fs::symlink_metadata(&p).map_err(|e| {
        log::debug!("fs_delete stat({}) failed: {e}", p.display());
        e.to_string()
    })?;

    let result = if meta.is_dir() {
        std::fs::remove_dir_all(&p)
    } else {
        std::fs::remove_file(&p)
    };

    result.map_err(|e| {
        log::warn!("fs_delete({}) failed: {e}", p.display());
        e.to_string()
    })
}

#[tauri::command]
pub fn fs_delete(
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<(), String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    fs_delete_impl(&path, &workspace, &registry)
}

fn copy_tree(src: &Path, dest: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    let dest_real = std::fs::canonicalize(dest).unwrap_or_else(|_| dest.to_path_buf());

    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())?.flatten() {
        let src_path = entry.path();
        let dest_path = dest_real.join(entry.file_name());

        if let Ok(canon) = dest_path.canonicalize() {
            if !canon.starts_with(&dest_real) {
                log::warn!(
                    "fs_copy: skipping path outside target: {}",
                    src_path.display()
                );
                continue;
            }
        }

        if let Ok(ft) = entry.file_type() {
            if ft.is_symlink() {
                log::warn!("fs_copy: skipping symlink: {}", src_path.display());
                continue;
            }
        }

        if src_path.is_dir() {
            copy_tree(&src_path, &dest_path)?;
        } else {
            std::fs::copy(&src_path, &dest_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Recursively copies a file or directory. Fails if the destination exists.
fn fs_copy_impl(
    from: &str,
    to: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<(), String> {
    let from_p = super::require_authorized(registry, workspace, from)?;
    let to_p = super::require_authorized(registry, workspace, to)?;
    if !from_p.exists() {
        return Err(format!("not found: {}", from_p.display()));
    }
    if to_p.exists() {
        return Err(format!("already exists: {}", to_p.display()));
    }

    let meta = std::fs::symlink_metadata(&from_p).map_err(|e| e.to_string())?;
    if meta.file_type().is_symlink() {
        return Err(format!("cannot copy symlink: {}", from_p.display()));
    }

    if meta.is_dir() {
        copy_tree(&from_p, &to_p)
    } else {
        if let Some(parent) = to_p.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::copy(&from_p, &to_p).map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
pub fn fs_copy(
    from: String,
    to: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<(), String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    fs_copy_impl(&from, &to, &workspace, &registry)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(p: std::path::PathBuf) -> String {
        p.to_string_lossy().into_owned()
    }

    fn test_registry(root: &std::path::Path) -> WorkspaceRegistry {
        let registry = WorkspaceRegistry::default();
        registry.authorize(root).ok();
        registry
    }

    #[test]
    fn create_file_makes_empty_and_refuses_to_clobber() {
        let dir = tempfile::tempdir().unwrap();
        let reg = test_registry(dir.path());
        let workspace = WorkspaceEnv::Local;
        let f = dir.path().join("new.txt");
        fs_create_file_impl(&s(f.clone()), &workspace, &reg).expect("create");
        assert!(f.exists());
        assert_eq!(std::fs::read(&f).unwrap(), b"");

        // A second create must error, not truncate existing content.
        std::fs::write(&f, b"data").unwrap();
        let err = fs_create_file_impl(&s(f.clone()), &workspace, &reg).unwrap_err();
        assert!(err.contains("already exists"), "got: {err}");
        assert_eq!(std::fs::read(&f).unwrap(), b"data");
    }

    #[test]
    fn create_dir_builds_nested_chain_and_refuses_existing() {
        let dir = tempfile::tempdir().unwrap();
        let reg = test_registry(dir.path());
        let workspace = WorkspaceEnv::Local;
        let nested = dir.path().join("a/b/c");
        fs_create_dir_impl(&s(nested.clone()), &workspace, &reg).expect("create dir");
        assert!(nested.is_dir());
        let err = fs_create_dir_impl(&s(nested), &workspace, &reg).unwrap_err();
        assert!(err.contains("already exists"), "got: {err}");
    }

    #[test]
    fn rename_moves_and_never_overwrites() {
        let dir = tempfile::tempdir().unwrap();
        let reg = test_registry(dir.path());
        let workspace = WorkspaceEnv::Local;
        let from = dir.path().join("a.txt");
        let to = dir.path().join("b.txt");
        std::fs::write(&from, b"payload").unwrap();

        fs_rename_impl(&s(from.clone()), &s(to.clone()), &workspace, &reg).expect("rename");
        assert!(!from.exists());
        assert_eq!(std::fs::read(&to).unwrap(), b"payload");

        // Missing source is reported, not silently ignored.
        let err =
            fs_rename_impl(&s(from), &s(dir.path().join("c.txt")), &workspace, &reg).unwrap_err();
        assert!(err.contains("not found"), "got: {err}");

        // Refusing to overwrite an existing target is the data-loss guard.
        let occupied = dir.path().join("keep.txt");
        std::fs::write(&occupied, b"keep").unwrap();
        let err =
            fs_rename_impl(&s(to.clone()), &s(occupied.clone()), &workspace, &reg).unwrap_err();
        assert!(err.contains("already exists"), "got: {err}");
        assert_eq!(std::fs::read(&occupied).unwrap(), b"keep");
        assert!(to.exists());
    }

    #[test]
    fn delete_removes_file_then_dir_recursively() {
        let dir = tempfile::tempdir().unwrap();
        let reg = test_registry(dir.path());
        let workspace = WorkspaceEnv::Local;
        let f = dir.path().join("x.txt");
        std::fs::write(&f, b"x").unwrap();
        fs_delete_impl(&s(f.clone()), &workspace, &reg).expect("delete file");
        assert!(!f.exists());

        let sub = dir.path().join("sub");
        std::fs::create_dir_all(sub.join("inner")).unwrap();
        std::fs::write(sub.join("inner/y.txt"), b"y").unwrap();
        fs_delete_impl(&s(sub.clone()), &workspace, &reg).expect("delete dir");
        assert!(!sub.exists());

        let err = fs_delete_impl(&s(dir.path().join("missing")), &workspace, &reg).unwrap_err();
        assert!(!err.is_empty());
    }

    #[test]
    fn copy_duplicates_file_and_tree() {
        let dir = tempfile::tempdir().unwrap();
        let reg = test_registry(dir.path());
        let workspace = WorkspaceEnv::Local;
        let src = dir.path().join("a.txt");
        std::fs::write(&src, b"payload").unwrap();
        let dest = dir.path().join("b.txt");
        fs_copy_impl(&s(src.clone()), &s(dest.clone()), &workspace, &reg).expect("copy file");
        assert_eq!(std::fs::read(&dest).unwrap(), b"payload");

        let src_dir = dir.path().join("tree");
        std::fs::create_dir_all(src_dir.join("inner")).unwrap();
        std::fs::write(src_dir.join("inner/x.txt"), b"x").unwrap();
        let dest_dir = dir.path().join("tree-copy");
        fs_copy_impl(&s(src_dir.clone()), &s(dest_dir.clone()), &workspace, &reg)
            .expect("copy dir");
        assert_eq!(std::fs::read(dest_dir.join("inner/x.txt")).unwrap(), b"x");
    }

    // Deleting a symlink that points at a directory must remove only the link,
    // never recurse through it and wipe the target's contents.
    #[cfg(unix)]
    #[test]
    fn delete_does_not_follow_symlink_into_target() {
        let dir = tempfile::tempdir().unwrap();
        let reg = test_registry(dir.path());
        let workspace = WorkspaceEnv::Local;
        let real = dir.path().join("real");
        std::fs::create_dir(&real).unwrap();
        std::fs::write(real.join("keep.txt"), b"keep").unwrap();

        let link = dir.path().join("link");
        std::os::unix::fs::symlink(&real, &link).unwrap();

        fs_delete_impl(&s(link.clone()), &workspace, &reg).expect("delete symlink");
        assert!(!link.exists(), "symlink itself should be gone");
        assert!(real.is_dir(), "target dir must survive");
        assert_eq!(std::fs::read(real.join("keep.txt")).unwrap(), b"keep");
    }
}
