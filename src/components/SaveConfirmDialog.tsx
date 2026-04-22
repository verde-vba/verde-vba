import { useTranslation } from "react-i18next";

interface SaveConfirmDialogProps {
  filename?: string;
  variant?: "tab" | "window";
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function SaveConfirmDialog({
  filename,
  variant = "tab",
  onSave,
  onDiscard,
  onCancel,
}: SaveConfirmDialogProps) {
  const { t } = useTranslation();
  const isWindow = variant === "window";

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
        aria-labelledby="save-confirm-dialog-title"
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
          id="save-confirm-dialog-title"
          style={{
            margin: "0 0 12px 0",
            fontSize: "16px",
            fontWeight: 600,
          }}
        >
          {t(isWindow ? "saveConfirm.titleWindow" : "saveConfirm.title")}
        </h2>

        <p
          style={{
            margin: "0 0 20px 0",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {isWindow
            ? t("saveConfirm.messageWindow")
            : t("saveConfirm.message", { filename })}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={onDiscard}
            style={{
              padding: "6px 14px",
              background: "transparent",
              color: "var(--error)",
              border: "1px solid var(--error)",
              borderRadius: "4px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {t("saveConfirm.discard")}
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={onCancel}
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
              {t("saveConfirm.cancel")}
            </button>
            <button
              type="button"
              onClick={onSave}
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
              {t("saveConfirm.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
