import { useState, useEffect } from "react";
import { API } from "../constants.js";
import { Badge } from "./Badge.jsx";
import { CoinAmount } from "./CoinIcon.jsx";
import s from "../styles.js";

const INK = "#0E0E0C";
const VIO = "#7C4DFF";
const DIM = "#5C5A52";

/**
 * Modale di dettaglio di un concetto.
 * mode="buy"  → mostra il pulsante di acquisto
 * mode="save" → mostra il pulsante per salvare/rimuovere dai salvati
 */
export function ConceptDetailModal({ concept, mode, isSaved, user, onBuy, onToggleSave, onClose }) {
  const [detail, setDetail]      = useState(null);
  const [loading, setLoading]    = useState(true);
  const [confirming, setConfirm] = useState(false);
  const [error, setError]        = useState(null);

  const isOwner = user?.id === concept.owner_id;

  useEffect(() => {
    fetch(`${API}/concepts/${concept.id}/detail`)
      .then((r) => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [concept.id]);

  const handleBuy = async () => {
    setError(null);
    setConfirm(true);
    try {
      const res = await fetch(`${API}/concepts/${concept.id}/buy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Errore");
      onBuy(concept, data.coins);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirm(false);
    }
  };

  const handleSave = async () => {
    await onToggleSave(concept);
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.detailModal} onClick={(e) => e.stopPropagation()}>

        <button style={s.modalClose} onClick={onClose} aria-label="chiudi">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <line x1="1" y1="1" x2="13" y2="13"/>
            <line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>

        {/* ── Header: testo a sinistra, immagine a destra ─── */}
        <div style={{ display: "flex", gap: 28, marginBottom: 28 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Badge type={concept.type} />
            <p style={{ fontFamily: "var(--f-body)", fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.0, marginTop: 14, marginBottom: 14 }}>
              {concept.title}
            </p>
            <p style={{ fontFamily: "var(--f-body)", fontSize: 14, lineHeight: 1.65, color: DIM, fontWeight: 500, margin: 0 }}>
              {concept.description}
            </p>
          </div>

          {concept.wikipedia_thumbnail && (
            <div style={{ width: 150, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <img
                src={concept.wikipedia_thumbnail}
                alt={concept.title}
                style={{ width: "100%", height: 200, objectFit: "cover", objectPosition: "center top", display: "block", border: `2px solid ${INK}` }}
              />
              {concept.wikipedia_url && (
                <a
                  href={concept.wikipedia_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: VIO, textDecoration: "none", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 2H2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V6M6 1h3m0 0v3M9 1 5 5"/>
                  </svg>
                  wikipedia
                </a>
              )}
            </div>
          )}
        </div>

        {/* Linea separatrice */}
        <div style={{ height: 2, background: INK, marginBottom: 24 }} />

        {/* Metadati: proprietario, storia, salvataggi */}
        <div style={{ display: "flex", gap: 40, marginBottom: 32 }}>
          <div style={{ flex: 1 }}>
            {detail?.current_owner && (
              <>
                <p style={s.sidebarSection}>proprietario attuale</p>
                <div style={{ marginTop: 8, marginBottom: 20 }}>
                  <span style={{
                    fontFamily: "var(--f-mono)", fontSize: 11, fontWeight: 500,
                    color: VIO, background: "#EDE9FF", border: `2px solid ${VIO}`,
                    padding: "3px 8px", display: "inline-block",
                  }}>
                    {detail.current_owner}
                  </span>
                </div>
              </>
            )}
            <p style={s.sidebarSection}>cronologia acquisti</p>
            {loading ? (
              <p style={{ fontFamily: "var(--f-body)", fontSize: 12, color: DIM, marginTop: 8 }}>…</p>
            ) : detail?.ownership_history?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                {detail.ownership_history.map((r, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 10px",
                    background: "#EDE9DC", border: `2px solid ${INK}`,
                  }}>
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, fontWeight: 700, color: INK }}>
                      {r.username}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: DIM }}>
                        {r.price.toLocaleString("it-IT")} cc
                      </span>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: DIM }}>
                        {new Date(r.purchased_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: "var(--f-body)", fontSize: 12, color: DIM, marginTop: 8, fontStyle: "italic" }}>nessuno</p>
            )}
          </div>

          <div>
            <p style={s.sidebarSection}>salvato da</p>
            <p style={{ fontFamily: "var(--f-body)", fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", color: INK, marginTop: 8 }}>
              {loading ? "…" : detail?.save_count ?? 0}
            </p>
          </div>
        </div>

        {/* CTA — nascosto se l'utente è già il proprietario */}
        {!isOwner && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${INK}`, paddingTop: 20 }}>
            <CoinAmount amount={Math.round(concept.price)} size="lg" />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              {error && <p style={{ fontFamily: "var(--f-body)", fontSize: 11, fontWeight: 700, color: "#FF3B30" }}>{error}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  style={{ ...s.btnSave, ...(isSaved ? s.btnSaveActive : {}), padding: "12px 20px" }}
                  onClick={handleSave}
                >
                  {isSaved ? "salvato" : "salva"}
                </button>
                <button
                  style={{ ...s.btnPrimary, padding: "12px 28px", opacity: confirming ? 0.5 : 1 }}
                  onMouseEnter={(e) => { if (!confirming) { e.currentTarget.style.transform = "translate(4px,4px)"; e.currentTarget.style.boxShadow = "none"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `4px 4px 0 ${VIO}`; }}
                  onClick={handleBuy}
                  disabled={confirming}
                >
                  {confirming ? "…" : "acquista"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
