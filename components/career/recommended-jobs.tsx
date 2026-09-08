"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getJobRecommendations, type JobListing } from "@/lib/api/jobs";
import { getCurrentUser } from "@/lib/api/auth";
import Link from "next/link";
import type { LearnerContext } from "@/lib/types";

export function RecommendedJobs({ context }: { context: LearnerContext }) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void getCurrentUser().then(() => {
      if (!active) return;
      setAuthenticated(true);
      return getJobRecommendations(context.learner_id).then((response) => { if (active) setJobs(response.jobs); });
    }).catch(() => { if (active) { setAuthenticated(false); setError("Job recommendations are unavailable right now."); } });
    return () => { active = false; };
  }, [context.learner_id]);

  return <section className="surface-panel mt-5 p-5"><div className="flex items-start gap-3"><BriefcaseBusiness className="mt-1 h-5 w-5 text-accent" /><div><h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Recommended jobs</h2><p className="mt-1 text-sm text-muted-foreground">Curated SQLite listings ranked for your role and readiness.</p></div></div>{authenticated === false ? <p className="mt-5 text-sm text-muted-foreground">Sign in to view personalized opportunities. <Link href="/sign-in" className="font-medium text-primary">Sign in</Link></p> : error ? <p className="mt-5 text-sm text-muted-foreground">{error}</p> : jobs.length ? <div className="mt-5 divide-y divide-border">{jobs.map((job) => <article key={job.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-foreground">{job.title}</h3><p className="mt-1 text-sm text-muted-foreground">{job.company} - {job.location}</p></div><div className="flex items-center gap-3"><Badge variant="outline">{job.seniority}</Badge><a href={job.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary">View job <ExternalLink className="h-3.5 w-3.5" /></a></div></article>)}</div> : authenticated ? <p className="mt-5 text-sm text-muted-foreground">No curated roles are available for this domain yet.</p> : null}<Link href="/jobs" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">View all jobs <ArrowRight className="h-4 w-4" /></Link></section>;
}
