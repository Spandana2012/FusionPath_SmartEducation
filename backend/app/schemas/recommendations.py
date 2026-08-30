from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.profile import LearnerProfile
from app.schemas.skills import PriorityLabel, SkillGapItem


ResourceType = Literal["course", "project", "tutorial", "article", "video", "assessment"]
ResourceDifficulty = Literal["beginner", "intermediate", "advanced"]


class RecommendationRequest(BaseModel):
    learner_id: str = Field(..., min_length=1)
    profile: LearnerProfile
    skill_gaps: list[SkillGapItem] = Field(default_factory=list)


class RecommendationItem(BaseModel):
    resource_id: str
    title: str
    type: ResourceType
    provider: str
    url: str
    description: str
    skill: str
    skills: list[str]
    difficulty: ResourceDifficulty
    estimated_hours: int
    match_score: int = Field(..., ge=0, le=100)
    priority: PriorityLabel
    reason: str


class SkillRecommendationGroup(BaseModel):
    skill: str
    recommendations: list[RecommendationItem]


class RecommendationResponse(BaseModel):
    learner_id: str
    target_role: str
    recommendations: list[RecommendationItem]
    skill_recommendations: list[SkillRecommendationGroup]
    uncovered_skills: list[str]
    message: str
