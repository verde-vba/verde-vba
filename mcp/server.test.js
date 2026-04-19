import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Sanity test: confirms vitest is wired up correctly for the mcp package.
// server.js auto-invokes main() on import (stdio transport), so we don't
// import it directly here. Once server.js exposes unit-testable exports,
// real tests will replace this.
describe("mcp test infrastructure", () => {
  it("runs under vitest", () => {
    expect(1 + 1).toBe(2);
  });

  it("can locate server.js next to this test", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    expect(existsSync(join(here, "server.js"))).toBe(true);
  });
});
