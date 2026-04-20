import { useTranslation } from "react-i18next";

interface TrustGuideDialogProps {
  onHowTo: () => void;
  onClose: () => void;
}

export function TrustGuideDialog({
  onHowTo,
  onClose,
}: TrustGuideDialogProps) {
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
        aria-labelledby="trust-dialog-title"
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
          id="trust-dialog-title"
          style={{
            margin: "0 0 12px 0",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--accent)",
          }}
        >
          {t("trust.title")}
        </h2>

        <p
          style={{
            margin: "0 0 20px 0",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {t("trust.message")}
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
            onClick={onClose}
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
            {t("lock.cancel")}
          </button>
          <button
            type="button"
            onClick={onHowTo}
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
            {t("trust.howTo")}
          </button>
        </div>
      </div>
    </div>
  );
}
