import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

// Mock the Tauri event API — useFileWatcher calls listen() to register for
// file-change events from the Rust backend.
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));

// Mock the plugin-dialog dynamic import used by App.handleOpenFile so we
// can bypass the real native file picker and feed a synthetic path in.
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(async () => "C:/tmp/missing.xlsm"),
}));

// Monaco doesn't render meaningfully under jsdom and registers Ctrl+S as an
// internal editor action rather than a DOM keydown listener, so driving the
// real save path from a test would require booting Monaco. Replace the
// Editor with a minimal stub that exposes onSave via a plain button — the
// Ctrl+S keybinding is covered by Editor's own tests, and what we care
// about here is App's catch-site routing of the resulting backend error.
vi.mock("./components/Editor", () => ({
  Editor: ({ onSave }: { onSave?: (content: string) => void }) => (
    <button
      type="button"
      data-testid="test-save-trigger"
      onClick={() => onSave?.("dummy content")}
    >
      test-save
    </button>
  ),
}));

import App from "./App";
import { open as openDialogMock } from "@tauri-apps/plugin-dialog";
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

// Commands that fire as side-effects on mount/unmount and are irrelevant
// to the test assertions. Each mockImplementation should delegate to this
// before rejecting unknown commands so they don't cause unhandled errors.
const BACKGROUND_COMMANDS = new Set([
  "get_initial_file",
  "start_file_watcher",
  "stop_file_watcher",
]);

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
    if (BACKGROUND_COMMANDS.has(cmd)) return Promise.resolve(null);
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
      if (BACKGROUND_COMMANDS.has(cmd)) return Promise.resolve(null);
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

describe("App save blocked", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("renders the localized excelOpen body when save_module rejects with EXCEL_OPEN", async () => {
    // Phase 2B replaced a hardcoded English sentence with t("status.excelOpen").
    // The invariant under test: when save_module rejects with the EXCEL_OPEN:
    // prefix, the excelOpenPrompt banner must render the localized en.json
    // value — not the old literal "Cannot save while Excel has the workbook
    // open." — and its dismiss control must carry t("common.dismiss").
    const projectResponse = {
      project_id: "abc1234567890def",
      xlsm_path: "C:/tmp/missing.xlsm",
      project_dir: "C:/verde/projects/abc1234567890def",
      modules: [
        { filename: "Module1.bas", type: 1, line_count: 0, hash: "h" },
      ],
    };
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "get_settings") return Promise.resolve(defaultSettingsResponse);
      if (cmd === "open_project") return Promise.resolve(projectResponse);
      // checkConflict is called inside the open flow; resolve empty so it
      // doesn't accidentally surface a ConflictDialog that steals focus.
      if (cmd === "check_conflict") return Promise.resolve([]);
      if (cmd === "read_module") return Promise.resolve("");
      if (cmd === "save_module") {
        return Promise.reject(new Error("EXCEL_OPEN: workbook is open"));
      }
      if (BACKGROUND_COMMANDS.has(cmd)) return Promise.resolve(null);
    return Promise.reject(new Error(`unexpected command: ${cmd}`));
    });

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Open .xlsm" }));

    // Wait for the project to open — the stub Editor above renders once
    // activeModule is set, which is the signal the open flow finished.
    const saveButton = await screen.findByTestId("test-save-trigger");
    fireEvent.click(saveButton);

    // Banner renders with role="alert" for both warning and error tones; the
    // EXCEL_OPEN path is the only banner surface active here so a single
    // findByRole is unambiguous. Asserting on the full body text proves the
    // t("status.excelOpen") wiring landed in Phase 2B, and the explicit
    // not-matcher pins the old hardcoded string as a regression sentinel.
    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(
      "Excel has this workbook open. Close Excel and try saving again."
    );
    expect(banner).not.toHaveTextContent(
      "Cannot save while Excel has the workbook open."
    );
    // common.dismiss wiring: the Banner's dismiss button must carry the
    // en.json label, not the old hardcoded "Dismiss" literal — scope the
    // lookup to the banner so we don't accidentally match some other button.
    expect(
      within(banner).getByRole("button", { name: "Dismiss" })
    ).toBeInTheDocument();
  });

  it("renders the localized saveBlocked banner without leaking the SAVE_BLOCKED_READONLY sentinel or firing save_module, when the user tries to save in read-only mode", async () => {
    // Sprint 9 characterization: pins the consumer side of the
    // SAVE_BLOCKED_READONLY contract pinned hook-side in Sprint 8. The
    // sentinel is an exact-string coupling that App.handleSave translates
    // into a localized banner via `e.message === SAVE_BLOCKED_READONLY`.
    // Three invariants land in one test so any single drift surfaces:
    //
    //   1. Banner text resolves to the en.json status.saveBlocked value —
    //      a regression that bypasses t(...) and leaks the raw constant
    //      fails this AND invariant 2.
    //   2. The sentinel literal never reaches the DOM — the translation
    //      step must consume it. A catch-site change that re-routes the
    //      read-only throw into routeParsedError's generic surface would
    //      either leak "SAVE_BLOCKED_READONLY" or drop it to the generic
    //      banner; both fail here.
    //   3. save_module is never invoked — the hook short-circuits in
    //      read-only mode before the backend call. This is diagonal to
    //      the Sprint 8 hook-side pin: if App ever bypassed the hook and
    //      called tauri-commands directly, the hook test would still
    //      pass but this one catches it.
    //
    // Flow: Open .xlsm → LOCKED rejection surfaces LockDialog →
    //       click "Open Read-Only" → readonly project opens →
    //       click Editor stub save trigger → hook throws sentinel →
    //       App catch-site renders saveBlocked Banner.
    const projectResponse = {
      project_id: "abc1234567890def",
      xlsm_path: "C:/tmp/missing.xlsm",
      project_dir: "C:/verde/projects/abc1234567890def",
      modules: [
        { filename: "Module1.bas", type: 1, line_count: 0, hash: "h" },
      ],
    };
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "get_settings") return Promise.resolve(defaultSettingsResponse);
      if (cmd === "open_project") {
        // Force the lock path so the read-only branch becomes reachable —
        // handleOpenReadOnly is only invoked from the LockDialog button.
        return Promise.reject(
          new Error("LOCKED:alice:WORKSTATION:2026-04-20T12:00:00Z")
        );
      }
      if (cmd === "open_project_readonly") {
        return Promise.resolve(projectResponse);
      }
      // checkConflict is called inside the read-only open flow; resolve
      // empty so no ConflictDialog steals the Banner assertion below.
      if (cmd === "check_conflict") return Promise.resolve([]);
      if (cmd === "read_module") return Promise.resolve("");
      if (BACKGROUND_COMMANDS.has(cmd)) return Promise.resolve(null);
    return Promise.reject(new Error(`unexpected command: ${cmd}`));
    });

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Open .xlsm" }));

    // LockDialog surfaces after open_project rejects with LOCKED; click
    // the Open Read-Only action (label from en.json lock.openReadOnly).
    fireEvent.click(
      await screen.findByRole("button", { name: "Open Read-Only" })
    );

    // Editor stub renders once activeModule is set on the readonly project;
    // that's the signal the open flow finished. Then fire the save trigger.
    const saveButton = await screen.findByTestId("test-save-trigger");
    fireEvent.click(saveButton);

    // Invariant 1: the saveBlocked Banner renders with the en.json body.
    // role="alert" uniquely identifies Banner (readOnly strip is role="status").
    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(
      "Cannot save while in Read-Only mode. Close and reopen with write access to save changes."
    );

    // Invariant 2: the internal sentinel must not appear in the rendered
    // tree. t("status.saveBlocked") is the user-facing surface; the
    // constant name is a code-level detail.
    expect(banner).not.toHaveTextContent("SAVE_BLOCKED_READONLY");

    // Invariant 3: save_module is never invoked when readOnly is true.
    // Iterating over mock.calls[*][0] is the cheapest way to assert a
    // command name was never dispatched without coupling to argument shape.
    expect(
      invokeMock.mock.calls.map((c) => c[0])
    ).not.toContain("save_module");
  });
});

