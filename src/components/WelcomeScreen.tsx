import { useTranslation } from "react-i18next";

interface WelcomeScreenProps {
  onOpenFile: () => void;
}

export function WelcomeScreen({ onOpenFile }: WelcomeScreenProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        color: "var(--text-secondary)",
      }}
    >
      <div style={{ fontSize: "48px", fontWeight: 700, color: "var(--accent)" }}>
        Verde
      </div>
      <div style={{ fontSize: "14px" }}>{t("editor.welcome")}</div>
      <button
        onClick={onOpenFile}
        style={{
          padding: "10px 24px",
          background: "var(--accent)",
          color: "#ffffff",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        {t("menu.open")}
      </button>
      <div style={{ fontSize: "12px", marginTop: "12px" }}>
        {t("editor.rightClickTip")}
      </div>
    </div>
  );
}
