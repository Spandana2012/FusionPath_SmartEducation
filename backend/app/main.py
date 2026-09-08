from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text

from app.api.learning_path import router as learning_path_router
from app.api.profile import router as profile_router
from app.api.recommendations import router as recommendations_router
from app.api.skills import router as skills_router
from app.api.adaptive import router as adaptive_router
from app.core.config import settings
from app.core.database import engine
from app import models  # noqa: F401 - register all SQLAlchemy models for Alembic metadata

app = FastAPI(
    title="FusionPath API",
    description="Backend services for the FusionPath personalized learning platform.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://fusionpathsmarteducation(?:-[a-z0-9-]+)*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(profile_router)
app.include_router(skills_router)
app.include_router(recommendations_router)
app.include_router(learning_path_router)
app.include_router(adaptive_router)


@app.on_event("startup")
def migrate_development_database() -> None:
    # Production deploys run Alembic explicitly; local SQLite keeps the demo runnable.
    if settings.database_url.startswith("sqlite"):
        backend_dir = Path(__file__).resolve().parents[1]
        alembic_config = Config(str(backend_dir / "alembic.ini"))
        alembic_config.set_main_option("script_location", str(backend_dir / "alembic"))
        alembic_config.set_main_option("sqlalchemy.url", settings.database_url)
        stamp_legacy_sqlite_database(alembic_config)
        command.upgrade(alembic_config, "head")


def stamp_legacy_sqlite_database(alembic_config: Config) -> None:
    """Adopt databases created by the pre-Alembic local prototype.

    The prototype used ``create_all`` and therefore has the Phase 1 tables but
    no reliable Alembic revision. Stamp only a recognizable base schema; a
    partially unrelated SQLite database must still fail visibly.
    """
    base_tables = {
        "learners",
        "roadmap_states",
        "mistake_events",
        "practice_attempts",
        "skill_graph_nodes",
        "skill_graph_edges",
    }
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if not base_tables.issubset(tables):
        return

    versions = []
    if "alembic_version" in tables:
        with engine.connect() as connection:
            versions = connection.execute(text("SELECT version_num FROM alembic_version")).scalars().all()
    if versions:
        return

    learner_columns = {column["name"] for column in inspector.get_columns("learners")}
    command.stamp(alembic_config, "20260907_02" if "display_name" in learner_columns else "20260907_01")


# A direct TestClient instance does not enter FastAPI's lifespan context. Keep
# local SQLite imports and tests usable while production still runs migrations
# as an explicit deployment step.
migrate_development_database()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    errors = exc.errors()
    if any(error.get("loc") == ("body", "goal") and error.get("type") == "missing" for error in errors):
        return JSONResponse(status_code=422, content={"detail": "Goal is required."})
    return JSONResponse(status_code=422, content={"detail": errors})


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "FusionPath API", "status": "ok"}
