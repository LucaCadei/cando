"""
Script di sviluppo: ricrea il DB e lo popola con utenti e concetti di esempio.

    uv run python seed_dev.py
"""

import os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import SQLModel, Session, create_engine, select
from db import DATABASE_URL
from auth import hash_password
from main import User, Concept, Purchase

# ── Dati ──────────────────────────────────────────────────

USERS = [
    dict(username="marco",    email="marco@dev.local",    password="pass"),
    dict(username="giulia",   email="giulia@dev.local",   password="pass"),
    dict(username="luca",     email="luca@dev.local",     password="pass"),
    dict(username="sofia",    email="sofia@dev.local",    password="pass"),
]

CONCEPTS = [
    # ── Numeri ────────────────────────────────────────────
    dict(type="number", title="0",        price=0.00,   description="Il numero che ha inventato il nulla. Prima di lui non esisteva un simbolo per l'assenza."),
    dict(type="number", title="1",        price=1.00,   description="L'unità. Tutto parte da qui. Senza l'uno non esiste il molti."),
    dict(type="number", title="2",        price=2.00,   description="Il primo numero pari. Il primo numero primo pari. L'unico."),
    dict(type="number", title="3",        price=3.00,   description="Trinità, terzine, triangoli. Il numero che l'umanità ha sempre considerato magico."),
    dict(type="number", title="7",        price=49.99,  description="Il numero più amato al mondo. Chiedilo a chiunque: risponderanno sette."),
    dict(type="number", title="12",       price=12.00,  description="Dodici apostoli, dodici mesi, dodici ore. Un numero che struttura il tempo."),
    dict(type="number", title="13",       price=13.00,  description="Porta sfortuna in Occidente, fortuna in Italia. Pura ambiguità numerica."),
    dict(type="number", title="17",       price=17.00,  description="In Italia il numero della sfortuna. Nessuno sa davvero perché."),
    dict(type="number", title="21",       price=21.00,  description="Il numero della maggiore età. Il confine arbitrario tra infanzia e responsabilità."),
    dict(type="number", title="23",       price=23.00,  description="Il numero di Jim Carrey. Un film intero costruito sull'ossessione per un numero."),
    dict(type="number", title="27",       price=27.00,  description="Il Club dei 27. Jimi, Janis, Jim, Kurt, Amy. Un numero maledetto."),
    dict(type="number", title="33",       price=33.00,  description="L'età di Cristo. L'anno in cui tutto si compie, secondo chi ci crede."),
    dict(type="number", title="42",       price=99.99,  description="La risposta alla vita, all'universo e a tutto il resto. Secondo Douglas Adams."),
    dict(type="number", title="47",       price=47.00,  description="Il numero preferito degli sceneggiatori di Star Trek. Compare in ogni episodio."),
    dict(type="number", title="52",       price=52.00,  description="Le carte di un mazzo. Le settimane dell'anno. Una coincidenza troppo precisa."),
    dict(type="number", title="64",       price=64.00,  description="Le case degli scacchi. 8 per 8. La scacchiera come universo chiuso."),
    dict(type="number", title="69",       price=69.00,  description="Il numero che fa ridere tutti alle medie. E anche dopo, se siamo onesti."),
    dict(type="number", title="72",       price=72.00,  description="Quanti battiti al minuto ha un cuore sano. Tutta la vita in un numero."),
    dict(type="number", title="88",       price=88.00,  description="I tasti di un pianoforte. L'intera gamma della musica classica in un numero."),
    dict(type="number", title="99",       price=9.99,   description="Il numero che sta per cedere. Un passo prima della perfezione tonda."),
    dict(type="number", title="100",      price=100.00, description="La perfezione decimale. Il voto massimo. La percentuale intera."),
    dict(type="number", title="108",      price=108.00, description="Numero sacro nell'Induismo e nel Buddhismo. 108 ripetizioni di un mantra."),
    dict(type="number", title="137",      price=137.00, description="La costante di struttura fine. Feynman ci passò una vita senza capirla."),
    dict(type="number", title="256",      price=25.60,  description="2⁸. Il confine naturale di ogni byte. La prima potenza di due che senti 'grande'."),
    dict(type="number", title="360",      price=36.00,  description="I gradi del cerchio. Una convenzione babilonese diventata realtà universale."),
    dict(type="number", title="404",      price=40.40,  description="Not Found. Il codice di errore diventato icona culturale di internet."),
    dict(type="number", title="420",      price=42.00,  description="L'ora della cannabis. Un numero che ha colonizzato una sottocultura globale."),
    dict(type="number", title="666",      price=6.66,   description="Il numero della bestia. In realtà probabilmente era 616."),
    dict(type="number", title="1000",     price=10.00,  description="Mille. Il primo numero che suona come 'tanto'. La prima soglia psicologica."),
    dict(type="number", title="1024",     price=10.24,  description="2¹⁰. Il kilobyte vero, non quello del marketing."),
    dict(type="number", title="1729",     price=179.00, description="Il numero di Hardy-Ramanujan: il più piccolo esprimibile come somma di due cubi in due modi."),
    dict(type="number", title="9999",     price=99.99,  description="Un passo prima del numero tondo. La tensione del quasi."),

    # ── Date ──────────────────────────────────────────────
    dict(type="date", title="1 gennaio 0001",      price=1.00,   description="Il primo giorno del calendario giuliano. Nessuno sapeva che era l'anno uno."),
    dict(type="date", title="15 marzo 44 a.C.",    price=44.00,  description="Le Idi di Marzo. 'Attento alle Idi di Marzo' — e aveva ragione."),
    dict(type="date", title="4 luglio 1776",        price=17.76,  description="L'indipendenza americana. Un documento sulla libertà scritto da proprietari di schiavi."),
    dict(type="date", title="12 febbraio 1809",     price=18.09,  description="Nasce Darwin. Nello stesso giorno nasce Lincoln. La storia è strana."),
    dict(type="date", title="1 gennaio 1900",       price=19.00,  description="L'inizio del Novecento. Il secolo più violento e più inventivo della storia."),
    dict(type="date", title="6 agosto 1945",        price=45.00,  description="Hiroshima. Il giorno in cui il mondo capì cosa aveva inventato."),
    dict(type="date", title="20 luglio 1969",       price=196.90, description="Il piede di Armstrong sulla Luna. Forse il momento più silenzioso della storia."),
    dict(type="date", title="9 novembre 1989",      price=19.89,  description="Il muro di Berlino cade. In diretta televisiva, quasi per caso."),
    dict(type="date", title="29 agosto 1997",       price=19.97,  description="Skynet diventa cosciente, secondo Terminator. Il giorno che non è arrivato (ancora)."),
    dict(type="date", title="1 gennaio 2000",       price=20.00,  description="Il millennium bug che non fu. Miliardi spesi per niente — o forse no."),
    dict(type="date", title="11 settembre 2001",    price=20.01,  description="Il giorno che ha cambiato il mondo. Prima e dopo sono due storie diverse."),
    dict(type="date", title="21 dicembre 2012",     price=12.21,  description="La fine del calendario Maya. Sono ancora qui a venderla."),
    dict(type="date", title="29 febbraio 2000",     price=29.02,  description="Un giorno che esiste solo ogni quattro anni. Nato in questo giorno: compleanno rarissimo."),
    dict(type="date", title="4 ottobre 1957",       price=19.57,  description="Il lancio dello Sputnik. La prima volta che l'uomo ha messo qualcosa in orbita."),
    dict(type="date", title="12 aprile 1961",       price=19.61,  description="Gagarin nello spazio. 'La Terra è blu.' Durò 108 minuti."),
    dict(type="date", title="28 giugno 1914",       price=19.14,  description="L'assassinio di Francesco Ferdinando. Il giorno in cui iniziò il Novecento vero."),
    dict(type="date", title="25 dicembre 0000",     price=0.00,   description="Una data che non esiste nel calendario gregoriano. L'anno zero non c'è."),
    dict(type="date", title="31 dicembre 9999",     price=999.99, description="L'ultimo giorno del calendario standard. Dopo, i sistemi informatici si rompono."),

    # ── Idee ──────────────────────────────────────────────
    dict(type="idea", title="Il colore dell'amore",          price=149.99, description="Non è il rosso. È qualcosa che non ha ancora un nome."),
    dict(type="idea", title="Il peso di un pensiero",        price=89.99,  description="Quanto pesa un'idea? Meno di un fotone, più di una vita."),
    dict(type="idea", title="La forma del tempo",            price=199.99, description="Non è lineare. Non è circolare. È qualcosa che ancora non sai disegnare."),
    dict(type="idea", title="L'istante tra due pensieri",    price=0.01,   description="Il silenzio cognitivo. Il momento in cui non stai pensando a niente."),
    dict(type="idea", title="Il confine dell'io",            price=299.99, description="Dove finisci tu e dove inizia il mondo? Nessuno lo sa con certezza."),
    dict(type="idea", title="L'ombra di un sogno",           price=59.99,  description="Ciò che rimane di un sogno dopo che lo hai quasi dimenticato."),
    dict(type="idea", title="Il suono del silenzio",         price=4.33,   description="Non è 4'33'' di Cage. È l'altro silenzio. Quello che spaventa."),
    dict(type="idea", title="L'ultima parola",               price=999.99, description="Non quella di una lite. L'ultima parola che verrà mai pronunciata."),
    dict(type="idea", title="Il numero prima dell'uno",      price=0.00,   description="Non è zero. Zero è già qualcosa. Questo è il concetto di prima del contare."),
    dict(type="idea", title="La domanda senza risposta",     price=42.00,  description="Non 'qual è il senso della vita'. Quella più piccola, che ti blocca alle 3 di notte."),
    dict(type="idea", title="Gravity as a service",          price=299.00, description="Noleggia gravità on demand. Prezzi variabili in base alla massa."),
    dict(type="idea", title="Silenzio brevettato",           price=150.00, description="Un secondo di silenzio assoluto, protetto da copyright."),
    dict(type="idea", title="Nome per un colore",            price=75.00,  description="Un colore che non ha ancora un nome. Tutto tuo — puoi chiamarlo come vuoi."),
    dict(type="idea", title="Odore di pioggia",              price=88.00,  description="Il petrichor come concetto in vendita. L'odore della terra bagnata, proprietà privata."),
    dict(type="idea", title="La velocità del buio",          price=210.00, description="Il buio si muove più veloce della luce. Non c'è fisica che tenga."),
    dict(type="idea", title="Il sapore della nostalgia",     price=120.00, description="Non è il madeleines di Proust. È l'altro gusto. Quello che non riesci a descrivere."),
    dict(type="idea", title="Un'ora in più al giorno",       price=500.00, description="Non il fuso orario. Un'ora reale, nuova, che non esiste per nessun altro."),
    dict(type="idea", title="La fine di internet",           price=350.00, description="Il momento in cui tutto è già stato detto. La pagina dopo l'ultima pagina."),
    dict(type="idea", title="Il sogno che si ricorda",       price=65.00,  description="Non il sogno. Il fatto che lo ricordi. Il meccanismo, non il contenuto."),
    dict(type="idea", title="Proprietà di un'emozione",      price=450.00, description="Non la tristezza. Non la gioia. Quella sfumatura specifica che non ha nome."),

    # ── Filosofia ─────────────────────────────────────────
    dict(type="filosofia", title="Permanenza",    price=380.00, description="Ciò che rimane quando tutto cambia. Parmenide contro Eraclito, senza soluzione da tremila anni."),
    dict(type="filosofia", title="Essere",        price=490.00, description="La domanda di Heidegger: perché c'è qualcosa piuttosto che niente? Nessuno ha risposto."),
    dict(type="filosofia", title="Pluralità",     price=210.00, description="L'uno che diventa molti. Il problema che ha tormentato i presocratici."),
    dict(type="filosofia", title="Nulla",         price=0.00,   description="Non il vuoto, non l'assenza. Il nulla come concetto autonomo."),
    dict(type="filosofia", title="Tempo",         price=320.00, description="Agostino sapeva cos'era finché nessuno glielo chiedeva."),
    dict(type="filosofia", title="Identità",      price=275.00, description="Sei la stessa persona che eri dieci anni fa? Nessuno lo è, eppure tu persisti."),
    dict(type="filosofia", title="Infinito",      price=560.00, description="Non il numero più grande. L'infinito come struttura del pensiero — Cantor ci ha quasi perso la ragione."),
    dict(type="filosofia", title="Libertà",       price=420.00, description="Sartre: condannato ad essere libero. Acquistare questa libertà è già un esercizio di essa."),
    dict(type="filosofia", title="Causalità",     price=310.00, description="Ogni effetto ha una causa. Ma chi ha causato la prima causa?"),
    dict(type="filosofia", title="Coscienza",     price=600.00, description="Il problema difficile: perché c'è qualcosa che 'è come essere' qualcosa?"),
    dict(type="filosofia", title="Verità",        price=250.00, description="Non la corrispondenza. Non la coerenza. La verità come oggetto possedibile."),
    dict(type="filosofia", title="Giustizia",     price=400.00, description="Platone la cercò tutta la vita. Rawls la redesignò da zero. Non si trovano d'accordo."),
    dict(type="filosofia", title="Morte",         price=999.00, description="L'unica certezza. Epitteto diceva di non temerla. Facile a dirsi."),
    dict(type="filosofia", title="Bello",         price=180.00, description="Kant ne fece una critica. Hegel lo storificò. Tu puoi semplicemente possederlo."),
    dict(type="filosofia", title="Caso",          price=155.00, description="Esiste davvero o è solo ignoranza? La domanda che divide i fisici."),
    dict(type="filosofia", title="Linguaggio",    price=290.00, description="'I limiti del mio linguaggio sono i limiti del mio mondo.' Wittgenstein aveva ragione?"),
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

        # Concetti
        concepts = []
        for c in CONCEPTS:
            concept = Concept(**c)
            s.add(concept)
            concepts.append(concept)
        s.commit()
        for c in concepts:
            s.refresh(c)
        print(f"  {len(concepts)} concetti creati")

        # Qualche acquisto di esempio
        purchases = [
            (users[0], concepts[0]),   # marco  → 0
            (users[0], concepts[12]),  # marco  → 42
            (users[1], concepts[6]),   # giulia → 13
            (users[1], concepts[50]),  # giulia → Il colore dell'amore
            (users[2], concepts[70]),  # luca   → Permanenza
        ]
        for buyer, concept in purchases:
            buyer.coins -= int(concept.price)
            concept.listed = False  # il concetto viene acquistato: esce dal marketplace
            concept.owner_id = buyer.id
            s.add(buyer); s.add(concept)
            s.add(Purchase(user_id=buyer.id, concept_id=concept.id))
        s.commit()
        print(f"  {len(purchases)} acquisti di esempio creati")

    print(f"\nDatabase pronto. {len(CONCEPTS)} concetti, {len(USERS)} utenti.")
    print("Credenziali: marco / giulia / luca / sofia — password: pass")


if __name__ == "__main__":
    main()
