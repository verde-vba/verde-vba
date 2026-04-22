//! File watcher — detects external changes to VBA source files in the
//! project directory and notifies the frontend via Tauri events.
//!
//! Wire contract (agreed with `src/hooks/useFileWatcher.ts`):
//!
//! - Command  `start_file_watcher(project_dir)`  — begin watching
//! - Command  `stop_file_watcher()`               — stop watching
//! - Event    `verde://file-changed`              — `{ filename, kind }`
//!
//! Self-change suppression: when Verde itself writes a module file (via
//! `save_module`), the path is inserted into a suppression set *before*
//! the write. The watcher callback checks the set, removes the entry if
//! found, and skips the event. This avoids an echo loop.

use notify_debouncer_mini::{new_debouncer, DebouncedEventKind};
use serde::Serialize;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{command, AppHandle, Emitter, State};

/// Event name emitted to the frontend when an external file change is
/// detected. The frontend listens for this in `useFileWatcher`.
pub(crate) const FILE_CHANGED_EVENT: &str = "verde://file-changed";

/// VBA module extensions the watcher cares about. Anything else
/// (`.verde-meta.json`, temp files, editor swap files) is silently dropped.
const WATCHED_EXTENSIONS: &[&str] = &["bas", "cls", "frm"];

/// Payload emitted on `verde://file-changed`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct FileChangedPayload {
    pub filename: String,
    pub kind: String,
}

/// Returns `true` if the given path has a VBA module extension.
fn is_watched_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|ext| WATCHED_EXTENSIONS.contains(&ext))
}

/// Check the suppression set for `path`. If found, remove it and return
/// `true` (meaning the event should be swallowed). Otherwise return `false`.
fn check_and_drain(suppressed: &Mutex<HashSet<PathBuf>>, path: &Path) -> bool {
    let mut guard = suppressed.lock().expect("suppression mutex poisoned");
    guard.remove(path)
}

// ---------------------------------------------------------------------------
// Tauri managed state
// ---------------------------------------------------------------------------

/// Managed Tauri state for the file watcher subsystem.
///
/// Layout mirrors `LspSidecarState`: a `Mutex<Option<_>>` that is `None`
/// when no project is open.
#[derive(Default)]
pub(crate) struct FileWatcherState {
    inner: Mutex<Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>>,
    /// Paths that Verde itself is about to write. The watcher callback
    /// checks this set and skips emit for any path found here.
    pub(crate) suppressed: Arc<Mutex<HashSet<PathBuf>>>,
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

pub(crate) fn start_watching(
    state: &FileWatcherState,
    app_handle: AppHandle,
    watch_dir: PathBuf,
) -> Result<(), String> {
    // Stop any existing watcher first.
    stop_watching(state);

    let suppressed = Arc::clone(&state.suppressed);

    let mut debouncer = new_debouncer(
        Duration::from_millis(200),
        move |result: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
            let events = match result {
                Ok(events) => events,
                Err(e) => {
                    log::warn!("file watcher error: {e}");
                    return;
                }
            };

            for event in events {
                let path = &event.path;

                if !is_watched_file(path) {
                    continue;
                }

                if check_and_drain(&suppressed, path) {
                    continue;
                }

                let filename = match path.file_name().and_then(|n| n.to_str()) {
                    Some(name) => name.to_string(),
                    None => continue,
                };

                let kind = match event.kind {
                    DebouncedEventKind::Any => "modify",
                    DebouncedEventKind::AnyContinuous => "modify",
                    _ => "modify",
                };

                let payload = FileChangedPayload {
                    filename,
                    kind: kind.to_string(),
                };

                let _ = app_handle.emit(FILE_CHANGED_EVENT, payload);
            }
        },
    )
    .map_err(|e| format!("failed to create file watcher: {e}"))?;

    debouncer
        .watcher()
        .watch(&watch_dir, notify::RecursiveMode::NonRecursive)
        .map_err(|e| format!("failed to watch directory: {e}"))?;

    let mut guard = state.inner.lock().expect("file watcher mutex poisoned");
    *guard = Some(debouncer);

    Ok(())
}

pub(crate) fn stop_watching(state: &FileWatcherState) {
    let mut guard = state.inner.lock().expect("file watcher mutex poisoned");
    // Dropping the debouncer stops the watcher.
    *guard = None;
    state
        .suppressed
        .lock()
        .expect("suppression mutex poisoned")
        .clear();
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

#[command]
pub(crate) async fn start_file_watcher(
    project_dir: String,
    app: AppHandle,
    state: State<'_, FileWatcherState>,
) -> Result<(), String> {
    start_watching(&state, app, PathBuf::from(project_dir))
}

#[command]
pub(crate) async fn stop_file_watcher(
    state: State<'_, FileWatcherState>,
) -> Result<(), String> {
    stop_watching(&state);
    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::path::PathBuf;

    #[test]
    fn event_name_matches_frontend_contract() {
        assert_eq!(FILE_CHANGED_EVENT, "verde://file-changed");
    }

    #[test]
    fn payload_serializes_as_camel_case() {
        let payload = FileChangedPayload {
            filename: "Module1.bas".to_string(),
            kind: "modify".to_string(),
        };
        let value = serde_json::to_value(&payload).expect("serialize");
        assert_eq!(value, json!({"filename": "Module1.bas", "kind": "modify"}));
    }

    // --- is_watched_file ---

    #[test]
    fn is_watched_file_accepts_bas() {
        assert!(is_watched_file(Path::new("Module1.bas")));
    }

    #[test]
    fn is_watched_file_accepts_cls() {
        assert!(is_watched_file(Path::new("Sheet1.cls")));
    }

    #[test]
    fn is_watched_file_accepts_frm() {
        assert!(is_watched_file(Path::new("UserForm1.frm")));
    }

    #[test]
    fn is_watched_file_rejects_meta_json() {
        assert!(!is_watched_file(Path::new(".verde-meta.json")));
    }

    #[test]
    fn is_watched_file_rejects_swap_file() {
        assert!(!is_watched_file(Path::new("Module1.bas.swp")));
    }

    #[test]
    fn is_watched_file_rejects_no_extension() {
        assert!(!is_watched_file(Path::new("README")));
    }

    // --- suppression set ---

    #[test]
    fn suppression_drains_known_path() {
        let suppressed = Mutex::new(HashSet::new());
        let path = PathBuf::from("C:/projects/abc/Module1.bas");
        suppressed.lock().unwrap().insert(path.clone());

        assert!(check_and_drain(&suppressed, &path));
        assert!(
            suppressed.lock().unwrap().is_empty(),
            "path should be removed after drain"
        );
    }

    #[test]
    fn suppression_passes_through_unknown_path() {
        let suppressed = Mutex::new(HashSet::new());
        let path = PathBuf::from("C:/projects/abc/Module1.bas");

        assert!(!check_and_drain(&suppressed, &path));
    }

    #[test]
    fn suppression_drains_only_matching_path() {
        let suppressed = Mutex::new(HashSet::new());
        let path_a = PathBuf::from("Module1.bas");
        let path_b = PathBuf::from("Module2.bas");
        {
            let mut guard = suppressed.lock().unwrap();
            guard.insert(path_a.clone());
            guard.insert(path_b.clone());
        }

        assert!(check_and_drain(&suppressed, &path_a));
        assert_eq!(suppressed.lock().unwrap().len(), 1, "only path_a drained");
        assert!(suppressed.lock().unwrap().contains(&path_b));
    }
}
