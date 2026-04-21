import { invoke } from "@tauri-apps/api/core";
import type { ConflictModule, ProjectInfo, Settings } from "./types";

export async function getInitialFile(): Promise<string | null> {
  return invoke<string | null>("get_initial_file");
}

export async function openProject(xlsmPath: string): Promise<ProjectInfo> {
  return invoke<ProjectInfo>("open_project", { xlsmPath });
}

export async function forceOpenProject(
  xlsmPath: string
): Promise<ProjectInfo> {
  return invoke<ProjectInfo>("force_open_project", { xlsmPath });
}

export async function openProjectReadOnly(
  xlsmPath: string
): Promise<ProjectInfo> {
  return invoke<ProjectInfo>("open_project_readonly", { xlsmPath });
}

export async function closeProject(xlsmPath: string): Promise<void> {
  return invoke("close_project", { xlsmPath });
}

export async function readModule(
  projectId: string,
  filename: string
): Promise<string> {
  return invoke<string>("read_module", { projectId, filename });
}

export async function saveModule(
  projectId: string,
  filename: string,
  content: string
): Promise<void> {
  return invoke("save_module", {
    request: { project_id: projectId, filename, content },
  });
}

export async function syncToExcel(projectId: string): Promise<void> {
  return invoke("sync_to_excel", { projectId });
}

export async function syncFromExcel(xlsmPath: string): Promise<ProjectInfo> {
  return invoke<ProjectInfo>("sync_from_excel", { xlsmPath });
}

export async function getProjectInfo(projectId: string): Promise<ProjectInfo> {
  return invoke<ProjectInfo>("get_project_info", { projectId });
}

/// Runs the three-way conflict detection. Returns the set of modules
/// whose hashes disagree across AppData / meta / live Excel. Resolves to
/// an empty array when nothing conflicts. Rejects when the Excel export
/// step fails (typically non-Windows or Excel not installed); callers
/// should treat that case as 'cannot check, skip' rather than 'no
/// conflict'.
export async function checkConflict(
  projectId: string,
  xlsmPath: string
): Promise<ConflictModule[]> {
  return invoke<ConflictModule[]>("check_conflict", {
    projectId,
    xlsmPath,
  });
}

export async function resolveConflict(
  projectId: string,
  xlsmPath: string,
  side: "verde" | "excel"
): Promise<void> {
  return invoke("resolve_conflict", { projectId, xlsmPath, side });
}

export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

export async function saveSettings(settings: Settings): Promise<void> {
  return invoke("save_settings", { settings });
}
