import { apiRequest } from "@/lib/query-client";
import type { PostDTO } from "./communityService";

export interface LawyerFeedDTO {
  urgent:      PostDTO[];
  recommended: PostDTO[];
  recent:      PostDTO[];
}

export async function getLawyerFeed(limit = 60, offset = 0): Promise<LawyerFeedDTO> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await apiRequest("GET", `/api/community/lawyer-feed?${params}`);
  if (!res.ok) return { urgent: [], recommended: [], recent: [] };
  return res.json();
}

export async function markPostSeen(postId: string): Promise<void> {
  await apiRequest("POST", `/api/posts/${postId}/seen`).catch(() => {});
}
