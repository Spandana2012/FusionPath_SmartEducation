import { apiClient } from "@/lib/api/client";
import type { LearnerContext } from "@/lib/types";

export function getLearnerContext(learnerId: string): Promise<LearnerContext> {
  return apiClient<LearnerContext>(`/api/adaptive/context/${encodeURIComponent(learnerId)}`);
}

export type PracticeEvaluation = {
  correct: boolean;
  feedback: string;
  next_actions: string[];
  roadmap_adjustment: { needed: boolean; insert_before: string; steps: string[]; reason: string } | null;
};

export function evaluatePractice(request: {
  learner_id: string;
  skill: string;
  question_id: string;
  selected_answer: string;
  correct_answer: string;
  attempts?: number;
}): Promise<PracticeEvaluation> {
  return apiClient<PracticeEvaluation>("/api/adaptive/practice/evaluate", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export type TutorResponse = {
  message: string;
  intent: string;
  concept: string;
  next_action: string;
  difficulty: string;
};

export function askTutor(request: { learner_id: string; message: string; concept?: string }): Promise<TutorResponse> {
  return apiClient<TutorResponse>("/api/adaptive/tutor/chat", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
