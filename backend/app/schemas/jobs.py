from datetime import datetime

from pydantic import BaseModel


class JobListingResponse(BaseModel):
    id: str
    domain: str
    title: str
    company: str
    location: str
    link: str
    posted_date: datetime | None
    seniority: str
    match_reason: str = ""


class JobRecommendationsResponse(BaseModel):
    learner_id: str
    domain: str
    jobs: list[JobListingResponse]
    message: str
