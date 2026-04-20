use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

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
        meta.modules
            .entry(filename.to_string())
            .and_modify(|m| {
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
            let xlsm_path: Option<String> =
                Self::read_meta(project_id).ok().map(|m| m.xlsm_path);

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

    pub async fn sync_to_excel(
        &self,
        _project_id: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // TODO: PowerShell COM経由でExcelにインポート
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
            return Err("Project not found".into());
        }
        let meta = Self::read_meta(project_id)?;
        Ok(ProjectInfo {
            project_id: meta.project_id,
            xlsm_path: meta.xlsm_path,
            project_dir: project_dir.to_string_lossy().to_string(),
            modules: meta.modules.into_values().collect(),
        })
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
    fn project_id_is_stable_for_path() {
        let a = ProjectManager::project_id_from_path("C:/foo/bar.xlsm");
        let b = ProjectManager::project_id_from_path("C:/foo/bar.xlsm");
        assert_eq!(a, b);
        assert_eq!(a.len(), 16);
    }
}
