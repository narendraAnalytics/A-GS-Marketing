from urllib.parse import quote, urlencode

import httpx

from app.config import Settings

AUTHORIZATION_URL = "https://www.linkedin.com/oauth/v2/authorization"
TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
POSTS_URL = "https://api.linkedin.com/rest/posts"
IMAGES_URL = "https://api.linkedin.com/rest/images"

# Sign In with LinkedIn using OpenID Connect (openid, profile, email) +
# Share on LinkedIn (w_member_social) — the two self-serve products added
# in stepslinkedin.txt STEP 2. Do not add scopes here without also adding
# the corresponding product in the Developer Portal, or the authorization
# request will fail.
SCOPES = "openid profile email w_member_social"


def build_authorization_url(settings: Settings, state: str) -> str:
    params = {
        "response_type": "code",
        "client_id": settings.linkedin_client_id,
        "redirect_uri": settings.linkedin_redirect_uri,
        "scope": SCOPES,
        "state": state,
    }
    return f"{AUTHORIZATION_URL}?{urlencode(params, quote_via=quote)}"


def exchange_code_for_token(settings: Settings, code: str) -> dict:
    """Returns LinkedIn's token response: {access_token, expires_in, ...}."""
    response = httpx.post(
        TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": settings.linkedin_client_id,
            "client_secret": settings.linkedin_client_secret,
            "redirect_uri": settings.linkedin_redirect_uri,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()


def get_userinfo(access_token: str) -> dict:
    """Returns the OIDC userinfo response: {sub, name, email, picture, ...}."""
    response = httpx.get(
        USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()


def upload_image(settings: Settings, access_token: str, author_urn: str, image_bytes: bytes) -> str:
    """Uploads an image via LinkedIn's Images API (initializeUpload -> PUT
    bytes) and returns the resulting image URN (e.g. "urn:li:image:...") for
    use in a subsequent /publish call's content.media.id."""
    init_response = httpx.post(
        f"{IMAGES_URL}?action=initializeUpload",
        headers={
            "Authorization": f"Bearer {access_token}",
            "LinkedIn-Version": settings.linkedin_api_version,
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json",
        },
        json={"initializeUploadRequest": {"owner": author_urn}},
        timeout=15,
    )
    init_response.raise_for_status()
    value = init_response.json()["value"]
    upload_url = value["uploadUrl"]
    image_urn = value["image"]

    # Upload call requires the OAuth token in Authorization (unlike video
    # uploads, which don't) — per LinkedIn's Images/Assets API docs.
    upload_response = httpx.put(
        upload_url,
        headers={"Authorization": f"Bearer {access_token}"},
        content=image_bytes,
        timeout=30,
    )
    upload_response.raise_for_status()
    return image_urn


def publish_post(
    settings: Settings,
    access_token: str,
    author_urn: str,
    commentary: str,
    image_urn: str | None = None,
) -> str:
    """Publishes a post (optionally with an image) as the given author.
    Returns the new post's URN."""
    body = {
        "author": author_urn,
        "commentary": commentary,
        "visibility": "PUBLIC",
        "distribution": {"feedDistribution": "MAIN_FEED"},
        "lifecycleState": "PUBLISHED",
    }
    if image_urn:
        body["content"] = {"media": {"id": image_urn}}

    response = httpx.post(
        POSTS_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
            "LinkedIn-Version": settings.linkedin_api_version,
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=15,
    )
    response.raise_for_status()
    return response.headers.get("x-restli-id", "")
