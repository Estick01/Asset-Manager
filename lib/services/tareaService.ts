import { apiRequest } from "../apiClient";

const SILENT = { silent: true } as const;
import type {
  CreateTareaDTO,
  UpdateTareaDTO,
  CambiarEstadoDTO,
  TareaResponseDTO,
  TareasProgresoDTO,
  MisTareasDTO,
  TareaObservacionDTO,
  CreateObservacionDTO,
  SubtareaDTO,
  CreateSubtareaDTO,
  UpdateSubtareaDTO,
  TareaHistorialDTO,
  TareaArchivoDTO,
} from "@/shared/schema";

export async function getTareasByProceso(procesoId: string, stage?: string): Promise<TareasProgresoDTO> {
  const url = stage
    ? `/api/procesos/${procesoId}/tareas?stage=${encodeURIComponent(stage)}`
    : `/api/procesos/${procesoId}/tareas`;
  const res = await apiRequest("GET", url, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener tareas");
  return res.json();
}

export async function getTareaById(id: string): Promise<TareaResponseDTO> {
  const res = await apiRequest("GET", `/api/tareas/${id}`, undefined, SILENT);
  if (!res.ok) throw new Error("Tarea no encontrada");
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

// ── Observaciones ─────────────────────────────────────────────────────────────

export async function getObservaciones(tareaId: string): Promise<TareaObservacionDTO[]> {
  const res = await apiRequest("GET", `/api/tareas/${tareaId}/observaciones`, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener observaciones");
  return res.json();
}

export async function addObservacion(tareaId: string, dto: CreateObservacionDTO): Promise<TareaObservacionDTO> {
  const res = await apiRequest("POST", `/api/tareas/${tareaId}/observaciones`, dto, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al agregar observación");
  }
  return res.json();
}

// ── Subtareas ─────────────────────────────────────────────────────────────────

export async function getSubtareas(tareaId: string): Promise<SubtareaDTO[]> {
  const res = await apiRequest("GET", `/api/tareas/${tareaId}/subtareas`, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener subtareas");
  return res.json();
}

export async function addSubtarea(tareaId: string, dto: CreateSubtareaDTO): Promise<SubtareaDTO> {
  const res = await apiRequest("POST", `/api/tareas/${tareaId}/subtareas`, dto, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al agregar subtarea");
  }
  return res.json();
}

export async function updateSubtarea(tareaId: string, subtareaId: string, dto: UpdateSubtareaDTO): Promise<SubtareaDTO> {
  const res = await apiRequest("PATCH", `/api/tareas/${tareaId}/subtareas/${subtareaId}`, dto, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al actualizar subtarea");
  }
  return res.json();
}

export async function deleteSubtarea(tareaId: string, subtareaId: string): Promise<void> {
  const res = await apiRequest("DELETE", `/api/tareas/${tareaId}/subtareas/${subtareaId}`, undefined, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al eliminar subtarea");
  }
}

// ── Historial ─────────────────────────────────────────────────────────────────

export async function getTareaHistorial(tareaId: string): Promise<TareaHistorialDTO[]> {
  const res = await apiRequest("GET", `/api/tareas/${tareaId}/historial`, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener historial");
  return res.json();
}

// ── Archivos ─────────────────────────────────────────────────────────────────

export async function getTareaArchivos(tareaId: string): Promise<TareaArchivoDTO[]> {
  const res = await apiRequest("GET", `/api/tareas/${tareaId}/archivos`, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener archivos");
  return res.json();
}

export async function uploadTareaArchivo(tareaId: string, uri: string, nombre: string, mimeType: string): Promise<TareaArchivoDTO> {
  const formData = new FormData();
  const fileResponse = await fetch(uri);
  const blob = await fileResponse.blob();
  formData.append("file", blob, nombre);
  const res = await apiRequest("POST", `/api/tareas/${tareaId}/archivos`, formData, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al subir archivo");
  }
  return res.json();
}

export async function deleteTareaArchivo(tareaId: string, archivoId: string): Promise<void> {
  const res = await apiRequest("DELETE", `/api/tareas/${tareaId}/archivos/${archivoId}`, undefined, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al eliminar archivo");
  }
}

export function getTareaArchivoDownloadUrl(tareaId: string, archivoId: string): string {
  return `/api/tareas/${tareaId}/archivos/${archivoId}/download`;
}
