import MonacoEditor, { useMonaco } from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { editor } from "monaco-editor";
import { useTranslation } from "react-i18next";
import { registerVbaLanguage, VBA_LANGUAGE_ID } from "../lib/monaco-vba";
import { registerTreeSitterVbaProvider } from "../lib/tree-sitter-vba";
import { createTauriLspTransport } from "../lib/lsp-bridge";
import { useLspClient, pathToFileUri, type LspClientLoadError, type LspStatus } from "../hooks/useLspClient";

interface EditorProps {
  filename: string;
  content: string;
  theme: "light" | "dark";
  fontSize?: number;
  tabSize?: number;
  wordWrap?: "off" | "on" | "wordWrapColumn" | "bounded";
  minimap?: boolean;
  readOnly?: boolean;
  onSave?: (content: string) => void;
  onChange?: (content: string) => void;
  // Sprint 31.G: surfaced when tree-sitter-vba.wasm fails to load. Host
  // (App.tsx) is expected to render a Banner with the localized message.
  onTreeSitterLoadError?: (reason: "init-failed" | "wasm-load-failed") => void;
  // Sprint 32.G: surfaced when the verde-lsp sidecar fails to spawn,
  // exits, or rejects the initialize handshake. Kept as a separate prop
  // from `onTreeSitterLoadError` per Sprint 31 Execute 2 / 32 Planning
  // durable decision — each artifact has a distinct remediation message.
  onLspLoadError?: (reason: LspClientLoadError, detail?: string) => void;
  /// Called when the LSP lifecycle status changes so the host can reflect
  /// the state in the StatusBar.
  onLspStatusChange?: (status: LspStatus) => void;
  /// Absolute filesystem path to the project directory in AppData. Passed
  /// as `rootUri` in the LSP initialize request so verde-lsp can find VBA
  /// source files.
  projectDir?: string;
  /// Called when go-to-definition targets a different file. The host
  /// should switch to the target module's tab and optionally scroll to
  /// the given position.
  onNavigateToModule?: (filename: string, lineNumber?: number, column?: number) => void;
  /// Mutable ref holding the position to reveal after a cross-file
  /// navigation. The Editor consumes and clears it on mount.
  pendingRevealRef?: { current: { lineNumber: number; column: number } | null };
}

