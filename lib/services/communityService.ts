import { apiRequest } from "@/lib/query-client";
import { Platform } from "react-native";

export interface PostAuthor {
  id: string;
  name: string;
  email: string;
  rol?: string;
  isProfessionallyVerified?: boolean;
}

export interface Tag {
  id:   string;
  name: string;
  slug: string;
}

export interface PostDTO {
  id:              string;
  userId:          string;
  title:           string;
  content:         string;
  visibility:      "public" | "anonymous";
  caseType:        string | null;
  isUrgent:        number;
  city:            string | null;
  viewCount:       number;
  status:          "open" | "in_progress" | "closed";
  takenByLawyerId: string | null;
  takenByUserId:   string | null;
  takenAt:         string | null;
  takenExpiresAt:  string | null;
  clientAccepted:  number | null;
  procesoId:       string | null;
  createdAt:       string;
  updatedAt:       string;
  author:          PostAuthor | null;
  commentCount:    number;
  likeCount:       number;
  isLiked:         boolean;
  isBookmarked:    boolean;
  tags:            Tag[];
  takenByName:     string | null;
  takenByProfessionallyVerified?: boolean;
}

export interface CommentDTO {
  id:        string;
  postId:    string;
  userId:    string;
  content:   string;
  parentId:  string | null;
  createdAt: string;
  author:    PostAuthor;
  replies:   CommentDTO[];
}

export type PostSort = "recent" | "popular" | "liked";

export type BadgeKey =
  | "primer_caso"
  | "comprometido"
  | "alta_conversion"
  | "respuesta_rapida"
  | "valorado";

export interface LawyerCommunityStats {
  casesTaken:      number;
  processesLinked: number;
  conversionRate:  number;
  avgRating:       number;
  ratingCount:     number;
  badges:          BadgeKey[];
}

export const BADGE_META: Record<BadgeKey, { label: string; icon: string; color: string; desc: string }> = {
  primer_caso:     { label: "Primer caso",       icon: "star-outline",             color: "#F5A623", desc: "Creó su primer proceso desde la comunidad" },
  comprometido:    { label: "Comprometido",       icon: "shield-checkmark-outline", color: "#27AE7A", desc: "5+ procesos creados desde la comunidad" },
  alta_conversion: { label: "Alta conversión",   icon: "trending-up-outline",      color: "#2196A6", desc: "Convierte +80% de los casos que toma" },
  respuesta_rapida:{ label: "Respuesta rápida",  icon: "flash-outline",            color: "#7C3AED", desc: "Toma casos urgentes en menos de 2 horas" },
  valorado:        { label: "Muy valorado",       icon: "heart-outline",            color: "#E05252", desc: "Calificación promedio ≥ 4.5 con 3+ reseñas" },
};

export interface CityResult {
  id:                 string;
  nombre:             string;
  departamentoNombre: string;
}

// ── Posts ──────────────────────────────────────────────────────────────────

