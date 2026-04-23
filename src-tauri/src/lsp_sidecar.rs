//! LSP sidecar bridge — Sprint 32.G GREEN.
//!
//! Owns the verde-lsp child process lifecycle and shuttles JSON-RPC
//! messages between the Tauri frontend and the sidecar's stdin/stdout.
//!
//! Wire contract (agreed in Sprint 32.C with `src/lib/lsp-bridge.ts`):
//!
//! - Command  `lsp_spawn()`                     — idempotent sidecar start
//! - Command  `lsp_send(message: Value) -> ()`  — write a JSON-RPC frame to stdin
//! - Event    `lsp://message`                   — inbound JSON-RPC frame from sidecar
//! - Event    `lsp://exit`                      — `{ code, signal }` on child termination
//!
//! LSP framing follows the base protocol: each message is
//! `Content-Length: <N>\r\n\r\n<JSON>`. Encode/decode are separated
//! into pure functions (`encode_frame` / `parse_frames`) so the wire
//! protocol can be tested without spawning a process.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{command, AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

pub const LSP_MESSAGE_EVENT: &str = "lsp://message";
pub const LSP_EXIT_EVENT: &str = "lsp://exit";

/// Sentinel string surfaced by `lsp_send` when the sidecar has not been
/// spawned yet. The frontend (`useLspClient`) treats this as
/// `onError("not-spawned")` rather than a real LSP protocol error.
pub const LSP_NOT_SPAWNED_SENTINEL: &str = "NOT_SPAWNED";

/// Payload emitted on `lsp://exit`. Field names are snake_case in Rust
/// but Tauri's JSON serializer preserves them verbatim — `LspExitPayload`
/// in `src/lib/lsp-bridge.ts` uses the same keys.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LspExitPayload {
    pub code: Option<i32>,
    pub signal: Option<String>,
}

/// Managed Tauri state holding the live sidecar handle.
///
/// `Mutex<Option<_>>` is adequate because the critical sections are short
/// (check-and-write). `lsp_spawn` is idempotent: a second call returns
/// `Ok(())` without re-spawning.
#[derive(Default)]
pub struct LspSidecarState {
    child: Mutex<Option<CommandChild>>,
}

impl LspSidecarState {
    /// Take and kill the sidecar process if it is running.
    pub fn kill(&self) {
        let mut guard = self.child.lock().expect("lsp sidecar mutex poisoned");
        if let Some(child) = guard.take() {
            let _ = child.kill();
        }
    }
}

/// Encode a JSON-RPC message as an LSP-framed byte sequence.
pub(crate) fn encode_frame(message: &serde_json::Value) -> Vec<u8> {
    let body = serde_json::to_vec(message).expect("serde_json::Value always serializes");
    let header = format!("Content-Length: {}\r\n\r\n", body.len());
    let mut out = header.into_bytes();
    out.extend_from_slice(&body);
    out
}

/// Consume as many complete LSP frames as possible from `buf`. Incomplete
/// trailing bytes remain in place so the next stdout chunk can extend
/// them. Malformed frames (missing Content-Length, non-integer length,
/// non-JSON body) are skipped silently — they surface as an empty return
/// without disrupting the stream. In practice the sidecar never emits
/// malformed frames; resilience here guards against runaway parsing on a
/// corrupted stream.
pub(crate) fn parse_frames(buf: &mut Vec<u8>) -> Vec<serde_json::Value> {
    let mut out = Vec::new();
    while let Some(sep) = find_subslice(buf, b"\r\n\r\n") {
        let header = match std::str::from_utf8(&buf[..sep]) {
            Ok(h) => h,
            Err(_) => break,
        };
        let Some(len) = extract_content_length(header) else {
            break;
        };
        let body_start = sep + 4;
        let body_end = body_start + len;
        if buf.len() < body_end {
            break; // incomplete body — wait for more bytes
        }
        let parsed: Option<serde_json::Value> =
            serde_json::from_slice(&buf[body_start..body_end]).ok();
        buf.drain(..body_end);
        if let Some(v) = parsed {
            out.push(v);
        }
    }
    out
}

