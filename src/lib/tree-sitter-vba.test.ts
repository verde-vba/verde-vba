import { describe, expect, it, vi } from "vitest";
import type { Language } from "web-tree-sitter";
import {
  TREE_SITTER_VBA_WASM_URL,
  VBA_SEMANTIC_TOKEN_TYPES,
  createVbaSemanticTokensProvider,
  loadTreeSitterVbaLanguage,
  shouldFallbackToMonarch,
  vbaSemanticTokensLegend,
} from "./tree-sitter-vba";

describe("TREE_SITTER_VBA_WASM_URL (Sprint 31.C skeleton)", () => {
  it("points to the Vite static asset path for the WASM grammar artifact", () => {
    expect(TREE_SITTER_VBA_WASM_URL).toBe("/tree-sitter-vba.wasm");
  });
});

describe("vbaSemanticTokensLegend (Sprint 31.C legend contract)", () => {
  it("declares the canonical token-type set for Sprint 31.E/F mapping", () => {
    expect(vbaSemanticTokensLegend.tokenTypes).toEqual([
      "comment",
      "string",
      "number",
      "keyword",
      "function",
      "variable",
      "operator",
    ]);
  });

  it("has no token modifiers yet (Sprint 31 scope)", () => {
    expect(vbaSemanticTokensLegend.tokenModifiers).toEqual([]);
  });

  it("exposes the same token list as VBA_SEMANTIC_TOKEN_TYPES", () => {
    expect([...vbaSemanticTokensLegend.tokenTypes]).toEqual([
      ...VBA_SEMANTIC_TOKEN_TYPES,
    ]);
  });
});

describe("loadTreeSitterVbaLanguage (Sprint 31.C load-stub behavior)", () => {
  it("returns { ok: true } when init + load succeed (injected deps)", async () => {
    const fakeLang = {} as Language;
    const result = await loadTreeSitterVbaLanguage("/tree-sitter-vba.wasm", {
      init: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      load: vi.fn<(url: string) => Promise<Language>>().mockResolvedValue(fakeLang),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.language).toBe(fakeLang);
    }
  });

  it("returns { ok: false, reason: 'init-failed' } when Parser.init throws", async () => {
    const result = await loadTreeSitterVbaLanguage("/tree-sitter-vba.wasm", {
      init: vi.fn<() => Promise<void>>().mockRejectedValue(new Error("boom")),
      load: vi.fn<(url: string) => Promise<Language>>(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("init-failed");
    }
  });

  it("returns { ok: false, reason: 'wasm-load-failed' } when Language.load throws (e.g., artifact missing)", async () => {
    const result = await loadTreeSitterVbaLanguage("/tree-sitter-vba.wasm", {
      init: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      load: vi
        .fn<(url: string) => Promise<Language>>()
        .mockRejectedValue(new Error("404")),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("wasm-load-failed");
    }
  });

  it("passes the wasm URL through to the load callback", async () => {
    const loadFn = vi
      .fn<(url: string) => Promise<Language>>()
      .mockResolvedValue({} as Language);
    await loadTreeSitterVbaLanguage("/custom.wasm", {
      init: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      load: loadFn,
    });
    expect(loadFn).toHaveBeenCalledWith("/custom.wasm");
  });
});

describe("shouldFallbackToMonarch (Sprint 31.C fallback decision)", () => {
  it("returns true when the load result is a failure", () => {
    expect(
      shouldFallbackToMonarch({
        ok: false,
        reason: "wasm-load-failed",
        error: new Error("x"),
      })
    ).toBe(true);
  });

  it("returns false when the load succeeded", () => {
    expect(
      shouldFallbackToMonarch({ ok: true, language: {} as Language })
    ).toBe(false);
  });
});

describe("createVbaSemanticTokensProvider (Sprint 31.C skeleton)", () => {
  it("returns a provider whose legend matches vbaSemanticTokensLegend", () => {
    const provider = createVbaSemanticTokensProvider({} as Language);
    expect(provider.getLegend()).toEqual(vbaSemanticTokensLegend);
  });

  it("returns null from provideDocumentSemanticTokens (Sprint 31.F will implement real mapping)", () => {
    const provider = createVbaSemanticTokensProvider({} as Language);
    const tokens = provider.provideDocumentSemanticTokens(
      // Minimal stub — the skeleton ignores args
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any
    );
    expect(tokens).toBeNull();
  });
});
