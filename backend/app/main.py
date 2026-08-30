from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.learning_path import router as learning_path_router
from app.api.profile import router as profile_router
from app.api.recommendations import router as recommendations_router
from app.api.skills import router as skills_router
from app.core.config import settings

app = FastAPI(
    title="FusionPath API",
    description="Backend services for the FusionPath personalized learning platform.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(profile_router)
app.include_router(skills_router)
app.include_router(recommendations_router)
app.include_router(learning_path_router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    errors = exc.errors()
    if any(error.get("loc") == ("body", "goal") and error.get("type") == "missing" for error in errors):
        return JSONResponse(status_code=422, content={"detail": "Goal is required."})
    return JSONResponse(status_code=422, content={"detail": errors})


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
