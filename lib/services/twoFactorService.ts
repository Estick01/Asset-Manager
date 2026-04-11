import { apiRequest } from "@/lib/query-client";

export type TwoFactorStatus = {
  enabled: boolean;
  setupPending: boolean;
  recoveryCodesRemaining: number;
};

export type TwoFactorSetupResponse = {
  secret: string;
  otpAuthUrl: string;
  manualEntryKey: string;
};

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  const response = await apiRequest("GET", "/api/auth/2fa/status");
  if (!response.ok) {
    throw new Error("No se pudo cargar el estado de la autenticación de dos pasos.");
  }
  return response.json();
}

export async function startTwoFactorSetup(): Promise<TwoFactorSetupResponse> {
  const response = await apiRequest("POST", "/api/auth/2fa/setup");
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "No se pudo iniciar la configuración.");
  }
  return response.json();
}

export async function verifyTwoFactorSetup(code: string): Promise<{ recoveryCodes: string[] }> {
  const response = await apiRequest("POST", "/api/auth/2fa/verify-setup", { code });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo verificar el código.");
  }
  return {
    recoveryCodes: payload.recoveryCodes ?? [],
  };
}

export async function disableTwoFactor(currentPassword: string): Promise<void> {
  const response = await apiRequest("POST", "/api/auth/2fa/disable", { currentPassword });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo desactivar la autenticación de dos pasos.");
  }
}
