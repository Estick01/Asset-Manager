import { apiRequest } from "@/lib/query-client";

export type RecognizedDevice = {
  id: string;
  deviceId: string;
  deviceName: string | null;
  platform: string | null;
  userAgent: string | null;
  lastIp: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  trustedAt: string;
  revokedAt: string | null;
  activeSessionCount: number;
  hasActiveSessions: boolean;
  isCurrentDevice: boolean;
};

export async function listRecognizedDevices(): Promise<RecognizedDevice[]> {
  const response = await apiRequest("GET", "/api/auth/devices");
  if (!response.ok) {
    throw new Error("No se pudieron cargar los dispositivos.");
  }
  return response.json();
}

export async function revokeRecognizedDevice(id: string): Promise<{ currentDeviceRevoked: boolean }> {
  const response = await apiRequest("POST", `/api/auth/devices/${id}/revoke`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo revocar el dispositivo.");
  }
  return {
    currentDeviceRevoked: !!payload.currentDeviceRevoked,
  };
}