export function Editor({
  filename,
  content,
  theme,
  fontSize = 14,
  tabSize = 4,
  wordWrap = "off",
  minimap = true,
  readOnly = false,
  onSave,
  onChange,
  onTreeSitterLoadError,
  onLspLoadError,
  onLspStatusChange,
  projectDir,
  onNavigateToModule,
  pendingRevealRef,
}: EditorProps) {
  const { t } = useTranslation();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monaco = useMonaco();

  // Memoize transport + spawn so the useLspClient effect does not
  // re-run on every render (each render would otherwise unmount/remount
  // the LSP handshake). Stable identity matches the lazy-construction
  // contract characterized by lsp-bridge.test.ts.
  const lspTransport = useMemo(
    () => createTauriLspTransport({ invoke, listen }),
    [],
  );
  const lspSpawn = useMemo(
    () => () => invoke<void>("lsp_spawn"),
    [],
  );
  const { status: lspStatus, connection: lspConnection } = useLspClient({
    transport: lspTransport,
    spawn: lspSpawn,
    onError: onLspLoadError,
    projectDir,
    monaco,
  });

  // ── LSP document synchronization ──
  // didOpen when a file is activated (or connection becomes ready),
  // didClose when switching away or unmounting.
  const lspVersionRef = useRef(0);
  // Ref for lspConnection so the editor save action (registered once on
  // mount) always sees the latest connection without stale closures.
  const lspConnectionRef = useRef(lspConnection);
  lspConnectionRef.current = lspConnection;

  useEffect(() => {
    if (!lspConnection || !filename || !projectDir) return;

    const docUri = pathToFileUri(`${projectDir}/${filename}`);
    lspVersionRef.current = 1;

    void lspConnection.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri: docUri,
        languageId: "vba",
        version: lspVersionRef.current,
        text: content,
      },
    });

    return () => {
      try {
        lspConnection.sendNotification("textDocument/didClose", {
          textDocument: { uri: docUri },
        });
      } catch {
        // Connection may already be disposed during unmount — best-effort.
      }
    };
  }, [lspConnection, filename, projectDir]); // content intentionally excluded — didOpen captures it at open time

  useEffect(() => {
    onLspStatusChange?.(lspStatus);
  }, [lspStatus, onLspStatusChange]);

  // ── Cross-file navigation via go-to-definition ──
  // Standalone Monaco cannot open a different model in the editor by
  // default. We register an EditorOpener that intercepts the navigation
  // and delegates to the host's tab-switching logic.
  useEffect(() => {
    if (!monaco || !onNavigateToModule) return;

    const disposable = monaco.editor.registerEditorOpener({
      openCodeEditor(_source, resource, selectionOrPosition) {
        const parts = resource.path.split("/");
        const targetFilename = parts[parts.length - 1];
        if (!targetFilename) return false;

        let lineNumber: number | undefined;
        let column: number | undefined;
        if (selectionOrPosition) {
          if ("startLineNumber" in selectionOrPosition) {
            const r = selectionOrPosition as import("monaco-editor").IRange;
            lineNumber = r.startLineNumber;
            column = r.startColumn;
          } else {
            const p = selectionOrPosition as import("monaco-editor").IPosition;
            lineNumber = p.lineNumber;
            column = p.column;
          }
        }

        onNavigateToModule(targetFilename, lineNumber, column);
        return true;
      },
    });

    return () => disposable.dispose();
  }, [monaco, onNavigateToModule]);

  const handleBeforeMount = useCallback(
    (monaco: typeof import("monaco-editor")) => {
      registerVbaLanguage(monaco);
      // tree-sitter is the single tokenization source (Sprint 31.G).
      // On load failure, the host receives an error so it can render
      // a Banner directing the user to run `just fetch-wasm`.
      void registerTreeSitterVbaProvider(monaco, VBA_LANGUAGE_ID, {
        onError: (result) => onTreeSitterLoadError?.(result.reason),
      });
    },
    [onTreeSitterLoadError]
  );

  const handleMount = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      // Consume pending reveal position from cross-file navigation.
      const reveal = pendingRevealRef?.current;
      if (reveal) {
        pendingRevealRef.current = null;
        requestAnimationFrame(() => {
          editor.setPosition(reveal);
          editor.revealPositionInCenter(reveal);
        });
      }

      editor.addAction({
        id: "verde.save",
        label: t("editor.saveAction"),
        keybindings: [2048 | 49], // Ctrl+S
        run: () => {
          const value = editor.getValue();
          onSave?.(value);
          // didSave — notify the LSP server so it can re-analyze.
          const conn = lspConnectionRef.current;
          if (conn && filename && projectDir) {
            try {
              conn.sendNotification("textDocument/didSave", {
                textDocument: { uri: pathToFileUri(`${projectDir}/${filename}`) },
                text: value,
              });
            } catch {
              // Connection may be disposed during unmount — best-effort.
            }
          }
        },
      });
    },
    [onSave, t]
  );

  // Debounce didChange notifications to avoid flooding the LSP server
  // with full-document rewrites on every keystroke. The UI callback
  // (onChange) fires immediately so the editor stays responsive.
  const didChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (didChangeTimerRef.current) clearTimeout(didChangeTimerRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        onChange?.(value);

        // didChange — debounced full document sync.
        if (lspConnection && filename && projectDir) {
          if (didChangeTimerRef.current) clearTimeout(didChangeTimerRef.current);
          didChangeTimerRef.current = setTimeout(() => {
            lspVersionRef.current += 1;
            try {
              lspConnection.sendNotification("textDocument/didChange", {
                textDocument: {
                  uri: pathToFileUri(`${projectDir}/${filename}`),
                  version: lspVersionRef.current,
                },
                contentChanges: [{ text: value }],
              });
            } catch {
              // Connection may be disposed during unmount — best-effort.
            }
          }, 300);
        }
      }
    },
    [onChange, lspConnection, filename, projectDir]
  );

  useEffect(() => {
    editorRef.current?.updateOptions({ fontSize, tabSize, wordWrap, minimap: { enabled: minimap } });
  }, [fontSize, tabSize, wordWrap, minimap]);

  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <MonacoEditor
        height="100%"
        language={VBA_LANGUAGE_ID}
        theme={theme === "dark" ? "vs-dark" : "vs"}
        value={content}
        path={projectDir ? pathToFileUri(`${projectDir}/${filename}`) : filename}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={handleChange}
        options={{
          fontSize,
          tabSize,
          wordWrap,
          minimap: { enabled: minimap },
          readOnly,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          renderLineHighlight: "all",
          fontFamily: "'Cascadia Code', 'Consolas', monospace",
          fontLigatures: true,
          "semanticHighlighting.enabled": true,
        }}
      />
    </div>
  );
}
