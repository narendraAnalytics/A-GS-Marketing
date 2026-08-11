import uuid
from functools import lru_cache

import httpx
from fastapi import APIRouter, HTTPException
from langgraph.graph.state import CompiledStateGraph

from app.config import get_settings
from app.linkedin import client as linkedin_client
from app.linkedin.store import get_linkedin_store
from app.llm.gemini_provider import GeminiProvider
from app.models import (
    ApproveRequest,
    GenerateRequest,
    PostDraft,
    PublishRequest,
    RegenerateRequest,
    UpdateDraftRequest,
)
from app.store import DraftStore, get_store
from app.workflow.graph import build_graph

router = APIRouter(prefix="/api/marketing", tags=["marketing"])


@lru_cache
def get_graph() -> CompiledStateGraph:
    provider = GeminiProvider(get_settings())
    return build_graph(provider)


def _run_graph(objective: str, draft_id: str) -> PostDraft:
    graph = get_graph()
    config = {"configurable": {"thread_id": draft_id}}
    result = graph.invoke(
        {"objective": objective, "strategy": None, "content": None}, config=config
    )
    content = result["content"]
    strategy = result["strategy"]
    return PostDraft(
        draft_id=draft_id,
        objective=objective,
        post_text=content.post_text,
        cta=content.cta,
        hashtags=content.hashtags,
        strategy=strategy,
        status="draft",
    )


def _get_draft_or_404(store: DraftStore, draft_id: str) -> PostDraft:
    draft = store.get(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail=f"draft {draft_id!r} not found")
    return draft


@router.post("/generate", response_model=PostDraft)
def generate(request: GenerateRequest) -> PostDraft:
    store = get_store()
    draft_id = str(uuid.uuid4())
    draft = _run_graph(request.objective, draft_id)
    store.save(draft)
    return draft


@router.post("/regenerate", response_model=PostDraft)
def regenerate(request: RegenerateRequest) -> PostDraft:
    store = get_store()
    existing = _get_draft_or_404(store, request.draft_id)
    draft = _run_graph(existing.objective, existing.draft_id)
    store.save(draft)
    return draft


@router.post("/approve", response_model=PostDraft)
def approve(request: ApproveRequest) -> PostDraft:
    store = get_store()
    draft = _get_draft_or_404(store, request.draft_id)
    approved = draft.model_copy(update={"status": "ready_to_publish"})
    store.save(approved)
    return approved


@router.get("/draft/{draft_id}", response_model=PostDraft)
def get_draft(draft_id: str) -> PostDraft:
    store = get_store()
    return _get_draft_or_404(store, draft_id)


@router.patch("/draft/{draft_id}", response_model=PostDraft)
def update_draft(draft_id: str, request: UpdateDraftRequest) -> PostDraft:
    """Auto-save target for the frontend's editable post_text/cta fields —
    keeps the server copy in sync so /approve and /publish send the text the
    user actually saw, not the original AI-generated draft."""
    store = get_store()
    draft = _get_draft_or_404(store, draft_id)
    if draft.status == "published":
        raise HTTPException(status_code=400, detail="cannot edit a draft that has already been published")

    updates = request.model_dump(exclude_unset=True, exclude_none=True)
    if not updates:
        return draft

    updated = draft.model_copy(update=updates)
    store.save(updated)
    return updated


@router.post("/publish", response_model=PostDraft)
def publish(request: PublishRequest) -> PostDraft:
    store = get_store()
    draft = _get_draft_or_404(store, request.draft_id)

    if draft.status != "ready_to_publish":
        raise HTTPException(
            status_code=400,
            detail=f"draft {draft.draft_id!r} must be approved (ready_to_publish) before publishing, "
            f"current status is {draft.status!r}",
        )

    connection = get_linkedin_store().get_connection()
    if connection is None:
        raise HTTPException(
            status_code=400,
            detail="LinkedIn is not connected. Visit /api/marketing/linkedin/connect first.",
        )

    commentary = f"{draft.post_text}\n\n{draft.cta}\n\n{' '.join(draft.hashtags)}"
    try:
        post_urn = linkedin_client.publish_post(
            get_settings(), connection["access_token"], connection["author_urn"], commentary
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502, detail=f"LinkedIn publish failed: {exc.response.text}"
        ) from exc

    published = draft.model_copy(update={"status": "published", "post_urn": post_urn or None})
    store.save(published)
    return published
