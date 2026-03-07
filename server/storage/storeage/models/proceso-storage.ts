
/**
 * Proceso Storage
 * Handles all database operations for processes (procesos)
 */

import { ProcesoFilter } from "@/server/services";
import { randomUUID } from "crypto";
import { eq, and, desc, like, sql, SQL, inArray } from "drizzle-orm";

import { clientes, estadosProceso, InsertProceso, lawyerProfiles, ProcesoDTO, procesoLawyers, ProcesoLawyerWithLawyer, procesos, tiposProceso } from "@/shared/schema";

import { Database } from "../database-storage";
import { promises } from "dns";



export class ProcesoStorage {
  constructor(private db: Database) { }

  async getProcesos(
    lawyerId: string,
    limit: number = 10,
    offset: number = 0,
    filter?: ProcesoFilter
  ): Promise<{ data: ProcesoDTO[]; total: number }> {
    // Get proceso IDs associated with this lawyer
    const lawyerProcesoIds = await this.db
      .select({ procesoId: procesoLawyers.procesoId })
      .from(procesoLawyers)
      .where(eq(procesoLawyers.lawyerId, lawyerId));

    const procesoIds = [...new Set(lawyerProcesoIds.map(p => p.procesoId))];

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

    const procesoIds = [...new Set(lawyerProcesoIds.map(p => p.procesoId))];

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
      rol: options.rol ?? "asistente",
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
    // Get proceso IDs associated with this lawyer
    const lawyerProcesoIds = await this.db
      .select({ procesoId: procesoLawyers.procesoId })
      .from(procesoLawyers)
      .where(eq(procesoLawyers.lawyerId, lawyerId));

    const procesoIds = [...new Set(lawyerProcesoIds.map(p => p.procesoId))];

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
    // Verificar que el abogado tiene acceso al proceso
    const lawyerProceso = await this.db
      .select({ procesoId: procesoLawyers.procesoId })
      .from(procesoLawyers)
      .where(
        and(
          eq(procesoLawyers.lawyerId, lawyerId),
          eq(procesoLawyers.procesoId, procesoId)
        )
      )
      .limit(1);

    if (lawyerProceso.length === 0) return undefined;

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
  async getProcesosByFirma(
  firmId: string,
  limit: number = 10,
  offset: number = 0,
  filter?: ProcesoFilter
): Promise<{ data: ProcesoDTO[]; total: number }> {
  // Obtener IDs de abogados de la firma
  const firmLawyers = await this.db
    .select({ lawyerId: lawyerProfiles.id })
    .from(lawyerProfiles)
    .where(eq(lawyerProfiles.firmId, firmId));

  const lawyerIds = firmLawyers.map(l => l.lawyerId);

  if (lawyerIds.length === 0) return { data: [], total: 0 };

  // Obtener IDs de procesos asociados a esos abogados
  const firmProcesoIds = await this.db
    .select({ procesoId: procesoLawyers.procesoId })
    .from(procesoLawyers)
    .where(inArray(procesoLawyers.lawyerId, lawyerIds));

  const procesoIds = [...new Set(firmProcesoIds.map(p => p.procesoId))];

  if (procesoIds.length === 0) return { data: [], total: 0 };

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

  const [{ count }] = await this.db
    .select({ count: sql<number>`COUNT(*)` })
    .from(procesos)
    .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
    .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
    .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
    .where(and(...conditions));

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
    estado: p.estadoIdRel ? {
      id: p.estadoIdRel,
      codigo: p.estadoCodigo || "",
      nombre: p.estadoNombre || "",
      color: p.estadoColor || "",
    } : null,
  }));

  return { data, total: Number(count) };
}

async getProcesosByClienteAndFirma(
  firmId: string,
  clienteId: string,
  limit: number = 10,
  offset: number = 0,
  filter?: ProcesoFilter
): Promise<{ data: ProcesoDTO[]; total: number }> {
  // Obtener IDs de abogados de la firma
  const firmLawyers = await this.db
    .select({ lawyerId: lawyerProfiles.id })
    .from(lawyerProfiles)
    .where(eq(lawyerProfiles.firmId, firmId));

  const lawyerIds = firmLawyers.map(l => l.lawyerId);

  if (lawyerIds.length === 0) return { data: [], total: 0 };

  // Obtener IDs de procesos de esos abogados
  const firmProcesoIds = await this.db
    .select({ procesoId: procesoLawyers.procesoId })
    .from(procesoLawyers)
    .where(inArray(procesoLawyers.lawyerId, lawyerIds));

  const procesoIds = [...new Set(firmProcesoIds.map(p => p.procesoId))];

  if (procesoIds.length === 0) return { data: [], total: 0 };

  const conditions: any[] = [
    inArray(procesos.id, procesoIds),
    eq(procesos.clienteId, clienteId),  // ✅ filtro por cliente
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

  const [{ count }] = await this.db
    .select({ count: sql<number>`COUNT(*)` })
    .from(procesos)
    .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
    .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
    .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
    .where(and(...conditions));

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
    estado: p.estadoIdRel ? {
      id: p.estadoIdRel,
      codigo: p.estadoCodigo || "",
      nombre: p.estadoNombre || "",
      color: p.estadoColor || "",
    } : null,
  }));

  return { data, total: Number(count) };
}

async getProcesoByFirmaIdAndProcesoId(
  firmId: string,
  procesoId: string
): Promise<ProcesoDTO | undefined> {
  // Verificar que el proceso pertenece a un abogado de la firma
  const firmLawyers = await this.db
    .select({ lawyerId: lawyerProfiles.id })
    .from(lawyerProfiles)
    .where(eq(lawyerProfiles.firmId, firmId));

  const lawyerIds = firmLawyers.map(l => l.lawyerId);

  if (lawyerIds.length === 0) return undefined;

  const procesoAsignado = await this.db
    .select({ procesoId: procesoLawyers.procesoId })
    .from(procesoLawyers)
    .where(
      and(
        inArray(procesoLawyers.lawyerId, lawyerIds),
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
  };
}

}
