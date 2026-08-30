import { apiClient } from "@/lib/api/client";
import type {
  BackendLearnerProfile,
  BackendLearningPreference,
  LearnerProfile,
  LearnerProfileRequest,
  LearnerProfileResponse,
  LearningPreference,
} from "@/lib/types";

const preferenceMap: Record<LearningPreference, BackendLearningPreference> = {
  "Project based": "project_based",
  "Structured courses": "structured_courses",
  Reading: "reading",
  Video: "video",
  Mixed: "mixed",
};

export function toBackendLearnerProfile(profile: LearnerProfile): BackendLearnerProfile {
  return {
    goal: profile.goal,
    experience_level: profile.experience.toLowerCase() as BackendLearnerProfile["experience_level"],
    skills: profile.currentSkills,
    completed_courses: profile.learningHistory
      .filter((item) => item.completed)
      .map((item) => ({
        name: item.resourceName,
        skills: [item.skillGained],
      })),
    weekly_hours: parseWeeklyHours(profile.weeklyAvailability),
    learning_preference: preferenceMap[profile.learningPreference],
    timeline_months: parseTimelineMonths(profile.timeline),
  };
}

export function analyzeProfile(profile: LearnerProfile): Promise<LearnerProfileResponse> {
  const request: LearnerProfileRequest = toBackendLearnerProfile(profile);
  return apiClient<LearnerProfileResponse>("/api/profile/analyze", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

function parseWeeklyHours(value: string): number {
  if (value.includes("3-5")) return 5;
  if (value.includes("5-10")) return 10;
  if (value.includes("10-15")) return 15;
  if (value.includes("15+")) return 15;
  return 10;
}

function parseTimelineMonths(value: string): number {
  const match = value.match(/\d+/);
  if (!match) return 6;

  const amount = Number(match[0]);
  if (value.toLowerCase().includes("week")) return Math.max(1, Math.round(amount / 4));
  if (value.toLowerCase().includes("year")) return amount * 12;
  return amount;
}
