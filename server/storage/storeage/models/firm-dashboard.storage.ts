// storage/firm-dashboard.storage.ts

import { and, count, eq, gte, inArray, or, sql } from "drizzle-orm";
import {
  clientes, documentos, actualizaciones, procesos,
  estadosProceso, tiposProceso, lawyerFirmaHistory, procesoLawyers,
  lawyerClients, lawyerProfiles, tareas, procesoOwnership,
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

  // Tareas
  totalTareas: number;
  tareasPendientes: number;
  tareasEnProgreso: number;
  tareasCompletadas: number;

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

    // 1. IDs de abogados activos de la firma
    const firmLawyers = await this.db
      .select({ id: lawyerProfiles.id })
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.firmId, firmId));

    const lawyerIds = firmLawyers.map(l => l.id);

    // 2. IDs de procesos de la firma:
    //    a) Propiedad directa del bufete (proceso_ownership activo)
    //    b) Procesos donde algún abogado de la firma está asignado (procesoLawyers)
    const [ownedRows, assignedRows] = await Promise.all([
      this.db
        .select({ procesoId: procesoOwnership.procesoId })
        .from(procesoOwnership)
        .where(and(
          eq(procesoOwnership.ownerType, "bufete"),
          eq(procesoOwnership.ownerId, firmId),
          sql`${procesoOwnership.activoUnique} = 1`,
        )),
      lawyerIds.length > 0
        ? this.db
            .select({ procesoId: procesoLawyers.procesoId })
            .from(procesoLawyers)
            .where(inArray(procesoLawyers.lawyerId, lawyerIds))
        : Promise.resolve([]),
    ]);

    const procesoIdSet = new Set([
      ...ownedRows.map(r => r.procesoId),
      ...assignedRows.map(r => r.procesoId),
    ]);
    const procesoIds = [...procesoIdSet];

    // Si no hay abogados ni procesos propios, devolver ceros
    if (lawyerIds.length === 0 && procesoIds.length === 0) {
      return {
        totalAbogados: 0, abogadosActivos: 0, abogadosSuspendidos: 0,
        totalClientes: 0, clientesActivos: 0,
        totalProcesos: 0, procesosActivos: 0, procesosFinalizados: 0, procesosEsteMes: 0,
        totalDocumentos: 0, actualizacionesEsteMes: 0,
        totalTareas: 0, tareasPendientes: 0, tareasEnProgreso: 0, tareasCompletadas: 0,
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

      // Abogados de la firma (histórico + activos)
      this.db
        .select({
          total: sql<number>`COUNT(*)`,
          activos: sql<number>`SUM(CASE WHEN ${lawyerFirmaHistory.estado} = 'activo' THEN 1 ELSE 0 END)`,
          suspendidos: sql<number>`SUM(CASE WHEN ${lawyerFirmaHistory.estado} = 'suspendido' THEN 1 ELSE 0 END)`,
        })
        .from(lawyerFirmaHistory)
        .where(eq(lawyerFirmaHistory.firmaId, firmId)),

      // Clientes via abogados de la firma
      lawyerIds.length > 0
        ? this.db
            .select({
              total: sql<number>`COUNT(DISTINCT ${lawyerClients.clientId})`,
              activos: sql<number>`COUNT(DISTINCT CASE WHEN ${clientes.activo} = 1 THEN ${lawyerClients.clientId} END)`,
            })
            .from(lawyerClients)
            .innerJoin(lawyerProfiles, eq(lawyerClients.lawyerId, lawyerProfiles.id))
            .innerJoin(clientes, eq(lawyerClients.clientId, clientes.id))
            .where(and(
              eq(lawyerProfiles.firmId, firmId),
              eq(lawyerClients.status, "active"),
            ))
        : Promise.resolve([{ total: 0, activos: 0 }]),

      // Procesos — usar IDs ya calculados (incluye owned + assigned)
      procesoIds.length > 0
        ? this.db
            .select({
              total: sql<number>`COUNT(DISTINCT ${procesos.id})`,
              activos: sql<number>`COUNT(DISTINCT CASE WHEN ${estadosProceso.codigo} = 'activo' THEN ${procesos.id} END)`,
              finalizados: sql<number>`COUNT(DISTINCT CASE WHEN ${estadosProceso.codigo} = 'finalizado' THEN ${procesos.id} END)`,
            })
            .from(procesos)
            .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
            .where(and(inArray(procesos.id, procesoIds), eq(procesos.state, true)))
        : Promise.resolve([{ total: 0, activos: 0, finalizados: 0 }]),

      // Procesos este mes
      procesoIds.length > 0
        ? this.db
            .select({ total: sql<number>`COUNT(DISTINCT ${procesos.id})` })
            .from(procesos)
            .where(and(
              inArray(procesos.id, procesoIds),
              eq(procesos.state, true),
              gte(procesos.fechaCreacion, startOfMonth),
            ))
        : Promise.resolve([{ total: 0 }]),

      // Documentos de los procesos de la firma
      procesoIds.length > 0
        ? this.db
            .select({ total: sql<number>`COUNT(DISTINCT ${documentos.id})` })
            .from(documentos)
            .where(inArray(documentos.procesoId, procesoIds))
        : Promise.resolve([{ total: 0 }]),

      // Actualizaciones este mes
      procesoIds.length > 0
        ? this.db
            .select({ total: sql<number>`COUNT(DISTINCT ${actualizaciones.id})` })
            .from(actualizaciones)
            .where(and(
              inArray(actualizaciones.procesoId, procesoIds),
              gte(actualizaciones.fecha, startOfMonth),
            ))
        : Promise.resolve([{ total: 0 }]),

      // Procesos por estado
      procesoIds.length > 0
        ? this.db
            .select({
              nombre: estadosProceso.nombre,
              color: estadosProceso.color,
              total: sql<number>`COUNT(DISTINCT ${procesos.id})`,
            })
            .from(procesos)
            .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
            .where(and(inArray(procesos.id, procesoIds), eq(procesos.state, true)))
            .groupBy(estadosProceso.id, estadosProceso.nombre, estadosProceso.color)
        : Promise.resolve([]),

      // Procesos por tipo
      procesoIds.length > 0
        ? this.db
            .select({
              nombre: tiposProceso.nombre,
              total: sql<number>`COUNT(DISTINCT ${procesos.id})`,
            })
            .from(procesos)
            .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
            .where(and(inArray(procesos.id, procesoIds), eq(procesos.state, true)))
            .groupBy(tiposProceso.id, tiposProceso.nombre)
        : Promise.resolve([]),
    ]);

    // Tareas — contar todas las tareas en procesos de la firma o asignadas a sus abogados
    let totalTareas = 0, tareasPendientes = 0, tareasEnProgreso = 0, tareasCompletadas = 0;
    try {
      const conditions: any[] = [eq(tareas.state, true)];
      const orConditions: any[] = [];

      if (procesoIds.length > 0) orConditions.push(inArray(tareas.procesoId, procesoIds));
      if (lawyerIds.length > 0)  orConditions.push(inArray(tareas.asignadoA, lawyerIds));

      if (orConditions.length > 0) {
        conditions.push(or(...orConditions));
        const result = await this.db
          .select({
            total:      sql<number>`COUNT(DISTINCT ${tareas.id})`,
            pendientes: sql<number>`COUNT(DISTINCT CASE WHEN ${tareas.estado} = 'pendiente'   THEN ${tareas.id} END)`,
            en_progreso:sql<number>`COUNT(DISTINCT CASE WHEN ${tareas.estado} = 'en_progreso' THEN ${tareas.id} END)`,
            completadas:sql<number>`COUNT(DISTINCT CASE WHEN ${tareas.estado} = 'completada'  THEN ${tareas.id} END)`,
          })
          .from(tareas)
          .where(and(...conditions));

        totalTareas      = Number(result[0]?.total       ?? 0);
        tareasPendientes = Number(result[0]?.pendientes  ?? 0);
        tareasEnProgreso = Number(result[0]?.en_progreso ?? 0);
        tareasCompletadas= Number(result[0]?.completadas ?? 0);
      }
    } catch (e) {
      console.error("[firm-dashboard] Error al obtener stats de tareas:", e);
    }

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

      totalTareas,
      tareasPendientes,
      tareasEnProgreso,
      tareasCompletadas,

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