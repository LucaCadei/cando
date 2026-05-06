import { TYPE_LABEL } from "../constants.js";

const BADGE_VARIANTS = {
  number:    { bg: "#E6ECF5", color: "#3A4E6E" },
  date:      { bg: "#F5EDE0", color: "#6E4A28" },
  idea:      { bg: "#EDE8F5", color: "#4E3A6E" },
  filosofia: { bg: "#E6F0EC", color: "#2A5040" },
};

export function Badge({ type }) {
  const v = BADGE_VARIANTS[type] || BADGE_VARIANTS.idea;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", alignSelf: "flex-start",
      fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.06em",
      textTransform: "uppercase", borderRadius: 2, padding: "2px 7px",
      background: v.bg, color: v.color,
    }}>
      {TYPE_LABEL[type]}
    </span>
  );
}
