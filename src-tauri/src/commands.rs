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

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn format_lock_error_has_frozen_wire_format() {
        let info = LockInfo {
            user: "tanaka".to_string(),
            machine: "DESKTOP-ABC".to_string(),
            pid: 1234,
            app: "Verde".to_string(),
            locked_at: "2026-04-19T10:30:00Z".to_string(),
        };
        // The frontend parser splits on ':' after the LOCKED prefix; any
        // change here is a coordinated breaking change with Task 2.
        assert_eq!(
            format_lock_error(&info),
            "LOCKED:tanaka:DESKTOP-ABC:2026-04-19T10:30:00Z"
        );
    }

    /// Drive a Future to completion on the current thread without pulling
    /// in tokio (not a workspace dep). Adequate here because open_project
    /// returns `Ready(Err(..))` synchronously on the lock-conflict path —
    /// no real awaiting happens.
    fn block_on<F: std::future::Future>(mut fut: F) -> F::Output {
        use std::pin::Pin;
        use std::task::{Context, Poll, RawWaker, RawWakerVTable, Waker};
        const VTABLE: RawWakerVTable = RawWakerVTable::new(
            |_| RawWaker::new(std::ptr::null(), &VTABLE),
            |_| {},
            |_| {},
            |_| {},
        );
        let waker =
            unsafe { Waker::from_raw(RawWaker::new(std::ptr::null(), &VTABLE)) };
        let mut cx = Context::from_waker(&waker);
        // Safety: fut is owned by this stack frame and never moved after
        // pinning here.
        let mut fut = unsafe { Pin::new_unchecked(&mut fut) };
        loop {
            if let Poll::Ready(v) = fut.as_mut().poll(&mut cx) {
                return v;
            }
        }
    }

    #[test]
    fn open_project_returns_locked_error_when_held_by_other_machine() {
        let tmp =
            env::temp_dir().join(format!("verde_cmd_lock_test_{}.xlsm", std::process::id()));
        std::fs::write(&tmp, b"dummy").unwrap();
        let lock_path = LockManager::lock_path(tmp.to_str().unwrap());

        // Hand-write a lock that pretends to be held on a different host
        // so the stale-same-machine fast path cannot kick in.
        let foreign = LockInfo {
            user: "alice".to_string(),
            machine: "OTHER-HOST".to_string(),
            pid: 1,
            app: "Verde".to_string(),
            locked_at: "2026-04-19T10:30:00Z".to_string(),
        };
        std::fs::write(&lock_path, serde_json::to_string(&foreign).unwrap()).unwrap();

        let result = block_on(open_project(tmp.to_str().unwrap().to_string()));

        // Cleanup before asserting so a failure doesn't leak the lock.
        let _ = std::fs::remove_file(&lock_path);
        let _ = std::fs::remove_file(&tmp);

        let err = result.expect_err("expected LOCKED error");
        assert!(
            err.starts_with("LOCKED:"),
            "error should start with LOCKED: prefix, got: {err}"
        );
        assert!(err.contains("alice"), "error should include holder user");
        assert!(
            err.contains("OTHER-HOST"),
            "error should include holder machine"
        );
    }
}
