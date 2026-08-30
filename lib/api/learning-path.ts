import { apiClient } from "@/lib/api/client";
import type { LearningPathRequest, LearningPathResponse } from "@/lib/types";

export function generateLearningPath(request: LearningPathRequest): Promise<LearningPathResponse> {
  return apiClient<LearningPathResponse>("/api/learning-path", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
