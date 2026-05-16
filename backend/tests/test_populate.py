"""
Test per populate.py.

Le chiamate HTTP a Wikipedia vengono sempre mockate: nessuna connessione reale.
populate() accetta un engine iniettabile → usiamo SQLite in memoria.
"""

import json
from io import BytesIO
from unittest.mock import patch, MagicMock
import urllib.error

import pytest
from sqlmodel import SQLModel, Session, create_engine, select
from sqlmodel.pool import StaticPool

from populate import search_wikipedia, fetch_summary, first_sentence, populate, main as populate_main
from main import Concept


# ── Fixture: DB in memoria ────────────────────────────────

@pytest.fixture
def engine():
    eng = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(eng)
    yield eng
    SQLModel.metadata.drop_all(eng)


# ── Helper: risposta HTTP fittizia ────────────────────────

def _mock_response(payload: dict):
    """Crea un context manager che simula urllib.request.urlopen."""
    body = json.dumps(payload).encode()
    mock = MagicMock()
    mock.__enter__ = lambda s: BytesIO(body)
    mock.__exit__ = MagicMock(return_value=False)
    return mock


def _http_error(code: int):
    return urllib.error.HTTPError(url="", code=code, msg="", hdrs=None, fp=None)


# ── first_sentence ────────────────────────────────────────

def test_first_sentence_normal():
    text = "Galileo Galilei fu un grande scienziato. Nacque a Pisa nel 1564."
    assert first_sentence(text) == "Galileo Galilei fu un grande scienziato."


def test_first_sentence_no_period():
    text = "Testo senza punto"
    assert first_sentence(text) == "Testo senza punto"


def test_first_sentence_truncates_long_text():
    text = "A" * 300
    result = first_sentence(text)
    assert result.endswith("…")
    assert len(result) <= 284  # 280 + "…"


def test_first_sentence_short_sentence_not_split():
    # Prima frase troppo corta (< 20 chars) → non splitta
    text = "Ok. Questa è la vera prima frase. Altra roba."
    result = first_sentence(text)
    # "Ok" ha idx=2 < 20, quindi non usa quella come split point
    assert result.startswith("Ok.")


def test_first_sentence_strips_newlines():
    text = "Prima riga.\nSeconda riga. Altra roba."
    result = first_sentence(text)
    assert "\n" not in result


# ── search_wikipedia ──────────────────────────────────────

def test_search_wikipedia_returns_titles():
    payload = {"query": {"search": [{"title": "Dante Alighieri"}, {"title": "Boccaccio"}]}}
    with patch("urllib.request.urlopen", return_value=_mock_response(payload)):
        titles = search_wikipedia("poeti italiani")
    assert titles == ["Dante Alighieri", "Boccaccio"]


def test_search_wikipedia_empty_results():
    payload = {"query": {"search": []}}
    with patch("urllib.request.urlopen", return_value=_mock_response(payload)):
        titles = search_wikipedia("xyzzy123_non_esiste")
    assert titles == []


def test_search_wikipedia_network_error():
    with patch("urllib.request.urlopen", side_effect=Exception("timeout")):
        titles = search_wikipedia("qualcosa")
    assert titles == []


# ── fetch_summary ─────────────────────────────────────────

def _summary_payload(title="Dante Alighieri"):
    return {
        "title": title,
        "extract": "Dante Alighieri fu il sommo poeta. Nacque a Firenze nel 1265.",
        "thumbnail": {"source": "https://example.com/dante.jpg"},
        "content_urls": {"desktop": {"page": f"https://it.wikipedia.org/wiki/{title}"}},
    }


def test_fetch_summary_ok():
    with patch("urllib.request.urlopen", return_value=_mock_response(_summary_payload())):
        data = fetch_summary("Dante Alighieri")
    assert data["title"] == "Dante Alighieri"
    assert "extract" in data
    assert data["thumbnail"]["source"] == "https://example.com/dante.jpg"