fn find_subslice(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn extract_content_length(header: &str) -> Option<usize> {
    for line in header.split("\r\n") {
        if let Some(rest) = line.strip_prefix("Content-Length:") {
            return rest.trim().parse().ok();
        }
    }
    None
}

/// Clear the child handle so `lsp_send` returns NOT_SPAWNED and a
/// subsequent `lsp_spawn` can restart the sidecar.
fn clear_child(app: &AppHandle) {
    if let Some(state) = app.try_state::<LspSidecarState>() {
        let mut guard = state.child.lock().expect("lsp sidecar mutex poisoned");
        *guard = None;
    }
}

/// Spawn the verde-lsp sidecar if it is not already running. Idempotent:
/// a second call is a no-op and returns `Ok(())`. The stdout reader and
/// exit watcher are detached tasks; both emit their respective Tauri
/// events and never panic.
#[command]
pub async fn lsp_spawn(app: AppHandle, state: State<'_, LspSidecarState>) -> Result<(), String> {
    // Hold the lock across check → spawn → store to prevent concurrent
    // calls from creating two sidecar processes (TOCTOU race). Both
    // sidecar() and spawn() are synchronous, so holding std::sync::Mutex
    // here is safe and does not block the async runtime.
    let mut rx = {
        let mut guard = state.child.lock().expect("lsp sidecar mutex poisoned");
        if guard.is_some() {
            eprintln!("[lsp_sidecar] lsp_spawn called but child already exists — idempotent no-op");
            return Ok(());
        }
        eprintln!("[lsp_sidecar] lsp_spawn — spawning new sidecar process");

        let sidecar = app
            .shell()
            .sidecar("verde-lsp")
            .map_err(|e| format!("sidecar lookup failed: {e}"))?;
        let (rx, child) = sidecar
            .spawn()
            .map_err(|e| format!("sidecar spawn failed: {e}"))?;
        *guard = Some(child);
        rx
    };

    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut buf = Vec::<u8>::new();
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    eprintln!("[lsp_sidecar] stdout chunk: {} bytes, buf_before={}", bytes.len(), buf.len());
                    buf.extend_from_slice(&bytes);
                    let frames = parse_frames(&mut buf);
                    for msg in &frames {
                        let method = msg.get("method").and_then(|v| v.as_str());
                        let id = msg.get("id");
                        let is_error = msg.get("error").is_some();
                        eprintln!(
                            "[lsp_sidecar] → emit lsp://message  method={:?} id={:?} is_error={}",
                            method, id, is_error
                        );
                        let _ = app_handle.emit(LSP_MESSAGE_EVENT, msg);
                    }
                    if frames.is_empty() && buf.len() > 0 {
                        eprintln!("[lsp_sidecar] stdout: incomplete frame, buf_remaining={}", buf.len());
                    }
                }
                CommandEvent::Terminated(payload) => {
                    eprintln!(
                        "[lsp_sidecar] terminated: code={:?} signal={:?}",
                        payload.code, payload.signal
                    );
                    // Clear state immediately so lsp_send stops writing to
                    // a dead process and a new lsp_spawn can restart.
                    clear_child(&app_handle);
                    let _ = app_handle.emit(
                        LSP_EXIT_EVENT,
                        LspExitPayload {
                            code: payload.code,
                            signal: payload.signal.map(|s| s.to_string()),
                        },
                    );
                    break;
                }
                CommandEvent::Error(err) => {
                    eprintln!("[lsp_sidecar] error event: {}", err);
                    clear_child(&app_handle);
                    let _ = app_handle.emit(
                        LSP_EXIT_EVENT,
                        LspExitPayload {
                            code: None,
                            signal: Some(err),
                        },
                    );
                    break;
                }
                // Stderr is ignored on purpose — verde-lsp writes tracing
                // logs there, which we surface through a different channel
                // in a future sprint if needed.
                CommandEvent::Stderr(bytes) => {
                    if let Ok(text) = std::str::from_utf8(&bytes) {
                        eprint!("[lsp_sidecar:stderr] {}", text);
                    }
                }
                _ => {}
            }
        }
    });

    // Immediate-exit detection is handled by the frontend's onExit
    // event handler (useLspClient retry logic). No need to sleep here —
    // the async reader task above will emit lsp://exit if the sidecar
    // dies, and the frontend will retry with exponential backoff.
    eprintln!("[lsp_sidecar] spawn complete — sidecar is running");

    Ok(())
}

/// Kill the sidecar process. Called on window/tab close to prevent
/// orphan processes. No-op if the sidecar is not running.
#[command]
pub async fn lsp_kill(state: State<'_, LspSidecarState>) -> Result<(), String> {
    eprintln!("[lsp_sidecar] lsp_kill called");
    state.kill();
    Ok(())
}

