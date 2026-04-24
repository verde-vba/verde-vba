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
import { CancellationTokenSource } from "vscode-jsonrpc";

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
interface LspLocation {
  uri: string;
  range: LspRange;
}
interface LspTextEdit {
  range: LspRange;
  newText: string;
}
interface LspWorkspaceEdit {
  changes?: Record<string, LspTextEdit[]>;
}
interface LspPrepareRenameResult {
  range: LspRange;
  placeholder: string;
}
interface LspSignatureHelp {
  signatures: LspSignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}
interface LspSignatureInformation {
  label: string;
  documentation?: string | { kind: string; value: string };
  parameters?: LspParameterInformation[];
}
interface LspParameterInformation {
  label: string | [number, number];
  documentation?: string | { kind: string; value: string };
}
interface LspDocumentHighlight {
  range: LspRange;
  kind?: number;
}
interface LspDocumentSymbol {
  name: string;
  detail?: string;
  kind: number;
  range: LspRange;
  selectionRange: LspRange;
  children?: LspDocumentSymbol[];
}
interface LspCodeAction {
  title: string;
  kind?: string;
  edit?: LspWorkspaceEdit;
  isPreferred?: boolean;
}
interface LspInlayHint {
  position: LspPosition;
  label: string | Array<{ value: string }>;
  kind?: number;
  paddingLeft?: boolean;
  paddingRight?: boolean;
}

// ── Monaco type aliases ──────────────────────────────────────────
// Using `typeof import("monaco-editor")` as the Monaco namespace.

type Monaco = typeof import("monaco-editor");
type IDisposable = import("monaco-editor").IDisposable;
type IPosition = import("monaco-editor").IPosition;

// ── Request timeout helper ──────────────────────────────────────

/** Default timeout for LSP requests from Monaco providers (ms). */
const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Send an LSP request with a timeout. Returns `null` if the request
 * times out or is cancelled. Uses a CancellationTokenSource that fires
 * after `timeoutMs` and also respects Monaco's cancellation token (if
 * supplied) by racing against it.
 */
async function sendRequestWithTimeout<T>(
  connection: MessageConnection,
  method: string,
  params: unknown,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  monacoToken?: import("monaco-editor").CancellationToken,
): Promise<T | null> {
  const t0 = performance.now();
  console.log(`[LSP:provider] ▶ ${method}`, params);
  const cts = new CancellationTokenSource();
  const timer = setTimeout(() => cts.cancel(), timeoutMs);

  // If Monaco signals cancellation (e.g. cursor moved), cancel the LSP
  // request too.
  const monacoDisposable = monacoToken?.onCancellationRequested(() => cts.cancel());

  try {
    const result = await connection.sendRequest<T>(method, params, cts.token);
    const elapsed = (performance.now() - t0).toFixed(1);
    console.log(`[LSP:provider] ◀ ${method} OK (${elapsed}ms)`, result);
    return result;
  } catch (err) {
    const elapsed = (performance.now() - t0).toFixed(1);
    console.warn(`[LSP:provider] ✕ ${method} FAILED (${elapsed}ms)`, err);
    return null;
  } finally {
    clearTimeout(timer);
    monacoDisposable?.dispose();
    cts.dispose();
  }
}

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

// ── Definition converter ────────────────────────────────────────

/** LSP Location | Location[] | null → Monaco definition array. */
export function toMonacoDefinition(
  result: LspLocation | LspLocation[] | null,
): Array<{ uri: string; range: import("monaco-editor").IRange }> {
  if (!result) return [];
  const locations = Array.isArray(result) ? result : [result];
  return locations.map((loc) => ({
    uri: loc.uri,
    range: toMonacoRange(loc.range),
  }));
}

// ── WorkspaceEdit converter ─────────────────────────────────────

/** LSP WorkspaceEdit → Monaco-compatible workspace edit. */
export function toMonacoWorkspaceEdit(
  edit: LspWorkspaceEdit,
): {
  edits: Array<{
    resource: string;
    textEdit: { range: import("monaco-editor").IRange; text: string };
    versionId: undefined;
  }>;
} {
  const edits: Array<{
    resource: string;
    textEdit: { range: import("monaco-editor").IRange; text: string };
    versionId: undefined;
  }> = [];

  for (const [uri, textEdits] of Object.entries(edit.changes ?? {})) {
    for (const te of textEdits) {
      edits.push({
        resource: uri,
        textEdit: { range: toMonacoRange(te.range), text: te.newText },
        versionId: undefined,
      });
    }
  }

  return { edits };
}

