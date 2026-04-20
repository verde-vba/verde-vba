use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Sprint 18 / PBI #3 — defense against Windows PID reuse.
///
/// On Windows, PIDs are reused after a process terminates. If Verde crashes
/// and its PID is later assigned to another process (Explorer, notepad, …),
/// `is_pid_alive` returns `true` for the unrelated process and the lock
/// becomes permanently wedged ("locked by another Verde instance") until a
/// user manually deletes `~$<file>.xlsm`.
///
/// TTL is a conservative fallback: a legitimate long-running Verde session
/// rarely exceeds 7 days; a lock older than that with an "alive" PID is
/// overwhelmingly more likely to be a reused PID than a genuinely running
/// Verde. The robust fix is image-name comparison (`QueryFullProcessImageNameW`
/// on Windows, `/proc/<pid>/comm` on Linux), tracked as follow-up #16.
const LOCK_STALE_AFTER_HOURS: i64 = 24 * 7;

#[derive(Debug, Serialize, Deserialize)]
pub struct LockInfo {
    pub user: String,
    pub machine: String,
    pub pid: u32,
    pub app: String,
    pub locked_at: String,
}

/// Pure: returns `true` iff the lock's `locked_at` is more than
/// `LOCK_STALE_AFTER_HOURS` hours before `now`. A malformed timestamp
/// returns `false` (conservative: we'd rather keep a questionable lock
/// than remove a valid one based on parse failure alone).
pub(crate) fn is_stale_by_ttl(locked_at: &str, now: DateTime<Utc>) -> bool {
    let parsed = match DateTime::parse_from_rfc3339(locked_at) {
        Ok(dt) => dt.with_timezone(&Utc),
        Err(_) => return false,
    };
    let delta = now.signed_duration_since(parsed);
    delta.num_hours() > LOCK_STALE_AFTER_HOURS
}

/// OS-specific basename expected for a same-machine lock holder.
/// Compared case-insensitively against the PID's image name.
/// Wired into `is_stale` via `is_stale_with_provider` in Sprint 27 commit 4.
#[cfg(windows)]
#[allow(dead_code)]
pub(crate) const EXPECTED_BASENAME: &str = "verde.exe";
#[cfg(target_os = "linux")]
#[allow(dead_code)]
pub(crate) const EXPECTED_BASENAME: &str = "verde";
#[cfg(target_os = "macos")]
#[allow(dead_code)]
pub(crate) const EXPECTED_BASENAME: &str = "verde";

