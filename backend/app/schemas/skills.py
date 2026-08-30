from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.profile import LearnerProfile


PriorityLabel = Literal["high", "medium", "low"]
SkillStatus = Literal["strong", "developing", "missing"]
ReadinessLabel = Literal["ready", "nearly_ready", "needs_focused_learning", "foundation_needed"]


class SkillGapRequest(BaseModel):
    learner_id: str = Field(..., min_length=1)
    profile: LearnerProfile


class SkillGapItem(BaseModel):
    skill: str
    category: str
    required_level: int
    current_level: int
    gap_score: float
    priority_score: float
    priority: PriorityLabel
    importance: int
    status: SkillStatus
    prerequisites: list[str]
    explanation: str


class SkillStrengthItem(BaseModel):
    skill: str
    category: str
    current_level: int
    required_level: int
    importance: int
    explanation: str


class SkillGapResponse(BaseModel):
    learner_id: str
    target_role: str
    matched_goal: str
    readiness_score: int
    readiness_label: ReadinessLabel
    skill_gaps: list[SkillGapItem]
    strengths: list[SkillStrengthItem]
    missing_critical_skills: list[str]
    message: str
