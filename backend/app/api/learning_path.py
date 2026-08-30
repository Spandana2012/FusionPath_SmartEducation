from fastapi import APIRouter

from app.schemas.learning_path import LearningPathRequest, LearningPathResponse
from app.services.learning_path_service import generate_learning_path


router = APIRouter(prefix="/api/learning-path", tags=["Learning Path"])


@router.post("", response_model=LearningPathResponse)
def create_learning_path(payload: LearningPathRequest) -> LearningPathResponse:
    return generate_learning_path(payload)
