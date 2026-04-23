// Sprint 32.H — LspTransport → vscode-jsonrpc MessageReader/Writer adapter.
//
// Bridges the gap between the Tauri-based LspTransport (Sprint 32.C) and
// vscode-jsonrpc's MessageConnection. The adapter is intentionally thin:
// it casts between LspMessage and vscode-jsonrpc's Message (structurally
// compatible — both carry `jsonrpc: string` plus optional fields), and
// delegates all framing/correlation to createMessageConnection.
//
// The `closeReader()` handle lets the useLspClient hook signal transport
// death (sidecar exit) to the connection, which then triggers its own
// close handlers.

import {
  AbstractMessageReader,
  AbstractMessageWriter,
  type DataCallback,
  type Disposable,
  type Message,
  type MessageReader,
  type MessageWriter,
} from "vscode-jsonrpc";
import type { LspTransport, LspMessage } from "./lsp-bridge";

// Monotonically increasing ID to distinguish concurrent reader/writer pairs.
let _transportSeq = 0;

export interface LspMessageTransports {
  reader: MessageReader;
  writer: MessageWriter;
  /** Signal that the underlying transport is dead (sidecar exited).
   *  Fires the reader's `onClose` event so the MessageConnection tears down. */
  closeReader: () => void;
}

class TauriMessageReader extends AbstractMessageReader {
  private transport: LspTransport;
  private unsubscribePromise: Promise<() => void> | null = null;
  private tid: number;

  constructor(transport: LspTransport, tid: number) {
    super();
    this.transport = transport;
    this.tid = tid;
  }

  listen(callback: DataCallback): Disposable {
    console.log(`[LSP:t${this.tid}:reader] listen() — subscribing to onMessage`, performance.now().toFixed(1));
    this.unsubscribePromise = this.transport.onMessage((message: LspMessage) => {
      console.log(`[LSP:t${this.tid}:reader] ◀ recv`, message.method ?? `response#${message.id}`, performance.now().toFixed(1));
      // LspMessage is structurally compatible with vscode-jsonrpc's Message.
      // Both require `jsonrpc: string`; the optional id/method/params/result/error
      // fields overlap. A type assertion is safe here.
      callback(message as unknown as Message);
    });

    return {
      dispose: () => {
        console.log(`[LSP:t${this.tid}:reader] listen-disposable.dispose()`, performance.now().toFixed(1));
        void this.unsubscribePromise?.then((off) => off());
        this.unsubscribePromise = null;
      },
    };
  }

  /** Allow external code to fire the close event (e.g. on sidecar exit). */
  triggerClose(): void {
    console.log(`[LSP:t${this.tid}:reader] triggerClose()`, performance.now().toFixed(1));
    this.fireClose();
  }

  dispose(): void {
    console.log(`[LSP:t${this.tid}:reader] dispose()`, performance.now().toFixed(1));
    void this.unsubscribePromise?.then((off) => {
      console.log(`[LSP:t${this.tid}:reader] onMessage unsubscribed`, performance.now().toFixed(1));
      off();
    });
    this.unsubscribePromise = null;
    super.dispose();
  }
}

class TauriMessageWriter extends AbstractMessageWriter implements MessageWriter {
  private transport: LspTransport;
  private tid: number;

  constructor(transport: LspTransport, tid: number) {
    super();
    this.transport = transport;
    this.tid = tid;
  }

  async write(msg: Message): Promise<void> {
    const lspMsg = msg as unknown as LspMessage;
    console.log(`[LSP:t${this.tid}:writer] ▶ write`, lspMsg.method ?? `response#${lspMsg.id}`, performance.now().toFixed(1));
    try {
      await this.transport.send(lspMsg);
    } catch (error) {
      console.error(`[LSP:t${this.tid}:writer] ✕ write error`, lspMsg.method ?? `response#${lspMsg.id}`, error, performance.now().toFixed(1));
      this.fireError(error, msg, 1);
      throw error;
    }
  }

  end(): void {
    // No-op — the Tauri transport lifecycle is managed by spawn/exit,
    // not by the writer. The sidecar process owns the connection endpoint.
  }
}

/**
 * Create a vscode-jsonrpc MessageReader/Writer pair from an LspTransport.
 *
 * The returned `closeReader()` should be called when the sidecar exits,
 * so the MessageConnection's `onClose` handler fires and the useLspClient
 * hook can trigger its retry logic.
 */
export function createTransports(transport: LspTransport): LspMessageTransports {
  const tid = ++_transportSeq;
  console.log(`[LSP:t${tid}] createTransports()`, performance.now().toFixed(1));
  const reader = new TauriMessageReader(transport, tid);
  const writer = new TauriMessageWriter(transport, tid);
  return {
    reader,
    writer,
    closeReader: () => reader.triggerClose(),
  };
}
