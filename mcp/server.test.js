import { afterEach, describe, it, expect } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { tmpdir } from "os";
import {
  getProjectDir,
  handleDeleteModule,
  handleGetLines,
  handleGetModuleOutline,
  handleGetProcedure,
  handleGetSymbols,
  handlePatchLines,
  handlePatchProcedure,
  handleWriteModule,
  safeModulePath,
  TOOLS,
} from "./server.js";

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

describe("MCP tool registration", () => {
  it("registers get_symbols in TOOLS list", () => {
    expect(TOOLS.some((t) => t.name === "get_symbols")).toBe(true);
  });
});

// PBI #1 (Sprint 18): path-traversal hardening. All handlers must reject
// `args.module` values that escape projectDir or carry non-module extensions.
// The attack vector is AI-controlled MCP arguments (prompt injection in a
// workbook comment coercing the model to call write_module with
// `../../.../Startup/pwn.bat`). `safeModulePath` is the single choke point.
describe("safeModulePath", () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("accepts a plain module filename with .bas extension", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-safe-"));
    const got = safeModulePath(tmpDir, "Module1.bas");
    expect(got).toBe(join(tmpDir, "Module1.bas"));
  });

  it("accepts .cls and .frm extensions", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-safe-"));
    expect(() => safeModulePath(tmpDir, "Customer.cls")).not.toThrow();
    expect(() => safeModulePath(tmpDir, "frmInput.frm")).not.toThrow();
  });

  it("rejects parent-directory traversal", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-safe-"));
    expect(() => safeModulePath(tmpDir, "../escape.bas")).toThrow(
      /invalid module/i
    );
    expect(() => safeModulePath(tmpDir, "../../../etc/passwd")).toThrow(
      /invalid module/i
    );
  });

  it("rejects absolute paths", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-safe-"));
    expect(() => safeModulePath(tmpDir, "/etc/passwd")).toThrow(
      /invalid module/i
    );
    expect(() =>
      safeModulePath(tmpDir, "C:\\Windows\\System32\\config\\SAM")
    ).toThrow(/invalid module/i);
  });

  it("rejects path separators embedded in the name", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-safe-"));
    expect(() => safeModulePath(tmpDir, "sub/mod.bas")).toThrow(
      /invalid module/i
    );
    expect(() => safeModulePath(tmpDir, "sub\\mod.bas")).toThrow(
      /invalid module/i
    );
  });

  it("rejects unknown extensions", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-safe-"));
    expect(() => safeModulePath(tmpDir, "pwn.bat")).toThrow(/invalid module/i);
    expect(() => safeModulePath(tmpDir, "noext")).toThrow(/invalid module/i);
    expect(() => safeModulePath(tmpDir, "Module.txt")).toThrow(
      /invalid module/i
    );
  });

  it("rejects empty / null / non-string input", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-safe-"));
    expect(() => safeModulePath(tmpDir, "")).toThrow(/invalid module/i);
    expect(() => safeModulePath(tmpDir, null)).toThrow(/invalid module/i);
    expect(() => safeModulePath(tmpDir, undefined)).toThrow(/invalid module/i);
    expect(() => safeModulePath(tmpDir, 42)).toThrow(/invalid module/i);
  });
});

