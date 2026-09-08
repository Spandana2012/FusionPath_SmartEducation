from fastapi import APIRouter, Cookie, Depends, Response
from sqlalchemy.orm import Session as DatabaseSession

from app.core.auth import current_user
from app.core.config import settings
from app.core.database import get_db
from app.models import User
from app.schemas.auth import AuthResponse, AuthUser, LoginRequest, SignupRequest
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(payload: SignupRequest, response: Response, db: DatabaseSession = Depends(get_db)) -> AuthResponse:
    user, learner_id = auth_service.signup(db, payload.name, payload.email, payload.phone, payload.password, payload.learner_id)
    return issue_session(response, db, user, learner_id)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: DatabaseSession = Depends(get_db)) -> AuthResponse:
    user, learner_id = auth_service.login(db, payload.email, payload.password, payload.learner_id)
    return issue_session(response, db, user, learner_id)


@router.get("/me", response_model=AuthResponse)
def me(user: User = Depends(current_user), db: DatabaseSession = Depends(get_db)) -> AuthResponse:
    learner_id, domain = auth_service.linked_context(db, user)
    return AuthResponse(user=AuthUser.model_validate(user, from_attributes=True), learner_id=learner_id, domain=domain)


@router.post("/logout")
def logout(response: Response, db: DatabaseSession = Depends(get_db), session_token: str | None = Cookie(default=None, alias=settings.session_cookie_name)) -> dict[str, str]:
    auth_service.revoke_session(db, session_token)
    response.delete_cookie(settings.session_cookie_name, httponly=True, secure=settings.session_cookie_secure, samesite="lax", path="/")
    return {"message": "Signed out."}


def issue_session(response: Response, db: DatabaseSession, user: User, learner_id: str | None) -> AuthResponse:
    session_token, _ = auth_service.create_session(db, user)
    response.set_cookie(settings.session_cookie_name, session_token, httponly=True, secure=settings.session_cookie_secure, samesite="lax", max_age=settings.session_expire_days * 86400, path="/")
    _, domain = auth_service.linked_context(db, user)
    return AuthResponse(user=AuthUser.model_validate(user, from_attributes=True), learner_id=learner_id, domain=domain)
