// SVG defs tenuti per compatibilità — non più usati nel render principale
export function CandoCoinDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs>
        <symbol id="cc-metal" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="97" fill="#0E0E0C"/>
          <circle cx="100" cy="100" r="97" fill="none" stroke="#FFD43A" strokeWidth="2"/>
          <path d="M123.8 65.5 A40 40 0 1 0 123.8 134.5" fill="none" stroke="#FFD43A" strokeWidth="13" strokeLinecap="round"/>
        </symbol>
      </defs>
    </svg>
  );
}

// Il prezzo in cando coin è un blocco giallo con bordo nero —
// in linea con il sistema brutalist (giallo = prezzo/eyebrow)
export const CoinAmount = ({ amount, size = "md" }) => {
  const sizes = {
    sm: { fontSize: 12, padding: "3px 8px", ccSize: 10 },
    md: { fontSize: 14, padding: "4px 10px", ccSize: 11 },
    lg: { fontSize: 16, padding: "5px 12px", ccSize: 12 },
  };
  const sz = sizes[size] || sizes.md;
  const formatted = typeof amount === "number" ? amount.toLocaleString("it-IT") : amount;

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#FFD43A", border: "2px solid #0E0E0C",
      padding: sz.padding,
      fontFamily: "var(--f-body)", fontSize: sz.fontSize, fontWeight: 700, color: "#0E0E0C",
    }}>
      {formatted}
      <span style={{ fontFamily: "var(--f-mono)", fontSize: sz.ccSize, fontWeight: 500, opacity: 0.7 }}>cc</span>
    </span>
  );
};

// Icona standalone — rimasta per compatibilità nei rari posti che la usano ancora
export const CoinIcon = ({ size = 14 }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: size, height: size, background: "#FFD43A", border: "1.5px solid #0E0E0C",
    fontFamily: "var(--f-mono)", fontSize: Math.max(6, size - 4), fontWeight: 600, color: "#0E0E0C",
  }}>
    c
  </span>
);
