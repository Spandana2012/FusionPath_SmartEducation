from collections import defaultdict

from app.knowledge.learning_resources import LEARNING_RESOURCES, LearningResource
from app.schemas.profile import ExperienceLevel, LearnerProfile, LearningPreference
from app.schemas.recommendations import (
    RecommendationItem,
    RecommendationRequest,
    RecommendationResponse,
    SkillRecommendationGroup,
)
from app.schemas.skills import PriorityLabel, SkillGapItem
from app.services.skill_gap_service import match_role, normalize_key, normalize_skill


MAX_RECOMMENDATIONS = 15
MAX_RECOMMENDATIONS_PER_SKILL = 5
PRIORITY_ORDER: dict[PriorityLabel, int] = {"high": 3, "medium": 2, "low": 1}
PRIORITY_FACTOR: dict[PriorityLabel, float] = {"high": 1.0, "medium": 0.6, "low": 0.3}
DIFFICULTY_LEVEL = {"beginner": 1, "intermediate": 2, "advanced": 3}
EXPERIENCE_DIFFICULTY = {
    ExperienceLevel.beginner: "beginner",
    ExperienceLevel.intermediate: "intermediate",
    ExperienceLevel.advanced: "advanced",
}


def generate_recommendations(request: RecommendationRequest) -> RecommendationResponse:
    target_role = match_role(request.profile.goal).role

    if not request.skill_gaps:
        return RecommendationResponse(
            learner_id=request.learner_id,
            target_role=target_role,
            recommendations=[],
            skill_recommendations=[],
            uncovered_skills=[],
            message="No skill gaps were provided, so no recommendations were generated.",
        )

    scored_items = [
        build_recommendation_item(resource, request.profile, request.skill_gaps)
        for resource in get_relevant_resources(request.skill_gaps)
        if not is_completed_duplicate(resource, request.profile, request.skill_gaps)
    ]
    ranked = rank_recommendations(scored_items)
    selected = ranked[:MAX_RECOMMENDATIONS]
    skill_recommendations = group_by_skill(selected, request.skill_gaps)
    uncovered_skills = get_uncovered_skills(request.skill_gaps, ranked)
    message = build_response_message(selected, uncovered_skills)

    return RecommendationResponse(
        learner_id=request.learner_id,
        target_role=target_role,
        recommendations=selected,
        skill_recommendations=skill_recommendations,
        uncovered_skills=uncovered_skills,
        message=message,
    )


def get_relevant_resources(skill_gaps: list[SkillGapItem]) -> list[LearningResource]:
    gap_keys = {normalize_key(gap.skill) for gap in skill_gaps}
    return [
        resource
        for resource in LEARNING_RESOURCES
        if {normalize_key(skill) for skill in resource.skills} & gap_keys
    ]


def build_recommendation_item(
    resource: LearningResource,
    profile: LearnerProfile,
    skill_gaps: list[SkillGapItem],
) -> RecommendationItem:
    addressed_gaps = get_addressed_gaps(resource, skill_gaps)
    primary_gap = sorted(
        addressed_gaps,
        key=lambda gap: (-PRIORITY_ORDER[gap.priority], -gap.priority_score, gap.skill),
    )[0]
    score = calculate_recommendation_score(resource, profile, skill_gaps)

    return RecommendationItem(
        resource_id=resource.id,
        title=resource.title,
        type=resource.type,
        provider=resource.provider,
        url=resource.url,
        description=resource.description,
        skill=primary_gap.skill,
        skills=list(resource.skills),
        difficulty=resource.difficulty,
        estimated_hours=resource.estimated_hours,
        match_score=score,
        priority=primary_gap.priority,
        reason=build_recommendation_reason(resource, profile, addressed_gaps),
    )


def get_addressed_gaps(resource: LearningResource, skill_gaps: list[SkillGapItem]) -> list[SkillGapItem]:
    resource_keys = {normalize_key(skill) for skill in resource.skills}
    return [gap for gap in skill_gaps if normalize_key(gap.skill) in resource_keys]


