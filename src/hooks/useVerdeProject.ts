import { useCallback, useState } from "react";
import type { ModuleInfo, ProjectInfo } from "../lib/types";
import * as commands from "../lib/tauri-commands";

interface VerdeProjectState {
  project: ProjectInfo | null;
  activeModule: ModuleInfo | null;
  loading: boolean;
  error: string | null;
}

export function useVerdeProject() {
  const [state, setState] = useState<VerdeProjectState>({
    project: null,
    activeModule: null,
    loading: false,
    error: null,
  });

  const openProject = useCallback(async (xlsmPath: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const project = await commands.openProject(xlsmPath);
      setState({
        project,
        activeModule: project.modules[0] ?? null,
        loading: false,
        error: null,
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: String(e),
      }));
    }
  }, []);

  const setActiveModule = useCallback((module: ModuleInfo) => {
    setState((s) => ({ ...s, activeModule: module }));
  }, []);

  const saveModule = useCallback(
    async (filename: string, content: string) => {
      if (!state.project) return;
      try {
        await commands.saveModule(state.project.project_id, filename, content);
      } catch (e) {
        setState((s) => ({ ...s, error: String(e) }));
      }
    },
    [state.project]
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
    setActiveModule,
    saveModule,
    syncToExcel,
  };
}
