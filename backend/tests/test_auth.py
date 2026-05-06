from .conftest import make_user


def test_register_returns_token_and_coins(client):
    r = client.post("/auth/register", json={"username": "alice", "email": "alice@test.com", "password": "pass"})
    assert r.status_code == 201
    data = r.json()
    assert data["username"] == "alice"
    assert data["coins"] == 1000
    assert "token" in data


def test_register_duplicate_email(client):
    make_user(client, "alice", "alice@test.com")
    r = client.post("/auth/register", json={"username": "alice2", "email": "alice@test.com", "password": "pass"})
    assert r.status_code == 409


def test_register_duplicate_username(client):
    make_user(client, "alice", "alice@test.com")
    r = client.post("/auth/register", json={"username": "alice", "email": "other@test.com", "password": "pass"})
    assert r.status_code == 409


def test_login_success(client):
    make_user(client, "alice", "alice@test.com", "mypass")
    r = client.post("/auth/login", json={"email": "alice@test.com", "password": "mypass"})
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_wrong_password(client):
    make_user(client, "alice", "alice@test.com", "mypass")
    r = client.post("/auth/login", json={"email": "alice@test.com", "password": "wrong"})
    assert r.status_code == 401


def test_login_unknown_email(client):
    r = client.post("/auth/login", json={"email": "nobody@test.com", "password": "pass"})
    assert r.status_code == 401


def test_login_returns_current_coins(client):
    make_user(client, "alice")
    r = client.post("/auth/login", json={"email": "alice@test.com", "password": "testpass"})
    assert r.json()["coins"] == 1000


# ── Token / auth middleware ───────────────────────────────

def test_protected_endpoint_no_token_returns_401(client):
    r = client.get("/users/me/purchases")
    assert r.status_code == 401


def test_protected_endpoint_invalid_token_returns_401(client):
    r = client.get("/users/me/purchases", headers={"Authorization": "Bearer notavalidtoken"})
    assert r.status_code == 401


def test_protected_endpoint_malformed_header_returns_401(client):
    r = client.get("/users/me/purchases", headers={"Authorization": "notbearer"})
    assert r.status_code == 401


def test_register_response_has_all_fields(client):
    r = client.post("/auth/register", json={"username": "bob", "email": "bob@test.com", "password": "pass"})
    data = r.json()
    for field in ("token", "user_id", "username", "email", "coins"):
        assert field in data, f"campo mancante: {field}"


def test_register_password_not_exposed(client):
    r = client.post("/auth/register", json={"username": "alice", "email": "alice@test.com", "password": "secret"})
    data = r.json()
    assert "password" not in data
    assert "hashed_password" not in data


def test_different_users_get_different_tokens(client):
    a = make_user(client, "alice")
    b = make_user(client, "bob", "bob@test.com")
    assert a["token"] != b["token"]
