import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Settings } from "../lib/types";

// Mock the Tauri IPC boundary. `tauri-commands.ts` calls `invoke` directly,
// so routing through that mock covers both `getSettings` and `saveSettings`
// without re-implementing the command wrappers.
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

import { useTrust } from "./useTrust";

function makeSettings(overrides?: Partial<Settings>): Settings {
  return {
    theme: "system",
    language: "auto",
    editor: {
      font_size: 14,
      font_family: "monospace",
      tab_size: 4,
      word_wrap: "off",
      minimap: true,
    },
    sync: { auto_sync_to_excel: true },
    trust: { vbaAcknowledged: false },
    ...overrides,
  };
}

describe("useTrust", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("reflects vbaAcknowledged from the initial getSettings call", async () => {
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "get_settings") {
        return Promise.resolve(makeSettings({ trust: { vbaAcknowledged: true } }));
      }
      return Promise.reject(new Error(`unexpected command: ${cmd}`));
    });

    const { result } = renderHook(() => useTrust());

    // Initial render is null so TrustGuideDialog can suppress render
    // until we know the persisted value.
    expect(result.current.acknowledged).toBeNull();

    await waitFor(() => {
      expect(result.current.acknowledged).toBe(true);
    });
  });

  it("acknowledge() persists vbaAcknowledged=true via saveSettings", async () => {
    const initial = makeSettings({ trust: { vbaAcknowledged: false } });
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "get_settings") return Promise.resolve(initial);
      if (cmd === "save_settings") return Promise.resolve();
      return Promise.reject(new Error(`unexpected command: ${cmd}`));
    });

    const { result } = renderHook(() => useTrust());
    await waitFor(() => expect(result.current.acknowledged).toBe(false));

    await act(async () => {
      await result.current.acknowledge();
    });

    expect(result.current.acknowledged).toBe(true);
    const saveCall = invokeMock.mock.calls.find(([cmd]) => cmd === "save_settings");
    expect(saveCall).toBeDefined();
    const payload = saveCall?.[1] as { settings: Settings };
    expect(payload.settings.trust.vbaAcknowledged).toBe(true);
    // Other fields are preserved (spread from current settings).
    expect(payload.settings.theme).toBe(initial.theme);
  });
});
