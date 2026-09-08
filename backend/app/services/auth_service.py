from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

import jwt
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Learner, OTPCode, RefreshToken, User

logger = logging.getLogger(__name__)


class SMTPConfigurationError(RuntimeError):
    pass


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def request_otp(db: Session, email: str) -> None:
    validate_smtp_configuration()
    normalized_email = normalize_email(email)
    user = db.scalar(select(User).where(User.email == normalized_email))
    if user is None:
        user = User(email=normalized_email)
        db.add(user)
        db.flush()

    cutoff = utc_now() - timedelta(hours=1)
    recent_count = db.scalar(
        select(func.count(OTPCode.id)).where(OTPCode.user_id == user.id, OTPCode.created_at >= cutoff)
    ) or 0
    if recent_count >= 5:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please try again later.")

    otp = f"{secrets.randbelow(1_000_000):06d}"
    send_otp_email(normalized_email, otp)
    db.add(OTPCode(user_id=user.id, code_hash=hash_value(otp), expires_at=utc_now() + timedelta(minutes=7)))
    db.commit()


def verify_otp(db: Session, email: str, otp: str, learner_id: str | None = None) -> tuple[User, str | None]:
    user = db.scalar(select(User).where(User.email == normalize_email(email)))
    if user is None:
        raise HTTPException(status_code=400, detail="The email or OTP is not valid.")

    code = db.scalar(
        select(OTPCode)
        .where(OTPCode.user_id == user.id, OTPCode.consumed_at.is_(None))
        .order_by(OTPCode.created_at.desc())
    )
    now = utc_now()
    if code is None or is_expired(code.expires_at, now) or not hmac.compare_digest(code.code_hash, hash_value(otp)):
        raise HTTPException(status_code=400, detail="The email or OTP is not valid or has expired.")

    code.consumed_at = now
    user.verified_at = now
    learner = None
    if learner_id:
        learner = db.get(Learner, learner_id)
        if learner is not None and learner.user_id not in (None, user.id):
            raise HTTPException(status_code=409, detail="That learner profile is linked to another account.")
        if learner is not None:
            learner.user_id = user.id
    if learner is None:
        learner = db.scalar(select(Learner).where(Learner.user_id == user.id).order_by(Learner.created_at.desc()))
    db.commit()
    db.refresh(user)
    return user, learner.id if learner else None


def create_access_token(user: User) -> tuple[str, int]:
    expires_in = settings.access_token_minutes * 60
    payload = {"sub": user.id, "type": "access", "exp": utc_now() + timedelta(seconds=expires_in)}
    return jwt.encode(payload, require_jwt_secret(), algorithm=settings.jwt_algorithm), expires_in


def create_refresh_token(db: Session, user: User) -> str:
    token_id = secrets.token_urlsafe(24)
    expires_at = utc_now() + timedelta(days=settings.refresh_token_days)
    token = jwt.encode(
        {"sub": user.id, "jti": token_id, "type": "refresh", "exp": expires_at},
        require_jwt_secret(),
        algorithm=settings.jwt_algorithm,
    )
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
    refresh_token = create_refresh_token(db, user)
    learner = db.scalar(select(Learner).where(Learner.user_id == user.id).order_by(Learner.created_at.desc()))
    return user, refresh_token, settings.access_token_minutes * 60, learner.id if learner else None


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


def send_otp_email(email: str, otp: str) -> None:
    message = EmailMessage()
    message["Subject"] = "Your FusionPath verification code"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(f"Your FusionPath verification code is {otp}. It expires in 7 minutes.")
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as error:
        raise SMTPConfigurationError("SMTP delivery failed.") from error


def validate_smtp_configuration() -> None:
    if not settings.smtp_host or not settings.smtp_from_email:
        raise SMTPConfigurationError("SMTP configuration is incomplete.")
    if bool(settings.smtp_username) != bool(settings.smtp_password):
        raise SMTPConfigurationError("SMTP authentication configuration is incomplete.")


def hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def is_expired(value: datetime, now: datetime) -> bool:
    comparable = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    return comparable <= now


def require_jwt_secret() -> str:
    if not settings.jwt_secret:
        raise RuntimeError("JWT is not configured. Set JWT_SECRET before using authentication.")
    return settings.jwt_secret
