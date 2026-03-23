import { apiRequest } from "@/lib/query-client";
import type { BadgeKey } from "@/lib/services/communityService";

export interface RecommendedLawyerDTO {
  lawyerProfileId: string;
  userId:          string;
  name:            string;
  specialization:  string | null;
  isVerified:      boolean;
  rating:          { avg: number; count: number };
  activeCases:     number;
  finalScore:      number;
  badges:          BadgeKey[];
  /** true when the lawyer doesn't match the case type/city but is shown as fallback */
  isFallback?:     boolean;
}

export async function getRecommendedLawyers(postId: string): Promise<RecommendedLawyerDTO[]> {
  const res = await apiRequest("GET", `/api/community/recommended-lawyers?postId=${postId}`);
  if (!res.ok) return [];
  return res.json();
}
