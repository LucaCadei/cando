import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "./Badge.jsx";
import { CoinAmount } from "./CoinIcon.jsx";
import { API, WIKI_CATEGORIES } from "../constants.js";
import s from "../styles.js";

const INK = "#0E0E0C";
const BG  = "#E5E4DF";
const VIO = "#7C4DFF";
const YEL = "#FFD43A";
const DIM = "#5C5A52";

const IMG_H    = 150;
const IMG_PEEK = 70;   // quanto sporge sopra il bordo della card

function peekColor(concept) {
  return WIKI_CATEGORIES[concept.type]?.background ?? VIO;
}

// Wrapper uniforme per tutte le card: sempre IMG_PEEK di area immagine visibile sopra,
// poi la card (con bordo) che occupa il resto. flex: 1 sull'inner card garantisce
// altezze uguali nel grid anche quando le righe si equalizzano.
function CardContent({ concept, cardStyle, wrapperStyle = {}, onMouseEnter, onMouseLeave, children }) {
  return (
    <div
      style={{ position: "relative", paddingTop: IMG_PEEK, display: "flex", flexDirection: "column", ...wrapperStyle }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Area immagine: thumbnail o colore categoria come fallback */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", border: `2px solid ${INK}`, borderBottom: "none" }}>
        {concept.wikipedia_thumbnail ? (
          <img
            src={concept.wikipedia_thumbnail}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: peekColor(concept) }} />
        )}
      </div>

      {/* Card con bordo, semi-trasparente sopra l'immagine, cresce a riempire il wrapper */}
      <div style={{
        ...cardStyle,
        flex: 1,
        position: "relative",
        zIndex: 1,
        background: concept.wikipedia_thumbnail ? "rgba(229,228,223,0.70)" : (cardStyle.background ?? BG),
      }}>
        {children}
      </div>
    </div>
  );
}

// WikiThumbnail standalone — usato in AuctionPage, non nelle card
export function WikiThumbnail({ concept, height = 130, bordered = false }) {
  if (!concept.wikipedia_thumbnail) return null;
  const borderStyle = bordered
    ? { border: `2px solid ${INK}`, borderBottom: "none" }
    : { borderBottom: `2px solid ${INK}` };
  return (
    <div style={{ ...borderStyle, overflow: "hidden", height, flexShrink: 0 }}>
      <img
        src={concept.wikipedia_thumbnail}
        alt={concept.title}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}


// ── Concept card (marketplace) ─────────────────────────────────────────────
export function ConceptCard({ concept, onOpenDetail, isSaved, isOwned }) {
  const [hovered, setHovered] = useState(false);
  return (
    <CardContent
      concept={concept}
      cardStyle={{ ...s.conceptCard, boxShadow: hovered ? `8px 8px 0 ${VIO}` : `4px 4px 0 ${INK}` }}
      wrapperStyle={{ transform: hovered ? "translate(-4px,-4px)" : "none" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.conceptBody}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Badge type={concept.type} />
          {concept.owner_id && (
            <span style={s.secondaManoBadge}>
              <svg width="9" height="9" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="10" cy="7.5" r="3.5"/>
                <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" strokeLinecap="square"/>
              </svg>
              seconda mano
            </span>
          )}
        </div>
        <p style={s.conceptTitle}>{concept.title}</p>
        <p style={s.conceptDesc}>{concept.description}</p>
      </div>

      <div style={s.conceptFooter}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <CoinAmount amount={Math.round(concept.price)} size="sm" />
          {isOwned ? (
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: DIM }}>tuo</span>
          ) : (
            <button
              style={s.btnPrimary}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(4px,4px)"; e.currentTarget.style.boxShadow = "none"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `4px 4px 0 ${VIO}`; }}
              onClick={() => onOpenDetail(concept, "view")}
            >
              vedi
            </button>
          )}
        </div>
      </div>
    </CardContent>
  );
}


const DURATION_OPTIONS = [
  { label: "1 ora",       value: 60    },
  { label: "6 ore",       value: 360   },
  { label: "12 ore",      value: 720   },
  { label: "24 ore",      value: 1440  },
  { label: "3 giorni",    value: 4320  },
  { label: "1 settimana", value: 10080 },
];

