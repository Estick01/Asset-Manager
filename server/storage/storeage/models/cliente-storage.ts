/**
 * Cliente Storage
 * Handles all database operations for clients (clientes)
 * Supports both natural persons (clientes_natural) and companies (clientes_empresa)
 */

import {
  Cliente, InsertCliente,
  clientes, clientesNatural, clientesEmpresa,
  personas, representantesLegales,
  lawyerClients,
  users, tiposDocumento, departamentos, municipios,
  procesos, procesoResponsables, estadosProceso,
} from "@/shared/schema";
import { InsertClienteNatural, InsertClienteEmpresa } from "@/shared/schema";
import { randomUUID } from "crypto";
import { eq, and, desc, like, SQL, or, inArray, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { assertDocumentoUnique, assertNitUnique, normalizeLooseText, normalizeOptionalIdentity, normalizeRequiredIdentity } from "./identity-uniqueness";

export interface InsertClienteNaturalCompleto extends InsertCliente {
  tipo: "natural";
  nombre: string;
  apellido: string;
  telefono: string;
  documento: string;
  tipoDocumentoId: number;
  direccion?: string | null;
  departamentoId?: string | null;
  municipioId?: string | null;
}

export interface InsertClienteEmpresaCompleto extends InsertCliente {
  tipo: "empresa";
  razonSocial: string;
  nit: string;
  sector?: string | null;
  representanteLegalId?: string | null;
}

export type InsertClienteCompleto = InsertClienteNaturalCompleto | InsertClienteEmpresaCompleto;

export class ClienteStorage {
  constructor(private db: MySql2Database<any>) {}

  // ----------------------------------------------------------------
  // LIST
  // ----------------------------------------------------------------

  /** Returns clientIds of procesos where lawyerId is the active responsable */
  async getClienteIdsByProcesoResponsable(lawyerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ clienteId: procesos.clienteId })
      .from(procesoResponsables)
      .innerJoin(procesos, eq(procesoResponsables.procesoId, procesos.id))
      .where(and(
        eq(procesoResponsables.lawyerId, lawyerId),
        eq(procesoResponsables.activo, true),
      ));
    return [...new Set(rows.map(r => r.clienteId).filter(Boolean))] as string[];
  }

  async getClientes(lawyerId: string, limit = 10, offset = 0, filter?: { search?: string }, extraClientIds?: string[]): Promise<Cliente[]> {
    const clienteIdRows = await this.db
      .select({ clienteId: lawyerClients.clientId })
      .from(lawyerClients)
      .where(and(eq(lawyerClients.lawyerId, lawyerId), eq(lawyerClients.status, "active")));

    const clienteIds = [
      ...new Set([
        ...clienteIdRows.map(r => r.clienteId).filter(Boolean) as string[],
        ...(extraClientIds ?? []),
      ]),
    ];
    if (clienteIds.length === 0) return [];

    const conditions: SQL[] = [inArray(clientes.id, clienteIds) as SQL];

    if (filter?.search) {
      const search = `${filter.search}%`;
      conditions.push(
        or(
          like(personas.nombre, search),
          like(personas.documento, search),
          like(clientesEmpresa.razonSocial, search),
          like(clientesEmpresa.nit, search),
        ) as SQL
      );
    }

    const rows = await this.db
      .select({
        id: clientes.id,
        userId: clientes.userId,
        tipo: clientes.tipo,
        activo: clientes.activo,
        fechaCreacion: clientes.fechaCreacion,
        user: { id: users.id, email: users.email, isActive: users.isActive, createdAt: users.createdAt },
        // natural
        natural: {
          clienteId: clientesNatural.clienteId,
          personaId: clientesNatural.personaId,
        },
        persona: {
          id: personas.id,
          nombre: personas.nombre,
          apellido: personas.apellido,
          telefono: personas.telefono,
          documento: personas.documento,
          tipoDocumentoId: personas.tipoDocumentoId,
          direccion: personas.direccion,
          departamentoId: personas.departamentoId,
          municipioId: personas.municipioId,
        },
        // empresa
        empresa: {
          clienteId: clientesEmpresa.clienteId,
          razonSocial: clientesEmpresa.razonSocial,
          nit: clientesEmpresa.nit,
          sector: clientesEmpresa.sector,
          representanteLegalId: clientesEmpresa.representanteLegalId,
        },
      })
      .from(clientes)
      .innerJoin(users, eq(clientes.userId, users.id))
      .leftJoin(clientesNatural, eq(clientes.id, clientesNatural.clienteId))
      .leftJoin(personas, eq(clientesNatural.personaId, personas.id))
      .leftJoin(clientesEmpresa, eq(clientes.id, clientesEmpresa.clienteId))
      .where(and(...conditions))
      .orderBy(desc(clientes.fechaCreacion))
      .limit(limit)
      .offset(offset);

    return rows.map(row => this._mapRow(row));
  }

  async getProcesosStatsByClientes(
    clienteIds: string[]
  ): Promise<Map<string, { total: number; porEstado: { codigo: string; nombre: string; count: number }[] }>> {
    if (clienteIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        clienteId: procesos.clienteId,
        codigo: estadosProceso.codigo,
        nombre: estadosProceso.nombre,
        count: sql<number>`COUNT(*)`,
      })
      .from(procesos)
      .innerJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .where(inArray(procesos.clienteId, clienteIds))
      .groupBy(procesos.clienteId, estadosProceso.id, estadosProceso.codigo, estadosProceso.nombre);

    const map = new Map<string, { total: number; porEstado: { codigo: string; nombre: string; count: number }[] }>();
    for (const row of rows) {
      if (!row.clienteId) continue;
      if (!map.has(row.clienteId)) map.set(row.clienteId, { total: 0, porEstado: [] });
      const entry = map.get(row.clienteId)!;
      const count = Number(row.count);
      entry.total += count;
      entry.porEstado.push({ codigo: row.codigo, nombre: row.nombre, count });
    }
    return map;
  }

  async getClientesCount(lawyerId: string, extraClientIds?: string[]): Promise<number> {
    const rows = await this.db
      .select({ clienteId: lawyerClients.clientId })
      .from(lawyerClients)
      .where(and(eq(lawyerClients.lawyerId, lawyerId), eq(lawyerClients.status, "active")));

    const allIds = new Set<string>([
      ...rows.map(r => r.clienteId).filter(Boolean) as string[],
      ...(extraClientIds ?? []),
    ]);
    return allIds.size;
  }

  // ----------------------------------------------------------------
  // SINGLE
  // ----------------------------------------------------------------

  async getCliente(id: string, tx?: any): Promise<Cliente | undefined> {
    const db = tx ?? this.db;
    const rows = await db
      .select({
        id: clientes.id,
        userId: clientes.userId,
        tipo: clientes.tipo,
        activo: clientes.activo,
        fechaCreacion: clientes.fechaCreacion,
        user: { id: users.id, email: users.email, isActive: users.isActive, createdAt: users.createdAt },
        natural: { clienteId: clientesNatural.clienteId, personaId: clientesNatural.personaId },
        persona: {
          id: personas.id,
          nombre: personas.nombre,
          apellido: personas.apellido,
          telefono: personas.telefono,
          documento: personas.documento,
          tipoDocumentoId: personas.tipoDocumentoId,
          direccion: personas.direccion,
          departamentoId: personas.departamentoId,
          municipioId: personas.municipioId,
          tipoDocumento: { id: tiposDocumento.id, codigo: tiposDocumento.codigo, nombre: tiposDocumento.nombre },
          departamento: { id: departamentos.id, codigo: departamentos.codigo, nombre: departamentos.nombre },
          municipio: { id: municipios.id, codigo: municipios.codigo, nombre: municipios.nombre },
        },
        empresa: {
          clienteId: clientesEmpresa.clienteId,
          razonSocial: clientesEmpresa.razonSocial,
          nit: clientesEmpresa.nit,
          sector: clientesEmpresa.sector,
          representanteLegalId: clientesEmpresa.representanteLegalId,
        },
      })
      .from(clientes)
      .innerJoin(users, eq(clientes.userId, users.id))
      .leftJoin(clientesNatural, eq(clientes.id, clientesNatural.clienteId))
      .leftJoin(personas, eq(clientesNatural.personaId, personas.id))
      .leftJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .leftJoin(departamentos, eq(personas.departamentoId, departamentos.id))
      .leftJoin(municipios, eq(personas.municipioId, municipios.id))
      .leftJoin(clientesEmpresa, eq(clientes.id, clientesEmpresa.clienteId))
      .where(eq(clientes.id, id))
      .limit(1);

    if (!rows[0]) return undefined;
    const cliente = this._mapRow(rows[0]);

    // Fetch representante legal with persona for empresa clients
    if (cliente.tipo === "empresa" && cliente.empresa?.representanteLegalId) {
      const repRows = await this.db
        .select({
          repId:        representantesLegales.id,
          repPersonaId: representantesLegales.personaId,
          repCargo:     representantesLegales.cargo,
          repEmail:     representantesLegales.email,
          pId:          personas.id,
          pNombre:      personas.nombre,
          pApellido:    personas.apellido,
          pTelefono:    personas.telefono,
          pDocumento:   personas.documento,
          pTipoDocId:   personas.tipoDocumentoId,
          pDireccion:   personas.direccion,
          pDeptoId:     personas.departamentoId,
          pMunicipioId: personas.municipioId,
          tdId:   tiposDocumento.id,
          tdCod:  tiposDocumento.codigo,
          tdNom:  tiposDocumento.nombre,
          dId:    departamentos.id,
          dCod:   departamentos.codigo,
          dNom:   departamentos.nombre,
          mId:    municipios.id,
          mCod:   municipios.codigo,
          mNom:   municipios.nombre,
        })
        .from(representantesLegales)
        .leftJoin(personas,       eq(representantesLegales.personaId, personas.id))
        .leftJoin(tiposDocumento,  eq(personas.tipoDocumentoId, tiposDocumento.id))
        .leftJoin(departamentos,   eq(personas.departamentoId,  departamentos.id))
        .leftJoin(municipios,      eq(personas.municipioId,     municipios.id))
        .where(eq(representantesLegales.id, cliente.empresa.representanteLegalId))
        .limit(1);

      if (repRows[0]) {
        const r = repRows[0];
        const persona = r.pId
          ? {
              id: r.pId, nombre: r.pNombre, apellido: r.pApellido,
              telefono: r.pTelefono, documento: r.pDocumento,
              tipoDocumentoId: r.pTipoDocId, direccion: r.pDireccion,
              departamentoId: r.pDeptoId, municipioId: r.pMunicipioId,
              tipoDocumento: r.tdId ? { id: r.tdId, codigo: r.tdCod, nombre: r.tdNom } : null,
              departamento:  r.dId  ? { id: r.dId,  codigo: r.dCod,  nombre: r.dNom  } : null,
              municipio:     r.mId  ? { id: r.mId,  codigo: r.mCod,  nombre: r.mNom  } : null,
            }
          : null;
        (cliente.empresa as any).representanteLegal = {
          id: r.repId, personaId: r.repPersonaId,
          cargo: r.repCargo, email: r.repEmail,
          persona,
        };
      }
    }

    return cliente;
  }

  async getClienteByDocument(documento: string): Promise<Cliente | undefined> {
    const personaResult = await this.db
      .select({ id: personas.id })
      .from(personas)
      .where(eq(personas.documento, documento))
      .limit(1);

    if (!personaResult[0]) return undefined;

    const naturalResult = await this.db
      .select({ clienteId: clientesNatural.clienteId })
      .from(clientesNatural)
      .where(eq(clientesNatural.personaId, personaResult[0].id))
      .limit(1);

    if (!naturalResult[0]) return undefined;
    return this.getCliente(naturalResult[0].clienteId);
  }

  async getClienteByUser(userId: string): Promise<Cliente | undefined> {
    const result = await this.db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.userId, userId))
      .limit(1);
    if (!result[0]) return undefined;
    return this.getCliente(result[0].id);
  }

  // ----------------------------------------------------------------
  // CREATE
  // ----------------------------------------------------------------

  async createCliente(data: InsertClienteCompleto, tx?: any): Promise<Cliente> {
    const db = tx ?? this.db;
    const id = randomUUID();

    await db.insert(clientes).values({
      id,
      userId: data.userId,
      tipo: data.tipo,
      activo: data.activo ?? true,
      fechaCreacion: new Date(),
    });

    if (data.tipo === "natural") {
      const d = data as InsertClienteNaturalCompleto;
      const personaId = randomUUID();
      const documento = await assertDocumentoUnique(db, d.documento);
      await db.insert(personas).values({
        id: personaId,
        nombre: normalizeLooseText(d.nombre),
        apellido: normalizeLooseText(d.apellido),
        telefono: normalizeLooseText(d.telefono),
        documento,
        tipoDocumentoId: d.tipoDocumentoId,
        direccion: normalizeOptionalIdentity(d.direccion),
        departamentoId: d.departamentoId ?? null,
        municipioId: d.municipioId ?? null,
      });
      await db.insert(clientesNatural).values({ clienteId: id, personaId });
    } else {
      const d = data as InsertClienteEmpresaCompleto;
      const nit = await assertNitUnique(db, d.nit);
      await db.insert(clientesEmpresa).values({
        clienteId: id,
        razonSocial: normalizeRequiredIdentity(d.razonSocial, "La razón social"),
        nit,
        sector: normalizeOptionalIdentity(d.sector),
        representanteLegalId: d.representanteLegalId ?? null,
      });
    }

    const created = await this.getCliente(id, tx);
    if (!created) throw new Error("No se pudo crear el cliente");
    return created;
  }

  // ----------------------------------------------------------------
  // UPDATE
  // ----------------------------------------------------------------

  async updateCliente(id: string, updates: Partial<InsertClienteCompleto>, tx?: any): Promise<Cliente | undefined> {
    const db = tx ?? this.db;

    const { tipo, userId, activo, fechaCreacion, ...rest } = updates as any;
    const baseUpdates: any = {};
    if (activo !== undefined) baseUpdates.activo = activo;

    if (Object.keys(baseUpdates).length > 0) {
      await db.update(clientes).set(baseUpdates).where(eq(clientes.id, id));
    }

    const current = await this.getCliente(id);
    if (!current) return undefined;

    if (current.tipo === "natural") {
      const { nombre, apellido, telefono, documento, tipoDocumentoId, direccion, departamentoId, municipioId } = rest;
      const personaUpdates: any = {};
      if (nombre !== undefined) personaUpdates.nombre = normalizeLooseText(nombre);
      if (apellido !== undefined) personaUpdates.apellido = normalizeLooseText(apellido);
      if (telefono !== undefined) personaUpdates.telefono = normalizeLooseText(telefono);
      if (documento !== undefined) personaUpdates.documento = await assertDocumentoUnique(db, documento, current.natural?.personaId);
      if (tipoDocumentoId !== undefined) personaUpdates.tipoDocumentoId = tipoDocumentoId;
      if (direccion !== undefined) personaUpdates.direccion = normalizeOptionalIdentity(direccion);
      if (departamentoId !== undefined) personaUpdates.departamentoId = departamentoId;
      if (municipioId !== undefined) personaUpdates.municipioId = municipioId;

      if (Object.keys(personaUpdates).length > 0 && current.natural?.personaId) {
        await db.update(personas).set(personaUpdates).where(eq(personas.id, current.natural.personaId));
      }
    } else {
      const { razonSocial, nit, sector, representanteLegalId } = rest;
      const empresaUpdates: any = {};
      if (razonSocial !== undefined) empresaUpdates.razonSocial = normalizeRequiredIdentity(razonSocial, "La razón social");
      if (nit !== undefined) empresaUpdates.nit = await assertNitUnique(db, nit, { excludeClienteEmpresaId: id });
      if (sector !== undefined) empresaUpdates.sector = normalizeOptionalIdentity(sector);
      if (representanteLegalId !== undefined) empresaUpdates.representanteLegalId = representanteLegalId;

      if (Object.keys(empresaUpdates).length > 0) {
        await db.update(clientesEmpresa).set(empresaUpdates).where(eq(clientesEmpresa.clienteId, id));
      }
    }

    return this.getCliente(id, tx);
  }

  // ----------------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------------

  async deleteCliente(id: string): Promise<void> {
    // clientes_natural and clientes_empresa cascade on DELETE
    await this.db.delete(clientes).where(eq(clientes.id, id));
  }

  // ----------------------------------------------------------------
  // PRIVATE helpers
  // ----------------------------------------------------------------

  private _mapRow(row: any): Cliente {
    return {
      id: row.id,
      userId: row.userId,
      tipo: row.tipo,
      activo: row.activo,
      fechaCreacion: row.fechaCreacion,
      user: row.user?.id ? row.user : null,
      natural: row.natural?.clienteId
        ? {
            clienteId: row.natural.clienteId,
            personaId: row.natural.personaId,
            persona: row.persona?.id
              ? {
                  ...row.persona,
                  tipoDocumento: row.persona.tipoDocumento?.id ? row.persona.tipoDocumento : null,
                  departamento: row.persona.departamento?.id ? row.persona.departamento : null,
                  municipio: row.persona.municipio?.id ? row.persona.municipio : null,
                }
              : null,
          }
        : null,
      empresa: row.empresa?.clienteId
        ? {
            clienteId: row.empresa.clienteId,
            razonSocial: row.empresa.razonSocial,
            nit: row.empresa.nit,
            sector: row.empresa.sector,
            representanteLegalId: row.empresa.representanteLegalId,
          }
        : null,
    };
  }
}
