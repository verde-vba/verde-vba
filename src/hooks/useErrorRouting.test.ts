import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useErrorRouting } from "./useErrorRouting";

describe("useErrorRouting", () => {
  it("routes excelOpen to excelOpenPrompt, not errorBanner", () => {
    const { result } = renderHook(() => useErrorRouting());
    act(() => {
      result.current.routeParsedError({ kind: "excelOpen", detail: "workbook.xlsm" });
    });
    expect(result.current.excelOpenPrompt).toBe("workbook.xlsm");
    expect(result.current.errorBanner).toBeNull();
  });

  it("routes projectNotFound to errorBanner, not excelOpenPrompt", () => {
    const { result } = renderHook(() => useErrorRouting());
    act(() => {
      result.current.routeParsedError({ kind: "projectNotFound", detail: "abc123" });
    });
    expect(result.current.errorBanner).toEqual({ kind: "projectNotFound", detail: "abc123" });
    expect(result.current.excelOpenPrompt).toBeNull();
  });

  it("routes projectCorrupted to errorBanner", () => {
    const { result } = renderHook(() => useErrorRouting());
    act(() => {
      result.current.routeParsedError({ kind: "projectCorrupted", detail: "bad json" });
    });
    expect(result.current.errorBanner).toEqual({ kind: "projectCorrupted", detail: "bad json" });
  });

  it("routes generic to errorBanner", () => {
    const { result } = renderHook(() => useErrorRouting());
    act(() => {
      result.current.routeParsedError({ kind: "generic", message: "something went wrong" });
    });
    expect(result.current.errorBanner).toEqual({ kind: "generic", message: "something went wrong" });
  });

  it("drops locked without touching any state (invariant: locked never reaches generic banner)", () => {
    const { result } = renderHook(() => useErrorRouting());
    act(() => {
      result.current.routeParsedError({
        kind: "locked",
        user: "alice",
        machine: "PC",
        time: "2026-04-20T12:00:00Z",
      });
    });
    expect(result.current.errorBanner).toBeNull();
    expect(result.current.excelOpenPrompt).toBeNull();
  });

  it("clears errorBanner via setErrorBanner(null)", () => {
    const { result } = renderHook(() => useErrorRouting());
    act(() => {
      result.current.routeParsedError({ kind: "generic", message: "oops" });
    });
    expect(result.current.errorBanner).not.toBeNull();
    act(() => {
      result.current.setErrorBanner(null);
    });
    expect(result.current.errorBanner).toBeNull();
  });

  it("clears excelOpenPrompt via setExcelOpenPrompt(null)", () => {
    const { result } = renderHook(() => useErrorRouting());
    act(() => {
      result.current.routeParsedError({ kind: "excelOpen", detail: "test.xlsm" });
    });
    expect(result.current.excelOpenPrompt).not.toBeNull();
    act(() => {
      result.current.setExcelOpenPrompt(null);
    });
    expect(result.current.excelOpenPrompt).toBeNull();
  });
});
