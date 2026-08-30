import re

from fastapi import HTTPException

from app.knowledge.skill_requirements import ROLE_REQUIREMENTS, RoleRequirement, SkillRequirement
from app.schemas.profile import ExperienceLevel, LearnerProfile
from app.schemas.skills import SkillGapItem, SkillGapRequest, SkillGapResponse, SkillStrengthItem
from app.services.profile_service import normalize_label


UNSUPPORTED_GOAL_MESSAGE = "Unsupported learning goal. Please choose a supported target role."

EXPLICIT_LEVEL_BY_EXPERIENCE = {
    ExperienceLevel.beginner: 1,
    ExperienceLevel.intermediate: 2,
    ExperienceLevel.advanced: 3,
}

COURSE_LEVEL_BY_EXPERIENCE = {
    ExperienceLevel.beginner: 1,
    ExperienceLevel.intermediate: 1,
    ExperienceLevel.advanced: 2,
}


def analyze_skill_gap(request: SkillGapRequest) -> SkillGapResponse:
    role = match_role(request.profile.goal)
    current_levels = infer_current_levels(request.profile, role)
    skill_gaps = build_skill_gap_items(role, current_levels)
    strengths = build_strength_items(role, current_levels)
    readiness_score = calculate_readiness(role, current_levels)

    return SkillGapResponse(
        learner_id=request.learner_id,
        target_role=role.role,
        matched_goal=role.role,
        readiness_score=readiness_score,
        readiness_label=get_readiness_label(readiness_score),
        skill_gaps=skill_gaps,
        strengths=strengths,
        missing_critical_skills=get_missing_critical_skills(skill_gaps),
        message="Skill gap analysis completed successfully",
    )


def match_role(goal: str) -> RoleRequirement:
    goal_key = normalize_key(goal)

    for role in ROLE_REQUIREMENTS:
        role_keys = {normalize_key(role.role), *(normalize_key(alias) for alias in role.aliases)}
        if goal_key in role_keys:
            return role

    raise HTTPException(status_code=400, detail=UNSUPPORTED_GOAL_MESSAGE)


def normalize_skill(skill: str, role: RoleRequirement | None = None) -> str:
    normalized_key = normalize_key(skill)
    for requirement in iter_skill_requirements(role):
        aliases = (requirement.name, *requirement.aliases)
        if normalized_key in {normalize_key(alias) for alias in aliases}:
            return requirement.name
    return normalize_label(skill)


def infer_current_levels(profile: LearnerProfile, role: RoleRequirement) -> dict[str, int]:
    levels: dict[str, int] = {}
    explicit_level = EXPLICIT_LEVEL_BY_EXPERIENCE[profile.experience_level]
    course_level = COURSE_LEVEL_BY_EXPERIENCE[profile.experience_level]

    for skill in profile.skills:
        canonical_skill = normalize_skill(skill, role)
        levels[canonical_skill] = max(levels.get(canonical_skill, 0), explicit_level)

    for course in profile.completed_courses:
        for skill in course.skills:
            canonical_skill = normalize_skill(skill, role)
            levels[canonical_skill] = max(levels.get(canonical_skill, 0), course_level)

    return levels


def calculate_gap(required_level: int, current_level: int) -> float:
    raw_gap = max(required_level - current_level, 0)
    return round(raw_gap / required_level, 2)


def calculate_priority(requirement: SkillRequirement, gap_score: float, role: RoleRequirement) -> float:
    base_priority = gap_score * requirement.importance
    prerequisite_boost = calculate_prerequisite_boost(requirement.name, role)
    return round(base_priority + (gap_score * prerequisite_boost), 2)


def calculate_readiness(role: RoleRequirement, current_levels: dict[str, int]) -> int:
    weighted_current = 0
    weighted_required = 0

    for requirement in role.skills:
        current_level = min(current_levels.get(requirement.name, 0), requirement.required_level)
        weighted_current += current_level * requirement.importance
        weighted_required += requirement.required_level * requirement.importance

    if weighted_required == 0:
        return 0

    score = round(100 * weighted_current / weighted_required)
    return max(0, min(score, 100))


def build_skill_gap_items(role: RoleRequirement, current_levels: dict[str, int]) -> list[SkillGapItem]:
    items: list[SkillGapItem] = []

    for requirement in role.skills:
        current_level = current_levels.get(requirement.name, 0)
        if current_level >= requirement.required_level:
            continue

        gap_score = calculate_gap(requirement.required_level, current_level)
        priority_score = calculate_priority(requirement, gap_score, role)
        items.append(
            SkillGapItem(
                skill=requirement.name,
                category=requirement.category,
                required_level=requirement.required_level,
                current_level=current_level,
                gap_score=gap_score,
                priority_score=priority_score,
                priority=get_priority_label(priority_score),
                importance=requirement.importance,
                status=get_skill_status(current_level, requirement.required_level),
                prerequisites=list(requirement.prerequisites),
                explanation=build_gap_explanation(requirement, current_level, priority_score),
            )
        )

    return sorted(items, key=lambda item: (-item.priority_score, -item.importance, item.skill))


def build_strength_items(role: RoleRequirement, current_levels: dict[str, int]) -> list[SkillStrengthItem]:
    strengths: list[SkillStrengthItem] = []

    for requirement in role.skills:
        current_level = current_levels.get(requirement.name, 0)
        if current_level < requirement.required_level:
            continue
        strengths.append(
            SkillStrengthItem(
                skill=requirement.name,
                category=requirement.category,
                current_level=current_level,
                required_level=requirement.required_level,
                importance=requirement.importance,
                explanation=(
                    f"Your current profile indicates sufficient {requirement.name} capability "
                    f"for this target role."
                ),
            )
        )

    return sorted(strengths, key=lambda item: (-item.importance, item.skill))


def calculate_prerequisite_boost(skill_name: str, role: RoleRequirement) -> float:
    dependent_importance = sum(
        requirement.importance for requirement in role.skills if skill_name in requirement.prerequisites
    )
    if dependent_importance == 0:
        return 0.0
    return min(dependent_importance * 0.1, 0.75)


def get_missing_critical_skills(skill_gaps: list[SkillGapItem]) -> list[str]:
    return [item.skill for item in skill_gaps if item.status == "missing"][:5]


def get_skill_status(current_level: int, required_level: int) -> str:
    if current_level >= required_level:
        return "strong"
    if current_level > 0:
        return "developing"
    return "missing"


def get_priority_label(priority_score: float) -> str:
    if priority_score >= 3.5:
        return "high"
    if priority_score >= 1.5:
        return "medium"
    return "low"


def get_readiness_label(readiness_score: int) -> str:
    if readiness_score >= 80:
        return "ready"
    if readiness_score >= 60:
        return "nearly_ready"
    if readiness_score >= 40:
        return "needs_focused_learning"
    return "foundation_needed"


def build_gap_explanation(requirement: SkillRequirement, current_level: int, priority_score: float) -> str:
    priority = get_priority_label(priority_score)
    if current_level == 0:
        return (
            f"{requirement.name} is a {priority}-priority capability for the selected target role "
            "and is not yet demonstrated in the learner profile."
        )
    return (
        f"{requirement.name} is partially demonstrated, but the selected target role requires "
        f"a higher level of capability."
    )


def iter_skill_requirements(role: RoleRequirement | None = None) -> tuple[SkillRequirement, ...]:
    if role is not None:
        return role.skills

    requirements: list[SkillRequirement] = []
    for role_requirement in ROLE_REQUIREMENTS:
        requirements.extend(role_requirement.skills)
    return tuple(requirements)


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()
