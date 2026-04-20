pub mod cli;
mod commands;
pub mod conflict;
mod lock;
mod project;
mod settings;
mod vba_bridge;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
