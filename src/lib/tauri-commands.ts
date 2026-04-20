import { invoke } from "@tauri-apps/api/core";
import type { ProjectInfo, Settings } from "./types";

export async function openProject(xlsmPath: string): Promise<ProjectInfo> {
  return invoke<ProjectInfo>("open_project", { xlsmPath });
}

export async function forceOpenProject(
  xlsmPath: string
): Promise<ProjectInfo> {
  return invoke<ProjectInfo>("force_open_project", { xlsmPath });
}

export async function closeProject(xlsmPath: string): Promise<void> {
  return invoke("close_project", { xlsmPath });
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

export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

export async function saveSettings(settings: Settings): Promise<void> {
  return invoke("save_settings", { settings });
}
