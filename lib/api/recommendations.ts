import { apiClient } from "@/lib/api/client";
import type { RecommendationRequest, RecommendationResponse } from "@/lib/types";

export function getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
  return apiClient<RecommendationResponse>("/api/recommendations", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
