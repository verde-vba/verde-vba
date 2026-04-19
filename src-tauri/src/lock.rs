use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct LockInfo {
    pub user: String,
    pub machine: String,
    pub pid: u32,
    pub app: String,
    pub locked_at: String,
}

pub struct LockManager;

impl LockManager {
    pub fn lock_path(xlsm_path: &str) -> PathBuf {
        let path = Path::new(xlsm_path);
        let parent = path.parent().unwrap_or(Path::new("."));
        let filename = path.file_name().unwrap_or_default().to_string_lossy();
        parent.join(format!("~${}", filename))
    }

    pub fn is_locked(xlsm_path: &str) -> bool {
        Self::lock_path(xlsm_path).exists()
    }

    pub fn read_lock(xlsm_path: &str) -> Option<LockInfo> {
        let lock_path = Self::lock_path(xlsm_path);
        let content = std::fs::read_to_string(&lock_path).ok()?;
        serde_json::from_str(&content).ok()
    }

    pub fn acquire(xlsm_path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let lock_path = Self::lock_path(xlsm_path);

        if lock_path.exists() {
            if let Some(info) = Self::read_lock(xlsm_path) {
                if info.machine == Self::machine_name() {
                    if !Self::is_pid_alive(info.pid) {
                        std::fs::remove_file(&lock_path)?;
                    } else {
                        return Err("File is locked by another Verde instance".into());
                    }
                } else {
                    return Err(format!(
                        "File is locked by {} on {}",
                        info.user, info.machine
                    )
                    .into());
                }
            }
        }

        let lock_info = LockInfo {
            user: whoami::username(),
            machine: Self::machine_name(),
            pid: std::process::id(),
            app: "Verde".to_string(),
            locked_at: chrono::Utc::now().to_rfc3339(),
        };

        let content = serde_json::to_string_pretty(&lock_info)?;
        std::fs::write(&lock_path, content)?;

        // TODO: Windows で隠し+システム属性を付与

        Ok(())
    }

    pub fn release(xlsm_path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let lock_path = Self::lock_path(xlsm_path);
        if lock_path.exists() {
            std::fs::remove_file(&lock_path)?;
        }
        Ok(())
    }

    fn machine_name() -> String {
        whoami::fallible::hostname().unwrap_or_else(|_| "unknown".to_string())
    }

    #[cfg(windows)]
    fn is_pid_alive(pid: u32) -> bool {
        use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
        unsafe {
            OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
                .map(|h| {
                    let _ = windows::Win32::Foundation::CloseHandle(h);
                    true
                })
                .unwrap_or(false)
        }
    }

    #[cfg(not(windows))]
    fn is_pid_alive(pid: u32) -> bool {
        unsafe { libc::kill(pid as i32, 0) == 0 }
    }
}
