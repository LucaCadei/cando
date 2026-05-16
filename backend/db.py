import os
from sqlmodel import SQLModel, Session, create_engine

_here = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(_here, 'cando.db')}")

# SQLite richiede check_same_thread=False per non bloccare il thread di uvicorn
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=_connect_args)


def create_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


SEED_DATA = [
    # Numeri
    dict(id="n01", type="number", title="7",       description="Il numero più amato al mondo, scelto da chiunque voglia un numero 'a caso'", price=49.99),
    dict(id="n02", type="number", title="13",      description="Porta sfortuna in Occidente, fortuna in Italia. Ambiguità pura", price=13.00),
    dict(id="n03", type="number", title="42",      description="La risposta alla vita, all'universo e a tutto il resto", price=99.99),
    dict(id="n04", type="number", title="99",      description="Il numero che sta per cedere. Un passo prima della perfezione tonda", price=9.99),
    dict(id="n05", type="number", title="137",     description="La costante di struttura fine. Feynman ci passò una vita senza capirla", price=137.00),
    dict(id="n06", type="number", title="256",     description="2⁸. Il confine naturale di ogni byte. La prima potenza di due che senti come 'grande'", price=25.60),
    dict(id="n07", type="number", title="360",     description="I gradi del cerchio. Una convenzione diventata realtà", price=36.00),
    dict(id="n08", type="number", title="666",     description="Numero della bestia. In realtà probabilmente era 616", price=6.66),
    dict(id="n09", type="number", title="1001",    description="Le notti in cui Shahrazàd ha raccontato storie per non morire", price=19.99),
    dict(id="n10", type="number", title="1024",    description="2¹⁰. Il kilobyte vero, non quello del marketing", price=10.24),
    dict(id="n11", type="number", title="1729",    description="Il numero di Hardy-Ramanujan: il più piccolo esprimibile come somma di due cubi in due modi", price=179.00),
    dict(id="n12", type="number", title="2048",    description="Il gioco che ha divorato milioni di ore. Anche una potenza di due", price=20.48),
    dict(id="n13", type="number", title="3600",    description="I secondi in un'ora. Il tempo come numero", price=36.00),
    dict(id="n14", type="number", title="4096",    description="2¹². Il numero dove gli informatici si sentono a casa", price=40.96),
    dict(id="n15", type="number", title="5040",    description="Il numero di cittadini della città ideale secondo Platone nelle Leggi", price=50.40),
    dict(id="n16", type="number", title="6174",    description="La costante di Kaprekar: ogni numero a 4 cifre ci arriva in 7 passi", price=61.74),
    dict(id="n17", type="number", title="7777",    description="Quattro sette. Il massimo della fortuna per chi ci crede", price=77.77),
    dict(id="n18", type="number", title="8128",    description="Il quarto numero perfetto. Uguale alla somma di tutti i suoi divisori", price=81.28),
    dict(id="n19", type="number", title="9801",    description="99². Palindromo. Si legge uguale al contrario", price=98.01),
    dict(id="n20", type="number", title="9999",    description="Il numero che precede la rottura. Un istante prima dell'azzeramento", price=99.99),
    # Date
    dict(id="d01", type="date", title="15 marzo 44 a.C.",   description="Le Idi di Marzo. 'Attento alle Idi di Marzo' — e aveva ragione", price=44.00),
    dict(id="d02", type="date", title="4 luglio 1776",       description="L'indipendenza americana. Un documento scritto da uomini che possedevano schiavi e parlava di libertà", price=17.76),
    dict(id="d03", type="date", title="1 gennaio 0001",      description="Il primo giorno del calendario giuliano. Nessuno sapeva che era l'anno uno", price=1.00),
    dict(id="d04", type="date", title="12 febbraio 1809",    description="Nasce Darwin. Nello stesso giorno nasce Abraham Lincoln. La storia è strana", price=18.09),
    dict(id="d05", type="date", title="6 agosto 1945",       description="Hiroshima. Il giorno in cui il mondo capì cosa aveva inventato", price=45.00),
    dict(id="d06", type="date", title="20 luglio 1969",      description="Il piede di Armstrong sulla Luna. Forse il momento più silenzioso della storia", price=196.90),
    dict(id="d07", type="date", title="9 novembre 1989",     description="Il muro di Berlino cade. In diretta televisiva, quasi per caso", price=19.89),
    dict(id="d08", type="date", title="29 agosto 1997",      description="Skynet diventa cosciente, secondo Terminator. Il giorno che non è arrivato (ancora)", price=19.97),
    dict(id="d09", type="date", title="1 gennaio 2000",      description="Il millennium bug che non fu. Miliardi spesi per niente, o forse no", price=20.00),
    dict(id="d10", type="date", title="21 dicembre 2012",    description="La fine del calendario Maya. Sono qui ancora qui a venderla", price=12.21),
    # Idee
    dict(id="i01", type="idea", title="Il colore dell'amore",       description="Non è il rosso. È qualcosa che non ha ancora un nome", price=149.99),
    dict(id="i02", type="idea", title="Il peso di un pensiero",     description="Quanto pesa un'idea? Meno di un fotone, più di una vita", price=89.99),
    dict(id="i03", type="idea", title="La forma del tempo",         description="Non è lineare. Non è circolare. È qualcosa che ancora non sai disegnare", price=199.99),
    dict(id="i04", type="idea", title="L'istante tra due pensieri", description="Il silenzio cognitivo. Il momento in cui non stai pensando a niente", price=0.01),
    dict(id="i05", type="idea", title="Il confine dell'io",         description="Dove finisci tu e dove inizia il mondo? Nessuno lo sa con certezza", price=299.99),
    dict(id="i06", type="idea", title="L'ombra di un sogno",        description="Ciò che rimane di un sogno dopo che lo hai quasi dimenticato", price=59.99),
    dict(id="i07", type="idea", title="Il suono del silenzio",      description="Non è 4'33'' di Cage. È l'altro silenzio. Quello che spaventa", price=4.33),
    dict(id="i08", type="idea", title="L'ultima parola",            description="Non quella di una lite. L'ultima parola che verrà mai pronunciata", price=999.99),
    dict(id="i09", type="idea", title="Il numero prima dell'uno",   description="Non è zero. Zero è già qualcosa. Questo è il concetto di prima del contare", price=0.00),
    dict(id="i10", type="idea", title="La domanda senza risposta",  description="Non 'qual è il senso della vita'. Quella più piccola, quella che ti blocca alle 3 di notte", price=42.00),
    # Filosofia
    dict(id="f01", type="filosofia", title="Permanenza",  description="Ciò che rimane quando tutto cambia. Parmenide contro Eraclito, senza soluzione da tremila anni", price=380.00),
    dict(id="f02", type="filosofia", title="Essere",      description="La domanda di Heidegger: perché c'è qualcosa piuttosto che niente? Nessuno ha risposto. Forse sei tu", price=490.00),
    dict(id="f03", type="filosofia", title="Pluralità",   description="L'uno che diventa molti. Il problema che ha tormentato i presocratici e non ha ancora smesso", price=210.00),
    dict(id="f04", type="filosofia", title="Nulla",       description="Non il vuoto, non l'assenza. Il nulla come concetto autonomo — più difficile da possedere di qualunque cosa", price=0.00),
    dict(id="f05", type="filosofia", title="Tempo",       description="Agostino sapeva cos'era, finché nessuno glielo chiedeva. Adesso è tuo. Fai attenzione", price=320.00),
    dict(id="f06", type="filosofia", title="Identità",    description="Sei la stessa persona che eri dieci anni fa? Nessuno lo è, eppure tu persisti. Come?", price=275.00),
    dict(id="f07", type="filosofia", title="Infinito",    description="Non il numero più grande. L'infinito come struttura del pensiero — Cantor ci ha quasi perso la ragione", price=560.00),
    dict(id="f08", type="filosofia", title="Libertà",     description="Sartre: condannato ad essere libero. Acquistare questa libertà è già un esercizio di essa", price=420.00),
]


def seed(session: Session, model):
    from sqlmodel import select
    existing = session.exec(select(model)).first()
    if existing:
        return
    for row in SEED_DATA:
        session.add(model(**row))
    session.commit()
