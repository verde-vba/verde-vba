// Sprint 32.H — Golden-string tests for LSP ↔ Monaco converters + providers.
//
// Converter tests pin exact numeric mappings (position offsets, enum values)
// so accidental changes surface immediately. Provider tests verify that
// registerLspProviders wires the completion/hover/diagnostics pipeline
// through the connection correctly.

import { describe, it, expect, vi } from "vitest";
import {
  toLspPosition,
  toMonacoRange,
  toMonacoCompletionItemKind,
  toMonacoCompletionItem,
  toMonacoHover,
  toMonacoMarkerSeverity,
  toMonacoMarker,
  toMonacoDefinition,
  toMonacoWorkspaceEdit,
  toMonacoSymbolKind,
  toMonacoDocumentHighlightKind,
  toMonacoSignatureHelp,
  toMonacoDocumentHighlight,
  toMonacoDocumentSymbol,
  toMonacoInlayHint,
  registerLspProviders,
} from "./lsp-monaco-providers";

// ── Position / Range converters ──────────────────────────────────

describe("toLspPosition", () => {
  it("converts Monaco 1-based {lineNumber,column} to LSP 0-based {line,character}", () => {
    expect(toLspPosition({ lineNumber: 1, column: 1 })).toEqual({
      line: 0,
      character: 0,
    });
    expect(toLspPosition({ lineNumber: 10, column: 5 })).toEqual({
      line: 9,
      character: 4,
    });
  });
});

describe("toMonacoRange", () => {
  it("converts LSP 0-based range to Monaco 1-based IRange", () => {
    expect(
      toMonacoRange({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 5 },
      }),
    ).toEqual({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 6,
    });
  });

  it("handles multi-line range", () => {
    expect(
      toMonacoRange({
        start: { line: 3, character: 4 },
        end: { line: 7, character: 12 },
      }),
    ).toEqual({
      startLineNumber: 4,
      startColumn: 5,
      endLineNumber: 8,
      endColumn: 13,
    });
  });
});

// ── CompletionItemKind mapping ───────────────────────────────────

describe("toMonacoCompletionItemKind", () => {
  it.each([
    [1, 18],  // Text
    [2, 0],   // Method
    [3, 1],   // Function
    [4, 2],   // Constructor
    [5, 3],   // Field
    [6, 4],   // Variable
    [7, 5],   // Class
    [13, 15], // Enum
    [14, 17], // Keyword
    [15, 28], // Snippet
    [21, 14], // Constant
    [25, 24], // TypeParameter
  ])("maps LSP kind %i to Monaco kind %i", (lsp, monaco) => {
    expect(toMonacoCompletionItemKind(lsp)).toBe(monaco);
  });

  it("defaults to Text (18) for undefined kind", () => {
    expect(toMonacoCompletionItemKind(undefined)).toBe(18);
  });

  it("defaults to Text (18) for unknown kind", () => {
    expect(toMonacoCompletionItemKind(999)).toBe(18);
  });
});

// ── CompletionItem converter ─────────────────────────────────────

describe("toMonacoCompletionItem", () => {
  const RANGE = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 7 };

  it("converts a golden LSP CompletionItem with string documentation", () => {
    const result = toMonacoCompletionItem(
      {
        label: "MsgBox",
        kind: 3, // Function
        detail: "Sub MsgBox(Prompt, ...)",
        documentation: "Displays a message box.",
        insertText: "MsgBox ",
      },
      RANGE,
    );

    expect(result).toEqual({
      label: "MsgBox",
      kind: 1, // Monaco Function
      detail: "Sub MsgBox(Prompt, ...)",
      documentation: "Displays a message box.",
      insertText: "MsgBox ",
      filterText: undefined,
      sortText: undefined,
      range: RANGE,
    });
  });

  it("converts a golden LSP CompletionItem with MarkupContent documentation", () => {
    const result = toMonacoCompletionItem(
      {
        label: "Dim",
        kind: 14, // Keyword
        documentation: { kind: "markdown", value: "Declares a variable." },
      },
      RANGE,
    );

    expect(result).toEqual({
      label: "Dim",
      kind: 17, // Monaco Keyword
      detail: undefined,
      documentation: { value: "Declares a variable." },
      insertText: "Dim", // falls back to label
      filterText: undefined,
      sortText: undefined,
      range: RANGE,
    });
  });

  it("falls back to label when insertText is missing", () => {
    const result = toMonacoCompletionItem({ label: "End Sub" }, RANGE);
    expect(result.insertText).toBe("End Sub");
  });
});

