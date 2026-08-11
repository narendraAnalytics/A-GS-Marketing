import time

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from app.config import Settings, get_settings
from app.linkedin import client as linkedin_client
from app.linkedin.store import get_linkedin_store
from app.models import LinkedInStatus

router = APIRouter(prefix="/api/marketing/linkedin", tags=["linkedin"])


def _require_linkedin_configured() -> Settings:
    settings = get_settings()
    if not settings.linkedin_configured:
        raise HTTPException(
            status_code=503,
            detail="LinkedIn integration is not configured on this server "
            "(missing LINKEDIN_CLIENT_ID/SECRET/REDIRECT_URI).",
        )
    return settings


@router.get("/connect")
def connect() -> RedirectResponse:
    """Full-page redirect target — the frontend navigates here directly,
    not via fetch, since the browser needs to actually land on LinkedIn's
    consent screen."""
    settings = _require_linkedin_configured()
    state = get_linkedin_store().create_state()
    return RedirectResponse(linkedin_client.build_authorization_url(settings, state))


@router.get("/callback")
def callback(code: str | None = None, state: str | None = None, error: str | None = None) -> RedirectResponse:
    settings = _require_linkedin_configured()
    frontend_url = settings.frontend_url

    if error or not code or not state:
        return RedirectResponse(f"{frontend_url}/?linkedin=error")

    if not get_linkedin_store().consume_state(state):
        # Missing, already-used, or expired state — reject rather than
        # proceed, this is the CSRF check.
        return RedirectResponse(f"{frontend_url}/?linkedin=error")

    try:
        token_data = linkedin_client.exchange_code_for_token(settings, code)
        access_token = token_data["access_token"]
        expires_in = token_data.get("expires_in", 0)
        userinfo = linkedin_client.get_userinfo(access_token)
        author_urn = f"urn:li:person:{userinfo['sub']}"
        name = userinfo.get("name", "LinkedIn member")
    except (httpx.HTTPError, KeyError):
        return RedirectResponse(f"{frontend_url}/?linkedin=error")

    get_linkedin_store().save_connection(
        {
            "access_token": access_token,
            "expires_at": time.time() + expires_in,
            "author_urn": author_urn,
            "name": name,
        }
    )
    return RedirectResponse(f"{frontend_url}/?linkedin=connected")


@router.get("/status", response_model=LinkedInStatus)
def status() -> LinkedInStatus:
    connection = get_linkedin_store().get_connection()
    if connection is None:
        return LinkedInStatus(connected=False)
    return LinkedInStatus(connected=True, name=connection["name"])
