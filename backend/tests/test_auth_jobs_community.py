from datetime import timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.main import app
from app.models import OTPCode, User
from app.services import auth_service


settings.jwt_secret = "test-secret-for-fusionpath"
settings.cookie_secure = False
settings.smtp_host = "smtp.test"
settings.smtp_from_email = "no-reply@example.com"
settings.smtp_username = ""
settings.smtp_password = ""
settings.smtp_use_tls = False
client = TestClient(app)


def email() -> str:
    return f"test-{uuid4()}@example.com"


def request_code(target: str) -> str:
    captured: dict[str, str] = {}

    def fake_send(address: str, otp: str) -> None:
        captured["otp"] = otp

    original = auth_service.send_otp_email
    auth_service.send_otp_email = fake_send
    try:
        response = client.post("/api/auth/otp/request", json={"email": target})
    finally:
        auth_service.send_otp_email = original
    assert response.status_code == 200
    return captured["otp"]


def auth_headers(target: str) -> dict[str, str]:
    code = request_code(target)
    response = client.post("/api/auth/otp/verify", json={"email": target, "otp": code})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_otp_request_hashes_code_and_verify_consumes_it() -> None:
    target = email()
    code = request_code(target)
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == target))
        stored = db.scalar(select(OTPCode).where(OTPCode.user_id == user.id))
        assert stored.code_hash != code
        assert stored.consumed_at is None

    response = client.post("/api/auth/otp/verify", json={"email": target, "otp": code})
    assert response.status_code == 200
    consumed = client.post("/api/auth/otp/verify", json={"email": target, "otp": code})
    assert consumed.status_code == 400


def test_invalid_and_expired_otp_are_rejected() -> None:
    target = email()
    code = request_code(target)
    assert client.post("/api/auth/otp/verify", json={"email": target, "otp": "000000"}).status_code == 400
    with SessionLocal() as db:
        stored = db.scalar(select(OTPCode).join(User).where(User.email == target))
        stored.expires_at = auth_service.utc_now() - timedelta(minutes=1)
        db.commit()
    assert client.post("/api/auth/otp/verify", json={"email": target, "otp": code}).status_code == 400


def test_otp_rate_limit_allows_five_requests_per_hour() -> None:
    target = email()
    for _ in range(5):
        request_code(target)
    captured: dict[str, str] = {}
    original = auth_service.send_otp_email
    auth_service.send_otp_email = lambda address, otp: captured.setdefault("otp", otp)
    try:
        response = client.post("/api/auth/otp/request", json={"email": target})
    finally:
        auth_service.send_otp_email = original
    assert response.status_code == 429


def test_smtp_configuration_failure_is_generic_and_does_not_create_otp(monkeypatch) -> None:
    monkeypatch.setattr(settings, "smtp_host", "")
    monkeypatch.setattr(settings, "smtp_from_email", "")
    target = email()
    response = client.post("/api/auth/otp/request", json={"email": target})
    assert response.status_code == 503
    assert response.json()["detail"] == "Email verification is temporarily unavailable. Please contact the administrator."
    with SessionLocal() as db:
        assert db.scalar(select(User).where(User.email == target)) is None


def test_refresh_rotates_and_logout_revokes_session() -> None:
    target = email()
    code = request_code(target)
    verified = client.post("/api/auth/otp/verify", json={"email": target, "otp": code})
    assert verified.status_code == 200
    refreshed = client.post("/api/auth/refresh")
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]
    assert client.post("/api/auth/logout").status_code == 200
    assert client.post("/api/auth/refresh").status_code == 401


def profile(goal: str, experience: str = "intermediate") -> dict:
    return {"goal": goal, "experience_level": experience, "skills": ["HTML", "CSS"] if "Frontend" in goal else ["Excel"], "completed_courses": [], "weekly_hours": 8, "learning_preference": "project_based", "timeline_months": 6}


def test_jobs_are_domain_specific_and_readiness_aware() -> None:
    assert client.get("/api/jobs/recommendations/not-authenticated").status_code == 401
    analyst_headers = auth_headers(email())
    frontend_headers = auth_headers(email())
    analyst = client.post("/api/profile/analyze", headers=analyst_headers, json=profile("Data Analyst", "beginner")).json()
    frontend = client.post("/api/profile/analyze", headers=frontend_headers, json=profile("Frontend Developer")).json()
    analyst_jobs = client.get(f"/api/jobs/recommendations/{analyst['learner_id']}", headers=analyst_headers)
    frontend_jobs = client.get(f"/api/jobs/recommendations/{frontend['learner_id']}", headers=frontend_headers)
    assert analyst_jobs.status_code == frontend_jobs.status_code == 200
    assert analyst_jobs.json()["domain"] == "Data Analyst"
    assert frontend_jobs.json()["domain"] == "Frontend Developer"
    assert analyst_jobs.json()["jobs"][0]["domain"] != frontend_jobs.json()["jobs"][0]["domain"]
    assert analyst_jobs.json()["jobs"][0]["match_reason"]
    assert all(job["seniority"] in {"entry", "junior", "mid"} for job in analyst_jobs.json()["jobs"][:2])


def test_community_requires_auth_supports_replies_filters_and_reports() -> None:
    assert client.get("/api/community/posts?domain=Data%20Analyst").status_code == 401
    headers = auth_headers(email())
    created = client.post("/api/community/posts", headers=headers, json={"domain": "Data Analyst", "content": "How do you validate a dashboard?"})
    assert created.status_code == 201
    post_id = created.json()["id"]
    reply = client.post(f"/api/community/posts/{post_id}/replies", headers=headers, json={"content": "Start with the metric definition."})
    assert reply.status_code == 201
    filtered = client.get("/api/community/posts?domain=Data%20Analyst", headers=headers)
    assert filtered.status_code == 200
    assert filtered.json()[0]["domain"] == "Data Analyst"
    assert client.post(f"/api/community/posts/{post_id}/report", headers=headers).status_code == 200
    assert client.post(f"/api/community/replies/{reply.json()['id']}/report", headers=headers).status_code == 200
