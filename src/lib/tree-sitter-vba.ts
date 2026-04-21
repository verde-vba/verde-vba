import type { Language } from "web-tree-sitter";
import type { languages } from "monaco-editor";

export const TREE_SITTER_VBA_WASM_URL = "/tree-sitter-vba.wasm";

export const VBA_SEMANTIC_TOKEN_TYPES = [
  "comment",
  "string",
  "number",
  "keyword",
  "function",
  "variable",
  "operator",
] as const;

export type VbaSemanticTokenType = (typeof VBA_SEMANTIC_TOKEN_TYPES)[number];

export const vbaSemanticTokensLegend: languages.SemanticTokensLegend = {
  tokenTypes: [...VBA_SEMANTIC_TOKEN_TYPES],
  tokenModifiers: [],
};

export type TreeSitterLoadResult =
  | { ok: true; language: Language }
  | { ok: false; reason: "init-failed" | "wasm-load-failed"; error: unknown };

export async function loadTreeSitterVbaLanguage(
  wasmUrl: string = TREE_SITTER_VBA_WASM_URL,
  deps: {
    init?: () => Promise<void>;
    load?: (url: string) => Promise<Language>;
  } = {}
): Promise<TreeSitterLoadResult> {
  const init =
    deps.init ??
    (async () => {
      const { Parser } = await import("web-tree-sitter");
      await Parser.init();
    });
  const load =
    deps.load ??
    (async (url: string) => {
      const { Language: L } = await import("web-tree-sitter");
      return L.load(url);
    });

  try {
    await init();
  } catch (error) {
    return { ok: false, reason: "init-failed", error };
  }

  try {
    const language = await load(wasmUrl);
    return { ok: true, language };
  } catch (error) {
    return { ok: false, reason: "wasm-load-failed", error };
  }
}

export function shouldFallbackToMonarch(result: TreeSitterLoadResult): boolean {
  return !result.ok;
}

export function createVbaSemanticTokensProvider(
  language: Language
): languages.DocumentSemanticTokensProvider {
  void language;
  return {
    getLegend: () => vbaSemanticTokensLegend,
    provideDocumentSemanticTokens: () => null,
    releaseDocumentSemanticTokens: () => {
      /* no-op in skeleton */
    },
  };
}
