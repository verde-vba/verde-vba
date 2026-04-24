// useWorkspaceModels — pre-create Monaco models for all VBA files in the
// project directory so that cross-file navigation (go-to-definition,
// references, etc.) works without "Model not found" errors.
//
// Standalone Monaco lacks VS Code's ITextModelService that lazily loads
// files from disk.  We compensate by eagerly creating read-only models
// for every module in the workspace.  Models created here are disposed
// when the project changes or the hook unmounts.

import { useEffect, useRef } from "react";
import { pathToFileUri } from "./useLspClient";
import * as commands from "../lib/tauri-commands";
import type { ModuleInfo } from "../lib/types";
import { VBA_LANGUAGE_ID } from "../lib/monaco-vba";

export function useWorkspaceModels(
  monaco: typeof import("monaco-editor") | null,
  projectId: string | null,
  projectDir: string | null,
  modules: ModuleInfo[] | null,
) {
  // Track URIs of models we created so we can dispose them on cleanup.
  const createdUris = useRef<string[]>([]);

  useEffect(() => {
    if (!monaco || !projectId || !projectDir || !modules || modules.length === 0) return;

    let cancelled = false;

    void (async () => {
      for (const mod of modules) {
        if (cancelled) break;

        const uriStr = pathToFileUri(`${projectDir}/${mod.filename}`);
        const monacoUri = monaco.Uri.parse(uriStr);

        // Skip if a model already exists at this URI (e.g. the active
        // editor tab created one).
        if (monaco.editor.getModel(monacoUri)) continue;

        try {
          const content = await commands.readModule(projectId, mod.filename);
          if (cancelled) break;
          // Double-check after async gap.
          if (!monaco.editor.getModel(monacoUri)) {
            monaco.editor.createModel(content, VBA_LANGUAGE_ID, monacoUri);
            createdUris.current.push(uriStr);
          }
        } catch (e) {
          console.warn(`[useWorkspaceModels] failed to load ${mod.filename}:`, e);
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const uri of createdUris.current) {
        const model = monaco.editor.getModel(monaco.Uri.parse(uri));
        model?.dispose();
      }
      createdUris.current = [];
    };
  }, [monaco, projectId, projectDir, modules]);
}
