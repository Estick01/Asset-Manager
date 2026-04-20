// storage/firm-dashboard.storage.ts

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import {
  clientes, documentos, actualizaciones, procesos,
  estadosProceso, tiposProceso, lawyerFirmaHistory,
  tareas, procesoOwnership, procesoSharing, clienteOwnership,
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

    // 1. IDs de procesos de la firma:
    //    a) Propiedad directa del bufete (proceso_ownership activo)
    //    b) Procesos compartidos explícitamente con el bufete
    //
    // No se deben incluir procesos privados del abogado solo porque el abogado
    // pertenezca al bufete o esté asignado como responsable.
    const [ownedRows, sharedRows] = await Promise.all([
      this.db
        .select({ procesoId: procesoOwnership.procesoId })
        .from(procesoOwnership)
        .where(and(
          eq(procesoOwnership.ownerType, "bufete"),
          eq(procesoOwnership.ownerId, firmId),
          sql`${procesoOwnership.activoUnique} = 1`,
        )),
      this.db
        .select({ procesoId: procesoSharing.procesoId })
        .from(procesoSharing)
        .where(and(
          eq(procesoSharing.sharedWithType, "bufete"),
          eq(procesoSharing.sharedWithId, firmId),
          sql`${procesoSharing.activoUnique} = 1`,
        )),
    ]);

    const procesoIdSet = new Set([
      ...ownedRows.map(r => r.procesoId),
      ...sharedRows.map(r => r.procesoId),
    ]);
    const procesoIds = [...procesoIdSet];

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

      // Clientes propios del bufete por ownership activo.
      // Esto excluye clientes privados de abogados vinculados a la firma.
      this.db
        .select({
          total: sql<number>`COUNT(DISTINCT ${clienteOwnership.clienteId})`,
          activos: sql<number>`COUNT(DISTINCT CASE WHEN ${clientes.activo} = 1 THEN ${clienteOwnership.clienteId} END)`,
        })
        .from(clienteOwnership)
        .innerJoin(clientes, eq(clienteOwnership.clienteId, clientes.id))
        .where(and(
          eq(clienteOwnership.ownerType, "bufete"),
          eq(clienteOwnership.ownerId, firmId),
          sql`${clienteOwnership.activoUnique} = 1`,
        )),

      // Procesos — usar IDs ya calculados (owned + shared del bufete)
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

    // Tareas — contar solo tareas en procesos reales del bufete.
    // No incluir tareas privadas por estar asignadas a un abogado de la firma.
    let totalTareas = 0, tareasPendientes = 0, tareasEnProgreso = 0, tareasCompletadas = 0;
    try {
      if (procesoIds.length > 0) {
        const result = await this.db
          .select({
            total:      sql<number>`COUNT(DISTINCT ${tareas.id})`,
            pendientes: sql<number>`COUNT(DISTINCT CASE WHEN ${tareas.estado} = 'pendiente'   THEN ${tareas.id} END)`,
            en_progreso:sql<number>`COUNT(DISTINCT CASE WHEN ${tareas.estado} = 'en_progreso' THEN ${tareas.id} END)`,
            completadas:sql<number>`COUNT(DISTINCT CASE WHEN ${tareas.estado} = 'completada'  THEN ${tareas.id} END)`,
          })
          .from(tareas)
          .where(and(
            eq(tareas.state, true),
            inArray(tareas.procesoId, procesoIds),
          ));

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
