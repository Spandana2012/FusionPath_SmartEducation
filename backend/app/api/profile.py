from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.profile import LearnerProfileRequest, LearnerProfileResponse
from app.services.profile_service import analyze_profile

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.post("/analyze", response_model=LearnerProfileResponse)
def analyze_learner_profile(payload: LearnerProfileRequest, db: Session = Depends(get_db)) -> LearnerProfileResponse:
    return analyze_profile(payload, db)
