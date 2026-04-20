import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSave } from "./useSave";
import type { ModuleInfo } from "../lib/types";

const mod1: ModuleInfo = { filename: "Module1.bas", module_type: 1, line_count: 10, hash: "h1" };

const SAVE_BLOCKED_READONLY = "SAVE_BLOCKED_READONLY";

function makeOptions(overrides: Partial<Parameters<typeof useSave>[0]> = {}) {
  return {
    activeModule: mod1 as ModuleInfo | null,
    saveModule: vi.fn(async () => {}),
    setExcelOpenPrompt: vi.fn() as (s: string | null) => void,
    handleCaughtBackendError: vi.fn() as (e: unknown, path: string | null) => void,
    saveBlockedMessage: "Cannot save in read-only mode",
    xlsmPath: "C:/w/file.xlsm" as string | null,
    ...overrides,
  };
}

describe("useSave — handleSave", () => {
  it("does nothing when activeModule is null", async () => {
    const opts = makeOptions({ activeModule: null });
    const { result } = renderHook(() => useSave(opts));
    await act(async () => {
      await result.current.handleSave("content");
    });
    expect(opts.saveModule).not.toHaveBeenCalled();
  });

  it("calls saveModule with the active module filename and content", async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useSave(opts));
    await act(async () => {
      await result.current.handleSave("Sub Foo()\nEnd Sub");
    });
    expect(opts.saveModule).toHaveBeenCalledWith("Module1.bas", "Sub Foo()\nEnd Sub");
  });

  it("clears excelOpenPrompt and saveBlockedPrompt on success", async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useSave(opts));
    // Pre-set saveBlockedPrompt so we can observe the clear
    act(() => {
      result.current.setSaveBlockedPrompt("old error");
    });
    await act(async () => {
      await result.current.handleSave("content");
    });
    expect(opts.setExcelOpenPrompt).toHaveBeenCalledWith(null);
    expect(result.current.saveBlockedPrompt).toBeNull();
  });

  it("sets saveBlockedPrompt to saveBlockedMessage when SAVE_BLOCKED_READONLY is thrown", async () => {
    const opts = makeOptions({
      saveModule: vi.fn(async () => {
        throw new Error(SAVE_BLOCKED_READONLY);
      }),
    });
    const { result } = renderHook(() => useSave(opts));
    await act(async () => {
      await result.current.handleSave("content");
    });
    expect(result.current.saveBlockedPrompt).toBe("Cannot save in read-only mode");
    expect(opts.handleCaughtBackendError).not.toHaveBeenCalled();
  });

  it("calls handleCaughtBackendError for non-sentinel errors", async () => {
    const opts = makeOptions({
      saveModule: vi.fn(async () => {
        throw new Error("EXCEL_OPEN: workbook is open");
      }),
    });
    const { result } = renderHook(() => useSave(opts));
    await act(async () => {
      await result.current.handleSave("content");
    });
    expect(opts.handleCaughtBackendError).toHaveBeenCalledWith(
      expect.any(Error),
      "C:/w/file.xlsm"
    );
    expect(result.current.saveBlockedPrompt).toBeNull();
  });

  it("calls handleCaughtBackendError with null xlsmPath when project has no path", async () => {
    const opts = makeOptions({
      xlsmPath: null,
      saveModule: vi.fn(async () => {
        throw new Error("generic error");
      }),
    });
    const { result } = renderHook(() => useSave(opts));
    await act(async () => {
      await result.current.handleSave("content");
    });
    expect(opts.handleCaughtBackendError).toHaveBeenCalledWith(expect.any(Error), null);
  });
});

describe("useSave — saveBlockedPrompt", () => {
  it("can be cleared via setSaveBlockedPrompt(null)", async () => {
    const opts = makeOptions({
      saveModule: vi.fn(async () => {
        throw new Error(SAVE_BLOCKED_READONLY);
      }),
    });
    const { result } = renderHook(() => useSave(opts));
    await act(async () => {
      await result.current.handleSave("content");
    });
    expect(result.current.saveBlockedPrompt).not.toBeNull();
    act(() => {
      result.current.setSaveBlockedPrompt(null);
    });
    expect(result.current.saveBlockedPrompt).toBeNull();
  });
});
