from .conftest import make_user, make_concept, auth


def _setup_listed_concept(client, price=100):
    """alice buys and relists a concept; returns (alice, bob, concept_id)."""
    alice = make_user(client, "alice")
    bob   = make_user(client, "bob", "bob@test.com")
    c = make_concept(client, price=price)
    client.post(f"/concepts/{c['id']}/buy", headers=auth(alice["token"]))
    client.post(f"/concepts/{c['id']}/relist", json={"price": price}, headers=auth(alice["token"]))
    return alice, bob, c["id"]


# ── make offer ────────────────────────────────────────────

def test_make_offer(client):
    alice, bob, cid = _setup_listed_concept(client, price=100)
    r = client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    assert r.status_code == 201
    data = r.json()
    assert data["amount"] == 80
    assert data["buyer_username"] == "bob"
    assert data["message"] is None
    assert data["status"] == "pending"


def test_make_offer_with_message(client):
    alice, bob, cid = _setup_listed_concept(client)
    r = client.post(f"/concepts/{cid}/offer", json={"amount": 80, "message": "lo voglio davvero"}, headers=auth(bob["token"]))
    assert r.status_code == 201
    assert r.json()["message"] == "lo voglio davvero"


def test_make_offer_response_includes_seller_username(client):
    alice, bob, cid = _setup_listed_concept(client)
    r = client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    assert r.json()["seller_username"] == "alice"


def test_duplicate_offer_blocked(client):
    alice, bob, cid = _setup_listed_concept(client)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    r = client.post(f"/concepts/{cid}/offer", json={"amount": 90}, headers=auth(bob["token"]))
    assert r.status_code == 409


def test_offer_on_own_concept_blocked(client):
    alice, bob, cid = _setup_listed_concept(client)
    r = client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(alice["token"]))
    assert r.status_code == 409


def test_offer_on_nonexistent_concept(client):
    alice = make_user(client, "alice")
    r = client.post("/concepts/nonexistent-id/offer", json={"amount": 80}, headers=auth(alice["token"]))
    assert r.status_code == 404


def test_offer_on_concept_without_owner(client):
    """Concetto non ancora acquistato da nessuno — non ha un proprietario."""
    alice = make_user(client, "alice")
    c = make_concept(client)
    r = client.post(f"/concepts/{c['id']}/offer", json={"amount": 80}, headers=auth(alice["token"]))
    assert r.status_code == 409


def test_offer_on_unlisted_concept_allowed(client):
    """L'offerta è verso il proprietario, non il marketplace — ok anche se sold=True."""
    alice, bob, cid = _setup_listed_concept(client)
    client.post(f"/concepts/{cid}/unlist", headers=auth(alice["token"]))
    r = client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    assert r.status_code == 201


def test_make_offer_without_auth(client):
    alice, bob, cid = _setup_listed_concept(client)
    r = client.post(f"/concepts/{cid}/offer", json={"amount": 80})
    assert r.status_code == 401


def test_multiple_buyers_can_offer_on_same_concept(client):
    alice, bob, cid = _setup_listed_concept(client)
    charlie = make_user(client, "charlie", "charlie@test.com")
    r1 = client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    r2 = client.post(f"/concepts/{cid}/offer", json={"amount": 90}, headers=auth(charlie["token"]))
    assert r1.status_code == 201
    assert r2.status_code == 201


# ── received offers ───────────────────────────────────────

def test_received_offers(client):
    alice, bob, cid = _setup_listed_concept(client)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    r = client.get("/users/me/offers/received", headers=auth(alice["token"]))
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["buyer_username"] == "bob"


def test_received_offers_only_shows_pending(client):
    alice, bob, cid = _setup_listed_concept(client)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]
    client.post(f"/offers/{offer_id}/reject", headers=auth(alice["token"]))
    r = client.get("/users/me/offers/received", headers=auth(alice["token"]))
    assert r.json() == []


def test_received_offers_without_auth(client):
    r = client.get("/users/me/offers/received")
    assert r.status_code == 401


