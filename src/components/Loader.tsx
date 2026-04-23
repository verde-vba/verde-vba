import { useTranslation } from "react-i18next";

interface LoaderProps {
  message?: string;
}

export function Loader({ message }: LoaderProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        opacity: 0.85,
        zIndex: 10,
        gap: "12px",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid var(--border)",
          borderTopColor: "var(--accent)",
          borderRadius: "50%",
          animation: "verde-spin 0.8s linear infinite",
        }}
      />
      <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
        {message ?? t("editor.loading")}
      </span>
    </div>
  );
}
