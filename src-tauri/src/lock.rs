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
                    return Err(
                        format!("File is locked by {} on {}", info.user, info.machine).into(),
                    );
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

        Self::set_hidden_system_attrs(&lock_path)?;

        Ok(())
    }

    #[cfg(windows)]
    fn set_hidden_system_attrs(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        use std::os::windows::ffi::OsStrExt;
        use windows::core::PCWSTR;
        use windows::Win32::Storage::FileSystem::{
            SetFileAttributesW, FILE_ATTRIBUTE_HIDDEN, FILE_ATTRIBUTE_SYSTEM,
        };
        let wide: Vec<u16> = path
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        unsafe {
            SetFileAttributesW(
                PCWSTR(wide.as_ptr()),
                FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM,
            )
            .map_err(|e| Box::<dyn std::error::Error>::from(e.to_string()))?;
        }
        Ok(())
    }

    #[cfg(not(windows))]
    fn set_hidden_system_attrs(_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
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
    pub(crate) fn is_pid_alive(pid: u32) -> bool {
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
    pub(crate) fn is_pid_alive(pid: u32) -> bool {
        unsafe { libc::kill(pid as i32, 0) == 0 }
    }

    /// Hostname of the current machine, used by the command layer to compare
    /// against a lock's recorded `machine` field for stale-lock detection.
    pub(crate) fn current_machine_name() -> String {
        Self::machine_name()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn acquire_creates_lock_file() {
        let tmp = env::temp_dir().join(format!("verde_lock_test_{}.xlsm", std::process::id()));
        std::fs::write(&tmp, b"dummy").unwrap();
        let result = LockManager::acquire(tmp.to_str().unwrap());
        let lock_path = LockManager::lock_path(tmp.to_str().unwrap());
        let cleanup = || {
            let _ = std::fs::remove_file(&lock_path);
            let _ = std::fs::remove_file(&tmp);
        };
        if result.is_err() {
            cleanup();
            panic!("acquire failed: {:?}", result);
        }
        assert!(lock_path.exists(), "lock file should exist");
        cleanup();
    }

    #[cfg(windows)]
    #[test]
    fn acquire_sets_hidden_system_attrs_on_windows() {
        use std::os::windows::ffi::OsStrExt;
        use windows::core::PCWSTR;
        use windows::Win32::Storage::FileSystem::{
            GetFileAttributesW, FILE_ATTRIBUTE_HIDDEN, FILE_ATTRIBUTE_SYSTEM,
            INVALID_FILE_ATTRIBUTES,
        };

        let tmp = env::temp_dir().join(format!("verde_attr_test_{}.xlsm", std::process::id()));
        std::fs::write(&tmp, b"dummy").unwrap();
        LockManager::acquire(tmp.to_str().unwrap()).unwrap();
        let lock_path = LockManager::lock_path(tmp.to_str().unwrap());

        let wide: Vec<u16> = lock_path
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let attrs = unsafe { GetFileAttributesW(PCWSTR(wide.as_ptr())) };
        assert_ne!(attrs, INVALID_FILE_ATTRIBUTES.0);
        assert_ne!(attrs & FILE_ATTRIBUTE_HIDDEN.0, 0, "hidden bit must be set");
        assert_ne!(attrs & FILE_ATTRIBUTE_SYSTEM.0, 0, "system bit must be set");

        // Must clear attrs to delete on Windows
        let _ = LockManager::release(tmp.to_str().unwrap());
        let _ = std::fs::remove_file(&tmp);
    }
}
