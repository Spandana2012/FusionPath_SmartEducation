from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def profile_payload(
    goal: str = "Generative AI Engineer",
    experience_level: str = "intermediate",
    skills: list[str] | None = None,
    completed_courses: list[dict] | None = None,
) -> dict:
    return {
        "learner_id": "8d7-test-learner",
        "profile": {
            "goal": goal,
            "experience_level": experience_level,
            "skills": skills or ["Python", "SQL", "Machine Learning"],
            "completed_courses": completed_courses or [
                {
                    "name": "Machine Learning Fundamentals",
                    "skills": ["Machine Learning"],
                }
            ],
            "weekly_hours": 10,
            "learning_preference": "project_based",
            "timeline_months": 6,
        },
    }


def post_gap(payload: dict) -> dict:
    response = client.post("/api/skills/gap", json=payload)
    assert response.status_code == 200
    return response.json()


def find_item(items: list[dict], skill: str) -> dict:
    return next(item for item in items if item["skill"] == skill)


def test_valid_generative_ai_engineer_profile_returns_gap_analysis() -> None:
    body = post_gap(profile_payload())

    assert body["target_role"] == "Generative AI Engineer"
    assert body["matched_goal"] == "Generative AI Engineer"
    assert isinstance(body["readiness_score"], int)
    assert body["skill_gaps"]
    assert body["strengths"]
    assert body["message"] == "Skill gap analysis completed successfully"


def test_role_alias_maps_to_generative_ai_engineer() -> None:
    body = post_gap(profile_payload(goal="gen ai engineer"))

    assert body["target_role"] == "Generative AI Engineer"


def test_skill_aliases_resolve_consistently() -> None:
    body = post_gap(
        profile_payload(
            experience_level="advanced",
            skills=["python", " PYTHON ", "python programming", "ml"],
            completed_courses=[],
        )
    )

    python_strengths = [item for item in body["strengths"] if item["skill"] == "Python"]
    ml_strengths = [item for item in body["strengths"] if item["skill"] == "Machine Learning"]
    assert len(python_strengths) == 1
    assert len(ml_strengths) == 1


def test_missing_skills_marks_important_genai_skills_missing() -> None:
    body = post_gap(profile_payload(skills=["Python"], completed_courses=[]))

    rag_gap = find_item(body["skill_gaps"], "RAG")
    llm_gap = find_item(body["skill_gaps"], "LLM Fundamentals")
    assert rag_gap["status"] == "missing"
    assert llm_gap["status"] == "missing"
    assert "RAG" in body["missing_critical_skills"]


def test_completed_course_skill_contributes_current_level() -> None:
    body = post_gap(
        profile_payload(
            skills=["Python"],
            completed_courses=[
                {
                    "name": "Machine Learning Fundamentals",
                    "skills": ["Machine Learning"],
                }
            ],
        )
    )

    ml_gap = find_item(body["skill_gaps"], "Machine Learning")
    assert ml_gap["current_level"] == 1
    assert ml_gap["status"] == "developing"


def test_duplicate_skills_do_not_inflate_current_level() -> None:
    body = post_gap(
        profile_payload(
            experience_level="beginner",
            skills=["Python", "python", "python programming"],
            completed_courses=[],
        )
    )

    python_gap = find_item(body["skill_gaps"], "Python")
    assert python_gap["current_level"] == 1


def test_readiness_score_is_bounded() -> None:
    body = post_gap(profile_payload(experience_level="advanced", skills=[
        "Python",
        "Machine Learning",
        "Deep Learning",
        "Transformers",
        "LLM Fundamentals",
        "Prompt Engineering",
        "RAG",
        "Vector Databases",
        "LLM Evaluation",
        "APIs",
        "Git",
        "Deployment",
    ]))

    assert 0 <= body["readiness_score"] <= 100


def test_strong_learner_has_high_readiness_and_focused_gaps() -> None:
    body = post_gap(profile_payload(experience_level="advanced", skills=[
        "Python",
        "Machine Learning",
        "Deep Learning",
        "Transformers",
        "Prompt Engineering",
        "Vector Databases",
        "LLM Evaluation",
        "APIs",
        "Git",
        "Deployment",
    ]))

    assert body["readiness_score"] >= 70
    assert len(body["strengths"]) >= 8
    assert len(body["skill_gaps"]) <= 4


def test_unsupported_goal_returns_400() -> None:
    response = client.post("/api/skills/gap", json=profile_payload(goal="Astronaut Chef"))

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Unsupported learning goal. Please choose a supported target role."
    }


def test_priority_ordering_is_deterministic() -> None:
    body = post_gap(profile_payload(skills=["Python"], completed_courses=[]))

    gaps = body["skill_gaps"]
    for current, following in zip(gaps, gaps[1:]):
        assert (
            current["priority_score"],
            current["importance"],
            following["skill"],
        ) >= (
            following["priority_score"],
            following["importance"],
            current["skill"],
        )


def test_prerequisite_information_exists_for_relevant_skills() -> None:
    body = post_gap(profile_payload(skills=["Python"], completed_courses=[]))

    rag_gap = find_item(body["skill_gaps"], "RAG")
    transformers_gap = find_item(body["skill_gaps"], "Transformers")
    assert rag_gap["prerequisites"] == ["LLM Fundamentals", "Vector Databases"]
    assert transformers_gap["prerequisites"] == ["Machine Learning", "Deep Learning"]
