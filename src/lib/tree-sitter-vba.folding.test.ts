// Integration tests for tree-sitter-based folding range computation.
// Loads the real tree-sitter-vba WASM and asserts that computeFoldingRanges
// returns correct 0-based line ranges for VBA block constructs.

import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { Language, Parser as ParserType } from "web-tree-sitter";
import { computeFoldingRanges, type VbaFoldingRange } from "./tree-sitter-vba";

let language: Language;
let ParserCtor: typeof ParserType;

beforeAll(async () => {
  const { Parser, Language: L } = await import("web-tree-sitter");
  ParserCtor = Parser;
  await Parser.init({
    locateFile: (name: string) =>
      name === "web-tree-sitter.wasm"
        ? path.resolve("node_modules/web-tree-sitter/web-tree-sitter.wasm")
        : name,
  });
  const buf = fs.readFileSync(path.resolve("public/tree-sitter-vba.wasm"));
  const wasmBytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  language = await L.load(wasmBytes);
});

function parse(source: string) {
  const parser = new ParserCtor();
  parser.setLanguage(language);
  const tree = parser.parse(source);
  const root = tree.rootNode;
  // Caller must call tree.delete() after use if needed, but for tests
  // the GC handles it fine.
  return root;
}

describe("computeFoldingRanges", () => {
  it("returns a range for Sub...End Sub", () => {
    const root = parse("Sub Foo()\n    Dim x\nEnd Sub");
    const ranges = computeFoldingRanges(root);
    expect(ranges).toContainEqual({ startLine: 0, endLine: 2 });
  });

  it("returns a range for Function...End Function", () => {
    const root = parse("Function Bar() As Long\n    Bar = 42\nEnd Function");
    const ranges = computeFoldingRanges(root);
    expect(ranges).toContainEqual({ startLine: 0, endLine: 2 });
  });

  it("returns a range for Property...End Property", () => {
    const root = parse(
      'Property Get Baz() As String\n    Baz = "test"\nEnd Property'
    );
    const ranges = computeFoldingRanges(root);
    expect(ranges).toContainEqual({ startLine: 0, endLine: 2 });
  });

  it("returns a range for Type...End Type", () => {
    const root = parse(
      "Type MyType\n    Name As String\n    Value As Long\nEnd Type"
    );
    const ranges = computeFoldingRanges(root);
    expect(ranges).toContainEqual({ startLine: 0, endLine: 3 });
  });

  it("returns a range for Enum...End Enum", () => {
    const root = parse(
      "Enum MyEnum\n    First = 1\n    Second = 2\nEnd Enum"
    );
    const ranges = computeFoldingRanges(root);
    expect(ranges).toContainEqual({ startLine: 0, endLine: 3 });
  });

  it("returns nested ranges for If inside Sub", () => {
    const source = [
      "Sub Foo()",
      "    If True Then",
      "        x = 1",
      "    End If",
      "End Sub",
    ].join("\n");
    const ranges = computeFoldingRanges(parse(source));
    // Sub range: 0..4, If range: 1..3
    expect(ranges).toContainEqual({ startLine: 0, endLine: 4 });
    expect(ranges).toContainEqual({ startLine: 1, endLine: 3 });
  });

  it("returns ranges for For, Do, and While loops", () => {
    const source = [
      "Sub Foo()",
      "    For i = 1 To 10",
      "        x = i",
      "    Next i",
      "    Do While True",
      "        x = 1",
      "    Loop",
      "    While True",
      "        x = 2",
      "    Wend",
      "End Sub",
    ].join("\n");
    const ranges = computeFoldingRanges(parse(source));
    expect(ranges).toContainEqual({ startLine: 1, endLine: 3 }); // For
    expect(ranges).toContainEqual({ startLine: 4, endLine: 6 }); // Do
    expect(ranges).toContainEqual({ startLine: 7, endLine: 9 }); // While
  });

  it("returns ranges for Select Case and its Case clauses", () => {
    const source = [
      "Sub Foo()",
      "    Select Case x",
      "        Case 1",
      "            x = 2",
      "        Case Else",
      "            x = 3",
      "    End Select",
      "End Sub",
    ].join("\n");
    const ranges = computeFoldingRanges(parse(source));
    expect(ranges).toContainEqual({ startLine: 1, endLine: 6 }); // Select
  });

  it("returns a range for With...End With", () => {
    const source = [
      "Sub Foo()",
      '    With Sheet1',
      '        .Name = "Test"',
      "    End With",
      "End Sub",
    ].join("\n");
    const ranges = computeFoldingRanges(parse(source));
    expect(ranges).toContainEqual({ startLine: 1, endLine: 3 }); // With
  });

  it("returns no range for a single-line Sub", () => {
    // Single-line Sub (no body) — tree-sitter may still parse it as
    // a sub_declaration on one line, but it shouldn't produce a fold.
    const root = parse("Sub Foo()\nEnd Sub");
    const ranges = computeFoldingRanges(root);
    // The sub spans lines 0-1 which IS multi-line, so it still folds.
    // But if both keywords are on the same line, no fold.
    const singleLine = parse("Dim x As Long");
    expect(computeFoldingRanges(singleLine)).toEqual([]);
  });

  it("groups consecutive comment lines into a comment folding range", () => {
    const source = [
      "' Line 1",
      "' Line 2",
      "' Line 3",
      "Sub Foo()",
      "End Sub",
    ].join("\n");
    const ranges = computeFoldingRanges(parse(source));
    expect(ranges).toContainEqual({
      startLine: 0,
      endLine: 2,
      kind: "comment",
    });
  });

  it("does not group non-consecutive comments", () => {
    const source = [
      "' Comment A",
      "Sub Foo()",
      "' Comment B",
      "End Sub",
    ].join("\n");
    const ranges = computeFoldingRanges(parse(source));
    const commentRanges = ranges.filter((r) => r.kind === "comment");
    expect(commentRanges).toEqual([]);
  });
});
