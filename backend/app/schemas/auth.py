from datetime import datetime

import re

from pydantic import BaseModel, Field, field_validator


class OTPRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value.strip()):
            raise ValueError("A valid email address is required.")
        return value


class OTPVerifyRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    learner_id: str | None = Field(default=None, min_length=1, max_length=36)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value.strip()):
            raise ValueError("A valid email address is required.")
        return value


class AuthUser(BaseModel):
    id: str
    email: str
    verified_at: datetime | None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser
    learner_id: str | None = None


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser
    learner_id: str | None = None
