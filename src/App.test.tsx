import { fireEvent, render, screen } from "@testing-library/react";
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

describe("App error banner", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("renders the projectNotFound banner with the localized title when open_project rejects with a 'project not found:' message", async () => {
    // Arrange: settings load succeeds so TrustGuideDialog doesn't steal
    // the render; open_project rejects with the exact backend substring
    // parseBackendError keys on for the `projectNotFound` variant.
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "get_settings") {
        return Promise.resolve({
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
        });
      }
      if (cmd === "open_project") {
        return Promise.reject(
          new Error("project not found: deadbeef00000000")
        );
      }
      return Promise.reject(new Error(`unexpected command: ${cmd}`));
    });

    // Act
    render(<App />);
    // WelcomeScreen surfaces the open action via t("menu.open") === "Open .xlsm"
    const openButton = await screen.findByRole("button", {
      name: "Open .xlsm",
    });
    fireEvent.click(openButton);

    // Assert: the error banner (role="alert") must carry the localized
    // title from en.json → errors.projectNotFound.title. Asserting on the
    // *English* title (not the i18n key) proves both that routeParsedError
    // ran AND that toI18nKey's mapping round-trips through react-i18next.
    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent("Project not found");
  });
});
