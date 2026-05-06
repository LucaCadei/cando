/**
 * App.jsx — radice dell'applicazione.
 *
 * Responsabilità di questo file:
 *  - Stato globale dell'utente autenticato (token, coins, acquisti, salvati, offerte)
 *  - Handler per tutte le operazioni che modificano lo stato globale
 *  - Routing top-level con React Router
 *  - Header persistente con navigazione e badge notifiche
 *
 * I componenti di pagina (MarketplacePage, ProfilePage, ecc.) sono in src/components/.
 */

import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { API } from "./constants.js";
import s from "./styles.js";
import { CandoCoinDefs, CoinAmount } from "./components/CoinIcon.jsx";
import { LandingPage }        from "./components/LandingPage.jsx";
import { MarketplacePage }    from "./components/MarketplacePage.jsx";
import { Modal }              from "./components/Modal.jsx";
import { UserSearch }         from "./components/UserSearch.jsx";
import { UserPublicProfile }  from "./components/UserPublicProfile.jsx";
import { ProfilePage }        from "./components/ProfilePage.jsx";


export default function App() {
  const navigate = useNavigate();

  // ── Stato utente ──────────────────────────────────────────
  const [user, setUser]       = useState(null);
  const [modal, setModal]     = useState(null);

  // initialized evita un flash di redirect verso "/" mentre sessionStorage
  // viene letto al primo render — senza questo flag, le rotte protette
  // vedrebbero user=null e reindirizzerebbero prima che la sessione sia ripristinata.
  const [initialized, setInitialized] = useState(false);

  const [purchases, setPurchases]   = useState([]);
  const [saved, setSaved]           = useState([]);

  // Offerte ricevute come venditore (pendenti)
  const [receivedOffers, setReceivedOffers] = useState([]);
  // true = l'utente ha già visto le offerte ricevute → non mostrare il badge
  const [seenOffers, setSeenOffers]         = useState(false);

  // Offerte inviate come acquirente già risolte (accettate/rifiutate)
  const [sentOfferUpdates, setSentOfferUpdates]   = useState([]);
  const [seenSentOffers, setSeenSentOffers]         = useState(false);


  // ── Fetch dati utente ─────────────────────────────────────

  const fetchPurchases = async (token) => {
    const res = await fetch(`${API}/users/me/purchases`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPurchases(await res.json());
  };

  const fetchSaved = async (token) => {
    const res = await fetch(`${API}/users/me/saved`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setSaved(await res.json());
  };

  const fetchReceivedOffers = async (token) => {
    const res = await fetch(`${API}/users/me/offers/received`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const fresh = await res.json();
    setReceivedOffers((prev) => {
      // Segna come "non viste" solo se arrivano offerte davvero nuove (per ID)
      const prevIds = new Set(prev.map((o) => o.id));
      if (fresh.some((o) => !prevIds.has(o.id))) setSeenOffers(false);
      return fresh;
    });
  };

  const fetchSentOfferUpdates = async (token) => {
    const res = await fetch(`${API}/users/me/offers/sent`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const fresh = await res.json();
    setSentOfferUpdates((prev) => {
      const prevIds = new Set(prev.map((o) => o.id));
      if (fresh.some((o) => !prevIds.has(o.id))) setSeenSentOffers(false);
      return fresh;
    });
  };

  const restoreSession = (userData) => {
    setUser(userData);
    fetchPurchases(userData.token);
    fetchSaved(userData.token);
    fetchReceivedOffers(userData.token);
    fetchSentOfferUpdates(userData.token);
  };


  // ── Inizializzazione e polling ────────────────────────────

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("cando_user");
      if (raw) restoreSession(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem("cando_user");
    }
    setInitialized(true);
  }, []);

  // Persiste la sessione in sessionStorage ad ogni cambio utente
  // (sessionStorage è per-tab: due tab possono avere utenti diversi)
  useEffect(() => {
    if (user) sessionStorage.setItem("cando_user", JSON.stringify(user));
  }, [user]);

  // Polling ogni 10 secondi per notifiche offerte
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      fetchReceivedOffers(user.token);
      fetchSentOfferUpdates(user.token);
    }, 10_000);
    return () => clearInterval(id);
  }, [user?.token]);


  // ── Handler ───────────────────────────────────────────────

  const handleLogin = ({ token, user_id, username, email, coins }) => {
    const userData = { token, id: user_id, username, email, coins };
    setUser(userData);
    fetchPurchases(token);
    fetchSaved(token);
    fetchReceivedOffers(token);
    fetchSentOfferUpdates(token);
    setModal(null);
    navigate("/piazza");
  };

  const handleBuy = (concept, newCoins) => {
    setUser((u) => ({ ...u, coins: newCoins }));
    // Il concetto acquistato entra tra i posseduti (listed=false = non in vendita)
    setPurchases((prev) => [...prev, { ...concept, listed: false, owner_id: user.id }]);
    setSaved((prev) => prev.filter((c) => c.id !== concept.id));
  };

  const handleToggleSave = async (concept) => {
    const res = await fetch(`${API}/concepts/${concept.id}/save`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!res.ok) return;
    const { saved: isSaved } = await res.json();
    setSaved((prev) => isSaved ? [...prev, concept] : prev.filter((c) => c.id !== concept.id));
  };

  const handleUnlist = async (concept) => {
    const res = await fetch(`${API}/concepts/${concept.id}/unlist`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!res.ok) return;
    setPurchases((prev) => prev.map((c) => c.id === concept.id ? { ...c, listed: false } : c));
  };

  const handleRelist = async (concept, newPrice) => {
    const res = await fetch(`${API}/concepts/${concept.id}/relist`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ price: newPrice }),
    });
    if (!res.ok) return false;
    setPurchases((prev) => prev.map((c) => c.id === concept.id ? { ...c, listed: true, price: newPrice } : c));
    return true;
  };

  const handleAcceptOffer = async (offerId) => {
    const offer = receivedOffers.find((o) => o.id === offerId);
    const res = await fetch(`${API}/offers/${offerId}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    setUser((u) => ({ ...u, coins: data.coins }));
    setReceivedOffers((prev) => prev.filter((o) => o.id !== offerId));
    // Rimuove il concetto dai propri acquisti (è passato all'acquirente)
    if (offer) setPurchases((prev) => prev.filter((c) => c.id !== offer.concept_id));
    return true;
  };

  const handleRejectOffer = async (offerId, message = null) => {
    const res = await fetch(`${API}/offers/${offerId}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) return false;
    setReceivedOffers((prev) => prev.filter((o) => o.id !== offerId));
    return true;
  };

  const handleMakeOffer = async (conceptId, amount, message) => {
    const res = await fetch(`${API}/concepts/${conceptId}/offer`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, message }),
    });
    return res.ok;
  };

  const handleLogout = () => {
    setUser(null);
    setPurchases([]);
    setSaved([]);
    setReceivedOffers([]);
    setSentOfferUpdates([]);
    setSeenOffers(false);
    setSeenSentOffers(false);
    sessionStorage.removeItem("cando_user");
    navigate("/");
  };

  // Non renderizzare nulla finché la sessione non è stata letta da sessionStorage,
  // altrimenti le rotte protette farebbero un redirect a "/" in modo errato.
  if (!initialized) return null;

  // Il badge mostra la somma di offerte ricevute non viste + aggiornamenti non visti
  const hasUnread = (!seenOffers && receivedOffers.length > 0) || (!seenSentOffers && sentOfferUpdates.length > 0);
  const unreadCount = (seenOffers ? 0 : receivedOffers.length) + (seenSentOffers ? 0 : sentOfferUpdates.length);

  return (
    <div style={s.page}>
      {/* Definizioni SVG dei coin — deve stare nel DOM prima di qualsiasi <use href="#cc-metal"> */}
      <CandoCoinDefs />

      <header style={s.header}>
        <span
          style={{ ...s.wordmark, cursor: user ? "pointer" : "default" }}
          onClick={() => user && navigate("/piazza")}
        >
          cando
        </span>

        <div style={s.headerCenter}>
          {user && <UserSearch currentUserId={user.id} />}
        </div>

        <nav style={s.nav}>
          {user ? (
            <>
              <span style={s.coinBadge}>
                <CoinAmount amount={user.coins} size="sm" />
              </span>
              <span style={s.navEmail}>{user.username}</span>
              <button
                style={{ ...s.hamburger, position: "relative" }}
                onClick={() => { navigate("/profilo"); setSeenOffers(true); setSeenSentOffers(true); }}
                aria-label="profilo"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25">
                  <circle cx="10" cy="7.5" r="3.5"/>
                  <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" strokeLinecap="round"/>
                </svg>
                {hasUnread && (
                  <span style={s.notifDot}>{unreadCount}</span>
                )}
              </button>
            </>
          ) : (
            <>
              <button style={s.btnSecondary} onClick={() => setModal("register")}>registrati</button>
              <button style={s.btnPrimary}   onClick={() => setModal("login")}>accedi</button>
            </>
          )}
        </nav>
      </header>

      <Routes>
        <Route path="/"
          element={user ? <Navigate to="/piazza" replace /> : <LandingPage />}
        />
        <Route path="/piazza"
          element={user
            ? <MarketplacePage user={user} onBuy={handleBuy} saved={saved} onToggleSave={handleToggleSave} />
            : <Navigate to="/" replace />}
        />
        <Route path="/profilo"
          element={user
            ? <ProfilePage
                user={user}
                purchases={purchases}
                saved={saved}
                receivedOffers={receivedOffers}
                sentOfferUpdates={sentOfferUpdates}
                onToggleSave={handleToggleSave}
                onRelist={handleRelist}
                onUnlist={handleUnlist}
                onAcceptOffer={handleAcceptOffer}
                onRejectOffer={handleRejectOffer}
                onLogout={handleLogout}
                onBack={() => navigate("/piazza")}
              />
            : <Navigate to="/" replace />}
        />
        <Route path="/utenti/:userId"
          element={user
            ? <UserPublicProfile currentUser={user} onMakeOffer={handleMakeOffer} />
            : <Navigate to="/" replace />}
        />
        {/* Qualsiasi altra URL → redirect alla destinazione appropriata */}
        <Route path="*" element={<Navigate to={user ? "/piazza" : "/"} replace />} />
      </Routes>

      {modal && (
        <Modal
          mode={modal}
          onClose={() => setModal(null)}
          onSwitch={() => setModal(modal === "login" ? "register" : "login")}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
}
