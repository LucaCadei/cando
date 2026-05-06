import { useState } from "react";
import { Badge } from "./Badge.jsx";
import { CoinAmount } from "./CoinIcon.jsx";
import { API } from "../constants.js";
import s from "../styles.js";

export function ConceptCard({ concept, onOpenDetail, isSaved, isOwned }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ ...s.conceptCard, borderColor: hovered ? "var(--color-grey-400)" : "var(--color-grey-100)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Badge type={concept.type} />
        {concept.owner_id && (
          <span style={s.secondaManoBadge}>
            <svg width="9" height="9" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="10" cy="7.5" r="3.5"/><path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" strokeLinecap="round"/></svg>
            seconda mano
          </span>
        )}
      </div>
      <p style={s.conceptTitle}>{concept.title}</p>
      <p style={s.conceptDesc}>{concept.description}</p>
      <div style={s.conceptFooter}>
        {isOwned ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <CoinAmount amount={Math.round(concept.price)} size="sm" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-fg-muted)" }}>tuo</span>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button style={isSaved ? s.btnSaveActive : s.btnSave} onClick={() => onOpenDetail(concept, "save")}>
                {isSaved ? "salvato" : "salva"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <CoinAmount amount={Math.round(concept.price)} size="sm" />
              <button style={s.btnPrimary} onClick={() => onOpenDetail(concept, "buy")}>acquista</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function OwnedCard({ concept, onRelist, onUnlist, pendingOffers = [], onAcceptOffer, onRejectOffer }) {
  const [relisting, setRelisting]         = useState(false);
  const [price, setPrice]                 = useState(String(Math.round(concept.price)));
  // Due loading state separati per evitare che relist/unlist e rifiuto offerta
  // si blocchino a vicenda se l'utente interagisce con entrambi quasi contemporaneamente
  const [listLoading, setListLoading]     = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  // rejectingId tiene traccia di quale offerta ha il form di rifiuto aperto (una alla volta)
  const [rejectingId, setRejectingId]     = useState(null);
  const [rejectMessage, setRejectMessage] = useState("");
  const isListed  = concept.listed;
  const hasOffers = pendingOffers.length > 0;

  const handleConfirm = async () => {
    const p = parseFloat(price);
    if (!p || p < 0) return;
    setListLoading(true);
    const ok = await onRelist(concept, p);
    setListLoading(false);
    if (ok) setRelisting(false);
  };

  const handleUnlist = async () => {
    setListLoading(true);
    await onUnlist(concept);
    setListLoading(false);
  };

  return (
    <div style={{ ...s.profileCard, ...(hasOffers ? { background: "linear-gradient(135deg, #E8EFFE 0%, var(--color-white) 65%)", borderColor: "#C5D3F8" } : {}) }}>
      <Badge type={concept.type} />
      <p style={s.profileCardTitle}>{concept.title}</p>
      <p style={s.profileCardDesc}>{concept.description}</p>
      {hasOffers && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {pendingOffers.map((offer) => (
            <div key={offer.id} style={{ background: "#EEF2FE", border: "1px solid #C5D3F8", borderRadius: 3, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#3B5FBF", letterSpacing: "0.04em" }}>offerta da {offer.buyer_username}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#3B5FBF", fontWeight: 500 }}>{Math.round(offer.amount).toLocaleString("it-IT")}</span>
                  {offer.message && <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#5570C2", fontStyle: "italic", marginTop: 2 }}>"{offer.message}"</span>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={s.offerAcceptBtn} onClick={() => onAcceptOffer(offer.id)} title="accetta">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><polyline points="1 5.5 4 8.5 10 2"/></svg>
                  </button>
                  <button style={s.offerRejectBtn} onClick={() => { setRejectingId(offer.id); setRejectMessage(""); }} title="rifiuta">
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="1" y1="1" x2="8" y2="8"/><line x1="8" y1="1" x2="1" y2="8"/></svg>
                  </button>
                </div>
              </div>
              {rejectingId === offer.id && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <textarea
                    placeholder="messaggio opzionale…"
                    value={rejectMessage}
                    onChange={(e) => setRejectMessage(e.target.value)}
                    rows={2}
                    style={{ ...s.sidebarInput, resize: "none", fontFamily: "var(--font-ui)", fontSize: 12, lineHeight: 1.5 }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ ...s.btnPrimary, fontSize: 10, padding: "4px 10px", background: "#DC2626", borderColor: "#DC2626" }}
                      onClick={async () => { setRejectLoading(true); await onRejectOffer(offer.id, rejectMessage.trim() || null); setRejectLoading(false); setRejectingId(null); }}>
                      {rejectLoading ? "…" : "conferma rifiuto"}
                    </button>
                    <button style={{ ...s.btnGhost, fontSize: 10, padding: "4px 10px" }} onClick={() => setRejectingId(null)}>annulla</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={s.profileCardFooter}>
        {isListed ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <CoinAmount amount={Math.round(concept.price)} size="sm" />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#2A5040" }}>in vendita</span>
              <button style={{ ...s.btnGhost, fontSize: 10, padding: "3px 10px", opacity: listLoading ? 0.5 : 1 }}
                onClick={handleUnlist} disabled={listLoading}>
                {listLoading ? "…" : "ritira"}
              </button>
            </div>
          </div>
        ) : relisting ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
              style={{ ...s.sidebarInput, width: 72, padding: "5px 8px" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-fg-muted)" }}>cc</span>
            <button style={{ ...s.btnPrimary, fontSize: 10, padding: "5px 12px", opacity: listLoading ? 0.5 : 1 }}
              onClick={handleConfirm} disabled={listLoading}>{listLoading ? "…" : "conferma"}</button>
            <button style={{ ...s.btnGhost, fontSize: 10, padding: "5px 10px" }}
              onClick={() => setRelisting(false)}>annulla</button>
          </div>
        ) : (
          <>
            <CoinAmount amount={Math.round(concept.price)} size="sm" />
            <button style={s.btnGhost} onClick={() => setRelisting(true)}>metti in vendita</button>
          </>
        )}
      </div>
    </div>
  );
}

export function SavedCard({ concept, onRemove }) {
  const [removing, setRemoving] = useState(false);
  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(concept);
  };
  return (
    <div style={s.profileCard}>
      <Badge type={concept.type} />
      <p style={s.profileCardTitle}>{concept.title}</p>
      <p style={s.profileCardDesc}>{concept.description}</p>
      <div style={s.profileCardFooter}>
        <CoinAmount amount={Math.round(concept.price)} size="sm" />
        <button style={{ ...s.btnGhost, opacity: removing ? 0.5 : 1 }} onClick={handleRemove} disabled={removing}>
          {removing ? "…" : "rimuovi"}
        </button>
      </div>
    </div>
  );
}

export function PublicConceptCard({ concept, currentUser, onMakeOffer }) {
  const [offering, setOffering] = useState(false);
  const [amount, setAmount]     = useState(String(Math.round(concept.price)));
  const [message, setMessage]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState(null);
  const canOffer = currentUser && currentUser.id !== concept.owner_id;

  const handleSend = async () => {
    const a = parseFloat(amount);
    if (!a || a < 0) return;
    setLoading(true);
    setError(null);
    const ok = await onMakeOffer(concept.id, a, message.trim() || null);
    setLoading(false);
    if (ok) { setSent(true); setOffering(false); }
    else setError("Errore nell'invio dell'offerta.");
  };

  return (
    <div style={s.profileCard}>
      <Badge type={concept.type} />
      <p style={s.profileCardTitle}>{concept.title}</p>
      <p style={s.profileCardDesc}>{concept.description}</p>
      <div style={s.profileCardFooter}>
        <CoinAmount amount={Math.round(concept.price)} size="sm" />
        {canOffer && !sent && (
          <button style={s.btnGhost} onClick={() => setOffering((o) => !o)}>
            {offering ? "annulla" : "offri"}
          </button>
        )}
        {sent && <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--color-fg-muted)" }}>offerta inviata</span>}
      </div>
      {offering && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <textarea
            placeholder="perché lo vuoi?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            style={{ ...s.sidebarInput, resize: "none", fontFamily: "var(--font-ui)", fontSize: 12, lineHeight: 1.5 }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              style={{ ...s.sidebarInput, width: 80, padding: "5px 8px" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-fg-muted)" }}>cc</span>
            <button style={{ ...s.btnPrimary, fontSize: 10, padding: "5px 12px", opacity: loading ? 0.5 : 1 }}
              onClick={handleSend} disabled={loading}>{loading ? "…" : "invia"}</button>
          </div>
          {error && <p style={s.cardError}>{error}</p>}
        </div>
      )}
    </div>
  );
}
