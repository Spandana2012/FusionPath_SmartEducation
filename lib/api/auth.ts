import { apiClient } from "@/lib/api/client";

export type AuthUser = { id: string; name: string | null; email: string; phone: string | null; verified_at: string | null };
export type AuthResponse = { authenticated: boolean; user: AuthUser; learner_id: string | null; domain: string | null };

export function signup(payload: { name: string; email: string; phone: string; password: string; confirm_password: string; learner_id?: string | null }) {
  return authenticate("/api/auth/signup", payload);
}

export function login(payload: { email: string; password: string; learner_id?: string | null }) {
  return authenticate("/api/auth/login", payload);
}

async function authenticate(path: string, payload: object) {
  const response = await apiClient<AuthResponse>(path, { method: "POST", body: JSON.stringify(payload) });
  rememberLearner(response.learner_id);
  return response;
}

export function getCurrentUser() {
  return apiClient<AuthResponse>("/api/auth/me");
}

export async function logout() {
  await apiClient<{ message: string }>("/api/auth/logout", { method: "POST" });
}

export function rememberLearner(learnerId: string | null) {
  if (learnerId && typeof window !== "undefined") window.localStorage.setItem("fusionpath.learnerId", learnerId);
}
