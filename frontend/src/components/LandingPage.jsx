import { SAMPLES } from "../constants.js";
import { Badge } from "./Badge.jsx";
import s from "../styles.js";

// Scheda compatta usata solo nel carosello della landing — non ha interazioni.
function SampleCard({ concept }) {
  return (
    <div style={s.sampleCard}>
      <Badge type={concept.type} />
      <p style={s.conceptTitle}>{concept.title}</p>
      <p style={s.conceptDesc}>{concept.description}</p>
    </div>
  );
}

export function LandingPage() {
  return (
    <main style={s.landingMain}>
      <div style={s.hero}>
        <p style={s.heroEyebrow}>la piazza dei concetti</p>
        <h1 style={s.heroTitle}>
          Concepts
          <em style={s.heroAnd}> and </em>
          Objects
        </h1>
        <p style={s.heroSub}>
          Numeri, date, idee e oggetti impossibili. Acquista ciò che non può essere toccato.
        </p>
      </div>

      <div style={s.showcaseRule} />

      <section style={s.showcase}>
        <p style={s.showcaseLabel}>cosa trovi dentro</p>
        {/* Il carosello duplica la lista per creare l'effetto loop infinito via CSS */}
        <div className="scroll-outer">
          <div className="scroll-track">
            {[...SAMPLES, ...SAMPLES].map((c, i) => (
              <SampleCard key={i} concept={c} />
            ))}
          </div>
        </div>
        <div style={s.fadeLeft} />
        <div style={s.fadeRight} />
      </section>
    </main>
  );
}
