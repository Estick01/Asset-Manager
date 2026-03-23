import { randomUUID } from "crypto";
import { and, avg, count, eq, sql } from "drizzle-orm";
import {
  ratings,
  type Rating,
  type InsertRating,
  type RatingDTO,
  type RatingSummary,
  type RatingTargetType,
} from "@/shared/schema";
import { users } from "@/shared/schema/user.schema";
import { clientes } from "@/shared/schema/cliente.schema";
import { lawyerProfiles } from "@/shared/schema/lawyer-profile.schema";
import { firmProfiles } from "@/shared/schema/firm-profile.schema";
import { procesos } from "@/shared/schema/proceso.schema";
import { procesoLawyers } from "@/shared/schema/proceso-lawyer.schema";
import { estadosProceso } from "@/shared/schema/estado-proceso.schema";
import type { Database } from "../database-storage";

export class RatingStorage {
  constructor(private db: Database) {}

  async createRating(data: Omit<InsertRating, "id">): Promise<Rating> {
    const id = randomUUID();
    await this.db.insert(ratings).values({ id, ...data });
    const result = await this.db
      .select()
      .from(ratings)
      .where(eq(ratings.id, id))
      .limit(1);
    return result[0]!;
  }

  async getRating(fromUserId: string, targetUserId: string, targetType: RatingTargetType): Promise<Rating | undefined> {
    const result = await this.db
      .select()
      .from(ratings)
      .where(
        and(
          eq(ratings.fromUserId, fromUserId),
          eq(ratings.targetUserId, targetUserId),
          eq(ratings.targetType, targetType)
        )
      )
      .limit(1);
    return result[0];
  }

  async getRatings(targetUserId: string, targetType: RatingTargetType): Promise<RatingDTO[]> {
    const rows = await this.db
      .select({
        id:           ratings.id,
        fromUserId:   ratings.fromUserId,
        targetUserId: ratings.targetUserId,
        targetType:   ratings.targetType,
        score:        ratings.score,
        comment:      ratings.comment,
        procesoId:    ratings.procesoId,
        createdAt:    ratings.createdAt,
        fromName:     users.name,
      })
      .from(ratings)
      .leftJoin(users, eq(ratings.fromUserId, users.id))
      .where(
        and(
          eq(ratings.targetUserId, targetUserId),
          eq(ratings.targetType, targetType)
        )
      )
      .orderBy(sql`${ratings.createdAt} DESC`);

    return rows.map((r) => ({
      id:           r.id,
      fromUserId:   r.fromUserId,
      targetUserId: r.targetUserId,
      targetType:   r.targetType as RatingTargetType,
      score:        r.score,
      comment:      r.comment ?? null,
      procesoId:    r.procesoId,
      createdAt:    r.createdAt,
      fromUser:     { id: r.fromUserId, name: r.fromName ?? "Usuario" },
    }));
  }

  async getRatingSummary(targetUserId: string, targetType: RatingTargetType): Promise<RatingSummary> {
    const result = await this.db
      .select({
        avg:   avg(ratings.score),
        count: count(),
      })
      .from(ratings)
      .where(
        and(
          eq(ratings.targetUserId, targetUserId),
          eq(ratings.targetType, targetType)
        )
      );

    return {
      avg:   Number(result[0]?.avg ?? 0),
      count: Number(result[0]?.count ?? 0),
    };
  }

  /**
   * Checks whether a client (identified by their userId) is allowed to rate
   * a target. The rule: client must have at least one completed proceso
   * involving the target lawyer/firm.
   *
   * "Finalizado" is identified by estado_proceso.codigo = 'finalizado'.
   */
  /** Returns the first completed procesoId linking fromUser to the target, or null */
  async findQualifyingProceso(
    fromUserId:   string,
    targetUserId: string,
    targetType:   RatingTargetType
  ): Promise<string | null> {
    if (targetType === "lawyer") {
      const rows = await this.db
        .select({ id: procesos.id })
        .from(procesos)
        .innerJoin(clientes,       eq(procesos.clienteId,      clientes.id))
        .innerJoin(procesoLawyers, eq(procesoLawyers.procesoId, procesos.id))
        .innerJoin(lawyerProfiles, eq(procesoLawyers.lawyerId,  lawyerProfiles.id))
        .innerJoin(estadosProceso, eq(procesos.estadoId,        estadosProceso.id))
        .where(and(
          eq(clientes.userId,       fromUserId),
          eq(lawyerProfiles.userId, targetUserId),
          eq(estadosProceso.codigo, "finalizado")
        ))
        .limit(1);
      return rows[0]?.id ?? null;
    }

    const rows = await this.db
      .select({ id: procesos.id })
      .from(procesos)
      .innerJoin(clientes,       eq(procesos.clienteId,       clientes.id))
      .innerJoin(procesoLawyers, eq(procesoLawyers.procesoId,  procesos.id))
      .innerJoin(lawyerProfiles, eq(procesoLawyers.lawyerId,   lawyerProfiles.id))
      .innerJoin(firmProfiles,   eq(lawyerProfiles.firmId,     firmProfiles.id))
      .innerJoin(estadosProceso, eq(procesos.estadoId,         estadosProceso.id))
      .where(and(
        eq(clientes.userId,       fromUserId),
        eq(firmProfiles.userId,   targetUserId),
        eq(estadosProceso.codigo, "finalizado")
      ))
      .limit(1);
    return rows[0]?.id ?? null;
  }

  async canClientRate(
    fromUserId:   string,
    targetUserId: string,
    targetType:   RatingTargetType
  ): Promise<boolean> {
    const procesoId = await this.findQualifyingProceso(fromUserId, targetUserId, targetType);
    return procesoId !== null;
  }
}
