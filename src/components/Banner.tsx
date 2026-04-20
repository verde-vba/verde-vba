import type { ReactNode } from "react";

// Shared alert-banner presentation used by save-blocked, excel-open, and
// generic-error surfaces. Extracted so the three call sites in App.tsx
// stop duplicating the padding/border/flex shell and the dismiss button
// boilerplate. Tone maps to the palette pair: "warning" keeps the softer
// bg-secondary/text-primary scheme the save-blocked + excel-open prompts
// already used; "error" keeps the inverted error/bg-primary scheme the
// generic error banner introduced in Sprint 3.
export type BannerTone = "warning" | "error";

interface BannerProps {
  tone: BannerTone;
  onDismiss: () => void;
  dismissLabel: string;
  children: ReactNode;
}

export function Banner({ tone, onDismiss, dismissLabel, children }: BannerProps) {
  const palette =
    tone === "error"
      ? {
          background: "var(--error, #b00020)",
          color: "var(--bg-primary, #ffffff)",
          // currentColor keeps the button outline in sync with the inverted
          // foreground so we don't have to pick a hardcoded light border.
          buttonBorder: "1px solid currentColor",
          buttonColor: "inherit",
        }
      : {
          background: "var(--bg-secondary, #fff4e5)",
          color: "var(--text-primary)",
          buttonBorder: "1px solid var(--border)",
          buttonColor: "var(--text-primary)",
        };

  return (
    <div
      role="alert"
      style={{
        padding: "8px 12px",
        background: palette.background,
        color: palette.color,
        borderTop: "1px solid var(--border)",
        fontSize: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <span>{children}</span>
      <button
        type="button"
        onClick={onDismiss}
        style={{
          padding: "2px 10px",
          background: "transparent",
          color: palette.buttonColor,
          border: palette.buttonBorder,
          borderRadius: "4px",
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        {dismissLabel}
      </button>
    </div>
  );
}
