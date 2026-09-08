import { apiClient, clearAccessToken, setAccessToken } from "@/lib/api/client";

export type AuthUser = { id: string; email: string; verified_at: string | null };
export type AuthResponse = { access_token: string; token_type: string; expires_in: number; user: AuthUser; learner_id: string | null };

export async function requestOtp(email: string) {
  return apiClient<{ message: string }>("/api/auth/otp/request", { method: "POST", body: JSON.stringify({ email }) });
}

export async function verifyOtp(email: string, otp: string, learnerId?: string | null) {
  const response = await apiClient<AuthResponse>("/api/auth/otp/verify", { method: "POST", body: JSON.stringify({ email, otp, learner_id: learnerId ?? undefined }) });
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
