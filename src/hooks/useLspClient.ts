// Sprint 32.H — verde-lsp sidecar lifecycle + MessageConnection + Monaco providers.
//
// This hook drives the full LSP client lifecycle from the React side:
//   - asks the Rust backend to spawn the sidecar via the caller-supplied
//     `spawn` injection
//   - creates a vscode-jsonrpc MessageConnection from the LspTransport
//     adapter (lsp-message-transports.ts)
//   - sends the LSP `initialize` request and `initialized` notification
//   - registers Monaco completion/hover/diagnostics providers via
//     registerLspProviders (lsp-monaco-providers.ts)
//   - on sidecar exit, automatically retries spawn+initialize up to
//     MAX_RETRIES times with exponential backoff before surfacing the
//     error to the UI
//
// The hook is gated on the `monaco` parameter: when it is null (Monaco
// not yet loaded), the hook returns `ready: false` and does nothing.
// This avoids a race between @monaco-editor/react's async loader and
// the LSP handshake — providers are only registered after Monaco is
// available.

import { useEffect, useRef, useState } from "react";
import { createMessageConnection, ResponseError } from "vscode-jsonrpc";
import type { MessageConnection } from "vscode-jsonrpc";
import type { LspTransport } from "../lib/lsp-bridge";
import { createTransports } from "../lib/lsp-message-transports";
import {
  registerLspProviders,
  type RegisterLspProvidersOptions,
} from "../lib/lsp-monaco-providers";

export const LSP_NOT_SPAWNED_SENTINEL = "NOT_SPAWNED";

/// Maximum number of automatic reconnection attempts before surfacing
/// the error to the UI. Each retry uses exponential backoff:
/// 1s → 2s → 4s (three retries).
export const MAX_RETRIES = 3;
export const INITIAL_BACKOFF_MS = 1000;
export const INIT_TIMEOUT_MS = 10_000;

/// Discriminator for why the LSP client failed to reach a ready state.
export type LspClientLoadError =
  | "not-spawned" // lsp_send returned the NOT_SPAWNED sentinel
  | "spawn-failed" // sidecar spawn / send failed with a non-sentinel error
  | "exit" // sidecar process exited while we were connected
  | "initialize-failed"; // LSP initialize response was a JSON-RPC error

export interface UseLspClientOptions {
  transport: LspTransport;
  /// Called when the LSP client reaches a terminal error state.
  onError?: (reason: LspClientLoadError, detail?: string) => void;
  /// Optional hook to spawn the sidecar before the first send.
  spawn?: () => Promise<void>;
  /// Absolute path to the project directory (AppData). Converted to a
  /// `file://` URI and sent as `rootUri` in the LSP `initialize` request.
  projectDir?: string | null;
  /// Monaco instance from `useMonaco()`. When null, the hook does nothing.
  monaco?: typeof import("monaco-editor") | null;
}

/// Granular lifecycle state of the LSP client, exposed so the UI can
/// render a status indicator (e.g. a dot in the StatusBar).
export type LspStatus = "stopped" | "connecting" | "ready" | "error";

export interface UseLspClientResult {
  /// True once the LSP `initialize` response has been received and
  /// providers are registered. False during handshake and after errors.
  ready: boolean;
  /// Granular lifecycle state for UI display.
  status: LspStatus;
  /// The active JSON-RPC connection, non-null only when `ready` is true.
  /// Callers can use this to send LSP notifications (e.g. didOpen/didChange).
  connection: MessageConnection | null;
}

