//! CLI subcommand dispatch for the `verde` binary.
//!
//! The same binary serves two modes:
//! - No arguments (or unrecognized first arg) → launch the Tauri GUI.
//! - `verde serve --project <xlsm-path>` → spawn the MCP server over stdio.
//!
//! Keeping the parser pure (no I/O) lets us unit-test argument handling
//! without shelling out. The `run_serve` entry point performs the spawn.

use std::path::{Path, PathBuf};
use std::process::{exit, Command};

/// Parsed top-level command for the CLI.
#[derive(Debug, PartialEq, Eq)]
pub enum CliCommand {
    /// Default mode: launch the desktop GUI.
    Gui,
    /// Start the MCP server for the given `.xlsm` project.
    Serve { project: String },
}

/// Parse CLI arguments (excluding argv[0]) into a [`CliCommand`].
///
/// Returns `Err(message)` for usage errors so callers can decide whether to
/// print and exit or propagate. This keeps the parser easy to test.
pub fn parse_args(args: &[String]) -> Result<CliCommand, String> {
    let Some(first) = args.first() else {
        return Ok(CliCommand::Gui);
    };

    match first.as_str() {
        "serve" => parse_serve(&args[1..]),
        // Unrecognized subcommands fall through to GUI for now; a future
        // version may surface a help message instead.
        _ => Ok(CliCommand::Gui),
    }
}

fn parse_serve(args: &[String]) -> Result<CliCommand, String> {
    let mut project: Option<String> = None;
    let mut iter = args.iter();
    while let Some(arg) = iter.next() {
        match arg.as_str() {
            "--project" => {
                project = iter
                    .next()
                    .cloned()
                    .or_else(|| Some(String::new()))
                    .filter(|s| !s.is_empty());
                if project.is_none() {
                    return Err("--project requires a value".to_string());
                }
            }
            other => {
                return Err(format!("unexpected argument: {other}"));
            }
        }
    }
    match project {
        Some(project) => Ok(CliCommand::Serve { project }),
        None => Err("missing required --project <xlsm-path>".to_string()),
    }
}

/// Entry point invoked from `main` when the `serve` subcommand is selected.
///
/// Exits the process; never returns on success.
pub fn run_serve(args: &[String]) -> ! {
    match parse_args_with_subcommand(args) {
        Ok(CliCommand::Serve { project }) => exec_serve(&project),
        Ok(CliCommand::Gui) => {
            // Should not be reachable from main's dispatch, but guard anyway.
            eprintln!("Usage: verde serve --project <xlsm-path>");
            exit(2);
        }
        Err(msg) => {
            eprintln!("verde serve: {msg}");
            eprintln!("Usage: verde serve --project <xlsm-path>");
            exit(2);
        }
    }
}

/// Internal helper: re-parses with "serve" implicitly prepended so the
/// caller can hand us the tail of argv after the subcommand.
fn parse_args_with_subcommand(args: &[String]) -> Result<CliCommand, String> {
    let mut full = Vec::with_capacity(args.len() + 1);
    full.push("serve".to_string());
    full.extend(args.iter().cloned());
    parse_args(&full)
}

fn exec_serve(project: &str) -> ! {
    let server_js = locate_server_js().unwrap_or_else(|candidates| {
        eprintln!("verde serve: could not locate mcp/server.js");
        for c in &candidates {
            eprintln!("  tried: {}", c.display());
        }
        exit(1);
    });

    let status = Command::new("bun")
        .arg(&server_js)
        .arg(project)
        .status()
        .unwrap_or_else(|e| {
            eprintln!("verde serve: failed to spawn bun: {e}");
            exit(1);
        });

    exit(status.code().unwrap_or(1));
}

/// Search likely locations for the bundled MCP server script.
///
/// On a packaged install the script sits next to the executable under
/// `mcp/server.js`. In a dev checkout (`cargo run`) the binary lives in
/// `target/{debug,release}/` and the script is a few levels up in the
/// workspace root.
fn locate_server_js() -> Result<PathBuf, Vec<PathBuf>> {
    let exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(_) => return Err(Vec::new()),
    };
    let exe_dir = exe.parent().unwrap_or_else(|| Path::new("."));

    let candidates: Vec<PathBuf> = vec![
        // Installed: sibling resources directory
        exe_dir.join("mcp").join("server.js"),
        // cargo run from src-tauri: target/debug or target/release
        exe_dir.join("../../mcp/server.js"),
        // cargo run from repo root (target/debug inside src-tauri/target)
        exe_dir.join("../../../mcp/server.js"),
        // Extra hop for workspace layouts
        exe_dir.join("../../../../mcp/server.js"),
    ];

    for c in &candidates {
        if c.exists() {
            return Ok(c.clone());
        }
    }
    Err(candidates)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn v(items: &[&str]) -> Vec<String> {
        items.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn parse_args_serve_with_project() {
        let args = v(&["serve", "--project", "C:\\work\\sales.xlsm"]);
        assert_eq!(
            parse_args(&args).unwrap(),
            CliCommand::Serve {
                project: "C:\\work\\sales.xlsm".to_string()
            }
        );
    }

    #[test]
    fn parse_args_serve_without_project_errors() {
        let args = v(&["serve"]);
        let err = parse_args(&args).unwrap_err();
        assert!(err.contains("--project"), "message was: {err}");
    }

    #[test]
    fn parse_args_serve_project_flag_without_value_errors() {
        let args = v(&["serve", "--project"]);
        assert!(parse_args(&args).is_err());
    }

    #[test]
    fn parse_args_no_subcommand_launches_gui() {
        let args: Vec<String> = Vec::new();
        assert_eq!(parse_args(&args).unwrap(), CliCommand::Gui);
    }

    #[test]
    fn parse_args_unknown_subcommand_falls_back_to_gui() {
        let args = v(&["--not-a-command"]);
        assert_eq!(parse_args(&args).unwrap(), CliCommand::Gui);
    }

    #[test]
    fn parse_args_serve_rejects_unknown_flag() {
        let args = v(&["serve", "--weird"]);
        assert!(parse_args(&args).is_err());
    }
}
