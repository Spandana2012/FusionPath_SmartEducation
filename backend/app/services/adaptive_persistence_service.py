from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import Learner, RoadmapState, SkillGraphEdge, SkillGraphNode
from app.schemas.adaptive import LearnerStatePayload


def default_state() -> LearnerStatePayload:
    return LearnerStatePayload(name="Alex", goal="Cloud Engineer", readiness=42, skills=[
        {"name": "Java", "mastery": 90, "status": "mastered"}, {"name": "Spring Boot", "mastery": 80, "status": "strong"},
        {"name": "Linux", "mastery": 75, "status": "strong"}, {"name": "Networking", "mastery": 52, "status": "learning"},
        {"name": "Docker", "mastery": 60, "status": "learning"}, {"name": "AWS", "mastery": 40, "status": "weak"},
        {"name": "Kubernetes", "mastery": 20, "status": "locked"}, {"name": "Terraform", "mastery": 15, "status": "locked"},
    ], completedLessons=[], mistakes={"Security groups vs NACLs": 3, "Public subnet vs public IP": 2}, adapted=False, activity={"minutes": 145, "questions": 12, "projects": 1})


def create_demo_learner(db: Session, state: LearnerStatePayload | None = None) -> tuple[Learner, RoadmapState]:
    state = state or default_state()
    learner = Learner(goal=state.goal, experience_level="beginner", skills=[item.name for item in state.skills], completed_courses=[], weekly_hours=5, learning_preference="mixed", timeline_months=6)
    db.add(learner); db.flush()
    roadmap = RoadmapState(learner_id=learner.id, version=1, state=state.model_dump(mode="json"), change_reason="Imported demo state")
    db.add(roadmap)
    replace_skill_graph(db, learner.id, state)
    db.commit(); db.refresh(roadmap)
    return learner, roadmap


def current_state(db: Session, learner_id: str) -> RoadmapState | None:
    return db.scalar(select(RoadmapState).where(RoadmapState.learner_id == learner_id, RoadmapState.is_current.is_(True)).order_by(RoadmapState.version.desc()))


def save_initial_state(db: Session, learner_id: str, state: LearnerStatePayload) -> RoadmapState:
    roadmap = RoadmapState(learner_id=learner_id, version=1, state=state.model_dump(mode="json"), change_reason="Initialized from learner profile")
    db.add(roadmap); replace_skill_graph(db, learner_id, state); db.commit(); db.refresh(roadmap)
    return roadmap


def save_state(db: Session, learner_id: str, state: LearnerStatePayload, reason: str = "Learner state synced") -> RoadmapState:
    current = current_state(db, learner_id)
    if current is None: raise LookupError("Learner roadmap not found")
    db.execute(update(RoadmapState).where(RoadmapState.id == current.id).values(is_current=False))
    roadmap = RoadmapState(learner_id=learner_id, version=current.version + 1, state=state.model_dump(mode="json"), change_reason=reason)
    db.add(roadmap); replace_skill_graph(db, learner_id, state); db.commit(); db.refresh(roadmap)
    return roadmap


def replace_skill_graph(db: Session, learner_id: str, state: LearnerStatePayload) -> None:
    db.query(SkillGraphEdge).filter(SkillGraphEdge.learner_id == learner_id).delete()
    db.query(SkillGraphNode).filter(SkillGraphNode.learner_id == learner_id).delete()
    for skill in state.skills:
        db.add(SkillGraphNode(id=skill.name.casefold().replace(" ", "-"), learner_id=learner_id, label=skill.name, mastery=skill.mastery, status=skill.status))
    edges = [("cloud-engineer", "aws"), ("aws", "networking"), ("cloud-engineer", "docker"), ("docker", "kubernetes")]
    for source, target in edges: db.add(SkillGraphEdge(learner_id=learner_id, source_node_id=source, target_node_id=target))
