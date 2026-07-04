type Variant = "primary" | "reversed" | "onDark" | "mono";

const V: Record<Variant, { tile: string; house: string; door: string; border?: string }> = {
  primary: { tile: "#473fb0", house: "#ffffff", door: "#473fb0" },
  reversed: { tile: "#ffffff", house: "#473fb0", door: "#ffffff", border: "#e7e5de" },
  onDark: { tile: "#16160f", house: "#ffffff", door: "#16160f" },
  mono: { tile: "none", house: "currentColor", door: "var(--bg, #ffffff)" },
};

export function LogoMark({
  size = 32,
  variant = "primary",
  className = "",
}: {
  size?: number;
  variant?: Variant;
  className?: string;
}) {
  const c = V[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="HomesBrain"
      className={className}
    >
      <rect
        width="120"
        height="120"
        rx="28"
        fill={c.tile}
        stroke={c.border ?? "none"}
        strokeWidth={c.border ? 3 : 0}
      />
      <path d="M60 30 L93 57 H27 Z" fill={c.house} />
      <rect x="36" y="54" width="48" height="38" rx="5" fill={c.house} />
      <path d="M52 92 V79 a8 8 0 0 1 16 0 V92 Z" fill={c.door} />
    </svg>
  );
}

export function Logo({
  size = 30,
  variant = "primary",
  showWordmark = true,
  className = "",
}: {
  size?: number;
  variant?: Variant;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.5 }}
    >
      <LogoMark size={size} variant={variant} />
      {showWordmark && (
        <span
          style={{
            fontWeight: 800,
            letterSpacing: "-0.02em",
            fontSize: size * 0.62,
            color: "var(--ink, #16160f)",
            fontFamily:
              "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          }}
        >
          HomesBrain
        </span>
      )}
    </span>
  );
}
