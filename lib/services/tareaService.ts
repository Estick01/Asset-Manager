import { apiRequest } from "../apiClient";

const SILENT = { silent: true } as const;
import type {
  CreateTareaDTO,
  UpdateTareaDTO,
  CambiarEstadoDTO,
  TareaResponseDTO,
  TareasProgresoDTO,
  MisTareasDTO,
} from "@/shared/schema";

export async function getTareasByProceso(procesoId: string, stage?: string): Promise<TareasProgresoDTO> {
  const url = stage
    ? `/api/procesos/${procesoId}/tareas?stage=${encodeURIComponent(stage)}`
    : `/api/procesos/${procesoId}/tareas`;
  const res = await apiRequest("GET", url, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener tareas");
  return res.json();
}

export async function getMisTareas(): Promise<MisTareasDTO> {
  const res = await apiRequest("GET", "/api/tareas/mis-tareas", undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener mis tareas");
  return res.json();
}

export async function createTarea(
  procesoId: string,
  dto: CreateTareaDTO,
): Promise<TareaResponseDTO> {
  const res = await apiRequest("POST", `/api/procesos/${procesoId}/tareas`, dto, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al crear tarea");
  }
  return res.json();
}

export async function updateTarea(
  id: string,
  dto: UpdateTareaDTO,
): Promise<TareaResponseDTO> {
  const res = await apiRequest("PATCH", `/api/tareas/${id}`, dto, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al actualizar tarea");
  }
  return res.json();
}

export async function cambiarEstadoTarea(
  id: string,
  dto: CambiarEstadoDTO,
): Promise<TareaResponseDTO> {
  const res = await apiRequest("PATCH", `/api/tareas/${id}/estado`, dto, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al cambiar estado");
  }
  return res.json();
}

export async function completarTarea(id: string): Promise<TareaResponseDTO> {
  const res = await apiRequest("PATCH", `/api/tareas/${id}/completar`, undefined, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al completar tarea");
  }
  return res.json();
}

export async function deleteTarea(id: string): Promise<void> {
  const res = await apiRequest("DELETE", `/api/tareas/${id}`, undefined, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al eliminar tarea");
  }
}
