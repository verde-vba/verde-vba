// Sprint 31.E — RED tests for semantic-tokens mapping.
// These tests load the real tree-sitter-vba WASM and assert the Monaco
// delta-encoded `Uint32Array` output. The current skeleton in
// `tree-sitter-vba.ts` returns `null` from `provideDocumentSemanticTokens`,
// so all assertions in this file are expected to FAIL until Sprint 31.F
// implements the real mapping.
//
// Why a separate file: keeps the WASM load + integration assertions away
// from the Sprint 31.C unit tests, which exercise injected stubs only.

import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { Language } from "web-tree-sitter";
import type { editor } from "monaco-editor";
import {
  VBA_SEMANTIC_TOKEN_TYPES,
  createVbaSemanticTokensProvider,
} from "./tree-sitter-vba";

// Token-type indices in `VBA_SEMANTIC_TOKEN_TYPES`.
const T_KEYWORD = VBA_SEMANTIC_TOKEN_TYPES.indexOf("keyword");
const T_FUNCTION = VBA_SEMANTIC_TOKEN_TYPES.indexOf("function");
const T_COMMENT = VBA_SEMANTIC_TOKEN_TYPES.indexOf("comment");
const T_STRING = VBA_SEMANTIC_TOKEN_TYPES.indexOf("string");
const T_NUMBER = VBA_SEMANTIC_TOKEN_TYPES.indexOf("number");

let language: Language;

beforeAll(async () => {
  const { Parser, Language: L } = await import("web-tree-sitter");
  await Parser.init({
    locateFile: (name: string) =>
      name === "web-tree-sitter.wasm"
        ? path.resolve("node_modules/web-tree-sitter/web-tree-sitter.wasm")
        : name,
  });
  // jsdom's globalThis.Uint8Array differs from Node's Buffer prototype, so
  // wrap to satisfy the `instanceof Uint8Array` check inside Language.load.
  const buf = fs.readFileSync(path.resolve("public/tree-sitter-vba.wasm"));
  const wasmBytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  language = await L.load(wasmBytes);
});

function fakeModel(value: string): editor.ITextModel {
  return { getValue: () => value } as unknown as editor.ITextModel;
}

async function runProvider(
  source: string
): Promise<Uint32Array> {
  const provider = createVbaSemanticTokensProvider(language);
  const model = fakeModel(source);
  const cancel = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) };
  const result = await provider.provideDocumentSemanticTokens(
    model,
    null,
    cancel as unknown as Parameters<typeof provider.provideDocumentSemanticTokens>[2]
  );
  expect(result).not.toBeNull();
  const data = (result as { data: Uint32Array }).data;
  expect(data).toBeInstanceOf(Uint32Array);
  return data;
}

describe("provideDocumentSemanticTokens (Sprint 31.E RED — Sprint 31.F impl)", () => {
  it("emits 4 tokens for `Sub Foo()\\nEnd Sub` in Monaco delta-encoded order", async () => {
    const data = await runProvider("Sub Foo()\nEnd Sub");
    expect(Array.from(data)).toEqual([
      // "Sub" line 0, abs col 0, len 3, keyword
      0, 0, 3, T_KEYWORD, 0,
      // "Foo" line 0, +4 col, len 3, function
      0, 4, 3, T_FUNCTION, 0,
      // "End" line 1, abs col 0, len 3, keyword
      1, 0, 3, T_KEYWORD, 0,
      // "Sub" line 1, +4 col, len 3, keyword
      0, 4, 3, T_KEYWORD, 0,
    ]);
  });

  it("emits a comment token for a line-comment", async () => {
    const data = await runProvider("' hello\nSub A()\nEnd Sub");
    // First 5 numbers describe the comment on line 0.
    expect(Array.from(data.slice(0, 5))).toEqual([0, 0, 7, T_COMMENT, 0]);
  });

  it("emits string and number tokens for literals inside a sub body", async () => {
    const src = `Sub A()\n    Dim x As Long\n    x = 42\n    MsgBox "hi"\nEnd Sub`;
    const data = await runProvider(src);
    // We expect at least: keyword Sub, function A, keyword End, keyword Sub,
    // keyword Dim, variable x, keyword As, type Long (or variable), number 42,
    // function/identifier MsgBox, string "hi". A precise full assertion
    // is brittle, so we focus on presence of key token types in the stream.
    const tokenTypes = new Set<number>();
    for (let i = 3; i < data.length; i += 5) tokenTypes.add(data[i]);
    expect(tokenTypes.has(T_KEYWORD)).toBe(true);
    expect(tokenTypes.has(T_NUMBER)).toBe(true);
    expect(tokenTypes.has(T_STRING)).toBe(true);
  });

  it("trims leading whitespace from grammar nodes that include it (e.g. identifier ` Foo`)", async () => {
    const data = await runProvider("Sub Foo()\nEnd Sub");
    // The "Foo" token must report length 3 (not 4) and offset 4 (not 3).
    // Token 2 starts at index 5..10 in the encoded array.
    const fooStartChar = data[6];
    const fooLength = data[7];
    expect(fooStartChar).toBe(4);
    expect(fooLength).toBe(3);
  });

  it("applies last-wins capture semantics (function declaration overrides bare identifier)", async () => {
    const data = await runProvider("Sub Foo()\nEnd Sub");
    // Token 2 ("Foo") must have type = function, not variable.
    expect(data[8]).toBe(T_FUNCTION);
  });
});
