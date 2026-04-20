import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, beforeAll, describe, expect, it, vi } from "vitest";

// jsdom doesn't implement matchMedia; useTheme calls it synchronously on
// mount so we need a shim before the first render. Kept minimal — always
// reports "light" since the theme resolution is not under test here.
beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
});

// Mock the Tauri IPC boundary so hooks routing through `tauri-commands.ts`
// flow through our controllable mock. Mirrors useVerdeProject.test.ts.
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

// Mock the plugin-dialog dynamic import used by App.handleOpenFile so we
// can bypass the real native file picker and feed a synthetic path in.
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(async () => "C:/tmp/missing.xlsm"),
}));

import App from "./App";
import { initI18n } from "./hooks/useLocale";

// App relies on react-i18next being initialized (done in main.tsx in prod).
// Do it once here so `t(...)` returns the real en.json strings instead of
// the raw keys, which is what we assert against below.
initI18n("en");

// Default settings payload used when `get_settings` is invoked. Trust is
// pre-acknowledged so TrustGuideDialog doesn't steal the render.
const defaultSettingsResponse = {
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
  trust: { vbaAcknowledged: true },
};

// Wire the standard "settings load OK + open_project fails" backend, then
// drive the WelcomeScreen open action and wait for the resulting banner.
// Returns the banner element so the caller can assert on its content.
async function renderAppWithOpenError(openError: string) {
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === "get_settings") {
      return Promise.resolve(defaultSettingsResponse);
    }
    if (cmd === "open_project") {
      return Promise.reject(new Error(openError));
    }
    return Promise.reject(new Error(`unexpected command: ${cmd}`));
  });

  render(<App />);
  // WelcomeScreen surfaces the open action via t("menu.open") === "Open .xlsm"
  const openButton = await screen.findByRole("button", {
    name: "Open .xlsm",
  });
  fireEvent.click(openButton);
  return await screen.findByRole("alert");
}

describe("App error banner", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("renders the projectNotFound banner with the localized title when open_project rejects with a 'project not found:' message", async () => {
    // Assert: the error banner (role="alert") must carry the localized
    // title from en.json → errors.projectNotFound.title. Asserting on the
    // *English* title (not the i18n key) proves both that routeParsedError
    // ran AND that toI18nKey's mapping round-trips through react-i18next.
    const banner = await renderAppWithOpenError(
      "project not found: deadbeef00000000"
    );
    expect(banner).toHaveTextContent("Project not found");
  });

  it("clears the error banner when the user clicks the dismiss button", async () => {
    await renderAppWithOpenError("project not found: deadbeef00000000");

    // Click the dismiss button — label comes from en.json common.dismiss.
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    // Assert: the banner is gone. waitFor handles the React state flush.
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("does not render the error banner when the backend rejects with a locked error during force-open", async () => {
    // Both the initial open AND the force-open retry reject with LOCKED.
    // The invariant under test: a locked-kind ParsedError must surface via
    // the LockDialog, never via the generic red errorBanner. The first
    // rejection is the standard lock-on-open path; the second simulates the
    // (rare but possible) race where a different user re-acquired the lock
    // between the user clicking "Force Open" and the backend retrying.
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "get_settings") {
        return Promise.resolve(defaultSettingsResponse);
      }
      if (cmd === "open_project" || cmd === "force_open_project") {
        return Promise.reject(
          new Error("LOCKED:alice:WORKSTATION:2026-04-20T12:00:00Z")
        );
      }
      return Promise.reject(new Error(`unexpected command: ${cmd}`));
    });

    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Open .xlsm" })
    );

    // First LockDialog appears for the initial lock.
    const forceOpenButton = await screen.findByRole("button", {
      name: "Force Open",
    });
    fireEvent.click(forceOpenButton);

    // After the force-open rejection settles, give React a tick to flush
    // any state updates that might surface a banner. We then assert no
    // generic alert is rendered — that's the invariant.
    await waitFor(() => {
      // The force_open_project rejection must have been observed before we
      // can meaningfully assert on its UI consequences. Check the mock.
      expect(invokeMock).toHaveBeenCalledWith("force_open_project", expect.anything());
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
