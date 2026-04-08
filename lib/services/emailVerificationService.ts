import { apiRequest } from "@/lib/query-client";

export async function requestEmailVerification(email: string): Promise<{ message: string }> {
  const response = await apiRequest(
    "POST",
    "/api/auth/request-email-verification",
    { email },
    { includeAuth: false, silent: true },
  );

  const body = await response.json().catch(() => ({ message: "No fue posible procesar la solicitud." }));
  if (!response.ok) throw new Error(body.error || body.message || "No fue posible enviar el código.");
  return body;
}

export async function verifyEmailOtp(email: string, code: string): Promise<{ message: string }> {
  const response = await apiRequest(
    "POST",
    "/api/auth/verify-email",
    { email, code },
    { includeAuth: false, silent: true },
  );

  const body = await response.json().catch(() => ({ message: "No fue posible verificar el correo." }));
  if (!response.ok) throw new Error(body.error || body.message || "No fue posible verificar el correo.");
  return body;
}
