import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TabBar } from "./TabBar";
import { initI18n } from "../hooks/useLocale";
import type { ModuleInfo } from "../lib/types";

// Align with App.test.tsx: initialise i18n once with English so t(...) in
// TabBar resolves to real strings, which is what screen-reader-facing
// assertions (accessible names) need to compare against.
initI18n("en");

const makeModule = (filename: string): ModuleInfo => ({
  filename,
  module_type: 1,
  line_count: 0,
  hash: "",
});

describe("TabBar", () => {
  it("exposes an accessible name on the per-tab close button so screen readers can announce it", () => {
    // Arrange: render with one open module so exactly one tab — and thus
    // one close button — exists. The bare `×` glyph inside <button> is not
    // an accessible name; without aria-label the button's name is empty.
    render(
      <TabBar
        openModules={[makeModule("Module1.bas")]}
        activeModule={makeModule("Module1.bas")}
        onSelectModule={() => {}}
        onCloseModule={() => {}}
      />
    );

    // Assert: the close button must be reachable by its translated
    // accessible name. Using getByRole + name option is the canonical RTL
    // way to pin a11y wiring: it fails identically whether aria-label is
    // missing, empty, or routed through the wrong key.
    expect(
      screen.getByRole("button", { name: "Close" })
    ).toBeInTheDocument();
  });
});
