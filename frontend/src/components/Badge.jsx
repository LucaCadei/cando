import { WIKI_CATEGORIES } from "../constants.js";

export function Badge({ type }) {
  const cat = WIKI_CATEGORIES[type] ?? { label: type ?? "—", background: "#7C4DFF", color: "#E5E4DF" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", alignSelf: "flex-start",
      fontFamily: "var(--f-body)", fontSize: 10, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "3px 8px", border: "2px solid #0E0E0C",
      background: cat.background, color: cat.color,
    }}>
      {cat.label}
    </span>
  );
}
