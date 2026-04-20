import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReadOnlyBar } from "./ReadOnlyBar";
import { initI18n } from "../hooks/useLocale";

initI18n("en");

describe("ReadOnlyBar", () => {
  it("renders a status region with the read-only warning text", () => {
    render(<ReadOnlyBar />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Read-Only (locked by another user)"
    );
  });
});
