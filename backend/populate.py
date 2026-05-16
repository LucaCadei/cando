"""
Script CLI per alimentare il catalogo Cando con nuovi asset da Wikipedia.

Uso:
    uv run python populate.py --query "impressionisti francesi" --type persona --count 10
    uv run python populate.py --query "vulcani del mondo"       --type luogo   --count 5 --price 150
    uv run python populate.py --query "fisica quantistica"      --type scienza --count 8 --unlisted

Opzioni:
    --query      Termini di ricerca inviati all'API Wikipedia (obbligatorio)
    --type       Categoria del concetto: persona | luogo | scienza | arte | evento (obbligatorio)
    --count      Quanti asset inserire, default 10
    --price      Prezzo base in CandoCoin, default 200
    --lang       Lingua Wikipedia, default "it"
    --unlisted   Se presente, gli asset vengono inseriti senza metterli subito in vendita
"""

import argparse, json, time, urllib.request, urllib.parse, urllib.error
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select, create_engine, SQLModel
from db import DATABASE_URL
from main import Concept

VALID_TYPES = {"persona", "luogo", "scienza", "arte", "evento"}

# ── Wikipedia helpers ─────────────────────────────────────

def search_wikipedia(query: str, lang: str = "it", limit: int = 50) -> list[str]:
    """Ritorna i titoli delle pagine Wikipedia che corrispondono alla query."""
    params = urllib.parse.urlencode({
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srlimit": limit,
        "format": "json",
    })
    url = f"https://{lang}.wikipedia.org/w/api.php?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "cando/1.0 (populate)"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            return [r["title"] for r in data.get("query", {}).get("search", [])]
    except Exception as e:
        print(f"! Errore ricerca Wikipedia: {e}")
        return []


