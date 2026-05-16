"""
API principale di Cando.

Struttura degli endpoint:
  POST /auth/register | /auth/login
  GET  /concepts                        — lista concetti disponibili
  GET  /concepts/{id}/detail            — dettaglio con storia proprietari
  POST /concepts/{id}/buy               — acquisto diretto
  POST /concepts/{id}/save              — toggle salvataggio
  POST /concepts/{id}/relist            — rimette in vendita (proprietario)
  POST /concepts/{id}/unlist            — ritira dalla vendita (proprietario)
  POST /concepts/{id}/offer             — offerta di acquisto
  GET  /users/me/purchases              — concetti posseduti dall'utente
  GET  /users/me/bids                   — aste attive a cui l'utente ha offerto
  GET  /users/{id}/active-auctions      — aste attive di un utente (profilo pubblico)
  GET  /users/me/saved                  — concetti salvati dall'utente
  GET  /users/me/offers/received        — offerte ricevute pendenti
  GET  /users/me/offers/sent            — offerte inviate già risolte (accettate/rifiutate)
  GET  /users/me/follow-notifs          — notifiche di nuovi follower non viste
  POST /users/me/follow-notifs/seen     — segna tutte le notifiche follower come viste
  POST /concepts/{id}/auction           — avvia un'asta su un concetto posseduto
  GET  /auctions/{id}                   — dettaglio asta (risolve lazily se scaduta)
  POST /auctions/{id}/bid               — piazza un'offerta su un'asta attiva
  GET  /concepts/{id}/active-auction    — id asta attiva per un concetto
  GET  /users/me/auction-notifs         — notifiche aste (da utenti seguiti)
  POST /users/me/auction-notifs/seen    — segna tutte le notifiche aste come viste
  POST /offers/{id}/accept              — accetta un'offerta
  POST /offers/{id}/reject              — rifiuta un'offerta (con messaggio opzionale)
  GET  /users/search                    — ricerca utenti per username
  GET  /users/{id}/profile              — profilo pubblico (con conteggi follower e is_following)
  POST /users/{id}/follow               — toggle follow/unfollow

  [admin] POST   /concepts              — crea un concetto (richiede X-Admin-Key)
  [admin] DELETE /concepts/{id}         — elimina un concetto (richiede X-Admin-Key)
"""

import os
from typing import Optional
from datetime import datetime, timezone, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import SQLModel, Field, Session, select
import uuid

from db import create_tables, get_session, seed
from auth import hash_password, verify_password, create_token, decode_token


# ── Chiave admin ──────────────────────────────────────────
# In produzione impostare la variabile d'ambiente ADMIN_KEY a un valore segreto.
ADMIN_KEY = os.getenv("ADMIN_KEY", "dev-key-insecure")


# ── Modelli DB ────────────────────────────────────────────

class Concept(SQLModel, table=True):
    id:                  str            = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    type:                str
    title:               str
    description:         str
    price:               float
    wikipedia_url:       str            = Field(default="")
    wikipedia_thumbnail: Optional[str] = Field(default=None)
    # listed=True     → visibile nel marketplace e acquistabile
    # listed=False    → posseduto ma non in vendita diretta
    # in_auction=True → bloccato da un'asta attiva
    listed:              bool           = Field(default=True)
    owner_id:            Optional[str]  = Field(default=None, index=True)
    in_auction:          bool           = Field(default=False)

class Purchase(SQLModel, table=True):
    """Registro storico di ogni acquisto — usato per mostrare la catena di proprietari."""
    id:           str      = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id:      str      = Field(foreign_key="user.id", index=True)
    concept_id:   str      = Field(index=True)
    price:        int      = Field(default=0)
    purchased_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class User(SQLModel, table=True):
    id:                str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    username:          str = Field(unique=True, index=True)
    email:             str = Field(unique=True, index=True)
    hashed_password:   str
    coins:             int = Field(default=1000)

class Saved(SQLModel, table=True):
    """Tabella di join utente↔concetto per i concetti salvati (watchlist)."""
    id:         str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id:    str = Field(foreign_key="user.id", index=True)
    concept_id: str = Field(index=True)

class Offer(SQLModel, table=True):
    """
    Un'offerta rappresenta la proposta di un acquirente al proprietario attuale di un concetto.

    Ciclo di vita:
      pending → accepted  (il venditore accetta; gli altri pending sullo stesso concetto
                           vengono automaticamente rifiutati)
      pending → rejected  (il venditore rifiuta, opzionalmente con un messaggio)
    """
    id:             str            = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    buyer_id:       str            = Field(index=True)
    seller_id:      str            = Field(index=True)
    concept_id:     str            = Field(index=True)
    amount:         float
    message:        Optional[str]  = Field(default=None)
    reject_message: Optional[str]  = Field(default=None)
    status:         str            = Field(default="pending")  # pending | accepted | rejected
    created_at:     datetime       = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at:    Optional[datetime] = Field(default=None)