/// Convert a filesystem path to a file:// URI suitable for LSP rootUri.
export function pathToFileUri(fsPath: string): string {
  const normalized = fsPath.replace(/\\/g, "/");
  if (/^[A-Za-z]:/.test(normalized)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized}`;
}

// Monotonically increasing ID to distinguish concurrent effect instances.
let _instanceSeq = 0;

export function useLspClient(options: UseLspClientOptions): UseLspClientResult {
  const { transport, onError, spawn, projectDir, monaco } = options;
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<LspStatus>("stopped");
  const connectionRef = useRef<MessageConnection | null>(null);
  const retryCount = useRef(0);
  // Tracks whether the current sidecar process has already been
  // initialized. Persists across StrictMode unmount → remount.
  const initializedRef = useRef(false);
  // Incrementing `attempt` re-triggers the effect for a fresh
  // spawn+initialize cycle without unmounting the component.
  const [attempt, setAttempt] = useState(0);
  // Ref-stabilize onError so it never triggers the effect to re-run.
  // Inline callbacks (common in JSX props) change identity every render;
  // without the ref they would cause an infinite mount/dispose loop.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    // Gate on Monaco being loaded — providers need Monaco APIs to register.
    if (!monaco) {
      setStatus("stopped");
      return;
    }

    const iid = ++_instanceSeq; // unique effect-instance id
    const _t = () => performance.now().toFixed(1);
    const _log = (...args: unknown[]) => console.log(`[LSP:i${iid}]`, ...args, _t());
    const _warn = (...args: unknown[]) => console.warn(`[LSP:i${iid}]`, ...args, _t());
    const _err = (...args: unknown[]) => console.error(`[LSP:i${iid}]`, ...args, _t());

    let cancelled = false;
    let terminated = false;
    let spawnDone = false;
    let pendingExit = false;
    let connection: MessageConnection | null = null;
    let closeReaderFn: (() => void) | null = null;
    let providerDisposables: Array<{ dispose(): void }> = [];

    _log("effect created", { attempt, initializedRef: initializedRef.current, retryCount: retryCount.current });

    const teardownConnection = (reason?: string) => {
      _log("teardownConnection", { reason, hasConnection: !!connection, hasCloseReader: !!closeReaderFn });
      connectionRef.current = null;
      for (const d of providerDisposables) d.dispose();
      providerDisposables = [];
      closeReaderFn?.();
      closeReaderFn = null;
      connection?.dispose();
      connection = null;
    };

    const reportOnce = (reason: LspClientLoadError, detail?: string) => {
      if (terminated) {
        _warn("reportOnce SKIPPED (already terminated)", { reason, detail });
        return;
      }
      terminated = true;

      if (reason === "exit" && retryCount.current < MAX_RETRIES) {
        const delay = INITIAL_BACKOFF_MS * 2 ** retryCount.current;
        retryCount.current += 1;
        _log("reportOnce → scheduling retry", { retryCount: retryCount.current, delay });
        setTimeout(() => {
          if (!cancelled) {
            _log("retry timer fired — bumping attempt");
            setReady(false);
            setAttempt((a) => a + 1);
          } else {
            _warn("retry timer fired but cancelled — skipping");
          }
        }, delay);
        return;
      }

      _err("reportOnce → terminal error", { reason, detail, retryCount: retryCount.current });
      setStatus("error");
      onErrorRef.current?.(reason, detail);
    };

    const resolveDocumentUri: RegisterLspProvidersOptions["resolveDocumentUri"] =
      (modelUri: string) => {
        if (projectDir) {
          const parts = modelUri.split("/");
          const filename = parts[parts.length - 1] || modelUri;
          return pathToFileUri(`${projectDir}/${filename}`);
        }
        return modelUri;
      };

    // Wire the transport's exit event to tear down and retry.
    // Guard: defer exit events that arrive before spawn() resolves —
    // they may come from a previous sidecar instance OR the new one
    // dying immediately. Either way, we process them after spawn.
    const offExitPromise = transport.onExit((exitPayload) => {
      _log("onExit fired", { cancelled, spawnDone, pendingExit, terminated, exitPayload });
      if (cancelled) {
        _warn("onExit ignored — effect cancelled");
        return;
      }
      if (!spawnDone) {
        _log("onExit deferred — spawn not done yet");
        pendingExit = true;
        return;
      }
      _warn("sidecar exited — retryCount:", retryCount.current);
      initializedRef.current = false;
      setReady(false);
      teardownConnection("onExit");
      reportOnce("exit");
    });

    void (async () => {
      try {
        _log("── lifecycle start ──", { attempt, hasSpawn: !!spawn, projectDir, initializedRef: initializedRef.current });
        if (spawn) {
          _log("spawning sidecar…");
          await spawn();
          _log("spawn done", { cancelled, pendingExit });
        }
        spawnDone = true;
        if (cancelled) {
          _warn("cancelled after spawn — aborting");
          return;
        }

        // If an exit event arrived while spawn was in flight, the sidecar
        // died immediately. Trigger retry instead of attempting initialize
        // on a dead process.
        if (pendingExit) {
          _warn("sidecar exited during spawn — triggering retry");
          reportOnce("exit");
          return;
        }

        // StrictMode double-invokes effects: mount → cleanup → mount.
        // The cleanup disposes the connection and providers, but the
        // sidecar keeps running (lsp_spawn is idempotent). On the
        // second mount we must re-create the connection + providers
        // but skip the LSP initialize handshake (already done).
        if (initializedRef.current) {
          _log("already initialized — reusing connection (StrictMode shortcut)");
          const transports = createTransports(transport);
          closeReaderFn = transports.closeReader;
          connection = createMessageConnection(transports.reader, transports.writer);
          connection.listen();

          providerDisposables = registerLspProviders(
            monaco,
            connection,
            "vba",
            { resolveDocumentUri },
          );
          connectionRef.current = connection;
          setReady(true);
          setStatus("ready");
          return;
        }

        setStatus("connecting");
        _log("status → connecting");

        const transports = createTransports(transport);
        closeReaderFn = transports.closeReader;

        connection = createMessageConnection(transports.reader, transports.writer);
        connection.listen();
        _log("connection.listen() done");

        const rootUri = projectDir ? pathToFileUri(projectDir) : null;
        _log("sending initialize request…", { rootUri });

        const initPromise = connection.sendRequest("initialize", {
          processId: null,
          clientInfo: { name: "Verde", version: "0.1.0" },
          rootUri,
          capabilities: {
            textDocument: {
              synchronization: {
                dynamicRegistration: false,
                willSave: false,
                willSaveWaitUntil: false,
                didSave: true,
              },
              completion: {
                completionItem: { snippetSupport: false },
              },
              hover: { contentFormat: ["markdown", "plaintext"] },
              signatureHelp: {
                signatureInformation: {
                  documentationFormat: ["markdown", "plaintext"],
                  parameterInformation: { labelOffsetSupport: true },
                },
              },
              definition: { dynamicRegistration: false },
              references: { dynamicRegistration: false },
              documentSymbol: {
                hierarchicalDocumentSymbolSupport: true,
              },
              documentHighlight: { dynamicRegistration: false },
              codeAction: {
                codeActionLiteralSupport: {
                  codeActionKind: { valueSet: ["quickfix", "refactor"] },
                },
              },
              formatting: { dynamicRegistration: false },
              rename: { prepareSupport: true },
              inlayHint: { dynamicRegistration: false },
              publishDiagnostics: { relatedInformation: false },
            },
          },
        });

        _log("waiting for initialize response (timeout:", INIT_TIMEOUT_MS, "ms)…");
        const initResult = await Promise.race([
          initPromise.then((r) => ({ ok: true as const, value: r })),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("initialize timeout")),
              INIT_TIMEOUT_MS,
            ),
          ),
        ]);

        _log("initialize response received", { cancelled, resultKeys: Object.keys((initResult as { value: unknown }).value ?? {}) });

        if (cancelled) {
          _warn("cancelled after initialize — tearing down");
          teardownConnection("cancelled-after-init");
          return;
        }

        // Send `initialized` notification (required by LSP spec after
        // receiving the initialize response).
        _log("sending initialized notification…");
        await connection.sendNotification("initialized", {});

        // Register Monaco providers for completion, hover, diagnostics.
        providerDisposables = registerLspProviders(
          monaco,
          connection,
          "vba",
          { resolveDocumentUri },
        );
        connectionRef.current = connection;
        retryCount.current = 0;
        initializedRef.current = true;
        setReady(true);
        setStatus("ready");
        _log("── status → ready ──");
      } catch (err) {
        if (cancelled) {
          _warn("catch — cancelled, ignoring error:", err instanceof Error ? err.message : String(err));
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);

        // JSON-RPC -32600 (InvalidRequest) from a duplicate `initialize`
        // means the sidecar was already initialized — e.g. React StrictMode
        // double-mount. The connection is still usable; register providers.
        if (err instanceof ResponseError && err.code === -32600 && connection) {
          _log("recovering from -32600 (StrictMode re-initialize)");
          providerDisposables = registerLspProviders(
            monaco,
            connection,
            "vba",
            { resolveDocumentUri },
          );
          connectionRef.current = connection;
          retryCount.current = 0;
          initializedRef.current = true;
          setReady(true);
          setStatus("ready");
          return;
        }

        _err("lifecycle error:", msg, { code: err instanceof ResponseError ? err.code : undefined });
        if (msg.includes(LSP_NOT_SPAWNED_SENTINEL)) {
          reportOnce("not-spawned");
        } else if (msg === "initialize timeout") {
          teardownConnection("initialize-timeout");
          reportOnce("exit");
        } else if (msg.includes("sidecar exited immediately")) {
          // The sidecar started but died before the alive check — treat
          // as a transient exit (retryable), not a permanent spawn failure.
          reportOnce("exit", msg);
        } else if (err instanceof ResponseError) {
          reportOnce("initialize-failed", msg);
        } else if (msg.includes("ServerError") || msg.includes("-32")) {
          reportOnce("initialize-failed", msg);
        } else {
          reportOnce("spawn-failed", msg);
        }
      }
    })();

    return () => {
      _log("effect cleanup — setting cancelled=true", { wasTerminated: terminated, wasReady: ready });
      cancelled = true;
      teardownConnection("effect-cleanup");
      void offExitPromise.then((off) => {
        _log("exit listener unsubscribed");
        off();
      });
      // NOTE: Do NOT call lsp_kill here. The sidecar is long-lived and
      // shared across effect re-runs (retry, StrictMode, HMR). Killing
      // it here would race with the next lsp_spawn and destroy the
      // newly created process. Cleanup of the OS process is handled by
      // the kill callback at app/window close time (see Editor.tsx).
    };
  // onError is accessed via onErrorRef (ref-stabilized) and excluded
  // from deps to prevent infinite re-render loops from inline callbacks.
  }, [transport, spawn, projectDir, attempt, monaco]);

  return { ready, status, connection: connectionRef.current };
}
