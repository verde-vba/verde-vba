// Sprint 32.H — Golden-string tests for LspTransport → vscode-jsonrpc adapter.
//
// Each test pins a specific LSP message shape (completion, hover, diagnostics)
// flowing through the adapter. No Monaco, no Tauri runtime, no jsdom DOM —
// pure message-passing verification.

import { describe, it, expect, vi } from "vitest";
import type { LspMessage, LspTransport } from "./lsp-bridge";
import { createTransports } from "./lsp-message-transports";
import type { Message } from "vscode-jsonrpc";

function makeTransport(overrides: Partial<LspTransport> = {}): LspTransport {
  return {
    send: vi.fn(async () => {}),
    onMessage: vi.fn(async () => () => {}),
    onExit: vi.fn(async () => () => {}),
    ...overrides,
  };
}

// ── Golden messages ──────────────────────────────────────────────

const GOLDEN_COMPLETION_REQUEST: LspMessage = {
  jsonrpc: "2.0",
  id: 42,
  method: "textDocument/completion",
  params: {
    textDocument: { uri: "file:///C:/verde/projects/abc123/Module1.bas" },
    position: { line: 5, character: 10 },
    context: { triggerKind: 1 },
  },
};

const GOLDEN_COMPLETION_RESPONSE: LspMessage = {
  jsonrpc: "2.0",
  id: 42,
  result: {
    isIncomplete: false,
    items: [
      {
        label: "MsgBox",
        kind: 3,
        detail: "Sub MsgBox(Prompt, ...)",
        insertText: "MsgBox ",
      },
    ],
  },
};

const GOLDEN_HOVER_REQUEST: LspMessage = {
  jsonrpc: "2.0",
  id: 43,
  method: "textDocument/hover",
  params: {
    textDocument: { uri: "file:///C:/verde/projects/abc123/Module1.bas" },
    position: { line: 10, character: 4 },
  },
};

const GOLDEN_HOVER_RESPONSE: LspMessage = {
  jsonrpc: "2.0",
  id: 43,
  result: {
    contents: { kind: "markdown", value: "```vba\nSub MySub()\n```\nUser-defined subroutine." },
    range: { start: { line: 10, character: 0 }, end: { line: 10, character: 8 } },
  },
};

const GOLDEN_DIAGNOSTICS_NOTIFICATION: LspMessage = {
  jsonrpc: "2.0",
  method: "textDocument/publishDiagnostics",
  params: {
    uri: "file:///C:/verde/projects/abc123/Module1.bas",
    diagnostics: [
      {
        range: { start: { line: 3, character: 0 }, end: { line: 3, character: 12 } },
        severity: 1,
        source: "verde-lsp",
        message: "Variable 'x' is not declared",
      },
    ],
  },
};

// ── Writer tests ─────────────────────────────────────────────────

describe("TauriMessageWriter", () => {
  it("forwards a textDocument/completion request to transport.send", async () => {
    const send = vi.fn(async () => {});
    const transport = makeTransport({ send });
    const { writer } = createTransports(transport);

    await writer.write(GOLDEN_COMPLETION_REQUEST as unknown as Message);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(GOLDEN_COMPLETION_REQUEST);
  });

  it("forwards a textDocument/hover request to transport.send", async () => {
    const send = vi.fn(async () => {});
    const transport = makeTransport({ send });
    const { writer } = createTransports(transport);

    await writer.write(GOLDEN_HOVER_REQUEST as unknown as Message);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(GOLDEN_HOVER_REQUEST);
  });

  it("propagates send rejection via fireError and re-throws", async () => {
    const sendError = new Error("stdin write failed");
    const send = vi.fn(async () => { throw sendError; });
    const transport = makeTransport({ send });
    const { writer } = createTransports(transport);

    const errorSpy = vi.fn();
    writer.onError(errorSpy);

    await expect(
      writer.write(GOLDEN_COMPLETION_REQUEST as unknown as Message),
    ).rejects.toThrow("stdin write failed");

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith([
      sendError,
      GOLDEN_COMPLETION_REQUEST,
      1,
    ]);
  });
});

// ── Reader tests ─────────────────────────────────────────────────

describe("TauriMessageReader", () => {
  it("delivers a completion response to the listen callback", async () => {
    let emitMessage: ((m: LspMessage) => void) | undefined;
    const transport = makeTransport({
      onMessage: vi.fn(async (handler) => {
        emitMessage = handler;
        return () => {};
      }),
    });
    const { reader } = createTransports(transport);

    const callback = vi.fn();
    reader.listen(callback);

    // Wait for onMessage subscription to settle.
    await vi.waitFor(() => expect(emitMessage).toBeDefined());

    emitMessage?.(GOLDEN_COMPLETION_RESPONSE);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(GOLDEN_COMPLETION_RESPONSE);
  });

  it("delivers a hover response to the listen callback", async () => {
    let emitMessage: ((m: LspMessage) => void) | undefined;
    const transport = makeTransport({
      onMessage: vi.fn(async (handler) => {
        emitMessage = handler;
        return () => {};
      }),
    });
    const { reader } = createTransports(transport);

    const callback = vi.fn();
    reader.listen(callback);
    await vi.waitFor(() => expect(emitMessage).toBeDefined());

    emitMessage?.(GOLDEN_HOVER_RESPONSE);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(GOLDEN_HOVER_RESPONSE);
  });

  it("delivers a publishDiagnostics notification to the listen callback", async () => {
    let emitMessage: ((m: LspMessage) => void) | undefined;
    const transport = makeTransport({
      onMessage: vi.fn(async (handler) => {
        emitMessage = handler;
        return () => {};
      }),
    });
    const { reader } = createTransports(transport);

    const callback = vi.fn();
    reader.listen(callback);
    await vi.waitFor(() => expect(emitMessage).toBeDefined());

    emitMessage?.(GOLDEN_DIAGNOSTICS_NOTIFICATION);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(GOLDEN_DIAGNOSTICS_NOTIFICATION);
  });

  it("calls transport unsubscribe when the listen disposable is disposed", async () => {
    const unsubscribe = vi.fn();
    const transport = makeTransport({
      onMessage: vi.fn(async () => unsubscribe),
    });
    const { reader } = createTransports(transport);

    const disposable = reader.listen(() => {});
    // Let the async onMessage settle.
    await vi.waitFor(() => {});

    disposable.dispose();

    // unsubscribe is called asynchronously via the stored promise.
    await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1));
  });

  it("calls transport unsubscribe when reader.dispose() is called", async () => {
    const unsubscribe = vi.fn();
    const transport = makeTransport({
      onMessage: vi.fn(async () => unsubscribe),
    });
    const { reader } = createTransports(transport);

    reader.listen(() => {});
    await vi.waitFor(() => {});

    reader.dispose();

    await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1));
  });
});

// ── closeReader tests ────────────────────────────────────────────

describe("closeReader", () => {
  it("fires the reader's onClose event", () => {
    const transport = makeTransport();
    const { reader, closeReader } = createTransports(transport);

    const closeSpy = vi.fn();
    reader.onClose(closeSpy);

    closeReader();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
