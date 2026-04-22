// Sprint 32.H — LSP ↔ Monaco type converters + provider registration.
//
// Bridges the verde-lsp sidecar's JSON-RPC responses to Monaco's
// language feature APIs. Each converter is a pure function that maps
// between LSP (0-based positions, LSP-specific enums) and Monaco
// (1-based positions, Monaco enums) without side effects.
//
// `registerLspProviders` wires everything together: it registers
// completion, hover, and diagnostics providers on the Monaco language
// service and returns disposables for cleanup.

import type { MessageConnection } from "vscode-jsonrpc";

// ── LSP types (minimal, inline) ──────────────────────────────────
// We define only what we consume rather than importing from
// vscode-languageserver-protocol — keeps this module lightweight and
// avoids any transitive browser-shim issues.

interface LspPosition {
  line: number;
  character: number;
}
interface LspRange {
  start: LspPosition;
  end: LspPosition;
}
interface LspCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string | { kind: string; value: string };
  insertText?: string;
  filterText?: string;
  sortText?: string;
}
interface LspCompletionList {
  isIncomplete: boolean;
  items: LspCompletionItem[];
}
interface LspHover {
  contents: string | { kind: string; value: string } | Array<string | { kind: string; value: string }>;
  range?: LspRange;
}
interface LspDiagnostic {
  range: LspRange;
  severity?: number;
  code?: number | string;
  source?: string;
  message: string;
}
interface LspPublishDiagnosticsParams {
  uri: string;
  diagnostics: LspDiagnostic[];
}

// ── Monaco type aliases ──────────────────────────────────────────
// Using `typeof import("monaco-editor")` as the Monaco namespace.

type Monaco = typeof import("monaco-editor");
type IDisposable = import("monaco-editor").IDisposable;
type IPosition = import("monaco-editor").IPosition;

// ── Position / Range converters ──────────────────────────────────

/** Monaco 1-based position → LSP 0-based position. */
export function toLspPosition(pos: IPosition): LspPosition {
  return { line: pos.lineNumber - 1, character: pos.column - 1 };
}

/** LSP 0-based range → Monaco 1-based IRange. */
export function toMonacoRange(range: LspRange): import("monaco-editor").IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

// ── CompletionItemKind mapping ───────────────────────────────────
// LSP CompletionItemKind (1-based) → Monaco CompletionItemKind (0-based).
// Only values that differ between the two specs need explicit entries;
// the rest fall through to a default (Text = 18 in Monaco).

const LSP_TO_MONACO_COMPLETION_KIND: Record<number, number> = {
  1: 18,  // Text
  2: 0,   // Method
  3: 1,   // Function
  4: 2,   // Constructor
  5: 3,   // Field
  6: 4,   // Variable
  7: 5,   // Class
  8: 7,   // Interface
  9: 8,   // Module
  10: 9,  // Property
  11: 12, // Unit
  12: 13, // Value
  13: 15, // Enum
  14: 17, // Keyword
  15: 28, // Snippet
  16: 19, // Color
  17: 20, // File
  18: 21, // Reference
  19: 23, // Folder
  20: 16, // EnumMember
  21: 14, // Constant
  22: 6,  // Struct
  23: 10, // Event
  24: 11, // Operator
  25: 24, // TypeParameter
};

export function toMonacoCompletionItemKind(lspKind: number | undefined): number {
  if (lspKind === undefined) return 18; // Text
  return LSP_TO_MONACO_COMPLETION_KIND[lspKind] ?? 18;
}

// ── CompletionItem converter ─────────────────────────────────────

export function toMonacoCompletionItem(
  item: LspCompletionItem,
  range: import("monaco-editor").IRange,
): {
  label: string;
  kind: number;
  detail?: string;
  documentation?: string | { value: string };
  insertText: string;
  filterText?: string;
  sortText?: string;
  range: import("monaco-editor").IRange;
} {
  const documentation =
    typeof item.documentation === "string"
      ? item.documentation
      : item.documentation
        ? { value: item.documentation.value }
        : undefined;

  return {
    label: item.label,
    kind: toMonacoCompletionItemKind(item.kind),
    detail: item.detail,
    documentation,
    insertText: item.insertText ?? item.label,
    filterText: item.filterText,
    sortText: item.sortText,
    range,
  };
}

// ── Hover converter ──────────────────────────────────────────────

export function toMonacoHover(hover: LspHover): {
  contents: Array<{ value: string }>;
  range?: import("monaco-editor").IRange;
} {
  const contents = normalizeHoverContents(hover.contents);
  return {
    contents,
    range: hover.range ? toMonacoRange(hover.range) : undefined,
  };
}

