from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


# Class for the application settings, inheriting from BaseSettings to enable environment variable support.
class Settings(BaseSettings):
    app_name: str = "Veritas AI Service"
    app_env: str = "development"
    app_debug: bool = True
    app_host: str = "127.0.0.1"
    app_port: int = 5000

    ai_service_api_key: str

    gemini_api_key: str
    gemini_model: str = "gemini-2.5-flash"

    crawler_timeout: int = 25
    article_min_length: int = 200
    article_max_chars: int = 12000

    evidence_max_claims: int = 3
    evidence_results_per_claim: int = 4
    evidence_fetch_timeout: int = 20

    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Create a singleton-style settings instance by caching the environment-backed configuration.
@lru_cache
def get_settings() -> Settings:
    return Settings()