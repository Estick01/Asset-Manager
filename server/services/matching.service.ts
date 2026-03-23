/**
 * Matching Service
 * Orchestrates automatic lawyer–case matching when a community post is created.
 *
 * Flow:
 *   createPost() → matchLawyersToPost()
 *     → findCandidates()           (MatchingStorage)
 *     → createMatch()              (MatchingStorage)
 *     → createNotification()       (AppNotificationStorage)
 *     → broadcastToUser()          (WebSocket, fire-and-forget)
 */

import { storage } from "../storage/storeage/database-storage.js";
import { broadcastToUser } from "../websocket/ws-server.js";
import type { Post } from "@/shared/schema";

// ── Hourly notification guard ─────────────────────────────────────────────
// In-memory debounce: prevents flooding a lawyer with >N match notifications
// per hour. Resets on server restart (acceptable for V1).
const NOTIFY_LIMIT_PER_HOUR = 10;
const notifyCount = new Map<string, { count: number; windowStart: number }>();

function canNotify(lawyerUserId: string): boolean {
  const now    = Date.now();
  const bucket = notifyCount.get(lawyerUserId);
  if (!bucket || now - bucket.windowStart > 3_600_000) {
    notifyCount.set(lawyerUserId, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= NOTIFY_LIMIT_PER_HOUR) return false;
  bucket.count++;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────

export class MatchingService {

  /**
   * Main entry point. Called async after post creation (fire-and-forget).
   * Finds relevant lawyers, creates match records, sends notifications.
   */
  async matchLawyersToPost(post: Post): Promise<void> {
    try {
      const candidates = await storage.matching.findCandidates(
        post.caseType,
        post.city,
        post.id,
        post.createdAt ? new Date(post.createdAt as any) : new Date(),
      );

      console.log(`[Matching] ${candidates.length} candidates for post "${post.id}" (${post.caseType})`);
      if (candidates.length === 0) return;

      const results = await Promise.allSettled(
        candidates.map(candidate => this.processCandidate(post, candidate))
      );
      const failed = results.filter(r => r.status === "rejected");
      if (failed.length > 0) {
        console.error(`[Matching] ${failed.length} processCandidate failures:`, failed);
      }
    } catch (err) {
      // Matching failure must NEVER crash the main request
      console.error("[MatchingService] matchLawyersToPost error:", err);
    }
  }

  private async processCandidate(
    post: Post,
    candidate: { lawyerId: string; userId: string; score: number },
  ): Promise<void> {
    // 1. Persist match record (idempotent)
    const match = await storage.matching.createMatch(post.id, candidate.lawyerId, candidate.score);
    if (!match) return; // already existed

    // 2. Respect hourly notification limit
    if (!canNotify(candidate.userId)) {
      await storage.matching.markNotified(post.id, candidate.lawyerId);
      return;
    }

    // 3. In-app notification
    const urgencyPrefix = post.isUrgent === 1 ? "⚡ URGENTE · " : "";
    const caseLabel     = post.caseType
      ? `(${post.caseType.charAt(0).toUpperCase() + post.caseType.slice(1)}) `
      : "";

    await storage.appNotifications.createNotification(
      candidate.userId,
      "case_match",
      `${urgencyPrefix}Nuevo caso para ti`,
      `${caseLabel}${post.title}`,
      {
        postId:   post.id,
        caseType: post.caseType,
        isUrgent: post.isUrgent,
        city:     post.city,
        score:    candidate.score,
      },
    ).catch(() => {});

    // 4. Real-time WebSocket push — two signals:
    //    a) "new_notification"  → actualiza la campanita de notificaciones
    //    b) "new_case_match"    → refresca el feed de casos del abogado + badge en tab
    broadcastToUser(candidate.userId, {
      type: "new_notification",
      data: { titulo: urgencyPrefix + "Nuevo caso para ti", mensaje: `${caseLabel}${post.title}`, tipo: "case_match" },
    });
    broadcastToUser(candidate.userId, {
      type: "new_case_match",
      data: {
        postId:   post.id,
        title:    post.title,
        caseType: post.caseType,
        isUrgent: post.isUrgent,
        city:     post.city,
        score:    candidate.score,
      },
    });

    // 5. Mark notified
    await storage.matching.markNotified(post.id, candidate.lawyerId).catch(() => {});
  }

  /**
   * Returns the personalised feed for a lawyer.
   * Sections: urgent (isUrgent=1), recommended (score≥6), recent (rest).
   */
  async getLawyerFeed(
    lawyerId: string,
    lawyerUserId: string,
    limit = 60,
    offset = 0,
  ): Promise<{
    urgent:      import("@/shared/schema").PostDTO[];
    recommended: import("@/shared/schema").PostDTO[];
    recent:      import("@/shared/schema").PostDTO[];
  }> {
    const rows = await storage.matching.getMatchedPostIds(lawyerId, limit, offset);

    if (rows.length === 0) {
      return { urgent: [], recommended: [], recent: [] };
    }

    // Load all posts in one batched call (uses the new `ids` filter)
    const postIds = rows.map(r => r.postId);
    const dtos    = await storage.community.getPosts(
      postIds.length,
      0,
      { ids: postIds },
      lawyerUserId,
    );

    // Build a score/urgency map for re-sorting
    const meta = new Map(rows.map(r => [r.postId, r]));

    // Sort DTOs in the same order as the DB query (urgent first, then score, then date)
    const sorted = [...dtos].sort((a, b) => {
      const ma = meta.get(a.id)!;
      const mb = meta.get(b.id)!;
      if (mb.isUrgent !== ma.isUrgent) return mb.isUrgent - ma.isUrgent;
      if (mb.score    !== ma.score)    return mb.score    - ma.score;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // ── Dynamic threshold: 80th-percentile of non-urgent scores ─────────────
    // Ensures "Recomendados" always shows roughly the top 20% of matched posts,
    // even when all scores cluster in a narrow band.
    const nonUrgentScores = rows
      .filter(r => r.isUrgent !== 1)
      .map(r => r.score)
      .sort((a, b) => b - a);
    const p80Index        = Math.floor(nonUrgentScores.length * 0.2);
    const dynamicThreshold = Math.max(50, nonUrgentScores[p80Index] ?? 70);

    const urgent:      typeof dtos = [];
    const recommended: typeof dtos = [];
    const recent:      typeof dtos = [];

    for (const dto of sorted) {
      const m = meta.get(dto.id);
      if (!m) continue;

      if (m.isUrgent === 1) {
        urgent.push(dto);
      } else if (m.score >= dynamicThreshold) {
        recommended.push(dto);
      } else {
        recent.push(dto);
      }
    }

    return { urgent, recommended, recent };
  }

  /** Mark post as seen in lawyer's feed. */
  async markSeen(postId: string, lawyerId: string): Promise<void> {
    await storage.matching.markSeen(postId, lawyerId).catch(() => {});
  }
}

export const matchingService = new MatchingService();
