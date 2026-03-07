// lib/services/firmInvitationService.ts


import { LawyerProfile } from "@/shared/schema";
import { apiRequest } from "../query-client";

export interface FirmInvitation {
  id: string;
  firmId: string;
  lawyerId: string;
  invitadoPor: string;
  status: "pendiente" | "aceptada" | "rechazada" | "cancelada";
  mensaje: string | null;
  motivoRechazo: string | null;
  expiresAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  firm?: {
    id: string;
    name: string;
    logo?: string | null;
  };
  lawyer?: LawyerProfile;
  invitadoPorUser?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface FirmInvitationWithDetails extends FirmInvitation {
  firm?: {
    id: string;
    name: string;
    logo?: string | null;
  };
  lawyer?: LawyerProfile;
  invitadoPorUser?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

// ============================================
// Firma - Buscar abogados
// ============================================
export async function searchAvailableLawyers(
  search: string,
  firmId: string
): Promise<ServiceResult<LawyerProfile[]>> {
  try {
    const response = await apiRequest("GET", `/api/firm/invitations/search-lawyers?search=${search}`);
    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || "Error al buscar abogados" };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al buscar abogados" };
  }
}

// ============================================
// Firma - Invitaciones enviadas
// ============================================
export async function getFirmInvitations(): Promise<ServiceResult<FirmInvitation[]>> {
  try {
    const response = await apiRequest("GET", "/api/firm/invitations");
    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || "Error al obtener invitaciones" };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al obtener invitaciones" };
  }
}

export async function sendInvitation(
  lawyerId: string,
  mensaje?: string
): Promise<ServiceResult<FirmInvitation>> {
  try {
    const response = await apiRequest("POST", "/api/firm/invitations", { lawyerId, mensaje });
    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || "Error al enviar invitación" };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al enviar invitación" };
  }
}

export async function cancelInvitation(id: string): Promise<ServiceResult<void>> {
  try {
    const response = await apiRequest("POST", `/api/firm/invitations/${id}/cancel`);
    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || "Error al cancelar invitación" };
    }
    return { data: null, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al cancelar invitación" };
  }
}

// ============================================
// Abogado - Invitaciones recibidas
// ============================================
export async function getLawyerInvitations(): Promise<ServiceResult<FirmInvitation[]>> {
  try {
    const response = await apiRequest("GET", "/api/lawyer/invitations");
    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || "Error al obtener invitaciones" };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al obtener invitaciones" };
  }
}

export async function acceptInvitation(id: string): Promise<ServiceResult<void>> {
  try {
    const response = await apiRequest("POST", `/api/lawyer/invitations/${id}/accept`);
    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || "Error al aceptar invitación" };
    }
    return { data: null, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al aceptar invitación" };
  }
}

export async function rejectInvitation(
  id: string,
  motivoRechazo?: string
): Promise<ServiceResult<void>> {
  try {
    const response = await apiRequest("POST", `/api/lawyer/invitations/${id}/reject`, { motivoRechazo });
    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: errorText || "Error al rechazar invitación" };
    }
    return { data: null, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al rechazar invitación" };
  }
}