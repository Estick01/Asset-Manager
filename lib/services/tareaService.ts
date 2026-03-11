import { apiRequest } from "../apiClient";
import type {
  CreateTareaDTO,
  UpdateTareaDTO,
  CambiarEstadoDTO,
  TareaResponseDTO,
  TareasProgresoDTO,
  MisTareasDTO,
} from "@/shared/schema";

export async function getTareasByProceso(procesoId: string): Promise<TareasProgresoDTO> {
  const res = await apiRequest("GET", `/api/procesos/${procesoId}/tareas`);
  if (!res.ok) throw new Error("Error al obtener tareas");
  return res.json();
}

export async function getMisTareas(): Promise<MisTareasDTO> {
  const res = await apiRequest("GET", "/api/tareas/mis-tareas");
  if (!res.ok) throw new Error("Error al obtener mis tareas");
  return res.json();
}

export async function createTarea(
  procesoId: string,
  dto: CreateTareaDTO,
): Promise<TareaResponseDTO> {
  const res = await apiRequest("POST", `/api/procesos/${procesoId}/tareas`, dto);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al crear tarea");
  }
  return res.json();
}

export async function updateTarea(
  id: string,
  dto: UpdateTareaDTO,
): Promise<TareaResponseDTO> {
  const res = await apiRequest("PATCH", `/api/tareas/${id}`, dto);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al actualizar tarea");
  }
  return res.json();
}

export async function cambiarEstadoTarea(
  id: string,
  dto: CambiarEstadoDTO,
): Promise<TareaResponseDTO> {
  const res = await apiRequest("PATCH", `/api/tareas/${id}/estado`, dto);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al cambiar estado");
  }
  return res.json();
}

export async function completarTarea(id: string): Promise<TareaResponseDTO> {
  const res = await apiRequest("PATCH", `/api/tareas/${id}/completar`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al completar tarea");
  }
  return res.json();
}

export async function deleteTarea(id: string): Promise<void> {
  const res = await apiRequest("DELETE", `/api/tareas/${id}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Error al eliminar tarea");
  }
}
