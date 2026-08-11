import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import marketing
from app.workflow.graph import build_graph


@pytest.fixture
def client(fake_llm, monkeypatch):
    fake_graph = build_graph(fake_llm)
    monkeypatch.setattr(marketing, "get_graph", lambda: fake_graph)

    app = FastAPI()
    app.include_router(marketing.router)
    return TestClient(app)


def test_generate_creates_draft(client):
    response = client.post(
        "/api/marketing/generate",
        json={"objective": "Announce our AI security proxy guardrails."},
    )

    assert response.status_code == 200
    draft = response.json()
    assert draft["status"] == "draft"
    assert draft["hashtags"] == ["#AITRiSM", "#LLMGateway", "#AGS"]
    assert draft["objective"] == "Announce our AI security proxy guardrails."


def test_get_draft_round_trips(client):
    draft = client.post("/api/marketing/generate", json={"objective": "test"}).json()

    response = client.get(f"/api/marketing/draft/{draft['draft_id']}")

    assert response.status_code == 200
    assert response.json() == draft


def test_get_unknown_draft_returns_404(client):
    response = client.get("/api/marketing/draft/does-not-exist")

    assert response.status_code == 404


def test_regenerate_keeps_draft_id(client):
    draft = client.post("/api/marketing/generate", json={"objective": "test"}).json()

    response = client.post("/api/marketing/regenerate", json={"draft_id": draft["draft_id"]})

    assert response.status_code == 200
    assert response.json()["draft_id"] == draft["draft_id"]


def test_regenerate_unknown_draft_returns_404(client):
    response = client.post("/api/marketing/regenerate", json={"draft_id": "does-not-exist"})

    assert response.status_code == 404


def test_approve_flips_status(client):
    draft = client.post("/api/marketing/generate", json={"objective": "test"}).json()
    assert draft["status"] == "draft"

    response = client.post("/api/marketing/approve", json={"draft_id": draft["draft_id"]})

    assert response.status_code == 200
    assert response.json()["status"] == "ready_to_publish"


def test_approve_unknown_draft_returns_404(client):
    response = client.post("/api/marketing/approve", json={"draft_id": "does-not-exist"})

    assert response.status_code == 404
