import MonacoEditor from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { editor } from "monaco-editor";
import { useTranslation } from "react-i18next";
import { registerVbaLanguage, VBA_LANGUAGE_ID } from "../lib/monaco-vba";
import { registerTreeSitterVbaProvider } from "../lib/tree-sitter-vba";
import { createTauriLspTransport } from "../lib/lsp-bridge";
import { useLspClient, type LspClientLoadError } from "../hooks/useLspClient";

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
  onLspLoadError?: (reason: LspClientLoadError) => void;
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
}: EditorProps) {
  const { t } = useTranslation();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

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
  useLspClient({
    transport: lspTransport,
    spawn: lspSpawn,
    onError: onLspLoadError,
  });

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

      editor.addAction({
        id: "verde.save",
        label: t("editor.saveAction"),
        keybindings: [2048 | 49], // Ctrl+S
        run: () => {
          const value = editor.getValue();
          onSave?.(value);
        },
      });
    },
    [onSave, t]
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        onChange?.(value);
      }
    },
    [onChange]
  );

  useEffect(() => {
    editorRef.current?.updateOptions({ fontSize, tabSize, wordWrap, minimap: { enabled: minimap } });
  }, [fontSize, tabSize, wordWrap, minimap]);

  return (
    <div style={{ flex: 1, overflow: "hidden" }}>
      <MonacoEditor
        height="100%"
        language={VBA_LANGUAGE_ID}
        theme={theme === "dark" ? "vs-dark" : "vs"}
        value={content}
        path={filename}
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
        }}
      />
    </div>
  );
}