def calculate_skill_relevance(resource: LearningResource, skill_gaps: list[SkillGapItem]) -> float:
    if not skill_gaps:
        return 0.0

    addressed_count = len(get_addressed_gaps(resource, skill_gaps))
    return min(addressed_count / min(len(skill_gaps), 3), 1.0)


def calculate_priority_factor(resource: LearningResource, skill_gaps: list[SkillGapItem]) -> float:
    addressed = get_addressed_gaps(resource, skill_gaps)
    if not addressed:
        return 0.0
    return max(PRIORITY_FACTOR[gap.priority] for gap in addressed)


def calculate_preference_match(resource: LearningResource, preference: LearningPreference) -> float:
    formats = {format_name.casefold() for format_name in resource.learning_formats}

    if preference == LearningPreference.project_based:
        return 1.0 if resource.project_based else 0.45 if "hands_on" in formats else 0.25
    if preference == LearningPreference.video:
        return 1.0 if "video" in formats else 0.35
    if preference == LearningPreference.reading:
        if "reading" in formats:
            return 1.0
        if resource.type == "tutorial" or "hands_on" in formats:
            return 0.75
        return 0.35
    if preference == LearningPreference.structured_courses:
        return 1.0 if resource.type == "course" or "course" in formats else 0.45
    if preference == LearningPreference.mixed:
        return min(0.45 + (len(formats) * 0.18), 1.0)
    return 0.5


def calculate_difficulty_fit(resource: LearningResource, experience: ExperienceLevel) -> float:
    preferred = EXPERIENCE_DIFFICULTY[experience]
    distance = abs(DIFFICULTY_LEVEL[resource.difficulty] - DIFFICULTY_LEVEL[preferred])
    if distance == 0:
        return 1.0
    if distance == 1:
        return 0.7
    return 0.35


def calculate_time_fit(resource: LearningResource, weekly_hours: int) -> float:
    if resource.estimated_hours <= weekly_hours:
        return 1.0
    if resource.estimated_hours <= weekly_hours + 1:
        return 1.0
    if resource.estimated_hours <= weekly_hours * 2:
        return 0.2
    if resource.estimated_hours <= weekly_hours * 4:
        return 0.45
    return 0.15


def calculate_prerequisite_value(resource: LearningResource, skill_gaps: list[SkillGapItem]) -> float:
    gap_keys = {normalize_key(gap.skill) for gap in skill_gaps}
    prerequisite_keys = {normalize_key(skill) for skill in resource.prerequisites}
    resource_skill_keys = {normalize_key(skill) for skill in resource.skills}

    if resource_skill_keys & prerequisite_keys & gap_keys:
        return 1.0
    if resource_skill_keys & gap_keys and prerequisite_keys & gap_keys:
        return 0.75
    if resource_skill_keys & gap_keys:
        return 0.5
    return 0.0


def calculate_recommendation_score(
    resource: LearningResource,
    profile: LearnerProfile,
    skill_gaps: list[SkillGapItem],
) -> int:
    """Calculate a deterministic 0-100 recommendation score.

    Formula:
    0.35 * skill_relevance
    + 0.20 * priority_factor
    + 0.15 * preference_match
    + 0.10 * difficulty_fit
    + 0.10 * time_fit
    + 0.10 * prerequisite_value
    """
    score = (
        0.35 * calculate_skill_relevance(resource, skill_gaps)
        + 0.20 * calculate_priority_factor(resource, skill_gaps)
        + 0.15 * calculate_preference_match(resource, profile.learning_preference)
        + 0.10 * calculate_difficulty_fit(resource, profile.experience_level)
        + 0.10 * calculate_time_fit(resource, profile.weekly_hours)
        + 0.10 * calculate_prerequisite_value(resource, skill_gaps)
    )
    return round(max(0.0, min(score, 1.0)) * 100)


