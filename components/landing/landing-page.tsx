"use client";

import { Fragment } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Compass,
  Route,
  Sparkles,
  Target,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const firstHeadline = "Stop searching for what to learn.";
const secondHeadline = "Start following your path.";

const journey = [
  {
    label: "Goal",
    hint: "Target outcome",
    tooltip: "Where you want to go",
    icon: Target,
    value: 82,
    tone: "primary",
  },
  {
    label: "Skill gaps",
    hint: "Capability map",
    tooltip: "What's standing between you and the goal",
    icon: BrainCircuit,
    value: 64,
    tone: "accent",
  },
  {
    label: "Learning path",
    hint: "Sequenced plan",
    tooltip: "Your personalized sequence",
    icon: Route,
    value: 48,
    tone: "accent",
  },
  {
    label: "Ready to build",
    hint: "Readiness signal",
    tooltip: "How close you are",
    icon: CheckCircle2,
    value: 31,
    tone: "success",
  },
];

const capabilities = [
  {
    title: "Skill Intelligence",
    description: "Know exactly what you're missing.",
    icon: BrainCircuit,
  },
  {
    title: "Adaptive Learning Path",
    description: "Learn in the order that makes sense for you.",
    icon: Route,
  },
  {
    title: "AI Learning Coach",
    description: "Get answers grounded in your journey.",
    icon: Sparkles,
  },
];

const steps = [
  {
    number: "01",
    title: "Tell us your goal",
    description: "Define the role, capability, or outcome you want to reach.",
  },
  {
    number: "02",
    title: "Understand your gaps",
    description: "Compare your current skills, experience, and preferences with the target.",
  },
  {
    number: "03",
    title: "Follow your personalized path",
    description: "Use a guided sequence of learning, projects, and assessments.",
  },
  {
    number: "04",
    title: "Adapt as you learn",
    description: "Adjust the journey as new evidence shows what you need next.",
  },
];

const chartData = [
  { progress: 18 },
  { progress: 24 },
  { progress: 32 },
  { progress: 44 },
  { progress: 53 },
  { progress: 61 },
  { progress: 68 },
];

export function LandingPage() {
  return (
    <main className="relative isolate overflow-hidden bg-background">
      <BackgroundSystem />
      <HeroSection />
      <CapabilityStrip />
      <HowItWorks />
      <ProductPreview />
      <Differentiation />
      <FinalCta />
      <Footer />
    </main>
  );
}

function BackgroundSystem() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 fusion-grid opacity-80" />
      <div className="absolute inset-0 noise-overlay opacity-30" />
      <div className="ambient-glow absolute left-[58%] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-primary/12 blur-3xl" />
      <div className="ambient-glow absolute bottom-[8%] left-[-12rem] h-[28rem] w-[28rem] rounded-full bg-accent/8 blur-3xl [animation-delay:3s]" />
      <div className="ambient-glow absolute bottom-[-10rem] right-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[hsl(var(--violet)/0.09)] blur-3xl [animation-delay:6s]" />
    </div>
  );
}

function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative border-b border-border">
      <div className="container relative grid min-h-[calc(100vh-5rem)] items-center gap-12 py-16 md:py-20 lg:grid-cols-[1.02fr_0.98fr]">
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-4xl space-y-8"
        >
          <Badge className="w-fit border-accent/20 bg-accent/10 text-accent shadow-neon-cyan">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Personalized AI learning journeys
          </Badge>
          <div className="space-y-6">
            <h1
              className="max-w-5xl font-display text-5xl font-bold leading-[0.98] tracking-normal text-foreground sm:text-6xl lg:text-7xl"
              aria-label={`${firstHeadline} ${secondHeadline}`}
            >
              <AnimatedHeadlineLine text={firstHeadline} reducedMotion={Boolean(reduceMotion)} />
              <AnimatedHeadlineLine
                text={secondHeadline}
                reducedMotion={Boolean(reduceMotion)}
                className="neon-gradient-text mt-2 drop-shadow-[0_0_18px_hsl(var(--accent)/0.18)]"
                delay={0.55}
              />
            </h1>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 1.45, duration: 0.5, ease: "easeOut" }}
              className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl"
            >
              FusionPath turns your goal, skills and learning preferences into a personalized path that tells you what
              to learn, why it matters, and what to do next.
            </motion.p>
          </div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 1.58, duration: 0.45, ease: "easeOut" }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="group w-full sm:w-auto">
              <a href="/onboarding" aria-label="Build my learning path">
                Build my learning path
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1" aria-hidden="true" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <a href="#how-it-works">
                See how it works
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.72, duration: 0.65, ease: "easeOut" }}
          aria-label="Learning journey visualization"
        >
          <JourneyVisual />
        </motion.div>
      </div>
    </section>
  );
}

