import { describe, expect, it } from "vitest";
import {
  VBA_LANGUAGE_ID,
  vbaLanguageConfig,
  vbaTokensProvider,
} from "./monaco-vba";

describe("VBA_LANGUAGE_ID", () => {
  it("is the stable identifier 'vba'", () => {
    expect(VBA_LANGUAGE_ID).toBe("vba");
  });
});

describe("vbaTokensProvider (Sprint 31 Monarch characterization)", () => {
  it("is case-insensitive and has no default token", () => {
    expect(vbaTokensProvider.ignoreCase).toBe(true);
    expect(vbaTokensProvider.defaultToken).toBe("");
  });

  it("enumerates the full VBA keyword set (pinned list)", () => {
    const keywords = vbaTokensProvider.keywords as string[];
    expect(keywords).toContain("Sub");
    expect(keywords).toContain("Function");
    expect(keywords).toContain("Property");
    expect(keywords).toContain("End");
    expect(keywords).toContain("Dim");
    expect(keywords).toContain("As");
    expect(keywords).toContain("ByRef");
    expect(keywords).toContain("ByVal");
    expect(keywords).toContain("WithEvents");
    expect(keywords).toContain("ParamArray");
    expect(keywords.length).toBeGreaterThanOrEqual(80);
  });

  it("enumerates VBA built-in runtime functions (pinned list)", () => {
    const builtins = vbaTokensProvider.builtinFunctions as string[];
    expect(builtins).toContain("MsgBox");
    expect(builtins).toContain("InStr");
    expect(builtins).toContain("Mid");
    expect(builtins).toContain("CInt");
    expect(builtins).toContain("Format");
    expect(builtins).toContain("IIf");
    expect(builtins.length).toBeGreaterThanOrEqual(75);
  });

  it("emits the canonical token-type set (contract for Sprint 31.F tree-sitter mapping)", () => {
    const root = vbaTokensProvider.tokenizer.root;
    const tokenTypes = new Set<string>();
    for (const rule of root) {
      if (Array.isArray(rule) && rule.length >= 2) {
        const action = rule[1];
        if (typeof action === "string") {
          tokenTypes.add(action);
        } else if (typeof action === "object" && action !== null && "cases" in action) {
          for (const v of Object.values((action as { cases: Record<string, string> }).cases)) {
            tokenTypes.add(v);
          }
        }
      }
    }
    expect(tokenTypes).toEqual(
      new Set([
        "comment",
        "string",
        "number",
        "number.date",
        "number.hex",
        "keyword",
        "predefined",
        "identifier",
        "operator",
        "delimiter",
      ])
    );
  });

  it("includes two comment rules: apostrophe (line-start) and Rem keyword", () => {
    const root = vbaTokensProvider.tokenizer.root;
    const commentRules = root.filter(
      (r): r is [RegExp, string] =>
        Array.isArray(r) && r[0] instanceof RegExp && r[1] === "comment"
    );
    expect(commentRules).toHaveLength(2);
    const sources = commentRules.map((r) => r[0].source);
    expect(sources.some((s) => s.startsWith("'"))).toBe(true);
    expect(sources.some((s) => s.includes("R") && s.includes("E") && s.includes("M"))).toBe(true);
  });
});

describe("vbaLanguageConfig (Sprint 31 language-config characterization)", () => {
  it("uses single-quote as the VBA line-comment marker", () => {
    expect(vbaLanguageConfig.comments?.lineComment).toBe("'");
  });

  it("declares paren brackets (tree-sitter replacement must preserve folding)", () => {
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
