import { useState } from "react";
import { OwnedCard, SavedCard } from "./Cards.jsx";
import { CoinAmount } from "./CoinIcon.jsx";
import s from "../styles.js";

const PROFILE_TABS = [
  { id: "acquistati",   label: "acquistati" },
  { id: "salvati",      label: "salvati" },
  { id: "impostazioni", label: "impostazioni" },
];

function SettingsSection({ user, onLogout }) {
  return (
    <div style={{ maxWidth: 440 }}>
      <div style={{ background: "var(--color-white)", border: "1px solid var(--color-grey-100)", borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "20px 28px" }}>
          <p style={{ ...s.sidebarSection, margin: "0 0 16px" }}>account</p>
          {[["username", user.username], ["email", user.email]].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--color-grey-100)" }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-fg-muted)" }}>{label}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-fg)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
      <button style={{ ...s.btnGhost, color: "var(--color-error)", borderColor: "#E8C8C8" }} onClick={onLogout}>
        esci dall'account
      </button>
    </div>
  );
}

export function ProfilePage({ user, purchases, saved, receivedOffers, sentOfferUpdates = [], onToggleSave, onRelist, onUnlist, onAcceptOffer, onRejectOffer, onLogout, onBack }) {
  const [tab, setTab] = useState("acquistati");
  const offersByConceptId = (receivedOffers ?? []).reduce((acc, o) => {
    acc[o.concept_id] = acc[o.concept_id] ? [...acc[o.concept_id], o] : [o];
    return acc;
  }, {});

  return (
    <div style={s.profileWrap}>
      <div style={s.profileInner}>

        <button style={s.profileBack} onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25"><polyline points="9 2 5 7 9 12"/></svg>
          la piazza
        </button>

        <div style={s.profileHero}>
          <div style={s.avatarCircleLg}>{user.username[0].toUpperCase()}</div>
          <div>
            <p style={s.profileName}>{user.username}</p>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--color-fg-muted)", margin: "4px 0 0" }}>{user.email}</p>
          </div>
        </div>

        <div style={s.profileStats}>
          <div style={s.profileStatItem}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <svg width="24" height="24" viewBox="0 0 200 200"><use href="#cc-metal"/></svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--color-fg)" }}>
                {user.coins.toLocaleString("it-IT")}
              </span>
            </div>
            <p style={s.statLabel}>saldo</p>
          </div>
          <div style={s.profileStatDivider}/>
          <div style={s.profileStatItem}>
            <p style={s.profileStatNum}>{purchases.length}</p>
            <p style={s.statLabel}>acquistati</p>
          </div>
          <div style={s.profileStatDivider}/>
          <div style={s.profileStatItem}>
            <p style={s.profileStatNum}>{saved.length}</p>
            <p style={s.statLabel}>salvati</p>
          </div>
        </div>

        {sentOfferUpdates.length > 0 && (
          <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ ...s.sidebarSection, margin: "0 0 8px" }}>aggiornamenti sulle tue offerte</p>
            {sentOfferUpdates.map((o) => (
              <div key={o.id} style={{
                background: o.status === "accepted" ? "#F0FDF4" : "#FEF2F2",
                border: `1px solid ${o.status === "accepted" ? "#86EFAC" : "#FCA5A5"}`,
                borderRadius: 3, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 300, color: "var(--color-fg)" }}>{o.concept_title}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: o.status === "accepted" ? "#16A34A" : "#DC2626" }}>
                    {o.status === "accepted" ? "✓" : "✗"}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--color-fg-muted)" }}>
                  {o.status === "accepted" ? "accettata" : "rifiutata"} da {o.seller_username} · {Math.round(o.amount).toLocaleString("it-IT")} cc
                  {o.resolved_at && ` · ${new Date(o.resolved_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}`}
                </span>
                {o.status === "rejected" && o.reject_message && (
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#991B1B", fontStyle: "italic" }}>"{o.reject_message}"</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={s.profileTabBar}>
          {PROFILE_TABS.map(({ id, label }) => {
            const count = id === "acquistati" ? purchases.length : id === "salvati" ? saved.length : null;
            return (
              <button key={id} style={{ ...s.profileTab, ...(tab === id ? s.profileTabActive : {}) }} onClick={() => setTab(id)}>
                {label}
                {count !== null && count > 0 && <span style={s.profileTabBadge}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div style={s.profileContent}>
          {tab === "acquistati" && (
            purchases.length === 0
              ? <p style={s.profileEmpty}>Non hai ancora acquistato nessun concetto.</p>
              : <div style={s.profileGrid}>{purchases.map((c) => <OwnedCard key={c.id} concept={c} onRelist={onRelist} onUnlist={onUnlist} pendingOffers={offersByConceptId[c.id] ?? []} onAcceptOffer={onAcceptOffer} onRejectOffer={onRejectOffer} />)}</div>
          )}
          {tab === "salvati" && (
            saved.length === 0
              ? <p style={s.profileEmpty}>Non hai ancora salvato nessun concetto.</p>
              : <div style={s.profileGrid}>{saved.map((c) => <SavedCard key={c.id} concept={c} onRemove={onToggleSave} />)}</div>
          )}
          {tab === "impostazioni" && <SettingsSection user={user} onLogout={onLogout} />}
        </div>

      </div>
    </div>
  );
}
