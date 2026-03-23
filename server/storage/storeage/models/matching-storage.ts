/**
 * Matching Storage
 * DB operations for community_post_matches.
 * Also exposes helper to find lawyers eligible for a given post.
 */

import { randomUUID } from "crypto";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { communityPostMatches } from "@/shared/schema/community-match.schema";
import { lawyerProfiles } from "@/shared/schema/lawyer-profile.schema";
import { personas } from "@/shared/schema/persona.schema";
import { users } from "@/shared/schema/user.schema";
import { municipios } from "@/shared/schema/ubicacion.schema";
import type { PostMatch } from "@/shared/schema/community-match.schema";
import type { Database } from "../database-storage";

// ── Exact specialization keywords ────────────────────────────────────────────
const CASE_KEYWORDS: Record<string, string[]> = {
  civil:          ["civil", "familia"],
  penal:          ["penal", "criminal", "delito"],
  laboral:        ["laboral", "trabajo", "empleo"],
  familiar:       ["familia", "familiar", "divorcio", "sucesiones"],
  mercantil:      ["mercantil", "comercial", "empresa", "societario"],
  administrativo: ["administrativo", "publico", "estado", "contratacion"],
  tributario:     ["tributario", "fiscal", "impuesto", "aduanas"],
  inmobiliario:   ["inmobiliario", "propiedad", "bienes", "arrendamiento"],
};

// ── Related specialization keywords (afinidad 0.6) ───────────────────────────
// Lawyers who aren't exact but handle related areas
const RELATED_KEYWORDS: Record<string, string[]> = {
  civil:          ["laboral", "sucesiones", "notarial", "arrendamiento", "contratos"],
  penal:          ["militar", "adolescentes", "criminolog"],
  laboral:        ["civil", "seguridad social", "migratorio", "pension"],
  familiar:       ["civil", "sucesiones", "notarial", "adopcion", "custodia"],
  mercantil:      ["tributario", "administrativo", "civil", "contrat", "societario"],
  administrativo: ["tributario", "constitucional", "laboral", "ambiental"],
  tributario:     ["mercantil", "administrativo", "contab", "aduanas"],
  inmobiliario:   ["civil", "notarial", "agrario", "urbanismo", "construccion"],
};

/** Max lawyers to notify per post */
const MAX_MATCHES = 50;

// ── Matching candidate ────────────────────────────────────────────────────

export interface MatchCandidate {
  lawyerId:  string;  // lawyer_profiles.id
  userId:    string;  // users.id (for WebSocket)
  cityName:  string | null;
  score:     number;
}

export class MatchingStorage {
  constructor(private db: Database) {}

  // ── Match CRUD ────────────────────────────────────────────────────────

  /** Insert match row (ignores duplicates via IGNORE). */
  async createMatch(postId: string, lawyerId: string, score: number): Promise<PostMatch | null> {
    const id = randomUUID();
    try {
      await this.db.insert(communityPostMatches).values({ id, postId, lawyerId, score });
      const rows = await this.db
        .select()
        .from(communityPostMatches)
        .where(eq(communityPostMatches.id, id))
        .limit(1);
      return (rows[0] as PostMatch) ?? null;
    } catch {
      // UNIQUE constraint violation = already matched, skip silently
      return null;
    }
  }

