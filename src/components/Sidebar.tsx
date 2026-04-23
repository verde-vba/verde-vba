import { useTranslation } from "react-i18next";
import type { ModuleInfo } from "../lib/types";
import { moduleTypeLabel } from "../lib/types";

interface SidebarProps {
  modules: ModuleInfo[];
  activeModule: ModuleInfo | null;
  onSelectModule: (module: ModuleInfo) => void;
  disabled?: boolean;
}

const moduleIcons: Record<string, string> = {
  standard: "📄",
  class: "🔷",
  form: "🖼",
  document: "📊",
};

export function Sidebar({ modules, activeModule, onSelectModule, disabled = false }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          color: "var(--text-secondary)",
          letterSpacing: "0.5px",
        }}
      >
        {t("explorer.title")}
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {modules.length === 0 ? (
          <div
            style={{
              padding: "12px",
              color: "var(--text-secondary)",
              fontSize: "12px",
            }}
          >
            {t("explorer.noModules")}
          </div>
        ) : (
          modules.map((mod) => {
            const typeLabel = moduleTypeLabel(mod.type);
            const isActive = activeModule?.filename === mod.filename;
            return (
              <button
                key={mod.filename}
                onClick={() => onSelectModule(mod)}
                disabled={disabled}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  width: "100%",
                  padding: "4px 12px",
                  textAlign: "left",
                  background: isActive ? "var(--bg-tertiary)" : "transparent",
                  fontSize: "13px",
                  opacity: disabled ? 0.6 : 1,
                  cursor: disabled ? "wait" : "pointer",
                }}
              >
                <span>{moduleIcons[typeLabel] ?? "📄"}</span>
                <span>{mod.filename}</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