// ── Hover converter ──────────────────────────────────────────────

describe("toMonacoHover", () => {
  it("converts a golden LSP Hover with MarkupContent", () => {
    const result = toMonacoHover({
      contents: { kind: "markdown", value: "```vba\nSub MySub()\n```\nA subroutine." },
      range: { start: { line: 10, character: 0 }, end: { line: 10, character: 8 } },
    });

    expect(result).toEqual({
      contents: [{ value: "```vba\nSub MySub()\n```\nA subroutine." }],
      range: { startLineNumber: 11, startColumn: 1, endLineNumber: 11, endColumn: 9 },
    });
  });

  it("converts a string contents", () => {
    const result = toMonacoHover({ contents: "Plain hover text" });
    expect(result.contents).toEqual([{ value: "Plain hover text" }]);
    expect(result.range).toBeUndefined();
  });

  it("converts an array of mixed contents", () => {
    const result = toMonacoHover({
      contents: [
        "First line",
        { kind: "markdown", value: "**bold**" },
      ],
    });
    expect(result.contents).toEqual([
      { value: "First line" },
      { value: "**bold**" },
    ]);
  });
});

// ── Diagnostic / MarkerSeverity converter ────────────────────────

describe("toMonacoMarkerSeverity", () => {
  it.each([
    [1, 8], // Error
    [2, 4], // Warning
    [3, 2], // Information → Info
    [4, 1], // Hint
  ])("maps LSP severity %i to Monaco severity %i", (lsp, monaco) => {
    expect(toMonacoMarkerSeverity(lsp)).toBe(monaco);
  });

  it("defaults to Info (2) for undefined severity", () => {
    expect(toMonacoMarkerSeverity(undefined)).toBe(2);
  });
});

describe("toMonacoMarker", () => {
  it("converts a golden LSP Diagnostic to Monaco IMarkerData", () => {
    const result = toMonacoMarker({
      range: { start: { line: 3, character: 0 }, end: { line: 3, character: 12 } },
      severity: 1,
      source: "verde-lsp",
      message: "Variable 'x' is not declared",
      code: 1001,
    });

    expect(result).toEqual({
      severity: 8, // Monaco Error
      message: "Variable 'x' is not declared",
      startLineNumber: 4,
      startColumn: 1,
      endLineNumber: 4,
      endColumn: 13,
      source: "verde-lsp",
      code: "1001",
    });
  });

  it("handles diagnostic without optional fields", () => {
    const result = toMonacoMarker({
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
      message: "Something is wrong",
    });

    expect(result).toEqual({
      severity: 2, // Info default
      message: "Something is wrong",
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 6,
      source: undefined,
      code: undefined,
    });
  });
});

// ── Definition converter ────────────────────────────────────────

describe("toMonacoDefinition", () => {
  it("converts a single LSP Location to Monaco definition array", () => {
    const result = toMonacoDefinition({
      uri: "file:///C:/project/Module1.bas",
      range: { start: { line: 5, character: 4 }, end: { line: 5, character: 10 } },
    });

    expect(result).toEqual([
      {
        uri: "file:///C:/project/Module1.bas",
        range: {
          startLineNumber: 6,
          startColumn: 5,
          endLineNumber: 6,
          endColumn: 11,
        },
      },
    ]);
  });

  it("converts an array of LSP Locations", () => {
    const result = toMonacoDefinition([
      {
        uri: "file:///C:/project/Module1.bas",
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
      },
      {
        uri: "file:///C:/project/Module2.bas",
        range: { start: { line: 10, character: 2 }, end: { line: 10, character: 8 } },
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      uri: "file:///C:/project/Module1.bas",
      range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 6 },
    });
    expect(result[1]).toEqual({
      uri: "file:///C:/project/Module2.bas",
      range: { startLineNumber: 11, startColumn: 3, endLineNumber: 11, endColumn: 9 },
    });
  });

  it("returns empty array for null", () => {
    expect(toMonacoDefinition(null)).toEqual([]);
  });
});

// ── WorkspaceEdit converter ─────────────────────────────────────

describe("toMonacoWorkspaceEdit", () => {
  it("converts LSP WorkspaceEdit with single-file changes", () => {
    const result = toMonacoWorkspaceEdit({
      changes: {
        "file:///C:/project/Module1.bas": [
          {
            range: { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } },
            newText: "newName",
          },
          {
            range: { start: { line: 8, character: 0 }, end: { line: 8, character: 6 } },
            newText: "newName",
          },
        ],
      },
    });

    expect(result.edits).toHaveLength(2);
    expect(result.edits[0]).toEqual({
      resource: "file:///C:/project/Module1.bas",
      textEdit: {
        range: { startLineNumber: 3, startColumn: 5, endLineNumber: 3, endColumn: 11 },
        text: "newName",
      },
      versionId: undefined,
    });
    expect(result.edits[1]).toEqual({
      resource: "file:///C:/project/Module1.bas",
      textEdit: {
        range: { startLineNumber: 9, startColumn: 1, endLineNumber: 9, endColumn: 7 },
        text: "newName",
      },
      versionId: undefined,
    });
  });

  it("converts LSP WorkspaceEdit spanning multiple files", () => {
    const result = toMonacoWorkspaceEdit({
      changes: {
        "file:///C:/project/Module1.bas": [
          {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
            newText: "bar",
          },
        ],
        "file:///C:/project/Module2.bas": [
          {
            range: { start: { line: 5, character: 4 }, end: { line: 5, character: 7 } },
            newText: "bar",
          },
        ],
      },
    });

    expect(result.edits).toHaveLength(2);
    const uris = result.edits.map((e: { resource: string }) => e.resource);
    expect(uris).toContain("file:///C:/project/Module1.bas");
    expect(uris).toContain("file:///C:/project/Module2.bas");
  });

  it("returns empty edits for empty changes", () => {
    expect(toMonacoWorkspaceEdit({ changes: {} })).toEqual({ edits: [] });
  });
});

// ── SymbolKind mapping ──────────────────────────────────────────

describe("toMonacoSymbolKind", () => {
  it.each([
    [1, 0],   // File
    [2, 1],   // Module
    [5, 4],   // Class
    [6, 5],   // Method
    [12, 11], // Function
    [13, 12], // Variable
    [14, 13], // Constant
    [26, 25], // TypeParameter
  ])("maps LSP SymbolKind %i to Monaco %i (offset -1)", (lsp, monaco) => {
    expect(toMonacoSymbolKind(lsp)).toBe(monaco);
  });
});

// ── DocumentHighlightKind mapping ───────────────────────────────

describe("toMonacoDocumentHighlightKind", () => {
  it.each([
    [1, 0], // Text
    [2, 1], // Read
    [3, 2], // Write
  ])("maps LSP kind %i to Monaco kind %i", (lsp, monaco) => {
    expect(toMonacoDocumentHighlightKind(lsp)).toBe(monaco);
  });

  it("defaults to Text (0) for undefined kind", () => {
    expect(toMonacoDocumentHighlightKind(undefined)).toBe(0);
  });
});

// ── SignatureHelp converter ─────────────────────────────────────

describe("toMonacoSignatureHelp", () => {
  it("converts a golden LSP SignatureHelp", () => {
    const result = toMonacoSignatureHelp({
      signatures: [
        {
          label: "MsgBox(Prompt, [Buttons], [Title])",
          documentation: { kind: "markdown", value: "Displays a message box." },
          parameters: [
            { label: [7, 13], documentation: "The message to display." },
            { label: [16, 25], documentation: { kind: "markdown", value: "Button style." } },
            { label: [28, 33] },
          ],
        },
      ],
      activeSignature: 0,
      activeParameter: 1,
    });

    expect(result.value.signatures).toHaveLength(1);
    expect(result.value.signatures[0].label).toBe("MsgBox(Prompt, [Buttons], [Title])");
    expect(result.value.signatures[0].documentation).toEqual({ value: "Displays a message box." });
    expect(result.value.signatures[0].parameters).toHaveLength(3);
    expect(result.value.signatures[0].parameters[0].documentation).toBe("The message to display.");
    expect(result.value.signatures[0].parameters[1].documentation).toEqual({ value: "Button style." });
    expect(result.value.signatures[0].parameters[2].documentation).toBeUndefined();
    expect(result.value.activeSignature).toBe(0);
    expect(result.value.activeParameter).toBe(1);
    expect(typeof result.dispose).toBe("function");
  });

  it("defaults activeSignature and activeParameter to 0", () => {
    const result = toMonacoSignatureHelp({ signatures: [] });
    expect(result.value.activeSignature).toBe(0);
    expect(result.value.activeParameter).toBe(0);
  });
});

