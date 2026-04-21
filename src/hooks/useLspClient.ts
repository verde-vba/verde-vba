// Sprint 32.G GREEN — verde-lsp sidecar handshake + error router.
//
// This hook drives the LSP client lifecycle from the React side:
//   - asks the Rust backend to spawn the sidecar (idempotent) via the
//     caller-supplied `spawn` injection
//   - sends the LSP `initialize` request through the transport and waits
//     for its response to flip `ready` to true
//   - maps every failure mode (`NOT_SPAWNED` sentinel, other send errors,
//     sidecar exit, initialize JSON-RPC error) to a single `onError`
//     callback with a narrow union type, so Editor.tsx can render a
//     localized Banner without teaching UI code about protocol internals
//   - on `exit`, automatically retries spawn+initialize up to
//     `MAX_RETRIES` times with exponential backoff before surfacing
//     the error to the UI
//
// `monaco-languageclient` integration (document selector / completion /
// hover) is deferred to Sprint 32.H per plan.md §Sprint 32.N. The
// handshake wired here is sufficient to prove sidecar embedding works
// end-to-end; 32.H layers MCL on top using the same transport.

import { useEffect, useRef, useState } from "react";
import type { LspTransport } from "../lib/lsp-bridge";

export const LSP_NOT_SPAWNED_SENTINEL = "NOT_SPAWNED";

/// Maximum number of automatic reconnection attempts before surfacing
/// the error to the UI. Each retry uses exponential backoff:
/// 1s → 2s → 4s (three retries).
export const MAX_RETRIES = 3;
export const INITIAL_BACKOFF_MS = 1000;

/// Discriminator for why the LSP client failed to reach a ready state.
export type LspClientLoadError =
  | "not-spawned" // lsp_send returned the NOT_SPAWNED sentinel
  | "spawn-failed" // sidecar spawn / send failed with a non-sentinel error
  | "exit" // sidecar process exited while we were connected
  | "initialize-failed"; // LSP initialize response was a JSON-RPC error

export interface UseLspClientOptions {
  transport: LspTransport;
  /// Called when the LSP client reaches a terminal error state. `detail`
  /// carries the JSON-RPC error message from verde-lsp when `reason` is
  /// `"initialize-failed"`, so the UI can show what went wrong.
  onError?: (reason: LspClientLoadError, detail?: string) => void;
  /// Optional hook to spawn the sidecar before the first send. Injected
  /// so tests can exercise the handshake without a Tauri runtime; in
  /// production Editor.tsx supplies `() => invoke("lsp_spawn")`.
  spawn?: () => Promise<void>;
  /// Absolute path to the project directory (AppData). Converted to a
  /// `file://` URI and sent as `rootUri` in the LSP `initialize` request
  /// so verde-lsp knows where VBA source files live.
  projectDir?: string | null;
}

export interface UseLspClientResult {
  /// True once the LSP `initialize` response has been received and the
  /// client is accepting requests. False during handshake and after any
  /// terminal error.
  ready: boolean;
}

const INITIALIZE_REQUEST_ID = 1;

/// Convert a filesystem path to a file:// URI suitable for LSP rootUri.
/// Handles Windows drive-letter paths (C:\foo → file:///C:/foo).
function pathToFileUri(fsPath: string): string {
  const normalized = fsPath.replace(/\\/g, "/");
  // Windows absolute path: "C:/..." → "file:///C:/..."
  if (/^[A-Za-z]:/.test(normalized)) {
    return `file:///${normalized}`;
  }
  // Unix absolute path: "/home/..." → "file:///home/..."
  return `file://${normalized}`;
}

export function useLspClient(options: UseLspClientOptions): UseLspClientResult {
  const { transport, onError, spawn, projectDir } = options;
  const [ready, setReady] = useState(false);
  // Retry counter persists across effect re-runs triggered by `attempt`.
  const retryCount = useRef(0);
  // Tracks whether the current sidecar process has already been
  // initialized. Persists across StrictMode unmount → remount so the
  // second mount does not re-send `initialize` (verde-lsp rejects it
  // with -32600 "Invalid request"). Reset to `false` on sidecar exit
  // so a restarted process gets a fresh handshake.
  const initializedRef = useRef(false);
  // Incrementing `attempt` re-triggers the effect for a fresh
  // spawn+initialize cycle without unmounting the component.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let terminated = false;
    const reportOnce = (reason: LspClientLoadError, detail?: string) => {
      if (terminated) return;
      terminated = true;

      // Auto-retry on exit: the sidecar may have crashed transiently
      // (e.g. OOM, permission error on first run). Retry with
      // exponential backoff before giving up and surfacing the error.
      if (reason === "exit" && retryCount.current < MAX_RETRIES) {
        const delay = INITIAL_BACKOFF_MS * 2 ** retryCount.current;
        retryCount.current += 1;
        setTimeout(() => {
          if (!cancelled) {
            setReady(false);
            setAttempt((a) => a + 1);
          }
        }, delay);
        return;
      }

      onError?.(reason, detail);
    };

    const offMessagePromise = transport.onMessage((message) => {
      if (cancelled) return;
      if (message.id !== INITIALIZE_REQUEST_ID) return;
      if (message.error !== undefined) {
        const detail = `[${message.error.code}] ${message.error.message}`;
        console.warn("verde-lsp initialize rejected:", detail, message.error.data);
        reportOnce("initialize-failed", detail);
        return;
      }
      if (message.result !== undefined) {
        // Successful handshake — reset the retry counter so future
        // crashes get a fresh set of retries.
        retryCount.current = 0;
        initializedRef.current = true;
        setReady(true);
      }
    });

    const offExitPromise = transport.onExit(() => {
      if (cancelled) return;
      // Sidecar died — clear the initialized flag so the next
      // spawn+initialize cycle (retry or manual reload) sends a fresh
      // handshake to the new process.
      initializedRef.current = false;
      setReady(false);
      reportOnce("exit");
    });

    void (async () => {
      try {
        if (spawn) await spawn();
        if (cancelled) return;
        // StrictMode double-invokes effects (mount → unmount → remount).
        // The sidecar persists across mounts (lsp_spawn is idempotent),
        // so a second `initialize` would hit an already-initialized
        // verde-lsp which rejects with -32600 "Invalid request". Skip
        // the handshake when we know the process was already initialized.
        if (initializedRef.current) {
          setReady(true);
          return;
        }
        await transport.send({
          jsonrpc: "2.0",
          id: INITIALIZE_REQUEST_ID,
          method: "initialize",
          params: {
            processId: null,
            clientInfo: { name: "Verde", version: "0.1.0" },
            rootUri: projectDir ? pathToFileUri(projectDir) : null,
            capabilities: {},
          },
        });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        reportOnce(
          msg.includes(LSP_NOT_SPAWNED_SENTINEL) ? "not-spawned" : "spawn-failed",
        );
      }
    })();

    return () => {
      cancelled = true;
      void offMessagePromise.then((off) => off());
      void offExitPromise.then((off) => off());
    };
  }, [transport, onError, spawn, projectDir, attempt]);

  return { ready };
}
