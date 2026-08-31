import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    @property
    def cors_origins(self) -> list[str]:
        configured_origins = [origin.strip() for origin in self.frontend_url.split(",")]
        local_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
        return list(dict.fromkeys([origin for origin in [*configured_origins, *local_origins] if origin]))


settings = Settings()
