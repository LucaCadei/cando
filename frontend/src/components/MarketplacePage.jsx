import { useState, useEffect } from "react";
import { API, ALL_TYPES, SORT_OPTIONS } from "../constants.js";
import { Badge } from "./Badge.jsx";
import { CoinIcon } from "./CoinIcon.jsx";
import { ConceptCard } from "./Cards.jsx";
import { ConceptDetailModal } from "./ConceptDetailModal.jsx";
import s from "../styles.js";

export function MarketplacePage({ user, onBuy, saved, onToggleSave }) {
  const [concepts, setConcepts]   = useState([]);
  const [error, setError]         = useState(null);
  const [detailState, setDetail]  = useState(null);
  const [search, setSearch]       = useState("");
  const [types, setTypes]         = useState(new Set(ALL_TYPES));
  const [minPrice, setMinPrice]   = useState("");
  const [maxPrice, setMaxPrice]   = useState("");
  const [sort, setSort]           = useState("default");

  const savedIds = new Set(saved.map((c) => c.id));

  // Quando l'utente acquista, rimuovi il concetto dalla lista locale
  // senza dover ricaricare tutto dal server
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

  const visible = concepts
    .filter((c) => types.has(c.type))
    .filter((c) => {
      const q = search.toLowerCase();
      return !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    })
    .filter((c) => minPrice === "" || c.price >= parseFloat(minPrice))
    .filter((c) => maxPrice === "" || c.price <= parseFloat(maxPrice))
    .sort((a, b) => {
      if (sort === "price_asc")  return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "title_az")   return a.title.localeCompare(b.title);
      return 0;
    });

  return (
    <div style={s.marketLayout}>
      <aside style={s.sidebar}>
        <p style={s.sidebarSection}>Cerca</p>
        <input
          style={s.sidebarInput}
          placeholder="titolo o descrizione…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <hr style={s.sidebarRule} />

        <p style={s.sidebarSection}>Tipo</p>
        {ALL_TYPES.map((t) => (
          <label key={t} style={s.filterRow}>
            <input type="checkbox" checked={types.has(t)} onChange={() => toggleType(t)} style={{ accentColor: "var(--color-accent)" }} />
            <Badge type={t} />
          </label>
        ))}

        <hr style={s.sidebarRule} />

        <p style={{ ...s.sidebarSection, display: "flex", alignItems: "center", gap: 5 }}>
          Costo <CoinIcon size={11} variant="outline" />
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...s.sidebarInput, width: "50%" }} type="number" placeholder="min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          <input style={{ ...s.sidebarInput, width: "50%" }} type="number" placeholder="max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </div>

        <hr style={s.sidebarRule} />

        <p style={s.sidebarSection}>Ordina</p>
        {SORT_OPTIONS.map((o) => (
          <label key={o.value} style={s.filterRow}>
            <input type="radio" name="sort" checked={sort === o.value} onChange={() => setSort(o.value)} style={{ accentColor: "var(--color-accent)" }} />
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--color-fg)" }}>{o.label}</span>
          </label>
        ))}
      </aside>

      <main style={s.marketMain}>
        {error && <p style={s.errorMsg}>{error}</p>}
        <p style={s.marketLabel}>{visible.length} oggetti</p>
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
