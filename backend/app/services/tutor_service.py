"""Deterministic, learner-contextual tutor responses.

The tutor deliberately uses the same generated context as the dashboard and
learning path. It is not an external model; intent routing and response
selection happen locally so the answer remains explainable and available
without an API key.
"""

import re

from app.schemas.adaptive import LearnerContextResponse


def generate_tutor_response(message: str, context: LearnerContextResponse) -> dict[str, str]:
    question = message.strip()
    lowered = question.casefold()
    skill = _focus_skill(context)
    milestone = context.progress.current_milestone or _first_milestone(context)
    role = context.skill_gap.target_role
    resource = _resource_for_skill(context, skill)
    intent = detect_intent(lowered)

    if intent == "explanation":
        concept = _concept_from_question(question, skill)
        response = (
            f"{concept} is a concept to understand through its inputs, the transformation it applies, "
            f"and the result it produces. In your {milestone} milestone, connect it to {skill}; "
            f"that gives you a concrete foundation for your {role} goal."
        )
    elif intent == "why":
        gap = next((item for item in context.skill_gap.skill_gaps if item.skill.casefold() == skill.casefold()), None)
        reason = gap.explanation if gap else f"it appears in the current path for {role}"
        response = (
            f"{skill} matters for {role} because {reason.rstrip('.')}. "
            f"It is currently part of your {milestone} milestone, so improving it should move your "
            f"{context.skill_gap.readiness_label.replace('_', ' ')} readiness forward."
        )
    elif intent == "next":
        next_milestone = _next_milestone(context)
        if next_milestone:
            response = (
                f"First, work through {milestone} by practicing {skill}. "
                f"After that, move to {next_milestone.title}, which covers {', '.join(next_milestone.skills)}."
            )
        else:
            response = f"Your next action is to complete {milestone}, then apply {skill} in a small task for {role}."
    elif intent == "hint":
        response = (
            f"Hint for {skill}: start with the smallest example you can make for the {milestone} assessment. "
            f"Name what goes in, what should change, and what evidence would show that your answer is correct."
        )
    elif intent == "resource":
        if resource:
            response = (
                f"Use {resource.title} for {skill}. It is a {resource.type} from {resource.provider}, "
                f"estimated at {resource.estimated_hours} hours, and it was recommended because {resource.reason.rstrip('.')}."
            )
        else:
            response = f"Start with the {milestone} materials in your learning path, then practice {skill} before adding another resource."
    elif intent == "practice":
        response = (
            f"Practice the {skill} questions in My Learning > Practice. The set is tied to {milestone} "
            f"and gives feedback after each answer, so use any missed topics to choose your next review."
        )
    elif intent == "progress":
        progress = context.progress
        response = (
            f"You have completed {progress.completed_milestones} of {progress.total_milestones} milestones and "
            f"made {progress.practice_attempts} practice attempts. Your current focus is {milestone}; "
            f"keep {skill} as the priority until that milestone is complete."
        )
    elif intent == "career":
        gaps = context.skill_gap.missing_critical_skills or [item.skill for item in context.skill_gap.skill_gaps[:3]]
        response = (
            f"For a {role} path, your current readiness is {context.skill_gap.readiness_score}% "
            f"({context.skill_gap.readiness_label.replace('_', ' ')}). Build {', '.join(gaps[:3])} "
            f"through the learning path; those are the clearest skills connecting your current profile to the role."
        )
    else:
        response = (
            f"Your question connects to {skill} in the {milestone} milestone. For your {role} goal, "
            f"start by identifying the idea you are unsure about, then use the matching recommendation or practice set."
        )

    return {
        "message": response,
        "intent": intent,
        "concept": skill,
        "next_action": "practice" if intent in {"hint", "explanation", "why", "general"} else "continue_path",
        "difficulty": context.profile.experience_level.value,
    }


def detect_intent(lowered_question: str) -> str:
    if any(term in lowered_question for term in ("practice", "test me", "quiz", "how can i practice")):
        return "practice"
    if any(term in lowered_question for term in ("hint", "clue", "stuck")):
        return "hint"
    if any(term in lowered_question for term in ("why", "important", "relevant", "need to learn")):
        return "why"
    if any(term in lowered_question for term in ("next", "what should i do", "now")):
        return "next"
    if any(term in lowered_question for term in ("resource", "study", "course", "learn from")):
        return "resource"
    if any(term in lowered_question for term in ("progress", "doing", "completed", "focus")):
        return "progress"
    if any(term in lowered_question for term in ("career", "job", "role", "missing")):
        return "career"
    if re.search(r"\b(what is|what's|explain|define|meaning of)\b", lowered_question):
        return "explanation"
    return "general"


def _focus_skill(context: LearnerContextResponse) -> str:
    current = next(
        (milestone for milestone in context.learning_path.path.milestones if milestone.title == context.progress.current_milestone),
        None,
    )
    return (
        (current.skills[0] if current and current.skills else None)
        or (context.skill_gap.skill_gaps[0].skill if context.skill_gap.skill_gaps else None)
        or (context.profile.skills[0] if context.profile.skills else context.skill_gap.target_role)
    )


def _first_milestone(context: LearnerContextResponse) -> str:
    return context.learning_path.path.milestones[0].title if context.learning_path.path.milestones else "your next milestone"


def _next_milestone(context: LearnerContextResponse):
    milestones = context.learning_path.path.milestones
    current_index = next((index for index, item in enumerate(milestones) if item.title == context.progress.current_milestone), -1)
    return milestones[current_index + 1] if current_index >= 0 and current_index + 1 < len(milestones) else None


def _resource_for_skill(context: LearnerContextResponse, skill: str):
    return next(
        (item for item in context.recommendations.recommendations if skill.casefold() in {candidate.casefold() for candidate in item.skills} or item.skill.casefold() == skill.casefold()),
        context.recommendations.recommendations[0] if context.recommendations.recommendations else None,
    )


def _concept_from_question(question: str, fallback: str) -> str:
    match = re.search(r"(?:what is|what's|explain|define|meaning of)\s+(.+?)[?!.]*$", question, flags=re.IGNORECASE)
    return match.group(1).strip() if match else fallback
