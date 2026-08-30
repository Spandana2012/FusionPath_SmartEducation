from __future__ import annotations

from collections import defaultdict

from pydantic import ValidationError

from app.ai.path_generator import AIGenerationError, generate_path_with_ai, is_llm_configured
from app.schemas.learning_path import (
    LearningMilestone,
    LearningPath,
    LearningPathRequest,
    LearningPathResponse,
)
from app.schemas.profile import ExperienceLevel, LearnerProfile, LearningPreference
from app.schemas.recommendations import RecommendationItem
from app.schemas.skills import SkillGapItem
from app.services.recommendation_service import PRIORITY_ORDER
from app.services.skill_gap_service import match_role, normalize_key, normalize_skill


HOURS_PER_MONTH = 4.33
BUDGET_MARGIN = 0.9
DIFFICULTY_LEVEL = {"beginner": 1, "intermediate": 2, "advanced": 3}
EXPERIENCE_DIFFICULTY = {
    ExperienceLevel.beginner: "beginner",
    ExperienceLevel.intermediate: "intermediate",
    ExperienceLevel.advanced: "advanced",
}


def generate_learning_path(request: LearningPathRequest) -> LearningPathResponse:
    target_role = match_role(request.profile.goal).role

    if not request.skill_gaps:
        return build_empty_response(
            request,
            target_role,
            "Skill-gap analysis is required before a learning path can be generated.",
        )

    if not request.recommendations:
        return build_empty_response(
            request,
            target_role,
            "Recommendations are required before a learning path can be generated.",
        )

    if is_llm_configured():
        try:
            ai_payload = generate_path_with_ai(request)
            ai_response = LearningPathResponse.model_validate(ai_payload)
            validate_grounded_response(ai_response, request)
            return ai_response.model_copy(update={"ai_generated": True})
        except (AIGenerationError, ValidationError, ValueError):
            pass

    return generate_path_deterministic(request, ai_generated=False)


def generate_path_deterministic(
    request: LearningPathRequest,
    ai_generated: bool = False,
) -> LearningPathResponse:
    target_role = match_role(request.profile.goal).role
    ordered_gaps = order_skill_gaps(request.skill_gaps, request.profile)
    milestones = build_milestones(ordered_gaps, request.recommendations, request.profile)
    summary = build_summary(request.profile, target_role, ordered_gaps, milestones)
    reasoning = build_reasoning(request.profile, target_role, ordered_gaps, milestones)
    path = LearningPath(
        title=f"{target_role} Personalized Learning Path",
        duration_months=request.profile.timeline_months,
        weekly_hours=request.profile.weekly_hours,
        summary=summary,
        milestones=milestones,
    )

    return LearningPathResponse(
        learner_id=request.learner_id,
        target_role=target_role,
        path=path,
        reasoning=reasoning,
        ai_generated=ai_generated,
        message=build_message(milestones),
        path_quality_score=calculate_path_quality_score(request, milestones),
    )


def build_empty_response(
    request: LearningPathRequest,
    target_role: str,
    message: str,
) -> LearningPathResponse:
    path = LearningPath(
        title=f"{target_role} Personalized Learning Path",
        duration_months=request.profile.timeline_months,
        weekly_hours=request.profile.weekly_hours,
        summary=(
            f"This path targets {target_role}, but more upstream analysis is needed before "
            "FusionPath can sequence resources into milestones."
        ),
        milestones=[],
    )
    return LearningPathResponse(
        learner_id=request.learner_id,
        target_role=target_role,
        path=path,
        reasoning=message,
        ai_generated=False,
        message=message,
        path_quality_score=0,
    )


def order_skill_gaps(skill_gaps: list[SkillGapItem], profile: LearnerProfile) -> list[SkillGapItem]:
    gap_by_key = {normalize_key(gap.skill): gap for gap in sorted_gaps(skill_gaps)}
    satisfied = get_satisfied_skill_keys(profile)
    visiting: set[str] = set()
    visited: set[str] = set()
    ordered: list[SkillGapItem] = []

    def visit(gap_key: str) -> None:
        if gap_key in visited or gap_key in visiting:
            return
        gap = gap_by_key.get(gap_key)
        if gap is None:
            return

        visiting.add(gap_key)
        for prerequisite in gap.prerequisites:
            prerequisite_key = normalize_key(prerequisite)
            if prerequisite_key in gap_by_key and prerequisite_key not in satisfied:
                visit(prerequisite_key)
        visiting.remove(gap_key)
        visited.add(gap_key)
        ordered.append(gap)

    for gap in sorted_gaps(skill_gaps):
        visit(normalize_key(gap.skill))

    return ordered


