
/**
 * Proceso Storage
 * Handles all database operations for processes (procesos)
 */

import { ProcesoFilter } from "@/server/services";
import { randomUUID } from "crypto";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { clientes, estadosProceso, InsertProceso, lawyerProfiles, ProcesoDTO, procesoLawyers, ProcesoLawyerWithLawyer, procesos, procesoResponsables, tiposProceso } from "@/shared/schema";
import { Database } from "../database-storage";
import { alias } from 'drizzle-orm/mysql-core';


export class ProcesoStorage {
  constructor(private db: Database) { }

  private async getActiveResponsable(procesoId: string): Promise<{
    lawyer: typeof lawyerProfiles.$inferSelect;
    fechaInicio: Date;
    razon: string | null;
    asignadoPorNombre: string | null;
  } | null> {
    const result = await this.db
      .select({
        lawyer: lawyerProfiles,
        fechaInicio: procesoResponsables.fechaInicio,
        razon: procesoResponsables.razon,
        asignadoPorNombre: procesoResponsables.asignadoPorNombre,
      })
      .from(procesoResponsables)
      .innerJoin(lawyerProfiles, eq(procesoResponsables.lawyerId, lawyerProfiles.id))
      .where(and(
        eq(procesoResponsables.procesoId, procesoId),
        eq(procesoResponsables.activo, true)
      ))
      .limit(1);
    return result[0] ?? null;
  }

  async getProcesos(
    lawyerId: string,
    limit: number = 10,
    offset: number = 0,
    filter?: ProcesoFilter
  ): Promise<{ data: ProcesoDTO[]; total: number }> {
    // Get proceso IDs from junction table
    const lawyerProcesoIds = await this.db
      .select({ procesoId: procesoLawyers.procesoId })
      .from(procesoLawyers)
      .where(eq(procesoLawyers.lawyerId, lawyerId));

    // Also get proceso IDs where the lawyer is the active responsable
    const responsableProcesoIds = await this.db
      .select({ procesoId: procesoResponsables.procesoId })
      .from(procesoResponsables)
      .where(and(
        eq(procesoResponsables.lawyerId, lawyerId),
        eq(procesoResponsables.activo, true)
      ));

    const procesoIds = [...new Set([
      ...lawyerProcesoIds.map(p => p.procesoId),
      ...responsableProcesoIds.map(p => p.procesoId),
    ])];

    if (procesoIds.length === 0) {
      return { data: [], total: 0 };
    }

    const conditions: any[] = [inArray(procesos.id, procesoIds)];

    if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
      conditions.push(eq(estadosProceso.codigo, filter.estadoCodigo));
    }

    if (filter?.search) {
      const search = `%${filter.search}%`;
      conditions.push(
        sql`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(${clientes.nombre}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search})
      )`
      );
    }

