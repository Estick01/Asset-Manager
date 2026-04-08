/**
 * Recommendation Storage
 * Finds and scores the best lawyers for a given post.
 *
 * Scoring (0-100):
 *   38% — specialization + city match
 *   25% — Bayesian adjusted rating
 *    8% — rating volume (caps at 50 reviews)
 *   14% — availability (active workload penalty)
 *   15% — conversion signal: % of taken cases that became a linked proceso
 */

import { sql } from "drizzle-orm";
import type { Database } from "../database-storage";

// ── Same keyword map as matching-storage ─────────────────────────────────────
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

export interface RecommendedLawyerDTO {
  lawyerProfileId: string;
  userId:          string;
  name:            string;
  specialization:  string | null;
  isVerified:      boolean;
  rating:          { avg: number; count: number };
  activeCases:     number;   // current active workload
  finalScore:      number;   // 0-100
  isFallback?:     boolean;  // shown as general recommendation when primary pool is small
}

export class RecommendationStorage {
  constructor(private db: Database) {}

  /**
   * Returns up to `limit` lawyers sorted by composite score.
   * Only returns lawyers with at least a specialization match OR an existing rating.
   */
  async getRecommendedLawyers(
    caseType: string | null,
    city:     string | null,
    limit     = 8,
  ): Promise<RecommendedLawyerDTO[]> {
    // Single query: lawyer + persona name + rating aggregate + active workload
    const rows = await this.db.execute(sql`
      SELECT
        lp.id              AS lawyerProfileId,
        lp.user_id         AS userId,
        lp.specialization,
        lp.professional_verification_status AS professionalVerificationStatus,
        TRIM(CONCAT(
          COALESCE(p.nombre,   ''),
          ' ',
          COALESCE(p.apellido, '')
        ))                 AS fullName,
        m.nombre           AS cityName,
        COALESCE(r.avgScore,    0) AS avgRating,
        COALESCE(r.ratingCount, 0) AS ratingCount,
        COALESCE(w.activeCases, 0) AS activeCases
      FROM lawyer_profiles lp
      INNER JOIN users    u ON u.id = lp.user_id AND u.is_active = 1
      INNER JOIN personas p ON p.id = lp.persona_id
      LEFT  JOIN municipios m ON m.id = p.municipio_id
      LEFT  JOIN (
        SELECT
          target_user_id,
          AVG(score)  AS avgScore,
          COUNT(*)    AS ratingCount
        FROM ratings
        WHERE target_type = 'lawyer'
        GROUP BY target_user_id
      ) r ON r.target_user_id = lp.user_id
      LEFT  JOIN (
        SELECT
          pl.lawyer_id,
          COUNT(*) AS activeCases
        FROM proceso_lawyers pl
        INNER JOIN procesos       proc ON proc.id       = pl.proceso_id
        INNER JOIN estados_proceso ep  ON ep.id         = proc.estado_id
        WHERE pl.status = 'activo'
          AND ep.codigo != 'finalizado'
        GROUP BY pl.lawyer_id
      ) w ON w.lawyer_id = lp.id
      LEFT  JOIN (
        -- Conversion signal: cases the lawyer took from the community
        -- that were accepted by the client AND ended up linked to a proceso
        SELECT
          taken_by_user_id,
          COUNT(*)                                                         AS casesTaken,
          SUM(CASE WHEN proceso_id IS NOT NULL THEN 1 ELSE 0 END)         AS processesLinked
        FROM posts
        WHERE taken_by_user_id IS NOT NULL
          AND client_accepted = 1
        GROUP BY taken_by_user_id
      ) conv ON conv.taken_by_user_id = lp.user_id
      WHERE lp.professional_verification_status = 'verificado'
    `);

    const lawyers = ((rows as any[])[0] ?? []) as any[];

    const keywords   = caseType ? (CASE_KEYWORDS[caseType] ?? []) : [];
    const cityNorm   = city?.toLowerCase().trim() ?? null;

    const scored: RecommendedLawyerDTO[] = [];

    // ── Global average for Bayesian smoothing ─────────────────────────────
    const GLOBAL_AVG_RATING = 4.0;  // assumed platform average
    const BAYESIAN_MIN_VOTES = 10;  // confidence weight

    for (const row of lawyers) {
      const spec        = (row.specialization as string | null)?.toLowerCase().trim() ?? "";
      const specMatch   = keywords.length > 0 && keywords.some(kw => spec.includes(kw));
      const cityMatch   = !!(cityNorm && (row.cityName as string | null)?.toLowerCase().trim() === cityNorm);
      const rawRating   = Number(row.avgRating);
      const ratingCount = Number(row.ratingCount);
      const activeCases = Number(row.activeCases);
      const casesTaken      = Number(row.casesTaken      ?? 0);
      const processesLinked = Number(row.processesLinked ?? 0);

      // Skip lawyers with no relevance at all
      if (!specMatch && ratingCount === 0 && processesLinked === 0) continue;

      // ── 1. Match score (0–1, granular) ──────────────────────────────────
      // specialty = 0.7 of the match weight, city = 0.3
      const matchScore = (specMatch ? 0.7 : 0) + (cityMatch ? 0.3 : 0);

      // ── 2. Bayesian adjusted rating (0–1) ───────────────────────────────
      // Shrinks high ratings from few votes toward the global average.
      // Formula: (raw * count + globalAvg * weight) / (count + weight)
      const adjustedRating =
        (rawRating * ratingCount + GLOBAL_AVG_RATING * BAYESIAN_MIN_VOTES) /
        (ratingCount + BAYESIAN_MIN_VOTES);
      const ratingScore = adjustedRating / 5;

      // ── 3. Volume score (0–1, caps at 50 reviews) ───────────────────────
      const volumeScore = Math.min(ratingCount / 50, 1);

      // ── 4. Availability (0–1, smooth linear decay) ──────────────────────
      // 0 cases → 1.0 · 7 cases → 0.53 · 15+ cases → 0.0
      const availabilityScore = Math.max(0, 1 - activeCases / 15);

      // ── 5. Conversion signal (0–1) ───────────────────────────────────────
      // Rate of taken+accepted community cases that resulted in a linked proceso.
      // A lawyer who consistently converts shows commitment and trustworthiness.
      // casesTaken=0 → 0 (no community history yet)
      // processesLinked/casesTaken → conversion rate, capped at 1.0
      const conversionRate  = casesTaken > 0 ? Math.min(processesLinked / casesTaken, 1) : 0;
      // Scale: pure rate is too harsh for new lawyers — blend with a volume nudge
      // so even 1 linked proceso gives a small boost (ln(2)/ln(11) ≈ 0.29)
      const volumeNudge     = processesLinked > 0 ? Math.log(processesLinked + 1) / Math.log(11) : 0;
      const conversionScore = conversionRate * 0.7 + volumeNudge * 0.3;

      // ── Final composite score (0–100) ────────────────────────────────────
      // 38% match · 25% adjusted rating · 8% volume · 14% availability · 15% conversion
      const finalScore = Math.round(
        matchScore        * 38 +
        ratingScore       * 25 +
        volumeScore       *  8 +
        availabilityScore * 14 +
        conversionScore   * 15,
      );

      scored.push({
        lawyerProfileId: row.lawyerProfileId as string,
        userId:          row.userId           as string,
        name:            (row.fullName as string) || "Abogado",
        specialization:  (row.specialization as string | null) ?? null,
        isVerified:      row.professionalVerificationStatus === "verificado",
        rating:          { avg: rawRating, count: ratingCount },
        activeCases,
        finalScore,
      });
    }

    // ── Fallback tier ─────────────────────────────────────────────────────────
    // If primary results are scarce (< 3), fill the carousel with the
    // best-available lawyers ignoring specialty/city match.
    // They are marked isFallback=true so the UI can label them differently.
    const MIN_PRIMARY = 3;
    if (scored.length < MIN_PRIMARY) {
      const primaryIds = new Set(scored.map(s => s.lawyerProfileId));

      // Re-score excluded lawyers using only rating + availability (no match/conversion)
      const fallback: RecommendedLawyerDTO[] = [];
      for (const row of lawyers) {
        if (primaryIds.has(row.lawyerProfileId as string)) continue;

        const activeCases        = Number(row.activeCases);
        const rawRating          = Number(row.avgRating);
        const ratingCount        = Number(row.ratingCount);
        const availabilityScore  = Math.max(0, 1 - activeCases / 15);
        const adjustedRating     =
          (rawRating * ratingCount + GLOBAL_AVG_RATING * BAYESIAN_MIN_VOTES) /
          (ratingCount + BAYESIAN_MIN_VOTES);
        const ratingScore        = adjustedRating / 5;
        const volumeScore        = Math.min(ratingCount / 50, 1);
        const fallbackScore      = Math.round(
          ratingScore       * 25 +
          volumeScore       *  8 +
          availabilityScore * 14,
        );

        fallback.push({
          lawyerProfileId: row.lawyerProfileId as string,
          userId:          row.userId           as string,
          name:            (row.fullName as string) || "Abogado",
          specialization:  (row.specialization as string | null) ?? null,
          isVerified:      row.professionalVerificationStatus === "verificado",
          rating:          { avg: rawRating, count: ratingCount },
          activeCases,
          finalScore:      fallbackScore,
          isFallback:      true,
        });
      }

      // Append best fallback lawyers up to the requested limit
      fallback.sort((a, b) => b.finalScore - a.finalScore);
      scored.push(...fallback.slice(0, limit - scored.length));
    }

    return scored
      .sort((a, b) => b.finalScore - a.finalScore || b.rating.avg - a.rating.avg)
      .slice(0, limit);
  }
}