// ── SymbolKind mapping ──────────────────────────────────────────
// LSP SymbolKind is 1-based; Monaco SymbolKind is 0-based.

export function toMonacoSymbolKind(lspKind: number): number {
  return lspKind - 1;
}

// ── DocumentHighlightKind mapping ───────────────────────────────
// LSP: 1=Text 2=Read 3=Write → Monaco: 0=Text 1=Read 2=Write

export function toMonacoDocumentHighlightKind(lspKind: number | undefined): number {
  if (lspKind === undefined) return 0; // Text
  return lspKind - 1;
}

// ── SignatureHelp converter ─────────────────────────────────────

function normalizeDocumentation(
  doc: string | { kind: string; value: string } | undefined,
): string | { value: string } | undefined {
  if (doc === undefined) return undefined;
  if (typeof doc === "string") return doc;
  return { value: doc.value };
}

export function toMonacoSignatureHelp(help: LspSignatureHelp): {
  value: {
    signatures: Array<{
      label: string;
      documentation?: string | { value: string };
      parameters: Array<{
        label: string | [number, number];
        documentation?: string | { value: string };
      }>;
    }>;
    activeSignature: number;
    activeParameter: number;
  };
  dispose(): void;
} {
  return {
    value: {
      signatures: help.signatures.map((sig) => ({
        label: sig.label,
        documentation: normalizeDocumentation(sig.documentation),
        parameters: (sig.parameters ?? []).map((p) => ({
          label: p.label,
          documentation: normalizeDocumentation(p.documentation),
        })),
      })),
      activeSignature: help.activeSignature ?? 0,
      activeParameter: help.activeParameter ?? 0,
    },
    dispose() {},
  };
}

// ── DocumentHighlight converter ─────────────────────────────────

export function toMonacoDocumentHighlight(highlight: LspDocumentHighlight): {
  range: import("monaco-editor").IRange;
  kind: number;
} {
  return {
    range: toMonacoRange(highlight.range),
    kind: toMonacoDocumentHighlightKind(highlight.kind),
  };
}

// ── DocumentSymbol converter ────────────────────────────────────

type MonacoDocumentSymbol = {
  name: string;
  detail: string;
  kind: number;
  tags: readonly never[];
  range: import("monaco-editor").IRange;
  selectionRange: import("monaco-editor").IRange;
  children?: MonacoDocumentSymbol[];
};

export function toMonacoDocumentSymbol(symbol: LspDocumentSymbol): MonacoDocumentSymbol {
  return {
    name: symbol.name,
    detail: symbol.detail ?? "",
    kind: toMonacoSymbolKind(symbol.kind),
    tags: [],
    range: toMonacoRange(symbol.range),
    selectionRange: toMonacoRange(symbol.selectionRange),
    children: symbol.children?.map(toMonacoDocumentSymbol),
  };
}

// ── InlayHint converter ─────────────────────────────────────────

