/* ── cando design system v2 — brutalista contemporaneo ───────────────────
   Regole fondamentali:
   - bordi sempre 2px nero
   - ombre offset, mai blur (4px 4px 0 colore)
   - hover = translate(4px, 4px) + ombra collassa
   - niente radius
   - accenti: viola primario, giallo su prezzi/eyebrow, rosa su tag
   ──────────────────────────────────────────────────────────────────────── */

const INK  = "#0E0E0C";
const BG   = "#E5E4DF";
const VIO  = "#7C4DFF";
const YEL  = "#FFD43A";
const PINK = "#FF5A8A";
const DIM  = "#5C5A52";
const MUTE = "#8A8378";

const B = `2px solid ${INK}`;

// Base condivisa per tutti i bottoni
const btnBase = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  gap: 6,
  fontFamily: "var(--f-body)", fontWeight: 700, fontSize: 12,
  textTransform: "uppercase", letterSpacing: "0.05em",
  border: B, cursor: "pointer",
  transition: "all var(--m-fast)",
  padding: "10px 18px", lineHeight: 1,
};

const s = {

  // ── pagina ────────────────────────────────────────────────────────────
  page: { fontFamily: "var(--f-body)", color: INK, background: BG, minHeight: "100vh" },

  // ── marquee bar (striscia nera in cima) ───────────────────────────────
  marqueeBar: {
    background: INK, color: BG,
    padding: "10px 0",
    fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
    overflow: "hidden", whiteSpace: "nowrap",
    borderBottom: B,
  },
  marqueeTrack: {
    display: "inline-flex", gap: 48,
    animation: "marquee 40s linear infinite",
  },

  // ── header ────────────────────────────────────────────────────────────
  header: {
    background: BG, borderBottom: B,
    padding: "16px 40px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    position: "sticky", top: 0, zIndex: 50,
  },
  wordmark: {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "none", border: "none", cursor: "pointer", padding: 0,
    fontFamily: "var(--f-body)", fontSize: 26, fontWeight: 900,
    letterSpacing: "-0.04em", color: INK,
  },
  wordmarkDot: {
    width: 10, height: 10, background: VIO,
    display: "inline-block", flexShrink: 0,
  },
  headerCenter: { display: "flex", justifyContent: "center" },
  nav: { display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" },
  navEmail: {
    fontFamily: "var(--f-mono)", fontSize: 11, color: DIM, letterSpacing: "0.04em",
  },
  coinBadge: {
    display: "inline-flex", alignItems: "center",
    background: YEL, border: B, padding: "5px 10px", gap: 6,
  },
  hamburger: {
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "none", border: B, cursor: "pointer", padding: "7px",
    color: INK, position: "relative",
  },
  notifDot: {
    position: "absolute", top: -6, right: -6,
    background: PINK, color: "#fff",
    fontFamily: "var(--f-body)", fontSize: 9, fontWeight: 700,
    border: `2px solid ${INK}`, padding: "1px 4px", minWidth: 16,
    textAlign: "center", lineHeight: "14px", pointerEvents: "none",
  },

  // ── bottoni ───────────────────────────────────────────────────────────
  btnPrimary:    { ...btnBase, background: INK,  color: BG,  boxShadow: `4px 4px 0 ${VIO}` },
  btnSecondary:  { ...btnBase, background: VIO,  color: BG,  boxShadow: `4px 4px 0 ${INK}` },
  btnGhost:      { ...btnBase, background: BG,   color: INK, boxShadow: "none" },
  btnSave:       { ...btnBase, background: BG,   color: INK, boxShadow: "none", fontSize: 11 },
  btnSaveActive: { ...btnBase, background: VIO,  color: BG,  boxShadow: `4px 4px 0 ${INK}`, fontSize: 11 },

  // ── ricerca ───────────────────────────────────────────────────────────
  searchWrap: { position: "relative" },
  searchInput: {
    width: 220, fontFamily: "var(--f-body)", fontSize: 13, fontWeight: 500,
    color: INK, padding: "10px 14px", border: B, outline: "none",
    background: BG, boxSizing: "border-box", transition: "background var(--m-fast)",
  },
  searchDropdown: {
    position: "absolute", top: "calc(100% - 2px)", left: 0, right: 0,
    background: BG, border: B, zIndex: 200, overflow: "hidden",
    boxShadow: `4px 4px 0 ${INK}`,
  },
  searchResultItem: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px", cursor: "pointer", borderBottom: B,
  },
  searchResultAvatar: {
    width: 28, height: 28, background: INK, color: BG, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 700,
  },

  // ── landing ───────────────────────────────────────────────────────────
  landingMain: { display: "flex", flexDirection: "column", alignItems: "stretch" },
  hero: {
    padding: "72px 40px 80px",
    maxWidth: 1280, margin: "0 auto", width: "100%",
  },
  heroEyebrow: {
    display: "inline-block", background: YEL, border: B,
    padding: "4px 10px", fontSize: 11, fontWeight: 700,
    letterSpacing: "0.08em", textTransform: "uppercase", color: INK,
    marginBottom: 24,
  },
  heroTitle: {
    fontFamily: "var(--f-body)", fontSize: "clamp(64px, 9vw, 120px)",
    fontWeight: 900, lineHeight: 0.88, letterSpacing: "-0.05em",
    color: INK, marginBottom: 28,
  },
  heroTitleAccent: { color: VIO },
  heroSerif: {
    fontFamily: "var(--f-serif)", fontStyle: "italic",
    fontWeight: 400, letterSpacing: "-0.02em",
  },
  heroSub: { fontSize: 17, lineHeight: 1.55, maxWidth: 460, fontWeight: 500, color: INK },
  heroAnd:  { fontFamily: "var(--f-serif)", fontStyle: "italic", fontWeight: 400 },
  heroActions: { display: "flex", gap: 12, marginTop: 32 },

  // showcase carosello
  showcaseSection: {
    borderTop: B, borderBottom: B,
    background: BG, overflow: "hidden", position: "relative",
    padding: "24px 0 32px",
  },
  showcaseLabel: {
    fontFamily: "var(--f-body)", fontSize: 10, letterSpacing: "0.1em",
    textTransform: "uppercase", color: DIM, fontWeight: 700,
    margin: "0 0 16px 40px",
  },
  sampleCard: {
    flexShrink: 0, width: 240, background: BG, border: B,
    padding: "20px", display: "flex", flexDirection: "column", gap: 10,
    boxShadow: `4px 4px 0 ${INK}`,
  },
  scroll: { display: "flex", gap: 20, width: "max-content", animation: "marquee 50s linear infinite", padding: "4px 0 8px 40px" },
  fadeLeft:  { position: "absolute", top: 0, left: 0, width: 60, bottom: 0, background: `linear-gradient(to right, ${BG}, transparent)`, pointerEvents: "none", zIndex: 1 },
  fadeRight: { position: "absolute", top: 0, right: 0, width: 60, bottom: 0, background: `linear-gradient(to left, ${BG}, transparent)`, pointerEvents: "none", zIndex: 1 },

  // ── marketplace ───────────────────────────────────────────────────────
  marketLayout: { display: "flex", minHeight: "calc(100vh - 105px)" },

  // pannello filtri scorrevole a sinistra
  filterPanelOuter: {
    overflow: "hidden", flexShrink: 0,
    borderRight: B, background: BG,
    transition: "width 220ms ease-out",
    position: "sticky", top: 0,
    alignSelf: "flex-start",
    maxHeight: "100vh", overflowY: "auto",
  },
  filterPanelInner: {
    width: 240, padding: "28px 20px",
    display: "flex", flexDirection: "column", gap: 24,
    boxSizing: "border-box",
  },
  filterPanelHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    fontFamily: "var(--f-body)", fontSize: 11, fontWeight: 700,
    letterSpacing: "0.08em", textTransform: "uppercase", color: INK,
  },

  // input inline (usato in filtri, form offerte ecc.)
  sidebarInput: {
    fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 500,
    color: INK, padding: "8px 10px", border: B,
    outline: "none", background: BG, boxSizing: "border-box",
    width: "100%",
  },
  sidebarSection: {
    fontFamily: "var(--f-body)", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.08em", textTransform: "uppercase", color: DIM,
    margin: "6px 0 4px",
  },
  sidebarRule: { border: "none", borderTop: B, margin: "8px 0" },

  marketMain: { flex: 1, padding: "32px 40px" },
  marketLabel: {
    fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: "0.06em",
    textTransform: "uppercase", color: DIM, marginBottom: 24,
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 24 },

  // ── concept card (marketplace) ────────────────────────────────────────
  conceptCard: {
    background: BG, border: B,
    display: "flex", flexDirection: "column", cursor: "default",
    boxShadow: `4px 4px 0 ${INK}`, transition: "all var(--m-fast)",
  },
  conceptBody: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, flex: 1 },
  conceptTitle: {
    fontFamily: "var(--f-body)", fontSize: 20, fontWeight: 800,
    color: INK, lineHeight: 1.1, margin: 0, letterSpacing: "-0.02em",
  },
  conceptDesc: {
    fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 500,
    color: DIM, lineHeight: 1.6, flex: 1, margin: 0,
  },
  conceptFooter: {
    display: "flex", flexDirection: "column", gap: 8, marginTop: 4,
    borderTop: B, padding: "10px 16px 14px",
  },

  // ── modal ─────────────────────────────────────────────────────────────
  overlay: {
    position: "fixed", inset: 0, background: "rgba(14,14,12,0.65)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  },
  modal: {
    background: BG, border: B, boxShadow: `8px 8px 0 ${INK}`,
    padding: "40px 44px", width: 400, position: "relative",
  },
  detailModal: {
    background: BG, border: B, boxShadow: `8px 8px 0 ${INK}`,
    padding: "48px 52px", width: 580, maxWidth: "90vw", position: "relative",
  },
  modalClose: {
    position: "absolute", top: 14, right: 14,
    background: "none", border: B, cursor: "pointer", color: INK,
    display: "flex", padding: 7,
  },
  modalTitle: {
    fontFamily: "var(--f-body)", fontSize: 28, fontWeight: 900,
    letterSpacing: "-0.03em", textAlign: "center", marginBottom: 28, color: INK,
  },
  modalForm: { display: "flex", flexDirection: "column", gap: 14 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: {
    fontFamily: "var(--f-body)", fontSize: 10, letterSpacing: "0.08em",
    textTransform: "uppercase", color: DIM, fontWeight: 700,
  },
  fieldInput: {
    fontFamily: "var(--f-body)", fontSize: 13, fontWeight: 500,
    color: INK, padding: "10px 12px", border: B,
    outline: "none", background: BG, width: "100%",
  },
  modalError: { fontFamily: "var(--f-body)", fontSize: 11, fontWeight: 700, color: "#FF3B30", textAlign: "center" },
  modalSwitch: { marginTop: 20, fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 500, color: DIM, textAlign: "center" },
  modalSwitchLink: { color: INK, fontWeight: 700, cursor: "pointer", textDecoration: "underline" },

  // ── messaggi errore ───────────────────────────────────────────────────
  errorMsg: {
    fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 600, color: "#FF3B30",
    border: `2px solid #FF3B30`, background: BG, padding: "10px 14px", marginBottom: 24,
  },
  cardError: { fontFamily: "var(--f-body)", fontSize: 11, fontWeight: 600, color: "#FF3B30", margin: 0 },

  // ── profilo ───────────────────────────────────────────────────────────
  profileWrap: { background: BG, minHeight: "calc(100vh - 105px)", padding: "48px 0 80px" },
  profileInner: { maxWidth: 960, margin: "0 auto", padding: "0 40px" },
  profileBack: {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontFamily: "var(--f-body)", fontSize: 11, fontWeight: 700,
    letterSpacing: "0.06em", textTransform: "uppercase",
    color: DIM, background: "none", border: "none", cursor: "pointer", padding: "0 0 32px",
  },
  profileHero: { display: "flex", alignItems: "center", gap: 20, marginBottom: 36 },
  avatarCircleLg: {
    width: 72, height: 72, background: INK, color: BG, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--f-body)", fontSize: 28, fontWeight: 900,
    border: B,
  },
  profileName: {
    fontFamily: "var(--f-body)", fontSize: 32, fontWeight: 900,
    letterSpacing: "-0.03em", color: INK, margin: 0,
  },

  // stats strip gialla
  profileStats: {
    display: "flex", alignItems: "stretch",
    background: YEL, border: B, boxShadow: `4px 4px 0 ${INK}`,
    marginBottom: 40,
  },
  profileStatItem: { flex: 1, textAlign: "center", padding: "18px 24px" },
  profileStatDivider: { width: 2, background: INK, flexShrink: 0 },
  profileStatNum: {
    fontFamily: "var(--f-body)", fontSize: 28, fontWeight: 900,
    letterSpacing: "-0.03em", color: INK, margin: "0 0 4px",
  },
  statLabel: {
    fontFamily: "var(--f-body)", fontSize: 10, letterSpacing: "0.08em",
    textTransform: "uppercase", color: INK, fontWeight: 700, margin: 0,
  },

  profileTabBar: { display: "flex", gap: 0, borderBottom: B, marginBottom: 40 },
  profileTab: {
    fontFamily: "var(--f-body)", fontSize: 11, fontWeight: 700,
    letterSpacing: "0.06em", textTransform: "uppercase",
    color: DIM, background: "none", border: "none", borderBottom: "2px solid transparent",
    padding: "10px 20px 10px 0", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 8,
  },
  profileTabActive: { color: INK, borderBottom: `2px solid ${INK}` },
  profileTabBadge: {
    fontFamily: "var(--f-mono)", fontSize: 10, color: INK,
    background: YEL, border: B, padding: "1px 6px",
  },
  profileContent: { paddingBottom: 40 },
  profileEmpty: { fontFamily: "var(--f-body)", fontSize: 14, fontWeight: 500, color: DIM, paddingTop: 8 },
  profileGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 },

  // card nel profilo (owned / saved)
  profileCard: {
    background: BG, border: B,
    padding: "0", display: "flex", flexDirection: "column",
    boxShadow: `4px 4px 0 ${INK}`,
  },
  profileCardBody: { padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 },
  profileCardTitle: {
    fontFamily: "var(--f-body)", fontSize: 20, fontWeight: 800,
    color: INK, lineHeight: 1.1, margin: 0, letterSpacing: "-0.02em",
  },
  profileCardDesc: {
    fontFamily: "var(--f-body)", fontSize: 12, fontWeight: 500,
    color: DIM, lineHeight: 1.6, flex: 1, margin: 0,
  },
  profileCardFooter: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    borderTop: B, padding: "14px 20px 18px",
  },

  // ── badge seconda mano ────────────────────────────────────────────────
  secondaManoBadge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: "0.08em",
    textTransform: "uppercase", color: DIM,
  },

  // ── offerte (pulsanti accetta/rifiuta) ────────────────────────────────
  offerAcceptBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, border: `2px solid ${INK}`,
    background: YEL, color: INK, cursor: "pointer", flexShrink: 0,
  },
  offerRejectBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, border: `2px solid ${INK}`,
    background: "#FF3B30", color: BG, cursor: "pointer", flexShrink: 0,
  },

  // ── varianti mobile ───────────────────────────────────────────────────
  gridMobile:  { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 },
  gridTablet:  { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 },
  profileInnerMobile: { maxWidth: 960, margin: "0 auto", padding: "0 16px" },

  profileStatsMobile: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    background: YEL, border: B, boxShadow: `4px 4px 0 ${INK}`,
    marginBottom: 32,
  },
  profileStatItemMobile: { textAlign: "center", padding: "16px 12px" },

  modalMobile: {
    background: BG, border: B, boxShadow: `8px 8px 0 ${INK}`,
    padding: "28px 20px", width: "calc(100vw - 32px)", maxWidth: 400, position: "relative",
  },

  // ── user row (risultati ricerca utenti in pagine) ─────────────────────
  userRow: {
    display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
    background: BG, border: B, cursor: "pointer",
    boxShadow: `4px 4px 0 ${INK}`, transition: "all var(--m-fast)",
  },
  userRowAvatar: {
    width: 36, height: 36, background: INK, color: BG, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--f-body)", fontSize: 16, fontWeight: 700,
  },
};

export default s;
