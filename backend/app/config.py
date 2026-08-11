from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# .env loading into os.environ itself happens in app/__init__.py, which runs
# before this module (or any app submodule) can be imported.


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str
    gemini_model: str = "gemini-flash-latest"
    # Comma-separated list, e.g. "http://localhost:3000,https://ags-marketing.vercel.app"
    cors_allowed_origins: str = "http://localhost:3000"

    # Where the LinkedIn OAuth callback redirects the browser back to once
    # the connect/publish flow finishes (success or failure).
    frontend_url: str = "http://localhost:3000"

    # Empty defaults (not required str) so the app still starts and Phase 1/2
    # features work even before LinkedIn is configured. Endpoints that need
    # these check for them explicitly and return 503 if unset.
    linkedin_client_id: str = ""
    linkedin_client_secret: str = ""
    linkedin_redirect_uri: str = ""
    # YYYYMM — LinkedIn deprecates versions ~12 months out, bump periodically.
    linkedin_api_version: str = "202606"

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    @property
    def linkedin_configured(self) -> bool:
        return bool(self.linkedin_client_id and self.linkedin_client_secret and self.linkedin_redirect_uri)


@lru_cache
def get_settings() -> Settings:
    return Settings()