def sorted_gaps(skill_gaps: list[SkillGapItem]) -> list[SkillGapItem]:
    return sorted(
        skill_gaps,
        key=lambda gap: (-gap.priority_score, -gap.importance, -gap.gap_score, gap.skill),
    )


def build_milestones(
    ordered_gaps: list[SkillGapItem],
    recommendations: list[RecommendationItem],
    profile: LearnerProfile,
) -> list[LearningMilestone]:
    recommendations_by_skill = group_recommendations_by_skill(recommendations)
    gap_keys = {normalize_key(gap.skill) for gap in ordered_gaps}
    used_resource_ids: set[str] = set()
    hours_budget = int(profile.timeline_months * HOURS_PER_MONTH * profile.weekly_hours * BUDGET_MARGIN)
    consumed_hours = 0
    milestones: list[LearningMilestone] = []

    for gap in ordered_gaps:
        relevant = recommendations_by_skill.get(normalize_key(gap.skill), [])
        selected: list[RecommendationItem] = []

        for recommendation in rank_skill_recommendations(relevant, gap, profile):
            recommendation_primary_key = normalize_key(recommendation.skill)
            if recommendation_primary_key in gap_keys and recommendation_primary_key != normalize_key(gap.skill):
                continue
            if recommendation.resource_id in used_resource_ids:
                continue
            if consumed_hours + recommendation.estimated_hours > hours_budget and selected:
                continue
            if consumed_hours + recommendation.estimated_hours > hours_budget and milestones:
                continue

            selected.append(recommendation)
            used_resource_ids.add(recommendation.resource_id)
            consumed_hours += recommendation.estimated_hours

            if enough_resources_for_skill(selected, profile):
                break

        if not selected:
            continue

        milestones.append(
            LearningMilestone(
                id=f"milestone-{len(milestones) + 1}",
                order=len(milestones) + 1,
                title=build_milestone_title(gap, selected),
                description=build_milestone_description(gap, selected),
                estimated_hours=sum(resource.estimated_hours for resource in selected),
                skills=[gap.skill],
                resource_ids=[resource.resource_id for resource in selected],
                resources=selected,
                assessment=build_assessment(gap, selected),
                completion_criteria=build_completion_criteria(gap, selected),
            )
        )

    return milestones


def group_recommendations_by_skill(
    recommendations: list[RecommendationItem],
) -> dict[str, list[RecommendationItem]]:
    grouped: dict[str, list[RecommendationItem]] = defaultdict(list)
    for recommendation in recommendations:
        keys = {normalize_key(recommendation.skill), *(normalize_key(skill) for skill in recommendation.skills)}
        for key in keys:
            grouped[key].append(recommendation)
    return grouped


def rank_skill_recommendations(
    recommendations: list[RecommendationItem],
    gap: SkillGapItem,
    profile: LearnerProfile,
) -> list[RecommendationItem]:
    return sorted(
        recommendations,
        key=lambda recommendation: (
            primary_skill_mismatch(recommendation, gap),
            resource_phase(recommendation, profile),
            -recommendation.match_score,
            -PRIORITY_ORDER[recommendation.priority],
            difficulty_distance(recommendation, profile),
            recommendation.estimated_hours,
            recommendation.title,
        ),
    )


def primary_skill_mismatch(recommendation: RecommendationItem, gap: SkillGapItem) -> int:
    return 0 if normalize_key(recommendation.skill) == normalize_key(gap.skill) else 1


def resource_phase(recommendation: RecommendationItem, profile: LearnerProfile) -> int:
    if recommendation.type == "assessment":
        return 3
    if recommendation.type == "project":
        return 1 if profile.learning_preference == LearningPreference.project_based else 2
    if recommendation.type in {"course", "tutorial", "article", "video"}:
        return 0
    return 2


def difficulty_distance(recommendation: RecommendationItem, profile: LearnerProfile) -> int:
    preferred = EXPERIENCE_DIFFICULTY[profile.experience_level]
    return abs(DIFFICULTY_LEVEL[recommendation.difficulty] - DIFFICULTY_LEVEL[preferred])


