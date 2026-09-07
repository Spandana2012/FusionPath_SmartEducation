from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


SkillStatus = Literal["mastered", "strong", "learning", "weak", "locked"]


class SkillStatePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    mastery: int = Field(ge=0, le=100)
    status: SkillStatus


class LearnerStatePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=120)
    goal: str = Field(min_length=1, max_length=240)
    readiness: int = Field(ge=0, le=100)
    skills: list[SkillStatePayload] = Field(min_length=1, max_length=100)
    completedLessons: list[str] = Field(default_factory=list, max_length=500)
    mistakes: dict[str, int] = Field(default_factory=dict, max_length=200)
    adapted: bool = False
    activity: dict[str, int] = Field(default_factory=dict)


class BootstrapRequest(BaseModel):
    initial_state: LearnerStatePayload | None = None
    existing_learner_id: str | None = Field(default=None, min_length=1, max_length=36)


class StateResponse(BaseModel):
    learner_id: str
    roadmap_version: int
    state: LearnerStatePayload
