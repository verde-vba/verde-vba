use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::conflict::{detect_conflicts, ConflictContentDto, ConflictModule};

mod com_errors;

// Re-export so external references to `project::EXCEL_OPEN_MARKER` keep
// working after the classifier moved into a submodule.
#[allow(unused_imports)]
pub use com_errors::{EXCEL_OPEN_MARKER, TRUST_ACCESS_MARKER};

/// Decode bytes exported by Excel COM into a UTF-8 String.
///
/// Fast path: if the bytes are valid UTF-8, return them as-is (zero-copy
/// check). Fallback: decode as Shift-JIS (CP932), which is what
/// `VBComponent.Export()` produces on Japanese-locale Windows. This
/// replaces the previous `String::from_utf8_lossy` strategy that turned
/// every non-ASCII Japanese character into `U+FFFD`.
fn decode_vba_bytes(bytes: &[u8]) -> String {
    if let Ok(s) = std::str::from_utf8(bytes) {
        return s.to_string();
    }
    let (cow, _, _) = encoding_rs::SHIFT_JIS.decode(bytes);
    cow.into_owned()
}

/// Advance past the current line, returning the byte offset of the next line.
fn next_line_start(source: &str, from: usize) -> usize {
    source[from..]
        .find('\n')
        .map_or(source.len(), |p| from + p + 1)
}

/// Byte offset in `source` where the VBA code body begins, past the
/// metadata header (VERSION, BEGIN…END, Attribute VB_* lines) that
/// Excel's VBA Editor hides from the user.
fn vba_body_offset(source: &str) -> usize {
    let mut pos = 0;

    // VERSION line (e.g. "VERSION 1.0 CLASS")
    if source.starts_with("VERSION ") {
        pos = next_line_start(source, pos);
    }

    // BEGIN…END block (class preamble or form layout)
    if pos < source.len()
        && (source[pos..].starts_with("BEGIN\r")
            || source[pos..].starts_with("BEGIN\n")
            || source[pos..].starts_with("Begin "))
    {
        pos = next_line_start(source, pos);
        while pos < source.len() {
            let rest = &source[pos..];
            let is_end = rest.starts_with("END\r")
                || rest.starts_with("END\n")
                || rest == "END"
                || rest.starts_with("End\r")
                || rest.starts_with("End\n")
                || rest == "End";
            pos = next_line_start(source, pos);
            if is_end {
                break;
            }
        }
    }

    // Leading Attribute VB_* lines
    while pos < source.len() && source[pos..].starts_with("Attribute VB_") {
        pos = next_line_start(source, pos);
    }

    pos
}

use crate::settings::Settings;
use crate::vba_bridge::VbaBridge;

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

/// Sort modules by type code (standard=1, class=2, form=3, document=100),
/// then alphabetically by filename within each type. This gives a stable,
/// VBE-like ordering regardless of HashMap iteration order.
fn sorted_modules(modules: HashMap<String, ModuleInfo>) -> Vec<ModuleInfo> {
    let mut list: Vec<ModuleInfo> = modules.into_values().collect();
    list.sort_by(|a, b| {
        a.module_type
            .cmp(&b.module_type)
            .then(a.filename.cmp(&b.filename))
    });
    list
}

/// RAII guard for a temp directory that Excel exports are written to.
/// Removes the directory on drop — even when the surrounding function
/// panics or returns early via `?` — so conflict-resolution paths don't
/// have to interleave cleanup with error handling.
struct TempExportDir {
    path: PathBuf,
}

