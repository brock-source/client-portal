import React from "react";

type ButtonVariant = "primary" | "navy" | "outline" | "ghost";

export function Button({
  children,
  variant = "primary",
  arrow = false,
  disabled = false,
  type = "button",
  onClick,
  style,
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  arrow?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: "var(--ink-900)", color: "#fff", border: "1px solid var(--ink-900)" },
    navy: { background: "var(--navy-700)", color: "#fff", border: "1px solid var(--navy-700)" },
    outline: { background: "transparent", color: "var(--navy-700)", border: "1px solid var(--navy-600)" },
    ghost: { background: "transparent", color: "var(--navy-700)", border: "1px solid transparent" },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "var(--font-label)",
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: "var(--ls-label)",
        textTransform: "uppercase",
        lineHeight: 1,
        padding: "14px 26px",
        borderRadius: "var(--radius-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
      {arrow && <span aria-hidden style={{ fontFamily: "var(--font-body)", fontWeight: 400 }}>→</span>}
    </button>
  );
}

export function Badge({
  children,
  tone = "navy",
}: {
  children: React.ReactNode;
  tone?: "navy" | "gold" | "stone" | "success";
}) {
  const palettes: Record<string, [string, string]> = {
    navy: ["var(--navy-100)", "var(--navy-700)"],
    gold: ["var(--gold-200)", "var(--gold-700)"],
    stone: ["var(--stone-100)", "var(--stone-700)"],
    success: ["var(--success-100)", "var(--success-600)"],
  };
  const [bg, fg] = palettes[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-label)",
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: "var(--ls-label)",
        textTransform: "uppercase",
        padding: "6px 12px",
        borderRadius: "var(--radius-pill)",
        background: bg,
        color: fg,
      }}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  eyebrow,
  title,
  style,
}: {
  children?: React.ReactNode;
  eyebrow?: string;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        borderRadius: "var(--radius-md)",
        background: "var(--surface-card, #fff)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-sm)",
        padding: 24,
        ...style,
      }}
    >
      {eyebrow && (
        <div
          style={{
            fontFamily: "var(--font-label)",
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: "var(--ls-eyebrow)",
            textTransform: "uppercase",
            color: "var(--gold-700)",
          }}
        >
          {eyebrow}
        </div>
      )}
      {title && (
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: "var(--ls-heading)",
            textTransform: "uppercase",
            color: "var(--navy-800)",
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

export function SectionHeading({
  children,
  eyebrow,
  deck,
  align = "left",
}: {
  children: React.ReactNode;
  eyebrow?: string;
  deck?: string;
  align?: "left" | "center";
}) {
  return (
    <div style={{ textAlign: align }}>
      {eyebrow && <div className="sc-eyebrow" style={{ marginBottom: 12 }}>{eyebrow}</div>}
      <h1 className="sc-heading" style={{ fontSize: 32, lineHeight: 1.2 }}>
        {children}
      </h1>
      {deck && (
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 16,
            lineHeight: 1.7,
            color: "var(--text-body)",
            maxWidth: "56ch",
            margin: `16px ${align === "center" ? "auto" : "0"} 0`,
          }}
        >
          {deck}
        </p>
      )}
    </div>
  );
}
