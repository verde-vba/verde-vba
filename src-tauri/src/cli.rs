//! CLI subcommand dispatch for the `verde` binary.
//!
//! The same binary serves two modes:
//! - No arguments (or unrecognized first arg) → launch the Tauri GUI.
//! - `verde serve --project <xlsm-path>` → spawn the MCP server over stdio.
//!
//! The parser (backed by `clap`) and the [`build_serve_command`] helper are
//! pure — they produce a fully-formed [`Command`] without running it — so
//! unit tests can assert on the exact program, args, and env the CLI would
//! hand to the OS. The [`run`] helper accepts an injectable runner closure
//! so the spawn step itself is also testable in isolation.

use clap::{Args, Parser, Subcommand};
use std::io;
use std::path::{Path, PathBuf};
use std::process::{exit, Command, ExitStatus};

/// Name of the environment variable the MCP server reads to locate the
/// active `.xlsm` project. Kept as a constant so tests can assert on it.
pub const VERDE_PROJECT_ENV: &str = "VERDE_PROJECT";

/// JavaScript runtime used to execute the MCP server script. For the MVP
/// this is fixed to `bun`; a future iteration may fall back to `node`.
pub const MCP_RUNTIME: &str = "bun";

/// Relative path from the MCP server's containing directory root that the
/// CLI hands to the runtime. Stored as a constant to keep
/// [`build_serve_command`] deterministic for tests.
pub const MCP_SERVER_SCRIPT: &str = "mcp/server.js";

/// Parsed top-level command for the CLI.
///
/// [`parse_args`] returns this enum so callers (currently `main`) can
/// dispatch to either the GUI entry point or the MCP spawn path without
/// re-walking argv.
#[derive(Debug, PartialEq, Eq)]
pub enum CliCommand {
    /// Default mode: launch the desktop GUI.
    Gui,
    /// Start the MCP server for the given `.xlsm` project.
    Serve { project: String },
}

/// `clap`-derived root parser.
///
/// Wrapping clap's types in a private struct keeps the public surface small
/// — callers only need [`parse_args`] and [`CliCommand`].
#[derive(Debug, Parser)]
#[command(
    name = "verde",
    about = "AI-native VBA development environment",
    disable_help_subcommand = true
)]
struct Cli {
    #[command(subcommand)]
    command: Option<CliSubcommand>,
}

#[derive(Debug, Subcommand)]
enum CliSubcommand {
    /// Start the MCP server for a given `.xlsm` project.
    Serve(ServeArgs),
}

#[derive(Debug, Args)]
struct ServeArgs {
    /// Absolute path to the `.xlsm` workbook to serve.
    #[arg(short = 'p', long = "project", value_parser = non_empty_project)]
    project: String,
}

/// clap value parser that rejects an empty `--project` value up front.
///
/// Without this, clap's default `String` parser happily accepts `""`,
/// which would propagate to `VERDE_PROJECT=""` and surface as a confusing
/// downstream failure from the MCP server.
fn non_empty_project(s: &str) -> Result<String, String> {
    if s.is_empty() {
        Err("--project must not be empty".to_string())
    } else {
        Ok(s.to_string())
    }
}

/// Parse CLI arguments (excluding argv[0]) into a [`CliCommand`].
///
/// Returns `Err(message)` for usage errors so callers can decide whether to
/// print and exit or propagate. Unknown subcommands fall back to the GUI
/// path to preserve the double-click launch experience.
pub fn parse_args(args: &[String]) -> Result<CliCommand, String> {
    // `clap` wants the program name at argv[0]; prepend a placeholder.
    let mut argv: Vec<String> = Vec::with_capacity(args.len() + 1);
    argv.push("verde".to_string());
    argv.extend(args.iter().cloned());

    match Cli::try_parse_from(&argv) {
        Ok(Cli { command: None }) => Ok(CliCommand::Gui),
        Ok(Cli {
            command: Some(CliSubcommand::Serve(ServeArgs { project })),
        }) => Ok(CliCommand::Serve { project }),
        Err(err) => classify_parse_error(args, err),
    }
}

/// Decide whether a clap error should surface to the user or silently route
/// to the GUI.
///
/// Tauri launches the binary with no args on double-click; an unknown first
/// arg (e.g. a file path the OS passed in) should not blow up the app, so
/// only `serve`-specific errors propagate.
fn classify_parse_error(args: &[String], err: clap::Error) -> Result<CliCommand, String> {
    let first_is_serve = args.first().map(|s| s.as_str()) == Some("serve");
    if first_is_serve {
        Err(format_serve_error(err))
    } else {
        Ok(CliCommand::Gui)
    }
}

/// Flatten a clap error into a short message suited for `eprintln!`.
///
/// Clap can render multi-line diagnostics (e.g. the missing-required-arg
/// case lists offenders on a follow-up line). We keep every line before
/// the "Usage:" block so the resulting message still mentions flag names,
/// which tests and users both rely on.
fn format_serve_error(err: clap::Error) -> String {
    let rendered = err.to_string();
    let body: Vec<&str> = rendered
        .lines()
        .take_while(|l| !l.trim_start().to_ascii_lowercase().starts_with("usage:"))
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .collect();
    if body.is_empty() {
        rendered.trim().to_string()
    } else {
        body.join(" ")
            .trim_start_matches("error:")
            .trim()
            .to_string()
    }
}

/// Build the `Command` that would spawn the MCP server for `project`.
///
/// Pure function — does not touch the filesystem or spawn anything. The
/// returned [`Command`] carries the runtime program, the resolved
/// `server_js` path as its first argument, and `VERDE_PROJECT` set to
/// `project`. Tests use this to assert the exact shape passed to the OS.
pub fn build_serve_command(project: &Path, server_js: &Path) -> Command {
    let mut cmd = Command::new(MCP_RUNTIME);
    cmd.arg(server_js);
    cmd.env(VERDE_PROJECT_ENV, project);
    cmd
}

