import { apiRequest } from "@/lib/query-client";

export interface ClientRequestDTO {
  id:          string;
  fromUserId:  string;
  toUserId:    string;
  status:      "pending" | "accepted" | "rejected" | "expired";
  createdAt:   string;
  expiresAt:   string;
  respondedAt: string | null;
  senderName?: string;
  senderRole?: string;
}

export interface ClientRequestStatus {
  isClient:  boolean;
  canSend:   boolean;
  request:   ClientRequestDTO | null;
}

export interface AppNotificationDTO {
  id:        string;
  userId:    string;
  type:      string;
  title:     string;
  body:      string;
  data:      Record<string, any> | null;
  readAt:    string | null;
  createdAt: string;
}

export async function sendClientRequest(toUserId: string): Promise<ClientRequestDTO> {
  const res = await apiRequest("POST", "/api/client-requests", { toUserId });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Error al enviar solicitud");
  }
  return res.json();
}

export async function getClientRequestStatus(toUserId: string): Promise<ClientRequestStatus> {
  const res = await apiRequest("GET", `/api/client-requests/status/${toUserId}`);
  if (!res.ok) throw new Error("Error al obtener estado");
  return res.json();
}

export async function getPendingRequests(): Promise<ClientRequestDTO[]> {
  const res = await apiRequest("GET", "/api/client-requests/pending");
  if (!res.ok) throw new Error("Error al cargar solicitudes");
  return res.json();
}

export async function respondToRequest(id: string, accept: boolean): Promise<{ status: string }> {
  const res = await apiRequest("PATCH", `/api/client-requests/${id}/respond`, { accept });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Error al responder solicitud");
  }
  return res.json();
}

export async function getAppNotifications(): Promise<AppNotificationDTO[]> {
  const res = await apiRequest("GET", "/api/app-notifications");
  if (!res.ok) throw new Error("Error al cargar notificaciones");
  return res.json();
}

export async function getAppNotificationsUnreadCount(): Promise<number> {
  const res = await apiRequest("GET", "/api/app-notifications/unread-count");
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export async function markAppNotificationRead(id: string): Promise<void> {
  await apiRequest("PATCH", `/api/app-notifications/${id}/read`);
}

export async function markAllAppNotificationsRead(): Promise<void> {
  await apiRequest("PATCH", "/api/app-notifications/read-all");
}
