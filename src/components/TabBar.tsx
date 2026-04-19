import type { ModuleInfo } from "../lib/types";

interface TabBarProps {
  openModules: ModuleInfo[];
  activeModule: ModuleInfo | null;
  onSelectModule: (module: ModuleInfo) => void;
  onCloseModule: (module: ModuleInfo) => void;
}

export function TabBar({
  openModules,
  activeModule,
  onSelectModule,
  onCloseModule,
}: TabBarProps) {
  if (openModules.length === 0) return null;

  return (
    <div
      style={{
        height: "var(--tabbar-height)",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "stretch",
        overflow: "auto",
        flexShrink: 0,
      }}
    >
      {openModules.map((mod) => {
        const isActive = activeModule?.filename === mod.filename;
        return (
          <div
            key={mod.filename}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              gap: "8px",
              background: isActive ? "var(--bg-primary)" : "transparent",
              borderRight: "1px solid var(--border)",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer",
              fontSize: "13px",
              whiteSpace: "nowrap",
            }}
            onClick={() => onSelectModule(mod)}
          >
            <span>{mod.filename}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseModule(mod);
              }}
              style={{
                fontSize: "14px",
                lineHeight: 1,
                opacity: 0.6,
                padding: "2px",
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
