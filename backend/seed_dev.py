"""
Script di sviluppo: ricrea il DB e lo popola con asset digitali Wikipedia.

    uv run python seed_dev.py
"""

import os, sys, json, time
import urllib.request, urllib.parse, urllib.error

os.chdir(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import SQLModel, Session, create_engine, select
from db import DATABASE_URL
from auth import hash_password
from main import User, Concept, Purchase

# ── Wikipedia fetch ───────────────────────────────────────

def fetch_wiki(slug: str, retries: int = 3) -> dict | None:
    url = "https://it.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(slug)
    req = urllib.request.Request(url, headers={"User-Agent": "cando-dev/1.0 (seed script)"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 5 * (attempt + 1)
                print(f"    429 — aspetto {wait}s…", end=" ", flush=True)
                time.sleep(wait)
            else:
                print(f"    ! HTTP {e.code} per '{slug}'")
                return None
        except Exception as e:
            print(f"    ! impossibile caricare '{slug}': {e}")
            return None
    print(f"    ! '{slug}' ignorata dopo {retries} tentativi")
    return None

def first_sentence(text: str, max_len: int = 280) -> str:
    text = text.replace("\n", " ").strip()
    idx = text.find(". ")
    if 20 <= idx < max_len:
        return text[:idx + 1]
    return (text[:max_len] + "…") if len(text) > max_len else text


# ── Dati ──────────────────────────────────────────────────

USERS = [
    dict(username="marco",  email="marco@dev.local",  password="pass"),
    dict(username="giulia", email="giulia@dev.local", password="pass"),
    dict(username="luca",   email="luca@dev.local",   password="pass"),
    dict(username="sofia",  email="sofia@dev.local",  password="pass"),
]

# (wikipedia_slug, categoria, prezzo_base)
WIKI_PAGES = [
    # Persone
    ("Galileo_Galilei",           "persona",  280),
    ("Leonardo_da_Vinci",         "persona",  350),
    ("Marco_Polo",                "persona",  180),
    ("Michelangelo",              "persona",  320),
    ("Dante_Alighieri",           "persona",  290),
    ("Maria_Curie",               "persona",  260),
    ("Isaac_Newton",              "persona",  310),
    ("Albert_Einstein",           "persona",  400),
    ("Nikola_Tesla",              "persona",  230),
    ("Cleopatra",                 "persona",  200),
    ("Giulio_Cesare",             "persona",  240),
    ("Ada_Lovelace",              "persona",  190),
    # Luoghi
    ("Colosseo",                  "luogo",    190),
    ("Torre_di_Pisa",             "luogo",    140),
    ("Venezia",                   "luogo",    220),
    ("Pompei",                    "luogo",    170),
    ("Machu_Picchu",              "luogo",    210),
    ("Grande_Muraglia_cinese",    "luogo",    180),
    ("Monte_Everest",             "luogo",    160),
    ("Stonehenge",                "luogo",    130),
    ("Colosseo",                  "luogo",    190),   # dedup handled
    ("Antartide",                 "luogo",    250),
    # Scienza
    ("DNA",                       "scienza",  250),
    ("Buco_nero",                 "scienza",  300),
    ("Penicillina",               "scienza",  200),
    ("Intelligenza_artificiale",  "scienza",  350),
    ("Internet",                  "scienza",  400),
    ("Relatività_ristretta",      "scienza",  280),
    ("Vaccino",                   "scienza",  220),
    ("Meccanica_quantistica",     "scienza",  320),
    ("Gravità",                   "scienza",  260),
    # Arte
    ("Monna_Lisa",                "arte",     450),
    ("David_(Michelangelo)",      "arte",     380),
    ("Cappella_Sistina",          "arte",     420),
    ("La_notte_stellata",         "arte",     340),
    ("Nascita_di_Venere",         "arte",     360),
    ("Creazione_di_Adamo",        "arte",     390),
    # Evento
    ("Prima_guerra_mondiale",     "evento",   150),
    ("Seconda_guerra_mondiale",   "evento",   160),
    ("Programma_Apollo",          "evento",   300),
    ("Rivoluzione_francese",      "evento",   180),
    ("Rinascimento",              "evento",   250),
    ("Rivoluzione_industriale",   "evento",   200),
    ("Caduta_del_muro_di_Berlino","evento",   170),
]


# ── Script ────────────────────────────────────────────────

def main():
    engine = create_engine(DATABASE_URL, echo=False)

    print("Eliminazione del database esistente…")
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as s:
        # Utenti
        users = []
        for u in USERS:
            user = User(username=u["username"], email=u["email"],
                        hashed_password=hash_password(u["password"]), coins=1000)
            s.add(user)
            users.append(user)
        s.commit()
        for u in users:
            s.refresh(u)
        print(f"  {len(users)} utenti creati")

        # Asset Wikipedia
        concepts = []
        seen_slugs: set[str] = set()

        for slug, categoria, prezzo in WIKI_PAGES:
            if slug in seen_slugs:
                continue
            seen_slugs.add(slug)

            print(f"  Fetch: {slug}…", end=" ", flush=True)
            data = fetch_wiki(slug)
            if not data:
                continue

            title       = data.get("title", slug.replace("_", " "))
            extract     = data.get("extract", "")
            description = first_sentence(extract) if extract else title
            thumbnail   = data.get("thumbnail", {}).get("source")
            wiki_url    = data.get("content_urls", {}).get("desktop", {}).get("page", "")

            concept = Concept(
                type=categoria,
                title=title,
                description=description,
                price=float(prezzo),
                wikipedia_url=wiki_url,
                wikipedia_thumbnail=thumbnail,
            )
            s.add(concept)
            concepts.append(concept)
            print("ok")
            time.sleep(1.2)   # rispetta rate limit Wikipedia

        s.commit()
        for c in concepts:
            s.refresh(c)
        print(f"  {len(concepts)} asset creati")

        # Qualche acquisto di esempio (solo se ci sono abbastanza concetti)
        purchases = []
        if len(concepts) >= 4:
            pairs = [
                (users[0], concepts[0]),
                (users[1], concepts[1]),
                (users[2], concepts[2]),
                (users[3], concepts[3]),
            ]
            for buyer, concept in pairs:
                if buyer.coins >= int(concept.price):
                    buyer.coins -= int(concept.price)
                    concept.listed = False
                    concept.owner_id = buyer.id
                    s.add(buyer); s.add(concept)
                    s.add(Purchase(user_id=buyer.id, concept_id=concept.id))
                    purchases.append((buyer.username, concept.title))
            s.commit()
        print(f"  {len(purchases)} acquisti di esempio")

    print(f"\nDatabase pronto. {len(concepts)} asset, {len(users)} utenti.")
    print("Credenziali: marco / giulia / luca / sofia — password: pass")


if __name__ == "__main__":
    main()
