from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# .env loading into os.environ itself happens in app/__init__.py, which runs
# before this module (or any app submodule) can be imported.


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str
    gemini_model: str = "gemini-flash-latest"


@lru_cache
def get_settings() -> Settings:
    return Settings()
