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


class ImageStore:
    """In-memory store for a draft's attached image bytes, pending publish.

    Deliberately not a field on PostDraft — keeps API responses JSON-only
    (see has_image on PostDraft) instead of embedding binary data. The image
    is only actually uploaded to LinkedIn at /publish time, since that's the
    first point an access token + author URN are guaranteed to exist.
    """

    def __init__(self):
        self._images: dict[str, tuple[bytes, str]] = {}  # draft_id -> (content, content_type)

    def save(self, draft_id: str, content: bytes, content_type: str) -> None:
        self._images[draft_id] = (content, content_type)

    def get(self, draft_id: str) -> tuple[bytes, str] | None:
        return self._images.get(draft_id)

    def delete(self, draft_id: str) -> None:
        self._images.pop(draft_id, None)


_image_store = ImageStore()


def get_image_store() -> ImageStore:
    return _image_store
