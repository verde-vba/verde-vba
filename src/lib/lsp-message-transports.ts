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

  constructor(transport: LspTransport) {
    super();
    this.transport = transport;
  }

  listen(callback: DataCallback): Disposable {
    this.unsubscribePromise = this.transport.onMessage((message: LspMessage) => {
      // LspMessage is structurally compatible with vscode-jsonrpc's Message.
      // Both require `jsonrpc: string`; the optional id/method/params/result/error
      // fields overlap. A type assertion is safe here.
      callback(message as unknown as Message);
    });

    return {
      dispose: () => {
        void this.unsubscribePromise?.then((off) => off());
        this.unsubscribePromise = null;
      },
    };
  }

  /** Allow external code to fire the close event (e.g. on sidecar exit). */
  triggerClose(): void {
    this.fireClose();
  }

  dispose(): void {
    void this.unsubscribePromise?.then((off) => off());
    this.unsubscribePromise = null;
    super.dispose();
  }
}

class TauriMessageWriter extends AbstractMessageWriter implements MessageWriter {
  private transport: LspTransport;

  constructor(transport: LspTransport) {
    super();
    this.transport = transport;
  }

  async write(msg: Message): Promise<void> {
    try {
      await this.transport.send(msg as unknown as LspMessage);
    } catch (error) {
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
  const reader = new TauriMessageReader(transport);
  const writer = new TauriMessageWriter(transport);
  return {
    reader,
    writer,
    closeReader: () => reader.triggerClose(),
  };
}