  async matchExists(postId: string, lawyerId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: communityPostMatches.id })
      .from(communityPostMatches)
      .where(and(eq(communityPostMatches.postId, postId), eq(communityPostMatches.lawyerId, lawyerId)))
      .limit(1);
    return rows.length > 0;
  }

  async markNotified(postId: string, lawyerId: string): Promise<void> {
    await this.db
      .update(communityPostMatches)
      .set({ notified: 1 })
      .where(and(eq(communityPostMatches.postId, postId), eq(communityPostMatches.lawyerId, lawyerId)));
  }

  async markSeen(postId: string, lawyerId: string): Promise<void> {
    await this.db
      .update(communityPostMatches)
      .set({ seen: 1 })
      .where(and(eq(communityPostMatches.postId, postId), eq(communityPostMatches.lawyerId, lawyerId)));
  }

  async getMatchesByPost(postId: string): Promise<PostMatch[]> {
    return this.db
      .select()
      .from(communityPostMatches)
      .where(eq(communityPostMatches.postId, postId))
      .orderBy(desc(communityPostMatches.score)) as Promise<PostMatch[]>;
  }

  /** Returns post IDs matched to this lawyer, ordered by score + urgency.
   *  Joined with posts table to get isUrgent / createdAt for sorting. */
  async getMatchedPostIds(
    lawyerId: string,
    limit = 60,
    offset = 0,
  ): Promise<{ postId: string; score: number; isUrgent: number; createdAt: Date }[]> {
    const rows = await this.db.execute(sql`
      SELECT
        m.post_id  AS postId,
        m.score    AS score,
        p.is_urgent AS isUrgent,
        p.created_at AS createdAt
      FROM community_post_matches m
      INNER JOIN posts p ON p.id = m.post_id
      WHERE m.lawyer_id = ${lawyerId}
        AND p.status = 'open'
      ORDER BY p.is_urgent DESC, m.score DESC, p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    return (rows as any[])[0] ?? [];
  }

  async countMatchedPosts(lawyerId: string): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`COUNT(*)` })
      .from(communityPostMatches)
      .where(eq(communityPostMatches.lawyerId, lawyerId));
    return Number(rows[0]?.n ?? 0);
  }

  /** Returns userId (users.id) of all lawyers matched to this post.
   *  Used to notify them when the case is taken by another lawyer. */
  async getMatchedLawyerUserIds(postId: string): Promise<string[]> {
    const rows = await this.db.execute(sql`
      SELECT lp.user_id AS userId
      FROM community_post_matches m
      INNER JOIN lawyer_profiles lp ON lp.id = m.lawyer_id
      WHERE m.post_id = ${postId}
    `);
    return ((rows as any[])[0] ?? []).map((r: any) => r.userId as string);
  }

  // ── Lawyer discovery ──────────────────────────────────────────────────

  /**
   * Find lawyers relevant for a given post.
   * Score 0–100 stored in community_post_matches.score.
   *
   * Formula:
   *   baseScore  = matchScore(0-1) × 96 + qualityActivityBoost(0-2) + freshnessBoost(0-3)
   *   finalScore = baseScore + explorationBoost(0-2, only if baseScore ≥ 60)
   *
   * specialtyScore:        exact=1.0 · related=0.6 · none→excluded
   * cityScore:             sameCity=1.0 · noCityOnPost=0.4 · diffCity=0.3
   * qualityActivityBoost:  comments that received replies (quality signal)
   * freshnessBoost:        post age <1h→+3 · <24h→+1 · older→0
   * explorationBoost:      random 0-2 ONLY if baseScore≥60 (no bad lawyers boosted)
   */
  async findCandidates(
    caseType:      string | null,
    city:          string | null,
    postId:        string,
    postCreatedAt: Date = new Date(),
  ): Promise<MatchCandidate[]> {
    // Single query: lawyers + city + quality activity (comments with replies)
    const result = await this.db.execute(sql`
      SELECT
        lp.id            AS lawyerId,
        lp.user_id       AS userId,
        lp.specialization,
        m.nombre         AS cityName,
        COALESCE(act.usefulComments, 0) AS usefulComments,
        COALESCE(w.activeCases,      0) AS activeCases
      FROM lawyer_profiles lp
      INNER JOIN users    u   ON u.id = lp.user_id AND u.is_active = 1
      INNER JOIN personas p   ON p.id = lp.persona_id
      LEFT  JOIN municipios m ON m.id = p.municipio_id
      LEFT  JOIN (
        -- Quality activity: comments that received at least one reply in the last 30 days
        -- A reply means the community found value in the lawyer's response
        SELECT c.user_id, COUNT(DISTINCT c.id) AS usefulComments
        FROM comments c
        WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND EXISTS (
            SELECT 1 FROM comments r WHERE r.parent_id = c.id
          )
        GROUP BY c.user_id
      ) act ON act.user_id = lp.user_id
      LEFT  JOIN (
        -- Active workload: penalise overloaded lawyers so they get fewer new leads
        SELECT pl.lawyer_id, COUNT(*) AS activeCases
        FROM proceso_lawyers pl
        INNER JOIN procesos        proc ON proc.id  = pl.proceso_id
        INNER JOIN estados_proceso ep   ON ep.id    = proc.estado_id
        WHERE pl.status = 'activo'
          AND ep.codigo != 'finalizado'
        GROUP BY pl.lawyer_id
      ) w ON w.lawyer_id = lp.id
      LEFT  JOIN (
        -- Conversion track record: accepted cases that ended up as linked procesos
        SELECT
          taken_by_user_id,
          SUM(CASE WHEN proceso_id IS NOT NULL THEN 1 ELSE 0 END) AS processesLinked
        FROM posts
        WHERE taken_by_user_id IS NOT NULL AND client_accepted = 1
        GROUP BY taken_by_user_id
      ) cv ON cv.taken_by_user_id = lp.user_id
    `);

    const rows = ((result as any[])[0] ?? []) as any[];

    console.log(`[Matching] findCandidates: ${rows.length} lawyers — caseType="${caseType}" city="${city}"`);

    // ── Freshness boost (computed once for the post) ──────────────────────
    const postAgeMs      = Date.now() - postCreatedAt.getTime();
    const freshnessBoost = postAgeMs < 3_600_000   ? 3   // < 1 hour  → high urgency
                         : postAgeMs < 86_400_000  ? 1   // < 24 hours → moderate
                         : 0;                             // older → no boost

    const keywords        = caseType ? (CASE_KEYWORDS[caseType]    ?? []) : [];
    const relatedKeywords = caseType ? (RELATED_KEYWORDS[caseType] ?? []) : [];
    const postCityNorm    = city?.toLowerCase().trim() ?? null;

    const candidates: MatchCandidate[] = [];

    for (const row of rows) {
      const spec = (row.specialization as string | null)?.toLowerCase().trim() ?? "";

      // ── 1. Specialty score ───────────────────────────────────────────────
      const isExact   = keywords.length        > 0 && keywords.some(kw => spec.includes(kw));
      const isRelated = relatedKeywords.length  > 0 && relatedKeywords.some(kw => spec.includes(kw));

      if (!isExact && !isRelated && caseType !== null) continue; // no relevance

      const specialtyScore = isExact ? 1.0 : isRelated ? 0.6 : 1.0;

      // ── 2. City score ────────────────────────────────────────────────────
      const lawyerCity = (row.cityName as string | null)?.toLowerCase().trim() ?? null;
      const cityScore  = !postCityNorm              ? 0.4  // no city → remote/neutral
                       : lawyerCity === postCityNorm ? 1.0  // same city
                       : 0.3;                               // different city

      // ── 3. Match score (0–1) ─────────────────────────────────────────────
      const matchScore = specialtyScore * 0.7 + cityScore * 0.3;

      // ── 4. Quality activity boost (0–2) ──────────────────────────────────
      // Counts only comments that received replies → quality over quantity
      const useful               = Number(row.usefulComments);
      const qualityActivityBoost = useful >= 10 ? 2 : useful >= 3 ? 1 : 0;

      // ── 5. Availability penalty (0–30% reduction) ─────────────────────────
      // Lawyers with 20+ active cases get their score reduced by 30%.
      // Prevents flooding overloaded lawyers while still notifying them.
      const activeCases         = Number(row.activeCases ?? 0);
      const availabilityPenalty = Math.min(activeCases / 20, 1);

      // ── 6. Conversion boost (0–3) ─────────────────────────────────────────
      // Rewards lawyers who have actually converted community cases into procesos.
      // 1 linked proceso → +1 · 3+ → +2 · 7+ → +3
      const processesLinked  = Number((row as any).processesLinked ?? 0);
      const conversionBoost  = processesLinked >= 7 ? 3
                             : processesLinked >= 3 ? 2
                             : processesLinked >= 1 ? 1
                             : 0;

      // ── 7. Base score ─────────────────────────────────────────────────────
      const rawBase   = matchScore * 96 + qualityActivityBoost + freshnessBoost + conversionBoost;
      const baseScore = Math.round(rawBase * (1 - availabilityPenalty * 0.3));

      // ── 7. Exploration boost (ONLY for decent candidates ≥ 60) ───────────
      // Prevents bad lawyers from getting boosted into "recommended"
      // while still giving visibility to promising newcomers
      const explorationBoost = baseScore >= 60 ? Math.random() * 2 : 0;

      const score = Math.min(100, Math.round(baseScore + explorationBoost));

      candidates.push({
        lawyerId: row.lawyerId as string,
        userId:   row.userId   as string,
        cityName: row.cityName ?? null,
        score,
      });
    }

    // Sort by score DESC, cap at MAX_MATCHES
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_MATCHES);
  }
}
