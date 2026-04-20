import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useOpenFile } from "./useOpenFile";
import type { ParsedError } from "../lib/error-parse";

function makeOptions(overrides: Partial<Parameters<typeof useOpenFile>[0]> = {}) {
  return {
    openProject: vi.fn(async () => {}),
    forceOpenProject: vi.fn(async () => {}),
    openProjectReadOnly: vi.fn(async () => {}),
    routeParsedError: vi.fn() as (p: ParsedError) => void,
    fileTypeLabel: "Excel Macro",
    ...overrides,
  };
}

describe("useOpenFile — handleCaughtBackendError", () => {
  it("sets lockPrompt when error is locked and xlsmPath is provided", () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useOpenFile(opts));
    act(() => {
      result.current.handleCaughtBackendError(
        new Error("LOCKED:alice:WORKSTATION:2026-04-20T12:00:00Z"),
        "C:/tmp/file.xlsm"
      );
    });
    expect(result.current.lockPrompt).toEqual({
      xlsmPath: "C:/tmp/file.xlsm",
      user: "alice",
      machine: "WORKSTATION",
      time: "2026-04-20T12:00:00Z",
    });
    expect(opts.routeParsedError).not.toHaveBeenCalled();
  });

  it("calls routeParsedError for locked error when xlsmPath is null (no path context)", () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useOpenFile(opts));
    act(() => {
      result.current.handleCaughtBackendError(
        new Error("LOCKED:alice:WORKSTATION:2026-04-20T12:00:00Z"),
        null
      );
    });
    expect(result.current.lockPrompt).toBeNull();
    expect(opts.routeParsedError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "locked" })
    );
  });

  it("delegates non-locked errors to routeParsedError, not lockPrompt", () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useOpenFile(opts));
    act(() => {
      result.current.handleCaughtBackendError(
        new Error("project not found: abc123"),
        "C:/tmp/file.xlsm"
      );
    });
    expect(result.current.lockPrompt).toBeNull();
    expect(opts.routeParsedError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "projectNotFound" })
    );
  });
});

describe("useOpenFile — handleForceOpen", () => {
  it("is a no-op when lockPrompt is null", async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useOpenFile(opts));
    await act(async () => {
      await result.current.handleForceOpen();
    });
    expect(opts.forceOpenProject).not.toHaveBeenCalled();
  });

  it("calls forceOpenProject with xlsmPath and clears lockPrompt on success", async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useOpenFile(opts));
    act(() => {
      result.current.handleCaughtBackendError(
        new Error("LOCKED:alice:PC:2026-04-20T12:00:00Z"),
        "C:/w/file.xlsm"
      );
    });
    await act(async () => {
      await result.current.handleForceOpen();
    });
    expect(opts.forceOpenProject).toHaveBeenCalledWith("C:/w/file.xlsm");
    expect(result.current.lockPrompt).toBeNull();
  });

  it("calls handleCaughtBackendError when forceOpenProject rejects", async () => {
    const opts = makeOptions({
      forceOpenProject: vi.fn(async () => {
        throw new Error("project not found: xyz");
      }),
    });
    const { result } = renderHook(() => useOpenFile(opts));
    act(() => {
      result.current.handleCaughtBackendError(
        new Error("LOCKED:bob:PC:2026-04-20T12:00:00Z"),
        "C:/w/file.xlsm"
      );
    });
    await act(async () => {
      await result.current.handleForceOpen();
    });
    expect(opts.routeParsedError).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "projectNotFound" })
    );
  });
});

describe("useOpenFile — handleOpenReadOnly", () => {
  it("is a no-op when lockPrompt is null", async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useOpenFile(opts));
    await act(async () => {
      await result.current.handleOpenReadOnly();
    });
    expect(opts.openProjectReadOnly).not.toHaveBeenCalled();
  });

  it("calls openProjectReadOnly with xlsmPath and clears lockPrompt on success", async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useOpenFile(opts));
    act(() => {
      result.current.handleCaughtBackendError(
        new Error("LOCKED:carol:SERVER:2026-04-20T12:00:00Z"),
        "C:/w/file.xlsm"
      );
    });
    await act(async () => {
      await result.current.handleOpenReadOnly();
    });
    expect(opts.openProjectReadOnly).toHaveBeenCalledWith("C:/w/file.xlsm");
    expect(result.current.lockPrompt).toBeNull();
  });
});

describe("useOpenFile — handleLockCancel", () => {
  it("clears lockPrompt", () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useOpenFile(opts));
    act(() => {
      result.current.handleCaughtBackendError(
        new Error("LOCKED:dan:PC:2026-04-20T12:00:00Z"),
        "C:/w/file.xlsm"
      );
    });
    expect(result.current.lockPrompt).not.toBeNull();
    act(() => {
      result.current.handleLockCancel();
    });
    expect(result.current.lockPrompt).toBeNull();
  });
});
