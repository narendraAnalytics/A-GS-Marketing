from app.models import PostDraft


class DraftStore:
    """In-memory draft store for the POC. Single-process only — no
    persistence across restarts (see phase1.txt: deferred to a later phase)."""

    def __init__(self):
        self._drafts: dict[str, PostDraft] = {}

    def save(self, draft: PostDraft) -> None:
        self._drafts[draft.draft_id] = draft

    def get(self, draft_id: str) -> PostDraft | None:
        return self._drafts.get(draft_id)


_store = DraftStore()


def get_store() -> DraftStore:
    return _store
