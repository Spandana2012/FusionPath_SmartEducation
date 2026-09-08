from sqlalchemy.orm import Session

from app.models import Learner, User
from app.schemas.profile import CompletedCourse, LearnerProfile, LearnerProfileRequest, LearnerProfileResponse


ACRONYMS = {
    "ai": "AI",
    "api": "API",
    "aws": "AWS",
    "css": "CSS",
    "gcp": "GCP",
    "html": "HTML",
    "llm": "LLM",
    "ml": "ML",
    "rag": "RAG",
    "sql": "SQL",
    "ui": "UI",
    "ux": "UX",
}


def analyze_profile(profile: LearnerProfileRequest, db: Session, user: User | None = None) -> LearnerProfileResponse:
    normalized_profile = LearnerProfile(
        goal=normalize_whitespace(profile.goal),
        experience_level=profile.experience_level,
        skills=dedupe_strings(profile.skills),
        completed_courses=normalize_completed_courses(profile.completed_courses),
        weekly_hours=profile.weekly_hours,
        learning_preference=profile.learning_preference,
        timeline_months=profile.timeline_months,
    )

    learner = Learner(
        user_id=user.id if user else None,
        goal=normalized_profile.goal,
        experience_level=normalized_profile.experience_level.value,
        skills=normalized_profile.skills,
        completed_courses=[course.model_dump() for course in normalized_profile.completed_courses],
        weekly_hours=normalized_profile.weekly_hours,
        learning_preference=normalized_profile.learning_preference.value,
        timeline_months=normalized_profile.timeline_months,
    )
    db.add(learner)
    db.commit()
    db.refresh(learner)

    return LearnerProfileResponse(
        learner_id=learner.id,
        profile=normalized_profile,
        message="Learner profile created successfully",
    )


def normalize_completed_courses(courses: list[CompletedCourse]) -> list[CompletedCourse]:
    normalized_courses: list[CompletedCourse] = []
    seen_courses: set[str] = set()

    for course in courses:
        name = normalize_whitespace(course.name)
        key = name.casefold()
        if key in seen_courses:
            continue
        seen_courses.add(key)
        normalized_courses.append(CompletedCourse(name=name, skills=dedupe_strings(course.skills)))

    return normalized_courses


def dedupe_strings(values: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()

    for value in values:
        label = normalize_label(value)
        key = label.casefold()
        if key and key not in seen:
            seen.add(key)
            normalized.append(label)

    return normalized


def normalize_label(value: str) -> str:
    text = normalize_whitespace(value)
    acronym = ACRONYMS.get(text.casefold())
    if acronym:
        return acronym
    return " ".join(normalize_word(word) for word in text.split(" "))


def normalize_word(word: str) -> str:
    acronym = ACRONYMS.get(word.casefold())
    if acronym:
        return acronym
    return word[:1].upper() + word[1:].lower()


def normalize_whitespace(value: str) -> str:
    return " ".join(value.strip().split())
