from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Learner, User
from app.schemas.auth import AuthResponse, AuthUser, OTPRequest, OTPVerifyRequest, RefreshResponse
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
REFRESH_COOKIE = "fusionpath_refresh_token"


@router.post("/otp/request")
def request_otp(payload: OTPRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        auth_service.request_otp(db, payload.email)
    except auth_service.SMTPConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {"message": "A verification code was sent if SMTP is configured for this environment."}


@router.post("/otp/verify", response_model=AuthResponse)
def verify_otp(payload: OTPVerifyRequest, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    user, learner_id = auth_service.verify_otp(db, payload.email, payload.otp, payload.learner_id)
    access_token, expires_in = auth_service.create_access_token(user)
    refresh_token = auth_service.create_refresh_token(db, user)
    set_refresh_cookie(response, refresh_token)
    return AuthResponse(access_token=access_token, expires_in=expires_in, user=AuthUser.model_validate(user, from_attributes=True), learner_id=learner_id)


@router.post("/refresh", response_model=RefreshResponse)
def refresh(response: Response, db: Session = Depends(get_db), refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE)) -> RefreshResponse:
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh session is not available.")
    user, next_refresh, expires_in, learner_id = auth_service.rotate_refresh_token(db, refresh_token)
    access_token, _ = auth_service.create_access_token(user)
    set_refresh_cookie(response, next_refresh)
    return RefreshResponse(access_token=access_token, expires_in=expires_in, user=AuthUser.model_validate(user, from_attributes=True), learner_id=learner_id)


@router.post("/logout")
def logout(response: Response, db: Session = Depends(get_db), refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE)) -> dict[str, str]:
    auth_service.revoke_refresh_token(db, refresh_token)
    response.delete_cookie(REFRESH_COOKIE, httponly=True, secure=auth_service.settings.cookie_secure, samesite="lax")
    return {"message": "Signed out."}


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(REFRESH_COOKIE, token, httponly=True, secure=auth_service.settings.cookie_secure, samesite="lax", max_age=auth_service.settings.refresh_token_days * 86400, path="/api/auth")
