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
  GET  /users/me/saved                  — concetti salvati dall'utente
  GET  /users/me/offers/received        — offerte ricevute pendenti
  GET  /users/me/offers/sent            — offerte inviate già risolte (accettate/rifiutate)
  POST /offers/{id}/accept              — accetta un'offerta
  POST /offers/{id}/reject              — rifiuta un'offerta (con messaggio opzionale)
  GET  /users/search                    — ricerca utenti per username
  GET  /users/{id}/profile              — profilo pubblico di un utente

  [admin] POST   /concepts              — crea un concetto (richiede X-Admin-Key)
  [admin] DELETE /concepts/{id}         — elimina un concetto (richiede X-Admin-Key)
"""

import os
from typing import Literal, Optional
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import SQLModel, Field, Session, select
import uuid

from db import create_tables, get_session, seed
from auth import hash_password, verify_password, create_token, decode_token


# ── Chiave admin ──────────────────────────────────────────
# In produzione impostare la variabile d'ambiente ADMIN_KEY a un valore segreto.
# Il default "dev-key-insecure" funziona solo in sviluppo locale.
ADMIN_KEY = os.getenv("ADMIN_KEY", "dev-key-insecure")


# ── Modelli DB ────────────────────────────────────────────

ConceptType = Literal["number", "date", "idea", "filosofia"]

class Concept(SQLModel, table=True):
    id:          str   = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    type:        str
    title:       str
    description: str
    price:       float
    # listed=True  → il concetto è visibile nel marketplace e acquistabile
    # listed=False → il concetto appartiene a qualcuno ma non è in vendita
    listed:      bool         = Field(default=True)
    owner_id:    Optional[str] = Field(default=None, index=True)

class Purchase(SQLModel, table=True):
    """Registro storico di ogni acquisto — usato per mostrare la catena di proprietari."""
    id:           str      = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id:      str      = Field(foreign_key="user.id", index=True)
    concept_id:   str      = Field(index=True)
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
    message:        Optional[str]  = Field(default=None)   # messaggio dell'acquirente
    reject_message: Optional[str]  = Field(default=None)   # messaggio del venditore al rifiuto
    status:         str            = Field(default="pending")  # pending | accepted | rejected
    created_at:     datetime       = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at:    Optional[datetime] = Field(default=None)   # quando è stata accettata/rifiutata


# ── Schemi request/response ───────────────────────────────

class ConceptCreate(SQLModel):
    type:        ConceptType
    title:       str
    description: str
    price:       float

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
    user:     UserPublic
    concepts: list[Concept]

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

class ConceptDetail(SQLModel):
    concept:       Concept
    past_owners:   list[str]
    save_count:    int
    current_owner: Optional[str] = None


# ── App ───────────────────────────────────────────────────

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    from db import engine
    create_tables()
    with Session(engine) as session:
        seed(session, Concept)


# ── Dipendenze ────────────────────────────────────────────

security = HTTPBearer()

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

    # Recupera tutti gli acquirenti storici nell'ordine di acquisto
    purchases = session.exec(select(Purchase).where(Purchase.concept_id == concept_id)).all()
    past_owners = [
        owner.username
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
        past_owners=past_owners,
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
    if concept.owner_id == current_user.id:
        raise HTTPException(status_code=409, detail="Sei già il proprietario di questo concetto")
    if current_user.coins < concept.price:
        raise HTTPException(status_code=402, detail="Saldo insufficiente")

    # Se il concetto è in seconda mano, trasferisci i coin al venditore
    if concept.owner_id:
        seller = session.get(User, concept.owner_id)
        if seller:
            seller.coins += int(concept.price)
            session.add(seller)

    current_user.coins -= int(concept.price)
    concept.listed = False  # esce dal marketplace
    concept.owner_id = current_user.id
    session.add(Purchase(user_id=current_user.id, concept_id=concept.id))
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
    # Nota: questo è un N+1 query — accettabile con i volumi attuali,
    # da ottimizzare con una JOIN se le offerte crescono molto.
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
        # Il concetto è stato venduto ad altri nel frattempo (es. acquisto diretto)
        raise HTTPException(status_code=409, detail="Non possiedi più questo concetto")

    buyer = session.get(User, offer.buyer_id)
    if not buyer:
        raise HTTPException(status_code=404, detail="Acquirente non trovato")
    if buyer.coins < offer.amount:
        raise HTTPException(status_code=402, detail="Saldo insufficiente dell'acquirente")

    # Transazione: sposta coin, trasferisci proprietà
    buyer.coins -= int(offer.amount)
    current_user.coins += int(offer.amount)
    concept.owner_id = buyer.id
    concept.listed = False  # il concetto esce dal marketplace dopo il trasferimento
    concept.price = offer.amount  # aggiorna il prezzo con quello dell'offerta accettata

    now = datetime.now(timezone.utc)
    offer.status = "accepted"
    offer.resolved_at = now

    session.add(Purchase(user_id=buyer.id, concept_id=concept.id))

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

@app.get("/users/search", response_model=list[UserPublic])
def search_users(q: str = "", session: Session = Depends(get_session)):
    if not q.strip():
        return []
    return session.exec(select(User).where(User.username.like(f"%{q}%")).limit(20)).all()

@app.get("/users/{user_id}/profile", response_model=UserProfileResponse)
def user_public_profile(user_id: str, session: Session = Depends(get_session)):
    """Profilo pubblico di un utente: mostra tutti i concetti che possiede,
    sia in vendita che ritirati."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    concepts = session.exec(select(Concept).where(Concept.owner_id == user_id)).all()
    return UserProfileResponse(user=UserPublic(id=user.id, username=user.username), concepts=concepts)


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
