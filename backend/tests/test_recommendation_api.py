from copy import deepcopy

from fastapi.testclient import TestClient

from app.main import app
from app.services.recommendation_service import MAX_RECOMMENDATIONS


client = TestClient(app)


def profile(
    goal: str = "Generative AI Engineer",
    experience_level: str = "intermediate",
    skills: list[str] | None = None,
    completed_courses: list[dict] | None = None,
    weekly_hours: int = 10,
    learning_preference: str = "project_based",
    timeline_months: int = 6,
) -> dict:
    return {
        "goal": goal,
        "experience_level": experience_level,
        "skills": skills or ["Python", "Machine Learning"],
        "completed_courses": completed_courses or [],
        "weekly_hours": weekly_hours,
        "learning_preference": learning_preference,
        "timeline_months": timeline_months,
    }


def gap(
    skill: str,
    priority: str = "high",
    current_level: int = 0,
    priority_score: float | None = None,
    prerequisites: list[str] | None = None,
) -> dict:
    return {
        "skill": skill,
        "category": "Generative AI",
        "required_level": 4,
        "current_level": current_level,
        "gap_score": 1,
        "priority_score": priority_score if priority_score is not None else {"high": 5, "medium": 3, "low": 1}[priority],
        "priority": priority,
        "status": "missing" if current_level == 0 else "developing",
        "importance": 5,
        "prerequisites": prerequisites or [],
        "explanation": f"{skill} needs improvement.",
    }


def payload(
    profile_body: dict | None = None,
    gaps: list[dict] | None = None,
) -> dict:
    return {
        "learner_id": "demo-001",
        "profile": profile_body or profile(),
        "skill_gaps": gaps if gaps is not None else [gap("RAG", prerequisites=["LLM Fundamentals", "Vector Databases"])],
    }


def post_recommendations(body: dict) -> dict:
    response = client.post("/api/recommendations", json=body)
    assert response.status_code == 200
    return response.json()


def find_resource(body: dict, resource_id: str) -> dict:
    return next(item for item in body["recommendations"] if item["resource_id"] == resource_id)


def test_valid_genai_learner_with_rag_gap_returns_rag_resources() -> None:
    body = post_recommendations(payload())

    assert body["target_role"] == "Generative AI Engineer"
    assert body["recommendations"]
    assert any("RAG" in item["skills"] for item in body["recommendations"])


def test_project_based_learner_scores_project_resource_higher_than_similar_non_project() -> None:
    body = post_recommendations(
        payload(gaps=[gap("RAG"), gap("Vector Databases")])
    )

    project = find_resource(body, "genai-rag-project-001")
    tutorial = find_resource(body, "genai-rag-tutorial-001")
    assert project["match_score"] > tutorial["match_score"]


def test_video_preference_receives_preference_bonus() -> None:
    video_body = post_recommendations(
        payload(
            profile_body=profile(learning_preference="video"),
            gaps=[gap("LLM Fundamentals")],
        )
    )
    reading_body = post_recommendations(
        payload(
            profile_body=profile(learning_preference="reading"),
            gaps=[gap("LLM Fundamentals")],
        )
    )

    assert find_resource(video_body, "genai-llm-001")["match_score"] > find_resource(
        reading_body, "genai-llm-001"
    )["match_score"]


def test_intermediate_learner_prefers_intermediate_over_advanced_when_relevance_is_similar() -> None:
    body = post_recommendations(
        payload(gaps=[gap("LLM Fundamentals")])
    )

    intermediate = find_resource(body, "genai-rag-project-001")
    advanced = find_resource(body, "genai-eval-001")
    assert intermediate["match_score"] > advanced["match_score"]


def test_time_fit_rewards_resources_that_fit_weekly_hours() -> None:
    body = post_recommendations(
        payload(
            profile_body=profile(weekly_hours=5, learning_preference="reading"),
            gaps=[gap("SQL")],
        )
    )

    shorter = find_resource(body, "backend-sql-001")
    longer = find_resource(body, "data-sql-002")
    assert shorter["match_score"] >= longer["match_score"]
    assert shorter["estimated_hours"] < longer["estimated_hours"]


def test_multiple_gaps_resource_ranks_highly() -> None:
    body = post_recommendations(
        payload(gaps=[gap("RAG"), gap("Vector Databases"), gap("LLM Fundamentals")])
    )

    assert body["recommendations"][0]["resource_id"] == "genai-rag-project-001"


def test_completed_introductory_resource_is_not_recommended_as_duplicate() -> None:
    body = post_recommendations(
        payload(
            profile_body=profile(
                goal="Backend Developer",
                completed_courses=[{"name": "SQLBolt Interactive SQL Lessons", "skills": ["SQL"]}],
            ),
            gaps=[gap("SQL")],
        )
    )

    ids = {item["resource_id"] for item in body["recommendations"]}
    assert "backend-sql-001" not in ids


def test_high_priority_resources_rank_above_low_priority_when_similar() -> None:
    body = post_recommendations(
        payload(
            profile_body=profile(goal="Frontend Developer"),
            gaps=[gap("React", priority="high"), gap("Git", priority="low")],
        )
    )

    assert body["recommendations"][0]["priority"] == "high"


def test_recommendations_are_deduplicated() -> None:
    body = post_recommendations(
        payload(gaps=[gap("RAG"), gap("Vector Databases"), gap("LLM Fundamentals")])
    )

    ids = [item["resource_id"] for item in body["recommendations"]]
    assert len(ids) == len(set(ids))


def test_total_recommendations_do_not_exceed_maximum() -> None:
    body = post_recommendations(
        payload(
            gaps=[
                gap("Python"),
                gap("Machine Learning"),
                gap("Deep Learning"),
                gap("Transformers"),
                gap("LLM Fundamentals"),
                gap("Prompt Engineering"),
                gap("RAG"),
                gap("Vector Databases"),
                gap("APIs"),
                gap("Git"),
            ]
        )
    )

    assert len(body["recommendations"]) <= MAX_RECOMMENDATIONS


def test_skill_grouping_includes_recommendations_by_skill() -> None:
    body = post_recommendations(payload(gaps=[gap("RAG"), gap("Vector Databases")]))

    grouped = {group["skill"]: group["recommendations"] for group in body["skill_recommendations"]}
    assert "RAG" in grouped
    assert "Vector Databases" in grouped
    assert all("RAG" in item["skills"] for item in grouped["RAG"])


def test_uncovered_skill_is_reported() -> None:
    body = post_recommendations(payload(gaps=[gap("Quantum Basket Weaving")]))

    assert body["recommendations"] == []
    assert body["uncovered_skills"] == ["Quantum Basket Weaving"]


def test_empty_gaps_returns_valid_empty_response() -> None:
    body = post_recommendations(payload(gaps=[]))

    assert body["recommendations"] == []
    assert body["skill_recommendations"] == []
    assert body["uncovered_skills"] == []
    assert body["message"] == "No skill gaps were provided, so no recommendations were generated."


def test_recommendations_are_deterministic() -> None:
    request = payload(gaps=[gap("RAG"), gap("Vector Databases"), gap("LLM Fundamentals")])

    first = post_recommendations(deepcopy(request))
    second = post_recommendations(deepcopy(request))

    assert [
        (item["resource_id"], item["match_score"])
        for item in first["recommendations"]
    ] == [
        (item["resource_id"], item["match_score"])
        for item in second["recommendations"]
    ]
