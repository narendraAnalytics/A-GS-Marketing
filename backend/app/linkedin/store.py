import secrets
import time
from typing import TypedDict

STATE_TTL_SECONDS = 600  # 10 minutes — plenty for a user to complete the LinkedIn consent screen


class LinkedInConnection(TypedDict):
    access_token: str
    expires_at: float  # unix timestamp
    author_urn: str
    name: str


class LinkedInStore:
    """In-memory OAuth state + connection store for the POC.

    Single-process, single-connection (no multi-user support — matches the
    rest of the app's no-auth design). Does NOT survive restarts/redeploys,
    unlike a real credential store. See stepslinkedin.txt and CLAUDE.md:
    deliberately not reusing DraftStore's pattern uncritically here, since
    losing this means the user must re-authorize with LinkedIn (not just
    regenerate a draft) — flagged as a known limitation, not an oversight.
    """

    def __init__(self):
        self._pending_states: dict[str, float] = {}
        self._connection: LinkedInConnection | None = None

    def create_state(self) -> str:
        self._prune_expired_states()
        token = secrets.token_urlsafe(24)
        self._pending_states[token] = time.time() + STATE_TTL_SECONDS
        return token

    def consume_state(self, token: str) -> bool:
        """Returns True and invalidates the token if it was valid and unexpired."""
        self._prune_expired_states()
        expiry = self._pending_states.pop(token, None)
        return expiry is not None

    def _prune_expired_states(self) -> None:
        now = time.time()
        expired = [token for token, expiry in self._pending_states.items() if expiry < now]
        for token in expired:
            del self._pending_states[token]

    def save_connection(self, connection: LinkedInConnection) -> None:
        self._connection = connection

    def get_connection(self) -> LinkedInConnection | None:
        if self._connection and self._connection["expires_at"] < time.time():
            self._connection = None  # expired access token, treat as disconnected
        return self._connection


_store = LinkedInStore()


def get_linkedin_store() -> LinkedInStore:
    return _store
