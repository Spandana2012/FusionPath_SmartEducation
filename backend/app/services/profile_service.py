from uuid import uuid4

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


def analyze_profile(profile: LearnerProfileRequest) -> LearnerProfileResponse:
    normalized_profile = LearnerProfile(
        goal=normalize_whitespace(profile.goal),
        experience_level=profile.experience_level,
        skills=dedupe_strings(profile.skills),
        completed_courses=normalize_completed_courses(profile.completed_courses),
        weekly_hours=profile.weekly_hours,
        learning_preference=profile.learning_preference,
        timeline_months=profile.timeline_months,
    )

    return LearnerProfileResponse(
        # Temporary until learner profiles are persisted in the future database layer.
        learner_id=str(uuid4()),
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
