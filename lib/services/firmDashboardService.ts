import { apiRequest } from "../query-client";


export interface FirmDashboardStats {
  totalAbogados: number;
  abogadosActivos: number;
  abogadosSuspendidos: number;
  totalClientes: number;
  clientesActivos: number;
  totalProcesos: number;
  procesosActivos: number;
  procesosFinalizados: number;
  procesosEsteMes: number;
  totalDocumentos: number;
  actualizacionesEsteMes: number;
  procesosPorEstado: { nombre: string; color: string; total: number }[];
  procesosPorTipo: { nombre: string; total: number }[];
}

export async function getFirmDashboardStats(): Promise<FirmDashboardStats | null> {
  try {
    const response = await apiRequest("GET", "/api/firm/dashboard");
    if (!response.ok) {
      console.error("Error fetching dashboard:", response.status);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error al obtener stats del bufete:", error);
    return null;
  }
}