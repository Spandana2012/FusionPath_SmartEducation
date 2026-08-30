from fastapi import APIRouter

from app.schemas.recommendations import RecommendationRequest, RecommendationResponse
from app.services.recommendation_service import generate_recommendations


router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


@router.post("", response_model=RecommendationResponse)
def recommend_learning_resources(payload: RecommendationRequest) -> RecommendationResponse:
    return generate_recommendations(payload)
