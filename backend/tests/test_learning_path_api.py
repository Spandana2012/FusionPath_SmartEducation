from copy import deepcopy

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.learning_path import LearningPathResponse


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
    importance: int = 5,
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
        "importance": importance,
        "prerequisites": prerequisites or [],
        "explanation": f"{skill} needs improvement.",
    }


def recommendation_request(
    profile_body: dict | None = None,
    gaps: list[dict] | None = None,
) -> dict:
    return {
        "learner_id": "demo-001",
        "profile": profile_body or profile(),
        "skill_gaps": gaps
        if gaps is not None
        else [
            gap("RAG", prerequisites=["LLM Fundamentals", "Vector Databases"]),
            gap("Vector Databases", priority_score=4.5, prerequisites=["LLM Fundamentals"]),
            gap("LLM Fundamentals", priority_score=4),
        ],
    }


def learning_path_request(
    profile_body: dict | None = None,
    gaps: list[dict] | None = None,
    recommendations: list[dict] | None = None,
) -> dict:
    rec_payload = recommendation_request(profile_body, gaps)
    if recommendations is None:
        response = client.post("/api/recommendations", json=rec_payload)
        assert response.status_code == 200
        recommendations = response.json()["recommendations"]

    return {
        "learner_id": rec_payload["learner_id"],
        "profile": rec_payload["profile"],
        "skill_gaps": rec_payload["skill_gaps"],
        "recommendations": recommendations,
    }


def post_learning_path(body: dict) -> dict:
    response = client.post("/api/learning-path", json=body)
    assert response.status_code == 200
    return response.json()


def milestone_order(body: dict, skill: str) -> int:
    for milestone in body["path"]["milestones"]:
        if skill in milestone["skills"]:
            return milestone["order"]
    raise AssertionError(f"{skill} not found in milestones")


def test_valid_genai_learner_returns_roadmap_with_milestones() -> None:
    body = post_learning_path(learning_path_request())

    assert body["target_role"] == "Generative AI Engineer"
    assert body["path"]["milestones"]
    assert body["message"] == "Personalized learning path generated successfully"


def test_no_llm_api_key_uses_deterministic_fallback(monkeypatch) -> None:
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.delenv("LLM_API_KEY", raising=False)

    body = post_learning_path(learning_path_request())

    assert body["ai_generated"] is False
    assert body["path"]["milestones"]


def test_prerequisites_are_ordered_before_dependent_skills() -> None:
    body = post_learning_path(learning_path_request())

    assert milestone_order(body, "LLM Fundamentals") < milestone_order(body, "Vector Databases")
    assert milestone_order(body, "Vector Databases") < milestone_order(body, "RAG")


def test_high_priority_gaps_receive_roadmap_coverage() -> None:
    body = post_learning_path(learning_path_request(gaps=[gap("RAG"), gap("Git", priority="low")]))
    covered_skills = {
        skill
        for milestone in body["path"]["milestones"]
        for skill in milestone["skills"]
    }

    assert "RAG" in covered_skills


def test_every_roadmap_resource_id_exists_in_recommendations() -> None:
    request = learning_path_request()
    allowed_ids = {recommendation["resource_id"] for recommendation in request["recommendations"]}
    body = post_learning_path(request)

    assert {
        resource_id
        for milestone in body["path"]["milestones"]
        for resource_id in milestone["resource_ids"]
    } <= allowed_ids


def test_roadmap_urls_match_supplied_recommendation_urls() -> None:
    request = learning_path_request()
    url_by_id = {
        recommendation["resource_id"]: recommendation["url"]
        for recommendation in request["recommendations"]
    }
    body = post_learning_path(request)

    for milestone in body["path"]["milestones"]:
        for resource in milestone["resources"]:
            assert resource["url"] == url_by_id[resource["resource_id"]]


def test_total_estimated_hours_respects_timeline_capacity() -> None:
    request = learning_path_request(profile_body=profile(weekly_hours=5, timeline_months=2))
    body = post_learning_path(request)
    total_hours = sum(milestone["estimated_hours"] for milestone in body["path"]["milestones"])
    available_hours = request["profile"]["timeline_months"] * 4.33 * request["profile"]["weekly_hours"]

    assert total_hours <= available_hours


def test_project_based_learner_gets_project_after_foundational_resource() -> None:
    body = post_learning_path(learning_path_request(gaps=[gap("RAG")]))
    rag_milestone = next(
        milestone for milestone in body["path"]["milestones"] if "RAG" in milestone["skills"]
    )
    resource_types = [resource["type"] for resource in rag_milestone["resources"]]

    assert "project" in resource_types
    if len(resource_types) > 1:
        assert resource_types.index("project") > 0


def test_empty_skill_gaps_returns_valid_empty_response() -> None:
    body = post_learning_path(learning_path_request(gaps=[]))

    assert body["path"]["milestones"] == []
    assert body["message"] == "Skill-gap analysis is required before a learning path can be generated."


def test_empty_recommendations_returns_safe_response() -> None:
    body = post_learning_path(learning_path_request(recommendations=[]))

    assert body["path"]["milestones"] == []
    assert body["message"] == "Recommendations are required before a learning path can be generated."


def test_duplicate_resources_are_not_selected() -> None:
    request = learning_path_request(gaps=[gap("RAG"), gap("Vector Databases")])
    body = post_learning_path(request)
    selected_ids = [
        resource_id
        for milestone in body["path"]["milestones"]
        for resource_id in milestone["resource_ids"]
    ]

    assert len(selected_ids) == len(set(selected_ids))


def test_without_llm_identical_input_is_deterministic(monkeypatch) -> None:
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    request = learning_path_request()

    first = post_learning_path(deepcopy(request))
    second = post_learning_path(deepcopy(request))

    assert first == second


def test_llm_failure_falls_back_to_deterministic_path(monkeypatch) -> None:
    import app.services.learning_path_service as service

    def fail_ai(_request):
        raise service.AIGenerationError("forced failure")

    monkeypatch.setattr(service, "is_llm_configured", lambda: True)
    monkeypatch.setattr(service, "generate_path_with_ai", fail_ai)

    body = post_learning_path(learning_path_request())

    assert body["ai_generated"] is False
    assert body["path"]["milestones"]


def test_invalid_ai_resource_id_is_rejected_and_falls_back(monkeypatch) -> None:
    import app.services.learning_path_service as service

    def invalid_ai(_request):
        deterministic = service.generate_path_deterministic(_request, ai_generated=True).model_dump(mode="json")
        deterministic["path"]["milestones"][0]["resource_ids"][0] = "unknown-resource-id"
        deterministic["path"]["milestones"][0]["resources"][0]["resource_id"] = "unknown-resource-id"
        return deterministic

    monkeypatch.setattr(service, "is_llm_configured", lambda: True)
    monkeypatch.setattr(service, "generate_path_with_ai", invalid_ai)

    body = post_learning_path(learning_path_request())

    assert body["ai_generated"] is False
    assert body["path"]["milestones"]
    assert all(
        resource["resource_id"] != "unknown-resource-id"
        for milestone in body["path"]["milestones"]
        for resource in milestone["resources"]
    )


def test_response_schema_validation() -> None:
    body = post_learning_path(learning_path_request())

    LearningPathResponse.model_validate(body)
