from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Learner, RefreshToken, User

SCRYPT_N = 16_384
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 64


def signup(db: Session, name: str, email: str, phone: str, password: str, learner_id: str | None = None) -> tuple[User, str | None]:
    normalized_email = normalize_email(email)
    if db.scalar(select(User).where(User.email == normalized_email)) is not None:
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    user = User(
        name=name.strip(),
        email=normalized_email,
        phone=phone.strip(),
        password_hash=hash_password(password),
        verified_at=utc_now(),
    )
    db.add(user)
    db.flush()
    linked_learner = link_learner(db, user, learner_id)
    db.commit()
    db.refresh(user)
    return user, linked_learner.id if linked_learner else None


def login(db: Session, email: str, password: str, learner_id: str | None = None) -> tuple[User, str | None]:
    user = db.scalar(select(User).where(User.email == normalize_email(email)))
    if user is None or not user.password_hash or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")

    linked_learner = link_learner(db, user, learner_id)
    if linked_learner is None:
        linked_learner = db.scalar(select(Learner).where(Learner.user_id == user.id).order_by(Learner.created_at.desc()))
    db.commit()
    return user, linked_learner.id if linked_learner else None


def link_learner(db: Session, user: User, learner_id: str | None) -> Learner | None:
    if not learner_id:
        return None
    learner = db.get(Learner, learner_id)
    if learner is None:
        raise HTTPException(status_code=404, detail="Learner profile not found.")
    if learner.user_id not in (None, user.id):
        raise HTTPException(status_code=409, detail="That learner profile is linked to another account.")
    learner.user_id = user.id
    return learner


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=SCRYPT_DKLEN)
    encoded_salt = base64.urlsafe_b64encode(salt).decode("ascii")
    encoded_digest = base64.urlsafe_b64encode(digest).decode("ascii")
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${encoded_salt}${encoded_digest}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, n, r, p, encoded_salt, encoded_digest = encoded.split("$", 5)
        if algorithm != "scrypt":
            return False
        salt = base64.urlsafe_b64decode(encoded_salt.encode("ascii"))
        expected = base64.urlsafe_b64decode(encoded_digest.encode("ascii"))
        actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=int(n), r=int(r), p=int(p), dklen=len(expected))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def create_access_token(user: User) -> tuple[str, int]:
    expires_in = settings.access_token_minutes * 60
    payload = {"sub": user.id, "type": "access", "exp": utc_now() + timedelta(seconds=expires_in)}
    return jwt.encode(payload, require_jwt_secret(), algorithm=settings.jwt_algorithm), expires_in


def create_refresh_token(db: Session, user: User) -> str:
    token_id = secrets.token_urlsafe(24)
    expires_at = utc_now() + timedelta(days=settings.refresh_token_days)
    token = jwt.encode({"sub": user.id, "jti": token_id, "type": "refresh", "exp": expires_at}, require_jwt_secret(), algorithm=settings.jwt_algorithm)
    db.add(RefreshToken(user_id=user.id, token_hash=hash_value(token), expires_at=expires_at))
    db.commit()
    return token


def rotate_refresh_token(db: Session, token: str) -> tuple[User, str, int, str | None]:
    payload = decode_token(token, expected_type="refresh")
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_value(token)))
    now = utc_now()
    if record is None or record.revoked_at is not None or is_expired(record.expires_at, now):
        raise HTTPException(status_code=401, detail="Refresh session is no longer valid.")
    user = db.get(User, payload["sub"])
    if user is None or user.verified_at is None:
        raise HTTPException(status_code=401, detail="Refresh session is no longer valid.")
    record.revoked_at = now
    db.flush()
    next_refresh = create_refresh_token(db, user)
    learner = db.scalar(select(Learner).where(Learner.user_id == user.id).order_by(Learner.created_at.desc()))
    return user, next_refresh, settings.access_token_minutes * 60, learner.id if learner else None


def revoke_refresh_token(db: Session, token: str | None) -> None:
    if not token:
        return
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_value(token)))
    if record is not None and record.revoked_at is None:
        record.revoked_at = utc_now()
        db.commit()


def decode_token(token: str, expected_type: str = "access") -> dict:
    try:
        payload = jwt.decode(token, require_jwt_secret(), algorithms=[settings.jwt_algorithm])
    except (jwt.InvalidTokenError, RuntimeError) as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.") from error
    if payload.get("type") != expected_type or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication is required.")
    return payload


def hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def is_expired(value: datetime, now: datetime) -> bool:
    comparable = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    return comparable <= now


def require_jwt_secret() -> str:
    if not settings.jwt_secret:
        raise RuntimeError("JWT is not configured. Set JWT_SECRET before using authentication.")
    return settings.jwt_secret
