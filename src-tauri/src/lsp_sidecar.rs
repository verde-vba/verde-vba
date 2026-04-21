//! LSP sidecar bridge — Sprint 32.D stub.
//!
//! This module reserves the Tauri IPC surface that Sprint 32.G will
//! fill in (child process spawn, stdin writer task, stdout forwarder
//! emitting `lsp://message`, exit watcher emitting `lsp://exit`).
//! Today it only contracts the shape that the frontend bridge
//! (`src/lib/lsp-bridge.ts`, Sprint 32.C) agreed on:
//!
//! - Command:  `lsp_send(message: serde_json::Value) -> Result<(), String>`
//! - Event:    `lsp://message` — inbound JSON-RPC from the sidecar
//! - Event:    `lsp://exit`    — `{ code: Option<i32>, signal: Option<String> }`
//!
//! The stub rejects every `lsp_send` call with the sentinel string
//! `NOT_SPAWNED`, making the "sidecar not wired yet" state visible
//! instead of silently swallowing frames. Sprint 32.G replaces the body.

use serde::{Deserialize, Serialize};
use tauri::command;

// Event name & payload constants characterize the wire contract with
// `src/lib/lsp-bridge.ts` (Sprint 32.C). They are not consumed from
// production Rust code until Sprint 32.G wires the sidecar spawner —
// `#[allow(dead_code)]` holds the anti-drift tests (below) while
// keeping clippy green. Same pattern as Sprint 25 / 27 pure helpers
// landed one sprint ahead of their production callers.
#[allow(dead_code)]
pub const LSP_MESSAGE_EVENT: &str = "lsp://message";
#[allow(dead_code)]
pub const LSP_EXIT_EVENT: &str = "lsp://exit";

/// Sentinel string surfaced by `lsp_send` while the sidecar is not yet
/// spawned (Sprint 32.D ↔ 32.G transition). The frontend treats this
/// as `onLspLoadError` signal rather than a real LSP protocol error.
pub const LSP_NOT_SPAWNED_SENTINEL: &str = "NOT_SPAWNED";

/// Payload emitted on `lsp://exit`. Mirrors
/// `LspExitPayload` in `src/lib/lsp-bridge.ts`. The symmetry is
/// intentional — Sprint 32.G wires this struct directly to Tauri's
/// event emitter with no translation layer.
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LspExitPayload {
    pub code: Option<i32>,
    pub signal: Option<String>,
}

/// Stub command — Sprint 32.G replaces the body with a write to the
/// spawned sidecar's stdin. The `message` parameter is a raw
/// JSON-RPC object forwarded from the frontend; accepting
/// `serde_json::Value` keeps the contract transport-agnostic so the
/// Rust side never needs to re-derive LSP's method/params schemas.
#[command]
pub async fn lsp_send(_message: serde_json::Value) -> Result<(), String> {
    Err(LSP_NOT_SPAWNED_SENTINEL.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    /// Same pattern as `commands::tests::block_on` — drive a Future
    /// to completion without adding tokio as a dep. Adequate because
    /// the stub resolves `Ready(Err(..))` synchronously.
    fn block_on<F: std::future::Future>(mut fut: F) -> F::Output {
        use std::pin::Pin;
        use std::task::{Context, Poll, RawWaker, RawWakerVTable, Waker};
        const VTABLE: RawWakerVTable = RawWakerVTable::new(
            |_| RawWaker::new(std::ptr::null(), &VTABLE),
            |_| {},
            |_| {},
            |_| {},
        );
        let waker = unsafe { Waker::from_raw(RawWaker::new(std::ptr::null(), &VTABLE)) };
        let mut cx = Context::from_waker(&waker);
        // Safety: fut is owned by this stack frame and never moved after
        // pinning here.
        let mut fut = unsafe { Pin::new_unchecked(&mut fut) };
        loop {
            if let Poll::Ready(v) = fut.as_mut().poll(&mut cx) {
                return v;
            }
        }
    }

    #[test]
    fn event_names_match_frontend_bridge_contract() {
        // These strings are the wire contract with src/lib/lsp-bridge.ts.
        // Any change here requires a coordinated frontend update.
        assert_eq!(LSP_MESSAGE_EVENT, "lsp://message");
        assert_eq!(LSP_EXIT_EVENT, "lsp://exit");
    }

    #[test]
    fn sentinel_matches_frontend_expectations() {
        // Frontend's onLspLoadError branch (to be added in Sprint 32.G)
        // discriminates by this exact string; characterize it here so
        // cross-repo renames surface as a test break rather than a
        // silent bridge mismatch.
        assert_eq!(LSP_NOT_SPAWNED_SENTINEL, "NOT_SPAWNED");
    }

    #[test]
    fn lsp_send_returns_not_spawned_sentinel_while_stub() {
        let result = block_on(lsp_send(json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {"capabilities": {}}
        })));
        assert_eq!(result, Err(LSP_NOT_SPAWNED_SENTINEL.to_string()));
    }

    #[test]
    fn exit_payload_serializes_with_expected_field_names() {
        // snake_case -> camelCase mismatch is a classic Tauri event
        // shape trap. Pin the serialized field names so Sprint 32.G
        // wiring does not silently deliver unreadable payloads.
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
}
