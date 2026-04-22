const KEY_PREFIX = "verde-hot-exit-";

export interface HotExitData {
  buffers: Record<string, string>;
}

export function saveHotExit(projectId: string, data: HotExitData): void {
  try {
    localStorage.setItem(KEY_PREFIX + projectId, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function loadHotExit(projectId: string): HotExitData | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + projectId);
    if (!raw) return null;
    const data = JSON.parse(raw) as HotExitData;
    if (!data.buffers || typeof data.buffers !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

export function clearHotExit(projectId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + projectId);
  } catch {
    // silently ignore
  }
}
