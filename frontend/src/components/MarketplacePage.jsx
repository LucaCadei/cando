import { useState, useEffect } from "react";
import { API, ALL_TYPES, SORT_OPTIONS, TYPE_LABEL } from "../constants.js";
import { Badge } from "./Badge.jsx";
import { ConceptCard } from "./Cards.jsx";
import { ConceptDetailModal } from "./ConceptDetailModal.jsx";
import s from "../styles.js";

const INK = "#0E0E0C";
const BG  = "#E5E4DF";
const VIO = "#7C4DFF";
const YEL = "#FFD43A";

function FilterChip({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", textAlign: "left",
        padding: "7px 12px", fontSize: 12, fontWeight: 700,
        fontFamily: "var(--f-body)", textTransform: "uppercase", letterSpacing: "0.05em",
        border: `2px solid ${INK}`, cursor: "pointer",
        background: active ? VIO : hovered ? YEL : BG,
        color: active ? BG : INK,
        transition: "all 120ms ease-out",
      }}
    >
      {label}
    </button>
  );
}

function SortBtn({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", textAlign: "left",
        padding: "7px 12px", fontSize: 11, fontWeight: 700,
        fontFamily: "var(--f-body)", textTransform: "uppercase", letterSpacing: "0.05em",
        border: `2px solid ${INK}`, cursor: "pointer",
        background: active ? INK : hovered ? YEL : BG,
        color: active ? BG : INK,
        transition: "all 120ms ease-out",
      }}
    >
      {label}
    </button>
  );
}

function FilterLabel({ children }) {
  return (
    <p style={{
      fontFamily: "var(--f-body)", fontSize: 10, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase", color: "#5C5A52",
      margin: "0 0 8px",
    }}>
      {children}
    </p>
  );
}


export function MarketplacePage({ user, onBuy, saved, onToggleSave }) {
  const [concepts, setConcepts]   = useState([]);
  const [error, setError]         = useState(null);
  const [detailState, setDetail]  = useState(null);
  const [search, setSearch]       = useState("");
  const [types, setTypes]         = useState(new Set(ALL_TYPES));
  const [sort, setSort]           = useState("default");
  const [panelOpen, setPanelOpen] = useState(false);

  const savedIds = new Set(saved.map((c) => c.id));

  const handleBuy = (concept, newCoins) => {
    setConcepts((prev) => prev.filter((c) => c.id !== concept.id));
    onBuy(concept, newCoins);
  };

  useEffect(() => {
    fetch(`${API}/concepts`)
      .then((r) => r.json())
      .then(setConcepts)
      .catch(() => setError("Backend non raggiungibile."));
  }, []);

  const toggleType = (t) =>
    setTypes((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });

  const allSelected = types.size === ALL_TYPES.length;
  const selectAll = () => setTypes(new Set(ALL_TYPES));

  const visible = concepts
    .filter((c) => types.has(c.type))
    .filter((c) => {
      const q = search.toLowerCase();
      return !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === "price_asc")  return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "title_az")   return a.title.localeCompare(b.title);
      return 0;
    });

  return (
    <div style={s.marketLayout}>

      {/* ── Pannello filtri scorrevole ───────────────────── */}
      <div style={{ ...s.filterPanelOuter, width: panelOpen ? 240 : 0 }}>
        <div style={s.filterPanelInner}>

          {/* Header pannello */}
          <div style={s.filterPanelHeader}>
            filtri
            <button
              onClick={() => setPanelOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: INK, display: "flex" }}
              aria-label="chiudi filtri"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                <line x1="1" y1="1" x2="13" y2="13"/>
                <line x1="13" y1="1" x2="1" y2="13"/>
              </svg>
            </button>
          </div>

          {/* Ricerca */}
          <div>
            <FilterLabel>cerca</FilterLabel>
            <input
              style={s.sidebarInput}
              placeholder="titolo o descrizione…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Categoria */}
          <div>
            <FilterLabel>categoria</FilterLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <FilterChip label="tutto" active={allSelected} onClick={selectAll} />
              {ALL_TYPES.map((t) => (
                <FilterChip
                  key={t}
                  label={TYPE_LABEL[t] ?? t}
                  active={!allSelected && types.has(t)}
                  onClick={() => toggleType(t)}
                />
              ))}
            </div>
          </div>

          {/* Ordinamento */}
          <div>
            <FilterLabel>ordina</FilterLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <SortBtn label="recenti"   active={sort === "default"}     onClick={() => setSort("default")} />
              <SortBtn label="prezzo ↑"  active={sort === "price_asc"}   onClick={() => setSort("price_asc")} />
              <SortBtn label="prezzo ↓"  active={sort === "price_desc"}  onClick={() => setSort("price_desc")} />
              <SortBtn label="A → Z"     active={sort === "title_az"}    onClick={() => setSort("title_az")} />
            </div>
          </div>

        </div>
      </div>

      {/* ── Griglia ──────────────────────────────────────── */}
      <main style={s.marketMain}>
        {error && <p style={s.errorMsg}>{error}</p>}

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          {!panelOpen && (
            <button
              onClick={() => setPanelOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", fontSize: 11, fontWeight: 700,
                fontFamily: "var(--f-body)", textTransform: "uppercase", letterSpacing: "0.06em",
                border: `2px solid ${INK}`, cursor: "pointer", background: BG, color: INK,
                flexShrink: 0,
              }}
            >
              <svg width="13" height="10" viewBox="0 0 13 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                <line x1="0" y1="1" x2="13" y2="1"/>
                <line x1="0" y1="5" x2="9"  y2="5"/>
                <line x1="0" y1="9" x2="5"  y2="9"/>
              </svg>
              filtri
            </button>
          )}
          <p style={{ ...s.marketLabel, marginBottom: 0 }}>
            {visible.length} {visible.length === 1 ? "oggetto" : "oggetti"}
          </p>
        </div>

        {visible.length === 0 && !error ? (
          <div style={{ paddingTop: 60, textAlign: "center" }}>
            <p style={{ fontFamily: "var(--f-body)", fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 12 }}>nessun concetto trovato.</p>
            <p style={{ fontFamily: "var(--f-body)", fontSize: 13, fontWeight: 500, color: "#5C5A52" }}>prova a cambiare i filtri.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {visible.map((c) => (
              <ConceptCard
                key={c.id}
                concept={c}
                isSaved={savedIds.has(c.id)}
                isOwned={c.owner_id === user?.id}
                onOpenDetail={(concept, mode) => setDetail({ concept, mode })}
              />
            ))}
          </div>
        )}
      </main>

      {detailState && (
        <ConceptDetailModal
          concept={detailState.concept}
          mode={detailState.mode}
          isSaved={savedIds.has(detailState.concept.id)}
          user={user}
          onBuy={handleBuy}
          onToggleSave={onToggleSave}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