describe("App file dialog", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    // The plugin-dialog mock is module-scoped (vi.mock hoisted above the
    // imports) so `openDialogMock` is the same vi.fn across tests — reset
    // its call history so the assertion below sees only this test's call.
    vi.mocked(openDialogMock).mockClear();
  });

  it("passes the localized Excel filter name to the plugin-dialog open call", async () => {
    // Phase 2 swapped the hardcoded "Excel Macro" filter name for
    // t("common.fileTypeExcelMacro"). Characterize that wiring at the
    // dialog-call site: the filters[0].name propagated through the dynamic
    // import must equal the en.json value, and the extension stays "xlsm".
    // Asserting against the English string (not the i18n key) proves the
    // t(...) call resolved through react-i18next rather than echoing the key.
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === "get_settings") return Promise.resolve(defaultSettingsResponse);
      // open_project won't be reached because the mocked open() returns null
      // below — but stub it defensively so an unexpected call surfaces clearly.
      if (BACKGROUND_COMMANDS.has(cmd)) return Promise.resolve(null);
    return Promise.reject(new Error(`unexpected command: ${cmd}`));
    });
    // Returning null short-circuits handleOpenFile after the dialog call,
    // so we only observe the filter args without needing backend plumbing.
    vi.mocked(openDialogMock).mockResolvedValueOnce(null);

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Open .xlsm" }));

    await waitFor(() => {
      expect(openDialogMock).toHaveBeenCalled();
    });
    const callArg = vi.mocked(openDialogMock).mock.calls[0][0] as {
      filters: { name: string; extensions: string[] }[];
    };
    expect(callArg.filters[0].name).toBe("Excel Macro");
    expect(callArg.filters[0].extensions[0]).toBe("xlsm");
  });
});
