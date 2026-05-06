import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from main import app
from db import get_session


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def override():
        yield session

    app.dependency_overrides[get_session] = override
    client = TestClient(app, raise_server_exceptions=True)
    yield client
    app.dependency_overrides.clear()


# ── helpers ───────────────────────────────────────────────

def make_user(client: TestClient, username: str, email: str = None, password: str = "testpass") -> dict:
    email = email or f"{username}@test.com"
    r = client.post("/auth/register", json={"username": username, "email": email, "password": password})
    assert r.status_code == 201, r.text
    return r.json()  # token, user_id, username, email, coins


def make_concept(client: TestClient, **kwargs) -> dict:
    data = {"type": "number", "title": "42", "description": "La risposta", "price": 100} | kwargs
    # X-Admin-Key usa il valore di default dello sviluppo definito in main.py
    r = client.post("/concepts", json=data, headers={"X-Admin-Key": "dev-key-insecure"})
    assert r.status_code == 201, r.text
    return r.json()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
