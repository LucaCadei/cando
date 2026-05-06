import { useState, useEffect } from "react";
import { API } from "../constants.js";
import { Badge } from "./Badge.jsx";
import { CoinAmount } from "./CoinIcon.jsx";
import s from "../styles.js";

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

  useEffect(() => {
    fetch(`${API}/concepts/${concept.id}/detail`)
      .then((r) => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [concept.id]);

  const handleConfirm = async () => {
    setError(null);
    setConfirm(true);
    try {
      if (mode === "buy") {
        const res = await fetch(`${API}/concepts/${concept.id}/buy`, {
          method: "POST",
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Errore");
        onBuy(concept, data.coins);
      } else {
        await onToggleSave(concept);
      }
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirm(false);
    }
  };

  const isSaveMode   = mode === "save";
  const alreadySaved = isSaveMode && isSaved;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.detailModal} onClick={(e) => e.stopPropagation()}>
        <button style={s.modalClose} onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
        </button>

        <Badge type={concept.type} />
        <p style={{ ...s.conceptTitle, fontSize: 36, fontWeight: 300, marginTop: 16, marginBottom: 20 }}>{concept.title}</p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 17, lineHeight: 1.75, color: "var(--color-fg-secondary)", marginBottom: 32 }}>
          {concept.description}
        </p>

        <hr style={{ border: "none", borderTop: "1px solid var(--color-grey-100)", marginBottom: 24 }} />

        <div style={{ display: "flex", gap: 40 }}>
          <div style={{ flex: 1 }}>
            {detail?.current_owner && (
              <>
                <p style={s.sidebarSection}>proprietario attuale</p>
                <div style={{ marginTop: 8, marginBottom: 20 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-fg-secondary)", background: "var(--color-accent-subtle)", border: "1px solid var(--color-accent-light)", borderRadius: 2, padding: "3px 8px" }}>{detail.current_owner}</span>
                </div>
              </>
            )}
            <p style={s.sidebarSection}>proprietari precedenti</p>
            {loading ? (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--color-fg-muted)", marginTop: 8 }}>…</p>
            ) : detail?.past_owners?.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {detail.past_owners.map((u) => (
                  <span key={u} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-fg-secondary)", background: "var(--color-bg-subtle)", border: "1px solid var(--color-grey-100)", borderRadius: 2, padding: "3px 8px" }}>{u}</span>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--color-fg-muted)", marginTop: 8, fontStyle: "italic" }}>nessuno</p>
            )}
          </div>
          <div>
            <p style={s.sidebarSection}>salvato da</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 300, color: "var(--color-fg)", marginTop: 8 }}>
              {loading ? "…" : detail?.save_count ?? 0}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 36 }}>
          {isSaveMode
            ? <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--color-fg-muted)" }}>{alreadySaved ? "già nei tuoi salvati" : "gratis — solo per te"}</span>
            : <CoinAmount amount={Math.round(concept.price)} size="lg" />
          }
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--color-error)" }}>{error}</p>}
            <button
              style={{ ...s.btnPrimary, padding: "10px 28px", fontSize: 12, opacity: confirming ? 0.5 : 1 }}
              onClick={handleConfirm}
              disabled={confirming}
            >
              {confirming ? "…" : isSaveMode ? (alreadySaved ? "rimuovi dai salvati" : "salva") : "conferma acquisto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
