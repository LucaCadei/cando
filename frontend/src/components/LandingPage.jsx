import { useState } from "react";
import { SAMPLES } from "../constants.js";
import { Badge } from "./Badge.jsx";
import { CoinAmount } from "./CoinIcon.jsx";
import s from "../styles.js";

// Scheda compatta nel carosello landing — niente interazioni
function SampleCard({ concept }) {
  return (
    <div style={s.sampleCard}>
      <Badge type={concept.type} />
      <p style={{ ...s.conceptTitle, fontSize: 18 }}>{concept.title}</p>
      <p style={s.conceptDesc}>{concept.description}</p>
    </div>
  );
}

// Blocco stat giallo — cifre grandi come nel design system
function StatBlock({ value, label }) {
  return (
    <div style={{ padding: "20px 24px", textAlign: "center", borderRight: "2px solid #0E0E0C" }}>
      <div style={{ fontFamily: "var(--f-body)", fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontFamily: "var(--f-body)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

export function LandingPage({ onLogin, onRegister }) {
  return (
    <main style={s.landingMain}>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{ borderBottom: "2px solid #0E0E0C", padding: "0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "64px 40px 72px", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 48, alignItems: "end" }}>

          <div>
            <span style={s.heroEyebrow}>↘ la piazza dei concetti · 2026</span>
            <h1 style={s.heroTitle}>
              oggetti che<br />
              non{" "}
              <span style={{ ...s.heroSerif, color: "#7C4DFF" }}>esistono.</span>
            </h1>
            <p style={s.heroSub}>
              Acquista ciò che non può essere toccato. Numeri, idee, date e filosofie — ognuno irripetibile, certificato dal venditore.
            </p>
            <div style={s.heroActions}>
              <button
                style={{ ...s.btnPrimary, padding: "14px 28px", fontSize: 13 }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(4px, 4px)"; e.currentTarget.style.boxShadow = "none"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "4px 4px 0 #7C4DFF"; }}
                onClick={onRegister}
              >
                inizia a collezionare
              </button>
              <button
                style={{ ...s.btnGhost, padding: "14px 28px", fontSize: 13 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#FFD43A"; e.currentTarget.style.border = "2px solid #0E0E0C"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#E5E4DF"; e.currentTarget.style.border = "2px solid #0E0E0C"; }}
                onClick={onLogin}
              >
                accedi
              </button>
            </div>
          </div>

          {/* Stats block — giallo con bordi */}
          <div style={{ border: "2px solid #0E0E0C", background: "#FFD43A", boxShadow: "6px 6px 0 #0E0E0C", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {[
              ["∞", "concetti"],
              ["4", "categorie"],
              ["0€", "listing"],
              ["cc", "valuta"],
            ].map(([v, l], i) => (
              <div key={l} style={{
                padding: "20px 24px", textAlign: "center",
                borderRight: i % 2 === 0 ? "2px solid #0E0E0C" : "none",
                borderBottom: i < 2 ? "2px solid #0E0E0C" : "none",
              }}>
                <div style={{ fontFamily: "var(--f-body)", fontSize: 36, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6 }}>{v}</div>
                <div style={{ fontFamily: "var(--f-body)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Carosello campioni ────────────────────────────────────── */}
      <section style={s.showcaseSection}>
        <p style={s.showcaseLabel}>cosa trovi dentro</p>
        {/* Il carosello duplica la lista tre volte per l'effetto loop via CSS */}
        <div style={{ overflow: "hidden", position: "relative" }}>
          <div style={s.scroll}>
            {[...SAMPLES, ...SAMPLES, ...SAMPLES].map((c, i) => (
              <SampleCard key={i} concept={c} />
            ))}
          </div>
        </div>
        <div style={s.fadeLeft} />
        <div style={s.fadeRight} />
      </section>

      {/* ── Come funziona ─────────────────────────────────────────── */}
      <section style={{ borderTop: "2px solid #0E0E0C", padding: "64px 40px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <span style={{ ...s.heroEyebrow, marginBottom: 40, display: "inline-block" }}>↘ come funziona</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, border: "2px solid #0E0E0C" }}>
            {[
              { n: "01", title: "esplora il catalogo", desc: "Sfoglia concetti per categoria — numeri, date, idee, filosofie. Ogni oggetto è unico." },
              { n: "02", title: "acquista o offri", desc: "Compra al prezzo fisso con i tuoi cando coin, o fai un'offerta al venditore." },
              { n: "03", title: "possiedi e rivendi", desc: "Il concetto è tuo. Puoi tenerlo, metterlo in vendita o accettare offerte da altri collezionisti." },
            ].map((step, i) => (
              <div key={step.n} style={{ padding: "36px 32px", borderRight: i < 2 ? "2px solid #0E0E0C" : "none" }}>
                <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#5C5A52", marginBottom: 16 }}>{step.n}</div>
                <h3 style={{ fontFamily: "var(--f-body)", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>{step.title}</h3>
                <p style={{ fontFamily: "var(--f-body)", fontSize: 13, fontWeight: 500, color: "#5C5A52", lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
