use std::path::Path;
use std::time::UNIX_EPOCH;
use std::{fs, io::Write};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;
use tauri::Emitter;
use tempfile::NamedTempFile;

use crate::modules::workspace::{WorkspaceEnv, WorkspaceRegistry};

const MAX_READ_BYTES: u64 = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGE_DATA_URL_BYTES: u64 = 5 * 1024 * 1024; // 5 MB
const BINARY_SNIFF_BYTES: usize = 8 * 1024;

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum ReadResult {
    Text {
        content: String,
        size: u64,
    },
    Binary {
        size: u64,
    },
    /// File exceeds MAX_READ_BYTES. UI decides whether to offer "open anyway".
    TooLarge {
        size: u64,
        limit: u64,
    },
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum StatKind {
    File,
    Dir,
    Symlink,
}

#[derive(Serialize)]
pub struct FileStat {
    pub size: u64,
    pub mtime: u64,
    pub kind: StatKind,
}

fn fs_read_file_impl(
    path: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<ReadResult, String> {
    let p = super::require_authorized(registry, workspace, path)?;
    let meta = std::fs::metadata(&p).map_err(|e| {
        log::debug!("fs_read_file stat({}) failed: {e}", p.display());
        e.to_string()
    })?;

    let size = meta.len();
    if size > MAX_READ_BYTES {
        return Ok(ReadResult::TooLarge {
            size,
            limit: MAX_READ_BYTES,
        });
    }

    let bytes = std::fs::read(&p).map_err(|e| {
        log::debug!("fs_read_file read({}) failed: {e}", p.display());
        e.to_string()
    })?;

    // Null-byte sniff on the first chunk. Not perfect (misses UTF-16 BOM
    // cases) but catches the common "this is a PNG" mistake cheaply.
    let sniff_len = bytes.len().min(BINARY_SNIFF_BYTES);
    if bytes[..sniff_len].contains(&0) {
        return Ok(ReadResult::Binary { size });
    }

    match String::from_utf8(bytes) {
        Ok(content) => Ok(ReadResult::Text { content, size }),
        Err(_) => Ok(ReadResult::Binary { size }),
    }
}

#[tauri::command]
pub fn fs_read_file(
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<ReadResult, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    fs_read_file_impl(&path, &workspace, &registry)
}

#[derive(Serialize)]
pub struct DataUrlResult {
    pub data_url: String,
    pub media_type: String,
    pub size: u64,
}

fn image_media_type(path: &Path) -> Option<&'static str> {
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    match ext.as_str() {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "gif" => Some("image/gif"),
        "webp" => Some("image/webp"),
        "bmp" => Some("image/bmp"),
        "svg" => Some("image/svg+xml"),
        "ico" => Some("image/x-icon"),
        _ => None,
    }
}

fn fs_read_file_data_url_impl(
    path: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<DataUrlResult, String> {
    let p = super::require_authorized(registry, workspace, path)?;
    let media_type = image_media_type(&p).ok_or_else(|| {
        "仅支持 PNG、JPEG、GIF、WebP、BMP、SVG、ICO 图片。".to_string()
    })?;
    let meta = std::fs::metadata(&p).map_err(|e| {
        log::debug!("fs_read_file_data_url stat({}) failed: {e}", p.display());
        e.to_string()
    })?;
    let size = meta.len();
    if size > MAX_IMAGE_DATA_URL_BYTES {
        return Err(format!(
            "图片过大（{size} 字节，上限 {MAX_IMAGE_DATA_URL_BYTES} 字节）。"
        ));
    }
    let bytes = std::fs::read(&p).map_err(|e| {
        log::debug!("fs_read_file_data_url read({}) failed: {e}", p.display());
        e.to_string()
    })?;
    let encoded = STANDARD.encode(bytes);
    Ok(DataUrlResult {
        data_url: format!("data:{media_type};base64,{encoded}"),
        media_type: media_type.to_string(),
        size,
    })
}

#[tauri::command]
pub fn fs_read_file_data_url(
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<DataUrlResult, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    fs_read_file_data_url_impl(&path, &workspace, &registry)
}

#[derive(Serialize, Clone)]
struct FileWrittenEvent {
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    source: Option<String>,
}

/// Atomic write via O_EXCL tempfile in the target's parent, then rename.
/// The random suffix is what blocks pre-staged symlink attacks.
fn write_atomic(target: &Path, content: &[u8]) -> std::io::Result<()> {
    let parent = target.parent().ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::InvalidInput, "path has no parent")
    })?;
    let mut tmp = NamedTempFile::new_in(parent)?;
    tmp.as_file_mut().write_all(content)?;
    tmp.as_file_mut().sync_all()?;
    tmp.persist(target).map_err(|e| e.error)?;
    Ok(())
}

