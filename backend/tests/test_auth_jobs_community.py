from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.main import app
from app.models import Learner, User


settings.jwt_secret = "test-secret-for-fusionpath"
settings.cookie_secure = False
client = TestClient(app)


def email() -> str:
    return f"test-{uuid4()}@example.com"


def signup_payload(target: str | None = None, **overrides) -> dict:
    body = {"name": "Test Learner", "email": target or email(), "phone": "+91 98765 43210", "password": "correct-horse-battery", "confirm_password": "correct-horse-battery"}
    body.update(overrides)
    return body


def signup(target: str | None = None, headers: dict[str, str] | None = None, **overrides):
    response = client.post("/api/auth/signup", json=signup_payload(target, **overrides), headers=headers or {})
    assert response.status_code == 201
    return response


def auth_headers(target: str | None = None, **overrides) -> dict[str, str]:
    response = signup(target, **overrides)
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def profile(goal: str, experience: str = "intermediate") -> dict:
    return {"goal": goal, "experience_level": experience, "skills": ["HTML", "CSS"] if "Frontend" in goal else ["Excel"], "completed_courses": [], "weekly_hours": 8, "learning_preference": "project_based", "timeline_months": 6}


def test_signup_hashes_password_and_links_existing_learner() -> None:
    learner = client.post("/api/profile/analyze", json=profile("Data Analyst")).json()
    response = signup(learner_id=learner["learner_id"], name="Demo Data Analyst")
    body = response.json()
    assert body["user"]["name"] == "Demo Data Analyst"
    assert body["user"]["phone"] == "+91 98765 43210"
    assert "password_hash" not in body
    assert body["learner_id"] == learner["learner_id"]
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == body["user"]["email"]))
        linked = db.get(Learner, learner["learner_id"])
        assert user.password_hash != "correct-horse-battery"
        assert user.password_hash.startswith("scrypt$")
        assert linked.user_id == user.id


def test_signup_validation_and_duplicate_email() -> None:
    target = email()
    assert client.post("/api/auth/signup", json=signup_payload(target, name="")).status_code == 422
    assert client.post("/api/auth/signup", json=signup_payload(target, phone="")).status_code == 422
    assert client.post("/api/auth/signup", json=signup_payload(target, phone="bad")).status_code == 422
    assert client.post("/api/auth/signup", json=signup_payload(target, password="short", confirm_password="short")).status_code == 422
    assert client.post("/api/auth/signup", json=signup_payload(target, confirm_password="different-password")).status_code == 422
    assert signup(target).status_code == 201
    assert client.post("/api/auth/signup", json=signup_payload(target)).status_code == 409


def test_login_success_wrong_password_and_unknown_email() -> None:
    target = email()
    signup(target)
    logged_in = client.post("/api/auth/login", json={"email": target, "password": "correct-horse-battery"})
    assert logged_in.status_code == 200
    assert logged_in.json()["access_token"]
    assert client.post("/api/auth/login", json={"email": target, "password": "wrong-password"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email(), "password": "correct-horse-battery"}).status_code == 401


def test_refresh_rotates_and_logout_revokes_session() -> None:
    signup()
    refreshed = client.post("/api/auth/refresh")
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]
    assert client.post("/api/auth/logout").status_code == 200
    assert client.post("/api/auth/refresh").status_code == 401


def test_jobs_require_auth_and_remain_domain_specific() -> None:
    assert client.get("/api/jobs/recommendations/not-authenticated").status_code == 401
    analyst_headers = auth_headers()
    frontend_headers = auth_headers()
    analyst = client.post("/api/profile/analyze", headers=analyst_headers, json=profile("Data Analyst", "beginner")).json()
    frontend = client.post("/api/profile/analyze", headers=frontend_headers, json=profile("Frontend Developer")).json()
    analyst_jobs = client.get(f"/api/jobs/recommendations/{analyst['learner_id']}", headers=analyst_headers)
    frontend_jobs = client.get(f"/api/jobs/recommendations/{frontend['learner_id']}", headers=frontend_headers)
    assert analyst_jobs.status_code == frontend_jobs.status_code == 200
    assert analyst_jobs.json()["domain"] == "Data Analyst"
    assert frontend_jobs.json()["domain"] == "Frontend Developer"
    assert analyst_jobs.json()["jobs"][0]["domain"] != frontend_jobs.json()["jobs"][0]["domain"]


def test_user_cannot_read_another_learners_jobs() -> None:
    owner_headers = auth_headers()
    other_headers = auth_headers()
    learner = client.post("/api/profile/analyze", headers=owner_headers, json=profile("Data Analyst")).json()
    assert client.get(f"/api/jobs/recommendations/{learner['learner_id']}", headers=other_headers).status_code == 403


def test_community_requires_auth_supports_replies_filters_and_reports() -> None:
    assert client.get("/api/community/posts?domain=Data%20Analyst").status_code == 401
    headers = auth_headers()
    client.post("/api/profile/analyze", headers=headers, json=profile("Data Analyst"))
    created = client.post("/api/community/posts", headers=headers, json={"domain": "Data Analyst", "content": "How do you validate a dashboard?"})
    assert created.status_code == 201
    post_id = created.json()["id"]
    reply = client.post(f"/api/community/posts/{post_id}/replies", headers=headers, json={"content": "Start with the metric definition."})
    assert reply.status_code == 201
    filtered = client.get("/api/community/posts?domain=Data%20Analyst", headers=headers)
    assert filtered.status_code == 200
    assert filtered.json()[0]["domain"] == "Data Analyst"
    default_feed = client.get("/api/community/posts", headers=headers)
    assert default_feed.status_code == 200
    assert all(post["domain"] == "Data Analyst" for post in default_feed.json())
    assert client.post(f"/api/community/posts/{post_id}/report", headers=headers).status_code == 200
    assert client.post(f"/api/community/replies/{reply.json()['id']}/report", headers=headers).status_code == 200
