import { eq, and, gte, lte, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  calendarEvents,
  tareas,
  procesos,
  clientes,
  users,
  type CalendarEvent,
  type InsertCalendarEvent,
  type CalendarEventDTO,
  type CalendarEventType,
  type CreateCalendarEventDTO,
  type UpdateCalendarEventDTO,
} from "@/shared/schema";
import type { Database } from "../database-storage";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_BY_TYPE: Record<string, string> = {
  audiencia:        "#F97316",
  reunion_cliente:  "#3B82F6",
  diligencia:       "#8B5CF6",
  vencimiento:      "#EF4444",
  tarea:            "#F59E0B",
  otro:             "#6B7280",
};

/** Nombre legible de una etapa procesal */
const STAGE_LABELS: Record<string, string> = {
  PREPROCESS:        "Etapa preprocesal",
  FILED:             "Demanda presentada",
  ADMITTED:          "Demanda admitida",
  NOTIFIED:          "Demandado notificado",
  ANSWERED:          "Contestación de demanda",
  EVIDENCE:          "Etapa probatoria",
  HEARING:           "Audiencias",
  CLOSING_ARGUMENTS: "Alegatos finales",
  JUDGMENT:          "Sentencia",
  APPEAL:            "Apelación",
  ENFORCEMENT:       "Ejecución de sentencia",
};

function urgencyColor(diasRestantes: number, baseColor: string): string {
  if (diasRestantes < 0)  return "#EF4444"; // vencido
  if (diasRestantes <= 1) return "#EF4444"; // hoy
  if (diasRestantes <= 3) return "#F97316"; // próximos 3 días
  return baseColor;
}

