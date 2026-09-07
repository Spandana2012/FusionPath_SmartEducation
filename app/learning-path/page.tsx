"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Gauge,
  Route,
  Sparkles,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LearningSectionNav } from "@/components/layout/section-nav";
import type { LearningMilestone, LearningPathResponse, RecommendationItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function LearningPathPage() {
  const [learningPathResponse, setLearningPathResponse] = useState<LearningPathResponse | null>(null);

  useEffect(() => {
    setLearningPathResponse(readStorage<LearningPathResponse>("fusionpath.learningPathResponse"));
  }, []);

  const orderedMilestones = useMemo(() => {
    return [...(learningPathResponse?.path.milestones ?? [])].sort((first, second) => first.order - second.order);
  }, [learningPathResponse]);

  if (!learningPathResponse) {
    return (
      <main className="min-h-[calc(100vh-4rem)]">
        <LearningSectionNav />
        <section className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-16">
          <section className="surface-panel max-w-xl p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-secondary text-primary">
            <Route className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-normal text-foreground">
            Your learning path is not ready yet.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Build it from your saved recommendations to keep your profile, skill gaps, and resources connected.
          </p>
          <Button asChild className="mt-6">
            <Link href="/recommendations">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Recommendations
            </Link>
          </Button>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.5))]">
      <LearningSectionNav />
      <section className="relative border-b border-border">
        <div className="absolute inset-0 fusion-grid opacity-35" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)),transparent)]" aria-hidden="true" />
        <div className="container relative grid gap-8 py-10 lg:grid-cols-[1fr_21rem] lg:items-end lg:py-14">
          <section>
            <Badge variant="secondary" className="w-fit">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {learningPathResponse.ai_generated ? "AI PERSONALIZED" : "ADAPTIVE PATH"}
            </Badge>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              YOUR PERSONALIZED LEARNING PATH
            </p>
            <h1 className="mt-3 max-w-5xl font-display text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-6xl">
              {learningPathResponse.target_role}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              {learningPathResponse.path.title}
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <HeroMetric icon={CalendarRange} label="Timeline" value={`${learningPathResponse.path.duration_months} MONTHS`} />
            <HeroMetric icon={Clock3} label="Pace" value={`${learningPathResponse.path.weekly_hours} HRS / WEEK`} />
            {typeof learningPathResponse.path_quality_score === "number" ? (
              <HeroMetric icon={Gauge} label="Path quality" value={`${learningPathResponse.path_quality_score}%`} />
            ) : (
              <HeroMetric icon={Target} label="Milestones" value={String(orderedMilestones.length).padStart(2, "0")} />
            )}
          </section>
        </div>
      </section>

      <section className="container space-y-8 py-8 lg:py-12">
        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <NarrativePanel title="WHY THIS PATH" icon={Route}>
            {learningPathResponse.path.summary}
          </NarrativePanel>
          <NarrativePanel title="WHY WE BUILT YOUR PATH THIS WAY" icon={Sparkles}>
            {learningPathResponse.reasoning}
          </NarrativePanel>
        </section>

        <section className="grid gap-8 lg:grid-cols-[17rem_1fr]">
          <aside className="lg:sticky lg:top-28 lg:h-fit">
            <div className="surface-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Journey map</p>
              <div className="mt-5 space-y-3">
                {orderedMilestones.map((milestone) => (
                  <a
                    key={milestone.id}
                    href={`#${milestone.id}`}
                    className="focus-ring flex items-center gap-3 rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-accent/35 hover:text-foreground"
                  >
                    <span className="font-semibold text-accent">{String(milestone.order).padStart(2, "0")}</span>
                    <span className="line-clamp-1">{milestone.title}</span>
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <section className="relative">
            <div className="absolute bottom-8 left-5 top-8 hidden w-px bg-[linear-gradient(180deg,hsl(var(--accent)/0.8),hsl(var(--primary)/0.18),hsl(var(--violet)/0.65))] sm:block" aria-hidden="true" />
            <div className="space-y-6">
              {orderedMilestones.map((milestone, index) => (
                <MilestoneCard key={milestone.id} milestone={milestone} index={index} />
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarRange;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/80 p-4 shadow-soft backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function NarrativePanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Route;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-panel relative overflow-hidden p-6 sm:p-7">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)),transparent)]" aria-hidden="true" />
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">{title}</h2>
      </div>
      <p className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">{children}</p>
    </section>
  );
}

function MilestoneCard({ milestone, index }: { milestone: LearningMilestone; index: number }) {
  return (
    <article
      id={milestone.id}
      className="relative scroll-mt-28 rounded-lg border border-border bg-card/80 p-5 shadow-soft backdrop-blur-xl transition-all duration-200 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 hover:border-accent/35 hover:shadow-neon-cyan sm:ml-12 sm:p-6"
      style={{ animationDelay: `${Math.min(index * 90, 540)}ms` }}
    >
      <span className="absolute -left-[3.72rem] top-7 hidden h-10 w-10 items-center justify-center rounded-full border border-accent/45 bg-background text-xs font-semibold text-accent shadow-neon-cyan sm:flex">
        {String(milestone.order).padStart(2, "0")}
      </span>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Milestone {String(milestone.order).padStart(2, "0")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-normal text-foreground">
            {milestone.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{milestone.description}</p>
        </div>
        <div className="rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
          {milestone.estimated_hours} hours
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DetailBlock title="Skills">
          <div className="flex flex-wrap gap-2">
            {milestone.skills.map((skill) => (
              <span key={`${milestone.id}-${skill}`} className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground">
                {skill}
              </span>
            ))}
          </div>
        </DetailBlock>

        <DetailBlock title="Assessment">
          <p className="text-sm leading-6 text-muted-foreground">{milestone.assessment}</p>
        </DetailBlock>
      </div>

      <DetailBlock title="Completion criteria" className="mt-4">
        <ul className="grid gap-2">
          {milestone.completion_criteria.map((criterion) => (
            <li key={`${milestone.id}-${criterion}`} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span>{criterion}</span>
            </li>
          ))}
        </ul>
      </DetailBlock>

      {milestone.resources.length ? (
        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Resources in this milestone</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {milestone.resources.map((resource) => (
              <ResourceCard key={`${milestone.id}-${resource.resource_id}`} resource={resource} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function DetailBlock({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-background/60 p-4", className)}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function ResourceCard({ resource }: { resource: RecommendationItem }) {
  return (
    <article className="rounded-lg border border-border bg-card/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{resource.provider}</p>
          <h4 className="mt-2 text-sm font-semibold leading-6 text-foreground">{resource.title}</h4>
        </div>
        <span className="shrink-0 rounded-md border border-border bg-background/70 px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
          {resource.type}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{resource.reason}</p>
      {resource.url ? (
        <Button asChild size="sm" variant="outline" className="mt-4">
          <a href={resource.url} target="_blank" rel="noopener noreferrer">
            View Resource
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </Button>
      ) : null}
    </article>
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
