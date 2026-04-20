import { useTranslation } from "react-i18next";

export function ReadOnlyBar() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      style={{
        padding: "4px 12px",
        background: "var(--warning-bg, #fff4e5)",
        color: "var(--warning-text, #7a4b00)",
        borderBottom: "1px solid var(--border)",
        fontSize: "12px",
        fontWeight: 500,
      }}
    >
      {t("status.readOnly")}
    </div>
  );
}