def enough_resources_for_skill(selected: list[RecommendationItem], profile: LearnerProfile) -> bool:
    if profile.learning_preference == LearningPreference.project_based:
        return len(selected) >= 3 or any(resource.type == "project" for resource in selected)
    if profile.learning_preference == LearningPreference.structured_courses:
        return len(selected) >= 2
    return len(selected) >= 2 or sum(resource.estimated_hours for resource in selected) >= profile.weekly_hours


def build_milestone_title(gap: SkillGapItem, resources: list[RecommendationItem]) -> str:
    has_project = any(resource.type == "project" for resource in resources)
    if has_project:
        return f"Apply {gap.skill}"
    if gap.current_level == 0:
        return f"Build {gap.skill} Foundations"
    return f"Strengthen {gap.skill}"


def build_milestone_description(gap: SkillGapItem, resources: list[RecommendationItem]) -> str:
    resource_types = ordered_unique([resource.type for resource in resources])
    return (
        f"Close the {gap.priority}-priority {gap.skill} gap with "
        f"{', '.join(resource_types)} resources selected from your recommendations."
    )


def build_assessment(gap: SkillGapItem, resources: list[RecommendationItem]) -> str:
    if any(resource.type == "project" for resource in resources):
        return f"Build a working {gap.skill} artifact and explain the major design decisions."
    if any(resource.type == "assessment" for resource in resources):
        return f"Complete the {gap.skill} assessment and review every missed concept."
    return f"Complete a concept check and produce a short implementation plan for applying {gap.skill}."


def build_completion_criteria(gap: SkillGapItem, resources: list[RecommendationItem]) -> list[str]:
    criteria = [
        f"Explain the role of {gap.skill} in the target role workflow",
        f"Complete the selected {gap.skill} resources without skipping exercises",
    ]
    related_skills = ordered_unique(
        skill
        for resource in resources
        for skill in resource.skills
        if normalize_key(skill) != normalize_key(gap.skill)
    )
    if related_skills:
        criteria.append(f"Connect {gap.skill} to {', '.join(related_skills[:2])}")
    if any(resource.type == "project" for resource in resources):
        criteria.append(f"Ship a small project demonstrating {gap.skill}")
    else:
        criteria.append(f"Create notes or examples that demonstrate {gap.skill} in practice")
    return criteria[:4]


def build_summary(
    profile: LearnerProfile,
    target_role: str,
    ordered_gaps: list[SkillGapItem],
    milestones: list[LearningMilestone],
) -> str:
    priority_skills = ", ".join(gap.skill for gap in ordered_gaps[:3]) or "the provided skill gaps"
    return (
        f"This path prepares you for {target_role} from a {profile.experience_level.value} starting point. "
        f"It prioritizes {priority_skills}, uses your {profile.learning_preference.value} learning preference, "
        f"and fits around {profile.weekly_hours} hours per week over {profile.timeline_months} months. "
        f"The sequence starts with prerequisite skills before moving into applied work across "
        f"{len(milestones)} milestones."
    )


def build_reasoning(
    profile: LearnerProfile,
    target_role: str,
    ordered_gaps: list[SkillGapItem],
    milestones: list[LearningMilestone],
) -> str:
    ordered_skill_names = [gap.skill for gap in ordered_gaps]
    high_priority = [gap.skill for gap in ordered_gaps if gap.priority == "high"]
    total_hours = sum(milestone.estimated_hours for milestone in milestones)
    available_hours = int(profile.timeline_months * HOURS_PER_MONTH * profile.weekly_hours)
    return (
        f"The roadmap targets {target_role} and orders skills as {', '.join(ordered_skill_names)} based on "
        f"priority score, importance, gap size, and prerequisite relationships. "
        f"High-priority coverage focuses on {', '.join(high_priority) or 'the highest-ranked gaps'}. "
        f"Selected resources total {total_hours} hours against roughly {available_hours} available hours, "
        f"leaving room for practice, review, and assessment."
    )


def build_message(milestones: list[LearningMilestone]) -> str:
    if not milestones:
        return "No grounded roadmap milestones could be generated from the supplied recommendations."
    return "Personalized learning path generated successfully"