fn fs_write_file_impl(
    path: &str,
    content: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<(), String> {
    let target = super::require_authorized(registry, workspace, path)?;
    let original_permissions = fs::metadata(&target).ok().map(|m| m.permissions());
    write_atomic(&target, content.as_bytes()).map_err(|e| {
        log::warn!("fs_write_file({}) failed: {e}", target.display());
        e.to_string()
    })?;

    if let Some(perms) = original_permissions {
        let _ = fs::set_permissions(&target, perms);
    }
    Ok(())
}

#[tauri::command]
pub fn fs_write_file(
    path: String,
    content: String,
    workspace: Option<WorkspaceEnv>,
    source: Option<String>,
    app: tauri::AppHandle,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<(), String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    fs_write_file_impl(&path, &content, &workspace, &registry)?;
    let _ = app.emit(
        "fs:file-written",
        FileWrittenEvent {
            path,
            source,
        },
    );
    Ok(())
}

fn fs_canonicalize_impl(
    path: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<String, String> {
    let canon = super::require_authorized(registry, workspace, path)?;
    Ok(super::to_canon(&canon))
}

#[tauri::command]
pub fn fs_canonicalize(
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<String, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    fs_canonicalize_impl(&path, &workspace, &registry)
}

fn fs_stat_impl(
    path: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<FileStat, String> {
    let p = super::require_authorized(registry, workspace, path)?;
    let meta = std::fs::metadata(&p).map_err(|e| e.to_string())?;
    let kind = if meta.is_dir() {
        StatKind::Dir
    } else if meta.file_type().is_symlink() {
        StatKind::Symlink
    } else {
        StatKind::File
    };
    let mtime = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    Ok(FileStat {
        size: meta.len(),
        mtime,
        kind,
    })
}

#[tauri::command]
pub fn fs_stat(
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<FileStat, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    fs_stat_impl(&path, &workspace, &registry)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_registry(root: &std::path::Path) -> WorkspaceRegistry {
        let registry = WorkspaceRegistry::default();
        registry.authorize(root).ok();
        registry
    }

    #[test]
    fn read_file_classifies_utf8_as_text() {
        let dir = tempfile::tempdir().unwrap();
        let reg = test_registry(dir.path());
        let f = dir.path().join("a.txt");
        std::fs::write(&f, b"hello world").unwrap();
        match fs_read_file_impl(&f.to_string_lossy(), &WorkspaceEnv::Local, &reg).unwrap() {
            ReadResult::Text { content, size } => {
                assert_eq!(content, "hello world");
                assert_eq!(size, 11);
            }
            _ => panic!("expected text"),
        }
    }

    #[test]
    fn read_file_detects_binary_via_null_byte() {
        let dir = tempfile::tempdir().unwrap();
        let reg = test_registry(dir.path());
        let f = dir.path().join("a.bin");
        std::fs::write(&f, b"PNG\0\x89image").unwrap();
        assert!(matches!(
            fs_read_file_impl(&f.to_string_lossy(), &WorkspaceEnv::Local, &reg).unwrap(),
            ReadResult::Binary { .. }
        ));
    }

    #[test]
    fn read_file_detects_binary_via_invalid_utf8() {
        let dir = tempfile::tempdir().unwrap();
        let reg = test_registry(dir.path());
        let f = dir.path().join("a.bin");
        // Invalid UTF-8 with no null byte: must still classify as binary.
        std::fs::write(&f, [0xff, 0xfe, 0xfd, 0xfc]).unwrap();
        assert!(matches!(
            fs_read_file_impl(&f.to_string_lossy(), &WorkspaceEnv::Local, &reg).unwrap(),
            ReadResult::Binary { .. }
        ));
    }

    #[test]
    fn overwrites_existing_target() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("note.txt");
        std::fs::write(&target, b"old").unwrap();
        write_atomic(&target, b"new").unwrap();
        assert_eq!(std::fs::read(&target).unwrap(), b"new");
    }

    #[cfg(unix)]
    #[test]
    fn does_not_follow_legacy_staging_symlink() {
        use std::os::unix::fs::symlink;
        let dir = tempfile::tempdir().unwrap();
        let outside = dir.path().join("outside.txt");
        std::fs::write(&outside, b"untouched").unwrap();

        let target = dir.path().join("note.txt");
        // Pre-stage a symlink at the legacy deterministic staging path.
        let legacy = dir.path().join(".note.txt.gencode.tmp");
        symlink(&outside, &legacy).unwrap();

        write_atomic(&target, b"payload").unwrap();

        assert_eq!(std::fs::read(&target).unwrap(), b"payload");
        // The pre-staged symlink target must not have been written through.
        assert_eq!(std::fs::read(&outside).unwrap(), b"untouched");
    }
}
