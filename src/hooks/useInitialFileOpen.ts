import { useEffect } from "react";
import { getInitialFile } from "../lib/tauri-commands";

/**
 * Auto-opens the file supplied by the CLI on startup (right-click
 * "Open with Verde"). The backend uses `take()` semantics so re-invocations
 * are harmless.
 */
export function useInitialFileOpen(
  openProject: (path: string) => Promise<void>,
  onError: (err: unknown, path: string) => void,
): void {
  useEffect(() => {
    getInitialFile().then((path) => {
      if (path) {
        openProject(path).catch((e) => {
          onError(e, path);
        });
      }
    });
  }, [openProject, onError]);
}
