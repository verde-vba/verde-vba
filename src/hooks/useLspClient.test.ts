// Sprint 32.H — useLspClient state-machine characterization tests.
//
// The hook now uses vscode-jsonrpc's MessageConnection internally.
// Tests mock the connection layer and lsp-monaco-providers, focusing on
// the state transitions: spawn → initialize → ready, error routing,
// and auto-retry on sidecar exit.

import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { LspExitPayload, LspTransport } from "../lib/lsp-bridge";
import { useLspClient, MAX_RETRIES, INITIAL_BACKOFF_MS } from "./useLspClient";

// ── Module mocks ─────────────────────────────────────────────────

// Mock MessageConnection returned by createMessageConnection.
const mockConnection = {
  listen: vi.fn(),
  sendRequest: vi.fn(async () => ({ capabilities: {} })),
  sendNotification: vi.fn(async () => {}),
  onNotification: vi.fn(() => ({ dispose: vi.fn() })),
  dispose: vi.fn(),
  onClose: vi.fn(() => ({ dispose: vi.fn() })),
  onError: vi.fn(() => ({ dispose: vi.fn() })),
};

vi.mock("vscode-jsonrpc", () => ({
  createMessageConnection: vi.fn(() => mockConnection),
}));

vi.mock("../lib/lsp-message-transports", () => ({
  createTransports: vi.fn(() => ({
    reader: {},
    writer: {},
    closeReader: vi.fn(),
  })),
}));

vi.mock("../lib/lsp-monaco-providers", () => ({
  registerLspProviders: vi.fn(() => [{ dispose: vi.fn() }]),
}));

