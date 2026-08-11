import uuid
from functools import lru_cache

import httpx
from fastapi import APIRouter, HTTPException, UploadFile
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
from app.store import DraftStore, get_image_store, get_store
from app.workflow.graph import build_graph

router = APIRouter(prefix="/api/marketing", tags=["marketing"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # LinkedIn's recommended limit


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


@router.post("/draft/{draft_id}/image", response_model=PostDraft)
async def upload_image(draft_id: str, file: UploadFile) -> PostDraft:
    """Attaches an image to a draft. The bytes are only held server-side
    (ImageStore) and actually sent to LinkedIn's Images API at /publish
    time, once an access token + author URN are guaranteed to exist."""
    store = get_store()
    draft = _get_draft_or_404(store, draft_id)
    if draft.status == "published":
        raise HTTPException(status_code=400, detail="cannot attach an image to an already-published draft")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400, detail=f"unsupported image type {file.content_type!r}; use JPEG, PNG, or GIF"
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="image exceeds the 5MB limit")

    get_image_store().save(draft_id, content, file.content_type)
    updated = draft.model_copy(update={"has_image": True})
    store.save(updated)
    return updated


@router.delete("/draft/{draft_id}/image", response_model=PostDraft)
def remove_image(draft_id: str) -> PostDraft:
    store = get_store()
    draft = _get_draft_or_404(store, draft_id)
    get_image_store().delete(draft_id)
    updated = draft.model_copy(update={"has_image": False})
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

    settings = get_settings()
    access_token = connection["access_token"]
    author_urn = connection["author_urn"]

    image_urn: str | None = None
    image = get_image_store().get(draft.draft_id)
    if image is not None:
        content, _content_type = image
        try:
            image_urn = linkedin_client.upload_image(settings, access_token, author_urn, content)
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502, detail=f"LinkedIn image upload failed: {exc.response.text}"
            ) from exc

    commentary = f"{draft.post_text}\n\n{draft.cta}\n\n{' '.join(draft.hashtags)}"
    try:
        post_urn = linkedin_client.publish_post(
            settings, access_token, author_urn, commentary, image_urn
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502, detail=f"LinkedIn publish failed: {exc.response.text}"
        ) from exc

    published = draft.model_copy(update={"status": "published", "post_urn": post_urn or None})
    store.save(published)
    return published
