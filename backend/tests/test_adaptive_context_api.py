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


def test_tutor_changes_with_learner_context_and_question_intent() -> None:
    analyst = client.post("/api/profile/analyze", json=profile("Data Analyst", ["Excel"])).json()
    frontend = client.post("/api/profile/analyze", json=profile("Frontend Developer", ["HTML", "CSS"])).json()

    analyst_next = client.post("/api/adaptive/tutor/chat", json={"learner_id": analyst["learner_id"], "message": "What should I learn next?"})
    frontend_next = client.post("/api/adaptive/tutor/chat", json={"learner_id": frontend["learner_id"], "message": "What should I learn next?"})
    analyst_hint = client.post("/api/adaptive/tutor/chat", json={"learner_id": analyst["learner_id"], "message": "Give me a hint"})

    assert analyst_next.status_code == frontend_next.status_code == analyst_hint.status_code == 200
    assert analyst_next.json()["message"] != frontend_next.json()["message"]
    assert analyst_next.json()["intent"] == "next"
    assert analyst_hint.json()["intent"] == "hint"
    assert analyst_next.json()["message"] != analyst_hint.json()["message"]


def test_tutor_routes_common_learning_intents() -> None:
    learner = client.post("/api/profile/analyze", json=profile("Data Analyst", ["Excel"])).json()
    questions = {
        "explanation": "What is this concept?",
        "why": "Why should I learn this?",
        "resource": "What resource should I use?",
        "practice": "How should I practice this?",
        "progress": "How am I doing?",
        "career": "How does this help my career?",
    }

    responses = {
        expected: client.post("/api/adaptive/tutor/chat", json={"learner_id": learner["learner_id"], "message": question}).json()
        for expected, question in questions.items()
    }

    assert {body["intent"] for body in responses.values()} == set(questions)
    assert len({body["message"] for body in responses.values()}) == len(questions)
