from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Learner, MistakeEvent, PracticeAttempt
from app.schemas.adaptive import LearnerContextResponse, LearnerProgress
from app.schemas.learning_path import LearningPathRequest
from app.schemas.profile import CompletedCourse, ExperienceLevel, LearnerProfile
from app.schemas.recommendations import RecommendationRequest
from app.schemas.skills import SkillGapRequest
from app.services.learning_path_service import generate_learning_path
from app.services.recommendation_service import generate_recommendations
from app.services.skill_gap_service import analyze_skill_gap


def get_learner_context(db: Session, learner: Learner) -> LearnerContextResponse:
    profile = LearnerProfile(
        goal=learner.goal,
        experience_level=ExperienceLevel(learner.experience_level),
        skills=list(learner.skills or []),
        completed_courses=[CompletedCourse.model_validate(course) for course in (learner.completed_courses or [])],
        weekly_hours=learner.weekly_hours,
        learning_preference=learner.learning_preference,
        timeline_months=learner.timeline_months,
    )
    skill_gap = analyze_skill_gap(SkillGapRequest(learner_id=learner.id, profile=profile))
    recommendations = generate_recommendations(
        RecommendationRequest(learner_id=learner.id, profile=profile, skill_gaps=skill_gap.skill_gaps)
    )
    learning_path = generate_learning_path(
        LearningPathRequest(
            learner_id=learner.id,
            profile=profile,
            skill_gaps=skill_gap.skill_gaps,
            recommendations=recommendations.recommendations,
        )
    )
    completed_lessons = _completed_lessons(db, learner.id)
    milestone_ids = {milestone.id for milestone in learning_path.path.milestones}
    completed_milestones = len(milestone_ids.intersection(completed_lessons))
    current_milestone = next(
        (milestone.title for milestone in learning_path.path.milestones if milestone.id not in completed_lessons),
        None,
    )

    return LearnerContextResponse(
        learner_id=learner.id,
        profile=profile,
        skill_gap=skill_gap,
        recommendations=recommendations,
        learning_path=learning_path,
        progress=LearnerProgress(
            completed_milestones=completed_milestones,
            total_milestones=len(learning_path.path.milestones),
            current_milestone=current_milestone,
            practice_attempts=db.scalar(
                select(func.count(PracticeAttempt.id)).where(PracticeAttempt.learner_id == learner.id)
            )
            or 0,
            mistake_events=db.scalar(
                select(func.count(MistakeEvent.id)).where(MistakeEvent.learner_id == learner.id)
            )
            or 0,
            completed_lessons=completed_lessons,
        ),
    )


def _completed_lessons(db: Session, learner_id: str) -> list[str]:
    # Completion is currently recorded by the adaptive state API. Keeping this
    # read isolated makes it easy to add a dedicated completion event later.
    from app.services.adaptive_persistence_service import current_state

    state = current_state(db, learner_id)
    if not state or not state.state:
        return []
    lessons = state.state.get("completedLessons", [])
    return [lesson for lesson in lessons if isinstance(lesson, str)]
