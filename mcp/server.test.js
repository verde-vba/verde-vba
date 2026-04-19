import { afterEach, describe, it, expect } from "vitest";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { tmpdir } from "os";
import { getProjectDir, handleGetSymbols } from "./server.js";

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

describe("handleGetSymbols", () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("returns a Sub procedure as a symbol", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-test-"));
    const source = 'Sub Hello()\n    MsgBox "hi"\nEnd Sub\n';
    writeFileSync(join(tmpDir, "Module1.bas"), source, "utf-8");

    const result = await handleGetSymbols(tmpDir, {});
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    const symbols = Array.isArray(parsed) ? parsed : parsed.symbols;

    expect(symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Hello",
          kind: "Sub",
          module: "Module1",
        }),
      ])
    );
  });

  it("returns a Function procedure as a symbol", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-test-"));
    const source =
      "Function Add(a As Long, b As Long) As Long\n    Add = a + b\nEnd Function\n";
    writeFileSync(join(tmpDir, "MathUtils.bas"), source, "utf-8");

    const result = await handleGetSymbols(tmpDir, {});
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    const symbols = Array.isArray(parsed) ? parsed : parsed.symbols;

    expect(symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Add",
          kind: "Function",
          module: "MathUtils",
        }),
      ])
    );
  });
});
