import {
  Parser,
  Query,
  type Language,
  type Node,
  type QueryCapture,
  type TreeCursor,
} from "web-tree-sitter";
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

// Sprint 31.G: shouldFallbackToMonarch was removed. tree-sitter is now the
// single source of truth for VBA tokenization; load failure surfaces as a
// user-visible error banner rather than a silent Monarch fallback.

// Highlights query — focused subset of treesitter-vba/queries/highlights.scm,
// constrained to the seven Monaco token types declared by `vbaSemanticTokensLegend`.
// Pattern order matters: nvim-treesitter "last-wins" semantics are preserved by
// recording the highest patternIndex per (line,char,length) span.
const HIGHLIGHTS_QUERY = `
(identifier) @variable

[
  "Sub" "Function" "Property" "End" "Get" "Let" "Set"
  "Dim" "Public" "Private" "Friend" "Static" "Const" "Global" "ReDim" "Preserve" "WithEvents"
  "As" "Optional" "ByVal" "ByRef" "ParamArray" "New"
  "If" "Then" "Else" "ElseIf"
  "For" "Each" "In" "To" "Step" "Next"
  "Do" "Loop" "While" "Wend" "Until"
  "Select" "Case" "Is"
  "With"
  "Call" "Return" "Exit" "GoSub" "Implements" "Event"
  "Type" "Enum"
  "On" "Error" "GoTo" "Resume"
  "Option" "Explicit" "Compare" "Base" "Binary" "Text" "Database"
  "Declare" "PtrSafe" "Lib" "Alias"
  "AddressOf" "Attribute"
  "Me"
] @keyword

[ "And" "Or" "Xor" "Not" "Eqv" "Imp" "Mod" "Like" ] @keyword

[ "=" "+" "-" "*" "/" "\\\\" "^" "&" "<" ">" "<=" ">=" "<>" ":=" ] @operator

(comment) @comment
(string_literal) @string
(integer_literal) @number
(float_literal) @number
(hex_literal) @number
(octal_literal) @number

(sub_declaration name: (identifier) @function)
(function_declaration name: (identifier) @function)
(property_declaration name: (identifier) @function)
(declare_statement name: (identifier) @function)
(event_declaration name: (identifier) @function)
(call_expression function: (identifier) @function)
(paren_less_call function: (identifier) @function)
`;

function captureNameToTokenIndex(name: string): number {
  const i = (VBA_SEMANTIC_TOKEN_TYPES as readonly string[]).indexOf(name);
  return i;
}

interface TokenSpan {
  line: number;
  char: number;
  length: number;
}

// tree-sitter-vba sometimes reports a node range that includes leading
// whitespace (e.g. an `(identifier)` named "Foo" at col 3-7 with text " Foo").
// Trim leading whitespace and the same-line trailing whitespace, returning
// the actual token span. Returns null for whitespace-only nodes.
function trimmedExtent(node: Node): TokenSpan | null {
  const text = node.text;
  let leading = 0;
  while (leading < text.length && /\s/.test(text[leading])) leading++;
  if (leading === text.length) return null;

  let line = node.startPosition.row;
  let char = node.startPosition.column;
  for (let i = 0; i < leading; i++) {
    if (text[i] === "\n") {
      line++;
      char = 0;
    } else {
      char++;
    }
  }

  // Semantic tokens are single-line; for a multi-line node (e.g. block
  // comment, future hypothetical), only the first line is emitted here.
  const rest = text.slice(leading);
  const eol = rest.indexOf("\n");
  const lineRest = eol === -1 ? rest : rest.slice(0, eol);
  const trimmedRight = lineRest.replace(/\s+$/, "");
  if (trimmedRight.length === 0) return null;

  return { line, char, length: trimmedRight.length };
}

