import { useTranslation } from "react-i18next";

interface StatusBarProps {
  status: string;
  projectId?: string;
  line?: number;
  column?: number;
}

export function StatusBar({ status, projectId, line, column }: StatusBarProps) {
  const { t } = useTranslation();

  return (
    <footer
      style={{
        height: "var(--statusbar-height)",
        background: "var(--accent)",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        fontSize: "12px",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", gap: "16px" }}>
        <span>{t(`status.${status}`)}</span>
        {projectId && (
          <span style={{ opacity: 0.8 }}>ID: {projectId.slice(0, 8)}</span>
        )}
      </div>
      <div style={{ display: "flex", gap: "16px" }}>
        {line !== undefined && column !== undefined && (
          <span>
            Ln {line}, Col {column}
          </span>
        )}
        <span>VBA</span>
      </div>
    </footer>
  );
}
