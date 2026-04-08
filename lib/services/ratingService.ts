import { apiRequest } from "@/lib/query-client";

export type RatingTargetType = "lawyer" | "firm";

export interface RatingDTO {
  id: string;
  fromUserId: string;
  targetUserId: string;
  targetType: RatingTargetType;
  score: number;
  comment: string | null;
  procesoId: string;
  createdAt: string;
  fromUser: { id: string; name: string };
}

export interface RatingSummary {
  avg: number;
  count: number;
}

export interface CommunityUserProfile {
  user: { id: string; name: string; email: string };
  role: string;
  lawyerInfo: {
    specialization: string | null;
    licenseNumber: string | null;
    firmName: string | null;
    professionalVerificationStatus: "pendiente" | "verificado" | "rechazado";
  } | null;
  firmInfo: {
    nit: string;
    address: string | null;
    phone: string | null;
  } | null;
  posts: import("./communityService").PostDTO[];
}

export async function getUserProfile(userId: string): Promise<CommunityUserProfile | null> {
  const res = await apiRequest("GET", `/api/community/users/${userId}/profile`);
  if (!res.ok) return null;
  return res.json();
}

export async function getRatings(
  targetUserId: string,
  targetType: RatingTargetType
): Promise<RatingDTO[]> {
  const res = await apiRequest("GET", `/api/ratings/${targetType}/${targetUserId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getRatingSummary(
  targetUserId: string,
  targetType: RatingTargetType
): Promise<RatingSummary> {
  const res = await apiRequest("GET", `/api/ratings/${targetType}/${targetUserId}/summary`);
  if (!res.ok) return { avg: 0, count: 0 };
  return res.json();
}

export async function getCanRate(
  targetUserId: string,
  targetType: RatingTargetType
): Promise<{ canRate: boolean; hasRated: boolean }> {
  const res = await apiRequest("GET", `/api/ratings/${targetType}/${targetUserId}/can-rate`);
  if (!res.ok) return { canRate: false, hasRated: false };
  return res.json();
}

export async function createRating(data: {
  targetUserId: string;
  targetType: RatingTargetType;
  score: number;
  comment?: string | null;
}): Promise<RatingDTO | null> {
  const res = await apiRequest("POST", "/api/ratings", data);
  if (!res.ok) return null;
  return res.json();
}
