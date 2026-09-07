export type SkillState = { name: string; mastery: number; status: "mastered" | "strong" | "learning" | "weak" | "locked" };
export type LearnerState = {
  name: string;
  goal: string;
  readiness: number;
  skills: SkillState[];
  completedLessons: string[];
  mistakes: Record<string, number>;
  adapted: boolean;
  activity: { minutes: number; questions: number; projects: number };
};

export const defaultLearnerState: LearnerState = {
  name: "Learner",
  goal: "",
  readiness: 0,
  skills: [],
  completedLessons: [],
  mistakes: {},
  adapted: false,
  activity: { minutes: 145, questions: 12, projects: 1 },
};

const KEY = "fusionpath.learnerState";
const LEARNER_ID_KEY = "fusionpath.persistedLearnerId";
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

type StateEnvelope = { learner_id: string; roadmap_version: number; state: LearnerState };
let pendingWrite: Promise<void> = Promise.resolve();

export function readLearnerState(): LearnerState {
  if (typeof window === "undefined") return defaultLearnerState;
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved ? { ...defaultLearnerState, ...JSON.parse(saved) } : defaultLearnerState;
  } catch { return defaultLearnerState; }
}
function cacheState(state: LearnerState) {
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`Adaptive state request failed (${response.status})`);
  return response.json() as Promise<T>;
}

/** Backend-first hydration; the cache makes an offline or unavailable API non-blocking. */
export async function hydrateLearnerState(): Promise<LearnerState> {
  const cached = readLearnerState();
  if (typeof window === "undefined") return cached;
  const learnerId = window.localStorage.getItem(LEARNER_ID_KEY);
  try {
    const envelope = learnerId
      ? await request<StateEnvelope>(`/api/adaptive/state/${encodeURIComponent(learnerId)}`)
      : await request<StateEnvelope>("/api/adaptive/learners/bootstrap", {
          method: "POST",
          body: JSON.stringify({ initial_state: cached, existing_learner_id: window.localStorage.getItem("fusionpath.learnerId") ?? undefined }),
        });
    window.localStorage.setItem(LEARNER_ID_KEY, envelope.learner_id);
    cacheState(envelope.state);
    return envelope.state;
  } catch {
    return cached;
  }
}

/** Writes cache optimistically, then persists a new version of the roadmap state. */
export async function saveLearnerState(state: LearnerState): Promise<void> {
  cacheState(state);
  if (typeof window === "undefined") return;
  pendingWrite = pendingWrite.then(async () => {
    const learnerId = window.localStorage.getItem(LEARNER_ID_KEY);
    if (!learnerId) return;
    try {
      const envelope = await request<StateEnvelope>(`/api/adaptive/state/${encodeURIComponent(learnerId)}`, {
        method: "PUT",
        body: JSON.stringify(state),
      });
      cacheState(envelope.state);
    } catch {
      // Intentional: cached state remains usable offline and will be rehydrated next visit.
    }
  }).catch(() => undefined);
  await pendingWrite;
}