// Apply last-wins capture semantics, then encode the token list as
// Monaco's relative-delta Uint32Array (5 numbers per token:
// deltaLine, deltaStart, length, tokenType, tokenModifiers).
export function encodeCapturesAsSemanticTokens(
  captures: readonly QueryCapture[]
): Uint32Array {
  type Resolved = TokenSpan & { type: number; pattern: number };
  const byKey = new Map<string, Resolved>();
  for (const c of captures) {
    const typeIdx = captureNameToTokenIndex(c.name);
    if (typeIdx < 0) continue;
    const span = trimmedExtent(c.node);
    if (!span) continue;
    const key = `${span.line}:${span.char}:${span.length}`;
    const prev = byKey.get(key);
    if (!prev || c.patternIndex >= prev.pattern) {
      byKey.set(key, { ...span, type: typeIdx, pattern: c.patternIndex });
    }
  }

  const tokens = [...byKey.values()].sort(
    (a, b) => a.line - b.line || a.char - b.char
  );

  const data = new Uint32Array(tokens.length * 5);
  let prevLine = 0;
  let prevChar = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const deltaLine = t.line - prevLine;
    const deltaStart = deltaLine === 0 ? t.char - prevChar : t.char;
    data[i * 5] = deltaLine;
    data[i * 5 + 1] = deltaStart;
    data[i * 5 + 2] = t.length;
    data[i * 5 + 3] = t.type;
    data[i * 5 + 4] = 0;
    prevLine = t.line;
    prevChar = t.char;
  }
  return data;
}

// Editor wiring: load the WASM, then register the semantic-tokens provider
// against `languageId`. On failure, calls `onError` so the host UI can
// surface a banner / retry hint (e.g. "run `just fetch-wasm`").
export async function registerTreeSitterVbaProvider(
  monaco: typeof import("monaco-editor"),
  languageId: string,
  options: {
    wasmUrl?: string;
    onError?: (result: Extract<TreeSitterLoadResult, { ok: false }>) => void;
  } = {}
): Promise<TreeSitterLoadResult> {
  const result = await loadTreeSitterVbaLanguage(options.wasmUrl);
  if (result.ok) {
    const provider = createVbaSemanticTokensProvider(result.language);
    monaco.languages.registerDocumentSemanticTokensProvider(languageId, provider);
    const foldingProvider = createVbaFoldingRangeProvider(result.language);
    monaco.languages.registerFoldingRangeProvider(languageId, foldingProvider);
  } else {
    options.onError?.(result);
  }
  return result;
}

// ── Folding range computation ───────────────────────────────────

// Node types whose multi-line span should produce a folding range.
const FOLDABLE_NODE_TYPES = new Set([
  "sub_declaration",
  "function_declaration",
  "property_declaration",
  "if_statement",
  "for_statement",
  "do_statement",
  "while_statement",
  "select_statement",
  "with_statement",
  "type_declaration",
  "enum_declaration",
]);

export interface VbaFoldingRange {
  startLine: number; // 0-based
  endLine: number;   // 0-based
  kind?: "comment";
}

/**
 * Walk the tree-sitter AST and collect folding ranges for VBA block
 * constructs. Returns 0-based line ranges; the Monaco provider converts
 * them to 1-based before handing them off.
 */
export function computeFoldingRanges(rootNode: Node): VbaFoldingRange[] {
  const ranges: VbaFoldingRange[] = [];

  // DFS via TreeCursor — efficient, avoids allocating child arrays.
  const cursor: TreeCursor = rootNode.walk();
  let reachedRoot = false;
  while (!reachedRoot) {
    const nodeType = cursor.nodeType;
    if (FOLDABLE_NODE_TYPES.has(nodeType)) {
      const startLine = cursor.startPosition.row;
      const endLine = cursor.endPosition.row;
      if (endLine > startLine) {
        ranges.push({ startLine, endLine });
      }
    }

    // Standard DFS: child → sibling → backtrack
    if (cursor.gotoFirstChild()) continue;
    if (cursor.gotoNextSibling()) continue;
    while (true) {
      if (!cursor.gotoParent()) {
        reachedRoot = true;
        break;
      }
      if (cursor.gotoNextSibling()) break;
    }
  }

  // Group consecutive top-level / sibling comment nodes into a single
  // "comment" folding range. We scan rootNode's direct children and
  // every statement_block's children for runs of adjacent comment lines.
  collectCommentRanges(rootNode, ranges);

  return ranges;
}

