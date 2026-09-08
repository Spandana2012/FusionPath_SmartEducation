from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DatabaseSession

from app.core.config import settings
from app.models import Learner, Session, User
from app.services.skill_gap_service import match_role

SCRYPT_N = 16_384
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 64


def signup(db: DatabaseSession, name: str, email: str, phone: str, password: str, learner_id: str | None = None) -> tuple[User, str | None]:
    normalized_email = normalize_email(email)
    if db.scalar(select(User).where(User.email == normalized_email)) is not None:
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    user = User(name=name.strip(), email=normalized_email, phone=phone.strip(), password_hash=hash_password(password), verified_at=utc_now())
    db.add(user)
    db.flush()
    linked_learner = link_learner(db, user, learner_id)
    db.commit()
    db.refresh(user)
    return user, linked_learner.id if linked_learner else None


def login(db: DatabaseSession, email: str, password: str, learner_id: str | None = None) -> tuple[User, str | None]:
    user = db.scalar(select(User).where(User.email == normalize_email(email)))
    if user is None or not user.password_hash or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")

    linked_learner = link_learner(db, user, learner_id)
    if linked_learner is None:
        linked_learner = db.scalar(select(Learner).where(Learner.user_id == user.id).order_by(Learner.created_at.desc()))
    db.commit()
    return user, linked_learner.id if linked_learner else None


def link_learner(db: DatabaseSession, user: User, learner_id: str | None) -> Learner | None:
    if not learner_id:
        return None
    learner = db.get(Learner, learner_id)
    if learner is None:
        raise HTTPException(status_code=404, detail="Learner profile not found.")
    if learner.user_id not in (None, user.id):
        raise HTTPException(status_code=409, detail="That learner profile is linked to another account.")
    learner.user_id = user.id
    return learner


def create_session(db: DatabaseSession, user: User) -> tuple[str, int]:
    raw_token = secrets.token_urlsafe(32)
    expires_at = utc_now() + timedelta(days=settings.session_expire_days)
    db.add(Session(user_id=user.id, session_token_hash=hash_value(raw_token), expires_at=expires_at, last_seen_at=utc_now()))
    db.commit()
    return raw_token, settings.session_expire_days * 86400


def revoke_session(db: DatabaseSession, raw_token: str | None) -> None:
    if not raw_token:
        return
    session = db.scalar(select(Session).where(Session.session_token_hash == hash_value(raw_token)))
    if session is not None and session.revoked_at is None:
        session.revoked_at = utc_now()
        db.commit()


def get_user_for_session(db: DatabaseSession, raw_token: str | None) -> User:
    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication is required.")
    session = db.scalar(select(Session).where(Session.session_token_hash == hash_value(raw_token)))
    now = utc_now()
    if session is None or session.revoked_at is not None or is_expired(session.expires_at, now):
        raise HTTPException(status_code=401, detail="Authentication is required.")
    user = db.get(User, session.user_id)
    if user is None or user.verified_at is None:
        raise HTTPException(status_code=401, detail="Authentication is required.")
    session.last_seen_at = now
    db.commit()
    return user


def linked_context(db: DatabaseSession, user: User) -> tuple[str | None, str | None]:
    learner = db.scalar(select(Learner).where(Learner.user_id == user.id).order_by(Learner.created_at.desc()))
    if learner is None:
        return None, None
    return learner.id, match_role(learner.goal).role


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


def hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def is_expired(value: datetime, now: datetime) -> bool:
    comparable = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    return comparable <= now
