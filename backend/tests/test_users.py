from .conftest import make_user, make_concept, auth


# ── search ────────────────────────────────────────────────

def test_search_finds_user_by_username(client):
    make_user(client, "alice")
    r = client.get("/users/search?q=alice")
    assert r.status_code == 200
    assert any(u["username"] == "alice" for u in r.json())


def test_search_partial_match(client):
    make_user(client, "alice")
    make_user(client, "alicia", "alicia@test.com")
    make_user(client, "bob", "bob@test.com")
    r = client.get("/users/search?q=ali")
    usernames = [u["username"] for u in r.json()]
    assert "alice" in usernames
    assert "alicia" in usernames
    assert "bob" not in usernames


def test_search_empty_query_returns_empty(client):
    make_user(client, "alice")
    r = client.get("/users/search?q=")
    assert r.status_code == 200
    assert r.json() == []


def test_search_no_match_returns_empty(client):
    make_user(client, "alice")
    r = client.get("/users/search?q=zzznomatch")
    assert r.status_code == 200
    assert r.json() == []


def test_search_does_not_expose_sensitive_fields(client):
    make_user(client, "alice")
    r = client.get("/users/search?q=alice")
    user = r.json()[0]
    assert "hashed_password" not in user
    assert "email" not in user
    assert "coins" not in user


def test_search_respects_limit(client):
    for i in range(25):
        make_user(client, f"user{i:02d}", f"user{i:02d}@test.com")
    r = client.get("/users/search?q=user")
    assert len(r.json()) <= 20


# ── public profile ────────────────────────────────────────

def test_user_profile_basic(client):
    alice = make_user(client, "alice")
    r = client.get(f"/users/{alice['user_id']}/profile")
    assert r.status_code == 200
    data = r.json()
    assert data["user"]["username"] == "alice"
    assert data["user"]["id"] == alice["user_id"]
    assert isinstance(data["concepts"], list)


def test_user_profile_shows_owned_concepts(client):
    alice = make_user(client, "alice")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    r = client.get(f"/users/{alice['user_id']}/profile")
    ids = [x["id"] for x in r.json()["concepts"]]
    assert c["id"] in ids


def test_user_profile_empty_if_no_concepts(client):
    alice = make_user(client, "alice")
    r = client.get(f"/users/{alice['user_id']}/profile")
    assert r.json()["concepts"] == []


def test_user_profile_does_not_show_other_users_concepts(client):
    alice = make_user(client, "alice")
    bob = make_user(client, "bob", "bob@test.com")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(bob["token"]))
    r = client.get(f"/users/{alice['user_id']}/profile")
    assert r.json()["concepts"] == []


def test_user_profile_not_found(client):
    r = client.get("/users/nonexistent-id/profile")
    assert r.status_code == 404


def test_user_profile_does_not_expose_sensitive_fields(client):
    alice = make_user(client, "alice")
    r = client.get(f"/users/{alice['user_id']}/profile")
    user = r.json()["user"]
    assert "hashed_password" not in user
    assert "email" not in user
    assert "coins" not in user


def test_user_profile_includes_unlisted_concepts(client):
    """Gli oggetti unlisted (sold=True) compaiono nel profilo — il proprietario li ha ancora."""
    alice = make_user(client, "alice")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    # comprato ma non rimesso in vendita → sold=True
    r = client.get(f"/users/{alice['user_id']}/profile")
    ids = [x["id"] for x in r.json()["concepts"]]
    assert c["id"] in ids