def fetch_summary(title: str, lang: str = "it", retries: int = 3) -> dict | None:
    """Recupera il summary REST di Wikipedia per un titolo. Ritorna None in caso di errore."""
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}"
    req = urllib.request.Request(url, headers={"User-Agent": "cando/1.0 (populate)"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 5 * (attempt + 1)
                print(f"  429 — aspetto {wait}s…", end=" ", flush=True)
                time.sleep(wait)
            else:
                print(f"  ! HTTP {e.code} per '{title}'")
                return None
        except Exception as e:
            print(f"  ! impossibile caricare '{title}': {e}")
            return None
    print(f"  ! '{title}' ignorata dopo {retries} tentativi")
    return None


def first_sentence(text: str, max_len: int = 280) -> str:
    """Estrae la prima frase dal testo; tronca se troppo lungo."""
    text = text.replace("\n", " ").strip()
    idx = text.find(". ")
    if 20 <= idx < max_len:
        return text[:idx + 1]
    return (text[:max_len] + "…") if len(text) > max_len else text


# ── Logica di inserimento ─────────────────────────────────

def populate(
    query: str,
    concept_type: str,
    count: int,
    price: int,
    lang: str = "it",
    listed: bool = True,
    engine=None,          # iniettabile per i test
) -> int:
    """
    Cerca su Wikipedia e inserisce nuovi concetti nel DB.
    Salta i duplicati (stesso wikipedia_url già presente).
    Restituisce il numero di asset effettivamente inseriti.
    """
    if engine is None:
        engine = create_engine(DATABASE_URL, echo=False)
    SQLModel.metadata.create_all(engine)

    # Chiediamo più risultati del necessario per compensare duplicati e fetch falliti
    titles = search_wikipedia(query, lang=lang, limit=count * 4)
    if not titles:
        print("Nessun risultato dalla ricerca Wikipedia.")
        return 0

    inserted = 0
    with Session(engine) as session:
        for title in titles:
            if inserted >= count:
                break

            print(f"  {title}…", end=" ", flush=True)
            data = fetch_summary(title, lang=lang)
            if not data:
                print("errore fetch, skip")
                continue

            wiki_url = data.get("content_urls", {}).get("desktop", {}).get("page", "")

            # Deduplicazione per URL Wikipedia
            if wiki_url:
                already = session.exec(
                    select(Concept).where(Concept.wikipedia_url == wiki_url)
                ).first()
                if already:
                    print("già presente, skip")
                    continue

            thumbnail   = (data.get("thumbnail") or {}).get("source")
            extract     = data.get("extract", "")
            description = first_sentence(extract) if extract else title

            concept = Concept(
                type=concept_type,
                title=data.get("title", title),
                description=description,
                price=float(price),
                wikipedia_url=wiki_url,
                wikipedia_thumbnail=thumbnail,
                listed=listed,
            )
            session.add(concept)
            session.commit()
            session.refresh(concept)
            print(f"ok (id={concept.id[:8]})")
            inserted += 1
            time.sleep(1.0)   # rispetta rate limit Wikipedia

    return inserted


# ── CLI ───────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Popola il catalogo Cando con asset da Wikipedia.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="I parametri possono essere passati anche come variabili d'ambiente "
               "(POPULATE_QUERY, POPULATE_TYPE, POPULATE_COUNT, POPULATE_PRICE, "
               "POPULATE_LANG, POPULATE_UNLISTED) — utile per Cloud Run Jobs.",
    )
    # Tutti opzionali: se mancano dalla CLI vengono letti dalle env var
    parser.add_argument("--query",    default=None, help="Query di ricerca (env: POPULATE_QUERY)")
    parser.add_argument("--type",     default=None, choices=sorted(VALID_TYPES), dest="concept_type",
                        metavar="TYPE", help=f"Tipo concetto: {', '.join(sorted(VALID_TYPES))} (env: POPULATE_TYPE)")
    parser.add_argument("--count",    type=int, default=None, help="Asset da inserire, default 10 (env: POPULATE_COUNT)")
    parser.add_argument("--price",    type=int, default=None, help="Prezzo base in cc, default 200 (env: POPULATE_PRICE)")
    parser.add_argument("--lang",     default=None,           help="Lingua Wikipedia, default 'it' (env: POPULATE_LANG)")
    parser.add_argument("--unlisted", action="store_true",    help="Non mettere subito in vendita (env: POPULATE_UNLISTED=true)")

    args = parser.parse_args()

    # Fallback su variabili d'ambiente se il flag CLI non è stato passato
    query        = args.query        or os.getenv("POPULATE_QUERY")
    concept_type = args.concept_type or os.getenv("POPULATE_TYPE")
    count        = args.count        or int(os.getenv("POPULATE_COUNT",  "10"))
    price        = args.price        or int(os.getenv("POPULATE_PRICE",  "200"))
    lang         = args.lang         or os.getenv("POPULATE_LANG",  "it")
    listed       = not args.unlisted and os.getenv("POPULATE_UNLISTED", "").lower() != "true"

    if not query:
        parser.error("--query è obbligatorio (oppure imposta la variabile POPULATE_QUERY)")
    if not concept_type:
        parser.error(f"--type è obbligatorio: scegli tra {', '.join(sorted(VALID_TYPES))} (oppure POPULATE_TYPE)")
    if concept_type not in VALID_TYPES:
        parser.error(f"Tipo non valido: '{concept_type}'. Scegli tra {', '.join(sorted(VALID_TYPES))}")

    print(f"\nQuery   : {query}")
    print(f"Tipo    : {concept_type}")
    print(f"Target  : {count} asset | prezzo: {price} cc | in vendita: {listed}")
    print(f"Lingua  : {lang}\n")

    n = populate(
        query=query,
        concept_type=concept_type,
        count=count,
        price=price,
        lang=lang,
        listed=listed,
    )

    print(f"\n{'✓' if n > 0 else '!'} {n} asset inseriti.")


if __name__ == "__main__":
    main()
