"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, CircleAlert, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

import { useLearnerContext } from "@/components/experience/learner-context-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getJobRecommendations, type JobListing } from "@/lib/api/jobs";
import { hasAccessToken } from "@/lib/api/client";

export function JobsPage() {
  const router = useRouter();
  const { context, loading: contextLoading } = useLearnerContext();
  const [authChecked, setAuthChecked] = useState(false);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAccessToken()) router.replace("/sign-in");
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked || !context?.learner_id) return;
    void getJobRecommendations(context.learner_id).then((response) => setJobs(response.jobs)).catch(() => setError("Job recommendations are unavailable right now.")).finally(() => setLoading(false));
  }, [authChecked, context?.learner_id]);

  if (!authChecked) return <JobsLoading />;
  if (contextLoading && !context) return <JobsLoading />;
  if (!context) return <main className="container flex min-h-[calc(100vh-5rem)] items-center justify-center py-12"><section className="surface-panel max-w-lg p-8 text-center"><CircleAlert className="mx-auto h-8 w-8 text-accent" /><h1 className="mt-4 text-2xl font-semibold text-foreground">Complete your learner profile first</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Jobs are matched to your existing learner goals, skills, and readiness.</p><Button asChild className="mt-6"><Link href="/onboarding">Complete onboarding <ArrowRight className="h-4 w-4" /></Link></Button></section></main>;

  return <main className="container py-8 lg:py-12"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Jobs</p><h1 className="mt-2 font-display text-3xl font-semibold text-foreground">Recommended Jobs</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Jobs matched to your learning goals, skills and readiness.</p>{error ? <section className="surface-panel mt-8 p-8 text-center"><CircleAlert className="mx-auto h-8 w-8 text-accent" /><p className="mt-4 text-sm text-muted-foreground">{error}</p></section> : loading ? <JobsLoading /> : jobs.length ? <div className="mt-8 grid gap-4 lg:grid-cols-2">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div> : <section className="surface-panel mt-8 p-8 text-center"><BriefcaseBusiness className="mx-auto h-8 w-8 text-accent" /><h2 className="mt-4 text-lg font-semibold text-foreground">No matching opportunities found yet</h2><p className="mt-2 text-sm text-muted-foreground">Continue building your skills and check back later.</p></section>}</main>;
}

function JobCard({ job }: { job: JobListing }) {
  return <article className="surface-panel flex h-full flex-col p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{job.domain}</p><h2 className="mt-2 text-xl font-semibold text-foreground">{job.title}</h2></div><Badge variant="outline">{job.seniority}</Badge></div><div className="mt-4 space-y-2 text-sm text-muted-foreground"><p>{job.company}</p><p>{job.location}</p><p>Posted {formatDate(job.posted_date)}</p></div><div className="mt-5 border-t border-border pt-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Why this matches</p><p className="mt-2 text-sm leading-6 text-foreground">{job.match_reason}</p></div><Button asChild variant="outline" className="mt-6 w-fit"><a href={job.link} target="_blank" rel="noopener noreferrer">Apply / View Job <ExternalLink className="h-4 w-4" /></a></Button></article>;
}

function JobsLoading() { return <main className="container py-12"><div className="h-8 w-64 animate-pulse rounded bg-secondary" /><div className="mt-8 grid gap-4 lg:grid-cols-2"><div className="h-64 animate-pulse rounded-lg bg-secondary" /><div className="h-64 animate-pulse rounded-lg bg-secondary" /></div></main>; }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleDateString() : "Recently"; }