function normalizeHoverContents(
  contents: LspHover["contents"],
): Array<{ value: string }> {
  if (typeof contents === "string") {
    return [{ value: contents }];
  }
  if (Array.isArray(contents)) {
    return contents.map((c) =>
      typeof c === "string" ? { value: c } : { value: c.value },
    );
  }
  // MarkupContent
  return [{ value: contents.value }];
}

// ── Diagnostic / MarkerSeverity converter ────────────────────────
// LSP DiagnosticSeverity: 1=Error 2=Warning 3=Information 4=Hint
// Monaco MarkerSeverity:  8=Error 4=Warning 2=Info          1=Hint

const LSP_TO_MONACO_SEVERITY: Record<number, number> = {
  1: 8, // Error
  2: 4, // Warning
  3: 2, // Information → Info
  4: 1, // Hint
};

export function toMonacoMarkerSeverity(lspSeverity: number | undefined): number {
  if (lspSeverity === undefined) return 2; // Info as default
  return LSP_TO_MONACO_SEVERITY[lspSeverity] ?? 2;
}

export function toMonacoMarker(diag: LspDiagnostic): {
  severity: number;
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  source?: string;
  code?: string;
} {
  const range = toMonacoRange(diag.range);
  return {
    severity: toMonacoMarkerSeverity(diag.severity),
    message: diag.message,
    startLineNumber: range.startLineNumber,
    startColumn: range.startColumn,
    endLineNumber: range.endLineNumber,
    endColumn: range.endColumn,
    source: diag.source,
    code: diag.code !== undefined ? String(diag.code) : undefined,
  };
}

// ── Provider registration ────────────────────────────────────────

export interface RegisterLspProvidersOptions {
  /** Resolves a Monaco model URI to the LSP document URI (file:// scheme). */
  resolveDocumentUri: (modelUri: string) => string;
}

/**
 * Register Monaco language providers that delegate to the LSP connection.
 *
 * Returns disposables that should be collected and disposed when the
 * connection is torn down (sidecar exit / unmount).
 */
export function registerLspProviders(
  monaco: Monaco,
  connection: MessageConnection,
  languageId: string,
  options: RegisterLspProvidersOptions,
): IDisposable[] {
  const { resolveDocumentUri } = options;
  const disposables: IDisposable[] = [];

  // ── Completion ──
  disposables.push(
    monaco.languages.registerCompletionItemProvider(languageId, {
      triggerCharacters: ["."],
      provideCompletionItems: async (model, position) => {
        const docUri = resolveDocumentUri(model.uri.toString());
        const wordInfo = model.getWordUntilPosition(position);
        const replaceRange: import("monaco-editor").IRange = {
          startLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: wordInfo.endColumn,
        };

        try {
          const result = await connection.sendRequest<
            LspCompletionList | LspCompletionItem[] | null
          >("textDocument/completion", {
            textDocument: { uri: docUri },
            position: toLspPosition(position),
          });

          if (!result) return { suggestions: [] };

          const items = Array.isArray(result) ? result : result.items;
          return {
            suggestions: items.map((item) =>
              toMonacoCompletionItem(item, replaceRange),
            ),
          };
        } catch {
          return { suggestions: [] };
        }
      },
    }),
  );

  // ── Hover ──
  disposables.push(
    monaco.languages.registerHoverProvider(languageId, {
      provideHover: async (model, position) => {
        const docUri = resolveDocumentUri(model.uri.toString());

        try {
          const result = await connection.sendRequest<LspHover | null>(
            "textDocument/hover",
            {
              textDocument: { uri: docUri },
              position: toLspPosition(position),
            },
          );

          if (!result) return null;
          return toMonacoHover(result);
        } catch {
          return null;
        }
      },
    }),
  );

  // ── Diagnostics ──
  const diagDisposable = connection.onNotification(
    "textDocument/publishDiagnostics",
    (params: LspPublishDiagnosticsParams) => {
      // Find Monaco models whose URI matches the diagnostic source.
      // In our 1-xlsm = 1-process model there is typically one model,
      // but we iterate defensively.
      for (const model of monaco.editor.getModels()) {
        const modelLspUri = resolveDocumentUri(model.uri.toString());
        if (modelLspUri === params.uri) {
          monaco.editor.setModelMarkers(
            model,
            "verde-lsp",
            params.diagnostics.map(toMonacoMarker),
          );
          break;
        }
      }
    },
  );
  disposables.push({ dispose: () => diagDisposable.dispose() });

  return disposables;
}
