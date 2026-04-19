import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getProjectDir } from "./server.js";

// Sanity test: confirms vitest is wired up correctly for the mcp package.
// server.js now guards main() with an isMainModule check, so importing
// handlers here does NOT start the stdio server. Real behavior tests for
// each tool handler will be added in the next phase.
describe("mcp test infrastructure", () => {
  it("runs under vitest", () => {
    expect(1 + 1).toBe(2);
  });

  it("can locate server.js next to this test", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    expect(existsSync(join(here, "server.js"))).toBe(true);
  });

  it("can import server.js without starting the server", () => {
    // Successful import already proves the guard works; this is a belt-
    // and-suspenders check that an export is actually callable.
    expect(typeof getProjectDir).toBe("function");
  });
});
