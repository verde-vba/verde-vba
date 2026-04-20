export interface ModuleInfo {
  filename: string;
  module_type: number;
  line_count: number;
  hash: string;
}

export interface ProjectInfo {
  project_id: string;
  xlsm_path: string;
  project_dir: string;
  modules: ModuleInfo[];
}

export interface LockInfo {
  user: string;
  machine: string;
  pid: number;
  app: string;
  locked_at: string;
}

export interface EditorSettings {
  font_size: number;
  font_family: string;
  tab_size: number;
  word_wrap: string;
  minimap: boolean;
}

export interface SyncSettings {
  auto_sync_to_excel: boolean;
}

// settings.rs marks TrustSettings with #[serde(rename_all = "camelCase")]
// so its fields (unlike the other Settings sub-structs which still use
// snake_case on the wire) arrive as `vbaAcknowledged`, not `vba_acknowledged`.
export interface TrustSettings {
  vbaAcknowledged: boolean;
}

export interface Settings {
  theme: "system" | "light" | "dark";
  language: string;
  editor: EditorSettings;
  sync: SyncSettings;
  trust: TrustSettings;
}

export interface ConflictInfo {
  module_name: string;
  verde_hash: string;
  excel_hash: string;
}

export type VbaModuleType = "standard" | "class" | "form" | "document";

export function moduleTypeLabel(type_code: number): VbaModuleType {
  switch (type_code) {
    case 1:
      return "standard";
    case 2:
      return "class";
    case 3:
      return "form";
    case 100:
      return "document";
    default:
      return "standard";
  }
}

export function moduleExtension(type_code: number): string {
  switch (type_code) {
    case 1:
      return ".bas";
    case 2:
    case 100:
      return ".cls";
    case 3:
      return ".frm";
    default:
      return ".bas";
  }
}
