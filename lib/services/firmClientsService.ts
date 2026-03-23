import { apiRequest } from "@/lib/query-client";
import type { Cliente } from "@/shared/schema";

export async function getFirmClients(
  limit = 50,
  offset = 0,
  search?: string
): Promise<Cliente[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search) params.set("search", search);
  const res = await apiRequest("GET", `/api/firm/clients?${params}`);
  if (!res.ok) throw new Error("Error al cargar clientes del bufete");
  return res.json();
}

export async function removeFirmClient(clientId: string): Promise<void> {
  const res = await apiRequest("PATCH", `/api/firm/clients/${clientId}/remove`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Error al quitar cliente");
  }
}
