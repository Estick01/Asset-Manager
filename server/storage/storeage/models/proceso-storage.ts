


/**
 * Proceso Storage
 * Handles all database operations for processes (procesos)
 */

import { ProcesoFilter } from "@/server/services";
import { randomUUID } from "crypto";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { clientes, clientesNatural, clientesEmpresa, personas, departamentos, municipios, estadosProceso, InsertProceso, lawyerProfiles, ProcesoDTO, procesoLawyers, ProcesoLawyerWithLawyer, procesos, procesoResponsables, tiposProceso, representantesLegales, LawyerProfile, firmProfiles, procesoOwnership } from "@/shared/schema";
import { Database } from "../database-storage";
import { alias } from 'drizzle-orm/mysql-core';



export class ProcesoStorage {
  constructor(private db: Database) { }

  private async getActiveResponsable(procesoId: string): Promise<{
    lawyer: LawyerProfile;
    fechaInicio: Date;
    razon: string | null;
    asignadoPorNombre: string | null;
  } | null> {
    const personasResponsable = alias(personas, 'personasResponsable');
    const result = await this.db
      .select({
        lawyer: lawyerProfiles,
        personaId: personasResponsable.id,
        personaNombre: personasResponsable.nombre,
        personaApellido: personasResponsable.apellido,
        personaTelefono: personasResponsable.telefono,
        personaDocumento: personasResponsable.documento,
        personaDireccion: personasResponsable.direccion,
        personaTipoDocumentoId: personasResponsable.tipoDocumentoId,
        personaDepartamentoId: personasResponsable.departamentoId,
        personaMunicipioId: personasResponsable.municipioId,
        fechaInicio: procesoResponsables.fechaInicio,
        razon: procesoResponsables.razon,
        asignadoPorNombre: procesoResponsables.asignadoPorNombre,
      })
      .from(procesoResponsables)
      .innerJoin(lawyerProfiles, eq(procesoResponsables.lawyerId, lawyerProfiles.id))
      .leftJoin(personasResponsable, eq(lawyerProfiles.personaId, personasResponsable.id))
      .where(and(
        eq(procesoResponsables.procesoId, procesoId),
        eq(procesoResponsables.activo, true)
      ))
      .limit(1);

    if (!result[0]) return null;
    const r = result[0];
    return {
      lawyer: {
        ...r.lawyer,
        persona: r.personaId ? {
          id: r.personaId,
          nombre: r.personaNombre ?? '',
          apellido: r.personaApellido ?? '',
          telefono: r.personaTelefono ?? '',
          documento: r.personaDocumento ?? '',
          direccion: r.personaDireccion ?? '',
          tipoDocumentoId: r.personaTipoDocumentoId ?? 0,
          departamentoId: r.personaDepartamentoId ,
          municipioId: r.personaMunicipioId,

        } : null,
      },
      fechaInicio: r.fechaInicio,
      razon: r.razon,
      asignadoPorNombre: r.asignadoPorNombre,
    };
  }

  async getProcesos(
  lawyerId: string,
  limit: number = 10,
  offset: number = 0,
  filter?: ProcesoFilter
): Promise<{ data: ProcesoDTO[]; total: number }> {

  // 1. IDs de procesos del abogado (junction + responsable activo + ownership directo)
  const [lawyerProcesoIds, responsableProcesoIds, ownedProcesoIds] = await Promise.all([
    this.db
      .select({ procesoId: procesoLawyers.procesoId })
      .from(procesoLawyers)
      .where(eq(procesoLawyers.lawyerId, lawyerId)),
    this.db
      .select({ procesoId: procesoResponsables.procesoId })
      .from(procesoResponsables)
      .where(and(
        eq(procesoResponsables.lawyerId, lawyerId),
        eq(procesoResponsables.activo, true)
      )),
    this.db
      .select({ procesoId: procesoOwnership.procesoId })
      .from(procesoOwnership)
      .where(and(
        eq(procesoOwnership.ownerType, "abogado"),
        eq(procesoOwnership.ownerId, lawyerId),
        sql`${procesoOwnership.activoUnique} = 1`,
      )),
  ]);

  const procesoIds = [...new Set([
    ...lawyerProcesoIds.map(p => p.procesoId),
    ...responsableProcesoIds.map(p => p.procesoId),
    ...ownedProcesoIds.map(p => p.procesoId),
  ])];

  if (procesoIds.length === 0) return { data: [], total: 0 };

  // 2. Alias — igual que getProcesosByFirma
  const responsableLawyer    = alias(lawyerProfiles,         'responsableLawyer');
  const responsableJoin      = alias(procesoResponsables,    'responsableJoin');
  const personasResponsable  = alias(personas,               'personasResponsable');
  const personasCliente      = alias(personas,               'personasCliente');
  const deptosCliente        = alias(departamentos,          'deptosCliente');
  const municipiosCliente    = alias(municipios,             'municipiosCliente');
  const repLegal             = alias(representantesLegales,  'repLegal');
  const personasRepLegal     = alias(personas,               'personasRepLegal');

  // 3. Condiciones de filtro
  const conditions: any[] = [inArray(procesos.id, procesoIds), eq(procesos.state, true)];

  if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
    conditions.push(eq(estadosProceso.codigo, filter.estadoCodigo));
  }

