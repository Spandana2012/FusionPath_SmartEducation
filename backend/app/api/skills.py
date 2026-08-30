from fastapi import APIRouter

from app.schemas.skills import SkillGapRequest, SkillGapResponse
from app.services.skill_gap_service import analyze_skill_gap

router = APIRouter(prefix="/api/skills", tags=["Skills"])


@router.post(
    "/gap",
    response_model=SkillGapResponse,
    responses={
        400: {
            "description": "Unsupported learning goal",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Unsupported learning goal. Please choose a supported target role."
                    }
                }
            },
        }
    },
)
def analyze_learner_skill_gap(payload: SkillGapRequest) -> SkillGapResponse:
    return analyze_skill_gap(payload)
