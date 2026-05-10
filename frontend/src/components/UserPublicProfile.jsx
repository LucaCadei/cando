import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API } from "../constants.js";
import { PublicConceptCard } from "./Cards.jsx";
import s from "../styles.js";

const INK = "#0E0E0C";
const BG  = "#E5E4DF";
const YEL = "#FFD43A";
const VIO = "#7C4DFF";
const DIM = "#5C5A52";

export function UserPublicProfile({ currentUser, onMakeOffer, onFollow }) {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeAuctions, setActiveAuctions] = useState([]);

  useEffect(() => {
    setLoading(true);
    setProfile(null);
    setNotFound(false);
    setActiveAuctions([]);
    const headers = currentUser?.token
      ? { Authorization: `Bearer ${currentUser.token}` }
      : {};
    fetch(`${API}/users/${userId}/profile`, { headers })
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); return; }
        const data = await r.json();
        setProfile(data);
        setIsFollowing(data.is_following ?? false);
      })
      .finally(() => setLoading(false));
    fetch(`${API}/users/${userId}/active-auctions`)
      .then((r) => r.ok ? r.json() : [])
      .then(setActiveAuctions);
  }, [userId]);

  const username = profile?.user?.username;
  const isOwnProfile = currentUser?.id === userId;

  const handleFollowClick = async () => {
    if (!onFollow || followLoading) return;
    setFollowLoading(true);
    const result = await onFollow(userId);
    if (result !== null) {
      setIsFollowing(result);
      setProfile((p) => {
        if (!p) return p;
        return {
          ...p,
          followers_count: p.followers_count + (result ? 1 : -1),
        };
      });
    }
    setFollowLoading(false);
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
          <p style={s.profileEmpty}>Utente non trovato.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.profileWrap}>
      <div style={s.profileInner}>

        <button style={s.profileBack} onClick={() => navigate(-1)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <polyline points="9 2 5 7 9 12"/>
          </svg>
          &nbsp;indietro
        </button>

        {/* ── Hero utente ─────────────────────────────────────── */}
        <div style={s.profileHero}>
          <div style={s.avatarCircleLg}>
            {username ? username[0].toUpperCase() : "?"}
          </div>
          <div>
            <p style={s.profileName}>{username ?? "…"}</p>
          </div>
        </div>

        {/* ── Follow button ────────────────────────────────────── */}
        {!loading && profile && currentUser && !isOwnProfile && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={handleFollowClick}
              disabled={followLoading}
              style={{
                fontFamily: "var(--f-body)",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "8px 20px",
                border: `2px solid ${INK}`,
                background: isFollowing ? INK : YEL,
                color: isFollowing ? BG : INK,
                cursor: followLoading ? "wait" : "pointer",
                boxShadow: `4px 4px 0 ${INK}`,
                transition: "transform 0.1s, box-shadow 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(4px,4px)";
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = `4px 4px 0 ${INK}`;
              }}
            >
              {isFollowing ? "✓ stai seguendo" : "+ segui"}
            </button>
          </div>
        )}

        {/* ── Stats strip gialla ───────────────────────────────── */}
        {!loading && profile && (
          <div style={s.profileStats}>
            <div style={s.profileStatItem}>
              <p style={s.profileStatNum}>{profile.followers_count ?? 0}</p>
              <p style={s.statLabel}>follower</p>
            </div>
            <div style={s.profileStatDivider} />
            <div style={s.profileStatItem}>
              <p style={s.profileStatNum}>{profile.following_count ?? 0}</p>
              <p style={s.statLabel}>seguiti</p>
            </div>
            <div style={s.profileStatDivider} />
            <div style={s.profileStatItem}>
              <p style={s.profileStatNum}>{profile.concepts.length}</p>
              <p style={s.statLabel}>possiede</p>
            </div>
          </div>
        )}

        {/* ── Aste attive ──────────────────────────────────────── */}
        {activeAuctions.length > 0 && (
          <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ ...s.sidebarSection, marginBottom: 4 }}>aste in corso</p>
            {activeAuctions.map((auction) => {
              const secsLeft = Math.max(0, Math.floor((new Date(auction.ends_at) - Date.now()) / 1000));
              const h = Math.floor(secsLeft / 3600);
              const m = Math.floor((secsLeft % 3600) / 60);
              const timeLabel = secsLeft <= 0 ? "terminata"
                : h > 0 ? `${h}h ${m}m rimaste`
                : m > 0 ? `${m} min rimasti`
                : "< 1 min";
              return (
                <div
                  key={auction.id}
                  onClick={() => navigate(`/aste/${auction.id}`)}
                  style={{
                    background: BG, border: `2px solid ${VIO}`,
                    boxShadow: `4px 4px 0 ${VIO}`,
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
                        background: VIO, color: BG, padding: "2px 6px", flexShrink: 0,
                      }}>asta</span>
                      <span style={{ fontFamily: "var(--f-body)", fontSize: 14, fontWeight: 700, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {auction.concept?.title}
                      </span>
                    </div>
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: DIM }}>
                      min {auction.min_price.toLocaleString("it-IT")} cc
                      {auction.current_bid ? ` · offerta attuale: ${auction.current_bid.toLocaleString("it-IT")} cc` : ""}
                      {" · "}{timeLabel}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/aste/${auction.id}`); }}
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

        {/* ── Tab bar (solo oggetti posseduti per ora) ─────────── */}
        <div style={s.profileTabBar}>
          <button style={{ ...s.profileTab, ...s.profileTabActive }}>
            oggetti posseduti
            {profile?.concepts.length > 0 && (
              <span style={s.profileTabBadge}>{profile.concepts.length}</span>
            )}
          </button>
        </div>

        {/* ── Griglia concetti ─────────────────────────────────── */}
        <div style={s.profileContent}>
          {loading ? (
            <p style={s.profileEmpty}>…</p>
          ) : profile?.concepts.length === 0 ? (
            <p style={s.profileEmpty}>{username} non possiede ancora nessun concetto.</p>
          ) : (
            <div style={s.profileGrid}>
              {profile.concepts.map((c) => (
                <PublicConceptCard
                  key={c.id}
                  concept={c}
                  currentUser={currentUser}
                  onMakeOffer={onMakeOffer}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
