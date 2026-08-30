from enum import Enum
from typing import Annotated

from pydantic import BaseModel, Field, field_validator


class ExperienceLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class LearningPreference(str, Enum):
    project_based = "project_based"
    structured_courses = "structured_courses"
    reading = "reading"
    video = "video"
    mixed = "mixed"


NonEmptyText = Annotated[str, Field(min_length=1, max_length=200)]


class CompletedCourse(BaseModel):
    name: NonEmptyText
    skills: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Course name is required.")
        return value

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, value: list[str]) -> list[str]:
        if any(not skill.strip() for skill in value):
            raise ValueError("Course skills cannot be empty.")
        return value


class LearnerProfileRequest(BaseModel):
    goal: str = Field(..., min_length=1, max_length=240)
    experience_level: ExperienceLevel
    skills: list[str] = Field(..., min_length=1, max_length=50)
    completed_courses: list[CompletedCourse] = Field(default_factory=list, max_length=50)
    weekly_hours: int = Field(..., gt=0, le=168)
    learning_preference: LearningPreference
    timeline_months: int = Field(..., gt=0, le=120)

    @field_validator("goal")
    @classmethod
    def validate_goal(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Goal is required.")
        return value

    @field_validator("skills")
    @classmethod
    def validate_profile_skills(cls, value: list[str]) -> list[str]:
        if any(not skill.strip() for skill in value):
            raise ValueError("Skills cannot be empty.")
        return value


class LearnerProfile(BaseModel):
    goal: str
    experience_level: ExperienceLevel
    skills: list[str]
    completed_courses: list[CompletedCourse]
    weekly_hours: int
    learning_preference: LearningPreference
    timeline_months: int


class LearnerProfileResponse(BaseModel):
    learner_id: str
    profile: LearnerProfile
    message: str
