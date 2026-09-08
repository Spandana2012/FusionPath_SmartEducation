from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Learner
from app.schemas.jobs import JobListingResponse, JobRecommendationsResponse
from app.services.jobs_service import get_job_recommendations

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.get("/recommendations/{learner_id}", response_model=JobRecommendationsResponse)
def recommendations(learner_id: str, db: Session = Depends(get_db)) -> JobRecommendationsResponse:
    learner = db.get(Learner, learner_id)
    if learner is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Learner not found.")
    domain, jobs = get_job_recommendations(db, learner)
    return JobRecommendationsResponse(
        learner_id=learner.id,
        domain=domain,
        jobs=[JobListingResponse.model_validate(job, from_attributes=True) for job in jobs],
        message="Curated job listings are seeded locally and can be refreshed through a database seed update.",
    )
