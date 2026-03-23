import { eq, and, or, lt, desc, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  tareas,
  type Tarea,
  type InsertTarea,
  type TareaEstado,
  type TareaResponseDTO,
  type MisTareasDTO,
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

  console.log(t.asignadoA)
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

  // ── Find ───────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<TareaResponseDTO | undefined> {
    const row = await this.db.query.tareas.findFirst({
      where: eq(tareas.id, id),
    });
    return row ? toDTO(row) : undefined;
  }

  async findRawById(id: string): Promise<Tarea | undefined> {
    return this.db.query.tareas.findFirst({ where: eq(tareas.id, id) });
  }

  async findByProceso(procesoId: string): Promise<TareaResponseDTO[]> {
    const rows = await this.db
      .select()
      .from(tareas)
      .where(and(eq(tareas.procesoId, procesoId), eq(tareas.state, true)))
      .orderBy(desc(tareas.orden), desc(tareas.createdAt));
    return rows.map(toDTO);
  }

  /** Tareas de un abogado en todos sus procesos, agrupadas por estado */
  async findByLawyer(lawyerProfileId: string): Promise<MisTareasDTO> {
    const now = new Date();

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

    const dtos = rows.map(toDTO);

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
    data: Partial<Pick<InsertTarea, "titulo" | "descripcion" | "prioridad" | "fechaLimite" | "asignadoA" | "asignadoANombre" | "orden">>,
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

  // ── Delete (soft) ──────────────────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    await this.db.update(tareas).set({ state: false }).where(eq(tareas.id, id));
  }
}
