from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.core.database import Base


def new_id() -> str:
    return str(uuid4())


class Learner(Base):
    __tablename__ = "learners"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    goal: Mapped[str] = mapped_column(String(240), nullable=False)
    experience_level: Mapped[str] = mapped_column(String(32), nullable=False)
    skills: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    completed_courses: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    weekly_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    learning_preference: Mapped[str] = mapped_column(String(32), nullable=False)
    timeline_months: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RoadmapState(Base):
    __tablename__ = "roadmap_states"
    __table_args__ = (UniqueConstraint("learner_id", "version", name="uq_roadmap_learner_version"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    state: Mapped[dict] = mapped_column(JSON, nullable=False)
    change_reason: Mapped[str] = mapped_column(String(500), default="Initial roadmap")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MistakeEvent(Base):
    __tablename__ = "mistake_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    skill: Mapped[str] = mapped_column(String(120), nullable=False)
    concept: Mapped[str] = mapped_column(String(240), nullable=False)
    question_id: Mapped[str] = mapped_column(String(120), nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False, default="incorrect_answer")
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PracticeAttempt(Base):
    __tablename__ = "practice_attempts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    assessment_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    skill: Mapped[str] = mapped_column(String(120), nullable=False)
    question_id: Mapped[str] = mapped_column(String(120), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(24), nullable=False, default="medium")
    selected_answer: Mapped[str] = mapped_column(Text, nullable=False)
    correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    elapsed_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SkillGraphNode(Base):
    __tablename__ = "skill_graph_nodes"
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learners.id", ondelete="CASCADE"), primary_key=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    mastery: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)


class SkillGraphEdge(Base):
    __tablename__ = "skill_graph_edges"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    learner_id: Mapped[str] = mapped_column(ForeignKey("learners.id", ondelete="CASCADE"), index=True)
    source_node_id: Mapped[str] = mapped_column(String(120), nullable=False)
    target_node_id: Mapped[str] = mapped_column(String(120), nullable=False)
    relation: Mapped[str] = mapped_column(String(40), nullable=False, default="prerequisite")
