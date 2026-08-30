from pydantic import BaseModel, Field

from app.schemas.profile import LearnerProfile
from app.schemas.recommendations import RecommendationItem
from app.schemas.skills import SkillGapItem


class LearningPathRequest(BaseModel):
    learner_id: str = Field(..., min_length=1)
    profile: LearnerProfile
    skill_gaps: list[SkillGapItem] = Field(default_factory=list)
    recommendations: list[RecommendationItem] = Field(default_factory=list)


class LearningMilestone(BaseModel):
    id: str
    order: int
    title: str
    description: str
    estimated_hours: int
    skills: list[str]
    resource_ids: list[str]
    resources: list[RecommendationItem]
    assessment: str
    completion_criteria: list[str]


class LearningPath(BaseModel):
    title: str
    duration_months: int
    weekly_hours: int
    summary: str
    milestones: list[LearningMilestone]


class LearningPathResponse(BaseModel):
    learner_id: str
    target_role: str
    path: LearningPath
    reasoning: str
    ai_generated: bool
    message: str
    path_quality_score: int | None = None
