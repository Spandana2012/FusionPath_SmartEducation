from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import JobListing, Learner
from app.services.skill_gap_service import match_role


CURATED_JOBS = (
    ("Generative AI Engineer", "Junior GenAI Engineer", "Northstar Labs", "Bengaluru, India", "junior"),
    ("Generative AI Engineer", "AI Application Engineer", "BrightLayer", "Remote - India", "entry"),
    ("Generative AI Engineer", "LLM Platform Engineer", "Orbit Systems", "Hyderabad, India", "mid"),
    ("Data Analyst", "Junior Data Analyst", "MetricWorks", "Pune, India", "junior"),
    ("Data Analyst", "Product Data Analyst", "Northstar Labs", "Remote - India", "entry"),
    ("Data Analyst", "Business Intelligence Analyst", "Civic Metrics", "Chennai, India", "mid"),
    ("Frontend Developer", "Junior Frontend Developer", "Canvas Cloud", "Remote - India", "junior"),
    ("Frontend Developer", "React Developer", "BrightLayer", "Bengaluru, India", "entry"),
    ("Frontend Developer", "Frontend Engineer", "Orbit Systems", "Hyderabad, India", "mid"),
    ("Backend Developer", "Junior Backend Developer", "API Foundry", "Pune, India", "junior"),
    ("Backend Developer", "Python API Developer", "Northstar Labs", "Remote - India", "entry"),
    ("Backend Developer", "Backend Engineer", "Civic Metrics", "Chennai, India", "mid"),
    ("Cloud/DevOps Engineer", "Junior Cloud Engineer", "Cloudline", "Remote - India", "junior"),
    ("Cloud/DevOps Engineer", "DevOps Associate", "Orbit Systems", "Bengaluru, India", "entry"),
    ("Cloud/DevOps Engineer", "Platform Engineer", "Cloudline", "Hyderabad, India", "mid"),
)


def ensure_curated_jobs(db: Session) -> None:
    if db.scalar(select(JobListing.id).limit(1)) is not None:
        return
    today = datetime.now(timezone.utc)
    for index, (domain, title, company, location, seniority) in enumerate(CURATED_JOBS):
        db.add(
            JobListing(
                id=f"seed-job-{index + 1:03d}",
                domain=domain,
                title=title,
                company=company,
                location=location,
                link=f"https://careers.fusionpath.example/jobs/seed-job-{index + 1:03d}",
                posted_date=today - timedelta(days=index),
                seniority=seniority,
            )
        )
    db.commit()


def get_job_recommendations(db: Session, learner: Learner, readiness_context: int | None = None) -> tuple[str, list[JobListing]]:
    ensure_curated_jobs(db)
    domain = match_role(learner.goal).role
    readiness = readiness_context if readiness_context is not None else readiness_for_learner(learner)
    seniority = preferred_seniority(learner.experience_level, readiness)
    jobs = list(db.scalars(select(JobListing).where(JobListing.domain == domain)).all())
    rank = {level: index for index, level in enumerate(seniority)}
    jobs.sort(key=lambda job: (rank.get(job.seniority, len(rank)), -(job.posted_date.timestamp() if job.posted_date else 0), job.title))
    return domain, jobs[:8]


def readiness_for_learner(learner: Learner) -> int:
    from app.schemas.profile import ExperienceLevel, LearnerProfile, LearningPreference
    from app.schemas.skills import SkillGapRequest
    from app.services.skill_gap_service import analyze_skill_gap

    profile = LearnerProfile(
        goal=learner.goal,
        experience_level=ExperienceLevel(learner.experience_level),
        skills=learner.skills,
        completed_courses=learner.completed_courses,
        weekly_hours=learner.weekly_hours,
        learning_preference=LearningPreference(learner.learning_preference),
        timeline_months=learner.timeline_months,
    )
    return analyze_skill_gap(SkillGapRequest(learner_id=learner.id, profile=profile)).readiness_score


def preferred_seniority(experience_level: str, readiness: int) -> tuple[str, ...]:
    if experience_level == "beginner" or readiness < 35:
        return ("entry", "junior", "mid")
    if experience_level == "advanced" or readiness >= 75:
        return ("mid", "junior", "entry")
    return ("junior", "entry", "mid")