def test_fetch_summary_http_error_non_429_returns_none():
    with patch("urllib.request.urlopen", side_effect=_http_error(404)):
        result = fetch_summary("Pagina_inesistente")
    assert result is None


def test_fetch_summary_retries_on_429(capsys):
    # Prima chiamata → 429, seconda → successo
    error = _http_error(429)
    ok = _mock_response(_summary_payload())
    with patch("urllib.request.urlopen", side_effect=[error, ok]):
        with patch("time.sleep"):   # non aspettare davvero
            result = fetch_summary("Dante Alighieri", retries=3)
    assert result is not None
    assert result["title"] == "Dante Alighieri"


def test_fetch_summary_exhausts_retries():
    error = _http_error(429)
    with patch("urllib.request.urlopen", side_effect=[error, error, error]):
        with patch("time.sleep"):
            result = fetch_summary("Dante", retries=3)
    assert result is None


def test_fetch_summary_network_error_returns_none():
    with patch("urllib.request.urlopen", side_effect=Exception("timeout")):
        result = fetch_summary("Dante")
    assert result is None


# ── populate ──────────────────────────────────────────────

def _make_summary(title: str, url_slug: str | None = None) -> dict:
    slug = url_slug or title.replace(" ", "_")
    return {
        "title": title,
        "extract": f"{title} è molto famoso. Ha fatto cose importanti.",
        "thumbnail": {"source": f"https://example.com/{slug}.jpg"},
        "content_urls": {"desktop": {"page": f"https://it.wikipedia.org/wiki/{slug}"}},
    }


def test_populate_inserts_concepts(engine):
    titles = ["Dante Alighieri", "Petrarca"]
    summaries = {t: _make_summary(t) for t in titles}

    with patch("populate.search_wikipedia", return_value=titles), \
         patch("populate.fetch_summary", side_effect=lambda t, **kw: summaries[t]), \
         patch("time.sleep"):
        n = populate("poeti italiani", "persona", count=2, price=300, engine=engine)

    assert n == 2
    with Session(engine) as s:
        concepts = s.exec(select(Concept)).all()
    assert len(concepts) == 2
    titles_in_db = {c.title for c in concepts}
    assert "Dante Alighieri" in titles_in_db
    assert "Petrarca" in titles_in_db


def test_populate_skips_duplicates(engine):
    # Inserisce Dante la prima volta
    with Session(engine) as s:
        s.add(Concept(
            type="persona", title="Dante Alighieri",
            description="Sommo poeta.", price=300.0,
            wikipedia_url="https://it.wikipedia.org/wiki/Dante_Alighieri",
        ))
        s.commit()

    titles = ["Dante Alighieri", "Petrarca"]
    summaries = {t: _make_summary(t) for t in titles}

    with patch("populate.search_wikipedia", return_value=titles), \
         patch("populate.fetch_summary", side_effect=lambda t, **kw: summaries[t]), \
         patch("time.sleep"):
        n = populate("poeti italiani", "persona", count=2, price=300, engine=engine)

    # Solo Petrarca è nuovo
    assert n == 1
    with Session(engine) as s:
        concepts = s.exec(select(Concept)).all()
    assert len(concepts) == 2


def test_populate_respects_count_limit(engine):
    titles = ["A", "B", "C", "D", "E"]
    summaries = {t: _make_summary(t) for t in titles}

    with patch("populate.search_wikipedia", return_value=titles), \
         patch("populate.fetch_summary", side_effect=lambda t, **kw: summaries[t]), \
         patch("time.sleep"):
        n = populate("query", "scienza", count=2, price=100, engine=engine)

    assert n == 2
    with Session(engine) as s:
        assert len(s.exec(select(Concept)).all()) == 2


def test_populate_sets_price_and_type(engine):
    with patch("populate.search_wikipedia", return_value=["Vesuvio"]), \
         patch("populate.fetch_summary", return_value=_make_summary("Vesuvio")), \
         patch("time.sleep"):
        populate("vulcani", "luogo", count=1, price=175, engine=engine)

    with Session(engine) as s:
        c = s.exec(select(Concept)).first()
    assert c.type == "luogo"
    assert c.price == 175.0


