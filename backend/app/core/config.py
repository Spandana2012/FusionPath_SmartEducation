import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./fusionpath.db")
    jwt_secret: str = os.getenv("JWT_SECRET", "")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_minutes: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "15"))
    refresh_token_days: int = int(os.getenv("REFRESH_TOKEN_DAYS", "30"))
    cookie_secure: bool = os.getenv("COOKIE_SECURE", "false").casefold() == "true"

    @property
    def cors_origins(self) -> list[str]:
        configured_origins = [origin.strip() for origin in self.frontend_url.split(",")]
        local_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
        return list(dict.fromkeys([origin for origin in [*configured_origins, *local_origins] if origin]))


settings = Settings()
