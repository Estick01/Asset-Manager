import { apiRequest } from "@/lib/apiClient";
import type { Notificacion } from "@/shared/schema";

// ─── Client ──────────────────────────────────────────────────────────────────

export async function getNotificacionesCliente(clienteId: string): Promise<Notificacion[]> {
  const res = await apiRequest("GET", `/api/notificaciones/cliente/${clienteId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getNotificacionesCountCliente(clienteId: string): Promise<number> {
  const res = await apiRequest("GET", `/api/notificaciones/cliente/${clienteId}/count`);
  if (!res.ok) return 0;
  const data = await res.json() as { count: number };
  return data.count ?? 0;
}

export async function markNotificacionLeidaCliente(id: number): Promise<void> {
  await apiRequest("PUT", `/api/notificaciones/${id}/leer-cliente`);
}

export async function markTodasLeidasCliente(clienteId: string): Promise<void> {
  await apiRequest("PUT", `/api/notificaciones/cliente/${clienteId}/leer-todas`);
}

// ─── Lawyer ───────────────────────────────────────────────────────────────────

export async function getNotificacionesAbogado(abogadoId: string): Promise<Notificacion[]> {
  const res = await apiRequest("GET", `/api/notificaciones/abogado/${abogadoId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getNotificacionesCountAbogado(abogadoId: string): Promise<number> {
  const res = await apiRequest("GET", `/api/notificaciones/abogado/${abogadoId}/count`);
  if (!res.ok) return 0;
  const data = await res.json() as { count: number };
  return data.count ?? 0;
}

export async function markNotificacionLeidaAbogado(id: number): Promise<void> {
  await apiRequest("PUT", `/api/notificaciones/${id}/leer-abogado`);
}

export async function markTodasLeidasAbogado(abogadoId: string): Promise<void> {
  await apiRequest("PUT", `/api/notificaciones/abogado/${abogadoId}/leer-todas`);
}

// ─── Firm ─────────────────────────────────────────────────────────────────────

export async function getNotificacionesFirma(firmaId: string): Promise<Notificacion[]> {
  const res = await apiRequest("GET", `/api/notificaciones/firma/${firmaId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getNotificacionesCountFirma(firmaId: string): Promise<number> {
  const res = await apiRequest("GET", `/api/notificaciones/firma/${firmaId}/count`);
  if (!res.ok) return 0;
  const data = await res.json() as { count: number };
  return data.count ?? 0;
}

export async function markNotificacionLeidaFirma(id: number): Promise<void> {
  await apiRequest("PUT", `/api/notificaciones/${id}/leer-firma`);
}

export async function markTodasLeidasFirma(firmaId: string): Promise<void> {
  await apiRequest("PUT", `/api/notificaciones/firma/${firmaId}/leer-todas`);
}