/// Pure: decides staleness from an observed image basename.
///
/// Sprint 26 durable invariant (see plan.md Sprint 26 Key decisions):
/// this helper's `None` input means **"verified not-us"** — the caller
/// already knows the provider successfully observed the PID and reports
/// "no matching Verde image". On macOS, where the provider returns `None`
/// for *"cannot verify"*, callers must short-circuit before reaching
/// this helper (see Sprint 27 commit 4's `is_stale_with_provider`).
///
/// - `None` → `true` (the PID holds some process that is not Verde)
/// - `Some(name)` matching `expected` (case-insensitive) → `false`
/// - `Some(name)` mismatch → `true` (PID reuse detected)
#[allow(dead_code)]
pub(crate) fn is_stale_by_image_match(observed: Option<&str>, expected: &str) -> bool {
    match observed {
        None => true,
        Some(name) => !name.eq_ignore_ascii_case(expected),
    }
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
                if Self::is_stale(&info) {
                    std::fs::remove_file(&lock_path)?;
                } else if info.machine == Self::machine_name() {
                    return Err("File is locked by another Verde instance".into());
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

    /// Returns the basename of the executable image backing `pid`, lowercased.
    ///
    /// Sprint 26 durable invariant on `None` semantics (see plan.md
    /// Sprint 26 Key decisions): the meaning of `None` is resolved by
    /// `#[cfg]`, not the value itself.
    ///
    /// - **Windows/Linux**: `None` means the provider *successfully observed*
    ///   the PID and reports "no matching image" — i.e. **verified not-us**.
    ///   Callers may treat this as stale without further checks.
    /// - **macOS**: `None` means the provider **cannot verify** (no cheap
    ///   native API was adopted; `libproc` / `ps` shell-out were rejected
    ///   in Sprint 24). Callers must fall back to `is_pid_alive + TTL`.
    ///
    /// This invariant is enforced by `is_stale_with_provider` in Sprint 27
    /// commit 4 and pinned by `is_stale_macos_fallback_respects_ttl` in
    /// commit 5.
    #[cfg(windows)]
    #[allow(dead_code)]
    pub(crate) fn process_image_basename(pid: u32) -> Option<String> {
        use windows::Win32::System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT,
            PROCESS_QUERY_LIMITED_INFORMATION,
        };
        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
            let mut buf = [0u16; 260];
            let mut len = buf.len() as u32;
            let result = QueryFullProcessImageNameW(handle, PROCESS_NAME_FORMAT(0), &mut buf, &mut len);
            let _ = windows::Win32::Foundation::CloseHandle(handle);
            result.ok()?;
            let full = String::from_utf16_lossy(&buf[..len as usize]);
            Path::new(&full)
                .file_name()
                .map(|n| n.to_string_lossy().to_lowercase())
        }
    }

    #[cfg(target_os = "linux")]
    #[allow(dead_code)]
    pub(crate) fn process_image_basename(pid: u32) -> Option<String> {
        let raw = std::fs::read_to_string(format!("/proc/{}/comm", pid)).ok()?;
        let trimmed = raw.trim_end_matches(['\n', '\r']).trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_lowercase())
        }
    }

    /// macOS: no cheap native image-name API was adopted (Sprint 24 durable
    /// rejection of `libproc` FFI and `ps` shell-out). Always returns `None`
    /// meaning **"cannot verify"**; callers fall back to TTL.
    #[cfg(target_os = "macos")]
    #[allow(dead_code)]
    pub(crate) fn process_image_basename(_pid: u32) -> Option<String> {
        None
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

    /// Returns `true` iff the lock should be treated as stale (safe to
    /// overwrite / ignore). Combines machine-local PID liveness with a
    /// TTL fallback to survive Windows PID reuse after a Verde crash.
    ///
    /// - **Same machine, PID dead** → stale (original behavior).
    /// - **Same machine, PID alive, TTL expired** → stale. PID reuse is
    ///   more plausible than a legitimate multi-day Verde session; this
    ///   prevents the lock from wedging permanently.
    /// - **Same machine, PID alive, within TTL** → not stale.
    /// - **Different machine, within TTL** → not stale (PID check impossible).
    /// - **Different machine, TTL expired** → stale. An abandoned lock on
    ///   a foreign host is the common "user forgot to close" scenario.
    pub(crate) fn is_stale(info: &LockInfo) -> bool {
        let same_machine = info.machine == Self::machine_name();
        let ttl_expired = is_stale_by_ttl(&info.locked_at, Utc::now());
        if same_machine {
            !Self::is_pid_alive(info.pid) || ttl_expired
        } else {
            ttl_expired
        }
    }

    /// Testable variant of `is_stale` that accepts an injectable image-name
    /// provider and a `now` timestamp. Sprint 27 commit 3 RED stub: the
    /// provider argument is **accepted but not consumed** so that the
    /// image-match-aware RED test fails until commit 4 wires the provider
    /// into the same-machine branch.
    #[allow(dead_code)]
    pub(crate) fn is_stale_with_provider(
        info: &LockInfo,
        _provider: fn(u32) -> Option<String>,
        now: DateTime<Utc>,
    ) -> bool {
        let same_machine = info.machine == Self::machine_name();
        let ttl_expired = is_stale_by_ttl(&info.locked_at, now);
        if same_machine {
            !Self::is_pid_alive(info.pid) || ttl_expired
        } else {
            ttl_expired
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;
    use std::env;

    #[test]
    fn is_stale_by_ttl_false_for_recent_timestamp() {
        let now = Utc::now();
        let one_hour_ago = (now - Duration::hours(1)).to_rfc3339();
        assert!(!is_stale_by_ttl(&one_hour_ago, now));
    }

    #[test]
    fn is_stale_by_ttl_true_past_threshold() {
        // Threshold is 7 days (168h). Pick 8 days so we're safely past it.
        let now = Utc::now();
        let eight_days_ago = (now - Duration::days(8)).to_rfc3339();
        assert!(is_stale_by_ttl(&eight_days_ago, now));
    }

    #[test]
    fn is_stale_by_ttl_false_just_inside_threshold() {
        // 6 days and 23 hours — just under the 7-day threshold. Must stay
        // "not stale" to avoid auto-reaping a legitimate long-running
        // Verde session.
        let now = Utc::now();
        let almost = (now - Duration::hours(167)).to_rfc3339();
        assert!(!is_stale_by_ttl(&almost, now));
    }

    #[test]
    fn is_stale_by_ttl_false_for_malformed_timestamp() {
        // Conservative: an unparseable timestamp does NOT count as stale.
        // Removing a lock we can't timestamp-check is riskier than
        // leaving it in place and surfacing the locked error.
        assert!(!is_stale_by_ttl("not a date", Utc::now()));
        assert!(!is_stale_by_ttl("", Utc::now()));
        assert!(!is_stale_by_ttl("2026-04-19", Utc::now())); // missing time
    }

    #[test]
    fn is_stale_by_image_match_none_is_stale() {
        // None = "verified not-us" on Windows/Linux context. macOS callers
        // must short-circuit before reaching this helper — see Sprint 26
        // Key decisions and Sprint 27 commit 4's is_stale_with_provider.
        assert!(is_stale_by_image_match(None, "verde.exe"));
    }

    #[test]
    fn is_stale_by_image_match_exact_match_is_not_stale() {
        assert!(!is_stale_by_image_match(Some("verde.exe"), "verde.exe"));
        assert!(!is_stale_by_image_match(Some("verde"), "verde"));
    }

    #[test]
    fn is_stale_by_image_match_is_case_insensitive() {
        // Windows reports image names in whatever case the FS stores;
        // basename comparison must ignore case so `VERDE.EXE` == `verde.exe`.
        assert!(!is_stale_by_image_match(Some("VERDE.EXE"), "verde.exe"));
        assert!(!is_stale_by_image_match(Some("Verde"), "verde"));
    }

    #[test]
    fn is_stale_by_image_match_mismatch_is_stale() {
        // PID reuse detection: the PID is alive but belongs to another process.
        assert!(is_stale_by_image_match(Some("explorer.exe"), "verde.exe"));
        assert!(is_stale_by_image_match(Some("notepad.exe"), "verde.exe"));
    }

    #[test]
    fn is_stale_foreign_host_respects_ttl() {
        let recent = (Utc::now() - Duration::hours(1)).to_rfc3339();
        let ancient = (Utc::now() - Duration::days(30)).to_rfc3339();

        let fresh_foreign = LockInfo {
            user: "alice".to_string(),
            machine: "OTHER-HOST".to_string(),
            pid: 1,
            app: "Verde".to_string(),
            locked_at: recent,
        };
        assert!(
            !LockManager::is_stale(&fresh_foreign),
            "recent foreign-host lock must be respected (cannot verify PID across hosts)"
        );

        let stale_foreign = LockInfo {
            locked_at: ancient,
            ..fresh_foreign
        };
        assert!(
            LockManager::is_stale(&stale_foreign),
            "TTL-expired foreign-host lock should be reapable to avoid permanent wedge"
        );
    }

    fn foreign_image_provider(_pid: u32) -> Option<String> {
        Some("explorer.exe".to_string())
    }

    #[test]
    fn is_stale_reaps_same_machine_alive_pid_with_foreign_image() {
        // Sprint 26 durable pinned-negative signal, newly authored (no RED
        // heritage from earlier sprints). Same-machine + PID alive (self)
        // + within TTL + provider reports a non-Verde image → must reap
        // the lock. This is the Sprint 18 wedge that image-match closes.
        let info = LockInfo {
            user: "me".to_string(),
            machine: LockManager::machine_name(),
            pid: std::process::id(),
            app: "Verde".to_string(),
            locked_at: Utc::now().to_rfc3339(),
        };
        assert!(
            LockManager::is_stale_with_provider(&info, foreign_image_provider, Utc::now()),
            "alive same-machine PID whose image is not Verde must be reaped as stale"
        );
    }

    #[cfg(windows)]
    #[test]
    fn process_image_basename_returns_non_empty_for_self_on_windows() {
        let self_pid = std::process::id();
        let name = LockManager::process_image_basename(self_pid);
        assert!(
            name.as_deref().map(|s| !s.is_empty()).unwrap_or(false),
            "provider must observe self image on Windows, got {:?}",
            name
        );
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn process_image_basename_returns_non_empty_for_self_on_linux() {
        let self_pid = std::process::id();
        let name = LockManager::process_image_basename(self_pid);
        assert!(
            name.as_deref().map(|s| !s.is_empty()).unwrap_or(false),
            "provider must observe self image via /proc/<pid>/comm on Linux, got {:?}",
            name
        );
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn process_image_basename_returns_none_on_macos() {
        // macOS durable decision (Sprint 24): no cheap native API adopted.
        // `None` means "cannot verify"; is_stale_with_provider falls back to TTL.
        let self_pid = std::process::id();
        assert_eq!(LockManager::process_image_basename(self_pid), None);
    }

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
