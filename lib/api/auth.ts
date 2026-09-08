import { apiClient, clearAccessToken, setAccessToken } from "@/lib/api/client";

export type AuthUser = { id: string; name: string | null; email: string; phone: string | null; verified_at: string | null };
export type AuthResponse = { access_token: string; token_type: string; expires_in: number; user: AuthUser; learner_id: string | null };

export function signup(payload: { name: string; email: string; phone: string; password: string; confirm_password: string; learner_id?: string | null }) {
  return authenticate("/api/auth/signup", payload);
}

export function login(payload: { email: string; password: string; learner_id?: string | null }) {
  return authenticate("/api/auth/login", payload);
}

async function authenticate(path: string, payload: object) {
  const response = await apiClient<AuthResponse>(path, { method: "POST", body: JSON.stringify(payload) });
  setAccessToken(response.access_token);
  if (response.learner_id && typeof window !== "undefined") window.localStorage.setItem("fusionpath.learnerId", response.learner_id);
  return response;
}

export async function refreshAuth() {
  const response = await apiClient<AuthResponse>("/api/auth/refresh", { method: "POST" });
  setAccessToken(response.access_token);
  if (response.learner_id && typeof window !== "undefined") window.localStorage.setItem("fusionpath.learnerId", response.learner_id);
  return response;
}

export async function logout() {
  await apiClient<{ message: string }>("/api/auth/logout", { method: "POST" });
  clearAccessToken();
}
