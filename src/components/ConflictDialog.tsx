import { useTranslation } from "react-i18next";

interface ConflictDialogProps {
  count: number;
  onKeepFile: () => void;
  onKeepExcel: () => void;
}

export function ConflictDialog({
  count,
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
            margin: "0 0 20px 0",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {t("conflict.message", { count })}
        </p>

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
            style={{
              padding: "6px 14px",
              background: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {t("conflict.keepExcel")}
          </button>
          <button
            type="button"
            onClick={onKeepFile}
            style={{
              padding: "6px 14px",
              background: "var(--accent)",
              color: "#ffffff",
              border: "1px solid var(--accent)",
              borderRadius: "4px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {t("conflict.keepFile")}
          </button>
        </div>
      </div>
    </div>
  );
}
