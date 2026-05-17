import { useState } from "react";
import { OwnedCard, SavedCard } from "./Cards.jsx";
import { ConceptDetailModal } from "./ConceptDetailModal.jsx";
import { CoinAmount } from "./CoinIcon.jsx";
import s from "../styles.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

const INK = "#0E0E0C";
const BG  = "#E5E4DF";
const YEL = "#FFD43A";
const DIM = "#5C5A52";
const VIO = "#7C4DFF";

const PROFILE_TABS = [
  { id: "acquistati",   label: "acquistati" },
  { id: "salvati",      label: "salvati" },
  { id: "aste",         label: "aste" },
  { id: "storico",      label: "storico" },
  { id: "impostazioni", label: "impostazioni" },
];

function SettingsSection({ user, onLogout }) {
  return (
    <div style={{ maxWidth: 440 }}>
      <div style={{ background: BG, border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, marginBottom: 20 }}>
        <div style={{ padding: "6px 20px", borderBottom: `2px solid ${INK}`, background: YEL }}>
          <span style={{ fontFamily: "var(--f-body)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>account</span>
        </div>
        <div style={{ padding: "0 20px" }}>
          {[["username", user.username], ["email", user.email]].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `2px solid ${INK}` }}>
              <span style={{ fontFamily: "var(--f-body)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: DIM }}>{label}</span>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 13, color: INK }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
      <button
        style={{ ...s.btnGhost, color: "#FF3B30", borderColor: "#FF3B30" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#FF3B30"; e.currentTarget.style.color = BG; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = BG; e.currentTarget.style.color = "#FF3B30"; }}
        onClick={onLogout}
      >
        esci dall'account
      </button>
    </div>
  );
}

export function ProfilePage({ user, purchases, saved, purchaseHistory = [], receivedOffers, sentOfferUpdates = [], followNotifs = [], auctionNotifs = [], myBids = [], onFollowBack, onToggleSave, onRelist, onUnlist, onStartAuction, onAcceptOffer, onRejectOffer, onLogout, onBack, onOpenAuction }) {
  const [tab, setTab] = useState("acquistati");
  const [detailConcept, setDetailConcept] = useState(null);
  const isMobile = useIsMobile();

  // Raggruppa le offerte pendenti per concept_id in modo che OwnedCard
  // riceva solo le proprie offerte
  const offersByConceptId = (receivedOffers ?? []).reduce((acc, o) => {
    acc[o.concept_id] = acc[o.concept_id] ? [...acc[o.concept_id], o] : [o];
    return acc;
  }, {});

  return (
    <div style={s.profileWrap}>
      <div style={isMobile ? s.profileInnerMobile : s.profileInner}>

        <button style={s.profileBack} onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <polyline points="9 2 5 7 9 12"/>
          </svg>
          &nbsp;la piazza
        </button>

        {/* ── Hero utente ─────────────────────────────────────── */}
        <div style={{
          background: VIO, border: `2px solid ${INK}`,
          boxShadow: `6px 6px 0 ${INK}`,
          padding: "28px 32px",
          display: "flex", alignItems: "center", gap: 24,
          marginBottom: 28,
        }}>
          <div style={{
            width: 80, height: 80, flexShrink: 0,
            background: INK, color: BG,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--f-body)", fontWeight: 900, fontSize: 40,
            boxShadow: `4px 4px 0 rgba(0,0,0,0.30)`,
          }}>
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontFamily: "var(--f-body)", fontWeight: 900, fontSize: 36, color: BG, margin: 0, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {user.username}
            </p>
            <p style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "rgba(229,228,223,0.70)", margin: "8px 0 0", letterSpacing: "0.04em" }}>
              {user.email}
            </p>
          </div>
        </div>

        {/* ── Stats strip gialla ───────────────────────────────── */}
        <div style={isMobile ? s.profileStatsMobile : s.profileStats}>
          <div style={isMobile
            ? { ...s.profileStatItemMobile, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderBottom: `2px solid ${INK}`, borderRight: `2px solid ${INK}` }
            : { ...s.profileStatItem, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <CoinAmount amount={user.coins} size="lg" />
            <p style={{ ...s.statLabel, marginTop: 6 }}>saldo</p>
          </div>
          {!isMobile && <div style={s.profileStatDivider} />}
          <div style={isMobile
            ? { ...s.profileStatItemMobile, borderBottom: `2px solid ${INK}` }
            : s.profileStatItem}>
            <p style={s.profileStatNum}>{purchaseHistory.reduce((acc, h) => acc + h.price, 0).toLocaleString("it-IT")}</p>
            <p style={s.statLabel}>portafoglio cc</p>
          </div>
          {!isMobile && <div style={s.profileStatDivider} />}
          <div style={isMobile
            ? { ...s.profileStatItemMobile, borderRight: `2px solid ${INK}` }
            : s.profileStatItem}>
            <p style={s.profileStatNum}>{purchases.length}</p>
            <p style={s.statLabel}>acquistati</p>
          </div>
          {!isMobile && <div style={s.profileStatDivider} />}
          <div style={isMobile ? s.profileStatItemMobile : s.profileStatItem}>
            <p style={s.profileStatNum}>{saved.length}</p>
            <p style={s.statLabel}>salvati</p>
          </div>
        </div>

        {/* ── Notifiche aste ──────────────────────────────────── */}
        {auctionNotifs.length > 0 && (
          <div style={{ marginBottom: 36, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ ...s.sidebarSection, marginBottom: 4 }}>aste in corso</p>
            {auctionNotifs.map((n) => {
              const endsAt = new Date(n.ends_at);
              const secsLeft = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
              const h = Math.floor(secsLeft / 3600);
              const m = Math.floor((secsLeft % 3600) / 60);
              const timeLabel = secsLeft <= 0 ? "terminata"
                : h > 0   ? `${h}h ${m}m rimaste`
                : m > 0   ? `${m} min rimasti`
                : `< 1 min`;
              return (
                <div key={n.id} style={{
                  background: BG,
                  border: `2px solid ${VIO}`,
                  boxShadow: `4px 4px 0 ${VIO}`,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  cursor: "pointer",
                }}
                  onClick={() => onOpenAuction?.(n.auction_id)}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{
                        fontFamily: "var(--f-mono)", fontSize: 9, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                        background: VIO, color: BG, padding: "2px 6px",
                      }}>asta</span>
                      <span style={{ fontFamily: "var(--f-body)", fontSize: 13, fontWeight: 700, color: INK }}>
                        {n.concept_title}
                      </span>
                    </div>
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: DIM }}>
                      {n.seller_username} · min {n.min_price.toLocaleString("it-IT")} cc · {timeLabel}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenAuction?.(n.auction_id); }}
                    style={{
                      fontFamily: "var(--f-body)", fontSize: 11, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      padding: "6px 14px",
                      border: `2px solid ${VIO}`,
                      background: VIO, color: BG,
                      cursor: "pointer",
                      boxShadow: `2px 2px 0 ${INK}`,
                      flexShrink: 0,
                      transition: "transform 0.1s, box-shadow 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = "none"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `2px 2px 0 ${INK}`; }}
                  >
                    vai →
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Notifiche follower ──────────────────────────────── */}
        {followNotifs.length > 0 && (
          <div style={{ marginBottom: 36, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ ...s.sidebarSection, marginBottom: 4 }}>nuovi follower</p>
            {followNotifs.map((n) => (
              <div key={n.id} style={{
                background: BG,
                border: `2px solid ${INK}`,
                boxShadow: `4px 4px 0 ${INK}`,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, background: INK, color: BG,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--f-body)", fontWeight: 900, fontSize: 14,
                    flexShrink: 0,
                  }}>
                    {n.from_username[0].toUpperCase()}
                  </div>
                  <div>
                    <span style={{ fontFamily: "var(--f-body)", fontSize: 14, fontWeight: 700, color: INK }}>
                      {n.from_username}
                    </span>
                    <span style={{ fontFamily: "var(--f-body)", fontSize: 12, color: DIM, marginLeft: 6 }}>
                      ti sta seguendo
                    </span>
                  </div>
                </div>
                {n.is_mutual ? (
                  <span style={{
                    fontFamily: "var(--f-mono)", fontSize: 11, fontWeight: 600,
                    color: VIO, whiteSpace: "nowrap",
                  }}>
                    ✓ vi seguite a vicenda
                  </span>
                ) : (
                  <button
                    onClick={() => onFollowBack?.(n.from_user_id)}
                    style={{
                      fontFamily: "var(--f-body)", fontSize: 11, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      padding: "6px 14px",
                      border: `2px solid ${INK}`,
                      background: YEL, color: INK,
                      cursor: "pointer",
                      boxShadow: `2px 2px 0 ${INK}`,
                      flexShrink: 0,
                      transition: "transform 0.1s, box-shadow 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = "none"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `2px 2px 0 ${INK}`; }}
                  >
                    segui anche tu
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Aggiornamenti offerte inviate ────────────────────── */}
        {sentOfferUpdates.length > 0 && (
          <div style={{ marginBottom: 36, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ ...s.sidebarSection, marginBottom: 4 }}>aggiornamenti sulle tue offerte</p>
            {sentOfferUpdates.map((o) => (
              <div key={o.id} style={{
                background: o.status === "accepted" ? "#E8FFEC" : "#FFF0F0",
                border: `2px solid ${o.status === "accepted" ? "#00C896" : "#FF3B30"}`,
                padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--f-body)", fontSize: 15, fontWeight: 700, color: INK }}>{o.concept_title}</span>
                  <span style={{ fontFamily: "var(--f-mono)", fontSize: 13, fontWeight: 700, color: o.status === "accepted" ? "#00C896" : "#FF3B30" }}>
                    {o.status === "accepted" ? "✓" : "✗"}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--f-body)", fontSize: 11, fontWeight: 500, color: DIM }}>
                  {o.status === "accepted" ? "accettata" : "rifiutata"} da {o.seller_username} · {Math.round(o.amount).toLocaleString("it-IT")} cc
                  {o.resolved_at && ` · ${new Date(o.resolved_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}`}
                </span>
                {o.status === "rejected" && o.reject_message && (
                  <span style={{ fontFamily: "var(--f-body)", fontSize: 11, color: "#FF3B30", fontStyle: "italic" }}>"{o.reject_message}"</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Tab bar ─────────────────────────────────────────── */}
        <div style={isMobile ? { ...s.profileTabBar, overflowX: "auto", flexWrap: "nowrap", WebkitOverflowScrolling: "touch" } : s.profileTabBar}>
          {PROFILE_TABS.map(({ id, label }) => {
            const count = id === "acquistati" ? purchases.length : id === "salvati" ? saved.length : id === "aste" ? myBids.length : id === "storico" ? purchaseHistory.length : null;
            return (
              <button
                key={id}
                style={{ ...s.profileTab, ...(tab === id ? s.profileTabActive : {}) }}
                onClick={() => setTab(id)}
              >
                {label}
                {count !== null && count > 0 && (
                  <span style={s.profileTabBadge}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Contenuto tab ────────────────────────────────────── */}
        <div style={s.profileContent}>
          {tab === "acquistati" && (
            purchases.length === 0
              ? <p style={s.profileEmpty}>Non hai ancora acquistato nessun concetto.</p>
              : <div style={s.profileGrid}>
                  {purchases.map((c) => (
                    <OwnedCard
                      key={c.id} concept={c}
                      onRelist={onRelist} onUnlist={onUnlist}
                      onStartAuction={onStartAuction}
                      onOpenDetail={setDetailConcept}
                      pendingOffers={offersByConceptId[c.id] ?? []}
                      onAcceptOffer={onAcceptOffer} onRejectOffer={onRejectOffer}
                    />
                  ))}
                </div>
          )}
          {tab === "salvati" && (
            saved.length === 0
              ? <p style={s.profileEmpty}>Non hai ancora salvato nessun concetto.</p>
              : <div style={s.profileGrid}>
                  {saved.map((c) => <SavedCard key={c.id} concept={c} onRemove={onToggleSave} />)}
                </div>
          )}
          {tab === "aste" && (
            myBids.length === 0
              ? <p style={s.profileEmpty}>Non stai partecipando a nessuna asta attiva.</p>
              : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {myBids.map((auction) => {
                    const secsLeft = Math.max(0, Math.floor((new Date(auction.ends_at) - Date.now()) / 1000));
                    const h = Math.floor(secsLeft / 3600);
                    const m = Math.floor((secsLeft % 3600) / 60);
                    const timeLabel = secsLeft <= 0 ? "terminata"
                      : h > 0 ? `${h}h ${m}m rimaste`
                      : m > 0 ? `${m} min rimasti`
                      : "< 1 min";
                    const myTopBid = Math.max(...auction.bids.filter((b) => b.bidder_id === user.id).map((b) => b.amount));
                    const isWinning = auction.current_bid === myTopBid;
                    return (
                      <div
                        key={auction.id}
                        onClick={() => onOpenAuction?.(auction.id)}
                        style={{
                          background: BG, border: `2px solid ${INK}`,
                          boxShadow: `4px 4px 0 ${INK}`,
                          padding: "14px 18px",
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{
                              fontFamily: "var(--f-mono)", fontSize: 9, fontWeight: 700,
                              textTransform: "uppercase", letterSpacing: "0.08em",
                              background: isWinning ? YEL : INK, color: isWinning ? INK : BG,
                              padding: "2px 6px", flexShrink: 0,
                            }}>
                              {isWinning ? "in testa" : "superato"}
                            </span>
                            <span style={{ fontFamily: "var(--f-body)", fontSize: 14, fontWeight: 700, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {auction.concept?.title}
                            </span>
                          </div>
                          <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: DIM }}>
                            {auction.seller_username} · tua offerta: {myTopBid.toLocaleString("it-IT")} cc · {timeLabel}
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onOpenAuction?.(auction.id); }}
                          style={{
                            fontFamily: "var(--f-body)", fontSize: 11, fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.08em",
                            padding: "6px 14px", border: `2px solid ${VIO}`,
                            background: VIO, color: BG, cursor: "pointer",
                            boxShadow: `2px 2px 0 ${INK}`, flexShrink: 0,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = "none"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `2px 2px 0 ${INK}`; }}
                        >
                          vai →
                        </button>
                      </div>
                    );
                  })}
                </div>
          )}
          {tab === "storico" && (
            purchaseHistory.length === 0
              ? <p style={s.profileEmpty}>Nessun acquisto ancora.</p>
              : <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {[...purchaseHistory].reverse().map((h) => (
                    <div key={`${h.concept_id}-${h.purchased_at}`} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 16px",
                      borderBottom: `1px solid rgba(14,14,12,0.10)`,
                    }}>
                      <span style={{
                        fontFamily: "var(--f-mono)", fontSize: 9, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        background: INK, color: BG, padding: "2px 6px", flexShrink: 0,
                      }}>
                        {h.concept_type}
                      </span>
                      <span style={{ fontFamily: "var(--f-body)", fontSize: 13, fontWeight: 700, color: INK, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {h.concept_title}
                      </span>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: VIO, fontWeight: 700, flexShrink: 0 }}>
                        {h.price.toLocaleString("it-IT")} cc
                      </span>
                      <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: DIM, flexShrink: 0 }}>
                        {new Date(h.purchased_at).toLocaleDateString("it-IT", { dateStyle: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
          )}
          {tab === "impostazioni" && <SettingsSection user={user} onLogout={onLogout} />}
        </div>

      </div>

      {detailConcept && (
        <ConceptDetailModal
          concept={detailConcept}
          mode="view"
          isSaved={saved.some((c) => c.id === detailConcept.id)}
          user={user}
          onBuy={null}
          onToggleSave={onToggleSave}
          onClose={() => setDetailConcept(null)}
        />
      )}

    </div>
  );
}