function AnimatedHeadlineLine({
  text,
  className,
  delay = 0,
  reducedMotion,
}: {
  text: string;
  className?: string;
  delay?: number;
  reducedMotion: boolean;
}) {
  if (reducedMotion) {
    return (
      <span aria-hidden="true" className={cn("block", className)}>
        {text}
      </span>
    );
  }

  return (
    <motion.span
      aria-hidden="true"
      className={cn("block", className)}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: 0.026,
          },
        },
      }}
    >
      {text.split(" ").map((word, wordIndex) => (
        <Fragment key={`${word}-${wordIndex}`}>
          <span className="inline-block whitespace-nowrap">
            {word.split("").map((character, characterIndex) => (
              <motion.span
                key={`${character}-${characterIndex}`}
                className="inline-block"
                variants={{
                  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
                  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
                }}
                transition={{ duration: 0.52, ease: "easeOut" }}
              >
                {character}
              </motion.span>
            ))}
          </span>{" "}
        </Fragment>
      ))}
    </motion.span>
  );
}

function JourneyVisual() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute inset-3 rounded-lg border border-accent/10 bg-[linear-gradient(135deg,hsl(var(--primary)/0.11),transparent_38%,hsl(var(--accent)/0.08))]" />
      <div className="glass-panel relative rounded-lg p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-lg font-semibold text-foreground">Adaptive route</p>
            <p className="mt-1 text-sm text-muted-foreground">Mapped from goal to readiness</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/70 px-3 py-2 text-xs font-medium text-foreground">
            <span className="h-2 w-2 rounded-full bg-accent shadow-neon-cyan" />
            Live path
          </span>
        </div>

        <div className="space-y-3">
          {journey.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="group relative">
                <motion.div
                  initial={{ opacity: 0, x: 18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  whileHover={{ scale: 1.012, y: -1 }}
                  transition={{ delay: index * 0.08, duration: 0.36, ease: "easeOut" }}
                  className={cn(
                    "relative grid grid-cols-[2.8rem_1fr_auto] items-center gap-4 rounded-lg border bg-secondary/44 p-4 backdrop-blur-xl transition-all duration-200",
                    "hover:border-accent/35 hover:bg-secondary/70 hover:shadow-neon-cyan",
                    item.tone === "success" ? "border-success/20" : "border-border",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-md border bg-background/70 transition-all duration-200 group-hover:shadow-neon-blue",
                      item.tone === "accent" && "border-accent/25 text-accent",
                      item.tone === "primary" && "border-primary/25 text-primary",
                      item.tone === "success" && "border-success/25 text-success",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className={cn("text-sm font-semibold text-foreground", item.tone === "accent" && "text-accent")}>
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                  </div>
                  <div className="hidden min-w-24 space-y-2 sm:block">
                    <p className="text-right text-sm font-semibold text-foreground">{item.value}%</p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full shadow-neon-blue",
                          item.tone === "success"
                            ? "bg-success"
                            : "bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)))]",
                        )}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    className="pointer-events-none absolute right-4 top-3 hidden rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground opacity-0 shadow-soft group-hover:opacity-100 md:block"
                  >
                    {item.tooltip}
                  </motion.span>
                </motion.div>
                {index < journey.length - 1 ? (
                  <div className="relative mx-5 h-5 w-px overflow-visible bg-border" aria-hidden="true">
                    <div className="connection-pulse absolute inset-x-0 top-0 h-full bg-[linear-gradient(180deg,hsl(var(--primary)),hsl(var(--accent)))]" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CapabilityStrip() {
  return (
    <section id="skills" aria-label="FusionPath capabilities" className="relative border-b border-border">
      <div className="container grid gap-4 py-8 md:grid-cols-3">
        {capabilities.map((capability) => {
          const Icon = capability.icon;
          return (
            <motion.article
              key={capability.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-90px" }}
              variants={fadeUp}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.42, ease: "easeOut" }}
              className="group glass-panel flex gap-4 rounded-lg p-5 transition-all duration-200 hover:border-accent/35 hover:shadow-neon-cyan"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary transition-all duration-200 group-hover:text-accent group-hover:shadow-neon-cyan">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">{capability.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{capability.description}</p>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-24">
      <div className="container space-y-12">
        <SectionHeading
          eyebrow="How it works"
          title="From ambition to an ordered plan."
          description="FusionPath turns vague learning intent into a path with context, sequence, and feedback."
        />
        <div className="grid gap-4 lg:grid-cols-4">
          {steps.map((step) => (
            <motion.article
              key={step.number}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-90px" }}
              variants={fadeUp}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.44, ease: "easeOut" }}
              className="rounded-lg border border-border bg-card/72 p-6 transition-all duration-200 hover:border-primary/35 hover:bg-card"
            >
              <p className="mb-8 text-sm font-semibold text-accent">{step.number}</p>
              <h3 className="text-lg font-semibold tracking-normal text-foreground">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductPreview() {
  const { scrollYProgress } = useScroll();
  const reduceMotion = useReducedMotion();
  const y = useTransform(scrollYProgress, [0.28, 0.68], reduceMotion ? [0, 0] : [18, -18]);

  return (
    <section id="dashboard" className="relative border-y border-border bg-secondary/30 py-20 sm:py-24">
      <div className="container grid items-center gap-12 lg:grid-cols-[0.82fr_1fr]">
        <SectionHeading
          eyebrow="Product preview"
          title="A roadmap you can actually follow."
          description="Skill development, current milestone, and the next best action come together in one calm workspace."
        />
        <motion.div
          style={{ y }}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="glass-panel rounded-lg p-4 sm:p-5"
        >
          <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Generative AI Engineer Path</p>
              <p className="text-sm text-muted-foreground">Current milestone: Retrieval foundations</p>
            </div>
            <Badge variant="outline" className="border-accent/30 bg-accent/10 text-accent">
              68% overall progress
            </Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-background/68 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Skill development</p>
                  <BookOpenCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                </div>
                <div className="space-y-4">
                  <SkillRow label="Prompt engineering" value={78} />
                  <SkillRow label="Vector databases" value={64} />
                  <SkillRow label="RAG architecture" value={46} />
                </div>
              </div>
              <div className="h-40 rounded-lg border border-border bg-background/68 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.34} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="progress"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      fill="url(#progressFill)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-background/68 p-4">
                <p className="mb-4 text-sm font-medium text-foreground">Roadmap sequence</p>
                <div className="space-y-3">
                  {["Python refresh", "Embeddings and search", "Build a RAG application", "Readiness review"].map(
                    (item, index) => (
                      <div key={item} className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold",
                            index < 2
                              ? "border-accent/30 bg-accent/10 text-accent"
                              : "border-border bg-card text-muted-foreground",
                          )}
                        >
                          {index + 1}
                        </span>
                        <span className="text-sm text-foreground">{item}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-accent/25 bg-accent/10 p-4 shadow-neon-cyan">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                    <Compass className="h-4 w-4" aria-hidden="true" />
                    Next best action
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    2h 40m
                  </span>
                </div>
                <p className="text-base font-semibold text-foreground">Build your first RAG application</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Apply retrieval, prompting, and evaluation in a small project before moving to deployment.
                </p>
                <Button size="sm" className="mt-4">
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function SkillRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">{value}%</span>
      </div>
      <Progress value={value} className="bg-muted [&>div]:bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)))]" />
    </div>
  );
}

function Differentiation() {
  return (
    <section id="ai-assistant" className="relative py-20 sm:py-24">
      <div className="container grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-90px" }}
          variants={fadeUp}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="space-y-5"
        >
          <Badge variant="secondary" className="w-fit border-primary/20 bg-primary/10 text-accent">
            <Route className="h-3.5 w-3.5" aria-hidden="true" />
            Why FusionPath
          </Badge>
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">
            Courses are everywhere.
            <span className="block neon-gradient-text">Direction isn&apos;t.</span>
          </h2>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-90px" }}
          variants={fadeUp}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
          className="glass-panel rounded-lg p-6 sm:p-8"
        >
          <p className="text-base leading-8 text-muted-foreground sm:text-lg">
            FusionPath does not simply recommend popular courses. It determines what the learner needs next by
            comparing current capabilities, target goals, experience level, and learning preferences, then shaping a
            journey that connects courses, projects, and assessments into one coherent path.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="profile" className="relative border-y border-border bg-secondary/45 py-16 sm:py-20">
      <div className="container flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div className="space-y-3">
          <p className="text-sm font-medium text-accent">FusionPath</p>
          <h2 className="font-display text-3xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Build a path that is yours.
          </h2>
        </div>
        <Button asChild size="lg" className="group w-full sm:w-auto">
          <a href="/onboarding">
            Start your journey
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative bg-background">
      <div className="container flex flex-col gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-sm font-semibold text-foreground">
          Fusion<span className="text-accent">Path</span>
        </p>
        <p className="text-sm text-muted-foreground">Your goal. Your gaps. Your path.</p>
      </div>
    </footer>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-90px" }}
      variants={fadeUp}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="max-w-2xl space-y-4"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
      <h2 className="font-display text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">
        {title}
      </h2>
      <p className="text-base leading-7 text-muted-foreground">{description}</p>
    </motion.div>
  );
}