// ── Owned card (profilo — concetti acquistati) ─────────────────────────────
export function OwnedCard({ concept, onRelist, onUnlist, onStartAuction, onOpenDetail, pendingOffers = [], onAcceptOffer, onRejectOffer }) {
  const navigate = useNavigate();

  const [relisting, setRelisting]           = useState(false);
  const [auctioning, setAuctioning]         = useState(false);
  const [price, setPrice]                   = useState(String(Math.round(concept.price)));
  const [minPrice, setMinPrice]             = useState(String(Math.round(concept.price)));
  const [duration, setDuration]             = useState(1440);
  const [listLoading, setListLoading]       = useState(false);
  const [auctionLoading, setAuctionLoading] = useState(false);
  const [rejectLoading, setRejectLoading]   = useState(false);
  const [rejectingId, setRejectingId]       = useState(null);
  const [rejectMessage, setRejectMessage]   = useState("");
  const isListed    = concept.listed;
  const isInAuction = concept.in_auction;
  const hasOffers   = pendingOffers.length > 0;

  const handleGoToAuction = async () => {
    const res = await fetch(`${API}/concepts/${concept.id}/active-auction`);
    if (res.ok) { const { id } = await res.json(); navigate(`/aste/${id}`); }
  };

  const handleStartAuction = async () => {
    const p = parseInt(minPrice, 10);
    if (!p || p <= 0) return;
    setAuctionLoading(true);
    const ok = await onStartAuction?.(concept.id, p, duration);
    setAuctionLoading(false);
    if (ok) setAuctioning(false);
  };

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

  const cardStyle = isInAuction
    ? { ...s.profileCard, borderColor: VIO, boxShadow: `4px 4px 0 ${VIO}` }
    : hasOffers
    ? { ...s.profileCard, borderColor: VIO }
    : s.profileCard;

  return (
    <CardContent concept={concept} cardStyle={cardStyle}>
      <div style={s.profileCardBody}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <Badge type={concept.type} />
          {onOpenDetail && (
            <button
              onClick={() => onOpenDetail(concept)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: DIM, fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = INK; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = DIM; }}
            >
              espandi ↗
            </button>
          )}
        </div>
        <p style={s.profileCardTitle}>{concept.title}</p>
        <p style={s.profileCardDesc}>{concept.description}</p>

        {hasOffers && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {pendingOffers.map((offer) => (
              <div key={offer.id} style={{ background: "#EDE9FF", border: `2px solid ${VIO}`, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: VIO, letterSpacing: "0.04em" }}>offerta da {offer.buyer_username}</span>
                    <CoinAmount amount={Math.round(offer.amount)} size="sm" />
                    {offer.message && (
                      <span style={{ fontFamily: "var(--f-body)", fontSize: 11, color: DIM, fontStyle: "italic", marginTop: 2 }}>"{offer.message}"</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={s.offerAcceptBtn} onClick={() => onAcceptOffer(offer.id)} title="accetta">
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><polyline points="1 5.5 4 8.5 10 2"/></svg>
                    </button>
                    <button style={s.offerRejectBtn} onClick={() => { setRejectingId(offer.id); setRejectMessage(""); }} title="rifiuta">
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"><line x1="1" y1="1" x2="8" y2="8"/><line x1="8" y1="1" x2="1" y2="8"/></svg>
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
                      style={{ ...s.sidebarInput, resize: "none", fontSize: 12, lineHeight: 1.5 }}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        style={{ ...s.btnPrimary, fontSize: 10, padding: "5px 10px", background: "#FF3B30", borderColor: "#FF3B30", boxShadow: `4px 4px 0 ${INK}`, opacity: rejectLoading ? 0.5 : 1 }}
                        onClick={async () => { setRejectLoading(true); await onRejectOffer(offer.id, rejectMessage.trim() || null); setRejectLoading(false); setRejectingId(null); }}
                      >
                        {rejectLoading ? "…" : "conferma rifiuto"}
                      </button>
                      <button style={{ ...s.btnGhost, fontSize: 10, padding: "5px 10px" }} onClick={() => setRejectingId(null)}>annulla</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={s.profileCardFooter}>
        {isInAuction ? (
          <>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", background: VIO, color: BG, padding: "3px 8px" }}>
              ● in asta
            </span>
            <button
              style={{ ...s.btnGhost, fontSize: 10, padding: "5px 10px", borderColor: VIO, color: VIO }}
              onMouseEnter={(e) => { e.currentTarget.style.background = VIO; e.currentTarget.style.color = BG; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = BG; e.currentTarget.style.color = VIO; }}
              onClick={handleGoToAuction}
            >
              vedi asta →
            </button>
          </>
        ) : isListed ? (
          <>
            <CoinAmount amount={Math.round(concept.price)} size="sm" />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#2A5040" }}>in vendita</span>
              <button style={{ ...s.btnGhost, fontSize: 10, padding: "5px 10px", opacity: listLoading ? 0.5 : 1 }} onClick={handleUnlist} disabled={listLoading}>
                {listLoading ? "…" : "ritira"}
              </button>
            </div>
          </>
        ) : relisting ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...s.sidebarInput, width: 72, padding: "6px 8px" }} />
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: DIM }}>cc</span>
            <button style={{ ...s.btnPrimary, fontSize: 10, padding: "6px 12px", opacity: listLoading ? 0.5 : 1 }} onClick={handleConfirm} disabled={listLoading}>
              {listLoading ? "…" : "conferma"}
            </button>
            <button style={{ ...s.btnGhost, fontSize: 10, padding: "6px 10px" }} onClick={() => { setRelisting(false); setAuctioning(false); }}>annulla</button>
          </div>
        ) : auctioning ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: DIM, whiteSpace: "nowrap" }}>min</span>
              <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} style={{ ...s.sidebarInput, width: 72, padding: "6px 8px" }} />
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: DIM }}>cc</span>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={{ ...s.sidebarInput, padding: "6px 8px", cursor: "pointer", fontFamily: "var(--f-mono)", fontSize: 10 }}>
                {DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ ...s.btnPrimary, fontSize: 10, padding: "6px 12px", background: VIO, borderColor: VIO, boxShadow: `4px 4px 0 ${INK}`, opacity: auctionLoading ? 0.5 : 1 }} onClick={handleStartAuction} disabled={auctionLoading}>
                {auctionLoading ? "…" : "avvia asta"}
              </button>
              <button style={{ ...s.btnGhost, fontSize: 10, padding: "6px 10px" }} onClick={() => setAuctioning(false)}>annulla</button>
            </div>
          </div>
        ) : (
          <>
            <CoinAmount amount={Math.round(concept.price)} size="sm" />
            <div style={{ display: "flex", gap: 6 }}>
              <button
                style={{ ...s.btnGhost, fontSize: 10, padding: "5px 10px" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = YEL; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = BG; }}
                onClick={() => { setRelisting(true); setAuctioning(false); }}
              >
                vendi
              </button>
              {onStartAuction && (
                <button
                  style={{ ...s.btnGhost, fontSize: 10, padding: "5px 10px", borderColor: VIO, color: VIO }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = VIO; e.currentTarget.style.color = BG; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = BG; e.currentTarget.style.color = VIO; }}
                  onClick={() => { setAuctioning(true); setRelisting(false); }}
                >
                  asta
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </CardContent>
  );
}


