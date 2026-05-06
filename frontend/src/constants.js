export const API = "http://localhost:8000";

export const TYPE_LABEL = { number: "numero", date: "data", idea: "idea", filosofia: "filosofia" };

export const SAMPLES = [
  { type: "number",    title: "42",                       description: "La risposta a tutto" },
  { type: "idea",      title: "Gravity as a service",     description: "Noleggia gravità on demand" },
  { type: "date",      title: "1 gennaio 2000",           description: "Il millennium bug che non fu" },
  { type: "number",    title: "1.618",                    description: "La proporzione aurea" },
  { type: "idea",      title: "Silenzio brevettato",      description: "Un secondo di silenzio assoluto" },
  { type: "date",      title: "29 febbraio 2000",         description: "Il giorno che non doveva esistere" },
  { type: "number",    title: "0",                        description: "Il numero che ha cambiato la matematica" },
  { type: "idea",      title: "Nome per un colore",       description: "Un colore senza nome, tutto tuo" },
  { type: "date",      title: "4 ottobre 1957",           description: "Il primo satellite nello spazio" },
  { type: "number",    title: "π",                        description: "Infinito e non periodico" },
  { type: "idea",      title: "Odore di pioggia",         description: "Il petrichor come concetto in vendita" },
  { type: "date",      title: "9 novembre 1989",          description: "La caduta del muro" },
  { type: "number",    title: "−273.15",                  description: "Lo zero assoluto in gradi Celsius" },
  { type: "filosofia", title: "Permanenza",               description: "Ciò che rimane quando tutto cambia" },
  { type: "filosofia", title: "Essere",                   description: "Perché c'è qualcosa piuttosto che niente?" },
  { type: "idea",      title: "L'istante tra due pensieri", description: "Il silenzio cognitivo" },
];

export const ALL_TYPES = ["number", "date", "idea", "filosofia"];

export const SORT_OPTIONS = [
  { value: "default",    label: "Predefinito" },
  { value: "price_asc",  label: "Costo ↑" },
  { value: "price_desc", label: "Costo ↓" },
  { value: "title_az",   label: "Titolo A→Z" },
];
