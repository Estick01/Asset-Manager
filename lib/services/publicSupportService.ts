import { API_URL } from "@/lib/config";
import { extractApiErrorMessage } from "@/lib/api-error";

export type PublicSupportSource = "landing" | "login";

export interface CreatePublicSupportRequestInput {
  name: string;
  email: string;
  message: string;
  source: PublicSupportSource;
}

export async function createPublicSupportRequest(input: CreatePublicSupportRequestInput): Promise<string> {
  const response = await fetch(`${API_URL}/api/public/support-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await extractApiErrorMessage(response, "No fue posible enviar tu solicitud."));
  }

  const body = await response.json() as { message?: string };
  return body.message ?? "Tu solicitud fue enviada.";
}
