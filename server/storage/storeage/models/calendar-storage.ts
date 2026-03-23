import { eq, and, gte, lte, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  calendarEvents,
  tareas,
  procesos,
  type CalendarEvent,
  type InsertCalendarEvent,
  type CalendarEventDTO,
  type CalendarEventType,
  type CreateCalendarEventDTO,
  type UpdateCalendarEventDTO,
} from "@/shared/schema";
import type { Database } from "../database-storage";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: color por tipo de evento
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_BY_TYPE: Record<string, string> = {
  audiencia:        "#F97316",
  reunion_cliente:  "#3B82F6",
  diligencia:       "#8B5CF6",
  vencimiento:      "#EF4444",
  tarea:            "#F59E0B",
  otro:             "#6B7280",
};

function urgencyColor(diasRestantes: number, baseColor: string): string {
  if (diasRestantes < 0)  return "#EF4444"; // vencido — rojo
  if (diasRestantes <= 1) return "#EF4444"; // hoy     — rojo
  if (diasRestantes <= 3) return "#F97316"; // 3 días  — naranja
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
   * 1. Eventos manuales (calendar_events)
   * 2. Tareas con fechaLimite
   * 3. Etapas con fecha_vencimiento_etapa (procesos asignados al abogado)
   */
  async getCalendarEvents(
    lawyerProfileId: string,
    from: Date,
    to: Date,
  ): Promise<CalendarEventDTO[]> {
    const now = new Date();
    const results: CalendarEventDTO[] = [];

    // 1. Eventos manuales
    const manuales = await this.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.lawyerId, lawyerProfileId),
          eq(calendarEvents.state, 1),
          gte(calendarEvents.fechaInicio, from),
          lte(calendarEvents.fechaInicio, to),
        ),
      );

    for (const e of manuales) {
      const dias = diffDays(now, e.fechaInicio);
      const color = urgencyColor(dias, COLOR_BY_TYPE[e.tipo] ?? COLOR_BY_TYPE.otro);

      let procesoInfo = null;
      if (e.procesoId) {
        const p = await this.db.query.procesos.findFirst({
          where: eq(procesos.id, e.procesoId),
        });
        if (p) procesoInfo = { id: p.id, radicado: p.radicado ?? "", cliente: "" };
      }

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
        proceso:             procesoInfo,
        recordatorioMinutos: e.recordatorioMinutos,
      });
    }

    // 2. Tareas con fechaLimite en el rango
    const tareaRows = await this.db
      .select()
      .from(tareas)
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
      const dias = diffDays(now, t.fechaLimite);
      const color = urgencyColor(dias, COLOR_BY_TYPE.tarea);

      results.push({
        id:           `tarea-${t.id}`,
        titulo:       t.titulo,
        descripcion:  t.descripcion ?? null,
        tipo:         "tarea",
        source:       "tarea",
        fechaInicio:  t.fechaLimite,
        fechaFin:     null,
        color,
        diasRestantes: dias,
        proceso:      t.procesoId ? { id: t.procesoId, radicado: "", cliente: "" } : null,
      });
    }

    // 3. Etapas con vencimiento en el rango (procesos del abogado)
    const procesoRows = await this.db
      .select({
        id:                    procesos.id,
        radicado:              procesos.radicado,
        legalStage:            procesos.legalStage,
        fechaVencimientoEtapa: procesos.fechaVencimientoEtapa,
      })
      .from(procesos)
      .where(
        and(
          eq(procesos.state, true),
          gte(procesos.fechaVencimientoEtapa as any, from),
          lte(procesos.fechaVencimientoEtapa as any, to),
        ),
      );

    for (const p of procesoRows) {
      if (!p.fechaVencimientoEtapa) continue;
      const dias = diffDays(now, p.fechaVencimientoEtapa);
      const color = urgencyColor(dias, COLOR_BY_TYPE.vencimiento);

      results.push({
        id:           `etapa-${p.id}`,
        titulo:       `Vencimiento etapa: ${p.legalStage ?? ""}`,
        descripcion:  null,
        tipo:         "vencimiento",
        source:       "etapa",
        fechaInicio:  p.fechaVencimientoEtapa,
        fechaFin:     null,
        color,
        diasRestantes: dias,
        proceso:      { id: p.id, radicado: p.radicado ?? "", cliente: "" },
      });
    }

    // Ordenar por fecha ascendente
    return results.sort(
      (a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime(),
    );
  }

  // ── Recordatorios pendientes (usado por el cron) ───────────────────────────

  async getPendingReminders(): Promise<CalendarEvent[]> {
    const now = new Date();
    // Eventos cuyo (fecha_inicio - recordatorio_minutos) ya llegó y aún no notificado
    return this.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.notificado, 0),
          eq(calendarEvents.state, 1),
          sql`DATE_SUB(${calendarEvents.fechaInicio}, INTERVAL ${calendarEvents.recordatorioMinutos} MINUTE) <= ${now}`,
          gte(calendarEvents.fechaInicio, now),    // no notificar eventos ya pasados
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
    if (data.titulo             !== undefined) updates.titulo             = data.titulo;
    if (data.descripcion        !== undefined) updates.descripcion        = data.descripcion ?? null;
    if (data.tipo               !== undefined) updates.tipo               = data.tipo;
    if (data.fechaInicio        !== undefined) updates.fechaInicio        = new Date(data.fechaInicio);
    if (data.fechaFin           !== undefined) updates.fechaFin           = data.fechaFin ? new Date(data.fechaFin) : null;
    if (data.recordatorioMinutos !== undefined) {
      updates.recordatorioMinutos = data.recordatorioMinutos;
      updates.notificado          = 0; // resetear si cambia la hora del recordatorio
    }

    await this.db.update(calendarEvents).set(updates).where(eq(calendarEvents.id, id));
    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.db.update(calendarEvents).set({ state: 0 }).where(eq(calendarEvents.id, id));
  }
}