// ── DocumentHighlight converter ─────────────────────────────────

describe("toMonacoDocumentHighlight", () => {
  it("converts range and kind", () => {
    const result = toMonacoDocumentHighlight({
      range: { start: { line: 5, character: 4 }, end: { line: 5, character: 10 } },
      kind: 3, // Write
    });
    expect(result).toEqual({
      range: { startLineNumber: 6, startColumn: 5, endLineNumber: 6, endColumn: 11 },
      kind: 2, // Monaco Write
    });
  });
});

// ── DocumentSymbol converter ────────────────────────────────────

describe("toMonacoDocumentSymbol", () => {
  it("converts a flat symbol", () => {
    const result = toMonacoDocumentSymbol({
      name: "CalculateTotal",
      detail: "Sub",
      kind: 6, // Method
      range: { start: { line: 0, character: 0 }, end: { line: 10, character: 7 } },
      selectionRange: { start: { line: 0, character: 4 }, end: { line: 0, character: 18 } },
    });

    expect(result).toEqual({
      name: "CalculateTotal",
      detail: "Sub",
      kind: 5, // Monaco Method
      tags: [],
      range: { startLineNumber: 1, startColumn: 1, endLineNumber: 11, endColumn: 8 },
      selectionRange: { startLineNumber: 1, startColumn: 5, endLineNumber: 1, endColumn: 19 },
      children: undefined,
    });
  });

  it("recursively converts children", () => {
    const result = toMonacoDocumentSymbol({
      name: "Module1",
      kind: 2, // Module
      range: { start: { line: 0, character: 0 }, end: { line: 20, character: 0 } },
      selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 7 } },
      children: [
        {
          name: "MySub",
          kind: 6,
          range: { start: { line: 2, character: 0 }, end: { line: 5, character: 7 } },
          selectionRange: { start: { line: 2, character: 4 }, end: { line: 2, character: 9 } },
        },
      ],
    });

    expect(result.kind).toBe(1); // Monaco Module
    expect(result.detail).toBe(""); // Missing detail defaults to ""
    expect(result.children).toHaveLength(1);
    expect(result.children![0].name).toBe("MySub");
    expect(result.children![0].kind).toBe(5); // Monaco Method
  });
});

// ── InlayHint converter ─────────────────────────────────────────

describe("toMonacoInlayHint", () => {
  it("converts a string label hint", () => {
    const result = toMonacoInlayHint({
      position: { line: 3, character: 10 },
      label: ": Long",
      kind: 1, // Type
      paddingLeft: true,
    });

    expect(result).toEqual({
      label: ": Long",
      position: { lineNumber: 4, column: 11 },
      kind: 1, // Same enum
      paddingLeft: true,
      paddingRight: undefined,
    });
  });

  it("joins array label parts into a string", () => {
    const result = toMonacoInlayHint({
      position: { line: 0, character: 5 },
      label: [{ value: "param" }, { value: ": " }, { value: "String" }],
      kind: 2, // Parameter
    });

    expect(result.label).toBe("param: String");
  });
});

// ── registerLspProviders ─────────────────────────────────────────

