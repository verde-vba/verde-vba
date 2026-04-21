import { describe, it, expect, vi } from "vitest";
import {
  createTauriLspTransport,
  LSP_EXIT_EVENT,
  LSP_MESSAGE_EVENT,
  LSP_SEND_COMMAND,
  type LspExitPayload,
  type LspMessage,
  type LspTransportDeps,
} from "./lsp-bridge";

function makeDeps(overrides: Partial<LspTransportDeps> = {}): LspTransportDeps {
  return {
    invoke: vi.fn(async () => undefined as never),
    listen: vi.fn(async () => () => {}),
    ...overrides,
  };
}

describe("createTauriLspTransport", () => {
  it("forwards send() to invoke('lsp_send', { message })", async () => {
    const invoke = vi.fn(async () => undefined as never);
    const transport = createTauriLspTransport(makeDeps({ invoke }));

    const msg: LspMessage = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { capabilities: {} },
    };
    await transport.send(msg);

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(LSP_SEND_COMMAND, { message: msg });
  });

  it("subscribes onMessage to listen('lsp://message', …) and forwards payloads", async () => {
    let captured: ((event: { payload: LspMessage }) => void) | undefined;
    const listen = vi.fn(async (_event: string, handler) => {
      captured = handler as typeof captured;
      return () => {};
    });
    const transport = createTauriLspTransport(makeDeps({ listen }));

    const handler = vi.fn();
    await transport.onMessage(handler);

    expect(listen).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith(LSP_MESSAGE_EVENT, expect.any(Function));

    const response: LspMessage = {
      jsonrpc: "2.0",
      id: 1,
      result: { capabilities: { hoverProvider: true } },
    };
    captured?.({ payload: response });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(response);
  });

  it("subscribes onExit to listen('lsp://exit', …) and forwards exit payloads", async () => {
    let captured:
      | ((event: { payload: LspExitPayload }) => void)
      | undefined;
    const listen = vi.fn(async (_event: string, handler) => {
      captured = handler as typeof captured;
      return () => {};
    });
    const transport = createTauriLspTransport(makeDeps({ listen }));

    const handler = vi.fn();
    await transport.onExit(handler);

    expect(listen).toHaveBeenCalledWith(LSP_EXIT_EVENT, expect.any(Function));

    const exit: LspExitPayload = { code: 137, signal: "SIGKILL" };
    captured?.({ payload: exit });

    expect(handler).toHaveBeenCalledWith(exit);
  });

  it("returns the unsubscribe function from listen() unchanged", async () => {
    const unlisten = vi.fn();
    const listen = vi.fn(async () => unlisten);
    const transport = createTauriLspTransport(makeDeps({ listen }));

    const off = await transport.onMessage(() => {});
    expect(off).toBe(unlisten);
  });

  it("does not call invoke/listen at factory construction time (lazy)", () => {
    const invoke = vi.fn(async () => undefined as never);
    const listen = vi.fn(async () => () => {});
    createTauriLspTransport({ invoke, listen });

    expect(invoke).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
  });
});
