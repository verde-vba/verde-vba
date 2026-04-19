use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

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

    pub async fn save_module(
        &self,
        project_id: &str,
        filename: &str,
        content: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let project_dir = Self::project_dir(project_id);
        let file_path = project_dir.join(filename);
        std::fs::write(&file_path, content)?;

        // TODO: 自動的にExcelにインポート（設定で有効時）

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
        let meta_path = project_dir.join(".verde-meta.json");

        if meta_path.exists() {
            let content = std::fs::read_to_string(&meta_path)?;
            let meta: ProjectMeta = serde_json::from_str(&content)?;
            Ok(ProjectInfo {
                project_id: meta.project_id,
                xlsm_path: meta.xlsm_path,
                project_dir: project_dir.to_string_lossy().to_string(),
                modules: meta.modules.into_values().collect(),
            })
        } else {
            Err("Project not found".into())
        }
    }
}
