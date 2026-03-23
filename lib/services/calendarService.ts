import { apiRequest } from "../apiClient";
import type {
  CalendarEventDTO,
  CreateCalendarEventDTO,
  UpdateCalendarEventDTO,
} from "@/shared/schema";

const SILENT = { silent: true } as const;

/**
 * Obtiene todos los eventos del calendario del abogado en un rango de fechas.
 * Agrega 3 fuentes: eventos manuales + tareas con vencimiento + etapas procesales.
 */
export async function getCalendarEvents(
  from?: Date,
  to?: Date,
): Promise<CalendarEventDTO[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from.toISOString());
  if (to)   params.set("to",   to.toISOString());

  const res = await apiRequest("GET", `/api/calendar?${params.toString()}`, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener eventos del calendario");
  return res.json();
}

/**
 * Crea un evento manual en el calendario del abogado.
 */
export async function createCalendarEvent(
  dto: CreateCalendarEventDTO,
): Promise<CalendarEventDTO> {
  const res = await apiRequest("POST", "/api/calendar", dto, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al crear evento");
  }
  return res.json();
}

/**
 * Edita un evento manual existente.
 */
export async function updateCalendarEvent(
  id: string,
  dto: UpdateCalendarEventDTO,
): Promise<CalendarEventDTO> {
  const res = await apiRequest("PUT", `/api/calendar/${id}`, dto, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al actualizar evento");
  }
  return res.json();
}

/**
 * Elimina (soft delete) un evento manual.
 */
export async function deleteCalendarEvent(id: string): Promise<void> {
  const res = await apiRequest("DELETE", `/api/calendar/${id}`, undefined, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al eliminar evento");
  }
}
