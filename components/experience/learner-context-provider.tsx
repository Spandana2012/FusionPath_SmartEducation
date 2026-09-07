"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { getLearnerContext } from "@/lib/api/adaptive";
import type { LearnerContext } from "@/lib/types";

type LearnerContextValue = {
  context: LearnerContext | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const Context = createContext<LearnerContextValue | null>(null);

export function LearnerContextProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [context, setContext] = useState<LearnerContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const learnerId = window.localStorage.getItem("fusionpath.learnerId");
    if (!learnerId) {
      setContext(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextContext = await getLearnerContext(learnerId);
      setContext(nextContext);
      setError(null);
      cacheContext(nextContext);
    } catch {
      const cached = readCachedContext();
      setContext(cached);
      setError(cached ? "Showing the last saved learner context." : "Complete onboarding to build your learner context.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [pathname]);

  const value = useMemo(() => ({ context, loading, error, refresh }), [context, loading, error]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLearnerContext() {
  const value = useContext(Context);
  if (!value) throw new Error("useLearnerContext must be used inside LearnerContextProvider");
  return value;
}

function cacheContext(value: LearnerContext) {
  window.localStorage.setItem("fusionpath.learnerContext", JSON.stringify(value));
}

function readCachedContext(): LearnerContext | null {
  const cached = window.localStorage.getItem("fusionpath.learnerContext");
  if (!cached) return null;
  try {
    return JSON.parse(cached) as LearnerContext;
  } catch {
    return null;
  }
}
