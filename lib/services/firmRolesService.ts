import { apiRequest } from "@/lib/query-client";

export interface FirmRol {
  id: number;
  nombre: string;
  descripcion: string | null;
  firmId: string;
  activo: boolean;
}

export interface Permiso {
  id: number;
  codigo: string;
  descripcion: string | null;
  activo: boolean;
}

const SILENT = { silent: true } as const;

export async function getFirmRoles(): Promise<FirmRol[]> {
  const res = await apiRequest("GET", "/api/firm/roles", undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener roles");
  return res.json();
}

export async function createFirmRol(data: { nombre: string; descripcion?: string }): Promise<FirmRol> {
  const res = await apiRequest("POST", "/api/firm/roles", data, SILENT);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error al crear rol");
  return json;
}

export async function deleteFirmRol(rolId: number): Promise<void> {
  const res = await apiRequest("DELETE", `/api/firm/roles/${rolId}`, undefined, SILENT);
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || "Error al eliminar rol");
  }
}

export async function getFirmRolPermisos(rolId: number): Promise<string[]> {
  const res = await apiRequest("GET", `/api/firm/roles/${rolId}/permisos`, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener permisos");
  return res.json();
}

export async function setFirmRolPermisos(rolId: number, permisosIds: number[]): Promise<void> {
  const res = await apiRequest("PUT", `/api/firm/roles/${rolId}/permisos`, { permisosIds }, SILENT);
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || "Error al guardar permisos");
  }
}

export async function getAllPermisos(): Promise<Permiso[]> {
  const res = await apiRequest("GET", "/api/permisos/all", undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener permisos disponibles");
  return res.json();
}

export async function getLawyerFirmRol(lawyerId: string): Promise<number | null> {
  const res = await apiRequest("GET", `/api/firm/lawyers/${lawyerId}/firm-role`, undefined, SILENT);
  if (!res.ok) return null;
  const json = await res.json();
  return json.firmRolId ?? null;
}

export async function assignFirmRolToLawyer(lawyerId: string, firmRolId: number | null): Promise<void> {
  const res = await apiRequest("PUT", `/api/firm/lawyers/${lawyerId}/firm-role`, { firmRolId }, SILENT);
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || "Error al asignar rol");
  }
}
