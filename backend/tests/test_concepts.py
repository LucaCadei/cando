from .conftest import make_user, make_concept, auth


# ── listing ───────────────────────────────────────────────

def test_list_concepts_empty(client):
    r = client.get("/concepts")
    assert r.status_code == 200
    assert r.json() == []


def test_list_concepts(client):
    make_concept(client)
    make_concept(client, title="π", price=50)
    r = client.get("/concepts")
    assert len(r.json()) == 2


def test_list_concepts_excludes_sold(client):
    alice = make_user(client, "alice")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    ids = [x["id"] for x in client.get("/concepts").json()]
    assert c["id"] not in ids


# ── detail ────────────────────────────────────────────────

def test_concept_detail_basic_structure(client):
    c = make_concept(client)
    r = client.get(f"/concepts/{c['id']}/detail")
    assert r.status_code == 200
    data = r.json()
    assert "concept" in data
    assert "past_owners" in data
    assert "save_count" in data
    assert data["save_count"] == 0
    assert data["past_owners"] == []
    assert data["current_owner"] is None


def test_concept_detail_shows_current_owner(client):
    alice = make_user(client, "alice")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    r = client.get(f"/concepts/{c['id']}/detail")
    assert r.json()["current_owner"] == "alice"


def test_concept_detail_tracks_past_owners(client):
    alice = make_user(client, "alice")
    bob = make_user(client, "bob", "bob@test.com")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    client.post(f"/concepts/{c['id']}/relist", json={"price": 100}, headers=auth(alice["token"]))
    client.post(f"/concepts/{c['id']}/buy", headers=auth(bob["token"]))
    r = client.get(f"/concepts/{c['id']}/detail")
    past = r.json()["past_owners"]
    assert "alice" in past
    assert "bob" in past


def test_concept_detail_save_count(client):
    alice = make_user(client, "alice")
    bob = make_user(client, "bob", "bob@test.com")
    c = make_concept(client)
    client.post(f"/concepts/{c['id']}/save", headers=auth(alice["token"]))
    client.post(f"/concepts/{c['id']}/save", headers=auth(bob["token"]))
    r = client.get(f"/concepts/{c['id']}/detail")
    assert r.json()["save_count"] == 2


def test_concept_detail_save_count_decrements_on_unsave(client):
    alice = make_user(client, "alice")
    c = make_concept(client)
    client.post(f"/concepts/{c['id']}/save", headers=auth(alice["token"]))
    client.post(f"/concepts/{c['id']}/save", headers=auth(alice["token"]))  # unsave
    r = client.get(f"/concepts/{c['id']}/detail")
    assert r.json()["save_count"] == 0


def test_concept_detail_not_found(client):
    r = client.get("/concepts/nonexistent-id/detail")
    assert r.status_code == 404


# ── buy ───────────────────────────────────────────────────

def test_buy_deducts_coins(client):
    alice = make_user(client, "alice")
    c = make_concept(client, price=100)
    r = client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    assert r.status_code == 200
    assert r.json()["coins"] == 900


def test_buy_not_found(client):
    alice = make_user(client, "alice")
    r = client.post("/concepts/nonexistent-id/buy", headers=auth(alice["token"]))
    assert r.status_code == 404


def test_buy_already_sold(client):
    alice = make_user(client, "alice")
    bob = make_user(client, "bob", "bob@test.com")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    r = client.post(f"/concepts/{c['id']}/buy", headers=auth(bob["token"]))
    assert r.status_code == 409


def test_buy_own_concept_blocked(client):
    alice = make_user(client, "alice")
    c = make_concept(client, price=50)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    client.post(f"/concepts/{c['id']}/relist", json={"price": 50}, headers=auth(alice["token"]))
    r = client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    assert r.status_code == 409


def test_buy_insufficient_funds(client):
    alice = make_user(client, "alice")
    c = make_concept(client, price=9999)
    r = client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    assert r.status_code == 402


def test_buy_transfers_coins_to_seller(client):
    alice = make_user(client, "alice")
    bob = make_user(client, "bob", "bob@test.com")
    c = make_concept(client, price=200)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    client.post(f"/concepts/{c['id']}/relist", json={"price": 200}, headers=auth(alice["token"]))
    alice_before = client.post("/auth/login", json={"email": "alice@test.com", "password": "testpass"}).json()["coins"]
    client.post(f"/concepts/{c['id']}/buy", headers=auth(bob["token"]))
    alice_after = client.post("/auth/login", json={"email": "alice@test.com", "password": "testpass"}).json()["coins"]
    assert alice_after == alice_before + 200


def test_buy_without_auth(client):
    c = make_concept(client)
    r = client.post(f"/concepts/{c['id']}/buy")
    assert r.status_code == 401


# ── save ──────────────────────────────────────────────────

def test_save_and_unsave(client):
    alice = make_user(client, "alice")
    c = make_concept(client)
    r = client.post(f"/concepts/{c['id']}/save", headers=auth(alice["token"]))
    assert r.json()["saved"] is True
    r = client.post(f"/concepts/{c['id']}/save", headers=auth(alice["token"]))
    assert r.json()["saved"] is False