impl TempExportDir {
    fn new(tag: &str) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            path: ProjectManager::make_temp_dir(tag)?,
        })
    }

    fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TempExportDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.path);
    }
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

    /// Export VBA modules from Excel into the project directory and write
    /// `.verde-meta.json`. Shared by first-open and sync-from-Excel flows.
    async fn export_and_init(
        project_id: &str,
        xlsm_path: &str,
        project_dir: &Path,
    ) -> Result<ProjectInfo, Box<dyn std::error::Error>> {
        let exported = VbaBridge::export(xlsm_path, &project_dir.to_string_lossy()).await?;

        let mut modules = HashMap::new();
        for em in &exported {
            let path = project_dir.join(&em.filename);
            let bytes = std::fs::read(&path)?;
            let content = decode_vba_bytes(&bytes);
            let hash = Self::content_hash(&content);
            let line_count = content.lines().count();
            modules.insert(
                em.filename.clone(),
                ModuleInfo {
                    filename: em.filename.clone(),
                    module_type: em.module_type,
                    line_count,
                    hash,
                },
            );
        }

        let meta = ProjectMeta {
            xlsm_path: xlsm_path.to_string(),
            project_id: project_id.to_string(),
            exported_at: chrono::Utc::now().to_rfc3339(),
            modules: modules.clone(),
        };
        Self::write_meta(project_id, &meta)?;

        let module_list = sorted_modules(modules);

        Ok(ProjectInfo {
            project_id: project_id.to_string(),
            xlsm_path: xlsm_path.to_string(),
            project_dir: project_dir.to_string_lossy().to_string(),
            modules: module_list,
        })
    }

    pub async fn open(&self, xlsm_path: &str) -> Result<ProjectInfo, Box<dyn std::error::Error>> {
        let project_id = Self::project_id_from_path(xlsm_path);
        let project_dir = Self::project_dir(&project_id);
        std::fs::create_dir_all(&project_dir)?;

        if Self::meta_path(&project_id).exists() {
            // Re-open: return existing modules without re-exporting.
            // Conflict detection (check_conflict) handles divergence.
            let meta = Self::read_meta(&project_id)?;
            let module_list = sorted_modules(meta.modules);
            return Ok(ProjectInfo {
                project_id: meta.project_id,
                xlsm_path: meta.xlsm_path,
                project_dir: project_dir.to_string_lossy().to_string(),
                modules: module_list,
            });
        }

        // First open: export from Excel and create meta. All export
        // errors propagate so the frontend can surface feedback —
        // silently falling back to an empty project leaves the user with
        // no explanation when their VBA modules don't appear.
        Self::export_and_init(&project_id, xlsm_path, &project_dir)
            .await
            .map_err(com_errors::classify_com_error)
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

    pub async fn save_module(
        &self,
        project_id: &str,
        filename: &str,
        content: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let project_dir = Self::project_dir(project_id);
        let file_path = project_dir.join(filename);

        // The editor displays code without the VBA metadata header
        // (read_module strips it). Restore the original header from the
        // on-disk file before writing so that VBComponent.Import() and
        // conflict-detection hashes stay consistent.
        let full_content = if file_path.exists() {
            let bytes = std::fs::read(&file_path)?;
            let existing = decode_vba_bytes(&bytes);
            let offset = vba_body_offset(&existing);
            if offset > 0 {
                format!("{}{content}", &existing[..offset])
            } else {
                content.to_string()
            }
        } else {
            content.to_string()
        };

        std::fs::write(&file_path, &full_content)?;

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
            let meta_path = Self::meta_path(project_id);
            let xlsm_path: Option<String> = if meta_path.exists() {
                // Meta exists: a read/parse failure is a real problem — surface it.
                match Self::read_meta(project_id) {
                    Ok(meta) => Some(meta.xlsm_path),
                    Err(e) => {
                        return Err(format!("project metadata is corrupted: {e}").into());
                    }
                }
            } else {
                // No meta yet (project never fully opened): skip import but keep
                // the on-disk write so the user doesn't lose work.
                None
            };

            if let Some(xlsm_path) = xlsm_path {
                let source_dir = project_dir.to_string_lossy().to_string();
                if let Err(e) = VbaBridge::import(&xlsm_path, &source_dir, filename).await {
                    return Err(com_errors::classify_com_error(e));
                }
                // Only update the stored hash after Excel has accepted the
                // import — otherwise a later conflict check would think the
                // workbook is in sync when it isn't.
                Self::update_module_hash(project_id, filename, &full_content)?;
            }
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

        // Collect module filenames first, then batch-import in a single
        // PowerShell/Excel session instead of one process per module.
        let mut module_files: Vec<String> = Vec::new();
        for entry in std::fs::read_dir(&project_dir)? {
            let entry = entry?;
            if !entry.file_type()?.is_file() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') {
                continue;
            }
            module_files.push(name);
        }

        let refs: Vec<&str> = module_files.iter().map(|s| s.as_str()).collect();
        VbaBridge::import_batch(&xlsm_path, &source_dir, &refs)
            .await
            .map_err(com_errors::classify_com_error)?;

        // Refresh meta hashes after the batch import succeeds so a
        // subsequent conflict check sees the workbook as in sync.
        for name in &module_files {
            let bytes = std::fs::read(project_dir.join(name))?;
            let content = decode_vba_bytes(&bytes);
            Self::update_module_hash(project_id, name, &content)?;
        }

        Ok(())
    }

    pub async fn sync_from_excel(
        &self,
        xlsm_path: &str,
    ) -> Result<ProjectInfo, Box<dyn std::error::Error>> {
        let project_id = Self::project_id_from_path(xlsm_path);
        let project_dir = Self::project_dir(&project_id);
        std::fs::create_dir_all(&project_dir)?;

        // Always re-export: the user explicitly asked to pull from Excel,
        // so we overwrite AppData files and refresh meta unconditionally.
        Self::export_and_init(&project_id, xlsm_path, &project_dir).await
    }

    /// Read a single module's source content from the project directory.
    /// Returns the code body **without** the VBA metadata header
    /// (VERSION, BEGIN…END, Attribute VB_* lines), matching what Excel's
    /// VBA Editor displays. The raw header is preserved on disk for
    /// `VBComponent.Import()` and conflict-detection hashes; `save_module`
    /// re-prepends it on write.
    pub fn read_module(
        project_id: &str,
        filename: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let project_dir = Self::project_dir(project_id);
        let path = project_dir.join(filename);
        if !path.exists() {
            return Err(format!("module not found: {filename}").into());
        }
        let bytes = std::fs::read(&path)?;
        let content = decode_vba_bytes(&bytes);
        Ok(content[vba_body_offset(&content)..].to_string())
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
        let module_list = sorted_modules(meta.modules);
        Ok(ProjectInfo {
            project_id: meta.project_id,
            xlsm_path: meta.xlsm_path,
            project_dir: project_dir.to_string_lossy().to_string(),
            modules: module_list,
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
            let content = decode_vba_bytes(&bytes);
            out.insert(name, Self::content_hash(&content));
        }
        Ok(out)
    }

    /// Create a fresh temp directory keyed by `tag`, clearing any leftover
    /// from a previous crashed run. Cleanup is the caller's responsibility;
    /// prefer [`TempExportDir::new`] which handles removal via `Drop`.
    fn make_temp_dir(tag: &str) -> Result<PathBuf, Box<dyn std::error::Error>> {
        let base =
            std::env::temp_dir().join(format!("verde_conflict_{}_{}", tag, std::process::id()));
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(&base)?;
        Ok(base)
    }

    /// Push every module named in `module_names` from AppData into the live
    /// Excel workbook and refresh the stored hashes so a subsequent conflict
    /// check is clean. Shared by the "verde wins" paths of `resolve_conflict`
    /// and `resolve_conflict_per_module`.
    async fn apply_verde_side(
        project_id: &str,
        project_dir: &Path,
        xlsm_path: &str,
        module_names: &[&str],
    ) -> Result<(), Box<dyn std::error::Error>> {
        let source_dir = project_dir.to_string_lossy().to_string();
        VbaBridge::import_batch(xlsm_path, &source_dir, module_names)
            .await
            .map_err(com_errors::classify_com_error)?;

        for name in module_names {
            let bytes = std::fs::read(project_dir.join(name))?;
            let content = decode_vba_bytes(&bytes);
            Self::update_module_hash(project_id, name, &content)?;
        }
        Ok(())
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

        let temp = TempExportDir::new(project_id)?;
        VbaBridge::export(xlsm_path, &temp.path().to_string_lossy()).await?;
        let excel_hashes = Self::hash_files_in_dir(temp.path())?;

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
                // Walk the AppData dir and batch-push all modules into Excel
                // in a single PowerShell/Excel session.
                if !project_dir.exists() {
                    return Err("Project directory not found".into());
                }
                let mut module_files: Vec<String> = Vec::new();
                for entry in std::fs::read_dir(&project_dir)? {
                    let entry = entry?;
                    if !entry.file_type()?.is_file() {
                        continue;
                    }
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with('.') {
                        continue;
                    }
                    module_files.push(name);
                }

                let refs: Vec<&str> = module_files.iter().map(|s| s.as_str()).collect();
                Self::apply_verde_side(project_id, &project_dir, xlsm_path, &refs).await
            }
            "excel" => {
                // Freshly export Excel -> AppData, clobbering local edits,
                // then refresh meta hashes so a subsequent check is clean.
                std::fs::create_dir_all(&project_dir)?;
                let exported = VbaBridge::export(xlsm_path, &project_dir.to_string_lossy()).await?;
                for em in exported {
                    let path = project_dir.join(&em.filename);
                    if !path.exists() {
                        continue;
                    }
                    let bytes = std::fs::read(&path)?;
                    let content = decode_vba_bytes(&bytes);
                    Self::update_module_hash(project_id, &em.filename, &content)?;
                }
                Ok(())
            }
            other => Err(format!("Invalid side: must be 'verde' or 'excel', got '{other}'").into()),
        }
    }

    /// Return the actual source content from both sides (AppData and live
    /// Excel) for the given list of conflicting filenames. The frontend
    /// feeds these into a Monaco DiffEditor.
    pub(crate) async fn fetch_conflict_contents(
        &self,
        project_id: &str,
        xlsm_path: &str,
        filenames: &[String],
    ) -> Result<Vec<ConflictContentDto>, Box<dyn std::error::Error>> {
        let project_dir = Self::project_dir(project_id);

        // Export Excel modules to a temp directory once — reading a single
        // COM export is far cheaper than N individual calls.
        let temp = TempExportDir::new(project_id)?;
        VbaBridge::export(xlsm_path, &temp.path().to_string_lossy()).await?;

        let mut contents = Vec::with_capacity(filenames.len());
        for filename in filenames {
            let verde_path = project_dir.join(filename);
            let verde_content = if verde_path.exists() {
                let bytes = std::fs::read(&verde_path)?;
                decode_vba_bytes(&bytes)
            } else {
                String::new()
            };

            let excel_path = temp.path().join(filename);
            let excel_content = if excel_path.exists() {
                let bytes = std::fs::read(&excel_path)?;
                decode_vba_bytes(&bytes)
            } else {
                String::new()
            };

            contents.push(ConflictContentDto {
                filename: filename.clone(),
                verde_content,
                excel_content,
            });
        }

        Ok(contents)
    }

    /// Resolve conflicts on a per-module basis. Each entry in `decisions`
    /// maps a module filename to `"verde"` or `"excel"`. Modules marked
    /// "verde" are batch-imported into Excel; modules marked "excel" are
    /// freshly exported from Excel and written to AppData.
    pub(crate) async fn resolve_conflict_per_module(
        &self,
        project_id: &str,
        xlsm_path: &str,
        decisions: &HashMap<String, String>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let project_dir = Self::project_dir(project_id);
        if !project_dir.exists() {
            return Err("Project directory not found".into());
        }

        // Partition decisions into two buckets.
        let mut verde_modules: Vec<&str> = Vec::new();
        let mut excel_modules: Vec<&str> = Vec::new();
        for (filename, side) in decisions {
            match side.as_str() {
                "verde" => verde_modules.push(filename),
                "excel" => excel_modules.push(filename),
                other => {
                    return Err(
                        format!("Invalid side for {filename}: must be 'verde' or 'excel', got '{other}'").into(),
                    );
                }
            }
        }

        // Step 1: Export Excel modules to temp dir for "excel" picks.
        // Do this BEFORE importing "verde" modules so we capture the
        // pre-resolution Excel state.
        if !excel_modules.is_empty() {
            let temp = TempExportDir::new(project_id)?;
            VbaBridge::export(xlsm_path, &temp.path().to_string_lossy()).await?;
            for filename in &excel_modules {
                let src = temp.path().join(filename);
                if src.exists() {
                    let bytes = std::fs::read(&src)?;
                    let content = decode_vba_bytes(&bytes);
                    std::fs::write(project_dir.join(filename), content.as_bytes())?;
                    Self::update_module_hash(project_id, filename, &content)?;
                }
            }
        }

        // Step 2: Batch-import "verde" modules into Excel.
        if !verde_modules.is_empty() {
            Self::apply_verde_side(project_id, &project_dir, xlsm_path, &verde_modules).await?;
        }

        Ok(())
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

    // --- vba_body_offset: metadata stripping ---

    #[test]
    fn vba_body_offset_strips_bas_attribute() {
        let source =
            "Attribute VB_Name = \"Module1\"\nOption Explicit\nSub Foo()\nEnd Sub\n";
        let offset = vba_body_offset(source);
        assert_eq!(&source[offset..], "Option Explicit\nSub Foo()\nEnd Sub\n");
    }

    #[test]
    fn vba_body_offset_strips_cls_header() {
        let source = "\
VERSION 1.0 CLASS\r\n\
BEGIN\r\n\
  MultiUse = -1  'True\r\n\
END\r\n\
Attribute VB_Name = \"Sheet1\"\r\n\
Attribute VB_GlobalNameSpace = False\r\n\
Attribute VB_Creatable = False\r\n\
Attribute VB_PredeclaredId = True\r\n\
Attribute VB_Exposed = True\r\n\
Option Explicit\r\n";
        let offset = vba_body_offset(source);
        assert_eq!(&source[offset..], "Option Explicit\r\n");
    }

    #[test]
    fn vba_body_offset_strips_cls_header_lf() {
        let source = "\
VERSION 1.0 CLASS\n\
BEGIN\n\
  MultiUse = -1  'True\n\
END\n\
Attribute VB_Name = \"Sheet1\"\n\
Attribute VB_GlobalNameSpace = False\n\
Option Explicit\n";
        let offset = vba_body_offset(source);
        assert_eq!(&source[offset..], "Option Explicit\n");
    }

    #[test]
    fn vba_body_offset_returns_zero_for_plain_code() {
        let source = "Option Explicit\nSub Foo()\nEnd Sub\n";
        assert_eq!(vba_body_offset(source), 0);
    }

    #[test]
    fn vba_body_offset_returns_zero_for_empty_string() {
        assert_eq!(vba_body_offset(""), 0);
    }

    #[test]
    fn vba_body_offset_preserves_inline_attribute_lines() {
        // Procedure-level Attribute lines in the body must NOT be stripped.
        let source = "Attribute VB_Name = \"Module1\"\n\
                       Sub Foo()\n\
                       Attribute Foo.VB_Description = \"desc\"\n\
                       End Sub\n";
        let offset = vba_body_offset(source);
        assert!(source[offset..].starts_with("Sub Foo()"));
    }

    #[test]
    fn vba_body_offset_handles_only_metadata() {
        // File with only metadata and no body code.
        let source = "Attribute VB_Name = \"Module1\"\n";
        let offset = vba_body_offset(source);
        assert_eq!(&source[offset..], "");
    }
}