    // Get total
    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions));

    // Get paginated data
    const results = await this.db
      .select({
        id: procesos.id,
        state: procesos.state,
        fechaCreacion: procesos.fechaCreacion,
        clienteId: procesos.clienteId,
        tipoProcesoId: procesos.tipoProcesoId,
        radicado: procesos.radicado,
        juzgado: procesos.juzgado,
        estadoId: procesos.estadoId,
        descripcionEstado: procesos.descripcionEstado,
        clienteNombre: clientes.nombre,
        tipoProcesoNombre: tiposProceso.nombre,
        estadoIdRel: estadosProceso.id,
        estadoCodigo: estadosProceso.codigo,
        estadoNombre: estadosProceso.nombre,
        estadoColor: estadosProceso.color,
      })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions))
      .orderBy(desc(procesos.fechaCreacion))
      .limit(limit)
      .offset(offset);

    const data = results.map(p => ({
      id: p.id,
      state: p.state,
      fechaCreacion: p.fechaCreacion,
      clienteId: p.clienteId,
      tipoProcesoId: p.tipoProcesoId,
      radicado: p.radicado,
      juzgado: p.juzgado,
      estadoId: p.estadoId,
      descripcionEstado: p.descripcionEstado,
      clienteNombre: p.clienteNombre || "Sin cliente",
      estado: p.estadoIdRel
        ? {
          id: p.estadoIdRel,
          codigo: p.estadoCodigo || "",
          nombre: p.estadoNombre || "",
          color: p.estadoColor || "",

        }
        : null,
    }));

    return { data, total: Number(count) };
  }

  async getProcesosCount(lawyerId: string, filter?: ProcesoFilter): Promise<number> {
    const lawyerProcesoIds = await this.db
      .select({ procesoId: procesoLawyers.procesoId })
      .from(procesoLawyers)
      .where(eq(procesoLawyers.lawyerId, lawyerId));

    const responsableProcesoIds = await this.db
      .select({ procesoId: procesoResponsables.procesoId })
      .from(procesoResponsables)
      .where(and(
        eq(procesoResponsables.lawyerId, lawyerId),
        eq(procesoResponsables.activo, true)
      ));

    const procesoIds = [...new Set([
      ...lawyerProcesoIds.map(p => p.procesoId),
      ...responsableProcesoIds.map(p => p.procesoId),
    ])];

    if (procesoIds.length === 0) {
      return 0;
    }

    const conditions: any[] = [inArray(procesos.id, procesoIds)];

    if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
      conditions.push(eq(estadosProceso.codigo, filter.estadoCodigo));
    }

    if (filter?.search) {
      const search = `%${filter.search}%`;
      conditions.push(
        sql`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(${clientes.nombre}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search})
      )`
      );
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions));

    return result[0]?.count || 0;
  }

  async getProcesosByCliente(
    clienteId: string,
    limit: number = 10,
    offset: number = 0,
    filter?: ProcesoFilter
  ): Promise<{ data: ProcesoDTO[]; total: number }> {
    const conditions: any[] = [eq(procesos.clienteId, clienteId)];

    if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
      conditions.push(eq(estadosProceso.codigo, filter.estadoCodigo));
    }

    if (filter?.search) {
      const search = `%${filter.search}%`;
      conditions.push(
        sql`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search})
      )`
      );
    }

    // Get total
    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(procesos)
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions));

    // Get paginated data
    const results = await this.db
      .select({
        id: procesos.id,
        state: procesos.state,
        fechaCreacion: procesos.fechaCreacion,
        clienteId: procesos.clienteId,
        tipoProcesoId: procesos.tipoProcesoId,
        radicado: procesos.radicado,
        juzgado: procesos.juzgado,
        estadoId: procesos.estadoId,
        descripcionEstado: procesos.descripcionEstado,
        tipoProcesoNombre: tiposProceso.nombre,
        estadoIdRel: estadosProceso.id,
        estadoCodigo: estadosProceso.codigo,
        estadoNombre: estadosProceso.nombre,
        estadoColor: estadosProceso.color,
      })
      .from(procesos)
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions))
      .orderBy(desc(procesos.fechaCreacion))
      .limit(limit)
      .offset(offset);

    const data = results.map(p => ({
      id: p.id,
      state: p.state,
      fechaCreacion: p.fechaCreacion,
      clienteId: p.clienteId,
      tipoProcesoId: p.tipoProcesoId,
      radicado: p.radicado,
      juzgado: p.juzgado,
      estadoId: p.estadoId,
      descripcionEstado: p.descripcionEstado,
      clienteNombre: 'Sin cliente',
      estado: p.estadoIdRel
        ? {
          id: p.estadoIdRel,
          codigo: p.estadoCodigo || "",
          nombre: p.estadoNombre || "",
          color: p.estadoColor || "",
        }
        : null,
    }));

    return { data, total: Number(count) };
  }

  async getProceso(id: string): Promise<ProcesoDTO | undefined> {
    const rawProceso = await this.db.query.procesos.findFirst({
      where: eq(procesos.id, id),
      with: {
        cliente: true,
        estado: true,
        tipoProceso: true,
      },
    });

    if (!rawProceso) return undefined;

    const responsableMeta = await this.getActiveResponsable(id);

    return {
      id: rawProceso.id,
      state: rawProceso.state,
      fechaCreacion: rawProceso.fechaCreacion,
      clienteId: rawProceso.clienteId,
      tipoProcesoId: rawProceso.tipoProcesoId,
      radicado: rawProceso.radicado,
      juzgado: rawProceso.juzgado,
      estadoId: rawProceso.estadoId,
      descripcionEstado: rawProceso.descripcionEstado,
      responsable: responsableMeta?.lawyer ?? null,
      responsableFechaAsignacion: responsableMeta?.fechaInicio ?? null,
      responsableRazon: responsableMeta?.razon ?? null,
      responsableAsignadoPorNombre: responsableMeta?.asignadoPorNombre ?? null,
      clienteNombre: rawProceso.cliente?.nombre || 'Sin cliente',
      estado: rawProceso.estado ? {
        id: rawProceso.estado.id,
        codigo: rawProceso.estado.codigo,
        nombre: rawProceso.estado.nombre,
        color: rawProceso.estado.color,
      } : null,
    };
  }

  async createProceso(insertProceso: InsertProceso): Promise<ProcesoDTO> {
    const id = randomUUID();
    const fechaCreacion = insertProceso.fechaCreacion
      ? new Date(insertProceso.fechaCreacion)
      : new Date();

    const { fechaCreacion: _fechaCreacion, ...procesoWithoutFecha } = insertProceso;

    const newProceso = {
      ...procesoWithoutFecha,
      id,
      fechaCreacion,
      tipoProcesoId: insertProceso.tipoProcesoId ?? null,
      state: insertProceso.state ?? true,
      clienteNombre: '',
      descripcionEstado: insertProceso.descripcionEstado ?? '',
      estado: null,
    };
    await this.db.insert(procesos).values(newProceso);
    return newProceso;
  }

  async setResponsable(
    procesoId: string,
    responsableId: string | null,
    options: { asignadoPor?: string | null; asignadoPorNombre?: string | null; razon?: string | null } = {}
  ): Promise<ProcesoDTO | undefined> {
    // Deactivate current active responsable (don't delete - keep history)
    await this.db
      .update(procesoResponsables)
      .set({ activo: false, fechaFin: new Date() })
      .where(and(
        eq(procesoResponsables.procesoId, procesoId),
        eq(procesoResponsables.activo, true)
      ));

    // Insert new responsable if provided
    if (responsableId) {
      await this.db.insert(procesoResponsables).values({
        id: randomUUID(),
        procesoId,
        lawyerId: responsableId,
        asignadoPor: null, // FK removed - use asignadoPorNombre instead
        asignadoPorNombre: options.asignadoPorNombre ?? null,
        fechaInicio: new Date(),
        razon: options.razon ?? null,
        activo: true,
      });
    }

    return this.getProceso(procesoId);
  }

  async updateProceso(id: string, updates: Partial<InsertProceso>): Promise<ProcesoDTO | undefined> {
    const processedUpdates = {
      ...updates,
      state: updates.state ?? true,
      ...(updates.fechaCreacion ? { fechaCreacion: new Date(updates.fechaCreacion) } : {}),
    };

    await this.db.update(procesos).set(processedUpdates).where(eq(procesos.id, id));
    return this.getProceso(id);
  }

  async deleteProceso(id: string): Promise<void> {
    await this.db.delete(procesos).where(eq(procesos.id, id));
  }

  // Get lawyers assigned to a proceso
  async getProcesoLawyers(procesoId: string) {
    return this.db
      .select()
      .from(procesoLawyers)
      .where(eq(procesoLawyers.procesoId, procesoId));
  }

  // Assign a lawyer to a proceso
  async addLawyerToProceso(
    procesoId: string,
    lawyerId: string,
    options: {
      rol?: string;
      tipoAsignacionId?: number | null;
      razonAsignacion?: string | null;
      asignadoPor?: string | null;
      fechaFin?: Date | null;
      status?: string;
    } = {}
  ) {
    const id = randomUUID();
    await this.db.insert(procesoLawyers).values({
      id,
      procesoId,
      lawyerId,
      rol: options.rol ?? "responsable",
      tipoAsignacionId: options.tipoAsignacionId ?? null,
      razonAsignacion: options.razonAsignacion ?? null,
      asignadoPor: options.asignadoPor ?? null,
      fechaFin: options.fechaFin ?? null,
      status: options.status ?? "activo",
    });
  }

  // Remove a lawyer from a proceso
  async removeLawyerFromProceso(procesoId: string, lawyerId: string) {
    await this.db
      .delete(procesoLawyers)
      .where(and(
        eq(procesoLawyers.procesoId, procesoId),
        eq(procesoLawyers.lawyerId, lawyerId)
      ));
  }

  async getProcesosByClienteAndLawyer(
    lawyerId: string,
    clienteId: string,
    limit: number = 10,
    offset: number = 0,
    filter?: ProcesoFilter
  ): Promise<{ data: ProcesoDTO[]; total: number }> {
    const lawyerProcesoIds = await this.db
      .select({ procesoId: procesoLawyers.procesoId })
      .from(procesoLawyers)
      .where(eq(procesoLawyers.lawyerId, lawyerId));

    const responsableProcesoIds = await this.db
      .select({ procesoId: procesoResponsables.procesoId })
      .from(procesoResponsables)
      .where(and(
        eq(procesoResponsables.lawyerId, lawyerId),
        eq(procesoResponsables.activo, true)
      ));

    const procesoIds = [...new Set([
      ...lawyerProcesoIds.map(p => p.procesoId),
      ...responsableProcesoIds.map(p => p.procesoId),
    ])];

    if (procesoIds.length === 0) {
      return { data: [], total: 0 };
    }

    const conditions: any[] = [
      inArray(procesos.id, procesoIds),
      eq(procesos.clienteId, clienteId),
    ];

    if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
      conditions.push(eq(estadosProceso.codigo, filter.estadoCodigo));
    }

    if (filter?.search) {
      const search = `%${filter.search}%`;
      conditions.push(
        sql`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search})
      )`
      );
    }

    // Get total
    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions));

    // Get paginated data
    const results = await this.db
      .select({
        id: procesos.id,
        state: procesos.state,
        fechaCreacion: procesos.fechaCreacion,
        clienteId: procesos.clienteId,
        tipoProcesoId: procesos.tipoProcesoId,
        radicado: procesos.radicado,
        juzgado: procesos.juzgado,
        estadoId: procesos.estadoId,
        descripcionEstado: procesos.descripcionEstado,
        clienteNombre: clientes.nombre,
        tipoProcesoNombre: tiposProceso.nombre,
        estadoIdRel: estadosProceso.id,
        estadoCodigo: estadosProceso.codigo,
        estadoNombre: estadosProceso.nombre,
        estadoColor: estadosProceso.color,
      })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions))
      .orderBy(desc(procesos.fechaCreacion))
      .limit(limit)
      .offset(offset);

    const data = results.map(p => ({
      id: p.id,
      state: p.state,
      fechaCreacion: p.fechaCreacion,
      clienteId: p.clienteId,
      tipoProcesoId: p.tipoProcesoId,
      radicado: p.radicado,
      juzgado: p.juzgado,
      estadoId: p.estadoId,
      descripcionEstado: p.descripcionEstado,
      clienteNombre: p.clienteNombre || "Sin cliente",
      estado: p.estadoIdRel
        ? {
          id: p.estadoIdRel,
          codigo: p.estadoCodigo || "",
          nombre: p.estadoNombre || "",
          color: p.estadoColor || "",
        }
        : null,
    }));

    return { data, total: Number(count) };
  }
  async getProcesoByAbogadoIdAndProcesoId(
    lawyerId: string,
    procesoId: string
  ): Promise<ProcesoDTO | undefined> {
    // Verificar acceso: asignado en junction table O es el responsable activo
    const [lawyerProceso, responsableProceso] = await Promise.all([
      this.db
        .select({ procesoId: procesoLawyers.procesoId })
        .from(procesoLawyers)
        .where(and(
          eq(procesoLawyers.lawyerId, lawyerId),
          eq(procesoLawyers.procesoId, procesoId)
        ))
        .limit(1),
      this.db
        .select({ procesoId: procesoResponsables.procesoId })
        .from(procesoResponsables)
        .where(and(
          eq(procesoResponsables.procesoId, procesoId),
          eq(procesoResponsables.lawyerId, lawyerId),
          eq(procesoResponsables.activo, true)
        ))
        .limit(1),
    ]);

    if (lawyerProceso.length === 0 && responsableProceso.length === 0) return undefined;

    const rawProceso = await this.db.query.procesos.findFirst({
      where: eq(procesos.id, procesoId),
      with: {
        cliente: true,
        tipoProceso: true,
        estado: true,
        lawyers: {
          with: {
            lawyer: true,
            tipoAsignacion: true,
            asignadoPorUser: {
              columns: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
    if (!rawProceso) return undefined;
    const responsableMeta = await this.getActiveResponsable(procesoId);
    return {
      id: rawProceso.id,
      state: rawProceso.state,
      fechaCreacion: rawProceso.fechaCreacion,
      clienteId: rawProceso.clienteId,
      tipoProcesoId: rawProceso.tipoProcesoId,
      radicado: rawProceso.radicado,
      juzgado: rawProceso.juzgado,
      estadoId: rawProceso.estadoId,
      descripcionEstado: rawProceso.descripcionEstado,
      responsable: responsableMeta?.lawyer ?? null,
      responsableFechaAsignacion: responsableMeta?.fechaInicio ?? null,
      responsableRazon: responsableMeta?.razon ?? null,
      responsableAsignadoPorNombre: responsableMeta?.asignadoPorNombre ?? null,
      clienteNombre: rawProceso.cliente?.nombre || "Sin cliente",
      cliente: rawProceso.cliente,
      tipoProceso: rawProceso.tipoProceso ?? null,
      estado: rawProceso.estado ?? null,
      lawyers: rawProceso.lawyers.map(l => ({
        id: l.id,
        procesoId: l.procesoId,
        lawyerId: l.lawyerId,
        tipoAsignacionId: l.tipoAsignacionId ?? null,
        rol: l.rol,
        razonAsignacion: l.razonAsignacion ?? null,
        fechaAsignacion: l.fechaAsignacion,
        fechaFin: l.fechaFin ?? null,
        asignadoPor: l.asignadoPor ?? null,
        status: l.status,
        lawyer: l.lawyer,
        tipoAsignacion: l.tipoAsignacion ?? null,
        asignadoPorUser: l.asignadoPorUser ?? null,
      })) as ProcesoLawyerWithLawyer[],
    };
  }
  // Helper privado reutilizable
  private async getResponsablesMap(procesoIds: string[]): Promise<Map<string, {
    lawyer: typeof lawyerProfiles.$inferSelect;
    fechaInicio: Date;
    razon: string | null;
    asignadoPorNombre: string | null;
  }>> {
    const map = new Map();
    if (procesoIds.length === 0) return map;

    const rows = await this.db
      .select({
        procesoId: procesoResponsables.procesoId,
        lawyer: lawyerProfiles,
        fechaInicio: procesoResponsables.fechaInicio,
        razon: procesoResponsables.razon,
        asignadoPorNombre: procesoResponsables.asignadoPorNombre,
      })
      .from(procesoResponsables)
      .innerJoin(lawyerProfiles, eq(procesoResponsables.lawyerId, lawyerProfiles.id))
      .where(and(
        inArray(procesoResponsables.procesoId, procesoIds),
        eq(procesoResponsables.activo, true)
      ));

    for (const r of rows) {
      map.set(r.procesoId, {
        lawyer: r.lawyer,
        fechaInicio: r.fechaInicio,
        razon: r.razon,
        asignadoPorNombre: r.asignadoPorNombre,
      });
    }

    return map;
  }

  // Helper para mapear resultado a DTO
  private mapToProcesoDTO(
    p: any,
    responsablesMap: Map<string, any>
  ): ProcesoDTO {
    const responsableMeta = responsablesMap.get(p.id);
    return {
      id: p.id,
      state: p.state,
      fechaCreacion: p.fechaCreacion,
      clienteId: p.clienteId,
      tipoProcesoId: p.tipoProcesoId,
      radicado: p.radicado,
      juzgado: p.juzgado,
      estadoId: p.estadoId,
      descripcionEstado: p.descripcionEstado,
      clienteNombre: p.clienteNombre || "Sin cliente",
      clienteUserId: p.clienteUserId || undefined,
      estado: p.estadoIdRel ? {
        id: p.estadoIdRel,
        codigo: p.estadoCodigo || "",
        nombre: p.estadoNombre || "",
        color: p.estadoColor || "",
      } : null,
      responsable: responsableMeta?.lawyer ?? null,
      responsableFechaAsignacion: responsableMeta?.fechaInicio ?? null,
      responsableRazon: responsableMeta?.razon ?? null,
      responsableAsignadoPorNombre: responsableMeta?.asignadoPorNombre ?? null,
    };
  }

  async getProcesosByFirma(
    firmId: string,
    limit: number = 10,
    offset: number = 0,
    filter?: ProcesoFilter
  ): Promise<{ data: ProcesoDTO[]; total: number }> {

    // 1. IDs de abogados de la firma + la firma misma
    const firmLawyers = await this.db
      .select({ lawyerId: lawyerProfiles.id })
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.firmId, firmId));

    const allLawyerIds = [...new Set([...firmLawyers.map(l => l.lawyerId), firmId])];

    // 2. Procesos asociados a la firma
    const firmProcesoIds = await this.db
      .select({ procesoId: procesoLawyers.procesoId })
      .from(procesoLawyers)
      .where(inArray(procesoLawyers.lawyerId, allLawyerIds));

    const procesoIds = [...new Set(firmProcesoIds.map(p => p.procesoId))];
    if (procesoIds.length === 0) return { data: [], total: 0 };

    // 3. Alias para joins del responsable — declarar ANTES de conditions
    const responsableLawyer = alias(lawyerProfiles, 'responsableLawyer');
    const responsableJoin = alias(procesoResponsables, 'responsableJoin');

    // 4. Condiciones de filtro
    const conditions: any[] = [inArray(procesos.id, procesoIds)];

    if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
      conditions.push(eq(estadosProceso.codigo, filter.estadoCodigo));
    }

    if (filter?.search) {
      const search = `%${filter.search}%`;
      conditions.push(
        sql`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(${clientes.nombre}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search}) OR
        LOWER(CONCAT(${responsableLawyer.firstName}, ' ', ${responsableLawyer.lastName})) LIKE LOWER(${search})
      )`
      );
    }

    if (filter?.hasResponsable !== undefined) {
      if (filter.hasResponsable) {
        conditions.push(sql`EXISTS (
        SELECT 1 FROM proceso_responsables pr
        WHERE pr.proceso_id = ${procesos.id} AND pr.activo = 1
      )`);
      } else {
        conditions.push(sql`NOT EXISTS (
        SELECT 1 FROM proceso_responsables pr
        WHERE pr.proceso_id = ${procesos.id} AND pr.activo = 1
      )`);
      }
    }

    // 5. Condición join responsable
    const joinConditions = and(
      eq(responsableJoin.procesoId, procesos.id),
      eq(responsableJoin.activo, true)
    );

    // 6. Count total
    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .leftJoin(responsableJoin, joinConditions)
      .leftJoin(responsableLawyer, eq(responsableJoin.lawyerId, responsableLawyer.id))
      .where(and(...conditions));

    // 7. Resultados paginados
    const results = await this.db
      .select({
        id: procesos.id,
        state: procesos.state,
        fechaCreacion: procesos.fechaCreacion,
        clienteId: procesos.clienteId,
        tipoProcesoId: procesos.tipoProcesoId,
        radicado: procesos.radicado,
        juzgado: procesos.juzgado,
        estadoId: procesos.estadoId,
        descripcionEstado: procesos.descripcionEstado,
        clienteNombre: clientes.nombre,
        clienteUserId: clientes.userId,
        estadoIdRel: estadosProceso.id,
        estadoCodigo: estadosProceso.codigo,
        estadoNombre: estadosProceso.nombre,
        estadoColor: estadosProceso.color,
        responsableId: responsableLawyer.id,
        responsableFirstName: responsableLawyer.firstName,
        responsableLastName: responsableLawyer.lastName,
        responsableNombre: sql<string>`CONCAT(${responsableLawyer.firstName}, ' ', ${responsableLawyer.lastName})`,
        responsableFechaInicio: responsableJoin.fechaInicio,
        responsableRazon: responsableJoin.razon,
        responsableAsignadoPorNombre: responsableJoin.asignadoPorNombre,
      })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .leftJoin(responsableJoin, joinConditions)
      .leftJoin(responsableLawyer, eq(responsableJoin.lawyerId, responsableLawyer.id))
      .where(and(...conditions))
      .orderBy(desc(procesos.fechaCreacion))
      .limit(limit)
      .offset(offset);

    // 8. Mapear resultados
    const data = results.map(p => ({
      id: p.id,
      state: p.state,
      fechaCreacion: p.fechaCreacion,
      clienteId: p.clienteId,
      tipoProcesoId: p.tipoProcesoId,
      radicado: p.radicado,
      juzgado: p.juzgado,
      estadoId: p.estadoId,
      descripcionEstado: p.descripcionEstado,
      clienteNombre: p.clienteNombre || "Sin cliente",
      clienteUserId: p.clienteUserId || undefined,
      estado: p.estadoIdRel ? {
        id: p.estadoIdRel,
        codigo: p.estadoCodigo || "",
        nombre: p.estadoNombre || "",
        color: p.estadoColor || "",
      } : null,
      responsable: p.responsableId ? {
        id: p.responsableId,
        firstName: p.responsableFirstName ?? '',
        lastName: p.responsableLastName ?? '',
        nombre: p.responsableNombre?.trim() ?? '',
      } : null,
      responsableFechaAsignacion: p.responsableFechaInicio ?? null,
      responsableRazon: p.responsableRazon ?? null,
      responsableAsignadoPorNombre: p.responsableAsignadoPorNombre ?? null,
    })) as ProcesoDTO[];

    return { data, total: Number(count) };
  }

  async getProcesosByClienteAndFirma(
    firmId: string,
    clienteId: string,
    limit: number = 10,
    offset: number = 0,
    filter?: ProcesoFilter
  ): Promise<{ data: ProcesoDTO[]; total: number }> {

    // 1. IDs de abogados de la firma + la firma misma
    const firmLawyers = await this.db
      .select({ lawyerId: lawyerProfiles.id })
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.firmId, firmId));

    const allLawyerIds = [...new Set([...firmLawyers.map(l => l.lawyerId), firmId])];

    // 2. Procesos asociados a la firma
    const firmProcesoIds = await this.db
      .select({ procesoId: procesoLawyers.procesoId })
      .from(procesoLawyers)
      .where(inArray(procesoLawyers.lawyerId, allLawyerIds));

    const procesoIds = [...new Set(firmProcesoIds.map(p => p.procesoId))];
    if (procesoIds.length === 0) return { data: [], total: 0 };

    // 3. Condiciones: firma + cliente específico
    const conditions: any[] = [
      inArray(procesos.id, procesoIds),
      eq(procesos.clienteId, clienteId),
    ];

    if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
      conditions.push(eq(estadosProceso.codigo, filter.estadoCodigo));
    }

    if (filter?.search) {
      const search = `%${filter.search}%`;
      conditions.push(
        sql`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search})
      )`
      );
    }

    // 4. Count total
    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions));

    // 5. Resultados paginados
    const results = await this.db
      .select({
        id: procesos.id,
        state: procesos.state,
        fechaCreacion: procesos.fechaCreacion,
        clienteId: procesos.clienteId,
        tipoProcesoId: procesos.tipoProcesoId,
        radicado: procesos.radicado,
        juzgado: procesos.juzgado,
        estadoId: procesos.estadoId,
        descripcionEstado: procesos.descripcionEstado,
        clienteNombre: clientes.nombre,
        clienteUserId: clientes.userId,
        estadoIdRel: estadosProceso.id,
        estadoCodigo: estadosProceso.codigo,
        estadoNombre: estadosProceso.nombre,
        estadoColor: estadosProceso.color,
      })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions))
      .orderBy(desc(procesos.fechaCreacion))
      .limit(limit)
      .offset(offset);

    // 6. Responsables solo de los IDs paginados
    const responsablesMap = await this.getResponsablesMap(results.map(p => p.id));

    return {
      data: results.map(p => this.mapToProcesoDTO(p, responsablesMap)),
      total: Number(count),
    };
  }

  async getProcesoByFirmaIdAndProcesoId(
    firmId: string,
    procesoId: string
  ): Promise<ProcesoDTO | undefined> {

    const firmLawyers = await this.db
      .select({ lawyerId: lawyerProfiles.id })
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.firmId, firmId));

    const lawyerIds = firmLawyers.map(l => l.lawyerId);

    const allLawyerIds = [...new Set([...lawyerIds, firmId])];

    const procesoAsignado = await this.db
      .select({ procesoId: procesoLawyers.procesoId })
      .from(procesoLawyers)
      .where(
        and(
          inArray(procesoLawyers.lawyerId, allLawyerIds),
          eq(procesoLawyers.procesoId, procesoId)
        )
      )
      .limit(1);

    if (procesoAsignado.length === 0) return undefined;

    // Traer proceso con todas sus relaciones
    const rawProceso = await this.db.query.procesos.findFirst({
      where: eq(procesos.id, procesoId),
      with: {
        cliente: true,
        tipoProceso: true,
        estado: true,
        lawyers: {
          with: {
            lawyer: true,
            tipoAsignacion: true,
            asignadoPorUser: {
              columns: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!rawProceso) return undefined;

    const responsableMeta = await this.getActiveResponsable(procesoId);

    return {
      id: rawProceso.id,
      state: rawProceso.state,
      fechaCreacion: rawProceso.fechaCreacion,
      clienteId: rawProceso.clienteId,
      tipoProcesoId: rawProceso.tipoProcesoId,
      radicado: rawProceso.radicado,
      juzgado: rawProceso.juzgado,
      estadoId: rawProceso.estadoId,
      descripcionEstado: rawProceso.descripcionEstado,
      responsable: responsableMeta?.lawyer ?? null,
      responsableFechaAsignacion: responsableMeta?.fechaInicio ?? null,
      responsableRazon: responsableMeta?.razon ?? null,
      responsableAsignadoPorNombre: responsableMeta?.asignadoPorNombre ?? null,
      clienteNombre: rawProceso.cliente?.nombre || "Sin cliente",
      cliente: rawProceso.cliente,
      tipoProceso: rawProceso.tipoProceso ?? null,
      estado: rawProceso.estado ?? null,
      lawyers: rawProceso.lawyers.map(l => ({
        id: l.id,
        procesoId: l.procesoId,
        lawyerId: l.lawyerId,
        tipoAsignacionId: l.tipoAsignacionId ?? null,
        rol: l.rol,
        razonAsignacion: l.razonAsignacion ?? null,
        fechaAsignacion: l.fechaAsignacion,
        fechaFin: l.fechaFin ?? null,
        asignadoPor: l.asignadoPor ?? null,
        status: l.status,
        lawyer: l.lawyer,
        tipoAsignacion: l.tipoAsignacion ?? null,
        asignadoPorUser: l.asignadoPorUser ?? null,
      })) as ProcesoLawyerWithLawyer[],
    };
  }

  async getProcesoByClienteIdAndProcesoId(
    clienteId: string,
    procesoId: string
  ): Promise<ProcesoDTO | undefined> {

    // Verificar que el proceso pertenece al cliente
    const procesoCliente = await this.db
      .select({ id: procesos.id })
      .from(procesos)
      .where(
        and(
          eq(procesos.id, procesoId),
          eq(procesos.clienteId, clienteId)
        )
      )
      .limit(1);

    if (procesoCliente.length === 0) return undefined;

    const rawProceso = await this.db.query.procesos.findFirst({
      where: eq(procesos.id, procesoId),
      with: {
        cliente: true,
        tipoProceso: true,
        estado: true,
        lawyers: {
          with: {
            lawyer: true,
            tipoAsignacion: true,
            asignadoPorUser: {
              columns: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!rawProceso) return undefined;

    const responsableMeta = await this.getActiveResponsable(procesoId);

    return {
      id: rawProceso.id,
      state: rawProceso.state,
      fechaCreacion: rawProceso.fechaCreacion,
      clienteId: rawProceso.clienteId,
      tipoProcesoId: rawProceso.tipoProcesoId,
      radicado: rawProceso.radicado,
      juzgado: rawProceso.juzgado,
      estadoId: rawProceso.estadoId,
      descripcionEstado: rawProceso.descripcionEstado,
      clienteNombre: rawProceso.cliente?.nombre || "Sin cliente",

      cliente: rawProceso.cliente ?? null,
      tipoProceso: rawProceso.tipoProceso ?? null,
      estado: rawProceso.estado ?? null,

      lawyers: rawProceso.lawyers.map(l => ({
        id: l.id,
        procesoId: l.procesoId,
        lawyerId: l.lawyerId,
        rol: l.rol,
        status: l.status,
        lawyer: l.lawyer,
      })) as ProcesoLawyerWithLawyer[],

      responsable: responsableMeta?.lawyer ?? null,
      responsableFechaAsignacion: responsableMeta?.fechaInicio ?? null,
      responsableRazon: responsableMeta?.razon ?? null,
      responsableAsignadoPorNombre: responsableMeta?.asignadoPorNombre ?? null,
    };
  }

}
