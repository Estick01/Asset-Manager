import { apiRequest } from "../apiClient";
import type { StageEventResponseDTO } from "@/shared/schema";

const SILENT = { silent: true } as const;

/**
 * Obtiene los eventos de una etapa procesal específica.
 * @param procesoId  ID del proceso
 * @param stage      Código de la etapa legal (ej: "demand", "answer", etc.)
 */
export async function getStageEvents(
  procesoId: string,
  stage: string,
): Promise<StageEventResponseDTO[]> {
  const params = new URLSearchParams();
  params.set("stage", stage);

  const res = await apiRequest(
    "GET",
    `/api/procesos/${procesoId}/stage-events?${params.toString()}`,
    undefined,
    SILENT,
  );
  if (!res.ok) throw new Error("Error al obtener eventos de la etapa");
  return res.json();
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
