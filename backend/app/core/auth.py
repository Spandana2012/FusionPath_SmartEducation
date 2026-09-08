from fastapi import Cookie, Depends
from sqlalchemy.orm import Session as DatabaseSession

from app.core.config import settings
from app.core.database import get_db
from app.models import User
from app.services.auth_service import get_user_for_session


def current_user(session_token: str | None = Cookie(default=None, alias=settings.session_cookie_name), db: DatabaseSession = Depends(get_db)) -> User:
    return get_user_for_session(db, session_token)


def optional_user(session_token: str | None = Cookie(default=None, alias=settings.session_cookie_name), db: DatabaseSession = Depends(get_db)) -> User | None:
    if not session_token:
        return None
    return get_user_for_session(db, session_token)
