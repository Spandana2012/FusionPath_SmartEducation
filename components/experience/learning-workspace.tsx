"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Gauge,
  MessageCircle,
  Route,
  Send,
  Target,
} from "lucide-react";

import { LearningSectionNav } from "@/components/layout/section-nav";
import { useLearnerContext } from "@/components/experience/learner-context-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { askTutor, evaluatePractice } from "@/lib/api/adaptive";
import type { LearnerContext, LearningMilestone, RecommendationItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export type WorkspaceView = "dashboard" | "roadmap" | "learn" | "practice" | "projects" | "progress" | "graph" | "career" | "tutor" | "profile";

export function LearningWorkspace({ view }: { view: WorkspaceView }) {
  const { context, loading, error, refresh } = useLearnerContext();
  const showLearningNav = ["roadmap", "learn", "practice", "projects", "progress"].includes(view);

  if (loading && !context) return <WorkspaceLoading showLearningNav={showLearningNav} />;
  if (!context) return <EmptyLearnerState showLearningNav={showLearningNav} error={error} />;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-background">
      {showLearningNav ? <LearningSectionNav /> : null}
      {error ? <p className="container pt-4 text-sm text-muted-foreground">{error}</p> : null}
      {view === "dashboard" ? <Dashboard context={context} /> : null}
      {view === "roadmap" ? <Roadmap context={context} /> : null}
      {view === "learn" ? <Learn context={context} /> : null}
      {view === "practice" ? <Practice context={context} onRefresh={refresh} /> : null}
      {view === "projects" ? <Projects context={context} /> : null}
      {view === "progress" ? <ProgressView context={context} /> : null}
      {view === "graph" ? <SkillsRedirect /> : null}
      {view === "career" ? <Career context={context} /> : null}
      {view === "tutor" ? <Tutor context={context} /> : null}
      {view === "profile" ? <Profile context={context} /> : null}
    </main>
  );
}

function Dashboard({ context }: { context: LearnerContext }) {
  const priorityGap = context.skill_gap.skill_gaps[0];
  const completed = context.progress.completed_milestones;
  const total = context.progress.total_milestones;
  const nextResource = context.recommendations.recommendations[0];

  return (
    <WorkspacePage eyebrow="Personal dashboard" title={`Your path to ${context.skill_gap.target_role}`} description={context.learning_path.path.summary}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Readiness" value={`${context.skill_gap.readiness_score}%`} icon={Gauge} />
        <Metric label="Current focus" value={priorityGap?.skill ?? "Path review"} icon={Target} />
        <Metric label="Path progress" value={`${completed} / ${total}`} icon={Route} />
        <Metric label="Practice attempts" value={String(context.progress.practice_attempts)} icon={CheckCircle2} />
      </div>
      <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Next recommended action" icon={ArrowRight}>
          <h2 className="text-xl font-semibold text-foreground">{context.progress.current_milestone ?? nextResource?.title ?? "Review your skill gaps"}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{priorityGap ? `Focus on ${priorityGap.skill}: ${priorityGap.explanation}` : "Complete onboarding analysis to receive your next action."}</p>
          <Button asChild className="mt-5"><Link href={priorityGap ? "/practice" : "/skill-analysis"}>Continue learning <ArrowRight className="h-4 w-4" /></Link></Button>
        </Panel>
        <Panel title="Learning path" icon={Route}>
          <Progress value={total ? (completed / total) * 100 : 0} aria-label="Learning path progress" />
          <p className="mt-3 text-sm text-muted-foreground">{completed} of {total} milestones completed.</p>
          <p className="mt-4 text-sm font-medium text-foreground">{context.progress.current_milestone ?? "All available milestones are complete."}</p>
        </Panel>
      </section>
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel title="Strengths" icon={CheckCircle2}><div className="flex flex-wrap gap-2">{context.skill_gap.strengths.length ? context.skill_gap.strengths.map((skill) => <Badge key={skill.skill} variant="secondary">{skill.skill}</Badge>) : <p className="text-sm text-muted-foreground">No strengths have been confirmed yet.</p>}</div></Panel>
        <Panel title="Recommended resource" icon={BookOpen}>{nextResource ? <ResourceSummary resource={nextResource} /> : <p className="text-sm text-muted-foreground">No recommendation is available for the current gaps.</p>}</Panel>
      </section>
    </WorkspacePage>
  );
}

