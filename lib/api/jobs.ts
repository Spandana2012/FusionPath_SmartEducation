import { apiClient } from "@/lib/api/client";

export type JobListing = {
  id: string;
  domain: string;
  title: string;
  company: string;
  location: string;
  link: string;
  posted_date: string | null;
  seniority: string;
  match_reason: string;
};

export type JobRecommendations = { learner_id: string; domain: string; jobs: JobListing[]; message: string };

export function getJobRecommendations(learnerId: string) {
  return apiClient<JobRecommendations>(`/api/jobs/recommendations/${encodeURIComponent(learnerId)}`);
}
