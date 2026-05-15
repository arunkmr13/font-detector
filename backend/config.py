from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_env: str = "development"
    secret_key: str = "dev-secret-change-in-production"
    allowed_origins: str = "http://localhost:3000"
    database_url: str = "postgresql://fontuser:fontpass@localhost:5432/fontdetector"
    redis_url: str = "redis://localhost:6379/0"
    gemini_api_key: str = ""
    free_tier_daily_limit: int = 10
    pro_tier_daily_limit: int = 500

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()
