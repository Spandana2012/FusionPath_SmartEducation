"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  Clock3,
  Code2,
  GraduationCap,
  Layers3,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  WandSparkles,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { analyzeProfile } from "@/lib/api/profile";
import { analyzeSkillGap } from "@/lib/api/skills";
import type { CompletedLearning, ExperienceLevel, LearnerProfile, LearningPreference } from "@/lib/types";
import { cn } from "@/lib/utils";

type DraftProfile = {
  goal: string;
  experience: ExperienceLevel | "";
  currentSkills: string[];
  learningHistory: CompletedLearning[];
  weeklyAvailability: string;
  learningPreference: LearningPreference | "";
  timeline: string;
};

const initialProfile: DraftProfile = {
  goal: "",
  experience: "",
  currentSkills: [],
  learningHistory: [],
  weeklyAvailability: "",
  learningPreference: "",
  timeline: "",
};

const goalSuggestions = [
  "Generative AI Engineer",
  "Data Analyst",
  "Frontend Developer",
  "Backend Developer",
  "Cloud Engineer",
];

const skillExamples = ["Python", "SQL", "Machine Learning", "Java", "React", "Git"];

const experienceOptions = [
  {
    value: "Beginner",
    description: "I am building fundamentals and need a clear starting sequence.",
    icon: GraduationCap,
  },
  {
    value: "Intermediate",
    description: "I have practical exposure and want to close targeted gaps.",
    icon: Code2,
  },
  {
    value: "Advanced",
    description: "I want a sharper route toward specialization and job readiness.",
    icon: Trophy,
  },
] satisfies Array<{ value: ExperienceLevel; description: string; icon: typeof GraduationCap }>;

const timeOptions = ["3-5 hrs/week", "5-10 hrs/week", "10-15 hrs/week", "15+ hrs/week"];
const preferenceOptions: LearningPreference[] = ["Project based", "Structured courses", "Reading", "Video", "Mixed"];
const timelineOptions = ["1 month", "3 months", "6 months", "12 months", "Custom"];
const loadingMessages = ["Mapping your skills...", "Comparing your experience...", "Finding your biggest opportunities..."];

const steps = [
  { label: "Goal", icon: Target },
  { label: "Experience", icon: GraduationCap },
  { label: "Skills", icon: BrainCircuit },
  { label: "History", icon: BookOpenCheck },
  { label: "Time", icon: Clock3 },
  { label: "Preferences", icon: Layers3 },
  { label: "Target", icon: BriefcaseBusiness },
  { label: "Review", icon: Sparkles },
];

const transition = { duration: 0.26, ease: "easeOut" } as const;