def build_recommendation_reason(
    resource: LearningResource,
    profile: LearnerProfile,
    addressed_gaps: list[SkillGapItem],
) -> str:
    priority_gap = sorted(
        addressed_gaps,
        key=lambda gap: (-PRIORITY_ORDER[gap.priority], -gap.priority_score, gap.skill),
    )[0]
    preference_phrase = get_preference_reason(resource, profile.learning_preference)
    difficulty_phrase = (
        "fits your current experience level"
        if calculate_difficulty_fit(resource, profile.experience_level) == 1.0
        else "adds useful depth without being used as a hard filter"
    )
    skill_phrase = (
        f"{len(addressed_gaps)} skill gaps"
        if len(addressed_gaps) > 1
        else f"your {priority_gap.skill} gap"
    )

    return (
        f"This {resource.difficulty} {resource.type} addresses {skill_phrase}, "
        f"including a {priority_gap.priority}-priority {priority_gap.skill} need, "
        f"{preference_phrase}, and {difficulty_phrase}."
    )


def get_preference_reason(resource: LearningResource, preference: LearningPreference) -> str:
    if preference == LearningPreference.project_based and resource.project_based:
        return "matches your project-based learning preference"
    if preference == LearningPreference.video and "video" in resource.learning_formats:
        return "matches your video learning preference"
    if preference == LearningPreference.reading and "reading" in resource.learning_formats:
        return "matches your reading learning preference"
    if preference == LearningPreference.structured_courses and resource.type == "course":
        return "matches your structured-course learning preference"
    if preference == LearningPreference.mixed and len(resource.learning_formats) >= 3:
        return "supports your mixed learning preference"
    return "keeps skill relevance ahead of format preference"


def rank_recommendations(items: list[RecommendationItem]) -> list[RecommendationItem]:
    deduped: dict[str, RecommendationItem] = {}
    for item in items:
        existing = deduped.get(item.resource_id)
        if existing is None or sort_key(item) < sort_key(existing):
            deduped[item.resource_id] = item

    return sorted(deduped.values(), key=sort_key)


def sort_key(item: RecommendationItem) -> tuple[int, int, int, str]:
    return (-item.match_score, -PRIORITY_ORDER[item.priority], item.estimated_hours, item.title)


def group_by_skill(
    recommendations: list[RecommendationItem],
    skill_gaps: list[SkillGapItem],
) -> list[SkillRecommendationGroup]:
    grouped: dict[str, list[RecommendationItem]] = defaultdict(list)

    for recommendation in recommendations:
        recommendation_skill_keys = {normalize_key(skill) for skill in recommendation.skills}
        for gap in skill_gaps:
            if normalize_key(gap.skill) in recommendation_skill_keys:
                grouped[gap.skill].append(recommendation)

    groups: list[SkillRecommendationGroup] = []
    for gap in skill_gaps:
        items = rank_recommendations(grouped.get(gap.skill, []))[:MAX_RECOMMENDATIONS_PER_SKILL]
        if items:
            groups.append(SkillRecommendationGroup(skill=gap.skill, recommendations=items))
    return groups


def get_uncovered_skills(skill_gaps: list[SkillGapItem], recommendations: list[RecommendationItem]) -> list[str]:
    covered_keys = {
        normalize_key(skill)
        for recommendation in recommendations
        for skill in recommendation.skills
    }
    return [gap.skill for gap in skill_gaps if normalize_key(gap.skill) not in covered_keys]


def build_response_message(recommendations: list[RecommendationItem], uncovered_skills: list[str]) -> str:
    if not recommendations:
        return "No matching learning resources were found for the provided skill gaps."
    if uncovered_skills:
        return "Personalized recommendations generated with some uncovered skills."
    return "Personalized recommendations generated successfully"


def is_completed_duplicate(
    resource: LearningResource,
    profile: LearnerProfile,
    skill_gaps: list[SkillGapItem],
) -> bool:
    completed_names = {normalize_key(course.name) for course in profile.completed_courses}
    if normalize_key(resource.title) in completed_names:
        return True

    completed_skill_keys = {
        normalize_key(normalize_skill(skill))
        for course in profile.completed_courses
        for skill in course.skills
    }
    resource_skill_keys = {normalize_key(normalize_skill(skill)) for skill in resource.skills}
    gap_skill_keys = {normalize_key(gap.skill) for gap in skill_gaps}

    if not completed_skill_keys & resource_skill_keys:
        return False

    still_gap_skills = resource_skill_keys & gap_skill_keys
    if still_gap_skills and resource.difficulty != "beginner":
        return False

    return resource.difficulty == "beginner" and resource_skill_keys <= completed_skill_keys
