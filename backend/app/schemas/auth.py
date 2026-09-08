import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator


EMAIL_PATTERN = r"[^@\s]+@[^@\s]+\.[^@\s]+"
PHONE_PATTERN = r"^[+]?[0-9 ()-]{7,32}$"


class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    phone: str = Field(min_length=7, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)
    learner_id: str | None = Field(default=None, min_length=1, max_length=36)

    @field_validator("name", "email", "phone")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required.")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not re.fullmatch(EMAIL_PATTERN, value):
            raise ValueError("A valid email address is required.")
        return value.casefold()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        if not re.fullmatch(PHONE_PATTERN, value):
            raise ValueError("A valid phone number is required.")
        return value

    @model_validator(mode="after")
    def passwords_must_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)
    learner_id: str | None = Field(default=None, min_length=1, max_length=36)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip()
        if not re.fullmatch(EMAIL_PATTERN, value):
            raise ValueError("A valid email address is required.")
        return value.casefold()


class AuthUser(BaseModel):
    id: str
    name: str | None
    email: str
    phone: str | None
    verified_at: datetime | None


class AuthResponse(BaseModel):
    authenticated: bool = True
    user: AuthUser
    learner_id: str | None = None
    domain: str | None = None
