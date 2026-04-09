import { eq, and, desc, sql, inArray, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  tareas,
  tareaSubtareas,
  tareaObservaciones,
  tareaArchivos,
  type Tarea,
  type InsertTarea,
  type TareaEstado,
  type TareaResponseDTO,
  type MisTareasDTO,
  type TiempoUnidad,
} from "@/shared/schema";
import type { Database } from "../database-storage";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: raw row → TareaResponseDTO
// ─────────────────────────────────────────────────────────────────────────────

function toDTO(t: Tarea): TareaResponseDTO {
  const now = new Date();
  const vencida =
    t.estado !== "completada" &&
    t.estado !== "cancelada" &&
    t.fechaLimite !== null &&
    t.fechaLimite < now;

  return {
    id: t.id,
    procesoId: t.procesoId,
    legalStage: t.legalStage ?? null,
    requerida: t.requerida === 1,
    titulo: t.titulo,
    descripcion: t.descripcion ?? null,
    estado: t.estado as TareaEstado,
    prioridad: t.prioridad as any,
    fechaLimite: t.fechaLimite ?? null,
    fechaCompletada: t.fechaCompletada ?? null,
    asignado: t.asignadoA
      ? { id: t.asignadoA, nombre: t.asignadoANombre ?? "" }
      : null,
    creadoPor: { id: t.creadoPor, nombre: t.creadoPorNombre ?? "" },
    orden: t.orden,
    vencida,
    tiempoEstimado: t.tiempoEstimado != null ? parseFloat(String(t.tiempoEstimado)) : null,
    tiempoUnidad:   t.tiempoUnidad as TiempoUnidad | null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class TareaStorage {
  constructor(private db: Database) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(data: Omit<InsertTarea, "id" | "createdAt" | "updatedAt">): Promise<TareaResponseDTO> {
    const id = randomUUID();
    const row: InsertTarea = {
      ...data,
      id,
      estado: data.estado ?? "pendiente",
      prioridad: data.prioridad ?? "media",
      orden: data.orden ?? 0,
      state: true,
    };
    await this.db.insert(tareas).values(row);
    const created = await this.findById(id);
    return created!;
  }

  // ── Enrich helpers ─────────────────────────────────────────────────────────

  /** Batch-fetches subtarea/observacion/archivo counts for a list of DTOs (3 queries total). */
  private async enrichWithCounts(dtos: TareaResponseDTO[]): Promise<TareaResponseDTO[]> {
    if (dtos.length === 0) return dtos;
    const ids = dtos.map(d => d.id);

    const [subRows, obsRows, arcRows] = await Promise.all([
      this.db
        .select({ tareaId: tareaSubtareas.tareaId, total: count(), completadas: sql<number>`SUM(CASE WHEN ${tareaSubtareas.estado} = 'completada' THEN 1 ELSE 0 END)` })
        .from(tareaSubtareas)
        .where(inArray(tareaSubtareas.tareaId, ids))
        .groupBy(tareaSubtareas.tareaId),
      this.db
        .select({ tareaId: tareaObservaciones.tareaId, total: count() })
        .from(tareaObservaciones)
        .where(inArray(tareaObservaciones.tareaId, ids))
        .groupBy(tareaObservaciones.tareaId),
      this.db
        .select({ tareaId: tareaArchivos.tareaId, total: count() })
        .from(tareaArchivos)
        .where(inArray(tareaArchivos.tareaId, ids))
        .groupBy(tareaArchivos.tareaId),
    ]);

    const subMap  = new Map(subRows.map(r => [r.tareaId, { total: Number(r.total), completadas: Number(r.completadas ?? 0) }]));
    const obsMap  = new Map(obsRows.map(r => [r.tareaId, Number(r.total)]));
    const arcMap  = new Map(arcRows.map(r => [r.tareaId, Number(r.total)]));

    return dtos.map(d => ({
      ...d,
      subtareasTotal:       subMap.get(d.id)?.total ?? 0,
      subtareasCompletadas: subMap.get(d.id)?.completadas ?? 0,
      observacionesTotal:   obsMap.get(d.id) ?? 0,
      archivosTotal:        arcMap.get(d.id) ?? 0,
    }));
  }

  // ── Find ───────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<TareaResponseDTO | undefined> {
    const row = await this.db.query.tareas.findFirst({
      where: eq(tareas.id, id),
    });
    if (!row) return undefined;
    const [enriched] = await this.enrichWithCounts([toDTO(row)]);
    return enriched;
  }

  async findRawById(id: string): Promise<Tarea | undefined> {
    return this.db.query.tareas.findFirst({ where: eq(tareas.id, id) });
  }

  async findByProceso(procesoId: string, stage?: string): Promise<TareaResponseDTO[]> {
    const conditions = [eq(tareas.procesoId, procesoId), eq(tareas.state, true)];
    if (stage !== undefined) {
      conditions.push(eq(tareas.legalStage, stage));
    }
    const rows = await this.db
      .select()
      .from(tareas)
      .where(and(...conditions))
      .orderBy(desc(tareas.orden), desc(tareas.createdAt));
    return this.enrichWithCounts(rows.map(toDTO));
  }

  /** Tareas de un abogado en todos sus procesos, agrupadas por estado */
  async findByLawyer(lawyerProfileId: string): Promise<MisTareasDTO> {
    const rows = await this.db
      .select()
      .from(tareas)
      .where(
        and(
          eq(tareas.asignadoA, lawyerProfileId),
          eq(tareas.state, true),
        ),
      )
      .orderBy(tareas.fechaLimite, desc(tareas.createdAt));

    const dtos = await this.enrichWithCounts(rows.map(toDTO));

    const pendientes: TareaResponseDTO[] = [];
    const en_progreso: TareaResponseDTO[] = [];
    const vencidas: TareaResponseDTO[] = [];
    const completadas: TareaResponseDTO[] = [];

    for (const t of dtos) {
      if (t.estado === "completada" || t.estado === "cancelada") {
        completadas.push(t);
      } else if (t.vencida) {
        vencidas.push(t);
      } else if (t.estado === "en_progreso") {
        en_progreso.push(t);
      } else {
        pendientes.push(t);
      }
    }

    return { pendientes, en_progreso, vencidas, completadas };
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(
    id: string,
    data: Partial<Pick<InsertTarea, "titulo" | "descripcion" | "prioridad" | "fechaLimite" | "asignadoA" | "asignadoANombre" | "orden" | "tiempoEstimado" | "tiempoUnidad">>,
  ): Promise<TareaResponseDTO | undefined> {
    await this.db.update(tareas).set(data).where(eq(tareas.id, id));
    return this.findById(id);
  }

  async updateEstado(
    id: string,
    estado: TareaEstado,
    fechaCompletada?: Date | null,
  ): Promise<TareaResponseDTO | undefined> {
    await this.db
      .update(tareas)
      .set({
        estado,
        ...(fechaCompletada !== undefined ? { fechaCompletada } : {}),
      })
      .where(eq(tareas.id, id));
    return this.findById(id);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  async countByLawyer(lawyerProfileId: string): Promise<{
    total: number;
    pendientes: number;
    en_progreso: number;
    completadas: number;
  }> {
    const rows = await this.db
      .select({
        total: sql<number>`COUNT(*)`,
        pendientes: sql<number>`SUM(CASE WHEN ${tareas.estado} = 'pendiente' THEN 1 ELSE 0 END)`,
        en_progreso: sql<number>`SUM(CASE WHEN ${tareas.estado} = 'en_progreso' THEN 1 ELSE 0 END)`,
        completadas: sql<number>`SUM(CASE WHEN ${tareas.estado} = 'completada' THEN 1 ELSE 0 END)`,
      })
      .from(tareas)
      .where(and(eq(tareas.asignadoA, lawyerProfileId), eq(tareas.state, true)));

    return {
      total: Number(rows[0]?.total ?? 0),
      pendientes: Number(rows[0]?.pendientes ?? 0),
      en_progreso: Number(rows[0]?.en_progreso ?? 0),
      completadas: Number(rows[0]?.completadas ?? 0),
    };
  }

  /** Conteos por proceso — una sola query para múltiples IDs */
  async countByProcesoIds(procesoIds: string[]): Promise<Map<string, {
    total: number; pendientes: number; en_progreso: number; completadas: number;
  }>> {
    const map = new Map<string, { total: number; pendientes: number; en_progreso: number; completadas: number }>();
    if (procesoIds.length === 0) return map;

    const rows = await this.db
      .select({
        procesoId: tareas.procesoId,
        total: sql<number>`COUNT(*)`,
        pendientes: sql<number>`SUM(CASE WHEN ${tareas.estado} = 'pendiente' THEN 1 ELSE 0 END)`,
        en_progreso: sql<number>`SUM(CASE WHEN ${tareas.estado} = 'en_progreso' THEN 1 ELSE 0 END)`,
        completadas: sql<number>`SUM(CASE WHEN ${tareas.estado} = 'completada' THEN 1 ELSE 0 END)`,
      })
      .from(tareas)
      .where(and(inArray(tareas.procesoId, procesoIds), eq(tareas.state, true)))
      .groupBy(tareas.procesoId);

    for (const row of rows) {
      map.set(row.procesoId, {
        total: Number(row.total),
        pendientes: Number(row.pendientes ?? 0),
        en_progreso: Number(row.en_progreso ?? 0),
        completadas: Number(row.completadas ?? 0),
      });
    }
    return map;
  }

  // ── Gate: tareas requeridas pendientes en una etapa ───────────────────────

  async getRequiredPendingByStage(
    procesoId: string,
    legalStage: string,
  ): Promise<Tarea[]> {
    return this.db
      .select()
      .from(tareas)
      .where(
        and(
          eq(tareas.procesoId,  procesoId),
          eq(tareas.legalStage, legalStage),
          eq(tareas.requerida,  1),
          inArray(tareas.estado, ["pendiente", "en_progreso"]),
        ),
      );
  }

  // ── Get raw by id ──────────────────────────────────────────────────────────

  async getById(id: string): Promise<Tarea | null> {
    const [row] = await this.db.select().from(tareas).where(eq(tareas.id, id));
    return row ?? null;
  }

  // ── Delete (soft) ──────────────────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    await this.db.update(tareas).set({ state: false }).where(eq(tareas.id, id));
  }
}