class Follow(SQLModel, table=True):
    """
    Relazione di follow tra due utenti.
    Chiave composta (follower_id, followed_id) — un utente può seguire un altro una sola volta.
    """
    follower_id: str      = Field(foreign_key="user.id", primary_key=True)
    followed_id: str      = Field(foreign_key="user.id", primary_key=True)
    created_at:  datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FollowNotif(SQLModel, table=True):
    """
    Notifica di nuovo follower — mostrata al followed con l'opzione di seguire back.

    Ciclo di vita: unseen → seen (quando l'utente visita il profilo).
    Una notifica per coppia (user_id, from_user_id) — se A smette di seguire e risegue,
    viene creata una nuova notifica solo se la precedente è già stata vista.
    """
    id:           str      = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id:      str      = Field(foreign_key="user.id", index=True)   # chi riceve
    from_user_id: str      = Field(foreign_key="user.id", index=True)   # chi ha seguito
    seen:         bool     = Field(default=False)
    created_at:   datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Auction(SQLModel, table=True):
    """
    Asta temporizzata su un concetto.
    Quando l'asta è attiva il concetto è bloccato (in_auction=True, listed=False).
    Alla scadenza viene risolta lazily alla prima lettura o offerta successiva:
    se esiste un'offerta >= min_price il concetto viene trasferito al vincitore.
    """
    id:          str            = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    concept_id:  str            = Field(foreign_key="concept.id", index=True)
    seller_id:   str            = Field(foreign_key="user.id", index=True)
    min_price:   int
    ends_at:     datetime
    status:      str            = Field(default="active")   # active | ended
    winner_id:   Optional[str] = Field(default=None)
    winning_bid: Optional[int] = Field(default=None)
    created_at:  datetime      = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuctionBid(SQLModel, table=True):
    """Singola offerta all'interno di un'asta. Ogni offerta deve superare la precedente."""
    id:         str      = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    auction_id: str      = Field(foreign_key="auction.id", index=True)
    bidder_id:  str      = Field(foreign_key="user.id", index=True)
    amount:     int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuctionNotif(SQLModel, table=True):
    """Notifica ai follower del venditore quando viene avviata un'asta."""
    id:         str      = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id:    str      = Field(foreign_key="user.id", index=True)    # follower che riceve
    auction_id: str      = Field(foreign_key="auction.id", index=True)
    seen:       bool     = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuctionActivityNotif(SQLModel, table=True):
    """Notifica di attività su un'asta: new_bid (al venditore) o outbid (al superato)."""
    id:               str      = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id:          str      = Field(foreign_key="user.id", index=True)
    auction_id:       str      = Field(foreign_key="auction.id", index=True)
    notif_type:       str                   # "new_bid" | "outbid"
    concept_title:    str
    amount:           int
    bidder_username:  str
    seen:             bool     = Field(default=False)
    created_at:       datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SaleNotif(SQLModel, table=True):
    """Notifica al venditore per vendita diretta a prezzo pieno."""
    id:            str      = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id:       str      = Field(foreign_key="user.id", index=True)
    buyer_id:      str
    buyer_username: str
    concept_id:    str
    concept_title: str
    amount:        int
    seen:          bool     = Field(default=False)
    created_at:    datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Schemi request/response ───────────────────────────────

class ConceptCreate(SQLModel):
    type:                str
    title:               str
    description:         str
    price:               float
    wikipedia_url:       str           = ""
    wikipedia_thumbnail: Optional[str] = None

class RegisterBody(SQLModel):
    username: str
    email:    str
    password: str

class LoginBody(SQLModel):
    email:    str
    password: str

class AuthResponse(SQLModel):
    token:    str
    user_id:  str
    username: str
    email:    str
    coins:    int

class UserPublic(SQLModel):
    """Dati pubblici di un utente — non espone email, password o saldo."""
    id:       str
    username: str

class UserProfileResponse(SQLModel):
    """Profilo pubblico: include concetti posseduti e statistiche follower."""
    user:            UserPublic
    concepts:        list[Concept]
    followers_count: int = 0
    following_count: int = 0
    is_following:    bool = False   # True se l'utente autenticato segue già questo profilo

class OfferCreate(SQLModel):
    amount:  float
    message: Optional[str] = None

class RejectBody(SQLModel):
    message: Optional[str] = None

class OfferPublic(SQLModel):
    """Offerta arricchita con username acquirente/venditore e titolo del concetto."""
    id:             str
    buyer_id:       str
    buyer_username: str
    seller_username: str
    concept_id:     str
    concept_title:  str
    amount:         float
    message:        Optional[str]
    reject_message: Optional[str]
    status:         str
    created_at:     datetime
    resolved_at:    Optional[datetime]

class BuyResponse(SQLModel):
    coins:      int
    concept_id: str

class RelistBody(SQLModel):
    price: float

class OwnerRecord(SQLModel):
    username:     str
    price:        int
    purchased_at: datetime

class ConceptDetail(SQLModel):
    concept:           Concept
    ownership_history: list[OwnerRecord]
    save_count:        int
    current_owner:     Optional[str] = None

class FollowNotifPublic(SQLModel):
    """Notifica di follow arricchita con username e flag di mutualità."""
    id:            str
    from_user_id:  str
    from_username: str
    is_mutual:     bool
    created_at:    datetime

class AuctionCreate(SQLModel):
    min_price:        int
    duration_minutes: int   # 1 – 10080 (max 1 settimana)

class BidCreate(SQLModel):
    amount: int

class AuctionBidPublic(SQLModel):
    id:              str
    bidder_id:       str
    bidder_username: str
    amount:          int
    created_at:      datetime

class AuctionPublic(SQLModel):
    id:              str
    concept_id:      str
    seller_id:       str
    seller_username: str
    concept:         Concept
    min_price:       int
    ends_at:         datetime
    status:          str
    winner_id:       Optional[str]
    winning_bid:     Optional[int]
    winner_username: Optional[str]
    current_bid:     Optional[int]   # offerta più alta al momento
    bid_count:       int
    bids:            list[AuctionBidPublic]
    seconds_left:    int
    created_at:      datetime

class PurchaseHistoryItem(SQLModel):
    concept_id:    str
    concept_title: str
    concept_type:  str
    price:         int
    purchased_at:  datetime

class AuctionNotifPublic(SQLModel):
    id:              str
    auction_id:      str
    concept_title:   str
    concept_type:    str
    seller_id:       str
    seller_username: str
    min_price:       int
    ends_at:         datetime
    created_at:      datetime

class AuctionActivityNotifPublic(SQLModel):
    id:              str
    auction_id:      str
    notif_type:      str
    concept_title:   str
    amount:          int
    bidder_username: str
    created_at:      datetime