export function toMonacoInlayHint(hint: LspInlayHint): {
  label: string;
  position: { lineNumber: number; column: number };
  kind?: number;
  paddingLeft?: boolean;
  paddingRight?: boolean;
} {
  const label = typeof hint.label === "string"
    ? hint.label
    : hint.label.map((p) => p.value).join("");
  return {
    label,
    position: {
      lineNumber: hint.position.line + 1,
      column: hint.position.character + 1,
    },
    kind: hint.kind,
    paddingLeft: hint.paddingLeft,
    paddingRight: hint.paddingRight,
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
  console.log(`[LSP:provider] registerLspProviders — languageId=${languageId}`);

  // ── Completion ──
  disposables.push(
    monaco.languages.registerCompletionItemProvider(languageId, {
      triggerCharacters: ["."],
      provideCompletionItems: async (model, position, _ctx, token) => {
        const docUri = resolveDocumentUri(model.uri.toString());
        const wordInfo = model.getWordUntilPosition(position);
        const replaceRange: import("monaco-editor").IRange = {
          startLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: wordInfo.endColumn,
        };

        const result = await sendRequestWithTimeout<
          LspCompletionList | LspCompletionItem[] | null
        >(connection, "textDocument/completion", {
          textDocument: { uri: docUri },
          position: toLspPosition(position),
        }, REQUEST_TIMEOUT_MS, token);

        if (!result) return { suggestions: [] };

        const items = Array.isArray(result) ? result : result.items;
        return {
          suggestions: items.map((item) =>
            toMonacoCompletionItem(item, replaceRange),
          ),
        };
      },
    }),
  );

  // ── Hover ──
  disposables.push(
    monaco.languages.registerHoverProvider(languageId, {
      provideHover: async (model, position, token) => {
        const docUri = resolveDocumentUri(model.uri.toString());

        const result = await sendRequestWithTimeout<LspHover | null>(
          connection, "textDocument/hover", {
            textDocument: { uri: docUri },
            position: toLspPosition(position),
          }, REQUEST_TIMEOUT_MS, token,
        );

        if (!result) return null;
        return toMonacoHover(result);
      },
    }),
  );

  // ── Definition ──
  disposables.push(
    monaco.languages.registerDefinitionProvider(languageId, {
      provideDefinition: async (model, position, token) => {
        const docUri = resolveDocumentUri(model.uri.toString());

        const result = await sendRequestWithTimeout<
          LspLocation | LspLocation[] | null
        >(connection, "textDocument/definition", {
          textDocument: { uri: docUri },
          position: toLspPosition(position),
        }, REQUEST_TIMEOUT_MS, token);

        if (!result) return [];
        const defs = toMonacoDefinition(result);
        return defs.map((d) => ({
          uri: monaco.Uri.parse(d.uri),
          range: d.range,
        }));
      },
    }),
  );

  // ── Rename ──
  disposables.push(
    monaco.languages.registerRenameProvider(languageId, {
      provideRenameEdits: async (model, position, newName, token) => {
        const docUri = resolveDocumentUri(model.uri.toString());

        const result = await sendRequestWithTimeout<LspWorkspaceEdit | null>(
          connection, "textDocument/rename", {
            textDocument: { uri: docUri },
            position: toLspPosition(position),
            newName,
          }, REQUEST_TIMEOUT_MS, token,
        );

        if (!result) return null;
        const wsEdit = toMonacoWorkspaceEdit(result);
        return {
          edits: wsEdit.edits.map((e) => ({
            ...e,
            resource: monaco.Uri.parse(e.resource),
          })),
        };
      },
      resolveRenameLocation: async (model, position, token) => {
        const docUri = resolveDocumentUri(model.uri.toString());

        const result = await sendRequestWithTimeout<LspPrepareRenameResult | null>(
          connection, "textDocument/prepareRename", {
            textDocument: { uri: docUri },
            position: toLspPosition(position),
          }, REQUEST_TIMEOUT_MS, token,
        );

        if (!result) return null;
        return {
          range: toMonacoRange(result.range),
          text: result.placeholder,
        };
      },
    }),
  );

  // ── Signature Help ──
  disposables.push(
    monaco.languages.registerSignatureHelpProvider(languageId, {
      signatureHelpTriggerCharacters: ["(", ","],
      provideSignatureHelp: async (model, position, token) => {
        const docUri = resolveDocumentUri(model.uri.toString());

        const result = await sendRequestWithTimeout<LspSignatureHelp | null>(
          connection, "textDocument/signatureHelp", {
            textDocument: { uri: docUri },
            position: toLspPosition(position),
          }, REQUEST_TIMEOUT_MS, token,
        );

        if (!result) return null;
        return toMonacoSignatureHelp(result);
      },
    }),
  );

  // ── References ──
  disposables.push(
    monaco.languages.registerReferenceProvider(languageId, {
      provideReferences: async (model, position, _ctx, token) => {
        const docUri = resolveDocumentUri(model.uri.toString());

        const result = await sendRequestWithTimeout<LspLocation[] | null>(
          connection, "textDocument/references", {
            textDocument: { uri: docUri },
            position: toLspPosition(position),
            context: { includeDeclaration: true },
          }, REQUEST_TIMEOUT_MS, token,
        );

        if (!result) return [];
        return result.map((loc) => ({
          uri: monaco.Uri.parse(loc.uri),
          range: toMonacoRange(loc.range),
        }));
      },
    }),
  );

  // ── Document Symbol ──
  disposables.push(
    monaco.languages.registerDocumentSymbolProvider(languageId, {
      provideDocumentSymbols: async (model, token) => {
        const docUri = resolveDocumentUri(model.uri.toString());

        const result = await sendRequestWithTimeout<LspDocumentSymbol[] | null>(
          connection, "textDocument/documentSymbol",
          { textDocument: { uri: docUri } },
          REQUEST_TIMEOUT_MS, token,
        );

        if (!result) return [];
        return result.map(toMonacoDocumentSymbol);
      },
    }),
  );

  // ── Document Highlight ──
  disposables.push(
    monaco.languages.registerDocumentHighlightProvider(languageId, {
      provideDocumentHighlights: async (model, position, token) => {
        const docUri = resolveDocumentUri(model.uri.toString());

        const result = await sendRequestWithTimeout<LspDocumentHighlight[] | null>(
          connection, "textDocument/documentHighlight", {
            textDocument: { uri: docUri },
            position: toLspPosition(position),
          }, REQUEST_TIMEOUT_MS, token,
        );

        if (!result) return [];
        return result.map(toMonacoDocumentHighlight);
      },
    }),
  );

  // ── Code Action ──
  disposables.push(
    monaco.languages.registerCodeActionProvider(languageId, {
      provideCodeActions: async (model, range, _ctx, token) => {
        const docUri = resolveDocumentUri(model.uri.toString());

        const result = await sendRequestWithTimeout<LspCodeAction[] | null>(
          connection, "textDocument/codeAction", {
            textDocument: { uri: docUri },
            range: {
              start: toLspPosition({
                lineNumber: range.startLineNumber,
                column: range.startColumn,
              }),
              end: toLspPosition({
                lineNumber: range.endLineNumber,
                column: range.endColumn,
              }),
            },
            context: { diagnostics: [] },
          }, REQUEST_TIMEOUT_MS, token,
        );

        if (!result) return { actions: [], dispose() {} };
        const actions = result.map((action) => ({
          title: action.title,
          kind: action.kind,
          isPreferred: action.isPreferred,
          edit: action.edit
            ? {
                edits: toMonacoWorkspaceEdit(action.edit).edits.map((e) => ({
                  ...e,
                  resource: monaco.Uri.parse(e.resource),
                })),
              }
            : undefined,
        }));
        return { actions, dispose() {} };
      },
    }),
  );

  // ── Document Formatting ──
  disposables.push(
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits: async (model, options, token) => {
        const docUri = resolveDocumentUri(model.uri.toString());

        const result = await sendRequestWithTimeout<LspTextEdit[] | null>(
          connection, "textDocument/formatting", {
            textDocument: { uri: docUri },
            options: {
              tabSize: options.tabSize,
              insertSpaces: options.insertSpaces,
            },
          }, REQUEST_TIMEOUT_MS, token,
        );

        if (!result) return [];
        return result.map((te) => ({
          range: toMonacoRange(te.range),
          text: te.newText,
        }));
      },
    }),
  );

  // ── Inlay Hints ──
  disposables.push(
    monaco.languages.registerInlayHintsProvider(languageId, {
      provideInlayHints: async (model, range, token) => {
        const docUri = resolveDocumentUri(model.uri.toString());

        const result = await sendRequestWithTimeout<LspInlayHint[] | null>(
          connection, "textDocument/inlayHint", {
            textDocument: { uri: docUri },
            range: {
              start: toLspPosition({
                lineNumber: range.startLineNumber,
                column: range.startColumn,
              }),
              end: toLspPosition({
                lineNumber: range.endLineNumber,
                column: range.endColumn,
              }),
            },
          }, REQUEST_TIMEOUT_MS, token,
        );

        if (!result) return { hints: [], dispose() {} };
        return {
          hints: result.map(toMonacoInlayHint),
          dispose() {},
        };
      },
    }),
  );

  // ── Diagnostics ──
  const diagDisposable = connection.onNotification(
    "textDocument/publishDiagnostics",
    (params: LspPublishDiagnosticsParams) => {
      console.log(`[LSP:provider] ◀ publishDiagnostics uri=${params.uri} count=${params.diagnostics.length}`, params.diagnostics);
      // Find Monaco models whose URI matches the diagnostic source.
      // In our 1-xlsm = 1-process model there is typically one model,
      // but we iterate defensively.
      const models = monaco.editor.getModels();
      console.log(`[LSP:provider] available models: ${models.map(m => m.uri.toString()).join(", ")}`);
      let matched = false;
      for (const model of models) {
        const modelLspUri = resolveDocumentUri(model.uri.toString());
        if (modelLspUri === params.uri) {
          console.log(`[LSP:provider] matched model ${model.uri.toString()} → setting ${params.diagnostics.length} markers`);
          monaco.editor.setModelMarkers(
            model,
            "verde-lsp",
            params.diagnostics.map(toMonacoMarker),
          );
          matched = true;
          break;
        }
      }
      if (!matched) {
        console.warn(`[LSP:provider] publishDiagnostics: no matching model for uri=${params.uri}`);
      }
    },
  );
  disposables.push({ dispose: () => diagDisposable.dispose() });

  console.log(`[LSP:provider] registered ${disposables.length} providers`);
  return disposables;
}
