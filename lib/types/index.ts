import type { ComponentType } from "react";

export type NavItem = {
  label: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
};

export type SkillGap = {
  id: string;
  name: string;
  currentLevel: number;
  targetLevel: number;
  priority: "low" | "medium" | "high";
};

export type LearningPathStep = {
  id: string;
  title: string;
  description: string;
  status: "locked" | "ready" | "in-progress" | "complete";
  estimatedHours: number;
};

export type UserGoal = {
  id: string;
  title: string;
  targetRole?: string;
  timelineWeeks?: number;
};

export type ExperienceLevel = "Beginner" | "Intermediate" | "Advanced";

export type LearningPreference = "Project based" | "Structured courses" | "Reading" | "Video" | "Mixed";

export type CompletedLearning = {
  id: string;
  resourceName: string;
  skillGained: string;
  completed: boolean;
};

export type LearnerProfile = {
  goal: string;
  experience: ExperienceLevel;
  currentSkills: string[];
  learningHistory: CompletedLearning[];
  weeklyAvailability: string;
  learningPreference: LearningPreference;
  timeline: string;
  createdAt: string;
};

export type BackendExperienceLevel = "beginner" | "intermediate" | "advanced";

export type BackendLearningPreference = "project_based" | "structured_courses" | "reading" | "video" | "mixed";

export type CompletedCourse = {
  name: string;
  skills: string[];
};

export type BackendLearnerProfile = {
  goal: string;
  experience_level: BackendExperienceLevel;
  skills: string[];
  completed_courses: CompletedCourse[];
  weekly_hours: number;
  learning_preference: BackendLearningPreference;
  timeline_months: number;
};

export type LearnerProfileRequest = BackendLearnerProfile;

export type LearnerProfileResponse = {
  learner_id: string;
  profile: BackendLearnerProfile;
  message: string;
};

export type SkillGapRequest = {
  learner_id: string;
  profile: BackendLearnerProfile;
};

export type SkillGapItem = {
  skill: string;
  category: string;
  required_level: number;
  current_level: number;
  gap_score: number;
  priority_score: number;
  priority: "high" | "medium" | "low";
  status: "strong" | "developing" | "missing";
  importance: number;
  prerequisites: string[];
  explanation: string;
};

export type SkillStrengthItem = {
  skill: string;
  category: string;
  current_level: number;
  required_level: number;
  importance: number;
  explanation: string;
};

export type SkillGapResponse = {
  learner_id: string;
  target_role: string;
  matched_goal: string;
  readiness_score: number;
  readiness_label: "ready" | "nearly_ready" | "needs_focused_learning" | "foundation_needed";
  skill_gaps: SkillGapItem[];
  strengths: SkillStrengthItem[];
  missing_critical_skills: string[];
  message: string;
};

export type RecommendationRequest = {
  learner_id: string;
  profile: BackendLearnerProfile;
  skill_gaps: SkillGapItem[];
};

export type ResourceType = "course" | "project" | "tutorial" | "article" | "video" | "assessment";

export type ResourceDifficulty = "beginner" | "intermediate" | "advanced";

export type RecommendationItem = {
  resource_id: string;
  title: string;
  type: ResourceType;
  provider: string;
  url: string;
  description: string;
  skill: string;
  skills: string[];
  difficulty: ResourceDifficulty;
  estimated_hours: number;
  match_score: number;
  priority: "high" | "medium" | "low";
  reason: string;
};

export type SkillRecommendationGroup = {
  skill: string;
  recommendations: RecommendationItem[];
};

export type RecommendationResponse = {
  learner_id: string;
  target_role: string;
  recommendations: RecommendationItem[];
  skill_recommendations: SkillRecommendationGroup[];
  uncovered_skills: string[];
  message: string;
};

export type LearningPathRequest = {
  learner_id: string;
  profile: BackendLearnerProfile;
  skill_gaps: SkillGapItem[];
  recommendations: RecommendationItem[];
};

export type LearningMilestone = {
  id: string;
  order: number;
  title: string;
  description: string;
  estimated_hours: number;
  skills: string[];
  resource_ids: string[];
  resources: RecommendationItem[];
  assessment: string;
  completion_criteria: string[];
};

export type LearningPath = {
  title: string;
  duration_months: number;
  weekly_hours: number;
  summary: string;
  milestones: LearningMilestone[];
};

export type LearningPathResponse = {
  learner_id: string;
  target_role: string;
  path: LearningPath;
  reasoning: string;
  ai_generated: boolean;
  message: string;
  path_quality_score: number | null;
};
