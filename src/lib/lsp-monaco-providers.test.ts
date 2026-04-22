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
      },
      editor: {
        getModels: vi.fn(() => []),
        setModelMarkers: vi.fn(),
      },
    } as unknown as typeof import("monaco-editor");
  }

  function makeMockConnection() {
    return {
      sendRequest: vi.fn(async () => null),
      onNotification: vi.fn(() => ({ dispose: vi.fn() })),
    } as unknown as import("vscode-jsonrpc").MessageConnection;
  }

  it("registers completion, hover, and diagnostics providers", () => {
    const monaco = makeMockMonaco();
    const connection = makeMockConnection();

    const disposables = registerLspProviders(monaco, connection, "vba", {
      resolveDocumentUri: (uri) => uri,
    });

    expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
      "vba",
      expect.objectContaining({ provideCompletionItems: expect.any(Function) }),
    );
    expect(monaco.languages.registerHoverProvider).toHaveBeenCalledWith(
      "vba",
      expect.objectContaining({ provideHover: expect.any(Function) }),
    );
    expect(connection.onNotification).toHaveBeenCalledWith(
      "textDocument/publishDiagnostics",
      expect.any(Function),
    );
    expect(disposables.length).toBe(3);
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
