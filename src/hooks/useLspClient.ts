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

export interface UseLspClientResult {
  /// True once the LSP `initialize` response has been received and
  /// providers are registered. False during handshake and after errors.
  ready: boolean;
}

/// Convert a filesystem path to a file:// URI suitable for LSP rootUri.
function pathToFileUri(fsPath: string): string {
  const normalized = fsPath.replace(/\\/g, "/");
  if (/^[A-Za-z]:/.test(normalized)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized}`;
}

export function useLspClient(options: UseLspClientOptions): UseLspClientResult {
  const { transport, onError, spawn, projectDir, monaco } = options;
  const [ready, setReady] = useState(false);
  const retryCount = useRef(0);
  // Tracks whether the current sidecar process has already been
  // initialized. Persists across StrictMode unmount → remount.
  const initializedRef = useRef(false);
  // Incrementing `attempt` re-triggers the effect for a fresh
  // spawn+initialize cycle without unmounting the component.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Gate on Monaco being loaded — providers need Monaco APIs to register.
    if (!monaco) return;

    let cancelled = false;
    let terminated = false;
    let connection: MessageConnection | null = null;
    let closeReaderFn: (() => void) | null = null;
    let providerDisposables: Array<{ dispose(): void }> = [];

    const teardownConnection = () => {
      for (const d of providerDisposables) d.dispose();
      providerDisposables = [];
      closeReaderFn?.();
      closeReaderFn = null;
      connection?.dispose();
      connection = null;
    };

    const reportOnce = (reason: LspClientLoadError, detail?: string) => {
      if (terminated) return;
      terminated = true;

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
    const offExitPromise = transport.onExit(() => {
      if (cancelled) return;
      initializedRef.current = false;
      setReady(false);
      teardownConnection();
      reportOnce("exit");
    });

    void (async () => {
      try {
        if (spawn) await spawn();
        if (cancelled) return;

        // StrictMode double-invokes effects. The sidecar persists across
        // mounts (lsp_spawn is idempotent). Skip handshake when we know
        // the process was already initialized.
        if (initializedRef.current) {
          setReady(true);
          return;
        }

        const transports = createTransports(transport);
        closeReaderFn = transports.closeReader;

        connection = createMessageConnection(transports.reader, transports.writer);
        connection.listen();

        const rootUri = projectDir ? pathToFileUri(projectDir) : null;

        await connection.sendRequest("initialize", {
          processId: null,
          clientInfo: { name: "Verde", version: "0.1.0" },
          rootUri,
          capabilities: {
            textDocument: {
              completion: {
                completionItem: { snippetSupport: false },
              },
              hover: { contentFormat: ["markdown", "plaintext"] },
              publishDiagnostics: { relatedInformation: false },
            },
          },
        });

        if (cancelled) {
          teardownConnection();
          return;
        }

        // Send `initialized` notification (required by LSP spec after
        // receiving the initialize response).
        await connection.sendNotification("initialized", {});

        // Register Monaco providers for completion, hover, diagnostics.
        providerDisposables = registerLspProviders(
          monaco,
          connection,
          "vba",
          { resolveDocumentUri },
        );

        retryCount.current = 0;
        initializedRef.current = true;
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes(LSP_NOT_SPAWNED_SENTINEL)) {
          reportOnce("not-spawned");
        } else if (err instanceof ResponseError) {
          // JSON-RPC -32600 (InvalidRequest) from a duplicate `initialize`
          // means the sidecar was already initialized — e.g. React StrictMode
          // double-mount. The connection is still usable; register providers.
          if (err.code === -32600 && connection) {
            providerDisposables = registerLspProviders(
              monaco,
              connection,
              "vba",
              { resolveDocumentUri },
            );
            retryCount.current = 0;
            initializedRef.current = true;
            setReady(true);
            return;
          }
          reportOnce("initialize-failed", msg);
        } else if (msg.includes("ServerError") || msg.includes("-32")) {
          reportOnce("initialize-failed", msg);
        } else {
          reportOnce("spawn-failed", msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      teardownConnection();
      void offExitPromise.then((off) => off());
    };
  }, [transport, onError, spawn, projectDir, attempt, monaco]);

  return { ready };
}
