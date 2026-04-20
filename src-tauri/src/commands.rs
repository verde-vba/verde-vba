use serde::{Deserialize, Serialize};
use tauri::command;

use crate::lock::{LockInfo, LockManager};
use crate::project::{ProjectInfo, ProjectManager};
use crate::settings::Settings;

/// Frozen wire format for the lock-conflict error string. The frontend
/// (Task 2) parses this prefix verbatim to render the "force open" dialog;
/// changing the shape requires a coordinated frontend update.
fn format_lock_error(info: &LockInfo) -> String {
    format!("LOCKED:{}:{}:{}", info.user, info.machine, info.locked_at)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModuleSaveRequest {
    pub project_id: String,
    pub filename: String,
    pub content: String,
}

#[command]
pub async fn open_project(xlsm_path: String) -> Result<ProjectInfo, String> {
    // Surface a structured LOCKED error iff the lock is held by another
    // live process. A stale same-machine lock (this host, dead pid) is
    // handled silently by LockManager::acquire's self-heal path, so we
    // skip the error in that case and let acquire clean it up.
    if LockManager::is_locked(&xlsm_path) {
        if let Some(info) = LockManager::read_lock(&xlsm_path) {
            let is_stale_same_machine = info.machine == LockManager::current_machine_name()
                && !LockManager::is_pid_alive(info.pid);
            if !is_stale_same_machine {
                return Err(format_lock_error(&info));
            }
        }
    }

    LockManager::acquire(&xlsm_path).map_err(|e| e.to_string())?;
    let manager = ProjectManager::new();
    manager.open(&xlsm_path).await.map_err(|e| {
        // Roll back the lock if the project failed to open so we don't
        // leave the workbook unusable to other instances.
        let _ = LockManager::release(&xlsm_path);
        e.to_string()
    })
}

#[command]
pub async fn close_project(xlsm_path: String) -> Result<(), String> {
    LockManager::release(&xlsm_path).map_err(|e| e.to_string())
}

#[command]
pub async fn force_open_project(xlsm_path: String) -> Result<ProjectInfo, String> {
    // Force-open is the user's explicit override after seeing the LOCKED
    // dialog. Best-effort drop the existing sentinel — if release fails
    // (e.g. file already gone), acquire below will surface the real
    // problem.
    let _ = LockManager::release(&xlsm_path);
    LockManager::acquire(&xlsm_path).map_err(|e| e.to_string())?;
    let manager = ProjectManager::new();
    manager.open(&xlsm_path).await.map_err(|e| {
        let _ = LockManager::release(&xlsm_path);
        e.to_string()
    })
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
