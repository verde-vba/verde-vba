// Sprint 32.G GREEN — useLspClient state machine characterization.
//
// These tests pin the contract the hook honors: transport signals are
// mapped 1:1 to LspClientLoadError values (or ready=true) so Editor.tsx
// only has to decide which localized Banner to render. Using `vi.fn()`
// stubs for the LspTransport keeps the test set Tauri-runtime-free.

import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type {
  LspExitPayload,
  LspMessage,
  LspTransport,
} from "../lib/lsp-bridge";
import { useLspClient, MAX_RETRIES, INITIAL_BACKOFF_MS } from "./useLspClient";

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
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports 'not-spawned' when transport.send rejects with NOT_SPAWNED", async () => {
    const onError = vi.fn();
    const transport = makeTransport({
      send: vi.fn(async () => {
        throw new Error("NOT_SPAWNED");
      }),
    });
    renderHook(() => useLspClient({ transport, onError }));
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith("not-spawned", undefined),
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
      expect(onError).toHaveBeenCalledWith("spawn-failed", undefined),
    );
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
      expect(onError).toHaveBeenCalledWith("initialize-failed", "[-32603] internal error"),
    );
  });

  // --- Retry / reconnection tests (fake timers) ---

  it("retries on exit before surfacing error to UI", async () => {
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

    // Switch to fake timers AFTER the effect has registered its listeners.
    vi.useFakeTimers();

    // First exit should trigger a retry, not an error.
    act(() => { emitExit?.({ code: 1, signal: null }); });
    expect(onError).not.toHaveBeenCalled();
  });

  it("surfaces 'exit' after exhausting all retries", async () => {
    // Collect every exit callback registered across effect re-runs.
    const exitHandlers: Array<(p: LspExitPayload) => void> = [];
    const transport = makeTransport({
      onExit: vi.fn(async (handler) => {
        exitHandlers.push(handler);
        return () => {};
      }),
    });
    const onError = vi.fn();
    renderHook(() => useLspClient({ transport, onError }));
    await waitFor(() => expect(exitHandlers.length).toBe(1));

    // Exhaust every retry attempt.
    for (let i = 0; i < MAX_RETRIES; i++) {
      const handler = exitHandlers[exitHandlers.length - 1];
      act(() => { handler({ code: 1, signal: null }); });
      expect(onError).not.toHaveBeenCalled();
      // Use real timers briefly to let waitFor poll, then advance.
      await act(async () => {
        // The setTimeout inside reportOnce uses INITIAL_BACKOFF_MS * 2^i.
        // We wait for it with a real delay since fake timers and waitFor
        // interact poorly.
        await new Promise((r) => setTimeout(r, INITIAL_BACKOFF_MS * 2 ** i + 50));
      });
      // Wait for the new effect to register its exit listener.
      await waitFor(() => expect(exitHandlers.length).toBe(i + 2));
    }

    // One more exit after all retries are spent — should surface.
    const lastHandler = exitHandlers[exitHandlers.length - 1];
    act(() => { lastHandler({ code: 1, signal: null }); });
    await waitFor(() => expect(onError).toHaveBeenCalledWith("exit", undefined));
  }, 20000);

  it("does not re-send initialize when effect re-runs after successful handshake", async () => {
    // After a successful initialize, `initializedRef` is `true`. When
    // the effect re-runs (e.g. StrictMode remount, or a dep change),
    // the hook must skip sending initialize again — verde-lsp would
    // reject a second one with -32600 "Invalid request".
    const messageHandlers: Array<(m: LspMessage) => void> = [];
    const send = vi.fn(async () => {});
    const transport = makeTransport({
      send,
      onMessage: vi.fn(async (handler) => {
        messageHandlers.push(handler);
        return () => {};
      }),
    });

    // Initial render with projectDir=undefined.
    const { result, rerender } = renderHook(
      ({ dir }: { dir?: string }) => useLspClient({ transport, projectDir: dir }),
      { initialProps: { dir: undefined } },
    );

    // Wait for the first initialize to be sent.
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(messageHandlers.length).toBeGreaterThanOrEqual(1));

    // Simulate verde-lsp success response.
    act(() => {
      messageHandlers[messageHandlers.length - 1]({
        jsonrpc: "2.0",
        id: 1,
        result: { capabilities: {} },
      });
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    // Trigger effect re-run via a dep change (projectDir).
    send.mockClear();
    rerender({ dir: "/tmp/project" });

    // The effect re-ran but should NOT send another initialize.
    // Give it a tick to settle.
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(send).not.toHaveBeenCalled();
  });

  it("resets retry counter after successful reconnect", async () => {
    const exitHandlers: Array<(p: LspExitPayload) => void> = [];
    const messageHandlers: Array<(m: LspMessage) => void> = [];
    const transport = makeTransport({
      onExit: vi.fn(async (handler) => {
        exitHandlers.push(handler);
        return () => {};
      }),
      onMessage: vi.fn(async (handler) => {
        messageHandlers.push(handler);
        return () => {};
      }),
    });
    const onError = vi.fn();
    const { result } = renderHook(() => useLspClient({ transport, onError }));

    // Wait for initial listeners.
    await waitFor(() => expect(exitHandlers.length).toBe(1));

    // First exit — triggers retry #1.
    act(() => { exitHandlers[exitHandlers.length - 1]({ code: 1, signal: null }); });
    await act(async () => {
      await new Promise((r) => setTimeout(r, INITIAL_BACKOFF_MS + 50));
    });
    await waitFor(() => expect(messageHandlers.length).toBe(2));

    // Successful reconnect.
    act(() => {
      messageHandlers[messageHandlers.length - 1]({
        jsonrpc: "2.0",
        id: 1,
        result: { capabilities: {} },
      });
    });
    await waitFor(() => expect(result.current.ready).toBe(true));

    // Another exit — should start fresh retries (counter was reset).
    act(() => { exitHandlers[exitHandlers.length - 1]({ code: 1, signal: null }); });
    expect(onError).not.toHaveBeenCalled();
  }, 10000);
});
