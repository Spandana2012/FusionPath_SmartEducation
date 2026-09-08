from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import current_user
from app.core.database import get_db
from app.models import Learner, User
from app.schemas.jobs import JobListingResponse, JobRecommendationsResponse
from app.services.jobs_service import get_job_recommendations

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.get("/recommendations/{learner_id}", response_model=JobRecommendationsResponse)
def recommendations(learner_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)) -> JobRecommendationsResponse:
    learner = db.get(Learner, learner_id)
    if learner is None:
        raise HTTPException(status_code=404, detail="Learner not found.")
    if learner.user_id != user.id:
        raise HTTPException(status_code=403, detail="This learner is not linked to the authenticated account.")
    domain, jobs = get_job_recommendations(db, learner)
    return JobRecommendationsResponse(
        learner_id=learner.id,
        domain=domain,
        jobs=[JobListingResponse.model_validate(job, from_attributes=True).model_copy(update={"match_reason": f"Your {domain} target role and {job.seniority} readiness align with this opportunity."}) for job in jobs],
        message="Curated job listings are seeded locally and can be refreshed through a database seed update.",
    )
