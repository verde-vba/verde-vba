import type { MutableRefObject } from "react";
import { useEffect, useRef } from "react";
import { clearHotExit, loadHotExit, saveHotExit } from "../lib/hot-exit";
import { readModule } from "../lib/tauri-commands";
import type { ProjectInfo } from "../lib/types";

export interface UseHotExitOptions {
  project: ProjectInfo | null;
  dirtyModules: ReadonlySet<string>;
  buffersRef: MutableRefObject<Map<string, string>>;
  savedContentsRef: MutableRefObject<Map<string, string>>;
  /** Called with the filenames whose restored content differs from disk. */
  onRestoreDirty: (filenames: string[]) => void;
  /** Re-triggers the debounced save when editor content mutates. */
  contentVersion?: unknown;
}

/**
 * Persists dirty buffers so they survive crashes and restores them on
 * project open. Runs three effects:
 *
 * 1. Restore: on project change, reseed `buffersRef` from the hot-exit
 *    store and compare against disk to re-mark dirty buffers.
 * 2. Debounce: persist dirty buffers 2 s after the last change.
 * 3. Last-chance: listen to `beforeunload` and write synchronously.
 */
export function useHotExit({
  project,
  dirtyModules,
  buffersRef,
  savedContentsRef,
  onRestoreDirty,
  contentVersion,
}: UseHotExitOptions): void {
  useEffect(() => {
    if (!project) return;
    const data = loadHotExit(project.project_id);
    if (!data) return;

    for (const [filename, content] of Object.entries(data.buffers)) {
      buffersRef.current.set(filename, content);
    }

    Promise.all(
      Object.entries(data.buffers).map(async ([filename, hotContent]) => {
        try {
          const diskContent = await readModule(project.project_id, filename);
          savedContentsRef.current.set(filename, diskContent);
          return diskContent !== hotContent ? filename : null;
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      const dirty = results.filter(Boolean) as string[];
      if (dirty.length > 0) {
        onRestoreDirty(dirty);
      }
      clearHotExit(project.project_id);
    });
  }, [project]);

  const hotExitTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!project) return;
    clearTimeout(hotExitTimerRef.current);
    if (dirtyModules.size === 0) {
      clearHotExit(project.project_id);
      return;
    }
    hotExitTimerRef.current = setTimeout(() => {
      const buffers: Record<string, string> = {};
      for (const filename of dirtyModules) {
        const content = buffersRef.current.get(filename);
        if (content !== undefined) buffers[filename] = content;
      }
      saveHotExit(project.project_id, { buffers });
    }, 2000);
    return () => clearTimeout(hotExitTimerRef.current);
  }, [project, dirtyModules, contentVersion]);

  const projectRef = useRef(project);
  projectRef.current = project;
  const dirtyModulesRef = useRef(dirtyModules);
  dirtyModulesRef.current = dirtyModules;
  useEffect(() => {
    const handleBeforeUnload = () => {
      const p = projectRef.current;
      if (!p || dirtyModulesRef.current.size === 0) return;
      const buffers: Record<string, string> = {};
      for (const filename of dirtyModulesRef.current) {
        const content = buffersRef.current.get(filename);
        if (content !== undefined) buffers[filename] = content;
      }
      saveHotExit(p.project_id, { buffers });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}
