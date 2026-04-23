import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useModuleTabs } from "./useModuleTabs";
import type { ModuleInfo } from "../lib/types";

const mod1: ModuleInfo = { filename: "Module1.bas", type: 1, line_count: 10, hash: "h1" };
const mod2: ModuleInfo = { filename: "Module2.bas", type: 1, line_count: 5, hash: "h2" };
const mod3: ModuleInfo = { filename: "Module3.bas", type: 1, line_count: 3, hash: "h3" };

describe("useModuleTabs", () => {
  it("handleSelectModule calls setActiveModule with the module", () => {
    const setActiveModule = vi.fn();
    const { result } = renderHook(() =>
      useModuleTabs({ activeModule: null, setActiveModule })
    );
    act(() => {
      result.current.handleSelectModule(mod1);
    });
    expect(setActiveModule).toHaveBeenCalledWith(mod1);
  });

  it("handleSelectModule adds the module to openModules when not already open", () => {
    const setActiveModule = vi.fn();
    const { result } = renderHook(() =>
      useModuleTabs({ activeModule: null, setActiveModule })
    );
    act(() => {
      result.current.handleSelectModule(mod1);
    });
    expect(result.current.openModules).toEqual([mod1]);
  });

  it("handleSelectModule does not add a duplicate when already open", () => {
    const setActiveModule = vi.fn();
    const { result } = renderHook(() =>
      useModuleTabs({ activeModule: null, setActiveModule })
    );
    act(() => {
      result.current.handleSelectModule(mod1);
      result.current.handleSelectModule(mod1);
    });
    expect(result.current.openModules).toHaveLength(1);
  });

  it("handleCloseModule removes the module from openModules", () => {
    const setActiveModule = vi.fn();
    const { result } = renderHook(() =>
      useModuleTabs({ activeModule: mod1, setActiveModule })
    );
    act(() => {
      result.current.handleSelectModule(mod1);
      result.current.handleSelectModule(mod2);
    });
    act(() => {
      result.current.handleCloseModule(mod1);
    });
    expect(result.current.openModules).toEqual([mod2]);
  });

  it("handleCloseModule on the active module activates the last remaining tab", () => {
    const setActiveModule = vi.fn();
    const { result } = renderHook(() =>
      useModuleTabs({ activeModule: mod3, setActiveModule })
    );
    act(() => {
      result.current.handleSelectModule(mod1);
      result.current.handleSelectModule(mod2);
      result.current.handleSelectModule(mod3);
    });
    setActiveModule.mockClear();
    act(() => {
      result.current.handleCloseModule(mod3);
    });
    expect(setActiveModule).toHaveBeenCalledWith(mod2);
  });

  it("handleCloseModule on the only open active module calls setActiveModule(null)", () => {
    const setActiveModule = vi.fn();
    const { result } = renderHook(() =>
      useModuleTabs({ activeModule: mod1, setActiveModule })
    );
    act(() => {
      result.current.handleSelectModule(mod1);
    });
    setActiveModule.mockClear();
    act(() => {
      result.current.handleCloseModule(mod1);
    });
    expect(setActiveModule).toHaveBeenCalledWith(null);
    expect(result.current.openModules).toHaveLength(0);
  });

  it("handleCloseModule on a non-active module does not call setActiveModule", () => {
    const setActiveModule = vi.fn();
    const { result } = renderHook(() =>
      useModuleTabs({ activeModule: mod1, setActiveModule })
    );
    act(() => {
      result.current.handleSelectModule(mod1);
      result.current.handleSelectModule(mod2);
    });
    setActiveModule.mockClear();
    act(() => {
      result.current.handleCloseModule(mod2);
    });
    expect(setActiveModule).not.toHaveBeenCalled();
    expect(result.current.openModules).toEqual([mod1]);
  });
});
