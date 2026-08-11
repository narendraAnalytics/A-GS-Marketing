import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.linkedin import client as linkedin_client
from app.linkedin.store import get_linkedin_store
from app.routers.linkedin import router as linkedin_router
from app.routers.marketing import router as marketing_router


@pytest.fixture(autouse=True)
def reset_linkedin_store():
    """The store is a module-level singleton — reset it so tests don't leak
    connection state into each other."""
    store = get_linkedin_store()
    store._connection = None
    store._pending_states = {}
    yield
    store._connection = None
    store._pending_states = {}


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(linkedin_router)
    app.include_router(marketing_router)
    return TestClient(app, follow_redirects=False)


def test_status_when_not_connected(client):
    response = client.get("/api/marketing/linkedin/status")
    assert response.status_code == 200
    assert response.json() == {"connected": False, "name": None}


def test_connect_redirects_to_linkedin_with_valid_state(client):
    response = client.get("/api/marketing/linkedin/connect")
    assert response.status_code == 307
    location = response.headers["location"]
    assert location.startswith("https://www.linkedin.com/oauth/v2/authorization?")
    assert "client_id=" in location
    assert "scope=openid+profile+email+w_member_social" in location or "scope=openid%20profile%20email%20w_member_social" in location
    # The state param must be a real, freshly-created one the store knows about.
    state = location.split("state=")[1].split("&")[0]
    assert get_linkedin_store().consume_state(state) is True


def test_callback_rejects_unknown_state(client):
    response = client.get("/api/marketing/linkedin/callback", params={"code": "abc", "state": "not-a-real-state"})
    assert response.status_code == 307
    assert "linkedin=error" in response.headers["location"]


def test_callback_rejects_linkedin_error_param(client):
    response = client.get("/api/marketing/linkedin/callback", params={"error": "access_denied", "state": "x"})
    assert response.status_code == 307
    assert "linkedin=error" in response.headers["location"]


def test_callback_success_saves_connection_and_redirects(client, monkeypatch):
    state = get_linkedin_store().create_state()

    monkeypatch.setattr(
        linkedin_client, "exchange_code_for_token", lambda settings, code: {"access_token": "fake-token", "expires_in": 5184000}
    )
    monkeypatch.setattr(
        linkedin_client, "get_userinfo", lambda access_token: {"sub": "abc123", "name": "Test Member"}
    )

    response = client.get("/api/marketing/linkedin/callback", params={"code": "real-code", "state": state})

    assert response.status_code == 307
    assert "linkedin=connected" in response.headers["location"]

    status_response = client.get("/api/marketing/linkedin/status")
    assert status_response.json() == {"connected": True, "name": "Test Member"}

    connection = get_linkedin_store().get_connection()
    assert connection["author_urn"] == "urn:li:person:abc123"


def test_callback_handles_token_exchange_failure(client, monkeypatch):
    state = get_linkedin_store().create_state()

    def raise_error(settings, code):
        raise httpx.HTTPStatusError("bad request", request=httpx.Request("POST", "http://x"), response=httpx.Response(400))

    monkeypatch.setattr(linkedin_client, "exchange_code_for_token", raise_error)

    response = client.get("/api/marketing/linkedin/callback", params={"code": "bad-code", "state": state})
    assert response.status_code == 307
    assert "linkedin=error" in response.headers["location"]


def test_publish_requires_ready_to_publish_status(client, monkeypatch):
    from app.models import PostDraft, StrategyOutput
    from app.store import get_store

    strategy = StrategyOutput(audience="a", angle="b", hook="c", key_message="d")
    draft = PostDraft(
        draft_id="draft-1", objective="obj", post_text="text", cta="cta", hashtags=["#a"], strategy=strategy, status="draft"
    )
    get_store().save(draft)

    response = client.post("/api/marketing/publish", json={"draft_id": "draft-1"})
    assert response.status_code == 400
    assert "must be approved" in response.json()["detail"]


def test_publish_requires_linkedin_connection(client):
    from app.models import PostDraft, StrategyOutput
    from app.store import get_store

    strategy = StrategyOutput(audience="a", angle="b", hook="c", key_message="d")
    draft = PostDraft(
        draft_id="draft-2",
        objective="obj",
        post_text="text",
        cta="cta",
        hashtags=["#a"],
        strategy=strategy,
        status="ready_to_publish",
    )
    get_store().save(draft)

    response = client.post("/api/marketing/publish", json={"draft_id": "draft-2"})
    assert response.status_code == 400
    assert "not connected" in response.json()["detail"]


def test_publish_success_flips_status_and_calls_linkedin(client, monkeypatch):
    from app.models import PostDraft, StrategyOutput
    from app.store import get_store

    strategy = StrategyOutput(audience="a", angle="b", hook="c", key_message="d")
    draft = PostDraft(
        draft_id="draft-3",
        objective="obj",
        post_text="text",
        cta="cta",
        hashtags=["#a"],
        strategy=strategy,
        status="ready_to_publish",
    )
    get_store().save(draft)

    get_linkedin_store().save_connection(
        {"access_token": "tok", "expires_at": 9999999999, "author_urn": "urn:li:person:xyz", "name": "Test"}
    )

    calls = []
    monkeypatch.setattr(
        linkedin_client,
        "publish_post",
        lambda settings, access_token, author_urn, commentary: calls.append((access_token, author_urn, commentary)) or "urn:li:share:1",
    )

    response = client.post("/api/marketing/publish", json={"draft_id": "draft-3"})
    assert response.status_code == 200
    assert response.json()["status"] == "published"
    assert response.json()["post_urn"] == "urn:li:share:1"
    assert calls == [("tok", "urn:li:person:xyz", "text\n\ncta\n\n#a")]
