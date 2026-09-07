from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import Learner, MistakeEvent, RoadmapState, SkillGraphEdge, SkillGraphNode
from app.schemas.adaptive import LearnerStatePayload


def create_demo_learner(db: Session, state: LearnerStatePayload) -> tuple[Learner, RoadmapState]:
    learner = Learner(display_name=state.name, goal=state.goal, experience_level="beginner", skills=[item.name for item in state.skills], completed_courses=[], weekly_hours=5, learning_preference="mixed", timeline_months=6)
    db.add(learner); db.flush()
    roadmap = RoadmapState(learner_id=learner.id, version=1, state=state.model_dump(mode="json"), change_reason="Imported demo state")
    db.add(roadmap)
    record_mistake_deltas(db, learner.id, {}, state.mistakes, event_type="imported_demo")
    replace_skill_graph(db, learner.id, state)
    db.commit(); db.refresh(roadmap)
    return learner, roadmap


def current_state(db: Session, learner_id: str) -> RoadmapState | None:
    return db.scalar(select(RoadmapState).where(RoadmapState.learner_id == learner_id, RoadmapState.is_current.is_(True)).order_by(RoadmapState.version.desc()))


def save_initial_state(db: Session, learner_id: str, state: LearnerStatePayload) -> RoadmapState:
    learner = db.get(Learner, learner_id)
    if learner:
        learner.display_name = state.name
        learner.goal = state.goal
        learner.skills = [skill.name for skill in state.skills]
    roadmap = RoadmapState(learner_id=learner_id, version=1, state=state.model_dump(mode="json"), change_reason="Initialized from learner profile")
    db.add(roadmap); record_mistake_deltas(db, learner_id, {}, state.mistakes, event_type="imported_demo"); replace_skill_graph(db, learner_id, state); db.commit(); db.refresh(roadmap)
    return roadmap


def save_state(db: Session, learner_id: str, state: LearnerStatePayload, reason: str = "Learner state synced") -> RoadmapState:
    current = current_state(db, learner_id)
    if current is None: raise LookupError("Learner roadmap not found")
    learner = db.get(Learner, learner_id)
    if learner:
        learner.display_name = state.name
        learner.goal = state.goal
        learner.skills = [skill.name for skill in state.skills]
    previous_state = current.state or {}
    record_mistake_deltas(db, learner_id, previous_state.get("mistakes", {}), state.mistakes, event_type="state_sync")
    db.execute(update(RoadmapState).where(RoadmapState.id == current.id).values(is_current=False))
    roadmap = RoadmapState(learner_id=learner_id, version=current.version + 1, state=state.model_dump(mode="json"), change_reason=reason)
    db.add(roadmap); replace_skill_graph(db, learner_id, state); db.commit(); db.refresh(roadmap)
    return roadmap


def record_mistake_deltas(
    db: Session,
    learner_id: str,
    previous: dict[str, int],
    current: dict[str, int],
    *,
    event_type: str,
) -> None:
    """Turn newly observed aggregate counts into immutable journal events.

    The demo client still sends an aggregate state snapshot. The database keeps
    the snapshot for compatibility, but only the count delta becomes an event,
    so repeated cache retries do not duplicate journal history.
    """
    for concept, count in current.items():
        delta = max(0, count - previous.get(concept, 0))
        for _ in range(delta):
            db.add(MistakeEvent(
                learner_id=learner_id,
                skill=concept,
                concept=concept,
                question_id="state-sync",
                event_type=event_type,
                metadata_json={"source": "learner_state_snapshot"},
            ))


def replace_skill_graph(db: Session, learner_id: str, state: LearnerStatePayload) -> None:
    db.query(SkillGraphEdge).filter(SkillGraphEdge.learner_id == learner_id).delete()
    db.query(SkillGraphNode).filter(SkillGraphNode.learner_id == learner_id).delete()
    for skill in state.skills:
        db.add(SkillGraphNode(id=skill.name.casefold().replace(" ", "-"), learner_id=learner_id, label=skill.name, mastery=skill.mastery, status=skill.status))
    skill_ids = [skill.name.casefold().replace(" ", "-") for skill in state.skills]
    for source, target in zip(skill_ids, skill_ids[1:]):
        db.add(SkillGraphEdge(learner_id=learner_id, source_node_id=source, target_node_id=target))
