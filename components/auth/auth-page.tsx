"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, signup } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const isSignup = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const validationError = validateForm({ isSignup, name, email, phone, password, confirmPassword });
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    try {
      const learnerId = window.localStorage.getItem("fusionpath.learnerId");
      const response = isSignup
        ? await signup({ name: name.trim(), email: email.trim(), phone: phone.trim(), password, confirm_password: confirmPassword, learner_id: learnerId })
        : await login({ email: email.trim(), password, learner_id: learnerId });
      router.push(response.learner_id ? "/dashboard" : "/onboarding");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container flex min-h-[calc(100vh-5rem)] items-center justify-center py-12">
      <section className="surface-panel w-full max-w-lg p-7 sm:p-9">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-accent">{isSignup ? "Create an account" : "Welcome back"}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">{isSignup ? "Create your FusionPath account" : "Sign in to FusionPath"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{isSignup ? "Create your account to connect your learner profile with personalized jobs and community spaces." : "Use your email and password to continue your personalized learning journey."}</p>
        <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
          {isSignup ? <Field id="auth-name" label="Full name" value={name} onChange={setName} placeholder="Your name" autoComplete="name" /> : null}
          <Field id="auth-email" label="Email address" value={email} onChange={setEmail} placeholder="you@example.com" type="email" autoComplete="email" />
          {isSignup ? <Field id="auth-phone" label="Phone number" value={phone} onChange={setPhone} placeholder="+91 98765 43210" type="tel" autoComplete="tel" /> : null}
          <Field id="auth-password" label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" type="password" autoComplete={isSignup ? "new-password" : "current-password"} />
          {isSignup ? <Field id="auth-confirm-password" label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat your password" type="password" autoComplete="new-password" /> : null}
          {error ? <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Working..." : isSignup ? "Create account" : "Sign in"}<KeyRound className="h-4 w-4" /></Button>
        </form>
        <p className="mt-7 text-sm text-muted-foreground">{isSignup ? "Already have an account?" : "Don't have an account?"} <Link href={isSignup ? "/sign-in" : "/sign-up"} className="font-medium text-primary">{isSignup ? "Sign in" : "Sign up"}<ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></p>
      </section>
    </main>
  );
}

function Field({ id, label, value, onChange, placeholder, type = "text", autoComplete }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; autoComplete?: string }) {
  return <div><label className="block text-sm font-medium text-foreground" htmlFor={id}>{label}</label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} required /></div>;
}

function validateForm({ isSignup, name, email, phone, password, confirmPassword }: { isSignup: boolean; name: string; email: string; phone: string; password: string; confirmPassword: string }) {
  if (isSignup && !name.trim()) return "Full name is required.";
  if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return "Enter a valid email address.";
  if (isSignup && !phone.trim()) return "Phone number is required.";
  if (isSignup && !/^[+]?[0-9 ()-]{7,32}$/.test(phone.trim())) return "Enter a valid phone number.";
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (isSignup && password !== confirmPassword) return "Passwords do not match.";
  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) return "An account with that email already exists.";
  if (error instanceof ApiError && error.status === 401) return "Email or password is incorrect.";
  if (error instanceof ApiError && error.status === 422) return "Please check the details and try again.";
  if (error instanceof ApiError) return error.userMessage;
  return "Authentication could not be completed. Please try again.";
}