function Learn({ context }: { context: LearnerContext }) {
  return <WorkspacePage eyebrow="My learning" title={context.learning_path.path.title} description={context.learning_path.path.summary}><div className="grid gap-5 lg:grid-cols-[1fr_20rem]"><section className="space-y-4">{context.learning_path.path.milestones.map((milestone) => <MilestoneRow key={milestone.id} milestone={milestone} />)}{!context.learning_path.path.milestones.length ? <EmptyPanel title="Your path is waiting for recommendations" actionHref="/recommendations" actionLabel="Review recommendations" /> : null}</section><Panel title="Path details" icon={Clock3}><Detail label="Timeline" value={`${context.learning_path.path.duration_months} months`} /><Detail label="Weekly pace" value={`${context.learning_path.path.weekly_hours} hours`} /><Detail label="Quality" value={context.learning_path.path_quality_score === null ? "Not scored" : `${context.learning_path.path_quality_score}%`} /></Panel></div></WorkspacePage>;
}

function Roadmap({ context }: { context: LearnerContext }) {
  return <WorkspacePage eyebrow="My learning / roadmap" title="Your learning path, visualized" description="Every node below is generated from your current learning-path milestones."><div className="space-y-4">{context.learning_path.path.milestones.map((milestone, index) => <div key={milestone.id} className="flex items-start gap-4"><div className="flex flex-col items-center"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">{milestone.order}</span>{index < context.learning_path.path.milestones.length - 1 ? <span className="h-16 w-px bg-border" /> : null}</div><section className="surface-panel flex-1 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{milestone.skills.join(" / ")}</p><h2 className="mt-1 text-lg font-semibold text-foreground">{milestone.title}</h2></div><Badge variant="outline">{milestone.estimated_hours} hours</Badge></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{milestone.description}</p></section></div>)}{!context.learning_path.path.milestones.length ? <EmptyPanel title="No roadmap milestones are available yet" actionHref="/recommendations" actionLabel="Build from recommendations" /> : null}</div></WorkspacePage>;
}

