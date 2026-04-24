import { useEffect } from "react";
import { withTauriWindow } from "../lib/tauri-window";
import type { ModuleInfo, ProjectInfo } from "../lib/types";

/**
 * Keeps the window title in sync with the active module, its dirty state,
 * and the open project. Falls back to `document.title` outside Tauri.
 */
export function useWindowTitle(
  activeModule: ModuleInfo | null,
  dirtyModules: ReadonlySet<string>,
  project: ProjectInfo | null,
): void {
  useEffect(() => {
    const parts: string[] = [];
    if (activeModule) {
      const prefix = dirtyModules.has(activeModule.filename) ? "● " : "";
      parts.push(`${prefix}${activeModule.filename}`);
    }
    if (project) {
      const xlsmName = project.xlsm_path.split(/[\\/]/).pop() ?? "";
      if (xlsmName) parts.push(xlsmName);
    }
    parts.push("Verde");
    const title = parts.join(" — ");
    void withTauriWindow(
      (getCurrentWindow) => {
        getCurrentWindow().setTitle(title);
      },
      () => {
        document.title = title;
      },
    );
  }, [activeModule, dirtyModules, project]);
}
