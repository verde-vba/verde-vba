pub mod cli;
mod commands;
pub mod conflict;
mod lock;
mod lsp_sidecar;
mod project;
mod settings;
mod vba_bridge;

use std::sync::Mutex;

use commands::*;
use lsp_sidecar::{lsp_send, lsp_spawn, LspSidecarState};

/// File path passed via CLI when the OS opens Verde with a file argument
/// (e.g. right-click "Open with Verde"). The frontend calls
/// `get_initial_file` once on mount; `take()` ensures it is consumed at
/// most once so that hot-reload or re-mount does not re-trigger the open.
struct InitialFile(Mutex<Option<String>>);

#[tauri::command]
fn get_initial_file(state: tauri::State<'_, InitialFile>) -> Option<String> {
    state.0.lock().unwrap().take()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(initial_file: Option<String>) {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(InitialFile(Mutex::new(initial_file)))
        .manage(LspSidecarState::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_project,
            open_project_readonly,
            close_project,
            force_open_project,
            save_module,
            sync_to_excel,
            sync_from_excel,
            get_project_info,
            check_conflict,
            resolve_conflict,
            get_settings,
            save_settings,
            lsp_spawn,
            lsp_send,
            get_initial_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