// Each handler that composes `join(projectDir, args.module)` must surface
// a validation error instead of silently operating on the escaped path.
describe("handlers reject path traversal", () => {
  let tmpDir;

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handleWriteModule refuses to write outside projectDir", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-traversal-"));
    expect(() =>
      handleWriteModule(tmpDir, {
        module: "../outside.bas",
        content: "Sub Pwn()\nEnd Sub\n",
      })
    ).toThrow(/invalid module/i);

    // Blast-radius verification: the escape target must not have been created.
    const escapeTarget = join(dirname(tmpDir), "outside.bas");
    expect(existsSync(escapeTarget)).toBe(false);
  });

  it("handleDeleteModule refuses to delete outside projectDir", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-traversal-"));
    const outsideVictim = join(dirname(tmpDir), "victim.bas");
    writeFileSync(outsideVictim, "keep me\n", "utf-8");
    try {
      expect(() =>
        handleDeleteModule(tmpDir, { module: "../victim.bas" })
      ).toThrow(/invalid module/i);
      expect(existsSync(outsideVictim)).toBe(true);
      expect(readFileSync(outsideVictim, "utf-8")).toBe("keep me\n");
    } finally {
      if (existsSync(outsideVictim)) rmSync(outsideVictim);
    }
  });

  it("handleGetProcedure refuses to read outside projectDir", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-traversal-"));
    expect(() =>
      handleGetProcedure(tmpDir, {
        module: "../secret.bas",
        procedure: "Foo",
      })
    ).toThrow(/invalid module/i);
  });

  it("handleGetLines refuses to read outside projectDir", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-traversal-"));
    expect(() =>
      handleGetLines(tmpDir, { module: "../secret.bas", start: 1, end: 5 })
    ).toThrow(/invalid module/i);
  });

  it("handleGetModuleOutline refuses to read outside projectDir", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-traversal-"));
    expect(() =>
      handleGetModuleOutline(tmpDir, { module: "../secret.bas" })
    ).toThrow(/invalid module/i);
  });

  it("handlePatchProcedure refuses to write outside projectDir", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-traversal-"));
    expect(() =>
      handlePatchProcedure(tmpDir, {
        module: "../outside.bas",
        procedure: "Foo",
        newSource: "Sub Foo()\nEnd Sub\n",
      })
    ).toThrow(/invalid module/i);
  });

  it("handlePatchLines refuses to write outside projectDir", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-traversal-"));
    expect(() =>
      handlePatchLines(tmpDir, {
        module: "../outside.bas",
        start: 1,
        end: 1,
        newContent: "x",
      })
    ).toThrow(/invalid module/i);
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

  it("resolves .cls module name from Attribute VB_Name, ignoring preamble", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-test-"));
    const source =
      "VERSION 1.0 CLASS\n" +
      "BEGIN\n" +
      "  MultiUse = -1  'True\n" +
      "END\n" +
      'Attribute VB_Name = "CustomerRepo"\n' +
      "Attribute VB_GlobalNameSpace = False\n" +
      "Attribute VB_Creatable = False\n" +
      "Attribute VB_PredeclaredId = False\n" +
      "Attribute VB_Exposed = False\n" +
      "Option Explicit\n" +
      "\n" +
      "Sub Greet()\n" +
      "End Sub\n";
    writeFileSync(join(tmpDir, "Whatever.cls"), source, "utf-8");

    const result = await handleGetSymbols(tmpDir, {});
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    const symbols = Array.isArray(parsed) ? parsed : parsed.symbols;

    expect(symbols).toHaveLength(1);
    expect(symbols[0]).toEqual(
      expect.objectContaining({
        name: "Greet",
        kind: "Sub",
        module: "CustomerRepo",
      })
    );
    // Regression guard: preamble keys must not leak as symbols.
    expect(symbols.find((s) => s.name === "MultiUse")).toBeUndefined();
    expect(symbols.find((s) => s.name === "VB_Name")).toBeUndefined();
  });

  it("detects module-level Public/Private/Dim variables with type info", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-test-"));
    const source =
      "Option Explicit\n" +
      "\n" +
      "Public gCustomerName As String\n" +
      "Private mCounter As Long\n" +
      "Dim unscoped As Variant\n" +
      "\n" +
      "Sub DoWork()\n" +
      "    Dim localOnly As Integer\n" +
      "    localOnly = 42\n" +
      "End Sub\n";
    writeFileSync(join(tmpDir, "Vars.bas"), source, "utf-8");

    const result = await handleGetSymbols(tmpDir, {});
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    const symbols = Array.isArray(parsed) ? parsed : parsed.symbols;

    expect(symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "gCustomerName",
          kind: "Variable",
          module: "Vars",
          type: "String",
        }),
        expect.objectContaining({
          name: "mCounter",
          kind: "Variable",
          module: "Vars",
          type: "Long",
        }),
        expect.objectContaining({
          name: "unscoped",
          kind: "Variable",
          module: "Vars",
          type: "Variant",
        }),
        expect.objectContaining({
          name: "DoWork",
          kind: "Sub",
          module: "Vars",
        }),
      ])
    );
    // localOnly is declared INSIDE DoWork — must not leak as a module symbol.
    expect(symbols.find((s) => s.name === "localOnly")).toBeUndefined();
  });

  it("detects module-level Const declarations", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-test-"));
    const source =
      "Option Explicit\n" +
      "\n" +
      "Public Const MAX_ROWS As Long = 1000\n" +
      'Private Const APP_NAME = "Verde"\n';
    writeFileSync(join(tmpDir, "Consts.bas"), source, "utf-8");

    const result = await handleGetSymbols(tmpDir, {});
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    const symbols = Array.isArray(parsed) ? parsed : parsed.symbols;

    expect(symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "MAX_ROWS",
          kind: "Constant",
          module: "Consts",
          type: "Long",
        }),
        expect.objectContaining({
          name: "APP_NAME",
          kind: "Constant",
          module: "Consts",
        }),
      ])
    );
    // APP_NAME has no `As` — type field must be absent (impl choice pinned here).
    const appName = symbols.find((s) => s.name === "APP_NAME");
    expect(appName.type).toBeUndefined();
  });

  it("detects user-defined Type blocks without leaking fields", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-test-"));
    const source =
      "Option Explicit\n" +
      "\n" +
      "Public Type Customer\n" +
      "    Id As Long\n" +
      "    Name As String\n" +
      "End Type\n" +
      "\n" +
      "Private Type Internal\n" +
      "    Value As Variant\n" +
      "End Type\n";
    writeFileSync(join(tmpDir, "Types.bas"), source, "utf-8");

    const result = await handleGetSymbols(tmpDir, {});
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    const symbols = Array.isArray(parsed) ? parsed : parsed.symbols;

    expect(symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Customer",
          kind: "Type",
          module: "Types",
        }),
        expect.objectContaining({
          name: "Internal",
          kind: "Type",
          module: "Types",
        }),
      ])
    );
    // Fields declared inside a Type block must not leak as module symbols.
    expect(symbols.find((s) => s.name === "Id")).toBeUndefined();
    expect(symbols.find((s) => s.name === "Name")).toBeUndefined();
    expect(symbols.find((s) => s.name === "Value")).toBeUndefined();
  });

  it("returns Property Get/Let/Set procedures as symbols", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "verde-test-"));
    const source =
      "Property Get Name() As String\n" +
      "End Property\n" +
      "\n" +
      "Property Let Name(value As String)\n" +
      "End Property\n" +
      "\n" +
      "Property Set Target(obj As Object)\n" +
      "End Property\n";
    writeFileSync(join(tmpDir, "Person.cls"), source, "utf-8");

    const result = await handleGetSymbols(tmpDir, {});
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    const symbols = Array.isArray(parsed) ? parsed : parsed.symbols;

    expect(symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Name",
          kind: "Property Get",
          module: "Person",
        }),
        expect.objectContaining({
          name: "Name",
          kind: "Property Let",
          module: "Person",
        }),
        expect.objectContaining({
          name: "Target",
          kind: "Property Set",
          module: "Person",
        }),
      ])
    );
  });
});
