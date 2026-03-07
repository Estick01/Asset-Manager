// storage/firm-dashboard.storage.ts

import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import {
  clientes, documentos, actualizaciones, procesos,
  estadosProceso, tiposProceso, lawyerFirmaHistory, procesoLawyers,
  lawyerClients,
  lawyerProfiles
} from "@/shared/schema";
import { Database } from "../database-storage";

export interface FirmDashboardStats {
  // Equipo
  totalAbogados: number;
  abogadosActivos: number;
  abogadosSuspendidos: number;

  // Clientes
  totalClientes: number;
  clientesActivos: number;

  // Procesos
  totalProcesos: number;
  procesosActivos: number;
  procesosFinalizados: number;
  procesosEsteMes: number;

  // Actividad
  totalDocumentos: number;
  actualizacionesEsteMes: number;

  // Distribución
  procesosPorEstado: {
    nombre: string;
    color: string;
    total: number;
  }[];
  procesosPorTipo: {
    nombre: string;
    total: number;
  }[];
}

export class FirmDashboardStorage {
  constructor(private db: Database) { }

  async getStats(firmId: string): Promise<FirmDashboardStats> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Primero obtenemos los IDs de abogados de la firma
    const firmLawyers = await this.db
      .select({ id: lawyerProfiles.id })
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.firmId, firmId));

    const lawyerIds = firmLawyers.map(l => l.id);

    if (lawyerIds.length === 0) {
      return {
        totalAbogados: 0, abogadosActivos: 0, abogadosSuspendidos: 0,
        totalClientes: 0, clientesActivos: 0,
        totalProcesos: 0, procesosActivos: 0, procesosFinalizados: 0, procesosEsteMes: 0,
        totalDocumentos: 0, actualizacionesEsteMes: 0,
        procesosPorEstado: [], procesosPorTipo: [],
      };
    }

    const [
      abogadosStats,
      clientesStats,
      procesosStats,
      procesosEsteMes,
      documentosTotal,
      actualizacionesEsteMes,
      procesosPorEstado,
      procesosPorTipo,
    ] = await Promise.all([

      // Abogados de la firma
      this.db
        .select({
          total: sql<number>`COUNT(*)`,
          activos: sql<number>`SUM(CASE WHEN ${lawyerFirmaHistory.estado} = 'activo' THEN 1 ELSE 0 END)`,
          suspendidos: sql<number>`SUM(CASE WHEN ${lawyerFirmaHistory.estado} = 'suspendido' THEN 1 ELSE 0 END)`,
        })
        .from(lawyerFirmaHistory)
        .where(eq(lawyerFirmaHistory.firmaId, firmId)),

      // Clientes de la firma via lawyerClients
      this.db
        .select({
          total: sql<number>`COUNT(DISTINCT ${lawyerClients.clientId})`,
          activos: sql<number>`COUNT(DISTINCT CASE WHEN ${clientes.activo} = 1 THEN ${lawyerClients.clientId} END)`,
        })
        .from(lawyerClients)
        .innerJoin(lawyerProfiles, eq(lawyerClients.lawyerId, lawyerProfiles.id))
        .innerJoin(clientes, eq(lawyerClients.clientId, clientes.id))
        .where(
          and(
            eq(lawyerProfiles.firmId, firmId),
            eq(lawyerClients.status, "active")
          )
        ),

      // Procesos de la firma
      this.db
        .select({
          total: sql<number>`COUNT(DISTINCT ${procesos.id})`,
          activos: sql<number>`COUNT(DISTINCT CASE WHEN ${estadosProceso.codigo} = 'activo' THEN ${procesos.id} END)`,
          finalizados: sql<number>`COUNT(DISTINCT CASE WHEN ${estadosProceso.codigo} = 'finalizado' THEN ${procesos.id} END)`,
        })
        .from(procesos)
        .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
        .leftJoin(procesoLawyers, eq(procesos.id, procesoLawyers.procesoId))
        .where(inArray(procesoLawyers.lawyerId, lawyerIds)),

      // Procesos este mes
      this.db
        .select({ total: sql<number>`COUNT(DISTINCT ${procesos.id})` })
        .from(procesos)
        .leftJoin(procesoLawyers, eq(procesos.id, procesoLawyers.procesoId))
        .where(
          and(
            inArray(procesoLawyers.lawyerId, lawyerIds),
            gte(procesos.fechaCreacion, startOfMonth)
          )
        ),

      // Documentos de procesos de la firma
      this.db
        .select({ total: sql<number>`COUNT(DISTINCT ${documentos.id})` })
        .from(documentos)
        .innerJoin(procesoLawyers, eq(documentos.procesoId, procesoLawyers.procesoId))
        .where(inArray(procesoLawyers.lawyerId, lawyerIds)),

      // Actualizaciones este mes de procesos de la firma
      this.db
        .select({ total: sql<number>`COUNT(DISTINCT ${actualizaciones.id})` })
        .from(actualizaciones)
        .innerJoin(procesoLawyers, eq(actualizaciones.procesoId, procesoLawyers.procesoId))
        .where(
          and(
            inArray(procesoLawyers.lawyerId, lawyerIds),
            gte(actualizaciones.fecha, startOfMonth)
          )
        ),

      // Procesos por estado
      this.db
        .select({
          nombre: estadosProceso.nombre,
          color: estadosProceso.color,
          total: sql<number>`COUNT(DISTINCT ${procesos.id})`,
        })
        .from(procesos)
        .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
        .leftJoin(procesoLawyers, eq(procesos.id, procesoLawyers.procesoId))
        .where(inArray(procesoLawyers.lawyerId, lawyerIds))
        .groupBy(estadosProceso.id, estadosProceso.nombre, estadosProceso.color),

      // Procesos por tipo
      this.db
        .select({
          nombre: tiposProceso.nombre,
          total: sql<number>`COUNT(DISTINCT ${procesos.id})`,
        })
        .from(procesos)
        .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
        .leftJoin(procesoLawyers, eq(procesos.id, procesoLawyers.procesoId))
        .where(inArray(procesoLawyers.lawyerId, lawyerIds))
        .groupBy(tiposProceso.id, tiposProceso.nombre),
    ]);

    return {
      totalAbogados: Number(abogadosStats[0]?.total ?? 0),
      abogadosActivos: Number(abogadosStats[0]?.activos ?? 0),
      abogadosSuspendidos: Number(abogadosStats[0]?.suspendidos ?? 0),

      totalClientes: Number(clientesStats[0]?.total ?? 0),
      clientesActivos: Number(clientesStats[0]?.activos ?? 0),

      totalProcesos: Number(procesosStats[0]?.total ?? 0),
      procesosActivos: Number(procesosStats[0]?.activos ?? 0),
      procesosFinalizados: Number(procesosStats[0]?.finalizados ?? 0),
      procesosEsteMes: Number(procesosEsteMes[0]?.total ?? 0),

      totalDocumentos: Number(documentosTotal[0]?.total ?? 0),
      actualizacionesEsteMes: Number(actualizacionesEsteMes[0]?.total ?? 0),

      procesosPorEstado: procesosPorEstado.map(e => ({
        nombre: e.nombre || "Sin estado",
        color: e.color || "#607D8B",
        total: Number(e.total),
      })),

      procesosPorTipo: procesosPorTipo.map(t => ({
        nombre: t.nombre || "Sin tipo",
        total: Number(t.total),
      })),
    };
  }
}