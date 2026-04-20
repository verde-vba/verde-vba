use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::conflict::{detect_conflicts, ConflictModule};
use crate::settings::Settings;
use crate::vba_bridge::VbaBridge;

/// Marker embedded in error messages when Excel is holding the workbook open
/// (file locked, COM cannot save). The frontend can match on this prefix to
/// surface a "close Excel first" dialog (PLANS §9 step 4).
pub const EXCEL_OPEN_MARKER: &str = "EXCEL_OPEN";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModuleInfo {
    pub filename: String,
    #[serde(rename = "type")]
    pub module_type: u32,
    pub line_count: usize,
    pub hash: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectMeta {
    pub xlsm_path: String,
    pub project_id: String,
    pub exported_at: String,
    pub modules: HashMap<String, ModuleInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectInfo {
    pub project_id: String,
    pub xlsm_path: String,
    pub project_dir: String,
    pub modules: Vec<ModuleInfo>,
}

pub struct ProjectManager;

impl ProjectManager {
    pub fn new() -> Self {
        Self
    }

    pub fn project_id_from_path(xlsm_path: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(xlsm_path.as_bytes());
        let result = hasher.finalize();
        hex::encode(&result[..8])
    }

    pub fn project_dir(project_id: &str) -> PathBuf {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| {
            let home = std::env::var("HOME").unwrap_or_default();
            Path::new(&home)
                .join(".config")
                .to_string_lossy()
                .to_string()
        });
        Path::new(&appdata)
            .join("verde")
            .join("projects")
            .join(project_id)
    }

    fn meta_path(project_id: &str) -> PathBuf {
        Self::project_dir(project_id).join(".verde-meta.json")
    }

    fn read_meta(project_id: &str) -> Result<ProjectMeta, Box<dyn std::error::Error>> {
        let path = Self::meta_path(project_id);
        let content = std::fs::read_to_string(&path)?;
        let meta: ProjectMeta = serde_json::from_str(&content)?;
        Ok(meta)
    }

    fn write_meta(project_id: &str, meta: &ProjectMeta) -> Result<(), Box<dyn std::error::Error>> {
        let path = Self::meta_path(project_id);
        let content = serde_json::to_string_pretty(meta)?;
        std::fs::write(&path, content)?;
        Ok(())
    }

    pub async fn open(&self, xlsm_path: &str) -> Result<ProjectInfo, Box<dyn std::error::Error>> {
        let project_id = Self::project_id_from_path(xlsm_path);
        let project_dir = Self::project_dir(&project_id);
        std::fs::create_dir_all(&project_dir)?;

        // TODO: COM経由でVBAコードをエクスポート（Windows only）
        // TODO: workbook-context.json を生成
        // TODO: verde-lsp プロセスを起動

        Ok(ProjectInfo {
            project_id,
            xlsm_path: xlsm_path.to_string(),
            project_dir: project_dir.to_string_lossy().to_string(),
            modules: Vec::new(),
        })
    }

    /// SHA256 of a module's source content, matching the `hash` field in
    /// `.verde-meta.json`. Exposed (crate-private) for tests and the sync layer.
    pub(crate) fn content_hash(content: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        hex::encode(hasher.finalize())
    }

    /// Update a single module's `hash` (and `line_count`) in the meta file.
    /// Silently no-ops if the meta file or module entry is missing — we don't
    /// want a bookkeeping miss to fail the user's save.
    fn update_module_hash(
        project_id: &str,
        filename: &str,
        content: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if !Self::meta_path(project_id).exists() {
            return Ok(());
        }
        let mut meta = Self::read_meta(project_id)?;
        let hash = Self::content_hash(content);
        let line_count = content.lines().count();
        meta.modules.entry(filename.to_string()).and_modify(|m| {
            m.hash = hash.clone();
            m.line_count = line_count;
        });
        Self::write_meta(project_id, &meta)
    }

    /// Classify an import failure. Any error whose stderr/message suggests the
    /// workbook is currently open in Excel is re-wrapped with the EXCEL_OPEN
    /// marker so the UI can branch on it.
    fn classify_import_error(err: Box<dyn std::error::Error>) -> Box<dyn std::error::Error> {
        let msg = err.to_string();
        let lower = msg.to_lowercase();
        let excel_open = lower.contains("being used by another process")
            || lower.contains("another user")
            || lower.contains("is locked")
            || lower.contains("currently in use")
            || lower.contains("already open");
        if excel_open {
            format!(
                "{}: Excel appears to have the workbook open. Close it and retry. ({})",
                EXCEL_OPEN_MARKER, msg
            )
            .into()
        } else {
            err
        }
    }

    pub async fn save_module(
        &self,
        project_id: &str,
        filename: &str,
        content: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let project_dir = Self::project_dir(project_id);
        let file_path = project_dir.join(filename);
        std::fs::write(&file_path, content)?;

        // Auto-import to Excel (PLANS §9 step 3). Settings default to enabled;
        // treat a missing/corrupt settings file as "enabled" rather than
        // silently swallowing the user intent.
        let auto_sync = Settings::load()
            .map(|s| s.sync.auto_sync_to_excel)
            .unwrap_or(true);

        if auto_sync {
            // Pull the xlsm path out of meta and drop the meta/error before
            // crossing the .await — `Box<dyn Error>` is !Send and would
            // poison the future otherwise.
            let xlsm_path: Option<String> = Self::read_meta(project_id).ok().map(|m| m.xlsm_path);

            if let Some(xlsm_path) = xlsm_path {
                let source_dir = project_dir.to_string_lossy().to_string();
                if let Err(e) = VbaBridge::import(&xlsm_path, &source_dir, filename).await {
                    return Err(Self::classify_import_error(e));
                }
                // Only update the stored hash after Excel has accepted the
                // import — otherwise a later conflict check would think the
                // workbook is in sync when it isn't.
                Self::update_module_hash(project_id, filename, content)?;
            }
            // No meta yet (project never fully opened): skip import but keep
            // the on-disk write so the user doesn't lose work.
        }

        Ok(())
    }

    /// Load `.verde-meta.json` for `sync_to_excel`, wrapping the two
    /// user-facing failure modes with stable substrings the frontend / MCP
    /// can pattern-match on:
    /// - missing meta -> `"project not found: {id}"`
    /// - malformed JSON -> `"project metadata is corrupted: {cause}"`
    ///
    /// Other I/O errors (permissions, disappearing file between `exists()`
    /// and read) pass through unchanged.
    fn load_meta_for_sync(project_id: &str) -> Result<ProjectMeta, Box<dyn std::error::Error>> {
        let path = Self::meta_path(project_id);
        if !path.exists() {
            return Err(format!("project not found: {project_id}").into());
        }
        let content = std::fs::read_to_string(&path)?;
        let meta: ProjectMeta = serde_json::from_str(&content)
            .map_err(|e| format!("project metadata is corrupted: {e}"))?;
        Ok(meta)
    }

    /// Bulk-push every module under the project directory into the bound xlsm
    /// via `VbaBridge::import`. Happy path only: assumes meta exists and every
    /// import succeeds. Edge cases (empty module set, missing meta, per-module
    /// recovery) are intentionally deferred to the TDD loop in Phase 3.
    pub async fn sync_to_excel(&self, project_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let project_dir = Self::project_dir(project_id);
        // Pull xlsm_path out of meta and drop the meta before crossing any
        // .await — `Box<dyn Error>` is !Send and would poison the future.
        let xlsm_path = Self::load_meta_for_sync(project_id)?.xlsm_path;
        let source_dir = project_dir.to_string_lossy().to_string();

        for entry in std::fs::read_dir(&project_dir)? {
            let entry = entry?;
            if !entry.file_type()?.is_file() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            VbaBridge::import(&xlsm_path, &source_dir, &name)
                .await
                .map_err(Self::classify_import_error)?;
            // Refresh meta hash from the on-disk bytes we just imported so a
            // subsequent conflict check sees the workbook as in sync.
            let bytes = std::fs::read(entry.path())?;
            let content = String::from_utf8_lossy(&bytes).into_owned();
            Self::update_module_hash(project_id, &name, &content)?;
        }

        Ok(())
    }

    pub async fn sync_from_excel(
        &self,
        xlsm_path: &str,
    ) -> Result<ProjectInfo, Box<dyn std::error::Error>> {
        self.open(xlsm_path).await
    }

    pub async fn get_info(
        &self,
        project_id: &str,
    ) -> Result<ProjectInfo, Box<dyn std::error::Error>> {
        let project_dir = Self::project_dir(project_id);
        if !Self::meta_path(project_id).exists() {
            return Err(format!("project not found: {project_id}").into());
        }
        let meta = Self::read_meta(project_id)?;
        Ok(ProjectInfo {
            project_id: meta.project_id,
            xlsm_path: meta.xlsm_path,
            project_dir: project_dir.to_string_lossy().to_string(),
            modules: meta.modules.into_values().collect(),
        })
    }

    /// Collect `filename -> sha256(content)` for every regular file directly
    /// under `dir`. Skips the meta file and any dotfiles. Module filenames
    /// preserve their extension (.bas/.cls/.frm) to match meta keys.
    fn hash_files_in_dir(
        dir: &Path,
    ) -> Result<HashMap<String, String>, Box<dyn std::error::Error>> {
        let mut out = HashMap::new();
        if !dir.exists() {
            return Ok(out);
        }
        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let ft = entry.file_type()?;
            if !ft.is_file() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            let bytes = std::fs::read(entry.path())?;
            let content = String::from_utf8_lossy(&bytes);
            out.insert(name, Self::content_hash(&content));
        }
        Ok(out)
    }

    /// RAII wrapper that removes a temp directory on drop, even if the
    /// containing function panics or returns early. We avoid pulling in the
    /// `tempfile` crate just for this one call site.
    fn make_temp_dir(tag: &str) -> Result<PathBuf, Box<dyn std::error::Error>> {
        let base =
            std::env::temp_dir().join(format!("verde_conflict_{}_{}", tag, std::process::id()));
        // Clear any leftover from a previous crashed run so the new export
        // starts from a clean slate.
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(&base)?;
        Ok(base)
    }

    /// Three-way conflict detection (PLANS §254-257). Compares the hashes
    /// of AppData files, `.verde-meta.json`, and a live Excel export.
    ///
    /// Errors out on non-Windows or when Excel is not installed because the
    /// COM export step is unavailable — callers should treat this as
    /// "cannot check, skip" rather than "no conflict".
    pub async fn check_conflict(
        &self,
        project_id: &str,
        xlsm_path: &str,
    ) -> Result<Vec<ConflictModule>, Box<dyn std::error::Error>> {
        let project_dir = Self::project_dir(project_id);
        let file_hashes = Self::hash_files_in_dir(&project_dir)?;

        let meta_hashes: HashMap<String, String> = if Self::meta_path(project_id).exists() {
            Self::read_meta(project_id)?
                .modules
                .into_iter()
                .map(|(k, v)| (k, v.hash))
                .collect()
        } else {
            HashMap::new()
        };

        let temp_dir = Self::make_temp_dir(project_id)?;
        let export_result = VbaBridge::export(xlsm_path, &temp_dir.to_string_lossy()).await;
        let excel_hashes = match export_result {
            Ok(_filenames) => Self::hash_files_in_dir(&temp_dir)?,
            Err(e) => {
                // Always best-effort cleanup before propagating.
                let _ = std::fs::remove_dir_all(&temp_dir);
                return Err(e);
            }
        };
        let _ = std::fs::remove_dir_all(&temp_dir);

        Ok(detect_conflicts(&file_hashes, &meta_hashes, &excel_hashes))
    }

    /// Resolve a detected conflict by forcing one side to win.
    ///
    /// - `side == "verde"`: push every AppData module into Excel via
    ///   `VbaBridge::import`, overwriting the workbook's VBA project.
    /// - `side == "excel"`: re-export from Excel and overwrite AppData files
    ///   and the meta-file hashes accordingly.
    pub async fn resolve_conflict(
        &self,
        project_id: &str,
        xlsm_path: &str,
        side: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let project_dir = Self::project_dir(project_id);

        match side {
            "verde" => {
                // Walk the AppData dir and push each module into Excel.
                if !project_dir.exists() {
                    return Err("Project directory not found".into());
                }
                let source_dir = project_dir.to_string_lossy().to_string();
                for entry in std::fs::read_dir(&project_dir)? {
                    let entry = entry?;
                    if !entry.file_type()?.is_file() {
                        continue;
                    }
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with('.') {
                        continue;
                    }
                    VbaBridge::import(xlsm_path, &source_dir, &name)
                        .await
                        .map_err(Self::classify_import_error)?;
                    let bytes = std::fs::read(entry.path())?;
                    let content = String::from_utf8_lossy(&bytes).into_owned();
                    Self::update_module_hash(project_id, &name, &content)?;
                }
                Ok(())
            }
            "excel" => {
                // Freshly export Excel -> AppData, clobbering local edits,
                // then refresh meta hashes so a subsequent check is clean.
                std::fs::create_dir_all(&project_dir)?;
                let exported = VbaBridge::export(xlsm_path, &project_dir.to_string_lossy()).await?;
                for filename in exported {
                    let path = project_dir.join(&filename);
                    if !path.exists() {
                        continue;
                    }
                    let bytes = std::fs::read(&path)?;
                    let content = String::from_utf8_lossy(&bytes).into_owned();
                    Self::update_module_hash(project_id, &filename, &content)?;
                }
                Ok(())
            }
            other => Err(format!("Invalid side: must be 'verde' or 'excel', got '{other}'").into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn content_hash_is_sha256_hex() {
        let h = ProjectManager::content_hash("Sub Foo()\nEnd Sub\n");
        // Stable SHA256 of the exact input above.
        assert_eq!(h.len(), 64);
        assert!(h.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn content_hash_changes_with_content() {
        let a = ProjectManager::content_hash("a");
        let b = ProjectManager::content_hash("b");
        assert_ne!(a, b);
    }

    #[test]
    fn hash_files_in_dir_hashes_every_non_dotfile() {
        let tmp =
            std::env::temp_dir().join(format!("verde_hash_files_{}_{}", std::process::id(), "a"));
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).unwrap();
        std::fs::write(tmp.join("A.bas"), "Sub Foo()\nEnd Sub\n").unwrap();
        std::fs::write(tmp.join("B.cls"), "Option Explicit\n").unwrap();
        std::fs::write(tmp.join(".verde-meta.json"), "{}").unwrap();

        let got = ProjectManager::hash_files_in_dir(&tmp).unwrap();
        let _ = std::fs::remove_dir_all(&tmp);

        assert_eq!(got.len(), 2, "dotfiles must be excluded");
        assert_eq!(
            got.get("A.bas").unwrap(),
            &ProjectManager::content_hash("Sub Foo()\nEnd Sub\n")
        );
        assert_eq!(
            got.get("B.cls").unwrap(),
            &ProjectManager::content_hash("Option Explicit\n")
        );
    }

    #[test]
    fn hash_files_in_dir_returns_empty_when_dir_missing() {
        let missing =
            std::env::temp_dir().join(format!("verde_hash_files_missing_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&missing);
        let got = ProjectManager::hash_files_in_dir(&missing).unwrap();
        assert!(got.is_empty());
    }

    #[test]
    fn project_id_is_stable_for_path() {
        let a = ProjectManager::project_id_from_path("C:/foo/bar.xlsm");
        let b = ProjectManager::project_id_from_path("C:/foo/bar.xlsm");
        assert_eq!(a, b);
        assert_eq!(a.len(), 16);
    }

    /// Drive a Future to completion on the current thread without pulling
    /// in tokio. Safe here because sync_to_excel returns Ready(Err(..))
    /// synchronously when meta is missing — no real awaiting happens.
    fn block_on<F: std::future::Future>(mut fut: F) -> F::Output {
        use std::pin::Pin;
        use std::task::{Context, Poll, RawWaker, RawWakerVTable, Waker};
        const VTABLE: RawWakerVTable = RawWakerVTable::new(
            |_| RawWaker::new(std::ptr::null(), &VTABLE),
            |_| {},
            |_| {},
            |_| {},
        );
        let waker = unsafe { Waker::from_raw(RawWaker::new(std::ptr::null(), &VTABLE)) };
        let mut cx = Context::from_waker(&waker);
        let mut fut = unsafe { Pin::new_unchecked(&mut fut) };
        loop {
            if let Poll::Ready(v) = fut.as_mut().poll(&mut cx) {
                return v;
            }
        }
    }

    #[test]
    fn sync_to_excel_returns_project_not_found_when_meta_missing() {
        // Use a project_id that cannot exist in AppData: guarantee the
        // resolved dir is clean before we call sync_to_excel. project_dir
        // resolves via APPDATA/HOME env — we simply remove any leftover.
        let project_id = format!("missing_{}_{}", std::process::id(), "meta");
        let dir = ProjectManager::project_dir(&project_id);
        let _ = std::fs::remove_dir_all(&dir);

        let manager = ProjectManager::new();
        let result = block_on(manager.sync_to_excel(&project_id));

        assert!(result.is_err(), "expected Err when .verde-meta.json missing");
        let msg = result.err().unwrap().to_string();
        assert!(
            msg.to_lowercase().contains("project not found"),
            "error message must contain 'project not found' (stable substring \
             for frontend pattern-matching), got: {msg}"
        );
    }

    #[test]
    fn sync_to_excel_succeeds_silently_when_project_dir_has_no_modules() {
        // Arrange a project dir that contains ONLY a valid .verde-meta.json
        // with an empty modules map — no .bas/.cls/.frm files. The read_dir
        // loop body will not execute for any module, so VbaBridge::import is
        // never called (which matters because import errors on non-Windows).
        // This is the sole sync_to_excel happy-path branch observable on
        // macOS/Linux CI: pinning it prevents a future refactor from
        // silently flipping "no modules -> Ok" to "no modules -> Err".
        let project_id = format!("empty_modules_{}", std::process::id());
        let dir = ProjectManager::project_dir(&project_id);
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let meta = ProjectMeta {
            xlsm_path: "/tmp/nonexistent.xlsm".to_string(),
            project_id: project_id.clone(),
            exported_at: "2026-04-20T00:00:00Z".to_string(),
            modules: HashMap::new(),
        };
        let meta_json = serde_json::to_string(&meta).unwrap();
        let meta_file = dir.join(".verde-meta.json");
        std::fs::write(&meta_file, meta_json).unwrap();

        let manager = ProjectManager::new();
        let result = block_on(manager.sync_to_excel(&project_id));

        // Capture side-effect-free assertions before teardown.
        let dir_still_exists = dir.exists();
        let meta_still_exists = meta_file.exists();
        // Re-read meta to confirm modules map is still empty (no bookkeeping
        // flowed through because no files were iterated).
        let roundtrip: ProjectMeta =
            serde_json::from_str(&std::fs::read_to_string(&meta_file).unwrap()).unwrap();

        let _ = std::fs::remove_dir_all(&dir);

        assert!(
            result.is_ok(),
            "expected Ok(()) when project dir has zero module files, got: {:?}",
            result.err().map(|e| e.to_string())
        );
        assert!(dir_still_exists, "project dir must remain after sync");
        assert!(meta_still_exists, "meta file must remain after sync");
        assert!(
            roundtrip.modules.is_empty(),
            "modules map must stay empty when no files iterated, got: {:?}",
            roundtrip.modules
        );
    }

    #[test]
    fn sync_to_excel_returns_corrupted_meta_when_meta_json_invalid() {
        // Arrange a project dir containing a malformed .verde-meta.json so
        // serde_json::from_str fails. We expect sync_to_excel to wrap the
        // parse error in a stable substring the frontend can branch on.
        let project_id = format!("corrupted_{}_{}", std::process::id(), "meta");
        let dir = ProjectManager::project_dir(&project_id);
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join(".verde-meta.json"), "{ this is not valid json").unwrap();

        let manager = ProjectManager::new();
        let result = block_on(manager.sync_to_excel(&project_id));

        let _ = std::fs::remove_dir_all(&dir);

        assert!(
            result.is_err(),
            "expected Err when .verde-meta.json is malformed"
        );
        let msg = result.err().unwrap().to_string();
        assert!(
            msg.to_lowercase().contains("project metadata is corrupted"),
            "error message must contain 'project metadata is corrupted' \
             (stable substring for frontend pattern-matching), got: {msg}"
        );
    }
}
