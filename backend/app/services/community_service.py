from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.knowledge.skill_requirements import ROLE_REQUIREMENTS
from app.models import CommunityPost, CommunityReply


SUPPORTED_DOMAINS = tuple(role.role for role in ROLE_REQUIREMENTS)


def validate_domain(domain: str) -> str:
    normalized = domain.strip()
    if normalized not in SUPPORTED_DOMAINS:
        raise ValueError("Choose one of the supported FusionPath domains.")
    return normalized


def post_rows(db: Session, domain: str | None = None) -> list[tuple[CommunityPost, int]]:
    query = select(CommunityPost, func.count(CommunityReply.id)).outerjoin(CommunityReply, CommunityReply.post_id == CommunityPost.id).group_by(CommunityPost.id).order_by(CommunityPost.created_at.desc())
    if domain:
        query = query.where(CommunityPost.domain == validate_domain(domain))
    return list(db.execute(query).all())
