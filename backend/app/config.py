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

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