class SaleNotifPublic(SQLModel):
    id:            str
    buyer_username: str
    concept_title: str
    amount:        int
    created_at:    datetime


# ── App ───────────────────────────────────────────────────

app = FastAPI()

_cors_origins = os.getenv("CORS_ORIGIN", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _resolve_expired_auctions_job():
    """
    Job schedulato ogni 60 secondi: risolve tutte le aste scadute.
    Gira in un thread separato (BackgroundScheduler) — indipendente dalle richieste HTTP.
    """
    from db import engine
    with Session(engine) as session:
        active = session.exec(select(Auction).where(Auction.status == "active")).all()
        for auction in active:
            _resolve_auction_if_expired(auction, session)

_scheduler = BackgroundScheduler(timezone="UTC")
_scheduler.add_job(_resolve_expired_auctions_job, "interval", seconds=60, id="resolve_auctions")

@app.on_event("startup")
def on_startup():
    from db import engine
    create_tables()
    with Session(engine) as session:
        seed(session, Concept)
    _scheduler.start()

@app.on_event("shutdown")
def on_shutdown():
    _scheduler.shutdown(wait=False)


# ── Dipendenze ────────────────────────────────────────────

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session),
) -> User:
    """Decodifica il JWT e restituisce l'utente autenticato. Solleva 401 se non valido."""
    try:
        payload = decode_token(credentials.credentials)
        user = session.get(User, payload["sub"])
        if not user:
            raise HTTPException(status_code=401, detail="Utente non trovato")
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token non valido")

def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    session: Session = Depends(get_session),
) -> Optional[User]:
    """Versione opzionale di get_current_user — restituisce None se non autenticato.
    Usata dagli endpoint pubblici che possono arricchire la risposta se c'è un utente loggato."""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        return session.get(User, payload["sub"])
    except Exception:
        return None

def require_admin(x_admin_key: str = Header(default="")) -> None:
    """Protegge gli endpoint di gestione dei concetti (creazione/eliminazione).
    In produzione impostare ADMIN_KEY come variabile d'ambiente."""
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Chiave admin richiesta")


# ── Helper ────────────────────────────────────────────────

def _offer_to_public(
    offer: Offer,
    buyer_username: str,
    seller_username: str,
    concept_title: str,
) -> OfferPublic:
    """Converte un'Offer DB in OfferPublic da restituire al client.
    Centralizza la costruzione per evitare duplicazione tra received, sent e make_offer."""
    return OfferPublic(
        id=offer.id,
        buyer_id=offer.buyer_id,
        buyer_username=buyer_username,
        seller_username=seller_username,
        concept_id=offer.concept_id,
        concept_title=concept_title,
        amount=offer.amount,
        message=offer.message,
        reject_message=offer.reject_message,
        status=offer.status,
        created_at=offer.created_at,
        resolved_at=offer.resolved_at,
    )

def _is_following(follower_id: str, followed_id: str, session: Session) -> bool:
    """Controlla se follower_id segue già followed_id."""
    return session.exec(
        select(Follow).where(
            Follow.follower_id == follower_id,
            Follow.followed_id == followed_id,
        )
    ).first() is not None


# ── Auth ──────────────────────────────────────────────────

@app.post("/auth/register", response_model=AuthResponse, status_code=201)
def register(body: RegisterBody, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.email == body.email)).first():
        raise HTTPException(status_code=409, detail="Email già registrata")
    if session.exec(select(User).where(User.username == body.username)).first():
        raise HTTPException(status_code=409, detail="Username già in uso")
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return AuthResponse(
        token=create_token(user.id, user.email),
        user_id=user.id,
        username=user.username,
        email=user.email,
        coins=user.coins,
    )

