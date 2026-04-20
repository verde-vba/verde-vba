import { useCallback, useState } from "react";
import type { ModuleInfo, ProjectInfo } from "../lib/types";
import * as commands from "../lib/tauri-commands";

/// Sentinel message saveModule throws when the user tries to save while
/// the project is open in read-only mode. The UI matches on this exact
/// string to show a translated "saves are blocked" banner, so changing
/// the value is a coordinated UI change.
export const SAVE_BLOCKED_READONLY = "SAVE_BLOCKED_READONLY";

interface VerdeProjectState {
  project: ProjectInfo | null;
  activeModule: ModuleInfo | null;
  loading: boolean;
  error: string | null;
  readOnly: boolean;
}

export function useVerdeProject() {
  const [state, setState] = useState<VerdeProjectState>({
    project: null,
    activeModule: null,
    loading: false,
    error: null,
    readOnly: false,
  });

  // Shared open-flow: the three entry points differ only in which backend
  // command they invoke and whether the resulting project is read-only.
  // Keeping the loading/error boilerplate in one place means every flow
  // stays in lockstep (e.g. clearing stale errors on retry).
  const runOpen = useCallback(
    async (
      invoke: (xlsmPath: string) => Promise<ProjectInfo>,
      xlsmPath: string,
      readOnly: boolean
    ) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const project = await invoke(xlsmPath);
        setState({
          project,
          activeModule: project.modules[0] ?? null,
          loading: false,
          error: null,
          readOnly,
        });
      } catch (e) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : String(e),
        }));
        throw e;
      }
    },
    []
  );

  const openProject = useCallback(
    (xlsmPath: string) => runOpen(commands.openProject, xlsmPath, false),
    [runOpen]
  );

  const forceOpenProject = useCallback(
    (xlsmPath: string) => runOpen(commands.forceOpenProject, xlsmPath, false),
    [runOpen]
  );

  const openProjectReadOnly = useCallback(
    (xlsmPath: string) =>
      runOpen(commands.openProjectReadOnly, xlsmPath, true),
    [runOpen]
  );

  const setActiveModule = useCallback((module: ModuleInfo) => {
    setState((s) => ({ ...s, activeModule: module }));
  }, []);

  const saveModule = useCallback(
    async (filename: string, content: string) => {
      if (!state.project) return;
      // Intentionally do not hit the backend in read-only mode — COM import
      // would mutate the xlsm, which is exactly what read-only promises to
      // avoid. Surfacing a well-known error string lets the UI render a
      // translated notice instead of a stack trace.
      if (state.readOnly) {
        throw new Error(SAVE_BLOCKED_READONLY);
      }
      try {
        await commands.saveModule(state.project.project_id, filename, content);
      } catch (e) {
        setState((s) => ({
          ...s,
          error: e instanceof Error ? e.message : String(e),
        }));
        throw e;
      }
    },
    [state.project, state.readOnly]
  );

  const syncToExcel = useCallback(async () => {
    if (!state.project) return;
    try {
      await commands.syncToExcel(state.project.project_id);
    } catch (e) {
      setState((s) => ({ ...s, error: String(e) }));
    }
  }, [state.project]);

  return {
    ...state,
    openProject,
    forceOpenProject,
    openProjectReadOnly,
    setActiveModule,
    saveModule,
    syncToExcel,
  };
}
