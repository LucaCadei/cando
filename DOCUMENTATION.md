# Cando — Documentazione del sistema

Cando è un marketplace di **asset digitali Wikipedia**: ogni asset è legato a una pagina di Wikipedia (persona, luogo, evento scientifico, opera d'arte, evento storico) ed è unico — può essere posseduto da una sola persona alla volta. La valuta interna è il **CandoCoin (cc)**.

---

## Indice

1. [Economia e valuta](#1-economia-e-valuta)
2. [Asset — cosa si vende](#2-asset--cosa-si-vende)
3. [Marketplace](#3-marketplace)
4. [Acquisto diretto](#4-acquisto-diretto)
5. [Offerte private](#5-offerte-private)
6. [Aste](#6-aste)
7. [Profilo personale](#7-profilo-personale)
8. [Watchlist — salvati](#8-watchlist--salvati)
9. [Follow e notifiche follower](#9-follow-e-notifiche-follower)
10. [Notifiche aste](#10-notifiche-aste)
11. [Ricerca utenti](#11-ricerca-utenti)
12. [Sistema di notifiche — header](#12-sistema-di-notifiche--header)
13. [Riferimento API](#13-riferimento-api)

---

## 1. Economia e valuta

La valuta di Cando è il **CandoCoin (cc)**.

- Ogni nuovo account riceve **1.000 cc** alla registrazione.
- I coin vengono addebitati all'acquirente e accreditati al venditore nel momento della transazione.
- Non esiste modo di creare coin al di fuori del saldo iniziale — la quantità totale nel sistema è fissa.
- Il saldo è sempre visibile nell'header, accanto al chip utente.

### Transazioni che modificano il saldo

| Evento | Acquirente | Venditore |
|--------|-----------|-----------|
| Acquisto diretto | `− prezzo` | `+ prezzo` |
| Offerta accettata | `− importo offerta` | `+ importo offerta` |
| Asta vinta | `− offerta vincente` | `+ offerta vincente` |

Le offerte e le aste **non bloccano** il saldo in anticipo: il controllo viene fatto al momento dell'accettazione / chiusura dell'asta.

---

## 2. Asset — cosa si vende

Il catalogo è composto da asset legati a pagine di Wikipedia italiana, in cinque categorie:

| Tipo | Colore | Esempi |
|------|--------|--------|
| `persona` | Giallo | Galileo Galilei, Marie Curie, Einstein |
| `luogo` | Rosa | Colosseo, Venezia, Machu Picchu |
| `scienza` | Viola | DNA, Buco nero, Internet |
| `arte` | Nero | Monna Lisa, Cappella Sistina, La notte stellata |
| `evento` | Arancio | Prima guerra mondiale, Programma Apollo, Rinascimento |

Ogni asset ha:
- **Titolo** — il nome dell'argomento Wikipedia
- **Descrizione** — primo capoverso estratto dall'articolo Wikipedia
- **`wikipedia_url`** — URL della pagina Wikipedia italiana
- **`wikipedia_thumbnail`** — URL dell'immagine rappresentativa presa dall'API Wikipedia
- **Prezzo** — in CandoCoin, stabilito dal venditore corrente
- **Tipo** — una delle cinque categorie sopra
- **Proprietario corrente** — `null` se ancora sul mercato primario, altrimenti l'utente che lo possiede
- **Stato** — `listed` (in vendita), `unlisted` (ritirato), `in_auction` (bloccato da asta attiva)

Il catalogo è **curato**: solo il superuser può aggiungere nuovi asset (endpoint `POST /concepts` protetto da `X-Admin-Key`). Gli utenti normali possono solo acquistare, vendere e scambiare asset esistenti.

Un asset con proprietario pregresso viene marcato come **seconda mano** nel marketplace.

---

## 3. Marketplace

La piazza (`/piazza`) mostra tutti i concetti attivamente in vendita (`listed = true`).

### Filtri

I filtri si trovano in un **pannello scorrevole a sinistra** (chiuso per default, si apre con il bottone "filtri"):

- **Tipo** — chip selezionabili: tutto / persona / luogo / scienza / arte / evento
- **Ricerca testuale** — filtra per titolo o descrizione in tempo reale
- **Ordinamento** — prezzo crescente, prezzo decrescente, più recenti

### Indicatori sulla card

- **Badge tipo** — colore identificativo del tipo
- **Badge "seconda mano"** — icona persona se il concetto ha già avuto un proprietario
- **Prezzo** — blocco giallo con importo in cc
- **Bottone "vedi"** — apre il dettaglio del concetto

### Dettaglio concetto

Cliccando su "vedi" si apre un pannello modale che mostra:
- Titolo e descrizione completa
- Prezzo
- **Catena di proprietari** — tutti gli utenti che hanno mai posseduto il concetto, con prezzo e data di acquisto
- **Contatore salvataggi** — quante persone lo hanno in watchlist
- Bottone **"salva"** (toggle watchlist) e bottone **"acquista"** affiancati in basso

---

## 4. Acquisto diretto

Un utente può acquistare qualsiasi concetto `listed` purché:
- Non sia già il proprietario
- Il suo saldo sia sufficiente
- Il concetto non sia bloccato da un'asta attiva (`in_auction = false`)

Al momento dell'acquisto:
1. Il prezzo viene scalato dal saldo dell'acquirente
2. Se il concetto aveva un proprietario precedente, il prezzo viene accreditato a lui
3. Il venditore riceve una **notifica di vendita** nella campanella (sezione "vendite")
4. Il concetto passa in `listed = false` (il nuovo proprietario decide se e quando rimetterlo in vendita)
5. L'acquisto viene registrato nella **cronologia di proprietà** del concetto e nello **storico acquisti** del compratore

---

## 5. Offerte private

Un utente può fare un'offerta al proprietario di qualsiasi concetto, anche se non è in vendita.

### Regole

- Non si può fare un'offerta su un proprio concetto
- Non si può fare un'offerta su un concetto in asta (`in_auction = true`)
- Si può avere **una sola offerta pendente** per concetto
- Il venditore riceve una notifica nella campanella

### Ciclo di vita di un'offerta

```
[acquirente invia offerta]
        ↓
   PENDING
        ↓
   ┌─────────────────────────────────┐
   │                                 │
ACCEPTED                          REJECTED
(con messaggio opzionale)      (con messaggio opzionale)
```

**Se accettata:**
- Il saldo dell'acquirente viene verificato al momento dell'accettazione
- I coin vengono trasferiti
- Il concetto cambia proprietario
- Tutte le altre offerte pendenti sullo stesso concetto vengono rifiutate automaticamente

**Se rifiutata:**
- Il venditore può allegare un messaggio di spiegazione
- L'acquirente vede l'esito nella campanella (sezione "aggiornamenti offerte")

---

## 6. Aste

Il venditore può mettere all'asta uno dei propri concetti, impostando un **prezzo minimo** e una **durata**.

### Avvio dell'asta

Dal proprio profilo, su qualsiasi concetto non in vendita e non già in asta:
1. Cliccare **"asta"** sulla card del concetto
2. Inserire il prezzo minimo (cc) — sotto questo importo nessuna offerta è valida
3. Scegliere la durata: 1 ora / 6 ore / 12 ore / 24 ore / 3 giorni / 1 settimana
4. Confermare: l'asta si avvia immediatamente

Durante l'asta il concetto è **bloccato**: nessun acquisto diretto, offerta privata, rimessa in vendita o ritiro è possibile.

Tutti i **follower del venditore** ricevono una notifica con link diretto alla pagina dell'asta.

### Pagina dell'asta (`/aste/:id`)

La pagina mostra in tempo reale:

| Sezione | Contenuto |
|---------|-----------|
| **Intestazione** | Titolo del concetto, tipo, venditore, stato (in corso / terminata) |
| **Strip statistiche** | Prezzo minimo · Offerta attuale · Countdown |
| **Form offerta** | Disponibile solo se l'asta è attiva e l'utente non è il venditore |
| **Storico offerte** | Tutte le offerte in ordine cronologico con username, importo, orario; la più alta evidenziata con badge "top" |
| **Banner risultato** | Mostrato a fine asta: vincitore e importo, o "nessuna offerta valida" |

Il countdown è live (aggiornato ogni secondo). Le offerte degli altri utenti appaiono ogni 15 secondi tramite polling automatico.

### Regole sulle offerte in asta

- Ogni offerta deve essere **≥ prezzo minimo** e **> offerta attuale più alta**
- Il saldo viene verificato ma **non bloccato** — i coin vengono addebitati solo alla chiusura
- Nessun limite al numero di offerte per utente
- Il venditore non può offrire sulla propria asta

### Chiusura e risoluzione

Un **job schedulato** (`APScheduler BackgroundScheduler`) gira ogni **60 secondi** in un thread separato e risolve tutte le aste scadute. In aggiunta, la risoluzione avviene anche **lazily** alla prima richiesta ricevuta dopo la scadenza (GET alla pagina o nuova offerta), come fallback immediato.

**Con offerte valide (≥ prezzo minimo):**
1. Viene individuata l'offerta più alta
2. I coin vengono trasferiti (acquirente → venditore)
3. Il concetto cambia proprietario; l'acquisto viene registrato nello storico
4. L'asta passa allo stato `ended` con `winner_id` e `winning_bid`
5. **Notifiche inviate:**
   - Vincitore → `auction_won` ("hai vinto!")
   - Venditore → `auction_sold` ("venduto a X per Y cc")
   - Tutti gli altri offerenti → `auction_lost` ("asta persa — vinto da X per Y cc")

**Senza offerte valide:**
1. Il concetto torna disponibile al venditore (non più in asta)
2. L'asta passa allo stato `ended` senza vincitore
3. Nessuna notifica inviata

**Caso edge — saldo insufficiente al momento della chiusura:** se il bidder vincente ha speso i coin nel frattempo e non ha più saldo sufficiente, l'asta si chiude senza vincitore e il concetto torna al venditore.

### Tab "aste" nel profilo personale

Il tab "aste" nel profilo mostra tutte le aste a cui l'utente sta **partecipando come offerente** (aste attive con almeno un'offerta piazzata). Per ogni asta:
- Badge **"in testa"** (giallo) o **"superato"** (nero) in base all'ultima offerta
- Importo della propria offerta più alta
- Tempo rimasto
- Bottone "vai →" che porta alla pagina dell'asta

---

## 7. Profilo personale

Il profilo personale (`/profilo`) si apre cliccando sul chip utente nell'header.

### Hero

Il banner in cima al profilo mostra su sfondo viola:
- Avatar quadrato grande con l'iniziale del nome
- Username in grande
- Email in tono attenuato

### Strip statistiche

| Statistica | Descrizione |
|------------|-------------|
| Saldo | Coin correnti, visualizzati con icona CandoCoin |
| Portafoglio cc | Totale speso in acquisti (somma dei prezzi pagati) |
| Acquistati | Numero di concetti attualmente posseduti |
| Salvati | Numero di concetti in watchlist |

### Notifiche in cima al profilo

Rimangono visibili sul profilo (oltre che nella campanella):
- **Aste in corso** — da utenti seguiti
- **Nuovi follower** — con bottone "segui anche tu"
- **Aggiornamenti offerte inviate** — accettate/rifiutate

### Tab "acquistati"

Tutti i concetti di cui si è proprietari, con le relative azioni disponibili.

**Azioni per concetto non in asta:**
- **"vendi"** — imposta un nuovo prezzo e rimette il concetto in vendita nel marketplace
- **"asta"** — avvia un'asta (vedi §6)
- **"ritira"** — se in vendita, lo ritira dal marketplace

**Se in asta:**
- Indicatore viola **"● in asta"**
- Bottone **"vedi asta →"** che porta alla pagina dell'asta

**Offerte ricevute su un concetto:**
Se ci sono offerte pendenti, la card mostra un pannello viola con l'offerta, il mittente e i pulsanti accetta / rifiuta (con messaggio opzionale).

### Tab "salvati"

Lista dei concetti in watchlist. Ogni card ha il bottone "rimuovi".

### Tab "aste"

Aste a cui l'utente sta partecipando come offerente. Vedi §6 per i dettagli.

### Tab "storico"

Lista di tutti gli acquisti effettuati, in ordine cronologico inverso (più recenti prima). Per ogni acquisto:
- Badge tipo del concetto
- Titolo
- Prezzo pagato in cc (in viola)
- Data dell'acquisto

### Tab "impostazioni"

Username, email e bottone "esci dall'account".

---

## 8. Watchlist — salvati

Qualsiasi utente può salvare un concetto cliccando il bottone sulla card del marketplace o nella modale di dettaglio. Il salvataggio è un toggle: cliccare di nuovo rimuove dalla watchlist.

I concetti salvati sono visibili nel tab "salvati" del profilo. Non generano notifiche e non riservano il concetto.

---

## 9. Follow e notifiche follower

Un utente può seguire qualsiasi altro utente visitando il suo **profilo pubblico** (`/utenti/:id`).

### Profilo pubblico

Mostra:
- Avatar (iniziale del nome), username
- Strip statistiche: **follower · seguiti · possiede** (n. concetti)
- Bottone **"+ segui"** / **"✓ stai seguendo"** (non visibile sul proprio profilo)
- Sezione **aste in corso** dell'utente (se presenti) con bottone "vai →"
- Griglia di tutti i concetti posseduti dall'utente con possibilità di fare offerta

### Comportamento del follow

- Il follow è un **toggle**: cliccare di nuovo toglie il follow
- Seguire qualcuno genera una **notifica** per chi viene seguito
- Se A segue B e B segue già A, la notifica mostra `is_mutual = true`
- Se A toglie il follow e poi ri-segue senza che B abbia visto la prima notifica, viene creata **una sola notifica** (deduplicazione)
- Dopo che B ha visto la notifica, un nuovo follow da A genera una nuova notifica
- Togliere il follow **non genera notifiche**

### Segui anche tu

Dalla campanella o dal profilo, il followed può cliccare **"segui anche tu"**:
- Chiama il toggle follow
- Aggiorna immediatamente la notifica a `is_mutual = true` (ottimisticamente, senza re-fetch)

### Contatori

I contatori di follower e seguiti sul profilo pubblico si aggiornano in tempo reale con il bottone di follow/unfollow (aggiornamento ottimistico del client).

---

## 10. Notifiche aste

Quando un utente avvia un'asta, **tutti i suoi follower** ricevono una notifica.

La notifica contiene:
- Titolo e tipo del concetto
- Username del venditore
- Prezzo minimo
- Data/ora di scadenza

Le notifiche appaiono nella sezione **"aste in corso"** della campanella e in cima al profilo. Cliccando su una notifica o sul bottone "vai →", l'utente viene portato direttamente alla pagina dell'asta.

---

## 11. Ricerca utenti

La barra di ricerca nell'header (visibile solo agli utenti autenticati) permette di cercare altri utenti per username.

- La ricerca inizia dopo il primo carattere
- I risultati appaiono in un dropdown con avatar e username
- Cliccando su un risultato si naviga al profilo pubblico dell'utente

---

## 12. Sistema di notifiche — header

### Chip utente

Il chip nell'header mostra l'iniziale (sfondo viola) e lo username dell'utente loggato. Cliccandolo si accede al profilo. Al hover diventa nero.

### 🔔 Campana (dropdown notifiche)

La campanella mostra un **badge numerico** quando ci sono notifiche non viste. Cliccandola si apre un **dropdown** con tutte le notifiche raggruppate per tipo. Il badge sparisce all'apertura del dropdown; le notifiche restano visibili finché non si ricarica il polling.

La campanella è **nera** quando il dropdown è aperto, grigia al hover.

#### Sezioni del dropdown

| Sezione | Evento |
|---------|--------|
| **attività aste** | `new_bid` — nuova offerta ricevuta sul tuo concetto in asta |
| | `outbid` — la tua offerta è stata superata |
| | `auction_won` — hai vinto l'asta |
| | `auction_sold` — il tuo concetto è stato venduto all'asta |
| | `auction_lost` — hai perso l'asta (vinto da qualcun altro) |
| **aste in corso** | Un utente che segui ha avviato un'asta |
| **nuovi follower** | Qualcuno ha iniziato a seguirti (con bottone "+ segui") |
| **vendite** | Qualcuno ha acquistato il tuo concetto al prezzo pieno |
| **offerte ricevute** | Offerta privata pendente sul tuo concetto |
| **aggiornamenti offerte** | Una tua offerta inviata è stata accettata o rifiutata |

### Polling

Il frontend aggiorna ogni **10 secondi** in background:
- Tutte le tipologie di notifica
- Lista concetti posseduti (per rilevare vittorie d'asta senza refresh)
- Storico acquisti

La sessione è **per-tab** (sessionStorage): due tab possono avere utenti diversi.

---

## 13. Riferimento API

Base URL: `http://localhost:8000`

### Autenticazione

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/auth/register` | Registrazione nuovo utente |
| `POST` | `/auth/login` | Login, restituisce JWT |

### Concetti

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| `GET` | `/concepts` | — | Lista concetti in vendita |
| `GET` | `/concepts/:id/detail` | — | Dettaglio + catena proprietari |
| `POST` | `/concepts/:id/buy` | ✓ | Acquisto diretto (notifica venditore) |
| `POST` | `/concepts/:id/save` | ✓ | Toggle watchlist |
| `POST` | `/concepts/:id/relist` | ✓ | Rimette in vendita con nuovo prezzo |
| `POST` | `/concepts/:id/unlist` | ✓ | Ritira dalla vendita |
| `POST` | `/concepts/:id/offer` | ✓ | Invia offerta privata |
| `POST` | `/concepts/:id/auction` | ✓ | Avvia asta |
| `GET` | `/concepts/:id/active-auction` | — | ID dell'asta attiva per un concetto |

### Aste

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| `GET` | `/auctions/:id` | — | Stato asta (risolve lazily se scaduta) |
| `POST` | `/auctions/:id/bid` | ✓ | Piazza offerta |

### Offerte

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| `POST` | `/offers/:id/accept` | ✓ | Accetta offerta |
| `POST` | `/offers/:id/reject` | ✓ | Rifiuta offerta (con messaggio opzionale) |

### Utenti

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|------|-------------|
| `GET` | `/users/search?q=` | — | Ricerca per username |
| `GET` | `/users/:id/profile` | opz. | Profilo pubblico + follow counts |
| `GET` | `/users/:id/active-auctions` | — | Aste attive di un utente |
| `POST` | `/users/:id/follow` | ✓ | Toggle follow/unfollow |
| `GET` | `/users/me/purchases` | ✓ | Concetti posseduti |
| `GET` | `/users/me/saved` | ✓ | Watchlist |
| `GET` | `/users/me/bids` | ✓ | Aste attive a cui l'utente ha offerto |
| `GET` | `/users/me/purchase-history` | ✓ | Storico acquisti (concept_title, price, purchased_at) |
| `GET` | `/users/me/offers/received` | ✓ | Offerte ricevute pendenti |
| `GET` | `/users/me/offers/sent` | ✓ | Offerte inviate risolte |
| `GET` | `/users/me/follow-notifs` | ✓ | Notifiche follower non viste |
| `POST` | `/users/me/follow-notifs/seen` | ✓ | Segna notifiche follower come viste |
| `GET` | `/users/me/auction-notifs` | ✓ | Notifiche aste (follower) non viste |
| `POST` | `/users/me/auction-notifs/seen` | ✓ | Segna notifiche aste come viste |
| `GET` | `/users/me/auction-activity-notifs` | ✓ | Notifiche attività asta (new_bid, outbid, auction_won/sold/lost) |
| `POST` | `/users/me/auction-activity-notifs/seen` | ✓ | Segna notifiche attività asta come viste |
| `GET` | `/users/me/sale-notifs` | ✓ | Notifiche vendita diretta non viste |
| `POST` | `/users/me/sale-notifs/seen` | ✓ | Segna notifiche vendita come viste |

### Admin

Gli endpoint di gestione del catalogo richiedono l'header `X-Admin-Key`.

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/concepts` | Crea nuovo concetto |
| `DELETE` | `/concepts/:id` | Elimina concetto |

La chiave di default in sviluppo è `dev-key-insecure`. In produzione impostare la variabile d'ambiente `ADMIN_KEY`.

---

## Note operative

### Reset del database

Ogni modifica allo schema dei modelli richiede il reset del DB (SQLModel non gestisce migration automatiche):

```bash
rm -f backend/cando.db && cd backend && uv run python seed_dev.py
```

Il seed crea 4 utenti di test (`marco`, `giulia`, `luca`, `sofia` — password: `pass`) e scarica ~40 asset Wikipedia (con retry automatico su HTTP 429). Richiede connessione Internet durante l'esecuzione.

### Avvio

```bash
# Backend
cd backend && uv run uvicorn main:app --reload

# Frontend
cd frontend && npm run dev
```

Docs interattive API: `http://localhost:8000/docs`
