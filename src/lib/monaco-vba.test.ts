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

  it("pins folding start/end keywords (Sub, Function, Property, If, For, Do, While, Select, With, Type, Enum)", () => {
    const startSource = vbaLanguageConfig.folding?.markers?.start.source ?? "";
    expect(startSource).toContain("Sub");
    expect(startSource).toContain("Function");
    expect(startSource).toContain("Property");
    expect(startSource).toContain("Enum");
    expect(startSource).toContain("Type");

    const endSource = vbaLanguageConfig.folding?.markers?.end.source ?? "";
    expect(endSource).toContain("End");
    expect(endSource).toContain("Next");
    expect(endSource).toContain("Loop");
    expect(endSource).toContain("Wend");
  });

  it("auto-closes parens and double-quotes", () => {
    expect(vbaLanguageConfig.autoClosingPairs).toEqual([
      { open: "(", close: ")" },
      { open: '"', close: '"' },
    ]);
  });
});
