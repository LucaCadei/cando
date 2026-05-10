"""
Test per la funzionalità di follow.

Copre:
  - follow base (toggle on/off)
  - autofollow bloccato
  - follow utente inesistente
  - senza autenticazione
  - notifiche follow (creazione, deduplicazione, is_mutual, seen)
  - profilo pubblico aggiornato con followers_count/following_count/is_following
"""

import pytest
from fastapi.testclient import TestClient
from tests.conftest import make_user, auth


# ── follow / unfollow ──────────────────────────────────────

def test_follow_creates_relationship(client: TestClient):
    a = make_user(client, "alice")
    b = make_user(client, "bob")
    r = client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))
    assert r.status_code == 200
    assert r.json()["following"] is True

def test_unfollow_removes_relationship(client: TestClient):
    a = make_user(client, "alice")
    b = make_user(client, "bob")
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))
    r = client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))
    assert r.json()["following"] is False

def test_follow_toggle_idempotent(client: TestClient):
    """Follow → unfollow → follow deve produrre following=True alla fine."""
    a = make_user(client, "alice")
    b = make_user(client, "bob")
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))
    r = client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))
    assert r.json()["following"] is True

def test_cannot_follow_self(client: TestClient):
    a = make_user(client, "alice")
    r = client.post(f"/users/{a['user_id']}/follow", headers=auth(a["token"]))
    assert r.status_code == 409

def test_follow_nonexistent_user_returns_404(client: TestClient):
    a = make_user(client, "alice")
    r = client.post("/users/nonexistent-id/follow", headers=auth(a["token"]))
    assert r.status_code == 404

def test_follow_without_auth_returns_401(client: TestClient):
    b = make_user(client, "bob")
    r = client.post(f"/users/{b['user_id']}/follow")
    assert r.status_code == 401


# ── notifiche follow ───────────────────────────────────────

def test_follow_creates_notification_for_followed(client: TestClient):
    a = make_user(client, "alice")
    b = make_user(client, "bob")
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))

    r = client.get("/users/me/follow-notifs", headers=auth(b["token"]))
    assert r.status_code == 200
    notifs = r.json()
    assert len(notifs) == 1
    assert notifs[0]["from_username"] == "alice"
    assert notifs[0]["is_mutual"] is False

def test_follow_notif_not_duplicated_while_unseen(client: TestClient):
    """Unfollow e re-follow non devono creare una seconda notifica se la prima è ancora non vista."""
    a = make_user(client, "alice")
    b = make_user(client, "bob")
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))   # follow
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))   # unfollow
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))   # follow di nuovo

    r = client.get("/users/me/follow-notifs", headers=auth(b["token"]))
    assert len(r.json()) == 1

def test_follow_notif_recreated_after_seen(client: TestClient):
    """Dopo che la notifica è marcata come vista, un nuovo follow crea una nuova notifica."""
    a = make_user(client, "alice")
    b = make_user(client, "bob")
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))
    client.post("/users/me/follow-notifs/seen", headers=auth(b["token"]))   # vista
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))  # unfollow
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))  # re-follow

    r = client.get("/users/me/follow-notifs", headers=auth(b["token"]))
    assert len(r.json()) == 1

def test_unfollow_does_not_create_notification(client: TestClient):
    """Smettere di seguire non genera notifiche."""
    a = make_user(client, "alice")
    b = make_user(client, "bob")
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))
    client.post("/users/me/follow-notifs/seen", headers=auth(b["token"]))
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))  # unfollow

    r = client.get("/users/me/follow-notifs", headers=auth(b["token"]))
    assert len(r.json()) == 0

def test_follow_notif_is_mutual_when_following_back(client: TestClient):
    """is_mutual=True se il followed già segue il follower."""
    a = make_user(client, "alice")
    b = make_user(client, "bob")
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))  # A→B
    client.post(f"/users/{a['user_id']}/follow", headers=auth(b["token"]))  # B→A (follow back)

    # La notifica che B ha per il follow di A deve ora mostrare is_mutual=True
    r = client.get("/users/me/follow-notifs", headers=auth(b["token"]))
    assert r.json()[0]["is_mutual"] is True

def test_mark_follow_notifs_seen_clears_badge(client: TestClient):
    a = make_user(client, "alice")
    b = make_user(client, "bob")
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))

    r = client.post("/users/me/follow-notifs/seen", headers=auth(b["token"]))
    assert r.status_code == 200

    r = client.get("/users/me/follow-notifs", headers=auth(b["token"]))
    assert r.json() == []

def test_follow_notifs_without_auth_returns_401(client: TestClient):
    r = client.get("/users/me/follow-notifs")
    assert r.status_code == 401

def test_follower_does_not_receive_own_notif(client: TestClient):
    """Chi fa il follow non deve ricevere la notifica — è solo per chi viene seguito."""
    a = make_user(client, "alice")
    b = make_user(client, "bob")
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))

    r = client.get("/users/me/follow-notifs", headers=auth(a["token"]))
    assert r.json() == []


# ── profilo pubblico aggiornato ────────────────────────────

def test_profile_includes_follow_counts(client: TestClient):
    a = make_user(client, "alice")
    b = make_user(client, "bob")
    c = make_user(client, "carol")
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))
    client.post(f"/users/{b['user_id']}/follow", headers=auth(c["token"]))
    client.post(f"/users/{a['user_id']}/follow", headers=auth(b["token"]))

    r = client.get(f"/users/{b['user_id']}/profile")
    data = r.json()
    assert data["followers_count"] == 2   # A e C seguono B
    assert data["following_count"] == 1   # B segue A

def test_profile_is_following_true_when_following(client: TestClient):
    a = make_user(client, "alice")
    b = make_user(client, "bob")
    client.post(f"/users/{b['user_id']}/follow", headers=auth(a["token"]))

    r = client.get(f"/users/{b['user_id']}/profile", headers=auth(a["token"]))
    assert r.json()["is_following"] is True

def test_profile_is_following_false_when_not_following(client: TestClient):
    a = make_user(client, "alice")
    b = make_user(client, "bob")

    r = client.get(f"/users/{b['user_id']}/profile", headers=auth(a["token"]))
    assert r.json()["is_following"] is False

def test_profile_is_following_false_for_own_profile(client: TestClient):
    """is_following dev'essere False quando guardi il tuo stesso profilo."""
    a = make_user(client, "alice")
    r = client.get(f"/users/{a['user_id']}/profile", headers=auth(a["token"]))
    assert r.json()["is_following"] is False

def test_profile_is_following_false_without_auth(client: TestClient):
    b = make_user(client, "bob")
    r = client.get(f"/users/{b['user_id']}/profile")
    assert r.json()["is_following"] is False

def test_profile_counts_zero_by_default(client: TestClient):
    a = make_user(client, "alice")
    r = client.get(f"/users/{a['user_id']}/profile")
    data = r.json()
    assert data["followers_count"] == 0
    assert data["following_count"] == 0