# ── accept ────────────────────────────────────────────────

def test_accept_offer_transfers_coins(client):
    alice, bob, cid = _setup_listed_concept(client, price=100)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]

    alice_before = client.post("/auth/login", json={"email": "alice@test.com", "password": "testpass"}).json()["coins"]
    bob_before   = client.post("/auth/login", json={"email": "bob@test.com",   "password": "testpass"}).json()["coins"]

    r = client.post(f"/offers/{offer_id}/accept", headers=auth(alice["token"]))
    assert r.status_code == 200
    assert r.json()["coins"] == alice_before + 80

    bob_after = client.post("/auth/login", json={"email": "bob@test.com", "password": "testpass"}).json()["coins"]
    assert bob_after == bob_before - 80


def test_accept_offer_changes_ownership(client):
    alice, bob, cid = _setup_listed_concept(client, price=100)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]
    client.post(f"/offers/{offer_id}/accept", headers=auth(alice["token"]))
    purchases = client.get("/users/me/purchases", headers=auth(bob["token"])).json()
    assert any(c["id"] == cid for c in purchases)


def test_accept_rejects_other_pending_offers(client):
    alice, bob, cid = _setup_listed_concept(client, price=100)
    charlie = make_user(client, "charlie", "charlie@test.com")
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    client.post(f"/concepts/{cid}/offer", json={"amount": 90}, headers=auth(charlie["token"]))

    offers = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()
    bob_offer = next(o for o in offers if o["buyer_username"] == "bob")
    client.post(f"/offers/{bob_offer['id']}/accept", headers=auth(alice["token"]))

    remaining = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()
    assert len(remaining) == 0


def test_accept_offer_buyer_insufficient_coins(client):
    alice, bob, cid = _setup_listed_concept(client, price=100)
    # bob fa un'offerta enorme che non può permettersi
    # (hackiamo il test usando un prezzo basso per l'offerta ma rendendo bob povero)
    charlie = make_user(client, "charlie", "charlie@test.com")
    c2 = make_concept(client, price=900)
    # bob spende quasi tutto comprando c2 direttamente
    client.post(f"/concepts/{c2['id']}/buy", headers=auth(bob["token"]))
    # ora bob ha circa 100cc — fa un'offerta da 150
    r_offer = client.post(f"/concepts/{cid}/offer", json={"amount": 150}, headers=auth(bob["token"]))
    assert r_offer.status_code == 201
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]
    r = client.post(f"/offers/{offer_id}/accept", headers=auth(alice["token"]))
    assert r.status_code == 402


def test_accept_offer_seller_no_longer_owns_concept(client):
    """alice vende il concetto direttamente a charlie mentre c'è ancora un'offerta di bob pendente."""
    alice, bob, cid = _setup_listed_concept(client, price=100)
    charlie = make_user(client, "charlie", "charlie@test.com")
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]
    # charlie compra direttamente al prezzo di listino
    client.post(f"/concepts/{cid}/buy", headers=auth(charlie["token"]))
    # alice prova ad accettare l'offerta di bob ma non possiede più il concetto
    r = client.post(f"/offers/{offer_id}/accept", headers=auth(alice["token"]))
    assert r.status_code == 409


def test_accept_already_resolved_offer(client):
    alice, bob, cid = _setup_listed_concept(client)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]
    client.post(f"/offers/{offer_id}/reject", headers=auth(alice["token"]))
    r = client.post(f"/offers/{offer_id}/accept", headers=auth(alice["token"]))
    assert r.status_code == 409


def test_accept_offer_not_found(client):
    alice = make_user(client, "alice")
    r = client.post("/offers/nonexistent-id/accept", headers=auth(alice["token"]))
    assert r.status_code == 404


def test_accept_offer_by_non_seller(client):
    alice, bob, cid = _setup_listed_concept(client)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]
    r = client.post(f"/offers/{offer_id}/accept", headers=auth(bob["token"]))
    assert r.status_code == 403


def test_accept_without_auth(client):
    r = client.post("/offers/some-id/accept")
    assert r.status_code == 401


