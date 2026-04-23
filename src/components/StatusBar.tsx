import { useTranslation } from "react-i18next";
import type { LspStatus } from "../hooks/useLspClient";

const LSP_STATUS_DOT_COLOR: Record<LspStatus, string> = {
  stopped: "#888888",
  connecting: "#e8a317",
  ready: "#3ec63e",
  error: "#e04040",
};

const LSP_STATUS_I18N_KEY: Record<LspStatus, string> = {
  stopped: "status.lspStopped",
  connecting: "status.lspConnecting",
  ready: "status.lspReady",
  error: "status.lspError",
};

interface StatusBarProps {
  status: string;
  projectId?: string;
  line?: number;
  column?: number;
  lspStatus?: LspStatus;
}

export function StatusBar({ status, projectId, line, column, lspStatus }: StatusBarProps) {
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
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <span>{t(`status.${status}`)}</span>
        {projectId && (
          <span style={{ opacity: 0.8 }}>ID: {projectId.slice(0, 8)}</span>
        )}
      </div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        {lspStatus && (
          <span
            style={{ display: "flex", alignItems: "center", gap: "5px" }}
            title={t(LSP_STATUS_I18N_KEY[lspStatus])}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: LSP_STATUS_DOT_COLOR[lspStatus],
                display: "inline-block",
              }}
            />
            {t(LSP_STATUS_I18N_KEY[lspStatus])}
          </span>
        )}
        {line !== undefined && column !== undefined && (
          <span>{t("status.lineColumn", { line, column })}</span>
        )}
        <span>VBA</span>
      </div>
    </footer>
  );
}