function Practice({ context, onRefresh }: { context: LearnerContext; onRefresh: () => Promise<void> }) {
  const gap = context.skill_gap.skill_gaps[0];
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const correctAnswer = gap ? `Complete the current ${gap.skill} milestone` : "Review the learning path";
  const options = gap ? [correctAnswer, `Skip ${gap.skill} and start an unrelated topic`] : [correctAnswer];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!gap || !selected) return;
    setSubmitting(true);
    try {
      const result = await evaluatePractice({ learner_id: context.learner_id, skill: gap.skill, question_id: `priority-${gap.skill}`, selected_answer: selected, correct_answer: correctAnswer });
      setFeedback(result.feedback);
      await onRefresh();
    } catch {
      setFeedback("Practice could not be recorded. Check that the backend is running and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <WorkspacePage eyebrow="My learning / practice" title={gap ? `Practice ${gap.skill}` : "Practice from your learning path"} description={gap ? `This exercise is tied to your highest-priority skill gap for ${context.skill_gap.target_role}.` : "Complete upstream analysis before starting practice."}>{gap ? <form onSubmit={submit} className="surface-panel max-w-3xl p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Question 1</p><h2 className="mt-3 text-xl font-semibold text-foreground">Which action best supports your next step?</h2><div className="mt-5 space-y-3">{options.map((option) => <label key={option} className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-4 text-sm", selected === option ? "border-primary bg-primary/5" : "border-border")}><input type="radio" name="practice-answer" value={option} checked={selected === option} onChange={() => setSelected(option)} className="mt-1" />{option}</label>)}</div><Button type="submit" className="mt-5" disabled={!selected || submitting}>{submitting ? "Recording..." : "Submit answer"}<ArrowRight className="h-4 w-4" /></Button>{feedback ? <p className="mt-4 rounded-md bg-secondary p-4 text-sm text-foreground" role="status">{feedback}</p> : null}</form> : <EmptyPanel title="Practice will appear after skill-gap analysis" actionHref="/onboarding" actionLabel="Complete onboarding" />}</WorkspacePage>;
}

function Projects({ context }: { context: LearnerContext }) {
  const projects = context.recommendations.recommendations.filter((resource) => resource.type === "project");
  return <WorkspacePage eyebrow="My learning / projects" title={`Projects for ${context.skill_gap.target_role}`} description="These projects are selected from your recommendations and mapped to your current gaps.">{projects.length ? <div className="grid gap-5 lg:grid-cols-2">{projects.map((project) => <ProjectCard key={project.resource_id} project={project} milestones={context.learning_path.path.milestones} />)}</div> : <EmptyPanel title="No project recommendation matches your current gaps" actionHref="/recommendations" actionLabel="Review recommendations" />}</WorkspacePage>;
}

function Career({ context }: { context: LearnerContext }) {
  return <WorkspacePage eyebrow="Career readiness" title={context.skill_gap.target_role} description="Your readiness is the score returned by the shared skill-gap analysis, with next steps grounded in your learning path."><div className="grid gap-5 md:grid-cols-3"><Metric label="Readiness" value={`${context.skill_gap.readiness_score}%`} icon={Gauge} /><Metric label="Readiness label" value={formatLabel(context.skill_gap.readiness_label)} icon={Target} /><Metric label="Milestones" value={`${context.progress.completed_milestones} / ${context.progress.total_milestones}`} icon={Route} /></div><div className="mt-6 grid gap-5 lg:grid-cols-2"><Panel title="Strengths" icon={CheckCircle2}><SkillList items={context.skill_gap.strengths.map((skill) => `${skill.skill} (${skill.current_level}/${skill.required_level})`)} empty="No strengths confirmed yet." /></Panel><Panel title="Critical gaps" icon={CircleAlert}><SkillList items={context.skill_gap.missing_critical_skills} empty="No critical gaps returned." /></Panel></div><Panel title="Recommended next steps" icon={ArrowRight} className="mt-5"><ol className="space-y-3 text-sm text-muted-foreground">{nextSteps(context).map((step, index) => <li key={step} className="flex gap-3"><span className="font-semibold text-accent">{index + 1}.</span>{step}</li>)}</ol></Panel></WorkspacePage>;
}

function Tutor({ context }: { context: LearnerContext }) {
  const [messages, setMessages] = useState<Array<{ role: "tutor" | "you"; text: string }>>([]);
  const [input, setInput] = useState("");
  const concept = context.skill_gap.skill_gaps[0]?.skill ?? context.learning_path.path.milestones[0]?.title ?? context.skill_gap.target_role;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");
    setMessages((current) => [...current, { role: "you", text: trimmed }]);
    try {
      const response = await askTutor({ learner_id: context.learner_id, message: trimmed, concept });
      setMessages((current) => [...current, { role: "tutor", text: response.message }]);
    } catch {
      setMessages((current) => [...current, { role: "tutor", text: `Your current focus is ${concept}. Use the learning path and practice view to work through it.` }]);
    }
  }

  return <WorkspacePage eyebrow="AI Tutor" title={`Tutor for ${context.skill_gap.target_role}`} description="This deterministic tutor is grounded in your current profile, skill gaps, and learning path. No external model is required."><section className="surface-panel max-w-3xl p-5"><div className="flex items-start gap-3 border-b border-border pb-4"><MessageCircle className="mt-1 h-5 w-5 text-accent" /><div><p className="font-semibold text-foreground">Current focus: {concept}</p><p className="mt-1 text-sm text-muted-foreground">{context.progress.current_milestone ?? "Review your completed path and choose a new focus."}</p></div></div><div className="min-h-56 space-y-3 py-5">{messages.length ? messages.map((message, index) => <p key={`${message.role}-${index}`} className={cn("max-w-[85%] rounded-md p-3 text-sm leading-6", message.role === "you" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>{message.text}</p>) : <p className="text-sm text-muted-foreground">Ask why a resource was recommended, what to learn next, or why {concept} matters for your target role.</p>}</div><div className="flex flex-wrap gap-2 border-t border-border pt-4">{[`Why ${concept}?`, "What should I learn next?", "Give me a hint"].map((prompt) => <Button key={prompt} type="button" variant="outline" size="sm" onClick={() => void send(prompt)}>{prompt}</Button>)}</div><form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); void send(input); }}><input value={input} onChange={(event) => setInput(event.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Ask about your path" aria-label="Ask the AI tutor" /><Button type="submit" size="icon" aria-label="Send question"><Send className="h-4 w-4" /></Button></form></section></WorkspacePage>;
}

function Profile({ context }: { context: LearnerContext }) {
  const profile = context.profile;
  return <WorkspacePage eyebrow="Profile" title="Your learner profile" description="This profile is read from the persisted learner record that powers your skill analysis and learning path."><div className="grid gap-5 lg:grid-cols-2"><Panel title="Target" icon={Target}><Detail label="Career goal" value={profile.goal} /><Detail label="Experience" value={formatLabel(profile.experience_level)} /><Detail label="Timeline" value={`${profile.timeline_months} months`} /></Panel><Panel title="Learning preferences" icon={BookOpen}><Detail label="Weekly hours" value={String(profile.weekly_hours)} /><Detail label="Preference" value={formatLabel(profile.learning_preference)} /><Detail label="Completed courses" value={String(profile.completed_courses.length)} /></Panel></div><Panel title="Current skills" icon={CheckCircle2} className="mt-5"><div className="flex flex-wrap gap-2">{profile.skills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div><Button asChild variant="outline" className="mt-5"><Link href="/onboarding">Update profile <ArrowRight className="h-4 w-4" /></Link></Button></Panel></WorkspacePage>;
}

function ProgressView({ context }: { context: LearnerContext }) {
  const percentage = context.progress.total_milestones ? (context.progress.completed_milestones / context.progress.total_milestones) * 100 : 0;
  return <WorkspacePage eyebrow="My learning / progress" title="Evidence from your learning journey" description="Progress is based on persisted practice attempts, mistake events, and completed milestones."><div className="grid gap-5 md:grid-cols-3"><Metric label="Path progress" value={`${Math.round(percentage)}%`} icon={Route} /><Metric label="Practice attempts" value={String(context.progress.practice_attempts)} icon={CheckCircle2} /><Metric label="Mistake events" value={String(context.progress.mistake_events)} icon={CircleAlert} /></div><Panel title="Milestone sequence" icon={Route} className="mt-6"><div className="space-y-3">{context.learning_path.path.milestones.map((milestone) => { const done = context.progress.completed_lessons.includes(milestone.id); return <div key={milestone.id} className="flex items-center gap-3 text-sm"><CheckCircle2 className={cn("h-4 w-4", done ? "text-success" : "text-muted-foreground")} /><span className={done ? "text-foreground" : "text-muted-foreground"}>{milestone.title}</span></div>; })}</div></Panel></WorkspacePage>;
}

function ProjectCard({ project, milestones }: { project: RecommendationItem; milestones: LearningMilestone[] }) {
  const milestone = milestones.find((item) => item.resource_ids.includes(project.resource_id));
  return <article className="surface-panel p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{project.skill}</p><h2 className="mt-2 text-xl font-semibold text-foreground">{project.title}</h2></div><Badge variant="outline">{project.difficulty}</Badge></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{project.description}</p><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><Detail label="Why recommended" value={project.reason} /><Detail label="Supports milestone" value={milestone?.title ?? "Current skill gap"} /><Detail label="Estimated effort" value={`${project.estimated_hours} hours`} /><Detail label="Target skills" value={project.skills.join(", ")} /></div>{project.url ? <Button asChild variant="outline" className="mt-5"><a href={project.url} target="_blank" rel="noreferrer">Open project <ExternalLink className="h-4 w-4" /></a></Button> : null}</article>;
}

function MilestoneRow({ milestone }: { milestone: LearningMilestone }) {
  return <article className="surface-panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Milestone {milestone.order}</p><h2 className="mt-1 text-lg font-semibold text-foreground">{milestone.title}</h2></div><Badge variant="outline">{milestone.estimated_hours} hours</Badge></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{milestone.description}</p><div className="mt-4 flex flex-wrap gap-2">{milestone.skills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div></article>;
}

function ResourceSummary({ resource }: { resource: RecommendationItem }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{resource.provider}</p><h2 className="mt-2 font-semibold text-foreground">{resource.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.reason}</p>{resource.url ? <a className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary" href={resource.url} target="_blank" rel="noreferrer">Open resource <ExternalLink className="h-3.5 w-3.5" /></a> : null}</div>;
}

function SkillsRedirect() {
  return <WorkspacePage eyebrow="Skills" title="Skill analysis" description="The shared skill-gap analysis is the source of truth for your strengths, readiness, and gaps."><Button asChild><Link href="/skill-analysis">Open skill analysis <ArrowRight className="h-4 w-4" /></Link></Button></WorkspacePage>;
}

function WorkspacePage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="container py-8 lg:py-12"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p><h1 className="mt-2 max-w-4xl font-display text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p><div className="mt-8">{children}</div></section>;
}

function Panel({ title, icon: Icon, children, className }: { title: string; icon: typeof Route; children: React.ReactNode; className?: string }) {
  return <section className={cn("surface-panel p-5", className)}><div className="mb-4 flex items-center gap-2"><Icon className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">{title}</h2></div>{children}</section>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Route }) {
  return <section className="surface-panel p-5"><Icon className="h-4 w-4 text-accent" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-2 break-words text-lg font-semibold text-foreground">{value}</p></section>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="mb-3 last:mb-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 text-sm text-foreground">{value}</p></div>;
}

function SkillList({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? <ul className="space-y-2 text-sm text-muted-foreground">{items.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{item}</li>)}</ul> : <p className="text-sm text-muted-foreground">{empty}</p>;
}

function nextSteps(context: LearnerContext) {
  const steps = context.skill_gap.skill_gaps.slice(0, 3).map((gap) => `Develop ${gap.skill} through its ${gap.priority}-priority learning-path milestone.`);
  if (context.progress.current_milestone) steps.unshift(`Complete ${context.progress.current_milestone}.`);
  return steps.length ? steps.slice(0, 3) : ["Review your skill analysis and choose the next available milestone."];
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function EmptyLearnerState({ showLearningNav, error }: { showLearningNav: boolean; error: string | null }) {
  return <main className="min-h-[calc(100vh-5rem)]">{showLearningNav ? <LearningSectionNav /> : null}<section className="container flex min-h-[calc(100vh-10rem)] items-center justify-center py-16"><section className="surface-panel max-w-xl p-8 text-center"><CircleAlert className="mx-auto h-8 w-8 text-accent" /><h1 className="mt-4 text-2xl font-semibold text-foreground">Complete onboarding to personalize this space</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{error ?? "Your dashboard, learning path, practice, projects, and career readiness will appear after your profile is analyzed."}</p><Button asChild className="mt-6"><Link href="/onboarding">Start onboarding <ArrowRight className="h-4 w-4" /></Link></Button></section></section></main>;
}

function WorkspaceLoading({ showLearningNav }: { showLearningNav: boolean }) {
  return <main className="min-h-[calc(100vh-5rem)]">{showLearningNav ? <LearningSectionNav /> : null}<section className="container py-12"><div className="h-8 w-64 animate-pulse rounded bg-secondary" /><div className="mt-8 grid gap-4 md:grid-cols-3"><div className="h-32 animate-pulse rounded-lg bg-secondary" /><div className="h-32 animate-pulse rounded-lg bg-secondary" /><div className="h-32 animate-pulse rounded-lg bg-secondary" /></div></section></main>;
}

function EmptyPanel({ title, actionHref, actionLabel }: { title: string; actionHref: string; actionLabel: string }) {
  return <section className="surface-panel p-8 text-center"><h2 className="text-lg font-semibold text-foreground">{title}</h2><Button asChild variant="outline" className="mt-5"><Link href={actionHref}>{actionLabel} <ArrowRight className="h-4 w-4" /></Link></Button></section>;
}
