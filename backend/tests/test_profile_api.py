from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def valid_payload() -> dict:
    return {
        "goal": "Generative AI Engineer",
        "experience_level": "intermediate",
        "skills": [" Python ", "SQL", "Machine Learning", "python"],
        "completed_courses": [
            {
                "name": " Machine Learning Fundamentals ",
                "skills": [" Machine Learning "],
            }
        ],
        "weekly_hours": 10,
        "learning_preference": "project_based",
        "timeline_months": 6,
    }


def test_health_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_valid_profile_returns_normalized_profile() -> None:
    response = client.post("/api/profile/analyze", json=valid_payload())

    body = response.json()
    assert response.status_code == 200
    assert body["message"] == "Learner profile created successfully"
    assert body["learner_id"]
    assert body["profile"]["goal"] == "Generative AI Engineer"
    assert body["profile"]["skills"] == ["Python", "SQL", "Machine Learning"]
    assert body["profile"]["completed_courses"][0]["name"] == "Machine Learning Fundamentals"
    assert body["profile"]["completed_courses"][0]["skills"] == ["Machine Learning"]


def test_missing_goal_returns_validation_error() -> None:
    payload = valid_payload()
    payload.pop("goal")

    response = client.post("/api/profile/analyze", json=payload)

    assert response.status_code == 422
    assert response.json() == {"detail": "Goal is required."}


def test_invalid_experience_level_returns_validation_error() -> None:
    payload = valid_payload()
    payload["experience_level"] = "expert"

    response = client.post("/api/profile/analyze", json=payload)

    assert response.status_code == 422


def test_invalid_weekly_hours_returns_validation_error() -> None:
    payload = valid_payload()
    payload["weekly_hours"] = 0

    response = client.post("/api/profile/analyze", json=payload)

    assert response.status_code == 422


def test_cors_allows_local_frontend_origin() -> None:
    response = client.options(
        "/api/profile/analyze",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
