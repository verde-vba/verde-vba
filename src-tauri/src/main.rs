// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use verde_lib::cli::{parse_args, CliCommand};

fn main() {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    match parse_args(&argv) {
        Ok(CliCommand::Serve { .. }) => {
            // Hand the post-`serve` tail back to run_serve for execution.
            // Skip argv[0] ("serve") so run_serve sees only its own flags.
            let tail: Vec<String> = argv.into_iter().skip(1).collect();
            verde_lib::cli::run_serve(&tail);
        }
        Ok(CliCommand::Gui) => {
            verde_lib::run();
        }
        Err(msg) => {
            eprintln!("verde: {msg}");
            eprintln!("Usage: verde [serve --project <xlsm-path>]");
            std::process::exit(2);
        }
    }
}