// ── Saved card (profilo — concetti salvati) ────────────────────────────────
export function SavedCard({ concept, onRemove }) {
  const [removing, setRemoving] = useState(false);
  const handleRemove = async () => { setRemoving(true); await onRemove(concept); };
  return (
    <CardContent concept={concept} cardStyle={s.profileCard}>
      <div style={s.profileCardBody}>
        <Badge type={concept.type} />
        <p style={s.profileCardTitle}>{concept.title}</p>
        <p style={s.profileCardDesc}>{concept.description}</p>
      </div>
      <div style={s.profileCardFooter}>
        <CoinAmount amount={Math.round(concept.price)} size="sm" />
        <button
          style={{ ...s.btnGhost, opacity: removing ? 0.5 : 1 }}
          onMouseEnter={(e) => { if (!removing) e.currentTarget.style.background = YEL; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = BG; }}
          onClick={handleRemove} disabled={removing}
        >
          {removing ? "…" : "rimuovi"}
        </button>
      </div>
    </CardContent>
  );
}


// ── Public concept card (profilo pubblico altrui) ──────────────────────────
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
    setLoading(true); setError(null);
    const ok = await onMakeOffer(concept.id, a, message.trim() || null);
    setLoading(false);
    if (ok) { setSent(true); setOffering(false); }
    else setError("Errore nell'invio dell'offerta.");
  };

  return (
    <CardContent concept={concept} cardStyle={s.profileCard}>
      <div style={s.profileCardBody}>
        <Badge type={concept.type} />
        <p style={s.profileCardTitle}>{concept.title}</p>
        <p style={s.profileCardDesc}>{concept.description}</p>
      </div>
      <div style={s.profileCardFooter}>
        <CoinAmount amount={Math.round(concept.price)} size="sm" />
        {canOffer && !sent && (
          <button
            style={s.btnGhost}
            onMouseEnter={(e) => { e.currentTarget.style.background = YEL; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = BG; }}
            onClick={() => setOffering((o) => !o)}
          >
            {offering ? "annulla" : "offri"}
          </button>
        )}
        {sent && <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: DIM }}>offerta inviata</span>}
      </div>
      {offering && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 20px 18px", borderTop: `2px solid ${INK}`, paddingTop: 14 }}>
          <textarea
            placeholder="perché lo vuoi?"
            value={message} onChange={(e) => setMessage(e.target.value)}
            rows={2} style={{ ...s.sidebarInput, resize: "none", fontSize: 12, lineHeight: 1.5 }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...s.sidebarInput, width: 88, padding: "6px 8px" }} />
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: DIM }}>cc</span>
            <button
              style={{ ...s.btnPrimary, fontSize: 10, padding: "6px 12px", opacity: loading ? 0.5 : 1 }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translate(4px,4px)"; e.currentTarget.style.boxShadow = "none"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `4px 4px 0 ${VIO}`; }}
              onClick={handleSend} disabled={loading}
            >
              {loading ? "…" : "invia"}
            </button>
          </div>
          {error && <p style={s.cardError}>{error}</p>}
        </div>
      )}
    </CardContent>
  );
}