# ── reject ────────────────────────────────────────────────

def test_reject_offer(client):
    alice, bob, cid = _setup_listed_concept(client)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]
    r = client.post(f"/offers/{offer_id}/reject", headers=auth(alice["token"]))
    assert r.status_code == 200
    remaining = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()
    assert len(remaining) == 0


def test_reject_by_non_seller_blocked(client):
    alice, bob, cid = _setup_listed_concept(client)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]
    r = client.post(f"/offers/{offer_id}/reject", headers=auth(bob["token"]))
    assert r.status_code == 403


def test_reject_offer_with_message(client):
    alice, bob, cid = _setup_listed_concept(client)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]
    r = client.post(f"/offers/{offer_id}/reject", json={"message": "non fa per me"}, headers=auth(alice["token"]))
    assert r.status_code == 200
    sent = client.get("/users/me/offers/sent", headers=auth(bob["token"])).json()
    assert sent[0]["reject_message"] == "non fa per me"
    assert sent[0]["status"] == "rejected"


def test_reject_already_resolved_offer(client):
    alice, bob, cid = _setup_listed_concept(client)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]
    client.post(f"/offers/{offer_id}/reject", headers=auth(alice["token"]))
    r = client.post(f"/offers/{offer_id}/reject", headers=auth(alice["token"]))
    assert r.status_code == 409


def test_reject_offer_not_found(client):
    alice = make_user(client, "alice")
    r = client.post("/offers/nonexistent-id/reject", headers=auth(alice["token"]))
    assert r.status_code == 404


def test_reject_without_auth(client):
    r = client.post("/offers/some-id/reject")
    assert r.status_code == 401


# ── sent offers ───────────────────────────────────────────

def test_sent_offers_after_accept(client):
    alice, bob, cid = _setup_listed_concept(client, price=100)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]
    client.post(f"/offers/{offer_id}/accept", headers=auth(alice["token"]))
    sent = client.get("/users/me/offers/sent", headers=auth(bob["token"])).json()
    assert len(sent) == 1
    o = sent[0]
    assert o["status"] == "accepted"
    assert o["seller_username"] == "alice"
    assert o["reject_message"] is None
    assert o["resolved_at"] is not None


def test_sent_offers_after_reject(client):
    alice, bob, cid = _setup_listed_concept(client)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    offer_id = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()[0]["id"]
    client.post(f"/offers/{offer_id}/reject", json={"message": "troppo bassa"}, headers=auth(alice["token"]))
    sent = client.get("/users/me/offers/sent", headers=auth(bob["token"])).json()
    assert len(sent) == 1
    o = sent[0]
    assert o["status"] == "rejected"
    assert o["seller_username"] == "alice"
    assert o["reject_message"] == "troppo bassa"
    assert o["resolved_at"] is not None


def test_sent_offers_excludes_pending(client):
    alice, bob, cid = _setup_listed_concept(client)
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    sent = client.get("/users/me/offers/sent", headers=auth(bob["token"])).json()
    assert sent == []


def test_auto_rejected_offers_appear_in_sent(client):
    alice, bob, cid = _setup_listed_concept(client, price=100)
    charlie = make_user(client, "charlie", "charlie@test.com")
    client.post(f"/concepts/{cid}/offer", json={"amount": 80}, headers=auth(bob["token"]))
    client.post(f"/concepts/{cid}/offer", json={"amount": 90}, headers=auth(charlie["token"]))
    offers = client.get("/users/me/offers/received", headers=auth(alice["token"])).json()
    bob_offer = next(o for o in offers if o["buyer_username"] == "bob")
    client.post(f"/offers/{bob_offer['id']}/accept", headers=auth(alice["token"]))
    charlie_sent = client.get("/users/me/offers/sent", headers=auth(charlie["token"])).json()
    assert len(charlie_sent) == 1
    assert charlie_sent[0]["status"] == "rejected"


def test_sent_offers_without_auth(client):
    r = client.get("/users/me/offers/sent")
    assert r.status_code == 401
