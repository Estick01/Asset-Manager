import { apiRequest } from "../query-client";

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await apiRequest("POST", "/api/auth/request-password-reset", { email });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Error al enviar el código");
  }
}

export async function verifyOtp(
  email: string,
  code: string
): Promise<{ resetToken: string }> {
  const res = await apiRequest("POST", "/api/auth/verify-otp", { email, code });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Código inválido o expirado");
  return body;
}

export async function resetPassword(
  resetToken: string,
  newPassword: string
): Promise<void> {
  const res = await apiRequest("POST", "/api/auth/reset-password", {
    resetToken,
    newPassword,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Error al restablecer la contraseña");
  }
}
