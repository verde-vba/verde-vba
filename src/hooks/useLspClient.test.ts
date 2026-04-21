// Sprint 32.G GREEN — useLspClient state machine characterization.
//
// These tests pin the contract the hook honors: transport signals are
// mapped 1:1 to LspClientLoadError values (or ready=true) so Editor.tsx
// only has to decide which localized Banner to render. Using `vi.fn()`
// stubs for the LspTransport keeps the test set Tauri-runtime-free.

import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type {
  LspExitPayload,
  LspMessage,
  LspTransport,
} from "../lib/lsp-bridge";
import { useLspClient } from "./useLspClient";

function makeTransport(
  overrides: Partial<LspTransport> = {},
): LspTransport {
  return {
    send: vi.fn(async () => {}),
    onMessage: vi.fn(async () => () => {}),
    onExit: vi.fn(async () => () => {}),
    ...overrides,
  };
}

describe("useLspClient", () => {
  it("reports 'not-spawned' when transport.send rejects with NOT_SPAWNED", async () => {
    const onError = vi.fn();
    const transport = makeTransport({
      send: vi.fn(async () => {
        throw new Error("NOT_SPAWNED");
      }),
    });
    renderHook(() => useLspClient({ transport, onError }));
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith("not-spawned"),
    );
  });

  it("reports 'spawn-failed' for transport.send rejecting with a non-sentinel error", async () => {
    const onError = vi.fn();
    const transport = makeTransport({
      send: vi.fn(async () => {
        throw new Error("ENOENT: sidecar missing");
      }),
    });
    renderHook(() => useLspClient({ transport, onError }));
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith("spawn-failed"),
    );
  });

  it("reports 'exit' when the sidecar process exits while connected", async () => {
    let emitExit: ((p: LspExitPayload) => void) | undefined;
    const transport = makeTransport({
      onExit: vi.fn(async (handler) => {
        emitExit = handler;
        return () => {};
      }),
    });
    const onError = vi.fn();
    renderHook(() => useLspClient({ transport, onError }));
    await waitFor(() => expect(emitExit).toBeDefined());
    emitExit?.({ code: 1, signal: null });
    await waitFor(() => expect(onError).toHaveBeenCalledWith("exit"));
  });

  it("flips ready=true after an initialize response arrives on onMessage", async () => {
    let emitMessage: ((m: LspMessage) => void) | undefined;
    const transport = makeTransport({
      onMessage: vi.fn(async (handler) => {
        emitMessage = handler;
        return () => {};
      }),
    });
    const { result } = renderHook(() => useLspClient({ transport }));
    await waitFor(() => expect(emitMessage).toBeDefined());
    // Simulate verde-lsp's initialize response.
    emitMessage?.({
      jsonrpc: "2.0",
      id: 1,
      result: { capabilities: { hoverProvider: true } },
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
  });

  it("reports 'initialize-failed' when the initialize response is a JSON-RPC error", async () => {
    let emitMessage: ((m: LspMessage) => void) | undefined;
    const transport = makeTransport({
      onMessage: vi.fn(async (handler) => {
        emitMessage = handler;
        return () => {};
      }),
    });
    const onError = vi.fn();
    renderHook(() => useLspClient({ transport, onError }));
    await waitFor(() => expect(emitMessage).toBeDefined());
    emitMessage?.({
      jsonrpc: "2.0",
      id: 1,
      error: { code: -32603, message: "internal error" },
    });
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith("initialize-failed"),
    );
  });
});
