export function CandoCoinDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs>
        <symbol id="cc-metal" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="97" fill="#1A1A18"/>
          <circle cx="100" cy="100" r="97" fill="none" stroke="#C8C8C4" strokeWidth="1.5"/>
          <circle cx="100" cy="100" r="80" fill="none" stroke="#2A2A28" strokeWidth="0.75"/>
          <path d="M123.8 65.5 A40 40 0 1 0 123.8 134.5" fill="none" stroke="#C8C8C4" strokeWidth="13" strokeLinecap="round"/>
        </symbol>
        <symbol id="cc-flat" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="97" fill="#1A1A18"/>
          <circle cx="100" cy="100" r="97" fill="none" stroke="#C8C8C4" strokeWidth="1.5"/>
          <path d="M123.8 65.5 A40 40 0 1 0 123.8 134.5" fill="none" stroke="#C8C8C4" strokeWidth="13" strokeLinecap="round"/>
        </symbol>
        <symbol id="cc-outline" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="97" fill="#EBEBEA"/>
          <circle cx="100" cy="100" r="97" fill="none" stroke="#BEBEBA" strokeWidth="1.5"/>
          <path d="M123.8 65.5 A40 40 0 1 0 123.8 134.5" fill="none" stroke="#3A3A38" strokeWidth="13" strokeLinecap="round"/>
        </symbol>
      </defs>
    </svg>
  );
}

export const CoinIcon = ({ size = 14, variant = "outline" }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
    <use href={`#cc-${variant}`} />
  </svg>
);

export const CoinAmount = ({ amount, size = "md", chip = false }) => {
  const iconSize = { sm: 14, md: 16, lg: 20 }[size] || 14;
  const fontSize = { sm: 12, md: 12, lg: 13 }[size] || 12;
  const formatted = typeof amount === "number" ? amount.toLocaleString("it-IT") : amount;
  const inner = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-ui)", fontSize, fontWeight: 500, color: "#3A3A38", letterSpacing: "0.01em" }}>
      <CoinIcon size={iconSize} variant="outline" />
      {formatted}
    </span>
  );
  if (!chip) return inner;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", background: "var(--color-white)", border: "1px solid var(--color-grey-100)", borderRadius: 3, padding: "5px 10px" }}>
      {inner}
    </span>
  );
};