  if (filter?.search) {
    const search = `%${filter.search}%`;
    conditions.push(
      sql`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido})) LIKE LOWER(${search}) OR
        LOWER(${clientesEmpresa.razonSocial}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search}) OR
        LOWER(CONCAT(${personasResponsable.nombre}, ' ', ${personasResponsable.apellido})) LIKE LOWER(${search})
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

  // 4. Condición join responsable
  const joinConditions = and(
    eq(responsableJoin.procesoId, procesos.id),
    eq(responsableJoin.activo, true)
  );

  // 5. Joins reutilizables
  const baseJoins = (qb: any) => qb
    .leftJoin(clientes,           eq(procesos.clienteId,              clientes.id))
    .leftJoin(clientesNatural,    eq(clientes.id,                     clientesNatural.clienteId))
    .leftJoin(personasCliente,    eq(clientesNatural.personaId,       personasCliente.id))
    .leftJoin(deptosCliente,      eq(personasCliente.departamentoId,  deptosCliente.id))
    .leftJoin(municipiosCliente,  eq(personasCliente.municipioId,     municipiosCliente.id))
    .leftJoin(clientesEmpresa,    eq(clientes.id,                     clientesEmpresa.clienteId))
    .leftJoin(repLegal,           eq(clientesEmpresa.representanteLegalId, repLegal.id))
    .leftJoin(personasRepLegal,   eq(repLegal.personaId,              personasRepLegal.id))
    .leftJoin(estadosProceso,     eq(procesos.estadoId,               estadosProceso.id))
    .leftJoin(tiposProceso,       eq(procesos.tipoProcesoId,          tiposProceso.id))
    .leftJoin(responsableJoin,    joinConditions)
    .leftJoin(responsableLawyer,  eq(responsableJoin.lawyerId,        responsableLawyer.id))
    .leftJoin(personasResponsable,eq(responsableLawyer.personaId,     personasResponsable.id));

  // 6. Count total
  const [{ count }] = await baseJoins(
    this.db.select({ count: sql<number>`COUNT(*)` }).from(procesos)
  ).where(and(...conditions));

  // 7. Resultados paginados
  const results = await baseJoins(
    this.db.select({
      id: procesos.id,
      state: procesos.state,
      fechaCreacion: procesos.fechaCreacion,
      clienteId: procesos.clienteId,
      tipoProcesoId: procesos.tipoProcesoId,
      radicado: procesos.radicado,
      juzgado: procesos.juzgado,
      estadoId: procesos.estadoId,
      descripcionEstado: procesos.descripcionEstado,
      clienteNombre: sql<string>`COALESCE(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido}), ${clientesEmpresa.razonSocial}, 'Sin cliente')`,
      clienteUserId: clientes.userId,
      tipoCliente: clientes.tipo,
      clienteDocumento: personasCliente.documento,
      clienteTelefono: personasCliente.telefono,
      clienteDepartamentoId: deptosCliente.id,
      clienteDepartamentoNombre: deptosCliente.nombre,
      clienteMunicipioId: municipiosCliente.id,
      clienteMunicipioNombre: municipiosCliente.nombre,
      repLegalId: repLegal.id,
      repLegalCargo: repLegal.cargo,
      repLegalEmail: repLegal.email,
      repLegalNombre: personasRepLegal.nombre,
      repLegalApellido: personasRepLegal.apellido,
      repLegalDocumento: personasRepLegal.documento,
      repLegalTelefono: personasRepLegal.telefono,
      tipoProcesoNombre: tiposProceso.nombre,
      estadoIdRel: estadosProceso.id,
      estadoCodigo: estadosProceso.codigo,
      estadoNombre: estadosProceso.nombre,
      estadoColor: estadosProceso.color,
      responsableLawyerData: responsableLawyer,
      responsablePersonaId: personasResponsable.id,
      responsablePersonaNombre: personasResponsable.nombre,
      responsablePersonaApellido: personasResponsable.apellido,
      responsablePersonaTelefono: personasResponsable.telefono,
      responsablePersonaDocumento: personasResponsable.documento,
      responsablePersonaDireccion: personasResponsable.direccion,
      responsablePersonaTipoDocumentoId: personasResponsable.tipoDocumentoId,
      responsablePersonaDepartamentoId: personasResponsable.departamentoId,
      responsablePersonaMunicipioId: personasResponsable.municipioId,
      responsableFechaInicio: responsableJoin.fechaInicio,
      responsableRazon: responsableJoin.razon,
      responsableAsignadoPorNombre: responsableJoin.asignadoPorNombre,
    }).from(procesos)
  ).where(and(...conditions))
    .orderBy(desc(procesos.fechaCreacion))
    .limit(limit)
    .offset(offset);

  // 8. Mapear — idéntico a getProcesosByFirma
  const data = results.map((p:any) => ({
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
    tipoCliente: p.tipoCliente ?? null,
    clienteDocumento: p.clienteDocumento ?? null,
    clienteTelefono: p.clienteTelefono ?? null,
    clienteDepartamento: p.clienteDepartamentoId ? {
      id: p.clienteDepartamentoId,
      nombre: p.clienteDepartamentoNombre ?? '',
    } : null,
    clienteMunicipio: p.clienteMunicipioId ? {
      id: p.clienteMunicipioId,
      nombre: p.clienteMunicipioNombre ?? '',
    } : null,
    representanteLegal: p.repLegalId ? {
      id: p.repLegalId,
      cargo: p.repLegalCargo ?? '',
      email: p.repLegalEmail ?? '',
      nombre: p.repLegalNombre ?? '',
      apellido: p.repLegalApellido ?? '',
      documento: p.repLegalDocumento ?? null,
      telefono: p.repLegalTelefono ?? null,
    } : null,
    estado: p.estadoIdRel ? {
      id: p.estadoIdRel,
      codigo: p.estadoCodigo || "",
      nombre: p.estadoNombre || "",
      color: p.estadoColor || "",
    } : null,
    responsable: p.responsableLawyerData ? {
      id: p.responsableLawyerData.id,
      fechaAsignacion: p.responsableFechaInicio ?? null,
      razon: p.responsableRazon ?? null,
      asignadoPorNombre: p.responsableAsignadoPorNombre ?? null,
      lawyer: {
        ...p.responsableLawyerData,
        persona: p.responsablePersonaId ? {
          id: p.responsablePersonaId,
          nombre: p.responsablePersonaNombre ?? '',
          apellido: p.responsablePersonaApellido ?? '',
          telefono: p.responsablePersonaTelefono ?? null,
          documento: p.responsablePersonaDocumento ?? null,
          direccion: p.responsablePersonaDireccion ?? null,
          tipoDocumentoId: p.responsablePersonaTipoDocumentoId ?? 0,
          departamentoId: p.responsablePersonaDepartamentoId ?? null,
          municipioId: p.responsablePersonaMunicipioId ?? null,
        } : null,
      },
    } : null,
  })) as ProcesoDTO[];

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

    const personasCliente = alias(personas, 'personasCliente');
    const conditions: any[] = [inArray(procesos.id, procesoIds), eq(procesos.state, true)];

    if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
      conditions.push(eq(estadosProceso.codigo, filter.estadoCodigo));
    }

    if (filter?.search) {
      const search = `%${filter.search}%`;
      conditions.push(
        sql`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido})) LIKE LOWER(${search}) OR
        LOWER(${clientesEmpresa.razonSocial}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search})
      )`
      );
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(clientesNatural, eq(clientes.id, clientesNatural.clienteId))
      .leftJoin(personasCliente, eq(clientesNatural.personaId, personasCliente.id))
      .leftJoin(clientesEmpresa, eq(clientes.id, clientesEmpresa.clienteId))
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
    const responsableLawyer   = alias(lawyerProfiles,      'responsableLawyer');
    const responsableJoin     = alias(procesoResponsables, 'responsableJoin');
    const personasResponsable = alias(personas,            'personasResponsable');

    const joinConditions = and(
      eq(responsableJoin.procesoId, procesos.id),
      eq(responsableJoin.activo, true)
    );

    const conditions: any[] = [eq(procesos.clienteId, clienteId), eq(procesos.state, true)];

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
        responsableLawyerData: responsableLawyer,
        responsablePersonaId: personasResponsable.id,
        responsablePersonaNombre: personasResponsable.nombre,
        responsablePersonaApellido: personasResponsable.apellido,
        responsableFechaInicio: responsableJoin.fechaInicio,
        responsableRazon: responsableJoin.razon,
        responsableAsignadoPorNombre: responsableJoin.asignadoPorNombre,
      })
      .from(procesos)
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .leftJoin(responsableJoin,   joinConditions)
      .leftJoin(responsableLawyer, eq(responsableJoin.lawyerId, responsableLawyer.id))
      .leftJoin(personasResponsable, eq(responsableLawyer.personaId, personasResponsable.id))
      .where(and(...conditions))
      .orderBy(desc(procesos.fechaCreacion))
      .limit(limit)
      .offset(offset);

    const data = results.map((p: any) => ({
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
      tipoProceso: p.tipoProcesoNombre ? { nombre: p.tipoProcesoNombre } : null,
      estado: p.estadoIdRel ? {
        id: p.estadoIdRel,
        codigo: p.estadoCodigo || "",
        nombre: p.estadoNombre || "",
        color: p.estadoColor || "",
      } : null,
      responsable: p.responsableLawyerData ? {
        id: p.responsableLawyerData.id,
        fechaAsignacion: p.responsableFechaInicio ?? null,
        razon: p.responsableRazon ?? null,
        asignadoPorNombre: p.responsableAsignadoPorNombre ?? null,
        lawyer: {
          ...p.responsableLawyerData,
          persona: p.responsablePersonaId ? {
            id: p.responsablePersonaId,
            nombre: p.responsablePersonaNombre ?? '',
            apellido: p.responsablePersonaApellido ?? '',
          } : null,
        },
      } : null,
    }));

    return { data, total: Number(count) };
  }

  async getProceso(id: string): Promise<ProcesoDTO | undefined> {
    const rawProceso = await this.db.query.procesos.findFirst({
      where: and(eq(procesos.id, id), eq(procesos.state, true)),
      with: {
        cliente: { with: { natural: { with: { persona: true } }, empresa: true } },
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
      responsable: responsableMeta ? {
        id: responsableMeta.lawyer?.id ?? null,
        fechaAsignacion: responsableMeta.fechaInicio ?? null,
        razon: responsableMeta.razon ?? null,
        asignadoPorNombre: responsableMeta.asignadoPorNombre ?? null,
        lawyer: responsableMeta.lawyer ?? null,
      } : null,
      clienteNombre:  this.getClienteNombre(rawProceso.cliente),
      clienteUserId:  rawProceso.cliente?.userId ?? undefined,
      communityPostId: rawProceso.communityPostId ?? null,
      legalStage: rawProceso.legalStage ?? null,
      fechaVencimientoEtapa: rawProceso.fechaVencimientoEtapa ?? null,
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

  /** Vincula un proceso existente con un post de comunidad (bidireccional). */
  async setCommunityPostId(procesoId: string, communityPostId: string | null): Promise<void> {
    await this.db
      .update(procesos)
      .set({ communityPostId })
      .where(eq(procesos.id, procesoId));
  }

  // Obtener todos los procesos donde un abogado es responsable activo
  async getActiveProcesosByResponsable(lawyerId: string): Promise<{ id: string; radicado: string }[]> {
    const rows = await this.db
      .select({ id: procesos.id, radicado: procesos.radicado })
      .from(procesoResponsables)
      .innerJoin(procesos, eq(procesoResponsables.procesoId, procesos.id))
      .where(and(
        eq(procesoResponsables.lawyerId, lawyerId),
        eq(procesoResponsables.activo, true),
        eq(procesos.state, true),
      ));
    return rows;
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
    await this.db.update(procesos).set({ state: false }).where(eq(procesos.id, id));
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

  /**
   * Deactivate a lawyer from multiple procesos (set status = "inactivo").
   * Used when a lawyer leaves a firm.
   */
  async removeAbogadoFromProcesos(lawyerId: string, procesoIds: string[]): Promise<void> {
    if (procesoIds.length === 0) return;
    for (const procesoId of procesoIds) {
      await this.db
        .update(procesoLawyers)
        .set({ status: "inactivo", fechaFin: new Date() })
        .where(and(
          eq(procesoLawyers.lawyerId, lawyerId),
          eq(procesoLawyers.procesoId, procesoId),
          eq(procesoLawyers.status, "activo"),
        ));
    }
  }

  /**
   * Deactivate a lawyer as responsable in multiple procesos.
   * Used when a lawyer leaves a firm.
   */
  async desactivarResponsable(lawyerId: string, procesoIds: string[]): Promise<void> {
    if (procesoIds.length === 0) return;
    for (const procesoId of procesoIds) {
      await this.db
        .update(procesoResponsables)
        .set({ activo: false })
        .where(and(
          eq(procesoResponsables.lawyerId, lawyerId),
          eq(procesoResponsables.procesoId, procesoId),
          eq(procesoResponsables.activo, true),
        ));
    }
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

    const personasCliente = alias(personas, 'personasCliente');

    const conditions: any[] = [
      inArray(procesos.id, procesoIds),
      eq(procesos.clienteId, clienteId),
      eq(procesos.state, true),
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
        LOWER(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido})) LIKE LOWER(${search}) OR
        LOWER(${clientesEmpresa.razonSocial}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search})
      )`
      );
    }

    // Get total
    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(clientesNatural, eq(clientes.id, clientesNatural.clienteId))
      .leftJoin(personasCliente, eq(clientesNatural.personaId, personasCliente.id))
      .leftJoin(clientesEmpresa, eq(clientes.id, clientesEmpresa.clienteId))
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
        clienteNombre: sql<string>`COALESCE(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido}), ${clientesEmpresa.razonSocial}, 'Sin cliente')`,
        tipoProcesoNombre: tiposProceso.nombre,
        estadoIdRel: estadosProceso.id,
        estadoCodigo: estadosProceso.codigo,
        estadoNombre: estadosProceso.nombre,
        estadoColor: estadosProceso.color,
      })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(clientesNatural, eq(clientes.id, clientesNatural.clienteId))
      .leftJoin(personasCliente, eq(clientesNatural.personaId, personasCliente.id))
      .leftJoin(clientesEmpresa, eq(clientes.id, clientesEmpresa.clienteId))
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
        cliente: { with: { natural: { with: { persona: true } }, empresa: true } },
        tipoProceso: true,
        estado: true,
        lawyers: {
          with: {
            lawyer: {
              with: {
                persona: {
                  columns: {
                    nombre: true,
                    apellido: true
                  }
                }
              },
            },
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
      responsable: responsableMeta ? {
        id: responsableMeta.lawyer?.id ?? null,
        fechaAsignacion: responsableMeta.fechaInicio ?? null,
        razon: responsableMeta.razon ?? null,
        asignadoPorNombre: responsableMeta.asignadoPorNombre ?? null,
        lawyer: responsableMeta.lawyer ?? null,
      } : null,
      clienteNombre:   this.getClienteNombre(rawProceso.cliente),
      clienteUserId:   rawProceso.cliente?.userId ?? undefined,
      communityPostId: rawProceso.communityPostId ?? null,
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
  private getClienteNombre(cliente: any): string {
    if (!cliente) return 'Sin cliente';
    if (cliente.natural?.persona) {
      return `${cliente.natural.persona.nombre} ${cliente.natural.persona.apellido}`.trim();
    }
    if (cliente.empresa?.razonSocial) return cliente.empresa.razonSocial;
    return 'Sin cliente';
  }

  // Helper privado reutilizable
  private async getResponsablesMap(procesoIds: string[]): Promise<Map<string, {
    lawyer: typeof lawyerProfiles.$inferSelect & { persona: { id: string; nombre: string; apellido: string } | null };
    fechaInicio: Date;
    razon: string | null;
    asignadoPorNombre: string | null;
  }>> {
    const map = new Map();
    if (procesoIds.length === 0) return map;

    const personasResponsable = alias(personas, 'personasResponsable');

    const rows = await this.db
      .select({
        procesoId: procesoResponsables.procesoId,
        lawyer: lawyerProfiles,
        personaId: personasResponsable.id,
        personaNombre: personasResponsable.nombre,
        personaApellido: personasResponsable.apellido,
        fechaInicio: procesoResponsables.fechaInicio,
        razon: procesoResponsables.razon,
        asignadoPorNombre: procesoResponsables.asignadoPorNombre,
      })
      .from(procesoResponsables)
      .innerJoin(lawyerProfiles, eq(procesoResponsables.lawyerId, lawyerProfiles.id))
      .leftJoin(personasResponsable, eq(lawyerProfiles.personaId, personasResponsable.id))
      .where(and(
        inArray(procesoResponsables.procesoId, procesoIds),
        eq(procesoResponsables.activo, true)
      ));

    for (const r of rows) {
      map.set(r.procesoId, {
        lawyer: {
          ...r.lawyer,
          persona: r.personaId ? {
            id: r.personaId,
            nombre: r.personaNombre ?? '',
            apellido: r.personaApellido ?? '',
          } : null,
        },
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
      responsable: responsableMeta ? {
        id: responsableMeta.lawyer?.id ?? null,
        fechaAsignacion: responsableMeta.fechaInicio ?? null,
        razon: responsableMeta.razon ?? null,
        asignadoPorNombre: responsableMeta.asignadoPorNombre ?? null,
        lawyer: responsableMeta.lawyer ? {
          id: responsableMeta.lawyer.id,
          persona: responsableMeta.lawyer.persona ? {
            id: (responsableMeta.lawyer.persona as any).id ?? null,
            nombre: responsableMeta.lawyer.persona.nombre,
            apellido: responsableMeta.lawyer.persona.apellido,
          } : null,
        } : null,
      } : null,
    };
  }

  async getProcesosByFirma(
    firmId: string,
    limit: number = 10,
    offset: number = 0,
    filter?: ProcesoFilter
  ): Promise<{ data: ProcesoDTO[]; total: number }> {

    // 1. Fuente de verdad: procesoOwnership donde ownerType="bufete" y ownerId=firmId
    const ownedRows = await this.db
      .select({ procesoId: procesoOwnership.procesoId })
      .from(procesoOwnership)
      .where(and(
        eq(procesoOwnership.ownerType, "bufete"),
        eq(procesoOwnership.ownerId, firmId),
        eq(procesoOwnership.activoUnique, 1),
      ));

    const procesoIds = [...new Set(ownedRows.map(r => r.procesoId))];
    if (procesoIds.length === 0) return { data: [], total: 0 };

    // 2. Alias para joins del responsable — declarar ANTES de conditions
    const responsableLawyer = alias(lawyerProfiles, 'responsableLawyer');
    const responsableJoin = alias(procesoResponsables, 'responsableJoin');
    const personasResponsable = alias(personas, 'personasResponsable');
    const personasCliente = alias(personas, 'personasCliente');
    const deptosCliente = alias(departamentos, 'deptosCliente');
    const municipiosCliente = alias(municipios, 'municipiosCliente');
    const repLegal = alias(representantesLegales, 'repLegal');
    const personasRepLegal = alias(personas, 'personasRepLegal');

    // 4. Condiciones de filtro
    const conditions: any[] = [inArray(procesos.id, procesoIds), eq(procesos.state, true)];

    if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
      conditions.push(eq(estadosProceso.codigo, filter.estadoCodigo));
    }

    if (filter?.search) {
      const search = `%${filter.search}%`;
      conditions.push(
        sql`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido})) LIKE LOWER(${search}) OR
        LOWER(${clientesEmpresa.razonSocial}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search}) OR
        LOWER(CONCAT(${personasResponsable.nombre}, ' ', ${personasResponsable.apellido})) LIKE LOWER(${search})
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
      .leftJoin(clientesNatural, eq(clientes.id, clientesNatural.clienteId))
      .leftJoin(personasCliente, eq(clientesNatural.personaId, personasCliente.id))
      .leftJoin(deptosCliente, eq(personasCliente.departamentoId, deptosCliente.id))
      .leftJoin(municipiosCliente, eq(personasCliente.municipioId, municipiosCliente.id))
      .leftJoin(clientesEmpresa, eq(clientes.id, clientesEmpresa.clienteId))
      .leftJoin(repLegal, eq(clientesEmpresa.representanteLegalId, repLegal.id))
      .leftJoin(personasRepLegal, eq(repLegal.personaId, personasRepLegal.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .leftJoin(responsableJoin, joinConditions)
      .leftJoin(responsableLawyer, eq(responsableJoin.lawyerId, responsableLawyer.id))
      .leftJoin(personasResponsable, eq(responsableLawyer.personaId, personasResponsable.id))
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
        clienteNombre: sql<string>`COALESCE(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido}), ${clientesEmpresa.razonSocial}, 'Sin cliente')`,
        clienteUserId: clientes.userId,
        tipoCliente: clientes.tipo,
        clienteDocumento: personasCliente.documento,
        clienteTelefono: personasCliente.telefono,
        clienteDepartamentoId: deptosCliente.id,
        clienteDepartamentoNombre: deptosCliente.nombre,
        clienteMunicipioId: municipiosCliente.id,
        clienteMunicipioNombre: municipiosCliente.nombre,
        repLegalId: repLegal.id,
        repLegalCargo: repLegal.cargo,
        repLegalEmail: repLegal.email,
        repLegalNombre: personasRepLegal.nombre,
        repLegalApellido: personasRepLegal.apellido,
        repLegalDocumento: personasRepLegal.documento,
        repLegalTelefono: personasRepLegal.telefono,
        tipoProcesoNombre: tiposProceso.nombre,
        estadoIdRel: estadosProceso.id,
        estadoCodigo: estadosProceso.codigo,
        estadoNombre: estadosProceso.nombre,
        estadoColor: estadosProceso.color,
        responsableLawyerData: responsableLawyer,
        responsablePersonaId: personasResponsable.id,
        responsablePersonaNombre: personasResponsable.nombre,
        responsablePersonaApellido: personasResponsable.apellido,
        responsablePersonaTelefono: personasResponsable.telefono,
        responsablePersonaDocumento: personasResponsable.documento,
        responsablePersonaDireccion: personasResponsable.direccion,
        responsablePersonaTipoDocumentoId: personasResponsable.tipoDocumentoId,
        responsablePersonaDepartamentoId: personasResponsable.departamentoId,
        responsablePersonaMunicipioId: personasResponsable.municipioId,
        responsableFechaInicio: responsableJoin.fechaInicio,
        responsableRazon: responsableJoin.razon,
        responsableAsignadoPorNombre: responsableJoin.asignadoPorNombre,
      })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(clientesNatural, eq(clientes.id, clientesNatural.clienteId))
      .leftJoin(personasCliente, eq(clientesNatural.personaId, personasCliente.id))
      .leftJoin(deptosCliente, eq(personasCliente.departamentoId, deptosCliente.id))
      .leftJoin(municipiosCliente, eq(personasCliente.municipioId, municipiosCliente.id))
      .leftJoin(clientesEmpresa, eq(clientes.id, clientesEmpresa.clienteId))
      .leftJoin(repLegal, eq(clientesEmpresa.representanteLegalId, repLegal.id))
      .leftJoin(personasRepLegal, eq(repLegal.personaId, personasRepLegal.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .leftJoin(responsableJoin, joinConditions)
      .leftJoin(responsableLawyer, eq(responsableJoin.lawyerId, responsableLawyer.id))
      .leftJoin(personasResponsable, eq(responsableLawyer.personaId, personasResponsable.id))
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
      tipoCliente: p.tipoCliente ?? null,
      clienteDocumento: p.clienteDocumento ?? null,
      clienteTelefono: p.clienteTelefono ?? null,
      clienteDepartamento: p.clienteDepartamentoId ? {
        id: p.clienteDepartamentoId,
        nombre: p.clienteDepartamentoNombre ?? '',
      } : null,
      clienteMunicipio: p.clienteMunicipioId ? {
        id: p.clienteMunicipioId,
        nombre: p.clienteMunicipioNombre ?? '',
      } : null,
      representanteLegal: p.repLegalId ? {
        id: p.repLegalId,
        cargo: p.repLegalCargo ?? '',
        email: p.repLegalEmail ?? '',
        nombre: p.repLegalNombre ?? '',
        apellido: p.repLegalApellido ?? '',
        documento: p.repLegalDocumento ?? null,
        telefono: p.repLegalTelefono ?? null,
      } : null,
      estado: p.estadoIdRel ? {
        id: p.estadoIdRel,
        codigo: p.estadoCodigo || "",
        nombre: p.estadoNombre || "",
        color: p.estadoColor || "",
      } : null,
      responsable: p.responsableLawyerData ? {
        id: p.responsableLawyerData.id,
        fechaAsignacion: p.responsableFechaInicio ?? null,
        razon: p.responsableRazon ?? null,
        asignadoPorNombre: p.responsableAsignadoPorNombre ?? null,
        lawyer: {
          ...p.responsableLawyerData,
          persona: p.responsablePersonaId ? {
            id: p.responsablePersonaId,
            nombre: p.responsablePersonaNombre ?? '',
            apellido: p.responsablePersonaApellido ?? '',
            telefono: p.responsablePersonaTelefono ?? null,
            documento: p.responsablePersonaDocumento ?? null,
            direccion: p.responsablePersonaDireccion ?? null,
            tipoDocumentoId: p.responsablePersonaTipoDocumentoId ?? 0,
            departamentoId: p.responsablePersonaDepartamentoId ?? null,
            municipioId: p.responsablePersonaMunicipioId ?? null,
          } : null,
        },
      } : null,
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

    // 1. Fuente de verdad: procesoOwnership donde ownerType="bufete" y ownerId=firmId
    const ownedRows = await this.db
      .select({ procesoId: procesoOwnership.procesoId })
      .from(procesoOwnership)
      .where(and(
        eq(procesoOwnership.ownerType, "bufete"),
        eq(procesoOwnership.ownerId, firmId),
        eq(procesoOwnership.activoUnique, 1),
      ));

    const procesoIds = [...new Set(ownedRows.map(r => r.procesoId))];
    if (procesoIds.length === 0) return { data: [], total: 0 };

    // 2. Condiciones: firma + cliente específico
    const conditions: any[] = [
      inArray(procesos.id, procesoIds),
      eq(procesos.clienteId, clienteId),
      eq(procesos.state, true),
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

    const personasCliente = alias(personas, 'personasCliente');

    // 4. Count total
    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(clientesNatural, eq(clientes.id, clientesNatural.clienteId))
      .leftJoin(personasCliente, eq(clientesNatural.personaId, personasCliente.id))
      .leftJoin(clientesEmpresa, eq(clientes.id, clientesEmpresa.clienteId))
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
        clienteNombre: sql<string>`COALESCE(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido}), ${clientesEmpresa.razonSocial}, 'Sin cliente')`,
        clienteUserId: clientes.userId,
        estadoIdRel: estadosProceso.id,
        estadoCodigo: estadosProceso.codigo,
        estadoNombre: estadosProceso.nombre,
        estadoColor: estadosProceso.color,
      })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(clientesNatural, eq(clientes.id, clientesNatural.clienteId))
      .leftJoin(personasCliente, eq(clientesNatural.personaId, personasCliente.id))
      .leftJoin(clientesEmpresa, eq(clientes.id, clientesEmpresa.clienteId))
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

    const ownedRow = await this.db
      .select({ procesoId: procesoOwnership.procesoId })
      .from(procesoOwnership)
      .where(and(
        eq(procesoOwnership.ownerType, "bufete"),
        eq(procesoOwnership.ownerId, firmId),
        eq(procesoOwnership.procesoId, procesoId),
        eq(procesoOwnership.activoUnique, 1),
      ))
      .limit(1)
      .then(r => r[0] ?? null);

    if (!ownedRow) return undefined;

    // Traer proceso con todas sus relaciones
    const rawProceso = await this.db.query.procesos.findFirst({
      where: eq(procesos.id, procesoId),
      with: {
        cliente: { with: { natural: { with: { persona: true } }, empresa: true } },
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
      responsable: responsableMeta ? {
        id: responsableMeta.lawyer?.id ?? null,
        fechaAsignacion: responsableMeta.fechaInicio ?? null,
        razon: responsableMeta.razon ?? null,
        asignadoPorNombre: responsableMeta.asignadoPorNombre ?? null,
        lawyer: responsableMeta.lawyer,
      } : null,
    
      clienteNombre:   this.getClienteNombre(rawProceso.cliente),
      clienteUserId:   rawProceso.cliente?.userId ?? undefined,
      communityPostId: rawProceso.communityPostId ?? null,
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
        cliente: { with: { natural: { with: { persona: true } }, empresa: true } },
        tipoProceso: true,
        estado: true,
        lawyers: {
          with: {
            lawyer: {
              with: {
                persona: {
                  columns: {
                    nombre: true,
                    apellido: true,
                    telefono: true,
                  }
                }
              },
            },
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

    // For lawyer entries where the JOIN returned null, the lawyerId may point
    // to a firm profile — resolve it so the frontend can show the firm name.
    const lawyersResolved = await Promise.all(
      rawProceso.lawyers.map(async l => {
        if (l.lawyer !== null) return { ...l, firm: null };
        const firm = await this.db
          .select({ id: firmProfiles.id, name: firmProfiles.name, phone: firmProfiles.phone })
          .from(firmProfiles)
          .where(eq(firmProfiles.id, l.lawyerId))
          .limit(1);
        return { ...l, firm: firm[0] ?? null };
      })
    );

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
      clienteNombre: this.getClienteNombre(rawProceso.cliente),

      cliente: rawProceso.cliente ?? null,
      tipoProceso: rawProceso.tipoProceso ?? null,
      estado: rawProceso.estado ?? null,

      lawyers: lawyersResolved.map(l => ({
        id: l.id,
        procesoId: l.procesoId,
        lawyerId: l.lawyerId,
        rol: l.rol,
        status: l.status,
        lawyer: l.lawyer,
        firm: l.firm,
      })) as ProcesoLawyerWithLawyer[],

      responsable: responsableMeta ? {
        id: responsableMeta.lawyer?.id ?? null,
        fechaAsignacion: responsableMeta.fechaInicio ?? null,
        razon: responsableMeta.razon ?? null,
        asignadoPorNombre: responsableMeta.asignadoPorNombre ?? null,
        lawyer: responsableMeta.lawyer ?? null,
      } : null,
    };
  }

  // ── Legal Stage ────────────────────────────────────────────────────────────

  /** Actualiza la etapa procesal del proceso y calcula la fecha de vencimiento */
  async updateLegalStage(
    procesoId: string,
    legalStage: string,
    fechaVencimientoEtapa: Date | null,
  ): Promise<void> {
    await this.db
      .update(procesos)
      .set({
        legalStage,
        fechaVencimientoEtapa,
        etapaActualizadaEn: new Date(),
      })
      .where(eq(procesos.id, procesoId));
  }

  /** Procesos filtrados por etapa procesal */
  async getProcesosByEtapa(
    lawyerProfileId: string,
    legalStage: string,
  ): Promise<{ id: string; radicado: string; legalStage: string | null }[]> {
    return this.db
      .select({
        id:         procesos.id,
        radicado:   procesos.radicado,
        legalStage: procesos.legalStage,
      })
      .from(procesos)
      .where(
        and(
          eq(procesos.state, true),
          eq(procesos.legalStage, legalStage),
        ),
      );
  }

  /** Obtener procesos por array de IDs (usado en listados por rol con ownership). */
  async getProcesosByIds(ids: string[], filter?: ProcesoFilter): Promise<any[]> {
    if (ids.length === 0) return [];

    const responsableLawyer   = alias(lawyerProfiles,        'responsableLawyer');
    const responsableJoin     = alias(procesoResponsables,   'responsableJoin');
    const personasResponsable = alias(personas,              'personasResponsable');
    const personasCliente     = alias(personas,              'personasCliente');
    const deptosCliente       = alias(departamentos,         'deptosCliente');
    const municipiosCliente   = alias(municipios,            'municipiosCliente');
    const repLegal            = alias(representantesLegales, 'repLegal');
    const personasRepLegal    = alias(personas,              'personasRepLegal');

    const conditions: any[] = [inArray(procesos.id, ids), eq(procesos.state, true)];

    if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
      conditions.push(eq(estadosProceso.codigo, filter.estadoCodigo));
    }

    if (filter?.clienteId) {
      conditions.push(eq(procesos.clienteId, filter.clienteId));
    }

    if (filter?.search) {
      const search = `%${filter.search}%`;
      conditions.push(
        sql`(
          LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
          LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
          LOWER(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido})) LIKE LOWER(${search}) OR
          LOWER(${clientesEmpresa.razonSocial}) LIKE LOWER(${search}) OR
          LOWER(${tiposProceso.nombre}) LIKE LOWER(${search}) OR
          LOWER(CONCAT(${personasResponsable.nombre}, ' ', ${personasResponsable.apellido})) LIKE LOWER(${search})
        )`
      );
    }

    const joinConditions = and(
      eq(responsableJoin.procesoId, procesos.id),
      eq(responsableJoin.activo, true)
    );

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
        clienteNombre: sql<string>`COALESCE(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido}), ${clientesEmpresa.razonSocial}, 'Sin cliente')`,
        clienteUserId: clientes.userId,
        tipoCliente: clientes.tipo,
        clienteDocumento: personasCliente.documento,
        clienteTelefono: personasCliente.telefono,
        clienteDepartamentoId: deptosCliente.id,
        clienteDepartamentoNombre: deptosCliente.nombre,
        clienteMunicipioId: municipiosCliente.id,
        clienteMunicipioNombre: municipiosCliente.nombre,
        repLegalId: repLegal.id,
        repLegalCargo: repLegal.cargo,
        repLegalEmail: repLegal.email,
        repLegalNombre: personasRepLegal.nombre,
        repLegalApellido: personasRepLegal.apellido,
        repLegalDocumento: personasRepLegal.documento,
        repLegalTelefono: personasRepLegal.telefono,
        tipoProcesoNombre: tiposProceso.nombre,
        estadoIdRel: estadosProceso.id,
        estadoCodigo: estadosProceso.codigo,
        estadoNombre: estadosProceso.nombre,
        estadoColor: estadosProceso.color,
        responsableLawyerData: responsableLawyer,
        responsablePersonaId: personasResponsable.id,
        responsablePersonaNombre: personasResponsable.nombre,
        responsablePersonaApellido: personasResponsable.apellido,
        responsablePersonaTelefono: personasResponsable.telefono,
        responsablePersonaDocumento: personasResponsable.documento,
        responsablePersonaDireccion: personasResponsable.direccion,
        responsablePersonaTipoDocumentoId: personasResponsable.tipoDocumentoId,
        responsablePersonaDepartamentoId: personasResponsable.departamentoId,
        responsablePersonaMunicipioId: personasResponsable.municipioId,
        responsableFechaInicio: responsableJoin.fechaInicio,
        responsableRazon: responsableJoin.razon,
        responsableAsignadoPorNombre: responsableJoin.asignadoPorNombre,
      })
      .from(procesos)
      .leftJoin(clientes,           eq(procesos.clienteId,              clientes.id))
      .leftJoin(clientesNatural,    eq(clientes.id,                     clientesNatural.clienteId))
      .leftJoin(personasCliente,    eq(clientesNatural.personaId,       personasCliente.id))
      .leftJoin(deptosCliente,      eq(personasCliente.departamentoId,  deptosCliente.id))
      .leftJoin(municipiosCliente,  eq(personasCliente.municipioId,     municipiosCliente.id))
      .leftJoin(clientesEmpresa,    eq(clientes.id,                     clientesEmpresa.clienteId))
      .leftJoin(repLegal,           eq(clientesEmpresa.representanteLegalId, repLegal.id))
      .leftJoin(personasRepLegal,   eq(repLegal.personaId,              personasRepLegal.id))
      .leftJoin(estadosProceso,     eq(procesos.estadoId,               estadosProceso.id))
      .leftJoin(tiposProceso,       eq(procesos.tipoProcesoId,          tiposProceso.id))
      .leftJoin(responsableJoin,    joinConditions)
      .leftJoin(responsableLawyer,  eq(responsableJoin.lawyerId,        responsableLawyer.id))
      .leftJoin(personasResponsable,eq(responsableLawyer.personaId,     personasResponsable.id))
      .where(and(...conditions))
      .orderBy(desc(procesos.fechaCreacion));

    return results.map((p: any) => ({
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
      tipoCliente: p.tipoCliente ?? null,
      clienteDocumento: p.clienteDocumento ?? null,
      clienteTelefono: p.clienteTelefono ?? null,
      clienteDepartamento: p.clienteDepartamentoId ? {
        id: p.clienteDepartamentoId,
        nombre: p.clienteDepartamentoNombre ?? '',
      } : null,
      clienteMunicipio: p.clienteMunicipioId ? {
        id: p.clienteMunicipioId,
        nombre: p.clienteMunicipioNombre ?? '',
      } : null,
      representanteLegal: p.repLegalId ? {
        id: p.repLegalId,
        cargo: p.repLegalCargo ?? '',
        email: p.repLegalEmail ?? '',
        nombre: p.repLegalNombre ?? '',
        apellido: p.repLegalApellido ?? '',
        documento: p.repLegalDocumento ?? null,
        telefono: p.repLegalTelefono ?? null,
      } : null,
      estado: p.estadoIdRel ? {
        id: p.estadoIdRel,
        codigo: p.estadoCodigo || "",
        nombre: p.estadoNombre || "",
        color: p.estadoColor || "",
      } : null,
      responsable: p.responsableLawyerData ? {
        id: p.responsableLawyerData.id,
        fechaAsignacion: p.responsableFechaInicio ?? null,
        razon: p.responsableRazon ?? null,
        asignadoPorNombre: p.responsableAsignadoPorNombre ?? null,
        lawyer: {
          ...p.responsableLawyerData,
          persona: p.responsablePersonaId ? {
            id: p.responsablePersonaId,
            nombre: p.responsablePersonaNombre ?? '',
            apellido: p.responsablePersonaApellido ?? '',
            telefono: p.responsablePersonaTelefono ?? null,
            documento: p.responsablePersonaDocumento ?? null,
            direccion: p.responsablePersonaDireccion ?? null,
            tipoDocumentoId: p.responsablePersonaTipoDocumentoId ?? 0,
            departamentoId: p.responsablePersonaDepartamentoId ?? null,
            municipioId: p.responsablePersonaMunicipioId ?? null,
          } : null,
        },
      } : null,
    }));
  }

  /** IDs de procesos donde el abogado tiene asignación activa. */
  async getProcesoIdsByAbogadoAssignment(lawyerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ procesoId: procesoLawyers.procesoId })
      .from(procesoLawyers)
      .where(and(
        eq(procesoLawyers.lawyerId, lawyerId),
        eq(procesoLawyers.status, "activo"),
      ));
    return rows.map(r => r.procesoId);
  }

}
