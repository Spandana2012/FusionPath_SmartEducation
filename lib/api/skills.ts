import { apiClient } from "@/lib/api/client";
import type { SkillGapRequest, SkillGapResponse } from "@/lib/types";

export function analyzeSkillGap(request: SkillGapRequest): Promise<SkillGapResponse> {
  return apiClient<SkillGapResponse>("/api/skills/gap", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