@app.post("/auth/login", response_model=AuthResponse)
def login(body: LoginBody, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    return AuthResponse(
        token=create_token(user.id, user.email),
        user_id=user.id,
        username=user.username,
        email=user.email,
        coins=user.coins,
    )


# ── Concetti ──────────────────────────────────────────────

@app.get("/concepts/{concept_id}/detail", response_model=ConceptDetail)
def concept_detail(concept_id: str, session: Session = Depends(get_session)):
    """Dettaglio di un concetto: include la catena di tutti i proprietari passati e il conteggio dei salvataggi."""
    concept = session.get(Concept, concept_id)
    if not concept:
        raise HTTPException(status_code=404, detail="Concetto non trovato")

    purchases = session.exec(
        select(Purchase).where(Purchase.concept_id == concept_id).order_by(Purchase.purchased_at)
    ).all()
    ownership_history = [
        OwnerRecord(username=owner.username, price=p.price, purchased_at=p.purchased_at)
        for p in purchases
        if (owner := session.get(User, p.user_id))
    ]

    save_count = len(session.exec(select(Saved).where(Saved.concept_id == concept_id)).all())

    current_owner = None
    if concept.owner_id:
        owner = session.get(User, concept.owner_id)
        if owner:
            current_owner = owner.username

    return ConceptDetail(
        concept=concept,
        ownership_history=ownership_history,
        save_count=save_count,
        current_owner=current_owner,
    )

@app.get("/concepts", response_model=list[Concept])
def list_concepts(session: Session = Depends(get_session)):
    """Restituisce solo i concetti attivamente in vendita (listed=True)."""
    return session.exec(select(Concept).where(Concept.listed == True)).all()

@app.post("/concepts/{concept_id}/buy", response_model=BuyResponse)
def buy_concept(
    concept_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    concept = session.get(Concept, concept_id)
    if not concept:
        raise HTTPException(status_code=404, detail="Concetto non trovato")
    if not concept.listed:
        raise HTTPException(status_code=409, detail="Già acquistato da qualcun altro")
    if concept.in_auction:
        raise HTTPException(status_code=409, detail="Il concetto è in asta")
    if concept.owner_id == current_user.id:
        raise HTTPException(status_code=409, detail="Sei già il proprietario di questo concetto")
    if current_user.coins < concept.price:
        raise HTTPException(status_code=402, detail="Saldo insufficiente")

    seller_id = concept.owner_id
    if seller_id:
        seller = session.get(User, seller_id)
        if seller:
            seller.coins += int(concept.price)
            session.add(seller)
            # Notifica il venditore della vendita avvenuta
            session.add(SaleNotif(
                user_id=seller_id,
                buyer_id=current_user.id,
                buyer_username=current_user.username,
                concept_id=concept.id,
                concept_title=concept.title,
                amount=int(concept.price),
            ))

    current_user.coins -= int(concept.price)
    concept.listed = False
    concept.owner_id = current_user.id
    session.add(Purchase(user_id=current_user.id, concept_id=concept.id, price=int(concept.price)))
    session.add(current_user)
    session.add(concept)
    session.commit()
    session.refresh(current_user)
    return BuyResponse(coins=current_user.coins, concept_id=concept_id)

@app.post("/concepts/{concept_id}/save")
def toggle_save(
    concept_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Toggle: chiama due volte per salvare e rimuovere dai salvati."""
    existing = session.exec(
        select(Saved).where(Saved.user_id == current_user.id, Saved.concept_id == concept_id)
    ).first()
    if existing:
        session.delete(existing)
        session.commit()
        return {"saved": False}
    session.add(Saved(user_id=current_user.id, concept_id=concept_id))
    session.commit()
    return {"saved": True}

@app.post("/concepts/{concept_id}/relist", response_model=Concept)
def relist_concept(
    concept_id: str,
    body: RelistBody,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Rimette in vendita un concetto posseduto, con un nuovo prezzo."""
    concept = session.get(Concept, concept_id)
    if not concept:
        raise HTTPException(status_code=404, detail="Concetto non trovato")
    if concept.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Non sei il proprietario")
    if concept.listed:
        raise HTTPException(status_code=409, detail="Già in vendita")
    if concept.in_auction:
        raise HTTPException(status_code=409, detail="Il concetto è in asta")
    concept.price = body.price
    concept.listed = True
    session.add(concept)
    session.commit()
    session.refresh(concept)
    return concept

@app.post("/concepts/{concept_id}/unlist", response_model=Concept)
def unlist_concept(
    concept_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Ritira un concetto dalla vendita senza cederlo."""
    concept = session.get(Concept, concept_id)
    if not concept:
        raise HTTPException(status_code=404, detail="Concetto non trovato")
    if concept.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Non sei il proprietario")
    if not concept.listed:
        raise HTTPException(status_code=409, detail="Non è in vendita")
    if concept.in_auction:
        raise HTTPException(status_code=409, detail="Il concetto è in asta")
    concept.listed = False
    session.add(concept)
    session.commit()
    session.refresh(concept)
    return concept


# ── Offerte ───────────────────────────────────────────────

@app.post("/concepts/{concept_id}/offer", response_model=OfferPublic, status_code=201)
def make_offer(
    concept_id: str,
    body: OfferCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Invia un'offerta al proprietario di un concetto.
    Funziona anche su concetti non listati — l'offerta va al proprietario,
    non al marketplace. Un acquirente può avere una sola offerta pendente per concetto.
    """
    concept = session.get(Concept, concept_id)
    if not concept:
        raise HTTPException(status_code=404, detail="Concetto non trovato")
    if not concept.owner_id:
        raise HTTPException(status_code=409, detail="Questo concetto non ha un proprietario")
    if concept.owner_id == current_user.id:
        raise HTTPException(status_code=409, detail="Non puoi fare un'offerta su un tuo concetto")
    if concept.in_auction:
        raise HTTPException(status_code=409, detail="Il concetto è in asta")

    existing = session.exec(
        select(Offer).where(
            Offer.concept_id == concept_id,
            Offer.buyer_id == current_user.id,
            Offer.status == "pending",
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Hai già un'offerta pendente su questo concetto")

    offer = Offer(
        buyer_id=current_user.id,
        seller_id=concept.owner_id,
        concept_id=concept_id,
        amount=body.amount,
        message=body.message,
    )
    session.add(offer)
    session.commit()
    session.refresh(offer)

    seller = session.get(User, concept.owner_id)
    return _offer_to_public(offer, current_user.username, seller.username if seller else "", concept.title)

@app.get("/users/me/offers/received", response_model=list[OfferPublic])
def get_received_offers(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Offerte pendenti ricevute dall'utente come venditore."""
    offers = session.exec(
        select(Offer).where(Offer.seller_id == current_user.id, Offer.status == "pending")
    ).all()
    # N+1 query — accettabile con i volumi attuali
    result = []
    for o in offers:
        buyer = session.get(User, o.buyer_id)
        concept = session.get(Concept, o.concept_id)
        if buyer and concept:
            result.append(_offer_to_public(o, buyer.username, current_user.username, concept.title))
    return result

@app.get("/users/me/offers/sent", response_model=list[OfferPublic])
def get_sent_offers(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Offerte inviate dall'utente che sono già state risolte (accettate o rifiutate).
    Le offerte pendenti non compaiono qui — per quelle vedi il profilo del venditore."""
    offers = session.exec(
        select(Offer).where(Offer.buyer_id == current_user.id, Offer.status != "pending")
    ).all()
    result = []
    for o in offers:
        concept = session.get(Concept, o.concept_id)
        seller = session.get(User, o.seller_id)
        if concept and seller:
            result.append(_offer_to_public(o, current_user.username, seller.username, concept.title))
    return result

@app.post("/offers/{offer_id}/accept")
def accept_offer(
    offer_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Accetta un'offerta pendente:
    1. Trasferisce i coin dall'acquirente al venditore
    2. Aggiorna il proprietario del concetto
    3. Registra l'acquisto nella cronologia
    4. Rifiuta automaticamente tutte le altre offerte pendenti sullo stesso concetto
    """
    offer = session.get(Offer, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offerta non trovata")
    if offer.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Non sei il venditore")
    if offer.status != "pending":
        raise HTTPException(status_code=409, detail="Offerta non più pendente")

    concept = session.get(Concept, offer.concept_id)
    if not concept or concept.owner_id != current_user.id:
        raise HTTPException(status_code=409, detail="Non possiedi più questo concetto")
    if concept.in_auction:
        raise HTTPException(status_code=409, detail="Il concetto è in asta")

    buyer = session.get(User, offer.buyer_id)
    if not buyer:
        raise HTTPException(status_code=404, detail="Acquirente non trovato")
    if buyer.coins < offer.amount:
        raise HTTPException(status_code=402, detail="Saldo insufficiente dell'acquirente")

    buyer.coins -= int(offer.amount)
    current_user.coins += int(offer.amount)
    concept.owner_id = buyer.id
    concept.listed = False
    concept.price = offer.amount

    now = datetime.now(timezone.utc)
    offer.status = "accepted"
    offer.resolved_at = now

    session.add(Purchase(user_id=buyer.id, concept_id=concept.id, price=int(offer.amount)))

    # Rifiuto automatico delle altre offerte pendenti sullo stesso concetto
    other_pending = session.exec(
        select(Offer).where(
            Offer.concept_id == concept.id,
            Offer.id != offer.id,
            Offer.status == "pending",
        )
    ).all()
    for o in other_pending:
        o.status = "rejected"
        o.resolved_at = now
        session.add(o)

    session.add(buyer)
    session.add(current_user)
    session.add(concept)
    session.add(offer)
    session.commit()
    session.refresh(current_user)
    return {"coins": current_user.coins}

@app.post("/offers/{offer_id}/reject")
def reject_offer(
    offer_id: str,
    body: RejectBody = RejectBody(),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Rifiuta un'offerta pendente. Il venditore può allegare un messaggio opzionale all'acquirente."""
    offer = session.get(Offer, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offerta non trovata")
    if offer.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Non sei il venditore")
    if offer.status != "pending":
        raise HTTPException(status_code=409, detail="Offerta non più pendente")

    offer.status = "rejected"
    offer.reject_message = body.message
    offer.resolved_at = datetime.now(timezone.utc)
    session.add(offer)
    session.commit()
    return {"ok": True}


# ── Utenti ────────────────────────────────────────────────

@app.get("/users/me/saved", response_model=list[Concept])
def get_saved(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    records = session.exec(select(Saved).where(Saved.user_id == current_user.id)).all()
    if not records:
        return []
    ids = [r.concept_id for r in records]
    return session.exec(select(Concept).where(Concept.id.in_(ids))).all()

@app.get("/users/me/purchases", response_model=list[Concept])
def get_purchases(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Tutti i concetti di cui l'utente è proprietario, inclusi quelli non in vendita."""
    return session.exec(select(Concept).where(Concept.owner_id == current_user.id)).all()

@app.get("/users/me/purchase-history", response_model=list[PurchaseHistoryItem])
def get_purchase_history(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Storico di tutti gli acquisti effettuati dall'utente, dal più recente."""
    purchases = session.exec(
        select(Purchase)
        .where(Purchase.user_id == current_user.id)
        .order_by(Purchase.purchased_at.desc())
    ).all()
    result = []
    for p in purchases:
        concept = session.get(Concept, p.concept_id)
        if concept:
            result.append(PurchaseHistoryItem(
                concept_id=concept.id, concept_title=concept.title,
                concept_type=concept.type, price=p.price,
                purchased_at=p.purchased_at,
            ))
    return result

@app.get("/users/me/bids", response_model=list[AuctionPublic])
def get_my_bids(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Aste attive a cui l'utente ha partecipato con almeno un'offerta."""
    auction_ids = session.exec(
        select(AuctionBid.auction_id)
        .where(AuctionBid.bidder_id == current_user.id)
        .distinct()
    ).all()
    results = []
    for aid in auction_ids:
        auction = session.get(Auction, aid)
        if not auction or auction.status != "active":
            continue
        concept = session.get(Concept, auction.concept_id)
        seller  = session.get(User, auction.seller_id)
        bids    = session.exec(
            select(AuctionBid)
            .where(AuctionBid.auction_id == aid)
            .order_by(AuctionBid.created_at.asc())
        ).all()
        results.append(_auction_to_public(auction, concept, seller, bids, session))
    return results

@app.get("/users/{user_id}/active-auctions", response_model=list[AuctionPublic])
def get_user_active_auctions(
    user_id: str,
    session: Session = Depends(get_session),
):
    """Aste attive sui concetti di un utente (visibile nel profilo pubblico)."""
    auctions = session.exec(
        select(Auction)
        .where(Auction.seller_id == user_id, Auction.status == "active")
    ).all()
    results = []
    for auction in auctions:
        concept = session.get(Concept, auction.concept_id)
        seller  = session.get(User, auction.seller_id)
        bids    = session.exec(
            select(AuctionBid)
            .where(AuctionBid.auction_id == auction.id)
            .order_by(AuctionBid.created_at.asc())
        ).all()
        results.append(_auction_to_public(auction, concept, seller, bids, session))
    return results

@app.get("/users/search", response_model=list[UserPublic])
def search_users(q: str = "", session: Session = Depends(get_session)):
    if not q.strip():
        return []
    return session.exec(select(User).where(User.username.like(f"%{q}%")).limit(20)).all()

@app.get("/users/{user_id}/profile", response_model=UserProfileResponse)
def user_public_profile(
    user_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    session: Session = Depends(get_session),
):
    """Profilo pubblico di un utente: mostra tutti i concetti che possiede,
    sia in vendita che ritirati. Aggiunge is_following se la richiesta è autenticata."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    concepts = session.exec(select(Concept).where(Concept.owner_id == user_id)).all()

    followers_count = len(session.exec(select(Follow).where(Follow.followed_id == user_id)).all())
    following_count = len(session.exec(select(Follow).where(Follow.follower_id == user_id)).all())

    # is_following è rilevante solo se l'utente autenticato sta guardando un profilo altrui
    is_following = False
    if current_user and current_user.id != user_id:
        is_following = _is_following(current_user.id, user_id, session)

    return UserProfileResponse(
        user=UserPublic(id=user.id, username=user.username),
        concepts=concepts,
        followers_count=followers_count,
        following_count=following_count,
        is_following=is_following,
    )


# ── Follow ────────────────────────────────────────────────

@app.post("/users/{user_id}/follow")
def toggle_follow(
    user_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Toggle follow/unfollow su un utente.
    - Se non stai seguendo → segui e crea una notifica per il followed
    - Se stai già seguendo → smetti di seguire (nessuna notifica al contrario)

    La notifica viene creata solo se non esiste già una notifica non vista per la stessa coppia,
    per evitare spam se l'utente fa follow/unfollow/follow in rapida successione.
    """
    if user_id == current_user.id:
        raise HTTPException(status_code=409, detail="Non puoi seguire te stesso")
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    existing = session.exec(
        select(Follow).where(
            Follow.follower_id == current_user.id,
            Follow.followed_id == user_id,
        )
    ).first()

    if existing:
        # Unfollow
        session.delete(existing)
        session.commit()
        return {"following": False}

    # Follow
    session.add(Follow(follower_id=current_user.id, followed_id=user_id))

    # Crea notifica solo se non ne esiste già una non vista per questa coppia
    existing_notif = session.exec(
        select(FollowNotif).where(
            FollowNotif.user_id == user_id,
            FollowNotif.from_user_id == current_user.id,
            FollowNotif.seen == False,
        )
    ).first()
    if not existing_notif:
        session.add(FollowNotif(user_id=user_id, from_user_id=current_user.id))

    session.commit()
    return {"following": True}

@app.get("/users/me/follow-notifs", response_model=list[FollowNotifPublic])
def get_follow_notifs(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Notifiche di nuovi follower non ancora viste, con flag is_mutual."""
    notifs = session.exec(
        select(FollowNotif).where(
            FollowNotif.user_id == current_user.id,
            FollowNotif.seen == False,
        )
    ).all()
    result = []
    for n in notifs:
        from_user = session.get(User, n.from_user_id)
        if not from_user:
            continue
        # is_mutual=True se l'utente che riceve già segue il follower
        mutual = _is_following(current_user.id, n.from_user_id, session)
        result.append(FollowNotifPublic(
            id=n.id,
            from_user_id=n.from_user_id,
            from_username=from_user.username,
            is_mutual=mutual,
            created_at=n.created_at,
        ))
    return result

@app.post("/users/me/follow-notifs/seen")
def mark_follow_notifs_seen(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Segna tutte le notifiche follower come viste — chiamato quando l'utente apre il profilo."""
    notifs = session.exec(
        select(FollowNotif).where(
            FollowNotif.user_id == current_user.id,
            FollowNotif.seen == False,
        )
    ).all()
    for n in notifs:
        n.seen = True
        session.add(n)
    session.commit()
    return {"ok": True}


# ── Aste ─────────────────────────────────────────────────

def _ensure_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

def _resolve_auction_if_expired(auction: Auction, session: Session) -> bool:
    """
    Risolve lazily l'asta se è scaduta.
    - Trova l'offerta più alta >= min_price
    - Se esiste: trasferisce il concetto al vincitore, aggiorna i coin,
      invia AuctionActivityNotif a vincitore (auction_won), venditore (auction_sold)
      e a tutti gli altri offerenti (auction_lost)
    - Altrimenti: rimette il concetto disponibile al venditore senza costi
    Restituisce True se l'asta era scaduta e l'ha risolta.
    """
    if auction.status != "active":
        return False
    if _ensure_utc(datetime.now(timezone.utc)) < _ensure_utc(auction.ends_at):
        return False

    bids = session.exec(select(AuctionBid).where(AuctionBid.auction_id == auction.id)).all()
    concept = session.get(Concept, auction.concept_id)

    winning = max((b for b in bids if b.amount >= auction.min_price), key=lambda b: b.amount, default=None)

    if winning:
        winner = session.get(User, winning.bidder_id)
        seller = session.get(User, auction.seller_id)
        if winner and seller and winner.coins >= winning.amount:
            winner.coins -= winning.amount
            seller.coins += winning.amount
            auction.winner_id   = winner.id
            auction.winning_bid = winning.amount
            concept_title = concept.title if concept else ""
            if concept:
                concept.owner_id   = winner.id
                concept.listed     = False
                concept.in_auction = False
                concept.price      = winning.amount
                session.add(Purchase(user_id=winner.id, concept_id=concept.id, price=winning.amount))
                session.add(concept)
            session.add(winner)
            session.add(seller)
            # Notifica vincitore
            session.add(AuctionActivityNotif(
                user_id=winner.id, auction_id=auction.id,
                notif_type="auction_won", concept_title=concept_title,
                amount=winning.amount, bidder_username=winner.username,
            ))
            # Notifica venditore
            session.add(AuctionActivityNotif(
                user_id=seller.id, auction_id=auction.id,
                notif_type="auction_sold", concept_title=concept_title,
                amount=winning.amount, bidder_username=winner.username,
            ))
            # Notifica gli altri offerenti che hanno perso
            losing_bidder_ids = {b.bidder_id for b in bids if b.bidder_id != winner.id}
            for bidder_id in losing_bidder_ids:
                session.add(AuctionActivityNotif(
                    user_id=bidder_id, auction_id=auction.id,
                    notif_type="auction_lost", concept_title=concept_title,
                    amount=winning.amount, bidder_username=winner.username,
                ))
        else:
            # Saldo insufficiente → nessuna vendita
            if concept:
                concept.in_auction = False
                session.add(concept)
    else:
        if concept:
            concept.in_auction = False
            session.add(concept)

    auction.status = "ended"
    session.add(auction)
    session.commit()
    return True

def _auction_to_public(
    auction: Auction,
    concept: Optional["Concept"],
    seller: Optional["User"],
    bids: list["AuctionBid"],
    session: Session,
) -> AuctionPublic:
    now     = _ensure_utc(datetime.now(timezone.utc))
    ends_at = _ensure_utc(auction.ends_at)
    seconds_left = max(0, int((ends_at - now).total_seconds())) if auction.status == "active" else 0

    bids_public = []
    for b in bids:
        bidder = session.get(User, b.bidder_id)
        if bidder:
            bids_public.append(AuctionBidPublic(
                id=b.id, bidder_id=b.bidder_id,
                bidder_username=bidder.username,
                amount=b.amount, created_at=b.created_at,
            ))

    current_bid = max((b.amount for b in bids), default=None)

    winner_username = None
    if auction.winner_id:
        w = session.get(User, auction.winner_id)
        if w:
            winner_username = w.username

    return AuctionPublic(
        id=auction.id, concept_id=auction.concept_id,
        seller_id=auction.seller_id,
        seller_username=seller.username if seller else "",
        concept=concept,
        min_price=auction.min_price, ends_at=auction.ends_at,
        status=auction.status,
        winner_id=auction.winner_id, winning_bid=auction.winning_bid,
        winner_username=winner_username,
        current_bid=current_bid, bid_count=len(bids),
        bids=bids_public, seconds_left=seconds_left,
        created_at=auction.created_at,
    )


@app.post("/concepts/{concept_id}/auction", response_model=AuctionPublic, status_code=201)
def start_auction(
    concept_id: str,
    body: AuctionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Avvia un'asta temporizzata su un concetto posseduto.
    Il concetto viene rimosso dal marketplace (listed=False) e bloccato (in_auction=True).
    Tutti i follower del venditore ricevono una notifica.
    """
    concept = session.get(Concept, concept_id)
    if not concept:
        raise HTTPException(status_code=404, detail="Concetto non trovato")
    if concept.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Non sei il proprietario")
    if concept.in_auction:
        raise HTTPException(status_code=409, detail="Già in asta")
    if body.min_price <= 0:
        raise HTTPException(status_code=422, detail="Prezzo minimo non valido")
    if not (1 <= body.duration_minutes <= 10080):
        raise HTTPException(status_code=422, detail="Durata non valida (1-10080 minuti)")

    ends_at = datetime.now(timezone.utc) + timedelta(minutes=body.duration_minutes)
    auction = Auction(
        concept_id=concept_id, seller_id=current_user.id,
        min_price=body.min_price, ends_at=ends_at,
    )
    concept.in_auction = True
    concept.listed     = False
    session.add(auction)
    session.add(concept)
    session.commit()
    session.refresh(auction)

    # Notifica tutti i follower del venditore
    followers = session.exec(select(Follow).where(Follow.followed_id == current_user.id)).all()
    for f in followers:
        session.add(AuctionNotif(user_id=f.follower_id, auction_id=auction.id))
    if followers:
        session.commit()

    return _auction_to_public(auction, concept, current_user, [], session)


@app.get("/auctions/{auction_id}", response_model=AuctionPublic)
def get_auction(
    auction_id: str,
    session: Session = Depends(get_session),
):
    """Restituisce lo stato attuale dell'asta, risolvendo lazily se è scaduta."""
    auction = session.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Asta non trovata")

    _resolve_auction_if_expired(auction, session)
    auction  = session.get(Auction, auction_id)
    concept  = session.get(Concept, auction.concept_id)
    seller   = session.get(User, auction.seller_id)
    bids     = session.exec(
        select(AuctionBid)
        .where(AuctionBid.auction_id == auction_id)
        .order_by(AuctionBid.created_at.asc())
    ).all()

    return _auction_to_public(auction, concept, seller, bids, session)


@app.post("/auctions/{auction_id}/bid", response_model=AuctionPublic)
def place_bid(
    auction_id: str,
    body: BidCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Piazza un'offerta su un'asta attiva.
    L'offerta deve essere >= min_price e > dell'offerta attuale più alta.
    Il saldo viene verificato ma non bloccato — i coin vengono addebitati solo alla chiusura.
    """
    auction = session.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Asta non trovata")

    _resolve_auction_if_expired(auction, session)
    auction = session.get(Auction, auction_id)

    if auction.status != "active":
        raise HTTPException(status_code=409, detail="L'asta è terminata")
    if auction.seller_id == current_user.id:
        raise HTTPException(status_code=409, detail="Non puoi offrire sulla tua asta")
    if body.amount < auction.min_price:
        raise HTTPException(status_code=409, detail=f"Offerta minima: {auction.min_price} cc")

    top = session.exec(
        select(AuctionBid)
        .where(AuctionBid.auction_id == auction_id)
        .order_by(AuctionBid.amount.desc())
    ).first()
    if top and body.amount <= top.amount:
        raise HTTPException(status_code=409, detail=f"Devi superare l'offerta attuale di {top.amount} cc")

    if current_user.coins < body.amount:
        raise HTTPException(status_code=402, detail="Saldo insufficiente")

    session.add(AuctionBid(auction_id=auction_id, bidder_id=current_user.id, amount=body.amount))
    session.commit()

    concept = session.get(Concept, auction.concept_id)
    seller  = session.get(User, auction.seller_id)
    concept_title = concept.title if concept else ""

    # Notifica al venditore: nuova offerta
    session.add(AuctionActivityNotif(
        user_id=auction.seller_id, auction_id=auction_id, notif_type="new_bid",
        concept_title=concept_title, amount=body.amount, bidder_username=current_user.username,
    ))

    # Notifica al precedente top bidder (se diverso dal nuovo offerente)
    if top and top.bidder_id != current_user.id:
        prev_top_bidder = session.get(User, top.bidder_id)
        if prev_top_bidder:
            session.add(AuctionActivityNotif(
                user_id=top.bidder_id, auction_id=auction_id, notif_type="outbid",
                concept_title=concept_title, amount=body.amount, bidder_username=current_user.username,
            ))

    session.commit()

    bids = session.exec(
        select(AuctionBid)
        .where(AuctionBid.auction_id == auction_id)
        .order_by(AuctionBid.created_at.asc())
    ).all()
    return _auction_to_public(auction, concept, seller, bids, session)


@app.get("/concepts/{concept_id}/active-auction")
def get_concept_active_auction(concept_id: str, session: Session = Depends(get_session)):
    """Restituisce l'id dell'asta attiva per un concetto, 404 se non esiste."""
    auction = session.exec(
        select(Auction).where(Auction.concept_id == concept_id, Auction.status == "active")
    ).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Nessuna asta attiva")
    return {"id": auction.id}


@app.get("/users/me/auction-notifs", response_model=list[AuctionNotifPublic])
def get_auction_notifs(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Notifiche di aste avviate da utenti seguiti, non ancora viste."""
    notifs = session.exec(
        select(AuctionNotif).where(
            AuctionNotif.user_id == current_user.id,
            AuctionNotif.seen == False,
        )
    ).all()
    result = []
    for n in notifs:
        auction = session.get(Auction, n.auction_id)
        if not auction:
            continue
        concept = session.get(Concept, auction.concept_id)
        seller  = session.get(User, auction.seller_id)
        if not concept or not seller:
            continue
        result.append(AuctionNotifPublic(
            id=n.id, auction_id=n.auction_id,
            concept_title=concept.title, concept_type=concept.type,
            seller_id=auction.seller_id, seller_username=seller.username,
            min_price=auction.min_price, ends_at=auction.ends_at,
            created_at=n.created_at,
        ))
    return result


@app.post("/users/me/auction-notifs/seen")
def mark_auction_notifs_seen(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    notifs = session.exec(
        select(AuctionNotif).where(
            AuctionNotif.user_id == current_user.id,
            AuctionNotif.seen == False,
        )
    ).all()
    for n in notifs:
        n.seen = True
        session.add(n)
    session.commit()
    return {"ok": True}


@app.get("/users/me/auction-activity-notifs", response_model=list[AuctionActivityNotifPublic])
def get_auction_activity_notifs(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Notifiche di attività asta non viste: new_bid (al venditore) e outbid (al superato)."""
    notifs = session.exec(
        select(AuctionActivityNotif).where(
            AuctionActivityNotif.user_id == current_user.id,
            AuctionActivityNotif.seen == False,
        ).order_by(AuctionActivityNotif.created_at.desc())
    ).all()
    return [
        AuctionActivityNotifPublic(
            id=n.id, auction_id=n.auction_id, notif_type=n.notif_type,
            concept_title=n.concept_title, amount=n.amount,
            bidder_username=n.bidder_username, created_at=n.created_at,
        )
        for n in notifs
    ]

@app.post("/users/me/auction-activity-notifs/seen")
def mark_auction_activity_notifs_seen(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    notifs = session.exec(
        select(AuctionActivityNotif).where(
            AuctionActivityNotif.user_id == current_user.id,
            AuctionActivityNotif.seen == False,
        )
    ).all()
    for n in notifs:
        n.seen = True
        session.add(n)
    session.commit()
    return {"ok": True}


@app.get("/users/me/sale-notifs", response_model=list[SaleNotifPublic])
def get_sale_notifs(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Notifiche di vendita diretta non viste: generate quando qualcuno acquista a prezzo pieno."""
    notifs = session.exec(
        select(SaleNotif).where(
            SaleNotif.user_id == current_user.id,
            SaleNotif.seen == False,
        ).order_by(SaleNotif.created_at.desc())
    ).all()
    return [
        SaleNotifPublic(
            id=n.id, buyer_username=n.buyer_username,
            concept_title=n.concept_title, amount=n.amount,
            created_at=n.created_at,
        )
        for n in notifs
    ]

@app.post("/users/me/sale-notifs/seen")
def mark_sale_notifs_seen(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    notifs = session.exec(
        select(SaleNotif).where(
            SaleNotif.user_id == current_user.id,
            SaleNotif.seen == False,
        )
    ).all()
    for n in notifs:
        n.seen = True
        session.add(n)
    session.commit()
    return {"ok": True}


# ── Admin ─────────────────────────────────────────────────

@app.post("/concepts", response_model=Concept, status_code=201)
def create_concept(
    body: ConceptCreate,
    session: Session = Depends(get_session),
    _: None = Depends(require_admin),
):
    """Crea un nuovo concetto nel catalogo. Richiede header X-Admin-Key."""
    concept = Concept(**body.model_dump())
    session.add(concept)
    session.commit()
    session.refresh(concept)
    return concept

@app.delete("/concepts/{concept_id}", status_code=204)
def delete_concept(
    concept_id: str,
    session: Session = Depends(get_session),
    _: None = Depends(require_admin),
):
    """Elimina un concetto dal catalogo. Richiede header X-Admin-Key."""
    concept = session.get(Concept, concept_id)
    if not concept:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(concept)
    session.commit()