def test_save_without_auth(client):
    c = make_concept(client)
    r = client.post(f"/concepts/{c['id']}/save")
    assert r.status_code == 401


def test_get_saved(client):
    alice = make_user(client, "alice")
    c = make_concept(client)
    client.post(f"/concepts/{c['id']}/save", headers=auth(alice["token"]))
    r = client.get("/users/me/saved", headers=auth(alice["token"]))
    assert r.status_code == 200
    assert any(x["id"] == c["id"] for x in r.json())


def test_get_saved_empty(client):
    alice = make_user(client, "alice")
    r = client.get("/users/me/saved", headers=auth(alice["token"]))
    assert r.status_code == 200
    assert r.json() == []


def test_get_saved_without_auth(client):
    r = client.get("/users/me/saved")
    assert r.status_code == 401


def test_saved_is_user_scoped(client):
    alice = make_user(client, "alice")
    bob = make_user(client, "bob", "bob@test.com")
    c = make_concept(client)
    client.post(f"/concepts/{c['id']}/save", headers=auth(alice["token"]))
    r = client.get("/users/me/saved", headers=auth(bob["token"]))
    assert r.json() == []


# ── purchases ─────────────────────────────────────────────

def test_get_purchases(client):
    alice = make_user(client, "alice")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    r = client.get("/users/me/purchases", headers=auth(alice["token"]))
    assert r.status_code == 200
    assert any(x["id"] == c["id"] for x in r.json())


def test_get_purchases_without_auth(client):
    r = client.get("/users/me/purchases")
    assert r.status_code == 401


def test_purchases_are_user_scoped(client):
    alice = make_user(client, "alice")
    bob = make_user(client, "bob", "bob@test.com")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    r = client.get("/users/me/purchases", headers=auth(bob["token"]))
    assert r.json() == []


# ── relist ────────────────────────────────────────────────

def test_relist_changes_price_and_listed(client):
    alice = make_user(client, "alice")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    r = client.post(f"/concepts/{c['id']}/relist", json={"price": 250}, headers=auth(alice["token"]))
    assert r.status_code == 200
    assert r.json()["price"] == 250
    assert r.json()["listed"] is True
    ids = [x["id"] for x in client.get("/concepts").json()]
    assert c["id"] in ids


def test_relist_by_nonowner(client):
    alice = make_user(client, "alice")
    bob = make_user(client, "bob", "bob@test.com")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    r = client.post(f"/concepts/{c['id']}/relist", json={"price": 100}, headers=auth(bob["token"]))
    assert r.status_code == 403


def test_relist_already_listed(client):
    alice = make_user(client, "alice")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    client.post(f"/concepts/{c['id']}/relist", json={"price": 100}, headers=auth(alice["token"]))
    r = client.post(f"/concepts/{c['id']}/relist", json={"price": 100}, headers=auth(alice["token"]))
    assert r.status_code == 409


def test_relist_not_found(client):
    alice = make_user(client, "alice")
    r = client.post("/concepts/nonexistent-id/relist", json={"price": 100}, headers=auth(alice["token"]))
    assert r.status_code == 404


def test_relist_without_auth(client):
    c = make_concept(client)
    r = client.post(f"/concepts/{c['id']}/relist", json={"price": 100})
    assert r.status_code == 401


# ── unlist ────────────────────────────────────────────────

def test_unlist_hides_from_listing(client):
    alice = make_user(client, "alice")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    client.post(f"/concepts/{c['id']}/relist", json={"price": 100}, headers=auth(alice["token"]))
    r = client.post(f"/concepts/{c['id']}/unlist", headers=auth(alice["token"]))
    assert r.status_code == 200
    assert r.json()["listed"] is False
    ids = [x["id"] for x in client.get("/concepts").json()]
    assert c["id"] not in ids


def test_unlist_by_nonowner(client):
    alice = make_user(client, "alice")
    bob = make_user(client, "bob", "bob@test.com")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    client.post(f"/concepts/{c['id']}/relist", json={"price": 100}, headers=auth(alice["token"]))
    r = client.post(f"/concepts/{c['id']}/unlist", headers=auth(bob["token"]))
    assert r.status_code == 403


def test_unlist_already_unlisted(client):
    alice = make_user(client, "alice")
    c = make_concept(client, price=100)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    # dopo l'acquisto listed=False — il concetto non è in vendita
    r = client.post(f"/concepts/{c['id']}/unlist", headers=auth(alice["token"]))
    assert r.status_code == 409


def test_unlist_not_found(client):
    alice = make_user(client, "alice")
    r = client.post("/concepts/nonexistent-id/unlist", headers=auth(alice["token"]))
    assert r.status_code == 404


def test_unlist_without_auth(client):
    c = make_concept(client)
    r = client.post(f"/concepts/{c['id']}/unlist")
    assert r.status_code == 401