def test_populate_listed_flag(engine):
    with patch("populate.search_wikipedia", return_value=["Vesuvio"]), \
         patch("populate.fetch_summary", return_value=_make_summary("Vesuvio")), \
         patch("time.sleep"):
        populate("vulcani", "luogo", count=1, price=100, listed=False, engine=engine)

    with Session(engine) as s:
        c = s.exec(select(Concept)).first()
    assert c.listed is False


def test_populate_handles_fetch_failure(engine):
    # Il primo titolo fallisce, il secondo va a buon fine
    titles = ["Pagina_rotta", "Petrarca"]

    def _side_effect(title, **kw):
        if title == "Pagina_rotta":
            return None
        return _make_summary(title)

    with patch("populate.search_wikipedia", return_value=titles), \
         patch("populate.fetch_summary", side_effect=_side_effect), \
         patch("time.sleep"):
        n = populate("query", "persona", count=1, price=100, engine=engine)

    assert n == 1
    with Session(engine) as s:
        c = s.exec(select(Concept)).first()
    assert c.title == "Petrarca"


def test_populate_no_search_results(engine):
    with patch("populate.search_wikipedia", return_value=[]):
        n = populate("xyzzy_non_esiste", "arte", count=5, price=100, engine=engine)
    assert n == 0
    with Session(engine) as s:
        assert s.exec(select(Concept)).first() is None


# ── main() — lettura da env var ───────────────────────────

def test_main_reads_from_env_vars(engine):
    """I parametri passati via env var devono essere usati quando i flag CLI mancano."""
    env = {
        "POPULATE_QUERY": "vulcani italiani",
        "POPULATE_TYPE":  "luogo",
        "POPULATE_COUNT": "2",
        "POPULATE_PRICE": "150",
        "POPULATE_LANG":  "it",
        "POPULATE_UNLISTED": "false",
    }
    with patch.dict("os.environ", env), \
         patch("sys.argv", ["populate.py"]), \
         patch("populate.populate", return_value=2) as mock_pop:
        populate_main()

    mock_pop.assert_called_once_with(
        query="vulcani italiani",
        concept_type="luogo",
        count=2,
        price=150,
        lang="it",
        listed=True,
    )


def test_main_cli_args_override_env_vars(engine):
    """I flag CLI hanno precedenza sulle variabili d'ambiente."""
    env = {"POPULATE_QUERY": "query-da-env", "POPULATE_TYPE": "luogo"}
    with patch.dict("os.environ", env), \
         patch("sys.argv", ["populate.py", "--query", "query-da-cli", "--type", "arte"]), \
         patch("populate.populate", return_value=1) as mock_pop:
        populate_main()

    call_kwargs = mock_pop.call_args[1]
    assert call_kwargs["query"] == "query-da-cli"
    assert call_kwargs["concept_type"] == "arte"


def test_main_unlisted_env_var(engine):
    """POPULATE_UNLISTED=true deve risultare in listed=False."""
    env = {
        "POPULATE_QUERY": "test",
        "POPULATE_TYPE":  "scienza",
        "POPULATE_UNLISTED": "true",
    }
    with patch.dict("os.environ", env), \
         patch("sys.argv", ["populate.py"]), \
         patch("populate.populate", return_value=0) as mock_pop:
        populate_main()

    assert mock_pop.call_args[1]["listed"] is False


def test_main_missing_query_exits(capsys):
    """Senza query né env var deve uscire con errore."""
    import sys
    with patch.dict("os.environ", {}, clear=True), \
         patch("sys.argv", ["populate.py", "--type", "arte"]):
        with pytest.raises(SystemExit):
            populate_main()


def test_main_missing_type_exits(capsys):
    """Senza type né env var deve uscire con errore."""
    with patch.dict("os.environ", {}, clear=True), \
         patch("sys.argv", ["populate.py", "--query", "test"]):
        with pytest.raises(SystemExit):
            populate_main()
