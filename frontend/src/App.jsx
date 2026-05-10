/**
 * App.jsx — radice dell'applicazione.
 *
 * Responsabilità:
 *  - Stato globale dell'utente autenticato (token, coins, acquisti, salvati, offerte, follow)
 *  - Handler per tutte le operazioni che modificano lo stato globale
 *  - Routing top-level con React Router
 *  - Header persistente con marquee bar + navigazione brutalista
 */

import { useState, useEffect, useRef } from "react";
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
import { AuctionPage }        from "./components/AuctionPage.jsx";
import { NotifDropdown }      from "./components/NotifDropdown.jsx";


// ── Marquee bar ────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  "marketplace di concetti",
  "oggetti che non esistono",
  "irripetibili e certificati",
  "compra. vendi. offri.",
];

function MarqueeBar() {
  return (
    <div style={s.marqueeBar}>
      <div style={s.marqueeTrack}>
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: "#7C4DFF" }}>★</span> {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Wordmark ───────────────────────────────────────────────────────────────
function Wordmark({ onClick }) {
  return (
    <button style={s.wordmark} onClick={onClick} aria-label="cando — torna alla piazza">
      cando
      <span style={s.wordmarkDot} />
    </button>
  );
}


export default function App() {
  const navigate = useNavigate();

  // ── Stato utente ──────────────────────────────────────────────────────
  const [user, setUser]   = useState(null);
  const [modal, setModal] = useState(null);

  // Evita flash di redirect verso "/" durante il restore da sessionStorage
  const [initialized, setInitialized] = useState(false);

  const [purchases, setPurchases] = useState([]);
  const [saved, setSaved]         = useState([]);

  // Offerte ricevute come venditore (pendenti)
  const [receivedOffers, setReceivedOffers]     = useState([]);
  const [seenOffers, setSeenOffers]             = useState(false);

  // Offerte inviate come acquirente già risolte (accettate/rifiutate)
  const [sentOfferUpdates, setSentOfferUpdates] = useState([]);
  const [seenSentOffers, setSeenSentOffers]     = useState(false);

  // Notifiche di nuovi follower
  const [followNotifs, setFollowNotifs]         = useState([]);
  const [seenFollowNotifs, setSeenFollowNotifs] = useState(false);

  // Notifiche aste (da utenti seguiti)
  const [auctionNotifs, setAuctionNotifs]       = useState([]);
  const [seenAuctionNotifs, setSeenAuctionNotifs] = useState(false);

  // Aste a cui l'utente ha offerto
  const [myBids, setMyBids] = useState([]);

  // Storico acquisti
  const [purchaseHistory, setPurchaseHistory] = useState([]);

  // Notifiche attività asta (new_bid per venditore, outbid per superati, auction_won/sold/lost)
  const [auctionActivityNotifs, setAuctionActivityNotifs] = useState([]);
  const [seenAuctionActivity, setSeenAuctionActivity]     = useState(false);

  // Notifiche vendita diretta (al venditore quando qualcuno compra al prezzo pieno)
  const [saleNotifs, setSaleNotifs]       = useState([]);
  const [seenSaleNotifs, setSeenSaleNotifs] = useState(false);

  // Dropdown notifiche
  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef(null);


  // ── Fetch dati utente ─────────────────────────────────────────────────

  const fetchPurchases = async (token) => {
    const res = await fetch(`${API}/users/me/purchases`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPurchases(await res.json());
  };

  const fetchSaved = async (token) => {
    const res = await fetch(`${API}/users/me/saved`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setSaved(await res.json());
  };

  const fetchMyBids = async (token) => {
    const res = await fetch(`${API}/users/me/bids`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setMyBids(await res.json());
  };

  const fetchPurchaseHistory = async (token) => {
    const res = await fetch(`${API}/users/me/purchase-history`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPurchaseHistory(await res.json());
  };

  const fetchSaleNotifs = async (token) => {
    const res = await fetch(`${API}/users/me/sale-notifs`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const fresh = await res.json();
    setSaleNotifs((prev) => {
      const prevIds = new Set(prev.map((n) => n.id));
      if (fresh.some((n) => !prevIds.has(n.id))) setSeenSaleNotifs(false);
      return fresh;
    });
  };

  const fetchAuctionActivityNotifs = async (token) => {
    const res = await fetch(`${API}/users/me/auction-activity-notifs`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const fresh = await res.json();
    setAuctionActivityNotifs((prev) => {
      const prevIds = new Set(prev.map((n) => n.id));
      if (fresh.some((n) => !prevIds.has(n.id))) setSeenAuctionActivity(false);
      return fresh;
    });
  };

  const fetchReceivedOffers = async (token) => {
    const res = await fetch(`${API}/users/me/offers/received`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const fresh = await res.json();
    setReceivedOffers((prev) => {
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

  const fetchFollowNotifs = async (token) => {
    const res = await fetch(`${API}/users/me/follow-notifs`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const fresh = await res.json();
    setFollowNotifs((prev) => {
      const prevIds = new Set(prev.map((n) => n.id));
      if (fresh.some((n) => !prevIds.has(n.id))) setSeenFollowNotifs(false);
      return fresh;
    });
  };

  const fetchAuctionNotifs = async (token) => {
    const res = await fetch(`${API}/users/me/auction-notifs`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const fresh = await res.json();
    setAuctionNotifs((prev) => {
      const prevIds = new Set(prev.map((n) => n.id));
      if (fresh.some((n) => !prevIds.has(n.id))) setSeenAuctionNotifs(false);
      return fresh;
    });
  };

  const restoreSession = (userData) => {
    setUser(userData);
    fetchPurchases(userData.token);
    fetchSaved(userData.token);
    fetchReceivedOffers(userData.token);
    fetchSentOfferUpdates(userData.token);
    fetchFollowNotifs(userData.token);
    fetchAuctionNotifs(userData.token);
    fetchMyBids(userData.token);
    fetchAuctionActivityNotifs(userData.token);
    fetchPurchaseHistory(userData.token);
    fetchSaleNotifs(userData.token);
  };


  // ── Inizializzazione e polling ────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("cando_user");
      if (raw) restoreSession(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem("cando_user");
    }
    setInitialized(true);
  }, []);

  // sessionStorage è per-tab: due tab possono avere utenti diversi
  useEffect(() => {
    if (user) sessionStorage.setItem("cando_user", JSON.stringify(user));
  }, [user]);

  // Polling ogni 10 secondi per tutte le notifiche
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      fetchReceivedOffers(user.token);
      fetchSentOfferUpdates(user.token);
      fetchFollowNotifs(user.token);
      fetchAuctionNotifs(user.token);
      fetchMyBids(user.token);
      fetchAuctionActivityNotifs(user.token);
      fetchSaleNotifs(user.token);
      fetchPurchases(user.token);
      fetchPurchaseHistory(user.token);
    }, 10_000);
    return () => clearInterval(id);
  }, [user?.token]);

  // Click-outside chiude il dropdown notifiche
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);


  // ── Handler ───────────────────────────────────────────────────────────

  const handleLogin = ({ token, user_id, username, email, coins }) => {
    const userData = { token, id: user_id, username, email, coins };
    setUser(userData);
    fetchPurchases(token);
    fetchSaved(token);
    fetchReceivedOffers(token);
    fetchSentOfferUpdates(token);
    fetchFollowNotifs(token);
    fetchAuctionNotifs(token);
    fetchMyBids(token);
    fetchAuctionActivityNotifs(token);
    fetchPurchaseHistory(token);
    fetchSaleNotifs(token);
    setModal(null);
    navigate("/piazza");
  };

  const handleBuy = (concept, newCoins) => {
    setUser((u) => ({ ...u, coins: newCoins }));
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

  const handleStartAuction = async (conceptId, minPrice, durationMinutes) => {
    const res = await fetch(`${API}/concepts/${conceptId}/auction`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ min_price: minPrice, duration_minutes: durationMinutes }),
    });
    if (!res.ok) return false;
    const auction = await res.json();
    setPurchases((prev) => prev.map((c) => c.id === conceptId ? { ...c, in_auction: true, listed: false } : c));
    navigate(`/aste/${auction.id}`);
    return true;
  };

  // Toggle follow/unfollow — restituisce il nuovo stato following (true/false)
  const handleFollow = async (userId) => {
    const res = await fetch(`${API}/users/${userId}/follow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (!res.ok) return null;
    return (await res.json()).following;
  };

  // Segui back un follower dalla notifica —
  // aggiorna is_mutual nella notifica localmente per feedback immediato
  const handleFollowBack = async (fromUserId) => {
    const following = await handleFollow(fromUserId);
    if (following) {
      setFollowNotifs((prev) =>
        prev.map((n) => n.from_user_id === fromUserId ? { ...n, is_mutual: true } : n)
      );
    }
  };

  // Marca tutte le notifiche follower come viste nel DB e le rimuove dallo stato locale
  const handleFollowNotifsSeen = async () => {
    setSeenFollowNotifs(true);
    setFollowNotifs([]);
    await fetch(`${API}/users/me/follow-notifs/seen`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
    });
  };

  const handleLogout = () => {
    setUser(null);
    setPurchases([]);
    setSaved([]);
    setReceivedOffers([]);
    setSentOfferUpdates([]);
    setFollowNotifs([]);
    setAuctionNotifs([]);
    setMyBids([]);
    setAuctionActivityNotifs([]);
    setPurchaseHistory([]);
    setSaleNotifs([]);
    setSeenSaleNotifs(false);
    setSeenAuctionActivity(false);
    setSeenOffers(false);
    setSeenSentOffers(false);
    setSeenFollowNotifs(false);
    setSeenAuctionNotifs(false);
    sessionStorage.removeItem("cando_user");
    navigate("/");
  };

  if (!initialized) return null;

  const hasUnread = (!seenOffers && receivedOffers.length > 0)
    || (!seenSentOffers && sentOfferUpdates.length > 0)
    || (!seenFollowNotifs && followNotifs.length > 0)
    || (!seenAuctionNotifs && auctionNotifs.length > 0)
    || (!seenAuctionActivity && auctionActivityNotifs.length > 0)
    || (!seenSaleNotifs && saleNotifs.length > 0);
  const unreadCount = (seenOffers ? 0 : receivedOffers.length)
    + (seenSentOffers ? 0 : sentOfferUpdates.length)
    + (seenFollowNotifs ? 0 : followNotifs.length)
    + (seenAuctionNotifs ? 0 : auctionNotifs.length)
    + (seenAuctionActivity ? 0 : auctionActivityNotifs.length)
    + (seenSaleNotifs ? 0 : saleNotifs.length);

  const handleAuctionNotifsSeen = async () => {
    setSeenAuctionNotifs(true);
    setAuctionNotifs([]);
    await fetch(`${API}/users/me/auction-notifs/seen`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
    });
  };

  // Apertura dropdown campana: marca tutto come visto (badge sparisce)
  // senza svuotare gli array (rimangono visibili nel dropdown)
  const handleBellClick = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening) {
      setSeenOffers(true);
      setSeenSentOffers(true);
      setSeenFollowNotifs(true);
      setSeenAuctionNotifs(true);
      setSeenAuctionActivity(true);
      setSeenSaleNotifs(true);
      if (saleNotifs.length > 0) {
        fetch(`${API}/users/me/sale-notifs/seen`, {
          method: "POST", headers: { Authorization: `Bearer ${user.token}` },
        });
      }
      if (followNotifs.length > 0) {
        fetch(`${API}/users/me/follow-notifs/seen`, {
          method: "POST", headers: { Authorization: `Bearer ${user.token}` },
        });
      }
      if (auctionNotifs.length > 0) {
        fetch(`${API}/users/me/auction-notifs/seen`, {
          method: "POST", headers: { Authorization: `Bearer ${user.token}` },
        });
      }
      if (auctionActivityNotifs.length > 0) {
        fetch(`${API}/users/me/auction-activity-notifs/seen`, {
          method: "POST", headers: { Authorization: `Bearer ${user.token}` },
        });
      }
    }
  };

  return (
    <div style={s.page}>
      <CandoCoinDefs />

      {/* Header sticky */}
      <header style={s.header}>
        <Wordmark onClick={() => user && navigate("/piazza")} />

        <div style={s.headerCenter}>
          {user && <UserSearch currentUserId={user.id} />}
        </div>

        <nav style={s.nav}>
          {user ? (
            <>
              <span style={s.coinBadge}>
                <CoinAmount amount={user.coins} size="sm" />
              </span>
              {/* Campana notifiche + dropdown */}
              <div ref={bellRef} style={{ position: "relative" }}>
                <button
                  style={{ ...s.hamburger, position: "relative", background: notifOpen ? "#0E0E0C" : "none", color: notifOpen ? "#E5E4DF" : "#0E0E0C" }}
                  onClick={handleBellClick}
                  aria-label="notifiche"
                  onMouseEnter={(e) => { if (!notifOpen) e.currentTarget.style.background = "rgba(14,14,12,0.18)"; }}
                  onMouseLeave={(e) => { if (!notifOpen) e.currentTarget.style.background = "none"; }}
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 2a6 6 0 0 0-6 6v3l-2 3h16l-2-3V8a6 6 0 0 0-6-6z" strokeLinecap="square" strokeLinejoin="miter"/>
                    <path d="M8 16a2 2 0 0 0 4 0" strokeLinecap="square"/>
                  </svg>
                  {hasUnread && (
                    <span style={s.notifDot}>{unreadCount}</span>
                  )}
                </button>
                {notifOpen && (
                  <NotifDropdown
                    receivedOffers={receivedOffers}
                    sentOfferUpdates={sentOfferUpdates}
                    followNotifs={followNotifs}
                    auctionNotifs={auctionNotifs}
                    auctionActivityNotifs={auctionActivityNotifs}
                    saleNotifs={saleNotifs}
                    onFollowBack={handleFollowBack}
                    onClose={() => setNotifOpen(false)}
                  />
                )}
              </div>
              {/* Chip utente → profilo */}
              <button
                onClick={() => navigate("/profilo")}
                aria-label="profilo"
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "none", border: "2px solid #0E0E0C",
                  padding: "4px 10px 4px 4px",
                  cursor: "pointer",
                  fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 700,
                  color: "#0E0E0C", letterSpacing: "0.02em",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#0E0E0C"; e.currentTarget.style.color = "#E5E4DF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#0E0E0C"; }}
              >
                <span style={{
                  width: 26, height: 26, flexShrink: 0,
                  background: "#7C4DFF", color: "#E5E4DF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--f-body)", fontWeight: 900, fontSize: 13,
                }}>
                  {user.username[0].toUpperCase()}
                </span>
                {user.username}
              </button>
            </>
          ) : (
            <>
              <button style={s.btnGhost} onClick={() => setModal("register")}>registrati</button>
              <button style={s.btnPrimary} onClick={() => setModal("login")}>accedi</button>
            </>
          )}
        </nav>
      </header>

      <Routes>
        <Route path="/"
          element={user ? <Navigate to="/piazza" replace /> : <LandingPage onLogin={() => setModal("login")} onRegister={() => setModal("register")} />}
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
                followNotifs={followNotifs}
                auctionNotifs={auctionNotifs}
                myBids={myBids}
                purchaseHistory={purchaseHistory}
                onFollowBack={handleFollowBack}
                onToggleSave={handleToggleSave}
                onRelist={handleRelist}
                onUnlist={handleUnlist}
                onStartAuction={handleStartAuction}
                onAcceptOffer={handleAcceptOffer}
                onRejectOffer={handleRejectOffer}
                onLogout={handleLogout}
                onBack={() => navigate("/piazza")}
                onOpenAuction={(id) => navigate(`/aste/${id}`)}
              />
            : <Navigate to="/" replace />}
        />
        <Route path="/aste/:auctionId"
          element={user
            ? <AuctionPage currentUser={user} />
            : <Navigate to="/" replace />}
        />
        <Route path="/utenti/:userId"
          element={user
            ? <UserPublicProfile currentUser={user} onMakeOffer={handleMakeOffer} onFollow={handleFollow} />
            : <Navigate to="/" replace />}
        />
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
