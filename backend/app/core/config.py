import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")


settings = Settings()
