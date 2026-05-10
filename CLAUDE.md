# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Avvio

**Backend** (dalla root del repo):
```bash
cd backend && uv run uvicorn main:app --reload
# http://localhost:8000 — docs interattive: http://localhost:8000/docs
```

**Frontend** (dalla root del repo):
```bash
cd frontend && npm run dev
# http://localhost:5173
```

**Reset DB + seed dati di sviluppo:**
```bash
rm -f backend/cando.db && cd backend && uv run python seed_dev.py
```
Necessario ogni volta che cambia lo schema delle tabelle SQLModel (nessuna migration automatica).

## Architettura

Monorepo con due directory indipendenti:

- `backend/` — FastAPI + SQLModel + SQLite (`cando.db`), Python ≥3.12, package manager `uv`
- `frontend/` — React 18 + Vite + React Router v6, JSX (no TypeScript)

Il frontend chiama il backend direttamente via `fetch` su `http://localhost:8000`. Il CORS è aperto solo su `localhost:5173`.

## Rotte frontend (React Router)

| Path | Componente |
|---|---|
| `/` | LandingPage (non autenticato) o redirect a `/piazza` |
| `/piazza` | MarketplacePage |
| `/profilo` | ProfilePage |
| `/utenti/:userId` | UserPublicProfile |

Le rotte `/piazza`, `/profilo`, `/utenti/:userId` richiedono autenticazione — altrimenti redirect a `/`.

## Comportamento atteso

Se il messaggio dell'utente è una domanda esplorativa ("è meglio fare X?", "quanto è complesso Y?", "cosa ne pensi di Z?"), rispondi solo con la tua opinione/valutazione — **non implementare nulla**. Aspetta un'indicazione esplicita ("fallo", "vai", "implementa") prima di toccare il codice.

## Convenzioni

**Backend:** usa sempre `uv run <cmd>` invece di `python` o `pip` direttamente. Le dipendenze si aggiungono con `uv add <pacchetto>`.

**Frontend:** stili inline con oggetto `s` importato da `src/styles.js` (niente CSS esterno). I componenti riusabili stanno in `src/components/`.

**Test backend:** `cd backend && uv run pytest` — usa SQLite in memoria con `StaticPool`, nessun DB su disco.

**Test frontend:** `cd frontend && npm test` — vitest + jsdom + @testing-library/react.
