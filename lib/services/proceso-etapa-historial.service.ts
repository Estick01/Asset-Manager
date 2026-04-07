import { apiRequest } from "../apiClient";
import type {
  ProcesoEtapaHistorialDTO,
  CreateProcesoEtapaHistorialDTO,
  EtapaEstado
} from "@/shared/schema";

export async function createEtapaHistorial(
  procesoId: string,
  data: CreateProcesoEtapaHistorialDTO
): Promise<ProcesoEtapaHistorialDTO> {
  const res = await apiRequest("POST", `/api/procesos/${procesoId}/etapas`, data);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al registrar cambio de etapa");
  }
  return res.json();
}

export async function getEtapaHistorial(procesoId: string): Promise<ProcesoEtapaHistorialDTO[]> {
  const res = await apiRequest("GET", `/api/procesos/${procesoId}/etapas`);
  if (!res.ok) {
    throw new Error("Error al obtener historial de etapas");
  }
  return res.json();
}

export async function getUltimoEstadoPorEtapa(procesoId: string): Promise<Record<string, ProcesoEtapaHistorialDTO>> {
  const res = await apiRequest("GET", `/api/procesos/${procesoId}/etapas/ultimos-estados`);
  if (!res.ok) {
    throw new Error("Error al obtener últimos estados por etapa");
  }
  return res.json();
}