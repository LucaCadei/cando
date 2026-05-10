import { useNavigate } from "react-router-dom";

const INK   = "#0E0E0C";
const BG    = "#E5E4DF";
const VIO   = "#7C4DFF";
const YEL   = "#FFD43A";
const DIM   = "#5C5A52";
const GREEN = "#00C896";
const RED   = "#FF3B30";
const PINK  = "#FF5A8A";

export function NotifDropdown({
  receivedOffers,
  sentOfferUpdates,
  followNotifs,
  auctionNotifs,
  auctionActivityNotifs = [],
  saleNotifs = [],
  onFollowBack,
  onClose,
}) {
  const navigate = useNavigate();

  const go = (path) => { navigate(path); onClose(); };

  const total =
    receivedOffers.length +
    sentOfferUpdates.length +
    followNotifs.length +
    auctionNotifs.length +
    auctionActivityNotifs.length +
    saleNotifs.length;

  return (
    <div style={{
      position: "absolute",
      top: "calc(100% + 10px)",
      right: 0,
      width: 300,
      maxHeight: 480,
      overflowY: "auto",
      background: BG,
      border: `2px solid ${INK}`,
      boxShadow: `6px 6px 0 ${INK}`,
      zIndex: 9999,
    }}>

      {/* Header del pannello */}
      <div style={{
        padding: "8px 14px",
        background: INK, color: BG,
        fontFamily: "var(--f-mono)", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0,
      }}>
        notifiche
        {total > 0 && (
          <span style={{ background: VIO, color: BG, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>
            {total}
          </span>
        )}
      </div>

      {total === 0 && (
        <p style={{
          fontFamily: "var(--f-body)", fontSize: 12, color: DIM,
          padding: "24px 16px", textAlign: "center", margin: 0, fontStyle: "italic",
        }}>
          nessuna notifica
        </p>
      )}

      {/* ── Aste in corso ─────────────────────────────────── */}
      {auctionNotifs.length > 0 && (
        <Section label="aste in corso">
          {auctionNotifs.map((n) => (
            <NotifRow key={n.id} accent={VIO} onClick={() => go(`/aste/${n.auction_id}`)}>
              <span style={{ fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 700, color: INK }}>
                {n.concept_title}
              </span>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: DIM }}>
                {n.seller_username} · min {n.min_price.toLocaleString("it-IT")} cc
              </span>
            </NotifRow>
          ))}
        </Section>
      )}

      {/* ── Attività aste ─────────────────────────────────── */}
      {auctionActivityNotifs.length > 0 && (
        <Section label="attività aste">
          {auctionActivityNotifs.map((n) => {
            const accent =
              n.notif_type === "new_bid"      ? GREEN :
              n.notif_type === "auction_won"  ? GREEN :
              n.notif_type === "auction_sold" ? GREEN :
              RED;
            const label =
              n.notif_type === "new_bid"      ? `nuova offerta di ${n.bidder_username}: ${n.amount.toLocaleString("it-IT")} cc` :
              n.notif_type === "outbid"       ? `superato da ${n.bidder_username}: ${n.amount.toLocaleString("it-IT")} cc` :
              n.notif_type === "auction_won"  ? `hai vinto! ${n.amount.toLocaleString("it-IT")} cc` :
              n.notif_type === "auction_sold" ? `venduto a ${n.bidder_username} per ${n.amount.toLocaleString("it-IT")} cc` :
              `asta persa — vinto da ${n.bidder_username} per ${n.amount.toLocaleString("it-IT")} cc`;
            return (
              <NotifRow key={n.id} accent={accent} onClick={() => go(`/aste/${n.auction_id}`)}>
                <span style={{ fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 700, color: INK }}>
                  {n.concept_title}
                </span>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: DIM }}>
                  {label}
                </span>
              </NotifRow>
            );
          })}
        </Section>
      )}

      {/* ── Vendite dirette ───────────────────────────────── */}
      {saleNotifs.length > 0 && (
        <Section label="vendite">
          {saleNotifs.map((n) => (
            <NotifRow key={n.id} accent={GREEN} onClick={() => go("/profilo")}>
              <span style={{ fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 700, color: INK }}>
                {n.concept_title}
              </span>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: DIM }}>
                acquistato da {n.buyer_username} · {n.amount.toLocaleString("it-IT")} cc
              </span>
            </NotifRow>
          ))}
        </Section>
      )}

      {/* ── Nuovi follower ────────────────────────────────── */}
      {followNotifs.length > 0 && (
        <Section label="nuovi follower">
          {followNotifs.map((n) => (
            <NotifRow key={n.id} accent={YEL}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span
                  style={{ fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 700, color: INK, cursor: "pointer" }}
                  onClick={() => go(`/utenti/${n.from_user_id}`)}
                >
                  {n.from_username}
                </span>
                {n.is_mutual ? (
                  <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: DIM, flexShrink: 0 }}>
                    ✓ vi seguite
                  </span>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); onFollowBack(n.from_user_id); }}
                    style={{
                      fontFamily: "var(--f-mono)", fontSize: 9, fontWeight: 700,
                      padding: "3px 8px", border: `2px solid ${INK}`,
                      background: INK, color: BG, cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    + segui
                  </button>
                )}
              </div>
            </NotifRow>
          ))}
        </Section>
      )}

      {/* ── Offerte ricevute ──────────────────────────────── */}
      {receivedOffers.length > 0 && (
        <Section label="offerte ricevute">
          {receivedOffers.map((o) => (
            <NotifRow key={o.id} accent={PINK} onClick={() => go("/profilo")}>
              <span style={{ fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 700, color: INK }}>
                {o.concept_title}
              </span>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: DIM }}>
                {o.amount.toLocaleString("it-IT")} cc · da {o.buyer_username}
              </span>
            </NotifRow>
          ))}
        </Section>
      )}

      {/* ── Aggiornamenti offerte inviate ─────────────────── */}
      {sentOfferUpdates.length > 0 && (
        <Section label="aggiornamenti offerte">
          {sentOfferUpdates.map((o) => (
            <NotifRow key={o.id} accent={o.status === "accepted" ? GREEN : RED} onClick={() => go("/profilo")}>
              <span style={{ fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 700, color: INK }}>
                {o.concept_title}
              </span>
              <span style={{
                fontFamily: "var(--f-mono)", fontSize: 10,
                color: o.status === "accepted" ? GREEN : RED,
              }}>
                {o.status === "accepted" ? "✓ accettata" : "✗ rifiutata"} · {o.amount.toLocaleString("it-IT")} cc
              </span>
            </NotifRow>
          ))}
        </Section>
      )}

    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ borderTop: `2px solid ${INK}` }}>
      <p style={{
        fontFamily: "var(--f-mono)", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        padding: "6px 14px 4px", color: DIM, margin: 0,
        background: "rgba(14,14,12,0.04)",
      }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function NotifRow({ children, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderBottom: `1px solid rgba(14,14,12,0.10)`,
        borderLeft: `4px solid ${accent}`,
        cursor: onClick ? "pointer" : "default",
        display: "flex", flexDirection: "column", gap: 3,
        transition: "background 80ms",
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = "rgba(14,14,12,0.05)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </div>
  );
}
