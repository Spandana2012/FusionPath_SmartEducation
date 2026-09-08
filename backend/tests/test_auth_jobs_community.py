from datetime import timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.database import SessionLocal
from app.main import app
from app.models import Learner, Session, User
from app.services.auth_service import hash_value, utc_now


def email() -> str:
    return f"test-{uuid4()}@example.com"


def signup_payload(target: str | None = None, **overrides) -> dict:
    body = {"name": "Test Learner", "email": target or email(), "phone": "+91 98765 43210", "password": "correct-horse-battery", "confirm_password": "correct-horse-battery"}
    body.update(overrides)
    return body


def signup(client: TestClient, target: str | None = None, **overrides):
    response = client.post("/api/auth/signup", json=signup_payload(target, **overrides))
    assert response.status_code == 201
    return response


def profile(goal: str, experience: str = "intermediate") -> dict:
    return {"goal": goal, "experience_level": experience, "skills": ["HTML", "CSS"] if "Frontend" in goal else ["Excel"], "completed_courses": [], "weekly_hours": 8, "learning_preference": "project_based", "timeline_months": 6}


def test_signup_hashes_password_links_learner_and_sets_http_only_session() -> None:
    with TestClient(app) as client:
        learner = client.post("/api/profile/analyze", json=profile("Data Analyst")).json()
        response = signup(client, learner_id=learner["learner_id"], name="Demo Data Analyst")
        body = response.json()
        assert body["authenticated"] is True
        assert body["user"]["name"] == "Demo Data Analyst"
        assert body["learner_id"] == learner["learner_id"]
        cookie = response.headers["set-cookie"]
        assert "fusionpath_session=" in cookie and "HttpOnly" in cookie
        assert "password_hash" not in body and "session_token" not in body
        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.email == body["user"]["email"]))
            linked = db.get(Learner, learner["learner_id"])
            session = db.scalar(select(Session).where(Session.user_id == user.id))
            assert user.password_hash.startswith("scrypt$")
            assert linked.user_id == user.id
            assert session.session_token_hash != client.cookies.get("fusionpath_session")
            assert session.session_token_hash == hash_value(client.cookies.get("fusionpath_session"))


def test_signup_validation_and_duplicate_email() -> None:
    with TestClient(app) as client:
        target = email()
        assert client.post("/api/auth/signup", json=signup_payload(target, name="")).status_code == 422
        assert client.post("/api/auth/signup", json=signup_payload(target, phone="")).status_code == 422
        assert client.post("/api/auth/signup", json=signup_payload(target, phone="bad")).status_code == 422
        assert client.post("/api/auth/signup", json=signup_payload(target, password="short", confirm_password="short")).status_code == 422
        assert client.post("/api/auth/signup", json=signup_payload(target, confirm_password="different-password")).status_code == 422
        assert signup(client, target).status_code == 201
        duplicate = client.post("/api/auth/signup", json=signup_payload(target))
        assert duplicate.status_code == 409


def test_login_me_wrong_password_and_unknown_email() -> None:
    with TestClient(app) as client:
        target = email()
        signup(client, target)
        client.post("/api/auth/logout")
        logged_in = client.post("/api/auth/login", json={"email": target, "password": "correct-horse-battery"})
        assert logged_in.status_code == 200
        assert logged_in.json()["authenticated"] is True
        assert client.get("/api/auth/me").json()["user"]["email"] == target
        assert client.post("/api/auth/login", json={"email": target, "password": "wrong-password"}).status_code == 401
        assert client.post("/api/auth/login", json={"email": email(), "password": "correct-horse-battery"}).status_code == 401


def test_logout_revokes_session_and_expired_session_is_rejected() -> None:
    with TestClient(app) as client:
        signup(client)
        raw_token = client.cookies.get("fusionpath_session")
        assert client.get("/api/auth/me").status_code == 200
        assert client.post("/api/auth/logout").status_code == 200
        assert client.get("/api/auth/me").status_code == 401
        with SessionLocal() as db:
            session = db.scalar(select(Session).where(Session.session_token_hash == hash_value(raw_token)))
            assert session.revoked_at is not None
            session.revoked_at = None
            session.expires_at = utc_now() - timedelta(minutes=1)
            db.commit()
        client.cookies.set("fusionpath_session", raw_token)
        assert client.get("/api/auth/me").status_code == 401


def test_jobs_require_auth_and_remain_domain_specific() -> None:
    with TestClient(app) as unauthenticated:
        assert unauthenticated.get("/api/jobs/recommendations/not-authenticated").status_code == 401
    with TestClient(app) as analyst_client, TestClient(app) as frontend_client:
        signup(analyst_client)
        signup(frontend_client)
        analyst = analyst_client.post("/api/profile/analyze", json=profile("Data Analyst", "beginner")).json()
        frontend = frontend_client.post("/api/profile/analyze", json=profile("Frontend Developer")).json()
        analyst_jobs = analyst_client.get(f"/api/jobs/recommendations/{analyst['learner_id']}")
        frontend_jobs = frontend_client.get(f"/api/jobs/recommendations/{frontend['learner_id']}")
        assert analyst_jobs.status_code == frontend_jobs.status_code == 200
        assert analyst_jobs.json()["domain"] == "Data Analyst"
        assert frontend_jobs.json()["domain"] == "Frontend Developer"
        assert analyst_jobs.json()["jobs"][0]["domain"] != frontend_jobs.json()["jobs"][0]["domain"]


def test_user_cannot_read_another_learners_jobs() -> None:
    with TestClient(app) as owner, TestClient(app) as other:
        signup(owner)
        signup(other)
        learner = owner.post("/api/profile/analyze", json=profile("Data Analyst")).json()
        assert other.get(f"/api/jobs/recommendations/{learner['learner_id']}").status_code == 403


def test_community_requires_auth_uses_learner_domain_and_uses_session_user() -> None:
    with TestClient(app) as unauthenticated:
        assert unauthenticated.get("/api/community/posts?domain=Data%20Analyst").status_code == 401
        assert unauthenticated.post("/api/community/posts", json={"domain": "Data Analyst", "content": "Nope"}).status_code == 401
    with TestClient(app) as client:
        signup(client)
        client.post("/api/profile/analyze", json=profile("Data Analyst"))
        created = client.post("/api/community/posts", json={"domain": "Data Analyst", "content": "How do you validate a dashboard?"})
        assert created.status_code == 201
        post = created.json()
        post_id = post["id"]
        me = client.get("/api/auth/me").json()
        assert post["author_user_id"] == me["user"]["id"]
        reply = client.post(f"/api/community/posts/{post_id}/replies", json={"content": "Start with the metric definition."})
        assert reply.status_code == 201
        filtered = client.get("/api/community/posts?domain=Data%20Analyst")
        assert filtered.status_code == 200 and filtered.json()[0]["domain"] == "Data Analyst"
        default_feed = client.get("/api/community/posts")
        assert default_feed.status_code == 200 and all(item["domain"] == "Data Analyst" for item in default_feed.json())
