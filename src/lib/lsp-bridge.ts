// Tauri ↔ stdio LSP bridge (Sprint 32.C skeleton).
//
// This module defines the *transport* surface between the verde-vba
// frontend and the verde-lsp sidecar process (Sprint 30 D1 / D2).
// Outbound JSON-RPC messages are forwarded to the Rust backend via
// `invoke("lsp_send", ...)`, and inbound messages arrive as Tauri
// events on channel `lsp://message`. Process-exit notifications
// surface on `lsp://exit`.
//
// Sprint 32.C intentionally keeps this layer minimal and pure-testable.
// The monaco-languageclient / vscode-jsonrpc `MessageReader` /
// `MessageWriter` adapters (which rely on this transport) will be
// added in Sprint 32.G when the sidecar actually spawns.
//
// Dependency injection (`deps` parameter) lets unit tests substitute
// `invoke` / `listen` with plain spies — no Tauri runtime required.

export const LSP_SEND_COMMAND = "lsp_send";
export const LSP_MESSAGE_EVENT = "lsp://message";
export const LSP_EXIT_EVENT = "lsp://exit";

// JSON-RPC 2.0 message shape as described by the LSP specification.
// Kept locally rather than imported from vscode-jsonrpc so that this
// transport layer stays usable in environments (e.g. unit tests) that
// do not load the full jsonrpc runtime. 32.G will reconcile this with
// vscode-jsonrpc's `Message` union when wiring monaco-languageclient.
export interface LspMessage {
  jsonrpc: "2.0";
  id?: number | string | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface LspExitPayload {
  // Process exit code reported by tauri-plugin-shell's child handle.
  // `null` when the child was killed by a signal (Unix) or terminated
  // abnormally without an exit code.
  code: number | null;
  // Optional signal name (Unix), forwarded verbatim from the backend.
  signal?: string | null;
}

type TauriEventHandler<T> = (event: { payload: T }) => void;

export interface LspTransportDeps {
  invoke: <T = void>(cmd: string, args: Record<string, unknown>) => Promise<T>;
  listen: <T>(
    event: string,
    handler: TauriEventHandler<T>
  ) => Promise<() => void>;
}

export interface LspTransport {
  send(message: LspMessage): Promise<void>;
  onMessage(handler: (message: LspMessage) => void): Promise<() => void>;
  onExit(handler: (exit: LspExitPayload) => void): Promise<() => void>;
}

export function createTauriLspTransport(
  deps: LspTransportDeps
): LspTransport {
  return {
    async send(message: LspMessage) {
      console.log("[LSP:transport] ▶ send", message.method ?? `response#${message.id}`, performance.now().toFixed(1));
      await deps.invoke(LSP_SEND_COMMAND, { message });
      console.log("[LSP:transport] ✓ send done", message.method ?? `response#${message.id}`, performance.now().toFixed(1));
    },
    async onMessage(handler) {
      return deps.listen<LspMessage>(LSP_MESSAGE_EVENT, (event) => {
        console.log("[LSP:transport] ◀ recv", event.payload.method ?? `response#${event.payload.id}`, performance.now().toFixed(1));
        handler(event.payload);
      });
    },
    async onExit(handler) {
      return deps.listen<LspExitPayload>(LSP_EXIT_EVENT, (event) => {
        console.log("[LSP:transport] ✕ exit", event.payload, performance.now().toFixed(1));
        handler(event.payload);
      });
    },
  };
}
