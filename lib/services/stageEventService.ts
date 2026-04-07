import { apiRequest } from "../apiClient";
import type { StageEventResponseDTO } from "@/shared/schema";

const SILENT = { silent: true } as const;

/**
 * Obtiene todos los eventos de etapa de un proceso paginados.
 * Descarga hasta `maxItems` eventos en lotes para no traer cientos de registros de golpe.
 */
export async function getAllStageEvents(
  procesoId: string,
  maxItems = 200,
): Promise<StageEventResponseDTO[]> {
  const PAGE = 50;
  const collected: StageEventResponseDTO[] = [];
  let offset = 0;

  while (collected.length < maxItems) {
    const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    const res = await apiRequest("GET", `/api/procesos/${procesoId}/stage-events?${params}`, undefined, SILENT);
    if (!res.ok) break;
    const { data, total } = await res.json() as { data: StageEventResponseDTO[]; total: number };
    collected.push(...data);
    offset += data.length;
    if (offset >= total || data.length < PAGE) break;
  }
  return collected;
}

/**
 * Obtiene los eventos de una etapa procesal específica (paginados).
 */
export async function getStageEvents(
  procesoId: string,
  stage: string,
  limit = 50,
  offset = 0,
): Promise<StageEventResponseDTO[]> {
  const params = new URLSearchParams({ stage, limit: String(limit), offset: String(offset) });
  const res = await apiRequest("GET", `/api/procesos/${procesoId}/stage-events?${params}`, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener eventos de la etapa");
  const { data } = await res.json() as { data: StageEventResponseDTO[]; total: number };
  return data;
}

/**
 * Agrega una nota (evento tipo "nota") a una etapa procesal.
 * @param procesoId       ID del proceso
 * @param legalStageCode  Código de la etapa legal
 * @param descripcion     Contenido de la nota
 */
export async function addStageNote(
  procesoId: string,
  legalStageCode: string,
  descripcion: string,
): Promise<StageEventResponseDTO> {
  const res = await apiRequest(
    "POST",
    `/api/procesos/${procesoId}/stage-events`,
    {
      legalStageCode,
      descripcion,
    },
    SILENT,
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al agregar nota");
  }
  return res.json();
}
