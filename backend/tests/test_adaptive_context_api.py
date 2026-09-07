from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def profile(goal: str, skills: list[str]) -> dict:
    return {
        "goal": goal,
        "experience_level": "intermediate",
        "skills": skills,
        "completed_courses": [],
        "weekly_hours": 10,
        "learning_preference": "project_based",
        "timeline_months": 6,
    }


def create_context(goal: str, skills: list[str]) -> dict:
    learner = client.post("/api/profile/analyze", json=profile(goal, skills)).json()
    response = client.get(f"/api/adaptive/context/{learner['learner_id']}")
    assert response.status_code == 200
    return response.json()


def test_context_reuses_persisted_profile_and_core_pipeline() -> None:
    context = create_context("Generative AI Engineer", ["Python", "SQL"])

    assert context["profile"]["goal"] == "Generative AI Engineer"
    assert context["skill_gap"]["target_role"] == "Generative AI Engineer"
    assert context["recommendations"]["target_role"] == "Generative AI Engineer"
    assert context["learning_path"]["target_role"] == "Generative AI Engineer"
    assert context["learning_path"]["path"]["milestones"]


def test_context_changes_for_a_different_learner_profile() -> None:
    genai = create_context("Generative AI Engineer", ["Python", "SQL"])
    frontend = create_context("Frontend Developer", ["HTML", "CSS", "JavaScript"])

    assert genai["skill_gap"]["target_role"] != frontend["skill_gap"]["target_role"]
    assert genai["skill_gap"]["skill_gaps"][0]["skill"] != frontend["skill_gap"]["skill_gaps"][0]["skill"]
    assert genai["learning_path"]["path"]["milestones"][0]["title"] != frontend["learning_path"]["path"]["milestones"][0]["title"]


def test_context_returns_not_found_for_unknown_learner() -> None:
    response = client.get("/api/adaptive/context/not-a-real-learner")

    assert response.status_code == 404
