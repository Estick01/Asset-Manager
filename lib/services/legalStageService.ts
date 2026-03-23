import { apiRequest } from "../apiClient";
import type {
  LegalStagesResponseDTO,
  UpdateLegalStageDTO,
} from "@/shared/schema";

const SILENT = { silent: true } as const;

/**
 * Obtiene las etapas procesales del proceso con su estado (completada/actual/futura).
 * @param tipoProceso  Nombre o código del tipo de proceso (opcional, para fallback genérico)
 * @param procesoId    ID del proceso activo (para marcar etapa actual y vencimiento)
 */
export async function getLegalStages(
  tipoProceso?: string,
  procesoId?: string,
): Promise<LegalStagesResponseDTO> {
  const params = new URLSearchParams();
  if (tipoProceso) params.set("tipoProceso", tipoProceso);
  if (procesoId)   params.set("procesoId",   procesoId);

  const res = await apiRequest("GET", `/api/legal-stages?${params.toString()}`, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener etapas procesales");
  return res.json();
}

/**
 * Avanza (o retrocede en caso de APPEAL) la etapa procesal de un proceso.
 */
export async function updateLegalStage(
  procesoId: string,
  dto: UpdateLegalStageDTO,
): Promise<void> {
  const res = await apiRequest("PATCH", `/api/procesos/${procesoId}/legal-stage`, dto, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al actualizar etapa procesal");
  }
}