function diffDays(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class CalendarStorage {
  constructor(private db: Database) {}

  // ── Agregador principal ────────────────────────────────────────────────────

  /**
   * Devuelve todos los eventos del abogado en el rango [from, to]:
   * 1. Eventos manuales (calendar_events) con proceso + cliente via JOIN
   * 2. Tareas con fechaLimite — enriquecidas con radicado + cliente
   * 3. Etapas con fecha_vencimiento_etapa — enriquecidas con radicado + cliente
   */
  async getCalendarEvents(
    lawyerProfileId: string,
    from: Date,
    to: Date,
  ): Promise<CalendarEventDTO[]> {
    const now = new Date();
    const results: CalendarEventDTO[] = [];

    // ── 1. Eventos manuales (con JOIN a proceso → cliente → user) ──────────

    const manuales = await this.db
      .select({
        event:         calendarEvents,
        radicado:      procesos.radicado,
        clienteNombre: users.name,
      })
      .from(calendarEvents)
      .leftJoin(procesos, eq(calendarEvents.procesoId, procesos.id))
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(users, eq(clientes.userId, users.id))
      .where(
        and(
          eq(calendarEvents.lawyerId, lawyerProfileId),
          eq(calendarEvents.state, 1),
          gte(calendarEvents.fechaInicio, from),
          lte(calendarEvents.fechaInicio, to),
        ),
      );

    for (const row of manuales) {
      const e    = row.event;
      const dias = diffDays(now, e.fechaInicio);
      const color = urgencyColor(dias, COLOR_BY_TYPE[e.tipo] ?? COLOR_BY_TYPE.otro);

      results.push({
        id:                  e.id,
        titulo:              e.titulo,
        descripcion:         e.descripcion ?? null,
        tipo:                e.tipo as CalendarEventType,
        source:              "manual",
        fechaInicio:         e.fechaInicio,
        fechaFin:            e.fechaFin ?? null,
        color,
        diasRestantes:       dias,
        proceso:             e.procesoId
          ? { id: e.procesoId, radicado: row.radicado ?? "", cliente: row.clienteNombre ?? "" }
          : null,
        recordatorioMinutos: e.recordatorioMinutos,
      });
    }

    // ── 2. Tareas con fechaLimite (con JOIN a proceso → cliente → user) ────

    const tareaRows = await this.db
      .select({
        id:            tareas.id,
        titulo:        tareas.titulo,
        descripcion:   tareas.descripcion,
        fechaLimite:   tareas.fechaLimite,
        procesoId:     tareas.procesoId,
        radicado:      procesos.radicado,
        clienteNombre: users.name,
      })
      .from(tareas)
      .leftJoin(procesos, eq(tareas.procesoId, procesos.id))
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(users, eq(clientes.userId, users.id))
      .where(
        and(
          eq(tareas.asignadoA, lawyerProfileId),
          eq(tareas.state, true),
          gte(tareas.fechaLimite, from as any),
          lte(tareas.fechaLimite, to as any),
        ),
      );

    for (const t of tareaRows) {
      if (!t.fechaLimite) continue;
      const dias  = diffDays(now, t.fechaLimite);
      const color = urgencyColor(dias, COLOR_BY_TYPE.tarea);

      results.push({
        id:            `tarea-${t.id}`,
        titulo:        t.titulo,
        descripcion:   t.descripcion ?? null,
        tipo:          "tarea",
        source:        "tarea",
        fechaInicio:   t.fechaLimite,
        fechaFin:      null,
        color,
        diasRestantes: dias,
        proceso:       t.procesoId
          ? { id: t.procesoId, radicado: t.radicado ?? "", cliente: t.clienteNombre ?? "" }
          : null,
      });
    }

    // ── 3. Etapas con vencimiento (con JOIN a cliente → user) ──────────────

    const procesoRows = await this.db
      .select({
        id:                    procesos.id,
        radicado:              procesos.radicado,
        legalStage:            procesos.legalStage,
        fechaVencimientoEtapa: procesos.fechaVencimientoEtapa,
        clienteNombre:         users.name,
      })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(users, eq(clientes.userId, users.id))
      .where(
        and(
          eq(procesos.state, true),
          gte(procesos.fechaVencimientoEtapa as any, from),
          lte(procesos.fechaVencimientoEtapa as any, to),
        ),
      );

    for (const p of procesoRows) {
      if (!p.fechaVencimientoEtapa) continue;
      const dias  = diffDays(now, p.fechaVencimientoEtapa);
      const color = urgencyColor(dias, COLOR_BY_TYPE.vencimiento);
      const stageLabel = p.legalStage
        ? (STAGE_LABELS[p.legalStage] ?? p.legalStage)
        : "Sin especificar";

      results.push({
        id:            `etapa-${p.id}`,
        titulo:        `Vencimiento: ${stageLabel}`,
        descripcion:   null,
        tipo:          "vencimiento",
        source:        "etapa",
        fechaInicio:   p.fechaVencimientoEtapa,
        fechaFin:      null,
        color,
        diasRestantes: dias,
        proceso:       { id: p.id, radicado: p.radicado ?? "", cliente: p.clienteNombre ?? "" },
      });
    }

    // Ordenar por fecha ascendente
    return results.sort(
      (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime(),
    );
  }

  // ── Recordatorios pendientes (usado por el cron) ───────────────────────────

  async getPendingReminders(): Promise<CalendarEvent[]> {
    const now = new Date();
    return this.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.notificado, 0),
          eq(calendarEvents.state, 1),
          sql`DATE_SUB(${calendarEvents.fechaInicio}, INTERVAL ${calendarEvents.recordatorioMinutos} MINUTE) <= ${now}`,
          gte(calendarEvents.fechaInicio, now),
        ),
      );
  }

  async markNotificado(id: string): Promise<void> {
    await this.db
      .update(calendarEvents)
      .set({ notificado: 1 })
      .where(eq(calendarEvents.id, id));
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(lawyerProfileId: string, data: CreateCalendarEventDTO): Promise<CalendarEvent> {
    const id = randomUUID();
    const row: InsertCalendarEvent = {
      id,
      lawyerId:            lawyerProfileId,
      procesoId:           data.procesoId ?? null,
      titulo:              data.titulo,
      descripcion:         data.descripcion ?? null,
      tipo:                data.tipo,
      fechaInicio:         new Date(data.fechaInicio),
      fechaFin:            data.fechaFin ? new Date(data.fechaFin) : null,
      recordatorioMinutos: data.recordatorioMinutos ?? 1440,
      notificado:          0,
      state:               1,
    };
    await this.db.insert(calendarEvents).values(row);
    return (await this.findById(id))!;
  }

  async findById(id: string): Promise<CalendarEvent | undefined> {
    return this.db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, id),
    });
  }

  async update(id: string, data: UpdateCalendarEventDTO): Promise<CalendarEvent | undefined> {
    const updates: Partial<InsertCalendarEvent> = {};
    if (data.titulo              !== undefined) updates.titulo              = data.titulo;
    if (data.descripcion         !== undefined) updates.descripcion         = data.descripcion ?? null;
    if (data.tipo                !== undefined) updates.tipo                = data.tipo;
    if (data.fechaInicio         !== undefined) updates.fechaInicio         = new Date(data.fechaInicio);
    if (data.fechaFin            !== undefined) updates.fechaFin            = data.fechaFin ? new Date(data.fechaFin) : null;
    if (data.recordatorioMinutos !== undefined) {
      updates.recordatorioMinutos = data.recordatorioMinutos;
      updates.notificado          = 0; // resetear si cambia la hora
    }
    await this.db.update(calendarEvents).set(updates).where(eq(calendarEvents.id, id));
    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.db.update(calendarEvents).set({ state: 0 }).where(eq(calendarEvents.id, id));
  }
}
