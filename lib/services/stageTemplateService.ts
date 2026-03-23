import { apiRequest } from "../apiClient";
import type {
  CreateTemplateDTO,
  TemplateResponseDTO,
  UpdateTemplateDTO,
} from "@/shared/schema";

const SILENT = { silent: true } as const;

/**
 * Obtiene plantillas de tareas para etapas procesales.
 * Permite filtrar opcionalmente por código de etapa y tipo de proceso.
 * @param legalStageCode  Código de la etapa legal (opcional)
 * @param tipoProcesoId   ID del tipo de proceso (opcional)
 */
export async function getTemplates(
  legalStageCode?: string,
  tipoProcesoId?: number,
): Promise<TemplateResponseDTO[]> {
  const params = new URLSearchParams();
  if (legalStageCode) params.set("legalStageCode", legalStageCode);
  if (tipoProcesoId)  params.set("tipoProcesoId", String(tipoProcesoId));

  const res = await apiRequest(
    "GET",
    `/api/legal-stage-templates?${params.toString()}`,
    undefined,
    SILENT,
  );
  if (!res.ok) throw new Error("Error al obtener plantillas");
  return res.json();
}

/**
 * Crea una nueva plantilla de tarea para una etapa procesal.
 * @param data Datos de la plantilla a crear
 */
export async function createTemplate(
  data: CreateTemplateDTO,
): Promise<TemplateResponseDTO> {
  const res = await apiRequest(
    "POST",
    "/api/legal-stage-templates",
    data,
    SILENT,
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al crear plantilla");
  }
  return res.json();
}

/**
 * Actualiza una plantilla de tarea existente.
 * @param templateId ID de la plantilla a actualizar
 * @param data       Campos a actualizar
 */
export async function updateTemplate(
  templateId: number,
  data: UpdateTemplateDTO,
): Promise<TemplateResponseDTO> {
  const res = await apiRequest(
    "PATCH",
    `/api/legal-stage-templates/${templateId}`,
    data,
    SILENT,
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al actualizar plantilla");
  }
  return res.json();
}

/**
 * Elimina una plantilla de tarea (soft delete vía activo: false).
 * @param templateId ID de la plantilla a eliminar
 */
export async function deleteTemplate(templateId: number): Promise<void> {
  const res = await apiRequest(
    "DELETE",
    `/api/legal-stage-templates/${templateId}`,
    undefined,
    SILENT,
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al eliminar plantilla");
  }
}
