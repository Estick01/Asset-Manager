// lib/services/procesoLawyerService.ts

import { LawyerProfile, ProcesoLawyerWithLawyer, LawyerFirmaHistory } from "@/shared/schema";
import { apiRequest } from "../query-client";
import { TIPO_ASIGNACION_IDS } from "@/shared/schema/tipo-asignacion.schema";
import { LawyerProfileRelations } from "@/shared/schema/lawyer-profile.schema";

// ============================================
// Types
// ============================================
export interface AddLawyerToProcesoParams {
  procesoId: string;
  lawyerId: string;
  rol?: "principal" | "asistente" | "externo";
  tipoAsignacionId?: number | null;
  razonAsignacion?: string | null;
}

export interface TransferirCasoParams {
  procesoId: string;
  nuevoLawyerId: string;
  razonAsignacion?: string | null;
}

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

// ============================================
// Queries
// ============================================

export async function getProcesoLawyers(
  procesoId: string
): Promise<ServiceResult<ProcesoLawyerWithLawyer[]>> {
  try {
    const response = await apiRequest("GET", "/api/procesos/" + procesoId + "/lawyers");
    if (!response.ok) {
      return { data: null, error: "Error: " + response.status };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al obtener abogados del proceso" };
  }
}

export async function getAbogadosByFirma(
  firmaId: string,
  search?: string
): Promise<ServiceResult<LawyerProfileRelations[]>> {
  try {
    const url = search
      ? `/api/lawyer-firma-history/members?q=${encodeURIComponent(search)}`
      : `/api/lawyer-firma-history/members`;
    const historyResponse = await apiRequest("GET", url);
    if (!historyResponse.ok) {
      return { data: null, error: "Error: " + historyResponse.status };
    }

    const historyRecords: (LawyerFirmaHistory & { lawyer: LawyerProfileRelations })[] = await historyResponse.json();

    const lawyerProfiles = historyRecords.map((record) => record.lawyer);

    return { data: lawyerProfiles, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al obtener abogados de la firma" };
  }
}

export async function getAbogadosDisponibles(
  procesoId: string,
  firmaId: string,
  currentLawyerId: string
): Promise<ServiceResult<LawyerProfile[]>> {
  try {
    const [membersResult, procesoResult] = await Promise.all([
      getAbogadosByFirma(firmaId),
      apiRequest("GET", "/api/proceso?idProces=" + procesoId),
    ]);

    if (membersResult.error) {
      return { data: null, error: membersResult.error };
    }

    if (!procesoResult.ok) {
      return { data: null, error: "Error: " + procesoResult.status };
    }

    const proceso = await procesoResult.json();
    const asignados: string[] = proceso.lawyers ? proceso.lawyers.map(function(l: any) { return l.lawyerId; }) : [];
    const disponibles = (membersResult.data || []).filter(function(l: LawyerProfile) {
      return l.id !== currentLawyerId && !asignados.includes(l.id);
    });

    return { data: disponibles, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al obtener abogados disponibles" };
  }
}

// ============================================
// Mutations
// ============================================

export async function addAsistenteToProceso(
  params: AddLawyerToProcesoParams
): Promise<ServiceResult<void>> {
  const { procesoId, lawyerId, razonAsignacion } = params;
  try {
    const response = await apiRequest("POST", "/api/procesos/" + procesoId + "/lawyers", {
      lawyerId: lawyerId,
      rol: "responsable",
      tipoAsignacionId: TIPO_ASIGNACION_IDS.ASISTENCIA,
      razonAsignacion: razonAsignacion || "Agregado como responsable",
    });
    if (!response.ok) {
      return { data: null, error: "Error: " + response.status };
    }
    return { data: undefined, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al agregar asistente" };
  }
}

export async function transferirCaso(
  params: TransferirCasoParams
): Promise<ServiceResult<void>> {
  const { procesoId, nuevoLawyerId, razonAsignacion } = params;
  try {
    const response = await apiRequest("POST", "/api/procesos/" + procesoId + "/transferir", {
      nuevoLawyerId: nuevoLawyerId,
      razonAsignacion: razonAsignacion || "Transferencia de caso",
      tipoAsignacionId: TIPO_ASIGNACION_IDS.REEMPLAZO,
    });
    if (!response.ok) {
      return { data: null, error: "Error: " + response.status };
    }
    return { data: undefined, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al transferir caso" };
  }
}

export async function removeLawyerFromProceso(
  procesoId: string,
  lawyerId: string
): Promise<ServiceResult<void>> {
  try {
    const response = await apiRequest("DELETE", "/api/procesos/" + procesoId + "/lawyers/" + lawyerId);
    if (!response.ok) {
      return { data: null, error: "Error: " + response.status };
    }
    return { data: undefined, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al remover abogado del proceso" };
  }
}

export async function setResponsableProceso(
  procesoId: string,
  responsableId: string
): Promise<ServiceResult<void>> {
  try {
    const response = await apiRequest("PUT", "/api/procesos/" + procesoId + "/responsable", {
      responsableId,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { data: null, error: (body as any)?.error || "Error: " + response.status };
    }
    return { data: undefined, error: null };
  } catch (error: any) {
    return { data: null, error: error?.message || "Error al asignar responsable" };
  }
}
