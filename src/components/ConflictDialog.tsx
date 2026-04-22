import { useTranslation } from "react-i18next";
import type { ConflictModule } from "../lib/types";

interface ConflictDialogProps {
  count: number;
  modules?: ConflictModule[];
  resolving?: boolean;
  error?: string | null;
  onKeepFile: () => void;
  onKeepExcel: () => void;
}

export function ConflictDialog({
  count,
  modules,
  resolving,
  error,
  onKeepFile,
  onKeepExcel,
}: ConflictDialogProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
        style={{
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "20px 24px",
          minWidth: "420px",
          maxWidth: "560px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
        }}
      >
        <h2
          id="conflict-dialog-title"
          style={{
            margin: "0 0 12px 0",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--error)",
          }}
        >
          {t("conflict.title")}
        </h2>

        <p
          style={{
            margin: "0 0 12px 0",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {t("conflict.message", { count })}
        </p>

        {modules && modules.length > 0 && (
          <ul
            style={{
              margin: "0 0 20px 0",
              padding: "8px 12px",
              maxHeight: "180px",
              overflowY: "auto",
              listStyle: "none",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            }}
          >
            {modules.map((m) => (
              <li key={m.filename} style={{ padding: "2px 0" }}>
                {m.filename}
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p
            style={{
              margin: "0 0 12px 0",
              padding: "8px 12px",
              fontSize: "12px",
              lineHeight: 1.5,
              color: "var(--error)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--error)",
              borderRadius: "4px",
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={onKeepExcel}
            disabled={resolving}
            style={{
              padding: "6px 14px",
              background: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              fontSize: "13px",
              cursor: resolving ? "wait" : "pointer",
              opacity: resolving ? 0.5 : 1,
            }}
          >
            {t("conflict.keepExcel")}
          </button>
          <button
            type="button"
            onClick={onKeepFile}
            disabled={resolving}
            style={{
              padding: "6px 14px",
              background: "var(--accent)",
              color: "#ffffff",
              border: "1px solid var(--accent)",
              borderRadius: "4px",
              fontSize: "13px",
              cursor: resolving ? "wait" : "pointer",
              opacity: resolving ? 0.5 : 1,
            }}
          >
            {t("conflict.keepFile")}
          </button>
        </div>
      </div>
    </div>
  );
}