def calculate_path_quality_score(
    request: LearningPathRequest,
    milestones: list[LearningMilestone],
) -> int:
    if not request.skill_gaps or not milestones:
        return 0

    milestone_skill_keys = {
        normalize_key(skill)
        for milestone in milestones
        for skill in milestone.skills
    }
    resource_ids = [resource_id for milestone in milestones for resource_id in milestone.resource_ids]
    recommendation_by_id = {recommendation.resource_id: recommendation for recommendation in request.recommendations}
    covered_gaps = [
        gap for gap in request.skill_gaps if normalize_key(gap.skill) in milestone_skill_keys
    ]
    high_priority_gaps = [gap for gap in request.skill_gaps if gap.priority == "high"]
    covered_high_priority = [
        gap for gap in high_priority_gaps if normalize_key(gap.skill) in milestone_skill_keys
    ]
    total_hours = sum(milestone.estimated_hours for milestone in milestones)
    available_hours = request.profile.timeline_months * HOURS_PER_MONTH * request.profile.weekly_hours
    project_resources = [
        recommendation_by_id[resource_id]
        for resource_id in resource_ids
        if resource_id in recommendation_by_id and recommendation_by_id[resource_id].type == "project"
    ]

    coverage_score = len(covered_gaps) / len(request.skill_gaps)
    priority_score = (
        len(covered_high_priority) / len(high_priority_gaps)
        if high_priority_gaps
        else 1.0
    )
    grounding_score = 1.0 if len(resource_ids) == len(set(resource_ids)) else 0.5
    timeline_score = 1.0 if total_hours <= available_hours * BUDGET_MARGIN else 0.6
    preference_score = (
        1.0
        if request.profile.learning_preference != LearningPreference.project_based or project_resources
        else 0.6
    )
    score = (
        0.35 * coverage_score
        + 0.25 * priority_score
        + 0.15 * grounding_score
        + 0.15 * timeline_score
        + 0.10 * preference_score
    )
    return round(max(0, min(score, 1)) * 100)


def validate_grounded_response(response: LearningPathResponse, request: LearningPathRequest) -> None:
    recommendation_by_id = {
        recommendation.resource_id: recommendation
        for recommendation in request.recommendations
    }
    seen_resource_ids: set[str] = set()
    allowed_skill_keys = get_allowed_skill_keys(request)
    total_hours = 0

    for milestone in response.path.milestones:
        total_hours += milestone.estimated_hours
        expected_hours = 0
        if len(milestone.resource_ids) != len(set(milestone.resource_ids)):
            raise ValueError("Duplicate resource IDs are not allowed.")

        for resource_id, resource in zip(milestone.resource_ids, milestone.resources, strict=True):
            source = recommendation_by_id.get(resource_id)
            if source is None:
                raise ValueError(f"Unknown resource ID: {resource_id}")
            if resource_id in seen_resource_ids:
                raise ValueError(f"Duplicate resource ID: {resource_id}")
            if resource.resource_id != source.resource_id:
                raise ValueError("Milestone resource ID does not match source recommendation.")
            if resource.url != source.url:
                raise ValueError("Milestone resource URL does not match source recommendation.")
            if resource.title != source.title:
                raise ValueError("Milestone resource title does not match source recommendation.")
            if resource.provider != source.provider:
                raise ValueError("Milestone resource provider does not match source recommendation.")
            if resource.estimated_hours != source.estimated_hours:
                raise ValueError("Milestone resource hours do not match source recommendation.")
            expected_hours += source.estimated_hours
            seen_resource_ids.add(resource_id)

        if milestone.estimated_hours != expected_hours:
            raise ValueError("Milestone estimated hours must equal selected resource hours.")
        for skill in milestone.skills:
            if normalize_key(skill) not in allowed_skill_keys:
                raise ValueError(f"Unknown skill referenced: {skill}")

    available_hours = request.profile.timeline_months * HOURS_PER_MONTH * request.profile.weekly_hours
    if total_hours > available_hours:
        raise ValueError("Generated path exceeds available timeline hours.")


def get_allowed_skill_keys(request: LearningPathRequest) -> set[str]:
    return {
        *(normalize_key(normalize_skill(skill)) for skill in request.profile.skills),
        *(normalize_key(gap.skill) for gap in request.skill_gaps),
        *(
            normalize_key(skill)
            for recommendation in request.recommendations
            for skill in recommendation.skills
        ),
        *(normalize_key(recommendation.skill) for recommendation in request.recommendations),
    }


def get_satisfied_skill_keys(profile: LearnerProfile) -> set[str]:
    return {
        *(normalize_key(normalize_skill(skill)) for skill in profile.skills),
        *(
            normalize_key(normalize_skill(skill))
            for course in profile.completed_courses
            for skill in course.skills
        ),
    }


def ordered_unique(items) -> list:
    values = list(items)
    seen: set[str] = set()
    unique = []
    for item in values:
        key = normalize_key(str(item))
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique
