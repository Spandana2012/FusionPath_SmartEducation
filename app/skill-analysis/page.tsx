"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BrainCircuit, CheckCircle2, ChevronDown, RotateCcw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getRecommendations } from "@/lib/api/recommendations";
import { analyzeSkillGap } from "@/lib/api/skills";
import type { BackendLearnerProfile, SkillGapItem, SkillGapResponse, SkillStrengthItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const readinessLabels: Record<SkillGapResponse["readiness_label"], string> = {
  ready: "Ready",
  nearly_ready: "Nearly ready",
  needs_focused_learning: "Needs focused learning",
  foundation_needed: "Foundation needed",
};

const priorityStyles: Record<SkillGapItem["priority"], string> = {
  high: "border-warning/35 bg-warning/10 text-warning",
  medium: "border-accent/35 bg-accent/10 text-accent",
  low: "border-border bg-secondary text-muted-foreground",
};

const recommendationLoadingMessages = [
  "Matching resources to your skill gaps...",
  "Personalizing your recommendations...",
  "Finding the best next steps...",
];

export default function SkillAnalysisPage() {
  const router = useRouter();
  const [skillGap, setSkillGap] = useState<SkillGapResponse | null>(null);
  const [normalizedProfile, setNormalizedProfile] = useState<BackendLearnerProfile | null>(null);
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isBuildingRecommendations, setIsBuildingRecommendations] = useState(false);
  const [recommendationError, setRecommendationError] = useState(false);
  const [error, setError] = useState(false);
  const recommendationSubmissionRef = useRef(false);

  useEffect(() => {
    setSkillGap(readStorage<SkillGapResponse>("fusionpath.skillGapResponse"));
    setNormalizedProfile(readStorage<BackendLearnerProfile>("fusionpath.normalizedProfile"));
    setLearnerId(window.localStorage.getItem("fusionpath.learnerId"));
  }, []);

  async function retryAnalysis() {
    if (!learnerId || !normalizedProfile || isRetrying) return;

    setError(false);
    setIsRetrying(true);
    try {
      const response = await analyzeSkillGap({ learner_id: learnerId, profile: normalizedProfile });
      window.localStorage.setItem("fusionpath.skillGapResponse", JSON.stringify(response));
      setSkillGap(response);
    } catch (retryError) {
      if (process.env.NODE_ENV === "development") {
        console.error("Skill gap retry failed", retryError);
      }
      setError(true);
    } finally {
      setIsRetrying(false);
    }
  }

  async function buildRecommendations() {
    const requestLearnerId = learnerId ?? skillGap?.learner_id;
    if (!requestLearnerId || !normalizedProfile || !skillGap || recommendationSubmissionRef.current) return;

    recommendationSubmissionRef.current = true;
    setRecommendationError(false);
    setIsBuildingRecommendations(true);

    try {
      const response = await getRecommendations({
        learner_id: requestLearnerId,
        profile: normalizedProfile,
        skill_gaps: skillGap.skill_gaps,
      });
      window.localStorage.setItem("fusionpath.learnerId", requestLearnerId);
      window.localStorage.setItem("fusionpath.normalizedProfile", JSON.stringify(normalizedProfile));
      window.localStorage.setItem("fusionpath.skillGapResponse", JSON.stringify(skillGap));
      window.localStorage.setItem("fusionpath.recommendationResponse", JSON.stringify(response));
      router.push("/recommendations");
    } catch (recommendationRequestError) {
      if (process.env.NODE_ENV === "development") {
        console.error("Recommendation request failed", recommendationRequestError);
      }
      setRecommendationError(true);
      setIsBuildingRecommendations(false);
      recommendationSubmissionRef.current = false;
    }
  }

  if (!skillGap) {
    return (
      <main className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
        <section className="surface-panel max-w-xl p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-primary">
            <BrainCircuit className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-normal text-foreground">
            Your skill landscape is not ready yet.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Complete onboarding first, or try rebuilding the analysis from your saved profile.
          </p>
          {error ? (
            <p className="mt-4 text-sm text-destructive">We couldn&apos;t map your skills right now.</p>
          ) : null}
          <Button className="mt-6" onClick={retryAnalysis} disabled={!learnerId || !normalizedProfile || isRetrying}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {isRetrying ? "Mapping your skills..." : "Try again"}
          </Button>
        </section>
      </main>
    );
  }

  if (isBuildingRecommendations) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.45))]">
        <section className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
          <RecommendationLoadingState />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.45))]">
      <section className="container space-y-8 py-8 lg:py-12">
        <header className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-stretch">
          <section className="surface-panel p-6 sm:p-8">
            <Badge variant="secondary" className="w-fit">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Skill landscape
            </Badge>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {skillGap.target_role}
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">
              Your strongest next moves are now visible.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              FusionPath compared your profile with the target role requirements and mapped the highest-value gaps.
            </p>
          </section>

          <section className="surface-panel flex flex-col items-center justify-center p-6 text-center">
            <ReadinessIndicator score={skillGap.readiness_score} />
            <p className="mt-4 text-sm font-semibold text-foreground">{readinessLabels[skillGap.readiness_label]}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Overall readiness</p>
          </section>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <OverviewPanel title="Strengths" emptyLabel="No role-ready strengths yet.">
            {skillGap.strengths.map((strength) => (
              <StrengthRow key={strength.skill} strength={strength} />
            ))}
          </OverviewPanel>

          <OverviewPanel title="Your biggest opportunities" emptyLabel="No critical missing skills returned.">
            {skillGap.missing_critical_skills.length ? (
              <div className="flex flex-wrap gap-2">
                {skillGap.missing_critical_skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md border border-warning/35 bg-warning/10 px-3 py-2 text-sm font-medium text-warning shadow-neon-violet"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}
          </OverviewPanel>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-normal text-foreground">Skill gaps</h2>
              <p className="mt-2 text-sm text-muted-foreground">Ordered by priority, importance, and skill name.</p>
            </div>
            <Button
              onClick={buildRecommendations}
              disabled={(!learnerId && !skillGap.learner_id) || !normalizedProfile || isBuildingRecommendations}
              aria-describedby={recommendationError ? "recommendation-error" : undefined}
            >
              Build My Learning Path
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {recommendationError ? (
            <div
              id="recommendation-error"
              className="surface-panel border-destructive/35 bg-destructive/10 p-5"
              role="alert"
            >
              <h3 className="font-display text-lg font-semibold tracking-normal text-foreground">
                We couldn&apos;t personalize your resources right now.
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your skill analysis is safe. Try again to load recommendations.
              </p>
              <Button type="button" className="mt-4" onClick={buildRecommendations}>
                Try Again
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ) : null}

          {skillGap.skill_gaps.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {skillGap.skill_gaps.map((gap) => (
                <SkillGapCard key={gap.skill} gap={gap} />
              ))}
            </div>
          ) : (
            <EmptyPanel label="No skill gaps returned for this target role." />
          )}
        </section>
      </section>
    </main>
  );
}

function RecommendationLoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % recommendationLoadingMessages.length);
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
      <h1 className="font-display text-2xl font-semibold tracking-normal text-foreground">
        {recommendationLoadingMessages[messageIndex]}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        FusionPath is selecting resources that match your goals, gaps, pace, and learning style.
      </p>
      <div className="mx-auto mt-7 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/2 rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)))] motion-safe:animate-[ambient-shift_1.6s_ease-in-out_infinite_alternate]" />
      </div>
    </section>
  );
}

function ReadinessIndicator({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(score, 100));
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setAnimatedScore(clampedScore);
      return;
    }

    let frame = 0;
    const totalFrames = 42;
    const animation = window.setInterval(() => {
      frame += 1;
      setAnimatedScore(Math.round((clampedScore * frame) / totalFrames));
      if (frame >= totalFrames) window.clearInterval(animation);
    }, 18);

    return () => window.clearInterval(animation);
  }, [clampedScore]);

  return (
    <div className="relative h-36 w-36" aria-label={`Readiness score ${clampedScore}%`} role="img">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#readinessGradient)"
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-300"
        />
        <defs>
          <linearGradient id="readinessGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="58%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--violet))" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-3xl font-semibold text-foreground">
        {animatedScore}%
      </span>
    </div>
  );
}

function OverviewPanel({
  title,
  emptyLabel,
  children,
}: {
  title: string;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const hasContent = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="surface-panel p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
      <div className="mt-4 space-y-3">{hasContent ? children : <EmptyPanel label={emptyLabel} />}</div>
    </section>
  );
}

function StrengthRow({ strength }: { strength: SkillStrengthItem }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-success/25 bg-success/10 p-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-foreground">{strength.skill}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{strength.explanation}</p>
      </div>
    </div>
  );
}

function SkillGapCard({ gap }: { gap: SkillGapItem }) {
  const [expanded, setExpanded] = useState(false);
  const gapPercent = Math.round(gap.gap_score * 100);

  return (
    <article
      className={cn(
        "group rounded-lg border bg-card/80 p-5 shadow-soft backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-neon-cyan focus-within:shadow-neon-cyan",
        gap.priority === "high" ? "border-warning/35" : "border-border",
      )}
    >
      <button
        type="button"
        className="focus-ring flex w-full items-start justify-between gap-4 rounded-md text-left"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
      >
        <span>
          <span className="block text-lg font-semibold text-foreground">{gap.skill}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{gap.category}</span>
        </span>
        <span className="flex items-center gap-2">
          <Badge className={cn("uppercase", priorityStyles[gap.priority])} variant="outline">
            {gap.priority} priority
          </Badge>
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
            aria-hidden="true"
          />
        </span>
      </button>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label="Current" value={gap.current_level} />
        <Metric label="Required" value={gap.required_level} />
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Gap</span>
          <span>{gapPercent}%</span>
        </div>
        <Progress value={gapPercent} aria-label={`${gap.skill} gap ${gapPercent}%`} className="h-2.5" />
      </div>

      <p className="mt-5 text-sm leading-6 text-muted-foreground">{gap.explanation}</p>

      {expanded ? (
        <div className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
          <Metric label="Status" value={gap.status} />
          <Metric label="Priority score" value={gap.priority_score} />
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Prerequisites</p>
            <p className="mt-2 text-foreground">{gap.prerequisites.length ? gap.prerequisites.join(", ") : "None listed"}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold capitalize text-foreground">{value}</p>
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/70 p-5 text-sm text-muted-foreground">
      {label}
    </div>
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
