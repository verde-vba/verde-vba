// File watcher hook tests — verifies that external file-change events
// from the Rust backend trigger the correct callbacks depending on
// whether the changed file is the active module and whether the editor
// has unsaved changes.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFileWatcher } from "./useFileWatcher";

// ── Module mocks ─────────────────────────────────────────────────

// Capture the event handler registered by the hook so tests can fire
// synthetic events.
let listenHandler: ((event: { payload: unknown }) => void) | undefined;
const mockUnlisten = vi.fn();

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((_eventName: string, handler: (event: { payload: unknown }) => void) => {
    listenHandler = handler;
    return Promise.resolve(mockUnlisten);
  }),
}));

vi.mock("../lib/tauri-commands", () => ({
  startFileWatcher: vi.fn(async () => {}),
  stopFileWatcher: vi.fn(async () => {}),
  readModule: vi.fn(async () => "new content from disk"),
}));

// ── Helpers ──────────────────────────────────────────────────────

function fireFileChanged(filename: string, kind = "modify") {
  act(() => {
    listenHandler?.({ payload: { filename, kind } });
  });
}

function defaultOptions(overrides: Partial<Parameters<typeof useFileWatcher>[0]> = {}) {
  return {
    projectId: "abc123",
    projectDir: "C:\\Users\\test\\AppData\\verde\\abc123",
    activeModuleFilename: "Module1.bas",
    isDirty: () => false,
    onReload: vi.fn(),
    onConflict: vi.fn(),
    onInvalidate: vi.fn(),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe("useFileWatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listenHandler = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts watcher on mount when projectDir is provided", async () => {
    const { startFileWatcher } = await import("../lib/tauri-commands");
    renderHook(() => useFileWatcher(defaultOptions()));

    await waitFor(() =>
      expect(startFileWatcher).toHaveBeenCalledWith(
        "C:\\Users\\test\\AppData\\verde\\abc123",
      ),
    );
  });

  it("stops watcher and unlistens on unmount", async () => {
    const { stopFileWatcher } = await import("../lib/tauri-commands");
    const { unmount } = renderHook(() => useFileWatcher(defaultOptions()));

    await waitFor(() => expect(listenHandler).toBeDefined());
    unmount();

    await waitFor(() => expect(stopFileWatcher).toHaveBeenCalled());
    expect(mockUnlisten).toHaveBeenCalled();
  });

  it("does nothing when projectDir is null", async () => {
    const { startFileWatcher } = await import("../lib/tauri-commands");
    const opts = defaultOptions({ projectDir: null });
    renderHook(() => useFileWatcher(opts));

    // Give it a tick.
    await waitFor(() => {});
    expect(startFileWatcher).not.toHaveBeenCalled();
  });

  it("calls onReload when active module is clean and changed externally", async () => {
    const { readModule } = await import("../lib/tauri-commands");
    const onReload = vi.fn();
    const opts = defaultOptions({
      isDirty: () => false,
      onReload,
    });
    renderHook(() => useFileWatcher(opts));
    await waitFor(() => expect(listenHandler).toBeDefined());

    fireFileChanged("Module1.bas");

    await waitFor(() =>
      expect(readModule).toHaveBeenCalledWith("abc123", "Module1.bas"),
    );
    await waitFor(() =>
      expect(onReload).toHaveBeenCalledWith("Module1.bas", "new content from disk"),
    );
  });

  it("calls onConflict when active module is dirty and changed externally", async () => {
    const onConflict = vi.fn();
    const opts = defaultOptions({
      isDirty: () => true,
      onConflict,
    });
    renderHook(() => useFileWatcher(opts));
    await waitFor(() => expect(listenHandler).toBeDefined());

    fireFileChanged("Module1.bas");

    expect(onConflict).toHaveBeenCalledWith("Module1.bas");
  });

  it("calls onInvalidate for non-active module", async () => {
    const onInvalidate = vi.fn();
    const opts = defaultOptions({
      activeModuleFilename: "Module1.bas",
      onInvalidate,
    });
    renderHook(() => useFileWatcher(opts));
    await waitFor(() => expect(listenHandler).toBeDefined());

    fireFileChanged("Module2.bas");

    expect(onInvalidate).toHaveBeenCalledWith("Module2.bas");
  });
});
