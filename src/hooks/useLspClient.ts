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
//
// `monaco-languageclient` integration (document selector / completion /
// hover) is deferred to Sprint 32.H per plan.md §Sprint 32.N. The
// handshake wired here is sufficient to prove sidecar embedding works
// end-to-end; 32.H layers MCL on top using the same transport.

import { useEffect, useState } from "react";
import type { LspTransport } from "../lib/lsp-bridge";

export const LSP_NOT_SPAWNED_SENTINEL = "NOT_SPAWNED";

/// Discriminator for why the LSP client failed to reach a ready state.
export type LspClientLoadError =
  | "not-spawned" // lsp_send returned the NOT_SPAWNED sentinel
  | "spawn-failed" // sidecar spawn / send failed with a non-sentinel error
  | "exit" // sidecar process exited while we were connected
  | "initialize-failed"; // LSP initialize response was a JSON-RPC error

export interface UseLspClientOptions {
  transport: LspTransport;
  onError?: (reason: LspClientLoadError) => void;
  /// Optional hook to spawn the sidecar before the first send. Injected
  /// so tests can exercise the handshake without a Tauri runtime; in
  /// production Editor.tsx supplies `() => invoke("lsp_spawn")`.
  spawn?: () => Promise<void>;
}

export interface UseLspClientResult {
  /// True once the LSP `initialize` response has been received and the
  /// client is accepting requests. False during handshake and after any
  /// terminal error.
  ready: boolean;
}

const INITIALIZE_REQUEST_ID = 1;

export function useLspClient(options: UseLspClientOptions): UseLspClientResult {
  const { transport, onError, spawn } = options;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Track whether a terminal error has already been surfaced so a
    // late exit event after `not-spawned` does not double-report.
    let terminated = false;
    const reportOnce = (reason: LspClientLoadError) => {
      if (terminated) return;
      terminated = true;
      onError?.(reason);
    };

    const offMessagePromise = transport.onMessage((message) => {
      if (cancelled) return;
      if (message.id !== INITIALIZE_REQUEST_ID) return;
      if (message.error !== undefined) {
        reportOnce("initialize-failed");
        return;
      }
      if (message.result !== undefined) {
        setReady(true);
      }
    });

    const offExitPromise = transport.onExit(() => {
      if (cancelled) return;
      reportOnce("exit");
    });

    void (async () => {
      try {
        if (spawn) await spawn();
        await transport.send({
          jsonrpc: "2.0",
          id: INITIALIZE_REQUEST_ID,
          method: "initialize",
          params: {
            // A minimal capability set. verde-lsp advertises its own
            // server-side capabilities in the response; the client side
            // is intentionally lean in 32.G and is expanded by 32.H as
            // completion / hover / diagnostics are wired into Monaco.
            processId: null,
            rootUri: null,
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
  }, [transport, onError, spawn]);

  return { ready };
}