export function OnboardingFlow() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [profile, setProfile] = useState<DraftProfile>(initialProfile);
  const [skillInput, setSkillInput] = useState("");
  const [historyDraft, setHistoryDraft] = useState({ resourceName: "", skillGained: "", completed: true });
  const [customTimeline, setCustomTimeline] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<LearnerProfile | null>(null);
  const submissionRef = useRef(false);

  const progress = ((stepIndex + 1) / steps.length) * 100;
  const isLastStep = stepIndex === steps.length - 1;
  const canContinue = useMemo(() => validateStep(stepIndex, profile, customTimeline), [customTimeline, profile, stepIndex]);

  function updateProfile<TField extends keyof DraftProfile>(field: TField, value: DraftProfile[TField]) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function addSkill(skill: string) {
    const normalized = skill.trim();
    if (!normalized) return;
    const exists = profile.currentSkills.some((item) => item.toLowerCase() === normalized.toLowerCase());
    if (exists) return;
    updateProfile("currentSkills", [...profile.currentSkills, normalized]);
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    updateProfile(
      "currentSkills",
      profile.currentSkills.filter((item) => item !== skill),
    );
  }

  function addHistoryItem() {
    const resourceName = historyDraft.resourceName.trim();
    const skillGained = historyDraft.skillGained.trim();
    if (!resourceName || !skillGained) return;

    updateProfile("learningHistory", [
      ...profile.learningHistory,
      {
        id: crypto.randomUUID(),
        resourceName,
        skillGained,
        completed: historyDraft.completed,
      },
    ]);
    setHistoryDraft({ resourceName: "", skillGained: "", completed: true });
  }

  function removeHistoryItem(id: string) {
    updateProfile(
      "learningHistory",
      profile.learningHistory.filter((item) => item.id !== id),
    );
  }

  function goNext() {
    if (!canContinue) return;
    if (isLastStep) {
      void generateProfile();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function generateProfile() {
    const timeline = profile.timeline === "Custom" ? customTimeline.trim() : profile.timeline;
    const learnerProfile: LearnerProfile = {
      goal: profile.goal.trim(),
      experience: profile.experience as ExperienceLevel,
      currentSkills: profile.currentSkills,
      learningHistory: profile.learningHistory,
      weeklyAvailability: profile.weeklyAvailability,
      learningPreference: profile.learningPreference as LearningPreference,
      timeline,
      createdAt: new Date().toISOString(),
    };

    await runAnalysis(learnerProfile);
  }

  async function runAnalysis(learnerProfile: LearnerProfile) {
    if (submissionRef.current) return;

    submissionRef.current = true;
    setAnalysisError(false);
    setPendingProfile(learnerProfile);
    setIsGenerating(true);
    window.localStorage.setItem("fusionpath.learnerProfile", JSON.stringify(learnerProfile));

    try {
      const profileResponse = await analyzeProfile(learnerProfile);
      window.localStorage.setItem("fusionpath.learnerId", profileResponse.learner_id);
      window.localStorage.setItem("fusionpath.normalizedProfile", JSON.stringify(profileResponse.profile));

      const skillGapResponse = await analyzeSkillGap({
        learner_id: profileResponse.learner_id,
        profile: profileResponse.profile,
      });
      window.localStorage.setItem("fusionpath.skillGapResponse", JSON.stringify(skillGapResponse));
      router.push("/skill-analysis");
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Skill analysis failed", error);
      }
      setAnalysisError(true);
      setIsGenerating(false);
      submissionRef.current = false;
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.5))]">
      <section className="container grid gap-8 py-8 lg:grid-cols-[18rem_1fr] lg:py-12">
        <aside className="rounded-lg border border-border bg-card p-4 shadow-soft lg:sticky lg:top-24 lg:h-fit">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <WandSparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Learner profile</p>
              <p className="text-xs text-muted-foreground">Step {stepIndex + 1} of {steps.length}</p>
            </div>
          </div>
          <Progress value={progress} aria-label="Onboarding progress" />
          <ol className="mt-5 space-y-2" aria-label="Onboarding steps">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === stepIndex;
              const isComplete = index < stepIndex;
              return (
                <li key={step.label}>
                  <button
                    type="button"
                    className={cn(
                      "focus-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      isActive && "bg-secondary text-foreground",
                      !isActive && "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                    )}
                    onClick={() => index <= stepIndex && setStepIndex(index)}
                    disabled={index > stepIndex}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md border",
                        isComplete
                          ? "border-primary/25 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {isComplete ? <Check className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" />}
                    </span>
                    {step.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <section className="rounded-lg border border-border bg-card p-5 shadow-soft sm:p-8">
          {isGenerating ? (
            <LoadingState />
          ) : analysisError ? (
            <AnalysisErrorState onRetry={() => pendingProfile && void runAnalysis(pendingProfile)} />
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={stepIndex}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={transition}
                  className="min-h-[31rem]"
                >
                  {renderStep({
                    stepIndex,
                    profile,
                    updateProfile,
                    skillInput,
                    setSkillInput,
                    addSkill,
                    removeSkill,
                    historyDraft,
                    setHistoryDraft,
                    addHistoryItem,
                    removeHistoryItem,
                    customTimeline,
                    setCustomTimeline,
                  })}
                </motion.div>
              </AnimatePresence>

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={goBack} disabled={stepIndex === 0}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </Button>
                <Button onClick={goNext} disabled={!canContinue}>
                  {isLastStep ? "Map my skills" : "Continue"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

type StepRendererProps = {
  stepIndex: number;
  profile: DraftProfile;
  updateProfile: <TField extends keyof DraftProfile>(field: TField, value: DraftProfile[TField]) => void;
  skillInput: string;
  setSkillInput: (value: string) => void;
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
  historyDraft: { resourceName: string; skillGained: string; completed: boolean };
  setHistoryDraft: (value: { resourceName: string; skillGained: string; completed: boolean }) => void;
  addHistoryItem: () => void;
  removeHistoryItem: (id: string) => void;
  customTimeline: string;
  setCustomTimeline: (value: string) => void;
};

function renderStep(props: StepRendererProps) {
  switch (props.stepIndex) {
    case 0:
      return <GoalStep {...props} />;
    case 1:
      return <ExperienceStep {...props} />;
    case 2:
      return <SkillsStep {...props} />;
    case 3:
      return <HistoryStep {...props} />;
    case 4:
      return <TimeStep {...props} />;
    case 5:
      return <PreferenceStep {...props} />;
    case 6:
      return <TargetStep {...props} />;
    default:
      return <ReviewStep {...props} />;
  }
}

function GoalStep({ profile, updateProfile }: StepRendererProps) {
  return (
    <StepFrame
      eyebrow="Goal"
      title="What are you working toward?"
      description="Tell FusionPath the outcome in your own words. Specific goals create sharper paths."
    >
      <Textarea
        value={profile.goal}
        onChange={(event) => updateProfile("goal", event.target.value)}
        placeholder="I want to become a Generative AI Engineer and get job-ready in 6 months..."
        aria-label="Career goal"
        className="min-h-44 text-lg leading-8"
      />
      <div className="flex flex-wrap gap-2">
        {goalSuggestions.map((goal) => (
          <button
            key={goal}
            type="button"
            className="focus-ring rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            onClick={() => updateProfile("goal", goal)}
          >
            {goal}
          </button>
        ))}
      </div>
    </StepFrame>
  );
}

function ExperienceStep({ profile, updateProfile }: StepRendererProps) {
  return (
    <StepFrame
      eyebrow="Experience"
      title="Where are you starting from?"
      description="Choose the level that best reflects your current confidence."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {experienceOptions.map((option) => {
          const Icon = option.icon;
          const selected = profile.experience === option.value;
          return (
            <SelectableCard
              key={option.value}
              selected={selected}
              onClick={() => updateProfile("experience", option.value)}
              label={option.value}
              description={option.description}
              icon={<Icon className="h-5 w-5" aria-hidden="true" />}
            />
          );
        })}
      </div>
    </StepFrame>
  );
}

function SkillsStep({ profile, skillInput, setSkillInput, addSkill, removeSkill }: StepRendererProps) {
  const matches = skillExamples.filter(
    (skill) =>
      !profile.currentSkills.includes(skill) && skill.toLowerCase().includes(skillInput.trim().toLowerCase()),
  );

  return (
    <StepFrame
      eyebrow="Current skills"
      title="What skills do you already have?"
      description="Add languages, tools, concepts, and strengths you want FusionPath to account for."
    >
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          addSkill(skillInput);
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={skillInput}
            onChange={(event) => setSkillInput(event.target.value)}
            placeholder="Search or add a skill"
            className="pl-9"
            aria-label="Skill name"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={!skillInput.trim()}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add skill
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {(skillInput ? matches : skillExamples.filter((skill) => !profile.currentSkills.includes(skill))).map((skill) => (
          <button
            key={skill}
            type="button"
            className="focus-ring rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            onClick={() => addSkill(skill)}
          >
            {skill}
          </button>
        ))}
      </div>

      <ChipList items={profile.currentSkills} onRemove={removeSkill} emptyLabel="Added skills will appear here." />
    </StepFrame>
  );
}

function HistoryStep({
  profile,
  historyDraft,
  setHistoryDraft,
  addHistoryItem,
  removeHistoryItem,
}: StepRendererProps) {
  return (
    <StepFrame
      eyebrow="Learning history"
      title="What have you already completed?"
      description="Add courses, topics, projects, or training you have worked through."
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <Input
          value={historyDraft.resourceName}
          onChange={(event) => setHistoryDraft({ ...historyDraft, resourceName: event.target.value })}
          placeholder="Resource name"
          aria-label="Completed resource name"
        />
        <Input
          value={historyDraft.skillGained}
          onChange={(event) => setHistoryDraft({ ...historyDraft, skillGained: event.target.value })}
          placeholder="Skill gained"
          aria-label="Skill gained"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={addHistoryItem}
          disabled={!historyDraft.resourceName.trim() || !historyDraft.skillGained.trim()}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </Button>
      </div>
      <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={historyDraft.completed}
          onChange={(event) => setHistoryDraft({ ...historyDraft, completed: event.target.checked })}
          className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
        />
        Mark as completed
      </label>

      <div className="space-y-3">
        {profile.learningHistory.length ? (
          profile.learningHistory.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{item.resourceName}</p>
                <p className="text-sm text-muted-foreground">
                  {item.skillGained} - {item.completed ? "Completed" : "In progress"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${item.resourceName}`}
                onClick={() => removeHistoryItem(item.id)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))
        ) : (
          <EmptyPanel label="Completed courses or topics will appear here." />
        )}
      </div>
    </StepFrame>
  );
}

function TimeStep({ profile, updateProfile }: StepRendererProps) {
  return (
    <StepFrame
      eyebrow="Time"
      title="How much time can you realistically invest?"
      description="A good learning path respects your actual weekly capacity."
    >
      <OptionGrid
        options={timeOptions}
        selected={profile.weeklyAvailability}
        onSelect={(value) => updateProfile("weeklyAvailability", value)}
      />
    </StepFrame>
  );
}

function PreferenceStep({ profile, updateProfile }: StepRendererProps) {
  return (
    <StepFrame
      eyebrow="Preferences"
      title="How do you prefer to learn?"
      description="Pick the style FusionPath should prioritize when shaping your journey."
    >
      <OptionGrid
        options={preferenceOptions}
        selected={profile.learningPreference}
        onSelect={(value) => updateProfile("learningPreference", value as LearningPreference)}
      />
    </StepFrame>
  );
}

function TargetStep({ profile, updateProfile, customTimeline, setCustomTimeline }: StepRendererProps) {
  return (
    <StepFrame
      eyebrow="Target"
      title="When do you want to reach this goal?"
      description="Choose a target timeline. You can keep it ambitious, but make it useful."
    >
      <OptionGrid options={timelineOptions} selected={profile.timeline} onSelect={(value) => updateProfile("timeline", value)} />
      {profile.timeline === "Custom" ? (
        <Input
          value={customTimeline}
          onChange={(event) => setCustomTimeline(event.target.value)}
          placeholder="Example: 8 months"
          aria-label="Custom timeline"
        />
      ) : null}
    </StepFrame>
  );
}

function ReviewStep({ profile, customTimeline }: StepRendererProps) {
  const timeline = profile.timeline === "Custom" ? customTimeline : profile.timeline;
  const rows = [
    ["Goal", profile.goal],
    ["Experience", profile.experience],
    ["Skills", profile.currentSkills.join(", ")],
    [
      "Learning history",
      profile.learningHistory.length
        ? profile.learningHistory.map((item) => `${item.resourceName} (${item.skillGained})`).join(", ")
        : "No completed learning added",
    ],
    ["Weekly availability", profile.weeklyAvailability],
    ["Learning preference", profile.learningPreference],
    ["Timeline", timeline],
  ];

  return (
    <StepFrame
      eyebrow="Final review"
      title="Here is the learner profile FusionPath will use."
      description="Review the signal before mapping your skill landscape."
    >
      <div className="grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
          </div>
        ))}
      </div>
    </StepFrame>
  );
}

function StepFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-7">
      <div className="max-w-3xl space-y-4">
        <Badge variant="secondary" className="w-fit">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {eyebrow}
        </Badge>
        <div className="space-y-3">
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function SelectableCard({
  selected,
  onClick,
  label,
  description,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "focus-ring min-h-48 rounded-lg border bg-background p-5 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/35",
      )}
    >
      <span
        className={cn(
          "mb-6 flex h-11 w-11 items-center justify-center rounded-md border",
          selected ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="block text-base font-semibold text-foreground">{label}</span>
      <span className="mt-3 block text-sm leading-6 text-muted-foreground">{description}</span>
    </button>
  );
}

function OptionGrid({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={selected === option}
          onClick={() => onSelect(option)}
          className={cn(
            "focus-ring rounded-lg border bg-background p-4 text-left text-sm font-medium transition-colors",
            selected === option ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:border-primary/35",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function ChipList({
  items,
  onRemove,
  emptyLabel,
}: {
  items: string[];
  onRemove: (item: string) => void;
  emptyLabel: string;
}) {
  if (!items.length) return <EmptyPanel label={emptyLabel} />;

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-background p-4">
      {items.map((item) => (
        <span key={item} className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm text-foreground">
          {item}
          <button type="button" className="focus-ring rounded-sm" aria-label={`Remove ${item}`} onClick={() => onRemove(item)}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 1100);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className="flex min-h-[31rem] flex-col items-center justify-center text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-accent/35 bg-secondary text-accent shadow-neon-cyan">
        <span className="absolute inset-0 rounded-lg bg-accent/10 motion-safe:animate-pulse" aria-hidden="true" />
        <Sparkles className="relative h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-normal text-foreground">
        {loadingMessages[messageIndex]}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        FusionPath is building your skill landscape from your saved learner profile.
      </p>
      <div className="mt-7 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/2 rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)))] motion-safe:animate-[ambient-shift_1.6s_ease-in-out_infinite_alternate]" />
      </div>
    </div>
  );
}

function AnalysisErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[31rem] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-destructive/35 bg-destructive/10 text-destructive">
        <X className="h-5 w-5" aria-hidden="true" />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-normal text-foreground">
        We couldn&apos;t map your skills right now.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Your profile is safe. Please try the analysis again.
      </p>
      <Button type="button" className="mt-6" onClick={onRetry}>
        Try again
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function validateStep(stepIndex: number, profile: DraftProfile, customTimeline: string) {
  switch (stepIndex) {
    case 0:
      return profile.goal.trim().length >= 12;
    case 1:
      return Boolean(profile.experience);
    case 2:
      return profile.currentSkills.length > 0;
    case 3:
      return true;
    case 4:
      return Boolean(profile.weeklyAvailability);
    case 5:
      return Boolean(profile.learningPreference);
    case 6:
      return profile.timeline === "Custom" ? customTimeline.trim().length > 0 : Boolean(profile.timeline);
    default:
      return true;
  }
}
