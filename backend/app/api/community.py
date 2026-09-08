from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import current_user
from app.core.database import get_db
from app.models import CommunityPost, CommunityReply, User
from app.schemas.community import CommunityPostCreate, CommunityPostResponse, CommunityReplyCreate, CommunityReplyResponse
from app.services.community_service import SUPPORTED_DOMAINS, post_rows, validate_domain

router = APIRouter(prefix="/api/community", tags=["Community"])


@router.get("/domains")
def domains() -> dict[str, tuple[str, ...]]:
    return {"domains": SUPPORTED_DOMAINS}


@router.get("/posts", response_model=list[CommunityPostResponse])
def list_posts(domain: str | None = Query(default=None), db: Session = Depends(get_db), _: User = Depends(current_user)) -> list[CommunityPostResponse]:
    return [CommunityPostResponse(id=post.id, author_user_id=post.author_user_id, domain=post.domain, content=post.content, created_at=post.created_at, reported=post.reported, replies_count=count) for post, count in post_rows(db, domain)]


@router.post("/posts", response_model=CommunityPostResponse, status_code=status.HTTP_201_CREATED)
def create_post(payload: CommunityPostCreate, db: Session = Depends(get_db), user: User = Depends(current_user)) -> CommunityPostResponse:
    try:
        domain = validate_domain(payload.domain)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    post = CommunityPost(author_user_id=user.id, domain=domain, content=payload.content.strip())
    db.add(post)
    db.commit()
    db.refresh(post)
    return CommunityPostResponse.model_validate(post, from_attributes=True)


@router.get("/posts/{post_id}/replies", response_model=list[CommunityReplyResponse])
def list_replies(post_id: str, db: Session = Depends(get_db), _: User = Depends(current_user)) -> list[CommunityReplyResponse]:
    if db.get(CommunityPost, post_id) is None:
        raise HTTPException(status_code=404, detail="Post not found.")
    replies = db.scalars(select(CommunityReply).where(CommunityReply.post_id == post_id).order_by(CommunityReply.created_at.asc())).all()
    return [CommunityReplyResponse.model_validate(reply, from_attributes=True) for reply in replies]


@router.post("/posts/{post_id}/replies", response_model=CommunityReplyResponse, status_code=status.HTTP_201_CREATED)
def create_reply(post_id: str, payload: CommunityReplyCreate, db: Session = Depends(get_db), user: User = Depends(current_user)) -> CommunityReplyResponse:
    if db.get(CommunityPost, post_id) is None:
        raise HTTPException(status_code=404, detail="Post not found.")
    reply = CommunityReply(post_id=post_id, author_user_id=user.id, content=payload.content.strip())
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return CommunityReplyResponse.model_validate(reply, from_attributes=True)


@router.post("/posts/{post_id}/report")
def report_post(post_id: str, db: Session = Depends(get_db), _: User = Depends(current_user)) -> dict[str, str]:
    post = db.get(CommunityPost, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found.")
    post.reported = True
    db.commit()
    return {"message": "Post reported."}


@router.post("/replies/{reply_id}/report")
def report_reply(reply_id: str, db: Session = Depends(get_db), _: User = Depends(current_user)) -> dict[str, str]:
    reply = db.get(CommunityReply, reply_id)
    if reply is None:
        raise HTTPException(status_code=404, detail="Reply not found.")
    reply.reported = True
    db.commit()
    return {"message": "Reply reported."}