describe("registerLspProviders", () => {
  function makeMockMonaco() {
    const registeredProviders: Record<string, unknown> = {};
    return {
      languages: {
        registerCompletionItemProvider: vi.fn(
          (_lang: string, provider: unknown) => {
            registeredProviders.completion = provider;
            return { dispose: vi.fn() };
          },
        ),
        registerHoverProvider: vi.fn((_lang: string, provider: unknown) => {
          registeredProviders.hover = provider;
          return { dispose: vi.fn() };
        }),
        registerDefinitionProvider: vi.fn((_lang: string, provider: unknown) => {
          registeredProviders.definition = provider;
          return { dispose: vi.fn() };
        }),
        registerRenameProvider: vi.fn((_lang: string, provider: unknown) => {
          registeredProviders.rename = provider;
          return { dispose: vi.fn() };
        }),
        registerSignatureHelpProvider: vi.fn((_lang: string, provider: unknown) => {
          registeredProviders.signatureHelp = provider;
          return { dispose: vi.fn() };
        }),
        registerReferenceProvider: vi.fn((_lang: string, provider: unknown) => {
          registeredProviders.references = provider;
          return { dispose: vi.fn() };
        }),
        registerDocumentSymbolProvider: vi.fn((_lang: string, provider: unknown) => {
          registeredProviders.documentSymbol = provider;
          return { dispose: vi.fn() };
        }),
        registerDocumentHighlightProvider: vi.fn((_lang: string, provider: unknown) => {
          registeredProviders.documentHighlight = provider;
          return { dispose: vi.fn() };
        }),
        registerCodeActionProvider: vi.fn((_lang: string, provider: unknown) => {
          registeredProviders.codeAction = provider;
          return { dispose: vi.fn() };
        }),
        registerDocumentFormattingEditProvider: vi.fn((_lang: string, provider: unknown) => {
          registeredProviders.formatting = provider;
          return { dispose: vi.fn() };
        }),
        registerInlayHintsProvider: vi.fn((_lang: string, provider: unknown) => {
          registeredProviders.inlayHints = provider;
          return { dispose: vi.fn() };
        }),
      },
      editor: {
        getModels: vi.fn(() => []),
        setModelMarkers: vi.fn(),
      },
      Uri: {
        parse: vi.fn((uri: string) => ({ toString: () => uri })),
      },
    } as unknown as typeof import("monaco-editor");
  }

  function makeMockConnection() {
    return {
      sendRequest: vi.fn(async () => null),
      onNotification: vi.fn(() => ({ dispose: vi.fn() })),
    } as unknown as import("vscode-jsonrpc").MessageConnection;
  }

  it("registers all 12 providers (completion, hover, definition, rename, signatureHelp, references, documentSymbol, documentHighlight, codeAction, formatting, inlayHints, diagnostics)", () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();

    const disposables = registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: (uri) => uri,
    });

    expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalled();
    expect(monaco.languages.registerHoverProvider).toHaveBeenCalled();
    expect(monaco.languages.registerDefinitionProvider).toHaveBeenCalled();
    expect(monaco.languages.registerRenameProvider).toHaveBeenCalled();
    expect(monaco.languages.registerSignatureHelpProvider).toHaveBeenCalled();
    expect(monaco.languages.registerReferenceProvider).toHaveBeenCalled();
    expect(monaco.languages.registerDocumentSymbolProvider).toHaveBeenCalled();
    expect(monaco.languages.registerDocumentHighlightProvider).toHaveBeenCalled();
    expect(monaco.languages.registerCodeActionProvider).toHaveBeenCalled();
    expect(monaco.languages.registerDocumentFormattingEditProvider).toHaveBeenCalled();
    expect(monaco.languages.registerInlayHintsProvider).toHaveBeenCalled();
    expect(connection.onNotification).toHaveBeenCalledWith(
      "textDocument/publishDiagnostics",
      expect.any(Function),
    );
    expect(disposables.length).toBe(12);
  });

  it("completion provider sends textDocument/completion with correct params", async () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();
    (connection.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      isIncomplete: false,
      items: [{ label: "MsgBox", kind: 3, insertText: "MsgBox " }],
    });

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    // Extract the registered provider.
    const call = (
      monaco.languages.registerCompletionItemProvider as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const provider = call[1] as {
      provideCompletionItems: (
        model: unknown,
        position: { lineNumber: number; column: number },
      ) => Promise<{ suggestions: unknown[] }>;
    };

    const mockModel = {
      uri: { toString: () => "Module1.bas" },
      getWordUntilPosition: () => ({ startColumn: 1, endColumn: 7, word: "MsgBox" }),
    };

    const result = await provider.provideCompletionItems(
      mockModel,
      { lineNumber: 6, column: 11 },
    );

    expect(connection.sendRequest).toHaveBeenCalledWith(
      "textDocument/completion",
      {
        textDocument: { uri: "file:///C:/project/Module1.bas" },
        position: { line: 5, character: 10 },
      },
    );
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({
      label: "MsgBox",
      kind: 1, // Monaco Function
      insertText: "MsgBox ",
    });
  });

  it("hover provider sends textDocument/hover and converts response", async () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();
    (connection.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      contents: { kind: "markdown", value: "```vba\nSub Foo()\n```" },
      range: { start: { line: 5, character: 0 }, end: { line: 5, character: 3 } },
    });

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    const call = (
      monaco.languages.registerHoverProvider as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const provider = call[1] as {
      provideHover: (
        model: unknown,
        position: { lineNumber: number; column: number },
      ) => Promise<{ contents: unknown[]; range?: unknown } | null>;
    };

    const mockModel = { uri: { toString: () => "Module1.bas" } };
    const result = await provider.provideHover(mockModel, { lineNumber: 6, column: 2 });

    expect(connection.sendRequest).toHaveBeenCalledWith("textDocument/hover", {
      textDocument: { uri: "file:///C:/project/Module1.bas" },
      position: { line: 5, character: 1 },
    });
    expect(result).toMatchObject({
      contents: [{ value: "```vba\nSub Foo()\n```" }],
      range: { startLineNumber: 6, startColumn: 1, endLineNumber: 6, endColumn: 4 },
    });
  });

  it("definition provider sends textDocument/definition and converts response", async () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();
    (connection.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      uri: "file:///C:/project/Module1.bas",
      range: { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } },
    });

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    const call = (
      monaco.languages.registerDefinitionProvider as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const provider = call[1] as {
      provideDefinition: (
        model: unknown,
        position: { lineNumber: number; column: number },
      ) => Promise<unknown[] | null>;
    };

    const mockModel = { uri: { toString: () => "Module1.bas" } };
    const result = await provider.provideDefinition(mockModel, { lineNumber: 6, column: 2 });

    expect(connection.sendRequest).toHaveBeenCalledWith("textDocument/definition", {
      textDocument: { uri: "file:///C:/project/Module1.bas" },
      position: { line: 5, character: 1 },
    });
    expect(result).toEqual([
      {
        uri: expect.objectContaining({ toString: expect.any(Function) }),
        range: { startLineNumber: 3, startColumn: 5, endLineNumber: 3, endColumn: 11 },
      },
    ]);
  });

  it("rename provider sends textDocument/rename and converts workspace edit", async () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();
    (connection.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      changes: {
        "file:///C:/project/Module1.bas": [
          {
            range: { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } },
            newText: "newName",
          },
        ],
      },
    });

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    const call = (
      monaco.languages.registerRenameProvider as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const provider = call[1] as {
      provideRenameEdits: (
        model: unknown,
        position: { lineNumber: number; column: number },
        newName: string,
      ) => Promise<{ edits: unknown[] } | null>;
    };

    const mockModel = { uri: { toString: () => "Module1.bas" } };
    const result = await provider.provideRenameEdits(
      mockModel,
      { lineNumber: 3, column: 5 },
      "newName",
    );

    expect(connection.sendRequest).toHaveBeenCalledWith("textDocument/rename", {
      textDocument: { uri: "file:///C:/project/Module1.bas" },
      position: { line: 2, character: 4 },
      newName: "newName",
    });
    expect(result).toBeTruthy();
    expect(result!.edits).toHaveLength(1);
    expect(result!.edits[0]).toMatchObject({
      resource: expect.objectContaining({ toString: expect.any(Function) }),
      textEdit: {
        range: { startLineNumber: 3, startColumn: 5, endLineNumber: 3, endColumn: 11 },
        text: "newName",
      },
    });
  });

  it("rename resolveRenameLocation sends textDocument/prepareRename", async () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();
    (connection.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      range: { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } },
      placeholder: "oldName",
    });

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    const call = (
      monaco.languages.registerRenameProvider as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const provider = call[1] as {
      resolveRenameLocation: (
        model: unknown,
        position: { lineNumber: number; column: number },
      ) => Promise<{ range: unknown; text: string } | null>;
    };

    const mockModel = { uri: { toString: () => "Module1.bas" } };
    const result = await provider.resolveRenameLocation(
      mockModel,
      { lineNumber: 3, column: 5 },
    );

    expect(connection.sendRequest).toHaveBeenCalledWith("textDocument/prepareRename", {
      textDocument: { uri: "file:///C:/project/Module1.bas" },
      position: { line: 2, character: 4 },
    });
    expect(result).toEqual({
      range: { startLineNumber: 3, startColumn: 5, endLineNumber: 3, endColumn: 11 },
      text: "oldName",
    });
  });

  it("signatureHelp provider sends textDocument/signatureHelp", async () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();
    (connection.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      signatures: [
        {
          label: "MsgBox(Prompt)",
          parameters: [{ label: [7, 13] }],
        },
      ],
      activeSignature: 0,
      activeParameter: 0,
    });

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    const call = (
      monaco.languages.registerSignatureHelpProvider as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const provider = call[1] as {
      provideSignatureHelp: (
        model: unknown,
        position: { lineNumber: number; column: number },
      ) => Promise<unknown>;
    };

    const mockModel = { uri: { toString: () => "Module1.bas" } };
    const result = await provider.provideSignatureHelp(
      mockModel,
      { lineNumber: 3, column: 8 },
    ) as { value: { signatures: unknown[] } };

    expect(connection.sendRequest).toHaveBeenCalledWith("textDocument/signatureHelp", {
      textDocument: { uri: "file:///C:/project/Module1.bas" },
      position: { line: 2, character: 7 },
    });
    expect(result.value.signatures).toHaveLength(1);
  });

  it("references provider sends textDocument/references", async () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();
    (connection.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        uri: "file:///C:/project/Module1.bas",
        range: { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } },
      },
      {
        uri: "file:///C:/project/Module2.bas",
        range: { start: { line: 8, character: 0 }, end: { line: 8, character: 6 } },
      },
    ]);

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    const call = (
      monaco.languages.registerReferenceProvider as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const provider = call[1] as {
      provideReferences: (
        model: unknown,
        position: { lineNumber: number; column: number },
      ) => Promise<unknown[]>;
    };

    const mockModel = { uri: { toString: () => "Module1.bas" } };
    const result = await provider.provideReferences(mockModel, { lineNumber: 3, column: 5 });

    expect(connection.sendRequest).toHaveBeenCalledWith("textDocument/references",
      expect.objectContaining({
        textDocument: { uri: "file:///C:/project/Module1.bas" },
        position: { line: 2, character: 4 },
      }),
    );
    expect(result).toHaveLength(2);
  });

  it("documentSymbol provider sends textDocument/documentSymbol", async () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();
    (connection.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        name: "MySub",
        kind: 6,
        range: { start: { line: 0, character: 0 }, end: { line: 5, character: 7 } },
        selectionRange: { start: { line: 0, character: 4 }, end: { line: 0, character: 9 } },
      },
    ]);

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    const call = (
      monaco.languages.registerDocumentSymbolProvider as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const provider = call[1] as {
      provideDocumentSymbols: (model: unknown) => Promise<unknown[]>;
    };

    const mockModel = { uri: { toString: () => "Module1.bas" } };
    const result = await provider.provideDocumentSymbols(mockModel);

    expect(connection.sendRequest).toHaveBeenCalledWith("textDocument/documentSymbol", {
      textDocument: { uri: "file:///C:/project/Module1.bas" },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: "MySub", kind: 5 });
  });

  it("documentHighlight provider sends textDocument/documentHighlight", async () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();
    (connection.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        range: { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } },
        kind: 2, // Read
      },
      {
        range: { start: { line: 8, character: 4 }, end: { line: 8, character: 10 } },
        kind: 3, // Write
      },
    ]);

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    const call = (
      monaco.languages.registerDocumentHighlightProvider as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const provider = call[1] as {
      provideDocumentHighlights: (
        model: unknown,
        position: { lineNumber: number; column: number },
      ) => Promise<Array<{ kind: number }>>;
    };

    const mockModel = { uri: { toString: () => "Module1.bas" } };
    const result = await provider.provideDocumentHighlights(mockModel, { lineNumber: 3, column: 5 });

    expect(connection.sendRequest).toHaveBeenCalledWith("textDocument/documentHighlight", {
      textDocument: { uri: "file:///C:/project/Module1.bas" },
      position: { line: 2, character: 4 },
    });
    expect(result).toHaveLength(2);
    expect(result[0].kind).toBe(1); // Monaco Read
    expect(result[1].kind).toBe(2); // Monaco Write
  });

  it("codeAction provider sends textDocument/codeAction", async () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();
    (connection.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        title: "Add Option Explicit",
        kind: "quickfix",
        edit: {
          changes: {
            "file:///C:/project/Module1.bas": [
              {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                newText: "Option Explicit\n",
              },
            ],
          },
        },
      },
    ]);

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    const call = (
      monaco.languages.registerCodeActionProvider as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const provider = call[1] as {
      provideCodeActions: (
        model: unknown,
        range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number },
      ) => Promise<{ actions: Array<{ title: string }> }>;
    };

    const mockModel = { uri: { toString: () => "Module1.bas" } };
    const result = await provider.provideCodeActions(
      mockModel,
      { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
    );

    expect(connection.sendRequest).toHaveBeenCalledWith("textDocument/codeAction",
      expect.objectContaining({
        textDocument: { uri: "file:///C:/project/Module1.bas" },
      }),
    );
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].title).toBe("Add Option Explicit");
  });

  it("formatting provider sends textDocument/formatting", async () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();
    (connection.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
        newText: "    ",
      },
    ]);

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    const call = (
      monaco.languages.registerDocumentFormattingEditProvider as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const provider = call[1] as {
      provideDocumentFormattingEdits: (
        model: unknown,
        options: { tabSize: number; insertSpaces: boolean },
      ) => Promise<Array<{ range: unknown; text: string }>>;
    };

    const mockModel = { uri: { toString: () => "Module1.bas" } };
    const result = await provider.provideDocumentFormattingEdits(
      mockModel,
      { tabSize: 4, insertSpaces: true },
    );

    expect(connection.sendRequest).toHaveBeenCalledWith("textDocument/formatting", {
      textDocument: { uri: "file:///C:/project/Module1.bas" },
      options: { tabSize: 4, insertSpaces: true },
    });
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("    ");
  });

  it("inlayHints provider sends textDocument/inlayHint", async () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();
    (connection.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        position: { line: 3, character: 10 },
        label: ": Long",
        kind: 1,
        paddingLeft: true,
      },
    ]);

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    const call = (
      monaco.languages.registerInlayHintsProvider as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const provider = call[1] as {
      provideInlayHints: (
        model: unknown,
        range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number },
      ) => Promise<{ hints: Array<{ label: string; kind?: number }> }>;
    };

    const mockModel = { uri: { toString: () => "Module1.bas" } };
    const result = await provider.provideInlayHints(
      mockModel,
      { startLineNumber: 1, startColumn: 1, endLineNumber: 100, endColumn: 1 },
    );

    expect(connection.sendRequest).toHaveBeenCalledWith("textDocument/inlayHint",
      expect.objectContaining({
        textDocument: { uri: "file:///C:/project/Module1.bas" },
      }),
    );
    expect(result.hints).toHaveLength(1);
    expect(result.hints[0].label).toBe(": Long");
    expect(result.hints[0].kind).toBe(1);
  });

  it("diagnostics notification sets Monaco model markers", () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();

    const fakeModel = {
      uri: { toString: () => "Module1.bas" },
    };
    (monaco.editor.getModels as ReturnType<typeof vi.fn>).mockReturnValue([fakeModel]);

    registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: () => "file:///C:/project/Module1.bas",
    });

    // Extract the diagnostics handler.
    const diagCall = (connection.onNotification as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(diagCall[0]).toBe("textDocument/publishDiagnostics");
    const handler = diagCall[1] as (params: unknown) => void;

    handler({
      uri: "file:///C:/project/Module1.bas",
      diagnostics: [
        {
          range: { start: { line: 3, character: 0 }, end: { line: 3, character: 12 } },
          severity: 1,
          source: "verde-lsp",
          message: "Variable 'x' is not declared",
        },
      ],
    });

    expect(monaco.editor.setModelMarkers).toHaveBeenCalledWith(
      fakeModel,
      "verde-lsp",
      [
        expect.objectContaining({
          severity: 8, // Monaco Error
          message: "Variable 'x' is not declared",
          startLineNumber: 4,
          startColumn: 1,
        }),
      ],
    );
  });
});
