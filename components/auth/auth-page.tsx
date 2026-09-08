"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MailCheck, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestOtp, verifyOtp } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await requestOtp(email);
      setSent(true);
      setMessage(response.message);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await verifyOtp(email, otp, window.localStorage.getItem("fusionpath.learnerId"));
      router.push(response.learner_id ? "/dashboard" : "/onboarding");
    } catch (verifyError) {
      setError(getErrorMessage(verifyError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container flex min-h-[calc(100vh-5rem)] items-center justify-center py-12">
      <section className="surface-panel w-full max-w-lg p-7 sm:p-9">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Passwordless access</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">{mode === "sign-in" ? "Sign in to FusionPath" : "Create your FusionPath account"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Use your email to receive a one-time verification code. Your existing local learner profile can be linked after verification.</p>
        <form className="mt-7 space-y-4" onSubmit={sent ? verifyCode : sendCode}>
          <label className="block text-sm font-medium text-foreground" htmlFor="auth-email">Email address</label>
          <Input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required disabled={busy && sent} />
          {sent ? <><label className="block text-sm font-medium text-foreground" htmlFor="auth-otp">Verification code</label><Input id="auth-otp" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" required /></> : null}
          {message ? <p className="rounded-md bg-secondary p-3 text-sm text-foreground" role="status">{message}</p> : null}
          {error ? <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Working..." : sent ? "Verify and continue" : "Send verification code"}<MailCheck className="h-4 w-4" /></Button>
          {sent ? <Button type="button" variant="ghost" className="w-full" onClick={() => { setSent(false); setMessage(null); }}>Use a different email</Button> : null}
        </form>
        <p className="mt-7 text-sm text-muted-foreground">{mode === "sign-in" ? "New to FusionPath?" : "Already have an account?"} <Link href={mode === "sign-in" ? "/sign-up" : "/sign-in"} className="font-medium text-primary">{mode === "sign-in" ? "Sign up" : "Sign in"}<ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></p>
      </section>
    </main>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && typeof error.detail === "object" && error.detail && "detail" in error.detail && typeof error.detail.detail === "string") return error.detail.detail;
  if (error instanceof ApiError) return error.userMessage;
  return "The request could not be completed. Check the backend configuration and try again.";
}
