export const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const WIKI_CATEGORIES = {
  persona:  { label: "persona",  background: "#FFD43A", color: "#0E0E0C" },
  luogo:    { label: "luogo",    background: "#FF5A8A", color: "#0E0E0C" },
  scienza:  { label: "scienza",  background: "#7C4DFF", color: "#E5E4DF" },
  arte:     { label: "arte",     background: "#0E0E0C", color: "#E5E4DF" },
  evento:   { label: "evento",   background: "#FF8C00", color: "#E5E4DF" },
};

export const TYPE_LABEL = Object.fromEntries(
  Object.entries(WIKI_CATEGORIES).map(([k, v]) => [k, v.label])
);

export const ALL_TYPES = Object.keys(WIKI_CATEGORIES);

export const SAMPLES = [
  { type: "persona",  title: "Galileo Galilei",        description: "Astronomo, fisico, matematico" },
  { type: "luogo",    title: "Colosseo",                description: "L'anfiteatro della Roma imperiale" },
  { type: "scienza",  title: "DNA",                     description: "Il codice della vita" },
  { type: "arte",     title: "Monna Lisa",              description: "Il sorriso più famoso del mondo" },
  { type: "persona",  title: "Leonardo da Vinci",       description: "Genio del Rinascimento" },
  { type: "evento",   title: "Programma Apollo",        description: "L'umanità sulla Luna" },
  { type: "scienza",  title: "Buco nero",               description: "Dove la gravità vince su tutto" },
  { type: "luogo",    title: "Venezia",                 description: "La città sull'acqua" },
  { type: "arte",     title: "Cappella Sistina",        description: "Il soffitto di Michelangelo" },
  { type: "persona",  title: "Albert Einstein",         description: "E = mc²" },
  { type: "evento",   title: "Rivoluzione francese",   description: "Liberté, Égalité, Fraternité" },
  { type: "scienza",  title: "Internet",                description: "La rete che ha cambiato tutto" },
  { type: "luogo",    title: "Machu Picchu",            description: "La città perduta degli Inca" },
  { type: "persona",  title: "Maria Curie",             description: "Prima donna premio Nobel" },
  { type: "arte",     title: "La notte stellata",       description: "Van Gogh e il cielo di Saint-Rémy" },
  { type: "evento",   title: "Rinascimento",            description: "La rinascita dell'arte e del sapere" },
];

export const SORT_OPTIONS = [
  { value: "default",    label: "Predefinito" },
  { value: "price_asc",  label: "Costo ↑" },
  { value: "price_desc", label: "Costo ↓" },
  { value: "title_az",   label: "Titolo A→Z" },
];