// Minimal Monaco mock — the hook only gates on truthiness.
const MOCK_MONACO = {} as typeof import("monaco-editor");

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
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockConnection defaults for each test.
    mockConnection.listen.mockImplementation(() => {});
    mockConnection.sendRequest.mockResolvedValue({ capabilities: {} });
    mockConnection.sendNotification.mockResolvedValue(undefined);
    mockConnection.dispose.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing when monaco is null", async () => {
    const transport = makeTransport();
    const { result } = renderHook(() =>
      useLspClient({ transport, monaco: null }),
    );

    // Give it a tick.
    await waitFor(() => {});
    expect(result.current.ready).toBe(false);
    expect(transport.onExit).not.toHaveBeenCalled();
  });

  it("does nothing when monaco is undefined", async () => {
    const transport = makeTransport();
    const { result } = renderHook(() =>
      useLspClient({ transport }),
    );
    await waitFor(() => {});
    expect(result.current.ready).toBe(false);
  });

  it("reports 'not-spawned' when spawn rejects with NOT_SPAWNED", async () => {
    const onError = vi.fn();
    const transport = makeTransport();
    const spawn = vi.fn(async () => {
      throw new Error("NOT_SPAWNED");
    });

    renderHook(() =>
      useLspClient({ transport, onError, spawn, monaco: MOCK_MONACO }),
    );

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith("not-spawned", undefined),
    );
  });

  it("reports 'spawn-failed' for a non-sentinel spawn error", async () => {
    const onError = vi.fn();
    const transport = makeTransport();
    const spawn = vi.fn(async () => {
      throw new Error("ENOENT: sidecar missing");
    });

    renderHook(() =>
      useLspClient({ transport, onError, spawn, monaco: MOCK_MONACO }),
    );

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith("spawn-failed", undefined),
    );
  });

  it("flips ready=true after initialize succeeds", async () => {
    const transport = makeTransport();

    const { result } = renderHook(() =>
      useLspClient({ transport, monaco: MOCK_MONACO }),
    );

    await waitFor(() => expect(result.current.ready).toBe(true));

    // Verify the initialize handshake sequence.
    expect(mockConnection.listen).toHaveBeenCalled();
    expect(mockConnection.sendRequest).toHaveBeenCalledWith(
      "initialize",
      expect.objectContaining({
        clientInfo: { name: "Verde", version: "0.1.0" },
      }),
    );
    expect(mockConnection.sendNotification).toHaveBeenCalledWith(
      "initialized",
      {},
    );
  });

  it("passes rootUri derived from projectDir in the initialize request", async () => {
    const transport = makeTransport();

    renderHook(() =>
      useLspClient({
        transport,
        monaco: MOCK_MONACO,
        projectDir: "C:\\Users\\test\\AppData\\verde\\abc123",
      }),
    );

    await waitFor(() =>
      expect(mockConnection.sendRequest).toHaveBeenCalledWith(
        "initialize",
        expect.objectContaining({
          rootUri: "file:///C:/Users/test/AppData/verde/abc123",
        }),
      ),
    );
  });

  it("reports 'initialize-failed' when connection.sendRequest rejects with -32 error", async () => {
    const onError = vi.fn();
    const transport = makeTransport();
    mockConnection.sendRequest.mockRejectedValue(
      new Error("[-32603] Internal error"),
    );

    renderHook(() =>
      useLspClient({ transport, onError, monaco: MOCK_MONACO }),
    );

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        "initialize-failed",
        "[-32603] Internal error",
      ),
    );
  });

  it("registers Monaco providers after successful initialize", async () => {
    const { registerLspProviders } = await import("../lib/lsp-monaco-providers");
    const transport = makeTransport();

    renderHook(() =>
      useLspClient({ transport, monaco: MOCK_MONACO }),
    );

    await waitFor(() =>
      expect(registerLspProviders).toHaveBeenCalledWith(
        MOCK_MONACO,
        mockConnection,
        "vba",
        expect.objectContaining({ resolveDocumentUri: expect.any(Function) }),
      ),
    );
  });

  // --- Retry / reconnection tests ---

  it("retries on exit before surfacing error to UI", async () => {
    let emitExit: ((p: LspExitPayload) => void) | undefined;
    const transport = makeTransport({
      onExit: vi.fn(async (handler) => {
        emitExit = handler;
        return () => {};
      }),
    });
    const onError = vi.fn();

    renderHook(() =>
      useLspClient({ transport, onError, monaco: MOCK_MONACO }),
    );

    await waitFor(() => expect(emitExit).toBeDefined());
    await waitFor(() => expect(mockConnection.sendRequest).toHaveBeenCalled());

    // Simulate sidecar exit — should trigger retry, not error.
    act(() => {
      emitExit?.({ code: 1, signal: null });
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("surfaces 'exit' after exhausting all retries", async () => {
    const exitHandlers: Array<(p: LspExitPayload) => void> = [];
    const transport = makeTransport({
      onExit: vi.fn(async (handler) => {
        exitHandlers.push(handler);
        return () => {};
      }),
    });
    const onError = vi.fn();

    // After the initial successful handshake, make sendRequest hang
    // forever on retries so retryCount is never reset to 0.
    let initialCall = true;
    mockConnection.sendRequest.mockImplementation(() => {
      if (initialCall) {
        initialCall = false;
        return Promise.resolve({ capabilities: {} });
      }
      // Subsequent calls hang — simulates sidecar dying before
      // it can respond to initialize.
      return new Promise(() => {});
    });

    renderHook(() =>
      useLspClient({ transport, onError, monaco: MOCK_MONACO }),
    );

    // Wait for initial setup (exit handler + successful handshake).
    await waitFor(() => expect(exitHandlers.length).toBe(1));
    await waitFor(() => expect(mockConnection.sendRequest).toHaveBeenCalled());

    // Exhaust every retry attempt. Each exit fires during a pending
    // sendRequest, so retryCount keeps incrementing without reset.
    for (let i = 0; i < MAX_RETRIES; i++) {
      const handler = exitHandlers[exitHandlers.length - 1];
      act(() => {
        handler({ code: 1, signal: null });
      });
      expect(onError).not.toHaveBeenCalled();

      await act(async () => {
        await new Promise((r) =>
          setTimeout(r, INITIAL_BACKOFF_MS * 2 ** i + 50),
        );
      });
      // Wait for the new effect to register its exit listener.
      await waitFor(() => expect(exitHandlers.length).toBe(i + 2));
    }

    // One more exit after all retries are spent — should surface.
    const lastHandler = exitHandlers[exitHandlers.length - 1];
    act(() => {
      lastHandler({ code: 1, signal: null });
    });
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith("exit", undefined),
    );
  }, 20000);

  it("does not re-create connection when effect re-runs after successful handshake", async () => {
    const { createMessageConnection } = await import("vscode-jsonrpc");
    const transport = makeTransport();

    const { result, rerender } = renderHook(
      ({ dir }: { dir?: string }) =>
        useLspClient({ transport, projectDir: dir, monaco: MOCK_MONACO }),
      { initialProps: { dir: undefined } },
    );

    await waitFor(() => expect(result.current.ready).toBe(true));

    const callCountBefore = (createMessageConnection as ReturnType<typeof vi.fn>).mock.calls.length;

    // Trigger effect re-run via a dep change (projectDir).
    rerender({ dir: "/tmp/project" });

    await waitFor(() => expect(result.current.ready).toBe(true));
    // Should skip creating a new connection (initializedRef is true).
    expect(
      (createMessageConnection as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(callCountBefore);
  });

  it("resets retry counter after successful reconnect", async () => {
    const exitHandlers: Array<(p: LspExitPayload) => void> = [];
    const transport = makeTransport({
      onExit: vi.fn(async (handler) => {
        exitHandlers.push(handler);
        return () => {};
      }),
    });
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useLspClient({ transport, onError, monaco: MOCK_MONACO }),
    );

    await waitFor(() => expect(exitHandlers.length).toBe(1));
    await waitFor(() => expect(result.current.ready).toBe(true));

    // First exit — triggers retry #1.
    act(() => {
      exitHandlers[exitHandlers.length - 1]({ code: 1, signal: null });
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, INITIAL_BACKOFF_MS + 50));
    });
    await waitFor(() => expect(exitHandlers.length).toBe(2));

    // Successful reconnect (mockConnection.sendRequest still resolves).
    await waitFor(() => expect(result.current.ready).toBe(true));

    // Another exit — should start fresh retries (counter was reset).
    act(() => {
      exitHandlers[exitHandlers.length - 1]({ code: 1, signal: null });
    });
    expect(onError).not.toHaveBeenCalled();
  }, 10000);
});