function collectCommentRanges(
  parent: Node,
  out: VbaFoldingRange[],
): void {
  // Scan children at this level for comment runs, then recurse into
  // statement_block children to catch comments inside Sub/Function bodies.
  let runStart = -1;
  let runEnd = -1;

  for (let i = 0; i < parent.childCount; i++) {
    const child = parent.child(i)!;
    if (child.type === "comment") {
      const line = child.startPosition.row;
      if (runStart < 0) {
        runStart = line;
        runEnd = line;
      } else if (line === runEnd + 1) {
        runEnd = line;
      } else {
        if (runEnd > runStart) {
          out.push({ startLine: runStart, endLine: runEnd, kind: "comment" });
        }
        runStart = line;
        runEnd = line;
      }
    } else {
      if (runStart >= 0 && runEnd > runStart) {
        out.push({ startLine: runStart, endLine: runEnd, kind: "comment" });
      }
      runStart = -1;
      runEnd = -1;

      // Recurse into statement_block children
      if (child.type === "statement_block") {
        collectCommentRanges(child, out);
      }
    }
  }
  // Flush trailing run
  if (runStart >= 0 && runEnd > runStart) {
    out.push({ startLine: runStart, endLine: runEnd, kind: "comment" });
  }
}

// ── Folding range Monaco provider ───────────────────────────────

export function createVbaFoldingRangeProvider(
  language: Language,
): languages.FoldingRangeProvider {
  let cached: { parser: Parser } | null = null;

  return {
    provideFoldingRanges(model) {
      if (!cached) {
        const parser = new Parser();
        parser.setLanguage(language);
        cached = { parser };
      }

      const tree = cached.parser.parse(model.getValue());
      if (!tree) return [];

      try {
        const ranges = computeFoldingRanges(tree.rootNode);
        return ranges.map((r) => ({
          start: r.startLine + 1,
          end: r.endLine + 1,
          kind: r.kind === "comment"
            ? (1 as import("monaco-editor").languages.FoldingRangeKind) // Comment
            : undefined,
        }));
      } finally {
        tree.delete();
      }
    },
  };
}

// ── Semantic tokens provider ────────────────────────────────────

export function createVbaSemanticTokensProvider(
  language: Language
): languages.DocumentSemanticTokensProvider {
  // Lazy init so the factory remains callable with placeholder Languages
  // (used by Sprint 31.C's getLegend unit test). Parser/Query construction
  // happens on the first provideDocumentSemanticTokens call. Returning the
  // cached pair (instead of mutating outer nullable bindings) keeps type
  // narrowing intact at the call site — Sprint 15 bypass-arc invariant
  // (`!\.` → 0 hits) holds without non-null assertions.
  let cached: { parser: Parser; query: Query } | null = null;
  function getParserAndQuery(): { parser: Parser; query: Query } {
    if (cached) return cached;
    const parser = new Parser();
    parser.setLanguage(language);
    const query = new Query(language, HIGHLIGHTS_QUERY);
    cached = { parser, query };
    return cached;
  }

  return {
    getLegend: () => vbaSemanticTokensLegend,
    provideDocumentSemanticTokens: (model) => {
      const { parser, query } = getParserAndQuery();
      const source = model.getValue();
      const tree = parser.parse(source);
      if (!tree) return null;
      try {
        const captures = query.captures(tree.rootNode);
        const data = encodeCapturesAsSemanticTokens(captures);
        return { data };
      } finally {
        tree.delete();
      }
    },
    releaseDocumentSemanticTokens: () => {
      /* no-op: we own no per-result state */
    },
  };
}
