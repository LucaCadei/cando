import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API } from "../constants.js";
import { WikiThumbnail } from "./Cards.jsx";
import { Badge } from "./Badge.jsx";
import { CoinAmount } from "./CoinIcon.jsx";
import s from "../styles.js";

const INK  = "#0E0E0C";
const BG   = "#E5E4DF";
const VIO  = "#7C4DFF";
const YEL  = "#FFD43A";
const DIM  = "#5C5A52";


function formatCountdown(seconds) {
  if (seconds <= 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AuctionPage({ currentUser }) {
  const { auctionId } = useParams();
  const navigate      = useNavigate();

  const [auction, setAuction]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [bidAmount, setBidAmount]   = useState("");
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError]     = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const timerRef  = useRef(null);
  const pollRef   = useRef(null);

  const fetchAuction = async () => {
    const res = await fetch(`${API}/auctions/${auctionId}`);
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    if (!res.ok) { setLoading(false); return; }
    const data = await res.json();
    setAuction(data);
    setSecondsLeft(data.seconds_left);
    setLoading(false);
  };

  useEffect(() => {
    fetchAuction();
    return () => {
      clearInterval(timerRef.current);
      clearInterval(pollRef.current);
    };
  }, [auctionId]);

  // Tick ogni secondo
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!auction || auction.status !== "active") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          fetchAuction();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [auction?.id, auction?.status]);

  // Polling offerte ogni 15s
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!auction || auction.status !== "active") return;
    pollRef.current = setInterval(fetchAuction, 15_000);
    return () => clearInterval(pollRef.current);
  }, [auction?.id, auction?.status]);

  const handleBid = async () => {
    const amount = parseInt(bidAmount, 10);
    if (!amount || amount < 1) return;
    setBidLoading(true);
    setBidError(null);
    const res = await fetch(`${API}/auctions/${auctionId}/bid`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount }),
    });
    if (res.ok) {
      const data = await res.json();
      setAuction(data);
      setSecondsLeft(data.seconds_left);
      setBidAmount("");
    } else {
      const err = await res.json().catch(() => ({}));
      setBidError(err.detail || "Errore nell'offerta.");
    }
    setBidLoading(false);
  };

  if (!loading && notFound) {
    return (
      <div style={s.profileWrap}>
        <div style={s.profileInner}>
          <button style={s.profileBack} onClick={() => navigate(-1)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
              <polyline points="9 2 5 7 9 12"/>
            </svg>
            &nbsp;indietro
          </button>
          <p style={s.profileEmpty}>Asta non trovata.</p>
        </div>
      </div>
    );
  }

  if (loading || !auction) {
    return (
      <div style={s.profileWrap}>
        <div style={s.profileInner}>
          <p style={s.profileEmpty}>…</p>
        </div>
      </div>
    );
  }

  const concept      = auction.concept;
  const isActive     = auction.status === "active";
  const isSeller     = currentUser?.id === auction.seller_id;
  const isWinner     = currentUser?.id === auction.winner_id;
  const canBid       = currentUser && !isSeller && isActive;
  const minBid       = auction.current_bid
    ? auction.current_bid + 1
    : auction.min_price;

  const urgentColor = secondsLeft > 0 && secondsLeft < 60 ? "#FF3B30"
                    : secondsLeft < 300                    ? "#FF8C00"
                    : INK;

  return (
    <div style={s.profileWrap}>
      <div style={{ ...s.profileInner, maxWidth: 640 }}>

        <button style={s.profileBack} onClick={() => navigate(-1)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <polyline points="9 2 5 7 9 12"/>
          </svg>
          &nbsp;indietro
        </button>

        {/* ── Header asta ───────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "var(--f-mono)", fontSize: 10, fontWeight: 600,
            letterSpacing: "0.1em", textTransform: "uppercase",
            background: isActive ? VIO : INK, color: BG,
            padding: "4px 10px", marginBottom: 12,
          }}>
            {isActive ? "● asta in corso" : "asta terminata"}
          </div>
          <h1 style={{
            fontFamily: "var(--f-body)", fontSize: 28, fontWeight: 900,
            letterSpacing: "-0.03em", color: INK, margin: 0,
          }}>
            {concept?.title ?? "…"}
          </h1>
          {concept && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <Badge type={concept.type} />
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: DIM }}>
                venduta da {auction.seller_username}
              </span>
            </div>
          )}
        </div>

        {/* ── Visual concetto ───────────────────────────────── */}
        {concept && <WikiThumbnail concept={concept} height={240} bordered />}

        {/* ── Stats strip ───────────────────────────────────── */}
        <div style={{
          display: "flex",
          border: `2px solid ${INK}`,
          boxShadow: `4px 4px 0 ${INK}`,
          marginBottom: 32,
        }}>
          {/* Prezzo minimo */}
          <div style={{
            flex: 1, padding: "16px 20px",
            borderRight: `2px solid ${INK}`,
          }}>
            <p style={{ fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: DIM, margin: "0 0 6px" }}>
              prezzo minimo
            </p>
            <CoinAmount amount={auction.min_price} size="sm" />
          </div>

          {/* Offerta attuale */}
          <div style={{
            flex: 1, padding: "16px 20px",
            background: auction.current_bid ? YEL : BG,
            borderRight: `2px solid ${INK}`,
          }}>
            <p style={{ fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: DIM, margin: "0 0 6px" }}>
              offerta attuale
            </p>
            {auction.current_bid
              ? <CoinAmount amount={auction.current_bid} size="sm" />
              : <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: DIM }}>nessuna offerta</span>
            }
          </div>

          {/* Tempo */}
          <div style={{ flex: 1, padding: "16px 20px" }}>
            <p style={{ fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: DIM, margin: "0 0 6px" }}>
              {isActive ? "tempo rimasto" : "terminata"}
            </p>
            {isActive ? (
              <span style={{
                fontFamily: "var(--f-mono)", fontSize: 20, fontWeight: 700,
                color: urgentColor, letterSpacing: "0.02em",
              }}>
                {formatCountdown(secondsLeft)}
              </span>
            ) : (
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: DIM }}>
                {new Date(auction.ends_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
          </div>
        </div>

        {/* ── Banner risultato ──────────────────────────────── */}
        {!isActive && (
          <div style={{
            background: auction.winner_id ? "#E8FFEC" : BG,
            border: `2px solid ${auction.winner_id ? "#00C896" : INK}`,
            boxShadow: `4px 4px 0 ${auction.winner_id ? "#00C896" : INK}`,
            padding: "16px 20px",
            marginBottom: 32,
          }}>
            {auction.winner_id ? (
              <>
                <p style={{ fontFamily: "var(--f-body)", fontSize: 16, fontWeight: 900, color: "#00C896", margin: "0 0 4px" }}>
                  ✓ asta vinta da {auction.winner_username}
                </p>
                <p style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: DIM, margin: 0 }}>
                  offerta finale: {auction.winning_bid?.toLocaleString("it-IT")} cc
                </p>
                {isWinner && (
                  <p style={{ fontFamily: "var(--f-body)", fontSize: 13, fontWeight: 700, color: VIO, marginTop: 8 }}>
                    hai vinto! il concetto è ora tuo.
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontFamily: "var(--f-body)", fontSize: 15, fontWeight: 700, color: DIM, margin: 0 }}>
                nessuna offerta valida — il concetto è rimasto al venditore.
              </p>
            )}
          </div>
        )}

        {/* ── Descrizione ───────────────────────────────────── */}
        {concept?.description && (
          <p style={{
            fontFamily: "var(--f-body)", fontSize: 14, color: DIM,
            lineHeight: 1.6, marginBottom: 32,
            borderLeft: `4px solid ${YEL}`, paddingLeft: 16,
          }}>
            {concept.description}
          </p>
        )}

        {/* ── Form offerta ──────────────────────────────────── */}
        {canBid && (
          <div style={{
            background: BG,
            border: `2px solid ${INK}`,
            boxShadow: `4px 4px 0 ${VIO}`,
            marginBottom: 32,
          }}>
            <div style={{
              background: VIO, color: BG, padding: "8px 20px",
              fontFamily: "var(--f-mono)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              fai un'offerta
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: DIM, margin: 0 }}>
                offerta minima: {minBid.toLocaleString("it-IT")} cc · saldo: {currentUser.coins.toLocaleString("it-IT")} cc
              </p>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => { setBidAmount(e.target.value); setBidError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleBid()}
                  placeholder={String(minBid)}
                  min={minBid}
                  style={{
                    ...s.sidebarInput, width: 120, padding: "8px 12px",
                    fontFamily: "var(--f-mono)", fontSize: 14, fontWeight: 700,
                  }}
                />
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: DIM }}>cc</span>
                <button
                  onClick={handleBid}
                  disabled={bidLoading}
                  style={{
                    ...s.btnPrimary,
                    opacity: bidLoading ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { if (!bidLoading) { e.currentTarget.style.transform = "translate(4px,4px)"; e.currentTarget.style.boxShadow = "none"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `4px 4px 0 ${VIO}`; }}
                >
                  {bidLoading ? "…" : "offri"}
                </button>
              </div>
              {bidError && (
                <p style={{ fontFamily: "var(--f-body)", fontSize: 12, color: "#FF3B30", margin: 0 }}>
                  {bidError}
                </p>
              )}
            </div>
          </div>
        )}

        {isSeller && isActive && (
          <div style={{
            background: "#FFF8E0", border: `2px solid ${YEL}`,
            padding: "10px 16px", marginBottom: 32,
            fontFamily: "var(--f-mono)", fontSize: 11, color: DIM,
          }}>
            sei il venditore — non puoi offrire sulla tua asta.
          </div>
        )}

        {/* ── Storico offerte ───────────────────────────────── */}
        {auction.bids.length > 0 && (
          <div>
            <p style={{ ...s.sidebarSection, marginBottom: 12 }}>
              offerte ({auction.bid_count})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(() => {
                const maxAmount = Math.max(...auction.bids.map((b) => b.amount));
                return auction.bids.map((bid) => {
                  const isTop = bid.amount === maxAmount;
                  return (
                    <div key={bid.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 16px",
                      background: isTop && isActive ? YEL : BG,
                      border: `2px solid ${INK}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {isTop && (
                          <span style={{
                            fontFamily: "var(--f-mono)", fontSize: 9, fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.08em",
                            background: INK, color: BG, padding: "2px 6px",
                          }}>
                            top
                          </span>
                        )}
                        <span style={{ fontFamily: "var(--f-body)", fontSize: 13, fontWeight: 700, color: INK }}>
                          {bid.bidder_username}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <CoinAmount amount={bid.amount} size="sm" />
                        <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: DIM }}>
                          {new Date(bid.created_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {auction.bids.length === 0 && isActive && (
          <p style={s.profileEmpty}>
            nessuna offerta ancora. sii il primo!
          </p>
        )}

      </div>
    </div>
  );
}
