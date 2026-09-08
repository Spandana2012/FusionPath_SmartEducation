"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Flag, MessageCircle, Plus, Send } from "lucide-react";

import { useLearnerContext } from "@/components/experience/learner-context-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createCommunityPost, createCommunityReply, getCommunityDomains, getCommunityPosts, getCommunityReplies, reportCommunityPost, type CommunityPost, type CommunityReply } from "@/lib/api/community";
import { hasAccessToken } from "@/lib/api/client";

export function CommunityPage() {
  const { context } = useLearnerContext();
  const [authenticated, setAuthenticated] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [domain, setDomain] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [replies, setReplies] = useState<Record<string, CommunityReply[]>>({});
  const [content, setContent] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [showComposer, setShowComposer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultDomain = useMemo(() => context?.skill_gap.target_role ?? readLocalDomain(), [context]);

  useEffect(() => {
    const available = hasAccessToken();
    setAuthenticated(available);
    if (available) void getCommunityDomains().then((response) => { setDomains(response.domains); setDomain((current) => current || (response.domains.includes(defaultDomain) ? defaultDomain : response.domains[0] ?? "")); }).catch(() => setError("Community domains could not be loaded."));
  }, [defaultDomain]);

  useEffect(() => {
    if (!authenticated || !domain) return;
    setLoading(true);
    void getCommunityPosts(domain).then(setPosts).catch(() => setError("Community posts could not be loaded.")).finally(() => setLoading(false));
  }, [authenticated, domain]);

  async function submitPost(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    try {
      const post = await createCommunityPost(domain, content.trim());
      setPosts((current) => [post, ...current]);
      setContent("");
      setShowComposer(false);
    } catch { setError("Your post could not be published."); }
  }

  async function submitReply(event: FormEvent, postId: string) {
    event.preventDefault();
    const draft = replyDrafts[postId]?.trim();
    if (!draft) return;
    try {
      const reply = await createCommunityReply(postId, draft);
      setReplies((current) => ({ ...current, [postId]: [...(current[postId] ?? []), reply] }));
      setReplyDrafts((current) => ({ ...current, [postId]: "" }));
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, replies_count: post.replies_count + 1 } : post));
    } catch { setError("Your reply could not be published."); }
  }

  async function toggleReplies(postId: string) {
    if (replies[postId]) return;
    try { const nextReplies = await getCommunityReplies(postId); setReplies((current) => ({ ...current, [postId]: nextReplies })); } catch { setError("Replies could not be loaded."); }
  }

  async function report(postId: string) {
    try { await reportCommunityPost(postId); setPosts((current) => current.map((post) => post.id === postId ? { ...post, reported: true } : post)); } catch { setError("The report could not be submitted."); }
  }

  if (!authenticated) return <main className="container flex min-h-[calc(100vh-5rem)] items-center justify-center py-12"><section className="surface-panel max-w-lg p-8 text-center"><MessageCircle className="mx-auto h-8 w-8 text-accent" /><h1 className="mt-4 text-2xl font-semibold text-foreground">Sign in to join the community</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Community posts, replies, and reports are available to verified FusionPath members.</p><Button asChild className="mt-6"><a href="/sign-in">Sign in</a></Button></section></main>;

  return <main className="container py-8 lg:py-12"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Community</p><h1 className="mt-2 font-display text-3xl font-semibold text-foreground">Learn together by domain</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Browse practical questions and shared progress across the same domains used by your learning path.</p><div className="mt-7 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{domains.map((item) => <button key={item} type="button" onClick={() => setDomain(item)} className={`rounded-md border px-3 py-2 text-sm ${domain === item ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>{item}</button>)}</div><Button type="button" onClick={() => setShowComposer((current) => !current)}><Plus className="h-4 w-4" />Start a post</Button></div>{showComposer ? <form onSubmit={submitPost} className="surface-panel mt-6 p-5"><label htmlFor="community-post" className="text-sm font-medium text-foreground">Share with {domain}</label><Textarea id="community-post" value={content} onChange={(event) => setContent(event.target.value)} className="mt-3 min-h-28" placeholder="Ask a question, share a project lesson, or offer a useful insight." required /><Button type="submit" className="mt-4">Publish post <Send className="h-4 w-4" /></Button></form> : null}{error ? <p className="mt-5 text-sm text-destructive" role="alert">{error}</p> : null}<section className="mt-7 space-y-4">{loading ? <div className="surface-panel h-32 animate-pulse" /> : posts.length ? posts.map((post) => <article key={post.id} className="surface-panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><Badge variant="secondary">{post.domain}</Badge><span className="text-xs text-muted-foreground">{formatDate(post.created_at)}</span></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{post.content}</p><div className="mt-5 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" size="sm" onClick={() => void toggleReplies(post.id)}><MessageCircle className="h-4 w-4" />Replies ({post.replies_count})</Button><Button type="button" variant="ghost" size="sm" onClick={() => void report(post.id)} disabled={post.reported}><Flag className="h-4 w-4" />{post.reported ? "Reported" : "Report"}</Button></div>{replies[post.id] ? <div className="mt-4 space-y-3 border-l border-border pl-4">{replies[post.id].map((reply) => <div key={reply.id} className="rounded-md bg-secondary p-3 text-sm text-foreground"><p>{reply.content}</p><p className="mt-2 text-xs text-muted-foreground">{formatDate(reply.created_at)}</p></div>)}<form className="flex gap-2" onSubmit={(event) => void submitReply(event, post.id)}><input value={replyDrafts[post.id] ?? ""} onChange={(event) => setReplyDrafts((current) => ({ ...current, [post.id]: event.target.value }))} className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Write a reply" aria-label="Write a reply" /><Button type="submit" size="icon" aria-label="Send reply"><Send className="h-4 w-4" /></Button></form></div> : null}</article>) : <section className="surface-panel p-10 text-center"><MessageCircle className="mx-auto h-8 w-8 text-accent" /><h2 className="mt-4 text-lg font-semibold text-foreground">No posts in this domain yet</h2><p className="mt-2 text-sm text-muted-foreground">Start the first conversation for {domain}.</p></section>}</section></main>;
}

function readLocalDomain() {
  if (typeof window === "undefined") return "";
  try { return JSON.parse(window.localStorage.getItem("fusionpath.normalizedProfile") ?? "{}").goal ?? ""; } catch { return ""; }
}

function formatDate(value: string | null) { return value ? new Date(value).toLocaleDateString() : "Recently"; }
