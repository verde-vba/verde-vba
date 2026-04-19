import MonacoEditor from "@monaco-editor/react";
import { useCallback, useEffect, useRef } from "react";
import type { editor } from "monaco-editor";
import { registerVbaLanguage, VBA_LANGUAGE_ID } from "../lib/monaco-vba";

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
}: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleBeforeMount = useCallback((monaco: typeof import("monaco-editor")) => {
    registerVbaLanguage(monaco);
  }, []);

  const handleMount = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      editor.addAction({
        id: "verde.save",
        label: "Save",
        keybindings: [2048 | 49], // Ctrl+S
        run: () => {
          const value = editor.getValue();
          onSave?.(value);
        },
      });
    },
    [onSave]
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
