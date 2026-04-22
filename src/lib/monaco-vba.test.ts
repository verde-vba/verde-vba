import { describe, expect, it } from "vitest";
import { VBA_LANGUAGE_ID, vbaLanguageConfig } from "./monaco-vba";

describe("VBA_LANGUAGE_ID", () => {
  it("is the stable identifier 'vba'", () => {
    expect(VBA_LANGUAGE_ID).toBe("vba");
  });
});

describe("vbaLanguageConfig (Sprint 31.G — language config only, tree-sitter owns tokenization)", () => {
  it("uses single-quote as the VBA line-comment marker", () => {
    expect(vbaLanguageConfig.comments?.lineComment).toBe("'");
  });

  it("declares paren brackets (tree-sitter handles balanced-pair recognition)", () => {
    expect(vbaLanguageConfig.brackets).toEqual([["(", ")"]]);
  });

  it("does not define regex folding markers (tree-sitter FoldingRangeProvider owns folding)", () => {
    expect(vbaLanguageConfig.folding).toBeUndefined();
  });

  it("auto-closes parens and double-quotes", () => {
    expect(vbaLanguageConfig.autoClosingPairs).toEqual([
      { open: "(", close: ")" },
      { open: '"', close: '"' },
    ]);
  });
});
