from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import optional_user
from app.core.database import get_db
from app.models import User
from app.schemas.profile import LearnerProfileRequest, LearnerProfileResponse
from app.services.profile_service import analyze_profile

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.post("/analyze", response_model=LearnerProfileResponse)
def analyze_learner_profile(payload: LearnerProfileRequest, db: Session = Depends(get_db), user: User | None = Depends(optional_user)) -> LearnerProfileResponse:
    return analyze_profile(payload, db, user)
