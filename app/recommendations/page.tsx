"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  FileText,
  GraduationCap,
  Hammer,
  PlayCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateLearningPath } from "@/lib/api/learning-path";
import { getRecommendations } from "@/lib/api/recommendations";
import type {
  BackendLearnerProfile,
  RecommendationItem,
  RecommendationResponse,
  ResourceType,
  SkillGapResponse,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterOption = "all" | "project" | "course" | "tutorial";

const filterOptions: Array<{ label: string; value: FilterOption }> = [
  { label: "All", value: "all" },
  { label: "Projects", value: "project" },
  { label: "Courses", value: "course" },
  { label: "Tutorials", value: "tutorial" },
];

const priorityStyles: Record<RecommendationItem["priority"], string> = {
  high: "border-warning/35 bg-warning/10 text-warning",
  medium: "border-accent/35 bg-accent/10 text-accent",
  low: "border-border bg-secondary text-muted-foreground",
};

const resourceIcons: Record<ResourceType, typeof BookOpen> = {
  project: Hammer,
  course: GraduationCap,
  tutorial: BookOpen,
  video: PlayCircle,
  article: FileText,
  assessment: ClipboardCheck,
};

const loadingMessages = [
  "Matching resources to your skill gaps...",
  "Personalizing your recommendations...",
  "Finding the best next steps...",
];

const learningPathLoadingMessages = [
  "Mapping your skill gaps...",
  "Ordering your learning journey...",
  "Balancing your workload...",
  "Personalizing your milestones...",
  "Building your path...",
];

export default function RecommendationsPage() {
  const router = useRouter();
  const [recommendationResponse, setRecommendationResponse] = useState<RecommendationResponse | null>(null);
  const [skillGapResponse, setSkillGapResponse] = useState<SkillGapResponse | null>(null);
  const [normalizedProfile, setNormalizedProfile] = useState<BackendLearnerProfile | null>(null);
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [isRetrying, setIsRetrying] = useState(false);
  const [isBuildingLearningPath, setIsBuildingLearningPath] = useState(false);
  const [error, setError] = useState(false);
  const [learningPathError, setLearningPathError] = useState(false);
  const retryRequestRef = useRef(false);
  const learningPathRequestRef = useRef(false);

  useEffect(() => {
    setRecommendationResponse(readStorage<RecommendationResponse>("fusionpath.recommendationResponse"));
    setSkillGapResponse(readStorage<SkillGapResponse>("fusionpath.skillGapResponse"));
    setNormalizedProfile(readStorage<BackendLearnerProfile>("fusionpath.normalizedProfile"));
    setLearnerId(window.localStorage.getItem("fusionpath.learnerId"));
  }, []);

  const filteredRecommendations = useMemo(() => {
    const recommendations = recommendationResponse?.recommendations ?? [];
    if (activeFilter === "all") return recommendations;
    return recommendations.filter((recommendation) => recommendation.type === activeFilter);
  }, [activeFilter, recommendationResponse]);

  async function retryRecommendations() {
    const requestLearnerId = learnerId ?? skillGapResponse?.learner_id;
    if (!requestLearnerId || !normalizedProfile || !skillGapResponse || retryRequestRef.current) return;

    retryRequestRef.current = true;
    setError(false);
    setIsRetrying(true);

    try {
      const response = await getRecommendations({
        learner_id: requestLearnerId,
        profile: normalizedProfile,
        skill_gaps: skillGapResponse.skill_gaps,
      });
      window.localStorage.setItem("fusionpath.learnerId", requestLearnerId);
      window.localStorage.setItem("fusionpath.recommendationResponse", JSON.stringify(response));
      setRecommendationResponse(response);
    } catch (retryError) {
      if (process.env.NODE_ENV === "development") {
        console.error("Recommendation retry failed", retryError);
      }
      setError(true);
    } finally {
      setIsRetrying(false);
      retryRequestRef.current = false;
    }
  }

  async function buildLearningPath() {
    const requestLearnerId = learnerId ?? recommendationResponse?.learner_id ?? skillGapResponse?.learner_id;
    if (
      !requestLearnerId ||
      !normalizedProfile ||
      !skillGapResponse ||
      !recommendationResponse ||
      learningPathRequestRef.current
    ) {
      setLearningPathError(true);
      return;
    }

    learningPathRequestRef.current = true;
    setLearningPathError(false);
    setIsBuildingLearningPath(true);

    try {
      const response = await generateLearningPath({
        learner_id: requestLearnerId,
        profile: normalizedProfile,
        skill_gaps: skillGapResponse.skill_gaps,
        recommendations: recommendationResponse.recommendations,
      });
      window.localStorage.setItem("fusionpath.learnerId", requestLearnerId);
      window.localStorage.setItem("fusionpath.normalizedProfile", JSON.stringify(normalizedProfile));
      window.localStorage.setItem("fusionpath.skillGapResponse", JSON.stringify(skillGapResponse));
      window.localStorage.setItem("fusionpath.recommendationResponse", JSON.stringify(recommendationResponse));
      window.localStorage.setItem("fusionpath.learningPathResponse", JSON.stringify(response));
      router.push("/learning-path");
    } catch (learningPathRequestError) {
      if (process.env.NODE_ENV === "development") {
        console.error("Learning path request failed", learningPathRequestError);
      }
      setLearningPathError(true);
      setIsBuildingLearningPath(false);
      learningPathRequestRef.current = false;
    }
  }

  if (isRetrying) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.45))]">
        <section className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
          <RecommendationLoadingState />
        </section>
      </main>
    );
  }

  if (isBuildingLearningPath) {
    return (
      <main className="min-h-[calc(100vh-4rem)] overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.45))]">
        <section className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
          <LearningPathLoadingState />
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
        <section className="surface-panel max-w-xl p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-destructive/35 bg-destructive/10 text-destructive">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-normal text-foreground">
            We couldn&apos;t personalize your resources right now.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your skill analysis is safe. Try again to load recommendations.
          </p>
          <Button className="mt-6" onClick={retryRecommendations}>
            Try Again
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </section>
      </main>
    );
  }

  if (!recommendationResponse) {
    return (
      <main className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
        <section className="surface-panel max-w-xl p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-primary">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-normal text-foreground">
            No recommendations found yet.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your learner profile may need more information before resources can be selected.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="outline">
              <Link href="/skill-analysis">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Skill Landscape
              </Link>
            </Button>
            <Button
              onClick={retryRecommendations}
              disabled={(!learnerId && !skillGapResponse?.learner_id) || !normalizedProfile || !skillGapResponse}
            >
              Try Again
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.45))]">
      <section className="container space-y-8 py-8 lg:py-12">
        <header className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-stretch">
          <section className="surface-panel p-6 sm:p-8">
            <Badge variant="secondary" className="w-fit">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Recommended for you
            </Badge>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {recommendationResponse.target_role}
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">
              RECOMMENDED FOR YOU
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Resources selected based on your goals, skill gaps, experience and learning preferences.
            </p>
            <p className="mt-4 text-sm font-medium text-foreground">
              These resources were selected specifically for you.
            </p>
            {learningPathError ? (
              <p className="mt-4 text-sm text-destructive" role="alert">
                We couldn&apos;t build your learning path yet. Your profile and recommendations are safe.
              </p>
            ) : null}
            <Button
              className="mt-6"
              onClick={buildLearningPath}
              disabled={
                isBuildingLearningPath ||
                (!learnerId && !recommendationResponse.learner_id && !skillGapResponse?.learner_id) ||
                !normalizedProfile ||
                !skillGapResponse ||
                !recommendationResponse
              }
            >
              BUILD MY LEARNING PATH
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </section>

          <section className="surface-panel flex flex-col justify-center p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Selected resources</p>
            <p className="mt-3 text-4xl font-semibold text-foreground">{recommendationResponse.recommendations.length}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Ranked from your returned recommendation set.</p>
          </section>
        </header>

        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-normal text-foreground">Your resource matches</h2>
            <p className="mt-2 text-sm text-muted-foreground">Filter the resources already selected for your profile.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Recommendation filters">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={activeFilter === option.value}
                onClick={() => setActiveFilter(option.value)}
                className={cn(
                  "focus-ring rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  activeFilter === option.value
                    ? "border-accent/45 bg-accent/10 text-accent"
                    : "border-border bg-card/60 text-muted-foreground hover:border-primary/35 hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {recommendationResponse.recommendations.length === 0 ? (
          <EmptyPanel />
        ) : filteredRecommendations.length ? (
          <section className="grid gap-4 xl:grid-cols-2">
            {filteredRecommendations.map((recommendation, index) => (
              <RecommendationCard key={recommendation.resource_id} recommendation={recommendation} index={index} />
            ))}
          </section>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
            No recommendations found yet.
          </div>
        )}

        {recommendationResponse.uncovered_skills.length > 0 ? (
          <section className="surface-panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              SKILLS WE COULDN&apos;T MATCH YET
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {recommendationResponse.uncovered_skills.map((skill) => (
                <span key={skill} className="rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-muted-foreground">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function RecommendationCard({ recommendation, index }: { recommendation: RecommendationItem; index: number }) {
  const Icon = resourceIcons[recommendation.type];

  return (
    <article
      className="group rounded-lg border border-border bg-card/80 p-5 shadow-soft backdrop-blur-xl transition-all duration-200 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 hover:-translate-y-1 hover:border-accent/35 hover:shadow-neon-cyan focus-within:shadow-neon-cyan"
      style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("uppercase", priorityStyles[recommendation.priority])} variant="outline">
              {recommendation.priority}
            </Badge>
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              {recommendation.type}
            </span>
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-accent">{recommendation.skill}</p>
          <h2 className="mt-2 font-display text-xl font-semibold leading-tight tracking-normal text-foreground">
            {recommendation.title}
          </h2>
          <p className="mt-3 text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {recommendation.provider} - {recommendation.difficulty}
          </p>
        </div>
        <MatchScore score={recommendation.match_score} title={recommendation.title} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Metric label="Estimated time" value={`${recommendation.estimated_hours} hours`} />
        <Metric label="Primary skill" value={recommendation.skill} />
      </div>

      <p className="mt-5 text-sm leading-6 text-muted-foreground">{recommendation.description}</p>

      <div className="mt-5 flex flex-wrap gap-2" aria-label={`Related skills for ${recommendation.title}`}>
        {recommendation.skills.map((skill) => (
          <span
            key={`${recommendation.resource_id}-${skill}`}
            className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground"
          >
            {skill}
          </span>
        ))}
      </div>

      <section className="mt-5 rounded-lg border border-accent/20 bg-accent/5 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">WHY THIS IS FOR YOU</h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{recommendation.reason}</p>
      </section>

      <div className="mt-5 flex justify-end">
        {recommendation.url ? (
          <Button asChild>
            <a
              href={recommendation.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${recommendation.title} resource. Opens in a new tab.`}
            >
              View Resource
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function MatchScore({ score, title }: { score: number; title: string }) {
  const gradientId = useId();
  const [animatedScore, setAnimatedScore] = useState(0);
  const clampedScore = Math.max(0, Math.min(score, 100));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setAnimatedScore(clampedScore);
      return;
    }

    let frame = 0;
    const totalFrames = 38;
    const animation = window.setInterval(() => {
      frame += 1;
      setAnimatedScore(Math.round((clampedScore * frame) / totalFrames));
      if (frame >= totalFrames) window.clearInterval(animation);
    }, 18);

    return () => window.clearInterval(animation);
  }, [clampedScore]);

  return (
    <div className="relative h-28 w-28 shrink-0 self-start" role="img" aria-label={`${title} match score ${clampedScore}%`}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-300"
        />
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="60%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--violet))" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-semibold leading-none text-foreground">{animatedScore}%</span>
        <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Match</span>
      </span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold capitalize text-foreground">{value}</p>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/60 p-6">
      <h2 className="font-display text-xl font-semibold tracking-normal text-foreground">No recommendations found yet.</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        The learner profile may need more information before FusionPath can match resources.
      </p>
    </div>
  );
}

function RecommendationLoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 1150);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      className="surface-panel w-full max-w-2xl p-8 text-center sm:p-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-accent/35 bg-secondary text-accent shadow-neon-cyan">
        <Sparkles className="h-6 w-6 motion-safe:animate-pulse" aria-hidden="true" />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-normal text-foreground">{loadingMessages[messageIndex]}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        FusionPath is selecting resources that match your goals, gaps, pace, and learning style.
      </p>
      <div className="mx-auto mt-7 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/2 rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)))] motion-safe:animate-[ambient-shift_1.6s_ease-in-out_infinite_alternate]" />
      </div>
    </section>
  );
}

function LearningPathLoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % learningPathLoadingMessages.length);
    }, 1100);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      className="relative w-full max-w-3xl overflow-hidden rounded-lg border border-accent/25 bg-card/80 p-8 text-center shadow-neon-cyan backdrop-blur-xl sm:p-12"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="absolute inset-0 fusion-grid opacity-40" aria-hidden="true" />
      <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,hsl(var(--accent)),transparent)]" aria-hidden="true" />
      <div className="relative mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-lg border border-accent/35 bg-secondary text-accent shadow-neon-cyan">
        <span className="absolute inset-2 rounded-md border border-primary/25 motion-safe:animate-pulse" aria-hidden="true" />
        <Sparkles className="relative h-7 w-7" aria-hidden="true" />
      </div>
      <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-accent">Learning path builder</p>
      <h1 className="relative mt-4 font-display text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
        {learningPathLoadingMessages[messageIndex]}
      </h1>
      <div className="relative mx-auto mt-8 flex max-w-xl items-center justify-between gap-3" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((item) => (
          <span key={item} className="h-2 flex-1 rounded-full bg-secondary">
            <span
              className="block h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)))] motion-safe:animate-[connection-pulse_1.7s_ease-in-out_infinite]"
              style={{ animationDelay: `${item * 140}ms` }}
            />
          </span>
        ))}
      </div>
    </section>
  );
}

function readStorage<TValue>(key: string): TValue | null {
  const value = window.localStorage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as TValue;
  } catch {
    return null;
  }
}