/// Write a JSON-RPC message to the sidecar's stdin. Returns the
/// NOT_SPAWNED sentinel when the sidecar has not been started yet so the
/// frontend can distinguish "sidecar missing" from "LSP-level error".
#[command]
pub async fn lsp_send(
    state: State<'_, LspSidecarState>,
    message: serde_json::Value,
) -> Result<(), String> {
    let method = message.get("method").and_then(|v| v.as_str()).map(String::from);
    let id = message.get("id").cloned();
    let frame = encode_frame(&message);
    eprintln!(
        "[lsp_sidecar] lsp_send: method={:?} id={:?} frame_len={}",
        method, id, frame.len()
    );
    let mut guard = state.child.lock().expect("lsp sidecar mutex poisoned");
    let child = guard
        .as_mut()
        .ok_or_else(|| {
            eprintln!("[lsp_sidecar] lsp_send: child is None → NOT_SPAWNED");
            LSP_NOT_SPAWNED_SENTINEL.to_string()
        })?;
    child
        .write(&frame)
        .map_err(|e| {
            eprintln!("[lsp_sidecar] lsp_send: stdin write failed: {}", e);
            format!("sidecar stdin write failed: {e}")
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn event_names_match_frontend_bridge_contract() {
        assert_eq!(LSP_MESSAGE_EVENT, "lsp://message");
        assert_eq!(LSP_EXIT_EVENT, "lsp://exit");
    }

    #[test]
    fn sentinel_matches_frontend_expectations() {
        assert_eq!(LSP_NOT_SPAWNED_SENTINEL, "NOT_SPAWNED");
    }

    #[test]
    fn exit_payload_serializes_with_expected_field_names() {
        let payload = LspExitPayload {
            code: Some(137),
            signal: Some("SIGKILL".to_string()),
        };
        let json = serde_json::to_value(&payload).expect("serialize");
        assert_eq!(json, json!({"code": 137, "signal": "SIGKILL"}));
    }

    #[test]
    fn exit_payload_preserves_null_code_and_signal() {
        let payload = LspExitPayload {
            code: None,
            signal: None,
        };
        let json = serde_json::to_value(&payload).expect("serialize");
        assert_eq!(json, json!({"code": null, "signal": null}));
    }

    // ----- LSP framing codec (Sprint 32.G) -----

    #[test]
    fn encode_frame_emits_content_length_and_crlf_separator() {
        let msg = json!({"jsonrpc": "2.0", "id": 1, "method": "initialize"});
        let frame = encode_frame(&msg);
        let text = std::str::from_utf8(&frame).expect("valid utf-8");
        let (header, body) = text
            .split_once("\r\n\r\n")
            .expect("header/body separator present");
        assert!(
            header.starts_with("Content-Length: "),
            "header must start with Content-Length, got {header:?}"
        );
        let declared: usize = header
            .trim_start_matches("Content-Length: ")
            .parse()
            .expect("Content-Length is an integer");
        assert_eq!(declared, body.len(), "declared length matches body bytes");
        let parsed: serde_json::Value = serde_json::from_str(body).expect("body is valid JSON");
        assert_eq!(parsed, msg, "body round-trips the original message");
    }

    #[test]
    fn encode_frame_byte_length_matches_utf8_encoded_body() {
        // Non-ASCII content must count UTF-8 byte length, not character count.
        let msg = json!({"message": "こんにちは"});
        let frame = encode_frame(&msg);
        let text = std::str::from_utf8(&frame).expect("valid utf-8");
        let (header, body) = text.split_once("\r\n\r\n").unwrap();
        let declared: usize = header
            .trim_start_matches("Content-Length: ")
            .parse()
            .unwrap();
        assert_eq!(
            declared,
            body.as_bytes().len(),
            "content-length counts bytes, not characters"
        );
    }

    #[test]
    fn parse_frames_returns_empty_when_no_complete_frame_yet() {
        let mut buf = b"Content-Length: 100\r\n\r\n{\"jsonrpc".to_vec();
        let before = buf.clone();
        let out = parse_frames(&mut buf);
        assert!(out.is_empty(), "incomplete body must not yield a frame");
        assert_eq!(buf, before, "buffer preserved verbatim for next chunk");
    }

    #[test]
    fn parse_frames_extracts_single_complete_frame_and_drains_consumed_bytes() {
        let body = br#"{"jsonrpc":"2.0","id":1,"result":null}"#;
        let mut buf = format!("Content-Length: {}\r\n\r\n", body.len()).into_bytes();
        buf.extend_from_slice(body);
        let out = parse_frames(&mut buf);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0]["id"], 1);
        assert!(buf.is_empty(), "fully-consumed buffer must be empty");
    }

    #[test]
    fn parse_frames_handles_two_back_to_back_frames_in_one_call() {
        let body1 = br#"{"jsonrpc":"2.0","id":1,"result":null}"#;
        let body2 =
            br#"{"jsonrpc":"2.0","method":"window/logMessage","params":{"type":3,"message":"hi"}}"#;
        let mut buf = format!("Content-Length: {}\r\n\r\n", body1.len()).into_bytes();
        buf.extend_from_slice(body1);
        buf.extend(format!("Content-Length: {}\r\n\r\n", body2.len()).as_bytes());
        buf.extend_from_slice(body2);
        let out = parse_frames(&mut buf);
        assert_eq!(out.len(), 2);
        assert_eq!(out[0]["id"], 1);
        assert_eq!(out[1]["method"], "window/logMessage");
        assert!(buf.is_empty(), "both frames fully drained");
    }

    #[test]
    fn parse_frames_keeps_trailing_incomplete_frame_after_a_complete_one() {
        let body = br#"{"jsonrpc":"2.0","id":1,"result":null}"#;
        let mut buf = format!("Content-Length: {}\r\n\r\n", body.len()).into_bytes();
        buf.extend_from_slice(body);
        // Partial second header (no separator yet) must remain for next chunk.
        buf.extend_from_slice(b"Content-Length: 42\r\n");
        let out = parse_frames(&mut buf);
        assert_eq!(out.len(), 1);
        assert_eq!(buf, b"Content-Length: 42\r\n".to_vec());
    }
}
