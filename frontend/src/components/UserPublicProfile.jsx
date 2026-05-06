import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API } from "../constants.js";
import { PublicConceptCard } from "./Cards.jsx";
import s from "../styles.js";

/**
 * Profilo pubblico di un altro utente.
 * L'userId viene letto dall'URL (/utenti/:userId) tramite useParams —
 * non serve passarlo come prop, e la pagina funziona anche aprendo il link direttamente.
 */
export function UserPublicProfile({ currentUser, onMakeOffer }) {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setProfile(null);
    setNotFound(false);
    fetch(`${API}/users/${userId}/profile`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); return; }
        setProfile(await r.json());
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const username = profile?.user?.username;

  if (!loading && notFound) {
    return (
      <div style={s.profileWrap}>
        <div style={s.profileInner}>
          <button style={s.profileBack} onClick={() => navigate(-1)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25"><polyline points="9 2 5 7 9 12"/></svg>
            indietro
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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25"><polyline points="9 2 5 7 9 12"/></svg>
          indietro
        </button>

        <div style={s.profileHero}>
          <div style={s.avatarCircleLg}>{username ? username[0].toUpperCase() : "?"}</div>
          <div>
            <p style={s.profileName}>{username ?? "…"}</p>
          </div>
        </div>

        {!loading && profile && (
          <div style={{ ...s.profileStats, marginBottom: 40 }}>
            <div style={s.profileStatItem}>
              <p style={s.profileStatNum}>{profile.concepts.length}</p>
              <p style={s.statLabel}>possiede</p>
            </div>
          </div>
        )}

        <div style={s.profileTabBar}>
          <button style={{ ...s.profileTab, ...s.profileTabActive }}>
            oggetti posseduti
            {profile?.concepts.length > 0 && (
              <span style={s.profileTabBadge}>{profile.concepts.length}</span>
            )}
          </button>
        </div>

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
