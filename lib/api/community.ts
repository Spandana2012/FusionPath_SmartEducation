import { apiClient } from "@/lib/api/client";

export function getCommunityDomains() {
  return apiClient<{ domains: string[] }>("/api/community/domains");
}

export type CommunityPost = { id: string; author_user_id: string; domain: string; content: string; created_at: string | null; reported: boolean; replies_count: number };
export type CommunityReply = { id: string; post_id: string; author_user_id: string; content: string; created_at: string | null; reported: boolean };

export function getCommunityPosts(domain?: string) {
  const query = domain ? `?domain=${encodeURIComponent(domain)}` : "";
  return apiClient<CommunityPost[]>(`/api/community/posts${query}`);
}

export function createCommunityPost(domain: string, content: string) {
  return apiClient<CommunityPost>("/api/community/posts", { method: "POST", body: JSON.stringify({ domain, content }) });
}

export function getCommunityReplies(postId: string) {
  return apiClient<CommunityReply[]>(`/api/community/posts/${encodeURIComponent(postId)}/replies`);
}

export function createCommunityReply(postId: string, content: string) {
  return apiClient<CommunityReply>(`/api/community/posts/${encodeURIComponent(postId)}/replies`, { method: "POST", body: JSON.stringify({ content }) });
}

export function reportCommunityPost(postId: string) {
  return apiClient<{ message: string }>(`/api/community/posts/${encodeURIComponent(postId)}/report`, { method: "POST" });
}

export function reportCommunityReply(replyId: string) {
  return apiClient<{ message: string }>(`/api/community/replies/${encodeURIComponent(replyId)}/report`, { method: "POST" });
}
