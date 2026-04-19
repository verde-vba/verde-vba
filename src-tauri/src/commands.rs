use serde::{Deserialize, Serialize};
use tauri::command;

use crate::project::{ProjectInfo, ProjectManager};
use crate::settings::Settings;

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleSaveRequest {
    pub project_id: String,
    pub filename: String,
    pub content: String,
}

#[command]
pub async fn open_project(xlsm_path: String) -> Result<ProjectInfo, String> {
    let manager = ProjectManager::new();
    manager.open(&xlsm_path).await.map_err(|e| e.to_string())
}

#[command]
pub async fn save_module(request: ModuleSaveRequest) -> Result<(), String> {
    let manager = ProjectManager::new();
    manager
        .save_module(&request.project_id, &request.filename, &request.content)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn sync_to_excel(project_id: String) -> Result<(), String> {
    let manager = ProjectManager::new();
    manager
        .sync_to_excel(&project_id)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn sync_from_excel(xlsm_path: String) -> Result<ProjectInfo, String> {
    let manager = ProjectManager::new();
    manager
        .sync_from_excel(&xlsm_path)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_project_info(project_id: String) -> Result<ProjectInfo, String> {
    let manager = ProjectManager::new();
    manager
        .get_info(&project_id)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_settings() -> Result<Settings, String> {
    Settings::load().map_err(|e| e.to_string())
}

#[command]
pub async fn save_settings(settings: Settings) -> Result<(), String> {
    settings.save().map_err(|e| e.to_string())
}
