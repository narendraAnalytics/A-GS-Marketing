import uuid
from functools import lru_cache

from fastapi import APIRouter, HTTPException
from langgraph.graph.state import CompiledStateGraph

from app.config import get_settings
from app.llm.gemini_provider import GeminiProvider
from app.models import ApproveRequest, GenerateRequest, PostDraft, RegenerateRequest
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
