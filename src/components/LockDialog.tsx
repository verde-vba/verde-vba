import { useTranslation } from "react-i18next";

interface LockInfo {
  user: string;
  machine: string;
  time: string;
}

interface LockDialogProps {
  lock: LockInfo;
  processing?: boolean;
  onOpenReadOnly: () => void;
  onForceOpen: () => void;
  onCancel: () => void;
}

export function LockDialog({
  lock,
  processing = false,
  onOpenReadOnly,
  onForceOpen,
  onCancel,
}: LockDialogProps) {
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
        aria-labelledby="lock-dialog-title"
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
          id="lock-dialog-title"
          style={{
            margin: "0 0 12px 0",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--error)",
          }}
        >
          {t("lock.title")}
        </h2>

        <p
          style={{
            margin: "0 0 20px 0",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {t("lock.message", {
            user: lock.user,
            machine: lock.machine,
            time: lock.time,
          })}
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
            onClick={onCancel}
            disabled={processing}
            style={{
              padding: "6px 14px",
              background: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              fontSize: "13px",
              cursor: processing ? "wait" : "pointer",
              opacity: processing ? 0.6 : 1,
            }}
          >
            {t("lock.cancel")}
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={onForceOpen}
              disabled={processing}
              style={{
                padding: "6px 14px",
                background: "transparent",
                color: "var(--error)",
                border: "1px solid var(--error)",
                borderRadius: "4px",
                fontSize: "13px",
                cursor: processing ? "wait" : "pointer",
                opacity: processing ? 0.6 : 1,
              }}
            >
              {t("lock.forceOpen")}
            </button>
            <button
              type="button"
              onClick={onOpenReadOnly}
              disabled={processing}
              style={{
                padding: "6px 14px",
                background: "var(--accent)",
                color: "#ffffff",
                border: "1px solid var(--accent)",
                borderRadius: "4px",
                fontSize: "13px",
                cursor: processing ? "wait" : "pointer",
                opacity: processing ? 0.6 : 1,
              }}
            >
              {t("lock.openReadOnly")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