/// Execute a prepared `Command` using an injectable runner.
///
/// The runner closure exists so tests can drive [`run`] without forking a
/// real child process. Production code hands in a closure that calls
/// `Command::status`.
pub fn run<F>(cmd: Command, runner: F) -> io::Result<ExitStatus>
where
    F: FnOnce(Command) -> io::Result<ExitStatus>,
{
    runner(cmd)
}

/// Entry point invoked from `main` when the `serve` subcommand is selected.
///
/// Exits the process; never returns on success or failure. Re-parses `args`
/// as `serve <args...>` so callers can pass through the tail of argv they
/// already matched.
pub fn run_serve(args: &[String]) -> ! {
    match parse_args_with_subcommand(args) {
        Ok(CliCommand::Serve { project }) => exec_serve(&project),
        Ok(CliCommand::Gui) => {
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

/// Prepend the `serve` subcommand token so [`parse_args`] can validate
/// flags the same way it would for a top-level invocation.
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

    let cmd = build_serve_command(Path::new(project), &server_js);
    let status = run(cmd, |mut c| c.status()).unwrap_or_else(|e| {
        eprintln!("verde serve: failed to spawn {MCP_RUNTIME}: {e}");
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
        exe_dir.join(MCP_SERVER_SCRIPT),
        // cargo run from src-tauri: target/debug or target/release
        exe_dir.join("../..").join(MCP_SERVER_SCRIPT),
        // cargo run from repo root (target/debug inside src-tauri/target)
        exe_dir.join("../../..").join(MCP_SERVER_SCRIPT),
        // Extra hop for workspace layouts
        exe_dir.join("../../../..").join(MCP_SERVER_SCRIPT),
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

    #[test]
    fn parse_args_serve_rejects_empty_project() {
        // An empty --project value would cause the MCP server to spawn with
        // VERDE_PROJECT="", failing downstream with a confusing error. The
        // CLI should reject it up front and mention the offending flag so
        // the user can fix their invocation.
        let args = v(&["serve", "--project", ""]);
        let err = parse_args(&args).expect_err("empty --project should be rejected");
        assert!(err.contains("--project"), "message was: {err}");
    }

    #[test]
    fn parse_args_serve_accepts_short_alias_p() {
        // Pin the `-p` short alias so it cannot be silently dropped; Claude
        // Desktop configs and docs may rely on the short form.
        let args = v(&["serve", "-p", "/tmp/x.xlsm"]);
        assert_eq!(
            parse_args(&args).unwrap(),
            CliCommand::Serve {
                project: "/tmp/x.xlsm".to_string()
            }
        );
    }

    #[test]
    fn build_serve_command_sets_verde_project_env() {
        // Regression guard for the Phase 2 bug where the CLI passed the
        // project as a positional arg instead of via VERDE_PROJECT env.
        let cmd = build_serve_command(Path::new("/tmp/x.xlsm"), Path::new("mcp/server.js"));
        let found = cmd
            .get_envs()
            .find(|(k, _)| *k == std::ffi::OsStr::new(VERDE_PROJECT_ENV));
        let (_, value) = found.expect("VERDE_PROJECT env var must be set");
        assert_eq!(value, Some(std::ffi::OsStr::new("/tmp/x.xlsm")));
    }

    #[test]
    fn build_serve_command_uses_bun_runtime_and_server_js_arg() {
        // Pin the runtime program and that the server script is passed as
        // an argument.
        let cmd = build_serve_command(Path::new("/tmp/x.xlsm"), Path::new("mcp/server.js"));
        assert_eq!(cmd.get_program(), std::ffi::OsStr::new("bun"));
        assert!(
            cmd.get_args()
                .any(|a| a == std::ffi::OsStr::new("mcp/server.js")),
            "server_js path should appear in argv"
        );
    }

    #[test]
    fn build_serve_command_does_not_pass_project_as_positional_arg() {
        // Explicit regression pin for the Phase 2 bug: the project path
        // must travel via env, not argv.
        let cmd = build_serve_command(Path::new("/tmp/x.xlsm"), Path::new("mcp/server.js"));
        for arg in cmd.get_args() {
            assert_ne!(arg, std::ffi::OsStr::new("--project"));
            assert_ne!(arg, std::ffi::OsStr::new("/tmp/x.xlsm"));
        }
    }

    #[cfg(unix)]
    #[test]
    fn run_propagates_exit_status_from_runner() {
        // Gated to Unix because ExitStatus construction from a raw code is
        // platform-specific; the contract being pinned (runner's Ok value
        // is returned verbatim) is platform-independent.
        use std::os::unix::process::ExitStatusExt;
        let cmd = build_serve_command(Path::new("/tmp/x.xlsm"), Path::new("mcp/server.js"));
        let expected = ExitStatus::from_raw(0);
        let got = run(cmd, |_c| Ok(expected)).expect("runner Ok should pass through");
        assert_eq!(got.code(), expected.code());
    }

    #[test]
    fn run_propagates_io_error_from_runner() {
        let cmd = build_serve_command(Path::new("/tmp/x.xlsm"), Path::new("mcp/server.js"));
        let err = run(cmd, |_c| {
            Err(io::Error::new(io::ErrorKind::NotFound, "boom"))
        })
        .expect_err("runner Err should pass through");
        assert_eq!(err.kind(), io::ErrorKind::NotFound);
    }
}
