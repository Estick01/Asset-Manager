import { apiRequest } from "../apiClient";
import type {
  ProcesoOwnershipDTO,
  ProcesoSharingDTO,
  CreateSharingDTO,
  ProcesoDTO,
} from "@/shared/schema";

const SILENT = { silent: true } as const;

export async function getOwnershipHistory(procesoId: string): Promise<ProcesoOwnershipDTO[]> {
  const res = await apiRequest("GET", `/api/procesos/${procesoId}/ownership/history`, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener historial de ownership");
  return res.json();
}

export async function getSharingList(procesoId: string): Promise<ProcesoSharingDTO[]> {
  const res = await apiRequest("GET", `/api/procesos/${procesoId}/sharing`, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener accesos compartidos");
  return res.json();
}

export async function shareProcess(procesoId: string, dto: CreateSharingDTO): Promise<ProcesoSharingDTO> {
  const res = await apiRequest("POST", `/api/procesos/${procesoId}/sharing`, dto, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al compartir proceso");
  }
  return res.json();
}

export async function revokeSharing(procesoId: string, shareId: string): Promise<void> {
  const res = await apiRequest("DELETE", `/api/procesos/${procesoId}/sharing/${shareId}`, undefined, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al revocar acceso");
  }
}

export async function transferOwnership(
  procesoId: string,
  dto: { ownerType: "abogado" | "bufete"; ownerId: string | null; razon?: string },
): Promise<ProcesoOwnershipDTO> {
  const res = await apiRequest("POST", `/api/procesos/${procesoId}/ownership/transfer`, dto, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al transferir proceso");
  }
  return res.json();
}

export interface BatchDecision {
  procesoId:   string;
  action:      "privado" | "compartir" | "transferir";
  permission?: "ver" | "comentar" | "editar";
}

export async function submitBatchDecisions(
  bufeteId: string,
  decisions: BatchDecision[],
): Promise<{ transferidos: number; compartidos: number; privados: number; errores: string[] }> {
  const res = await apiRequest("POST", "/api/procesos/batch-decisions", { bufeteId, decisions });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al procesar decisiones");
  }
  return res.json();
}

export async function getPendingReassignments(firmId: string): Promise<ProcesoDTO[]> {
  const res = await apiRequest("GET", `/api/firm/${firmId}/pending-reassignments`, undefined, SILENT);
  if (!res.ok) return [];
  return res.json();
}

export async function getLeaveFirmImpact(firmId: string, lawyerId: string): Promise<{ sharedToBeRevoked: number; firmProcessesLost: number }> {
  const [sharedIds, firmIds] = await Promise.all([
    apiRequest("GET", `/api/procesos?role=abogado`, undefined, SILENT).then(r => r.ok ? r.json() : { data: [] }),
    apiRequest("GET", `/api/procesos?role=bufete&firmId=${firmId}`, undefined, SILENT).then(r => r.ok ? r.json() : { data: [] }),
  ]);
  // Return estimated impact (exact counts come from the server)
  return { sharedToBeRevoked: 0, firmProcessesLost: 0 };
}
