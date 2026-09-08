"""Database-backed adaptive-learning APIs.

Authentication is intentionally the next checkpoint. Until then learner IDs are
required on stateful requests so the persistence contract is explicit.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Learner, MistakeEvent, PracticeAttempt, SkillGraphEdge, SkillGraphNode
from app.schemas.adaptive import BootstrapRequest, LearnerContextResponse, LearnerStatePayload, StateResponse
from app.services.adaptive_persistence_service import create_demo_learner, current_state, save_initial_state, save_state
from app.services.learner_context_service import get_learner_context
from app.services.tutor_service import generate_tutor_response

router = APIRouter(prefix="/api/adaptive", tags=["Adaptive learning"])


class TutorRequest(BaseModel):
    learner_id: str = Field(min_length=1, max_length=36)
    message: str = Field(min_length=1, max_length=2000)
    concept: str | None = Field(default=None, max_length=120)


class AttemptRequest(BaseModel):
    learner_id: str = Field(min_length=1, max_length=36)
    skill: str = Field(min_length=1, max_length=120)
    question_id: str = Field(min_length=1, max_length=120)
    selected_answer: str = Field(min_length=1, max_length=2000)
    correct_answer: str = Field(min_length=1, max_length=2000)
    attempts: int = Field(default=1, ge=1, le=20)
    elapsed_seconds: int | None = Field(default=None, ge=0, le=7200)


def require_learner(db: Session, learner_id: str) -> Learner:
    learner = db.get(Learner, learner_id)
    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found.")
    return learner


@router.post("/learners/bootstrap", response_model=StateResponse, status_code=201)
def bootstrap_learner(payload: BootstrapRequest, db: Session = Depends(get_db)) -> StateResponse:
    if payload.existing_learner_id:
        learner = require_learner(db, payload.existing_learner_id)
        existing = current_state(db, learner.id)
        if existing:
            return StateResponse(learner_id=learner.id, roadmap_version=existing.version, state=existing.state)
        state = payload.initial_state or LearnerStatePayload(
            name="Learner", goal=learner.goal, readiness=0,
            skills=[{"name": skill, "mastery": 0, "status": "weak"} for skill in learner.skills], activity={},
        )
        roadmap = save_initial_state(db, learner.id, state)
        return StateResponse(learner_id=learner.id, roadmap_version=roadmap.version, state=roadmap.state)
    if payload.initial_state is None:
        raise HTTPException(status_code=422, detail="An initial learner state is required for a new learner.")
    learner, roadmap = create_demo_learner(db, payload.initial_state)
    return StateResponse(learner_id=learner.id, roadmap_version=roadmap.version, state=roadmap.state)


@router.get("/state/{learner_id}", response_model=StateResponse)
def get_state(learner_id: str, db: Session = Depends(get_db)) -> StateResponse:
    require_learner(db, learner_id)
    roadmap = current_state(db, learner_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Learner state not found.")
    return StateResponse(learner_id=learner_id, roadmap_version=roadmap.version, state=roadmap.state)


@router.get("/context/{learner_id}", response_model=LearnerContextResponse)
def get_context(learner_id: str, db: Session = Depends(get_db)) -> LearnerContextResponse:
    learner = require_learner(db, learner_id)
    return get_learner_context(db, learner)


@router.put("/state/{learner_id}", response_model=StateResponse)
def put_state(learner_id: str, payload: LearnerStatePayload, db: Session = Depends(get_db)) -> StateResponse:
    learner = require_learner(db, learner_id)
    learner.goal = payload.goal
    learner.skills = [skill.name for skill in payload.skills]
    roadmap = save_state(db, learner_id, payload)
    return StateResponse(learner_id=learner_id, roadmap_version=roadmap.version, state=roadmap.state)


@router.post("/tutor/chat")
def tutor_chat(payload: TutorRequest, db: Session = Depends(get_db)) -> dict:
    learner = require_learner(db, payload.learner_id)
    context = get_learner_context(db, learner)
    return generate_tutor_response(payload.message, context)


@router.post("/tutor/hint")
def tutor_hint(payload: TutorRequest, db: Session = Depends(get_db)) -> dict:
    learner = require_learner(db, payload.learner_id)
    context = get_learner_context(db, learner)
    response = generate_tutor_response(payload.message or "Give me a hint", context)
    response["intent"] = "hint"
    response["next_action"] = "retry"
    return response


@router.post("/practice/evaluate")
def evaluate_practice(payload: AttemptRequest, db: Session = Depends(get_db)) -> dict:
    require_learner(db, payload.learner_id)
    correct = payload.selected_answer.strip().casefold() == payload.correct_answer.strip().casefold()
    db.add(PracticeAttempt(learner_id=payload.learner_id, skill=payload.skill, question_id=payload.question_id, selected_answer=payload.selected_answer, correct=correct, attempt_number=payload.attempts, elapsed_seconds=payload.elapsed_seconds, error_type=None if correct else "conceptual"))
    mistakes = 0
    if not correct:
        concept = payload.skill
        db.add(MistakeEvent(learner_id=payload.learner_id, skill=payload.skill, concept=concept, question_id=payload.question_id))
        db.flush()
        mistakes = db.scalar(select(func.count(MistakeEvent.id)).where(MistakeEvent.learner_id == payload.learner_id, MistakeEvent.skill == payload.skill)) or 0
    db.commit()
    adapt = not correct and mistakes >= 3
    feedback = f"Correct. You demonstrated understanding of {payload.skill}." if correct else f"Review the core concept behind {payload.skill}, then try the question again."
    return {"correct": correct, "feedback": feedback, "next_actions": ["try_again", "explain", "similar_question"], "roadmap_adjustment": {"needed": adapt, "insert_before": payload.skill, "steps": [f"{payload.skill} fundamentals", f"{payload.skill} applied exercise", f"{payload.skill} assessment"], "reason": f"{mistakes} recorded {payload.skill} mistakes"} if adapt else None}


@router.get("/progress/{learner_id}")
def progress(learner_id: str, db: Session = Depends(get_db)) -> dict:
    require_learner(db, learner_id)
    questions = db.scalar(select(func.count(PracticeAttempt.id)).where(PracticeAttempt.learner_id == learner_id)) or 0
    return {"practice_questions": questions, "mistake_events": db.scalar(select(func.count(MistakeEvent.id)).where(MistakeEvent.learner_id == learner_id)) or 0}


@router.get("/skills/graph/{learner_id}")
def skill_graph(learner_id: str, db: Session = Depends(get_db)) -> dict:
    require_learner(db, learner_id)
    nodes = db.scalars(select(SkillGraphNode).where(SkillGraphNode.learner_id == learner_id)).all()
    edges = db.scalars(select(SkillGraphEdge).where(SkillGraphEdge.learner_id == learner_id)).all()
    return {"nodes": [{"id": node.id, "label": node.label, "mastery": node.mastery, "status": node.status} for node in nodes], "edges": [[edge.source_node_id, edge.target_node_id] for edge in edges]}


@router.get("/mistakes/{learner_id}")
def mistakes(learner_id: str, db: Session = Depends(get_db)) -> dict:
    require_learner(db, learner_id)
    rows = db.execute(select(MistakeEvent.skill, MistakeEvent.concept, func.count(MistakeEvent.id)).where(MistakeEvent.learner_id == learner_id).group_by(MistakeEvent.skill, MistakeEvent.concept)).all()
    return {"mistakes": [{"skill": skill, "concept": concept, "count": count} for skill, concept, count in rows]}