export async function getPosts(
  limit = 20,
  offset = 0,
  filter: { search?: string; tagSlug?: string; sort?: PostSort; city?: string; authorId?: string; unlinkedOnly?: boolean; clientAccepted?: boolean } = {}
): Promise<PostDTO[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (filter.search)         params.set("search",         filter.search);
  if (filter.tagSlug)        params.set("tag",            filter.tagSlug);
  if (filter.sort)           params.set("sort",           filter.sort);
  if (filter.city)           params.set("city",           filter.city);
  if (filter.authorId)       params.set("authorId",       filter.authorId);
  if (filter.unlinkedOnly)   params.set("unlinkedOnly",   "true");
  if (filter.clientAccepted) params.set("clientAccepted", "true");
  const res = await apiRequest("GET", `/api/posts?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function searchCities(
  search = "",
  limit  = 20,
  offset = 0
): Promise<{ data: CityResult[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search) params.set("q", search);
  const res = await apiRequest("GET", `/api/municipios/search?${params}`);
  if (!res.ok) return { data: [], total: 0, hasMore: false };
  return res.json();
}

export async function getPost(id: string): Promise<PostDTO | null> {
  const res = await apiRequest("GET", `/api/posts/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createPost(data: {
  title:       string;
  content:     string;
  visibility?: "public" | "anonymous";
  tagIds?:     string[];
  caseType?:   string | null;
  isUrgent?:   boolean;
  city?:       string | null;
}): Promise<PostDTO | null> {
  const res = await apiRequest("POST", "/api/posts", data);
  if (!res.ok) return null;
  return res.json();
}

export async function updatePost(id: string, data: {
  title?:    string;
  content?:  string;
  tagIds?:   string[];
  caseType?: string | null;
  isUrgent?: boolean;
  city?:     string | null;
}): Promise<PostDTO | null> {
  const res = await apiRequest("PUT", `/api/posts/${id}`, data);
  if (!res.ok) return null;
  return res.json();
}

export async function deletePost(id: string): Promise<boolean> {
  const res = await apiRequest("DELETE", `/api/posts/${id}`);
  return res.ok;
}

// ── Comments ───────────────────────────────────────────────────────────────

export async function getComments(postId: string): Promise<CommentDTO[]> {
  const res = await apiRequest("GET", `/api/posts/${postId}/comments`);
  if (!res.ok) return [];
  return res.json();
}

export async function addComment(
  postId: string,
  content: string,
  parentId?: string | null
): Promise<CommentDTO | null> {
  const res = await apiRequest("POST", `/api/posts/${postId}/comments`, { content, parentId: parentId ?? null });
  if (!res.ok) return null;
  return res.json();
}

export async function updateComment(id: string, content: string): Promise<boolean> {
  const res = await apiRequest("PUT", `/api/comments/${id}`, { content });
  return res.ok;
}

export async function deleteComment(id: string): Promise<boolean> {
  const res = await apiRequest("DELETE", `/api/comments/${id}`);
  return res.ok;
}

// ── Likes ──────────────────────────────────────────────────────────────────

export async function toggleLike(postId: string): Promise<{ liked: boolean; likeCount: number } | null> {
  const res = await apiRequest("POST", `/api/posts/${postId}/like`);
  if (!res.ok) return null;
  return res.json();
}

// ── Bookmarks ──────────────────────────────────────────────────────────────

export async function toggleBookmark(postId: string): Promise<{ bookmarked: boolean } | null> {
  const res = await apiRequest("POST", `/api/posts/${postId}/bookmark`);
  if (!res.ok) return null;
  return res.json();
}

export async function getBookmarks(): Promise<PostDTO[]> {
  const res = await apiRequest("GET", "/api/bookmarks");
  if (!res.ok) return [];
  return res.json();
}

// ── Tags ───────────────────────────────────────────────────────────────────

export async function getTags(): Promise<Tag[]> {
  const res = await apiRequest("GET", "/api/tags");
  if (!res.ok) return [];
  return res.json();
}

// ── Reports ────────────────────────────────────────────────────────────────

export async function reportPost(postId: string, reason: string, detail?: string): Promise<boolean> {
  const res = await apiRequest("POST", `/api/posts/${postId}/report`, { reason, detail });
  return res.ok;
}

export async function reportComment(commentId: string, reason: string, detail?: string): Promise<boolean> {
  const res = await apiRequest("POST", `/api/comments/${commentId}/report`, { reason, detail });
  return res.ok;
}

// ── Chat ───────────────────────────────────────────────────────────────────

export async function startChat(postId: string): Promise<{ conversationId: string } | null> {
  const res = await apiRequest("POST", `/api/posts/${postId}/start-chat`);
  if (!res.ok) return null;
  return res.json();
}

export async function startDirectChat(targetUserId: string): Promise<{ id: string } | null> {
  const res = await apiRequest("POST", "/api/chat/conversations", { targetUserId, type: "direct" });
  if (!res.ok) return null;
  return res.json();
}

export async function acceptTake(postId: string): Promise<PostDTO> {
  const res = await apiRequest("POST", `/api/posts/${postId}/accept-take`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "No se pudo aceptar");
  }
  return res.json();
}

export async function rejectTake(postId: string): Promise<PostDTO> {
  const res = await apiRequest("POST", `/api/posts/${postId}/reject-take`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "No se pudo rechazar");
  }
  return res.json();
}

export async function takePost(postId: string): Promise<PostDTO> {
  const res = await apiRequest("POST", `/api/posts/${postId}/take`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "No se pudo tomar el caso");
  }
  return res.json();
}

export async function closePost(postId: string): Promise<PostDTO> {
  const res = await apiRequest("POST", `/api/posts/${postId}/close`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "No se pudo cerrar el caso");
  }
  return res.json();
}

// ── Share ──────────────────────────────────────────────────────────────────

export async function sharePost(post: PostDTO): Promise<void> {
  const url    = `${typeof window !== "undefined" ? window.location.origin : ""}/community/${post.id}`;
  const text   = `"${post.title}" en la comunidad legal`;

  if (Platform.OS === "web" && typeof navigator !== "undefined" && (navigator as any).share) {
    await (navigator as any).share({ title: post.title, text, url }).catch(() => {
      navigator.clipboard?.writeText(url).catch(() => {});
    });
  } else if (Platform.OS === "web") {
    navigator.clipboard?.writeText(url).catch(() => {});
  } else {
    // Native: use expo-sharing if available, fallback to Clipboard
    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(url);
    } catch {}
  }
}

// ── Community stats ────────────────────────────────────────────────────────

export async function getLawyerCommunityStats(userId: string): Promise<LawyerCommunityStats> {
  const res = await apiRequest("GET", `/api/community/lawyer-stats/${userId}`);
  if (!res.ok) throw new Error("Error al cargar estadísticas");
  return res.json();
}

export async function linkProcesoToPost(procesoId: string, postId: string): Promise<void> {
  const res = await apiRequest("PATCH", `/api/procesos/${procesoId}/link-post`, { postId });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "No se pudo vincular el proceso");
  }
}
