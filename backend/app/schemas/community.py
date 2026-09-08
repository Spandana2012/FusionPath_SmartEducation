from datetime import datetime

from pydantic import BaseModel, Field


class CommunityPostCreate(BaseModel):
    domain: str = Field(min_length=1, max_length=80)
    content: str = Field(min_length=1, max_length=2000)


class CommunityReplyCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class CommunityReplyResponse(BaseModel):
    id: str
    post_id: str
    author_user_id: str
    content: str
    created_at: datetime | None
    reported: bool


class CommunityPostResponse(BaseModel):
    id: str
    author_user_id: str
    domain: str
    content: str
    created_at: datetime | None
    reported: bool
    replies_count: int = 0
