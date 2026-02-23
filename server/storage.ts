import { stat } from 'node:fs';
import {
  type Abogado,
  type InsertAbogado,
  abogados,
  type Cliente,
  type InsertCliente,
  clientes,
  type Proceso as DbProceso,
  type InsertProceso,
  procesos,
  type Actualizacion,
  type InsertActualizacion,
  actualizaciones,
  type Documento,
  type InsertDocumento,
  documentos,
  planes,
  estadosProceso,
  tiposActualizacion,
  tiposProceso,
  type TiposProceso,
  InsertPlan,
  Plan,
  EstadoProceso,
  roles,
  permisos,
  rolesPermisos,
  modulos,
  type Modulo,
  type Rol,
  type Permiso,
  type InsertRol,
  abogadosRelations,
  clientesRelations,
  procesosRelations,
  actualizacionesRelations,
  documentosRelations,
  rolesRelations,
  modulosRelations,
  permisosRelations,
  rolesPermisosRelations,
  tiposProcesoRelations,
  notificaciones,
  type Notificacion,
  type InsertNotificacion,
} from "../shared/schema.js";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, or, inArray, desc, like, sql, SQL } from "drizzle-orm";
import mysql from "mysql2/promise";

export type ProcesoDTO = {
  id: string;
  state: boolean;
  abogadoId: string;
  fechaCreacion: Date;
  clienteId: string;
  tipoProcesoId: number | null;
  tipoProceso: string | null;
  radicado: string;
  juzgado: string;
  estadoId: number;
  descripcionEstado: string;
  clienteNombre: string;
  estado: {
    id: number;
    codigo: string;
    nombre: string;
    color: string;
  } | null;
};

const cache = new Map();

// Filter type for getProcesos
export type ProcesoFilter = {
  estadoCodigo?: string;
  search?: string;
};

// Type alias for backward compatibility
type Proceso = ProcesoDTO;

// Internal type for building where conditions
type DynamicFilter = {
  abogadoId: string;
  estadoCodigo?: string;
  search?: string;
};

export interface IStorage {
  // Abogado methods
  getAbogado(id: string): Promise<Abogado | undefined>;
  getAbogadoByCorreo(correo: string): Promise<Abogado | undefined>;
  getAllAbogados(): Promise<Abogado[]>;
  createAbogado(abogado: InsertAbogado): Promise<Abogado>;
  updateAbogado(id: string, updates: Partial<Abogado>): Promise<Abogado | undefined>;

  // Cliente methods
  getClientes(abogadoId: string, limit?: number, offset?: number, filter?: { search?: string }): Promise<Cliente[]>;
  getClientesCount(abogadoId: string): Promise<number>;
  getCliente(id: string): Promise<Cliente | undefined>;
  getClienteByDocument(documento: string): Promise<Cliente | undefined>;
  createCliente(cliente: InsertCliente): Promise<Cliente>;
  updateCliente(id: string, updates: Partial<InsertCliente>): Promise<Cliente | undefined>;
  deleteCliente(id: string): Promise<void>;

  // Proceso methods
  getProcesos(abogadoId: string, limit?: number, offset?: number, filter?: ProcesoFilter): Promise<{ data: ProcesoDTO[]; total: number }>;
  getProcesosCount(abogadoId: string, filter?: ProcesoFilter): Promise<number>;
  getProcesosByCliente(clienteId: string, limit?: number, offset?: number, filter?: ProcesoFilter): Promise<{ data: ProcesoDTO[]; total: number }>;
  getProceso(id: string): Promise<ProcesoDTO | undefined>;
  createProceso(proceso: InsertProceso): Promise<DbProceso>;
  updateProceso(id: string, updates: Partial<InsertProceso>): Promise<ProcesoDTO | undefined>;
  deleteProceso(id: string): Promise<void>;

  // Actualizacion methods
  getActualizaciones(procesoId: string, limit?: number, offset?: number): Promise<Actualizacion[]>;
  createActualizacion(actualizacion: InsertActualizacion): Promise<Actualizacion>;
  deleteActualizacion(id: string): Promise<void>;

  // Documento methods
  getDocumentos(procesoId: string): Promise<Documento[]>;
  getDocumento(id: string): Promise<Documento | undefined>;
  createDocumento(documento: InsertDocumento): Promise<Documento>;
  deleteDocumento(id: string): Promise<void>;

  // Plan methods
  getPlan(id: string): Promise<Plan | undefined>;
  getPlanes(): Promise<Plan[]>;
  createPlan(plan: InsertPlan): Promise<Plan>;

  // Estado methods
  getEstadosProceso(): Promise<EstadoProceso[]>;

  // Tipos de Proceso methods
  getTiposProceso(): Promise<TiposProceso[]>;
  createTipoProceso(tipo: { nombre: string; descripcion?: string }): Promise<TiposProceso>;
  updateTipoProceso(id: number, updates: { nombre?: string; descripcion?: string; activo?: boolean }): Promise<TiposProceso | undefined>;
  deleteTipoProceso(id: number): Promise<void>;

  // Rol methods
  getRoles(): Promise<Rol[]>;
  getRol(id: number): Promise<Rol | undefined>;
  getRolByNombre(nombre: string): Promise<Rol | undefined>;
  createRol(rol: InsertRol): Promise<Rol>;
  deleteRol(id: number): Promise<void>;

  // Permiso methods
  getPermisos(): Promise<Permiso[]>;
  getModulos(): Promise<Modulo[]>;
  getPermisosByRol(rolId: number): Promise<Permiso[]>;
  getPermisosByUsuario(userId: string, userType: "abogado" | "cliente"): Promise<string[]>;
}

export class DrizzleStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    const connection = mysql.createPool({
      uri: process.env.DATABASE_URL,
    });
    this.db = drizzle(connection, {
      schema: {
        abogados,
        clientes,
        procesos,
        actualizaciones,
        documentos,
        planes,
        estadosProceso,
        tiposActualizacion,
        roles,
        permisos,
        rolesPermisos,
        modulos,
        tiposProceso,
        // Add relations
        abogadosRelations,
        clientesRelations,
        procesosRelations,
        actualizacionesRelations,
        documentosRelations,
        rolesRelations,
        modulosRelations,
        permisosRelations,
        rolesPermisosRelations,
        tiposProcesoRelations,
      },
      mode: "default",
    });
  }

  // Abogado methods
  async getAbogado(id: string): Promise<Abogado | undefined> {
    return this.db.query.abogados.findFirst({ where: eq(abogados.id, id) });
  }

  async getAbogadoByCorreo(correo: string): Promise<Abogado | undefined> {
    return this.db.query.abogados.findFirst({ where: eq(abogados.correo, correo) });
  }

  async getAllAbogados(): Promise<Abogado[]> {
    return this.db.query.abogados.findMany({
      orderBy: (abogados, { asc }) => [asc(abogados.nombre)],
    });
  }

  async createAbogado(insertAbogado: InsertAbogado): Promise<Abogado> {
    const id = randomUUID();
    const newAbogado: Abogado = {
      ...insertAbogado,
      id,
      rolId: insertAbogado.rolId ?? null,             // si no viene, null
      activo: insertAbogado.activo ?? true,           // si no viene, por defecto true
      fechaRegistro: insertAbogado.fechaRegistro ?? new Date(),
      state: insertAbogado.state ?? true,             // si no viene, por defecto true
    };
    await this.db.insert(abogados).values(newAbogado);
    return newAbogado;
  }

  async updateAbogado(id: string, updates: Partial<Abogado>): Promise<Abogado | undefined> {
    await this.db.update(abogados).set(updates).where(eq(abogados.id, id));
    return this.getAbogado(id);
  }

  // Cliente methods
  async getClientes(abogadoId: string, limit: number, offset: number, filter?: { search?: string, activo?: boolean }) {
    const conditions: any[] = [eq(clientes.abogadoId, abogadoId)];

    if (filter?.search) {
      const search = `${filter.search}%`;
      const likeConditions = [
        like(clientes.nombre, search),
        like(clientes.documento, search),
        like(clientes.correo, search),
      ].filter((c): c is SQL<unknown> => c !== undefined);

      if (likeConditions.length > 0) {
        conditions.push(or(...likeConditions));
      }
    }

    if (filter?.activo !== undefined) {
      conditions.push(eq(clientes.activo, filter.activo));
    }

    const data = await this.db
      .select()
      .from(clientes)
      .where(and(...conditions))
      .orderBy(desc(clientes.fechaCreacion))
      .limit(limit)
      .offset(offset);

    return data;
  }

  async getClientesCount(abogadoId: string, filter?: any): Promise<number> {
    const conditions: any[] = [eq(clientes.abogadoId, abogadoId)];

    if (filter?.search) {
      const search = `${filter.search}%`;
      const likeConditions = [
        like(clientes.nombre, search),
        like(clientes.documento, search),
        like(clientes.correo, search),
      ].filter((c): c is SQL<unknown> => c !== undefined);

      if (likeConditions.length > 0) {
        conditions.push(or(...likeConditions));
      }
    }

    if (filter?.activo !== undefined) {
      conditions.push(eq(clientes.activo, filter.activo === 'true'));
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(clientes)
      .where(and(...conditions));

    return result[0]?.count ?? 0;

  }

  async getCliente(id: string): Promise<Cliente | undefined> {
    return this.db.query.clientes.findFirst({ where: eq(clientes.id, id) });
  }

  async getClienteByDocument(documento: string): Promise<Cliente | undefined> {
    return this.db.query.clientes.findFirst({ where: eq(clientes.documento, documento) });
  }

  async createCliente(insertCliente: InsertCliente): Promise<Cliente> {
    const id = randomUUID();

    const newCliente: Cliente = {
      ...insertCliente,
      id,
      rolId: insertCliente.rolId ?? 4,
      activo: insertCliente.activo ?? true,
      fechaCreacion: insertCliente.fechaCreacion ?? new Date(),
      state: insertCliente.state ?? true,
    };
    await this.db.insert(clientes).values(newCliente);
    const clienteCreado = await this.db
      .select()
      .from(clientes)
      .where(eq(clientes.id, id))
      .limit(1)
      .then(rows => rows[0]);

    if (!clienteCreado) {
      throw new Error("No se pudo crear el cliente");
    }

    return clienteCreado;
  }

  async updateCliente(id: string, updates: Partial<InsertCliente>): Promise<Cliente | undefined> {
    await this.db.update(clientes).set(updates).where(eq(clientes.id, id));
    return this.getCliente(id);
  }

  async deleteCliente(id: string): Promise<void> {
    await this.db.delete(clientes).where(eq(clientes.id, id));
  }

  // Proceso methods
  // ============================================
  // OPTIMIZED: SQL-level filtering, pagination, and COUNT
  // ============================================

  async getProcesos(
    abogadoId: string,
    limit: number = 10,
    offset: number = 0,
    filter?: ProcesoFilter
  ): Promise<{ data: ProcesoDTO[]; total: number }> {

    const conditions: any[] = [
      eq(procesos.abogadoId, abogadoId),
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
        LOWER(${clientes.nombre}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search})
      )`
      );
    }

    // Obtener total
    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(procesos)
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions));

    // Obtener datos paginados
    const results = await this.db
      .select({
        id: procesos.id,
        state: procesos.state,
        abogadoId: procesos.abogadoId,
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
      abogadoId: p.abogadoId,
      fechaCreacion: p.fechaCreacion,
      clienteId: p.clienteId,
      tipoProcesoId: p.tipoProcesoId,
      tipoProceso: p.tipoProcesoNombre || null,
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
  async getProcesosCount(abogadoId: string, filter?: ProcesoFilter): Promise<number> {
    const conditions: any[] = [
      eq(procesos.abogadoId, abogadoId),
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
  const conditions: any[] = [
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

  // Obtener total
  const [{ count }] = await this.db
    .select({ count: sql<number>`COUNT(*)` })
    .from(procesos)
    .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
    .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
    .where(and(...conditions));

  // Obtener datos paginados
  const results = await this.db
    .select({
      id: procesos.id,
      state: procesos.state,
      abogadoId: procesos.abogadoId,
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

  // Transformar a DTO
  const data = results.map(p => ({
    id: p.id,
    state: p.state,
    abogadoId: p.abogadoId,
    fechaCreacion: p.fechaCreacion,
    clienteId: p.clienteId,
    tipoProcesoId: p.tipoProcesoId,
    radicado: p.radicado,
    juzgado: p.juzgado,
    estadoId: p.estadoId,
    descripcionEstado: p.descripcionEstado,
    clienteNombre: 'Sin cliente',
    tipoProceso: p.tipoProcesoNombre || null,
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

    // Transform to include enriched data
    return {
      id: rawProceso.id,
      state: rawProceso.state,
      abogadoId: rawProceso.abogadoId,
      fechaCreacion: rawProceso.fechaCreacion,
      clienteId: rawProceso.clienteId,
      tipoProcesoId: rawProceso.tipoProcesoId,
      radicado: rawProceso.radicado,
      juzgado: rawProceso.juzgado,
      estadoId: rawProceso.estadoId,
      descripcionEstado: rawProceso.descripcionEstado,
      clienteNombre: rawProceso.cliente?.nombre || 'Sin cliente',
      tipoProceso: rawProceso.tipoProceso?.nombre || null,
      estado: rawProceso.estado ? {
        id: rawProceso.estado.id,
        codigo: rawProceso.estado.codigo,
        nombre: rawProceso.estado.nombre,
        color: rawProceso.estado.color,
      } : null,
    };
  }

  async createProceso(insertProceso: InsertProceso): Promise<DbProceso> {
    const id = randomUUID();
    const newProceso: DbProceso = {
      ...insertProceso,
      id,
      fechaCreacion: insertProceso.fechaCreacion ?? new Date(),
      tipoProceso: insertProceso.tipoProceso ?? null,
      tipoProcesoId: insertProceso.tipoProcesoId ?? null,
      state: insertProceso.state ?? true,             // si no viene, por defecto true
    };
    await this.db.insert(procesos).values(newProceso);
    return newProceso;
  }

  async updateProceso(id: string, updates: Partial<InsertProceso>): Promise<ProcesoDTO | undefined> {
    // Get the current proceso to check if estado changed
    const currentProceso = await this.getProceso(id);
    
    await this.db.update(procesos).set({ ...updates, state: updates.state ?? true }).where(eq(procesos.id, id));
    
    // Check if estado changed and create notification
    if (updates.estadoId && currentProceso && currentProceso.estadoId !== updates.estadoId) {
      try {
        // Get the new estado name
        const newEstadoArray = await this.db.select().from(estadosProceso).where(eq(estadosProceso.id, updates.estadoId));
        const newEstado = newEstadoArray[0];
        const oldEstado = currentProceso.estado;
        
        if (newEstado) {
          await this.createNotificacion({
            procesoId: id,
            clienteId: currentProceso.clienteId,
            abogadoId: currentProceso.abogadoId,
            titulo: `Cambio de estado: ${currentProceso.tipoProceso}`,
            mensaje: `El estado de tu proceso ha cambiado de "${oldEstado?.nombre || 'Desconocido'}" a "${newEstado.nombre}"`,
            tipo: "estado_cambio",
          });
        }
      } catch (e) {
        console.error("Error creating notification:", e);
      }
    }
    
    return this.getProceso(id);
  }

  async deleteProceso(id: string): Promise<void> {
    await this.db.delete(procesos).where(eq(procesos.id, id));
  }

  // Actualizacion methods
  async getActualizaciones(procesoId: string, limit: number = 10, offset: number = 0): Promise<Actualizacion[]> {
    return this.db.query.actualizaciones.findMany({
      where: eq(actualizaciones.procesoId, procesoId),
      orderBy: [desc(actualizaciones.fecha)],
      limit,
      offset,
    });
  }

  async createActualizacion(insertActualizacion: InsertActualizacion): Promise<Actualizacion> {
    const id = randomUUID();

    // Handle fecha - ensure it's a Date object
    let fechaValue: Date;
    if (insertActualizacion.fecha) {
      // If it's already a Date, use it; otherwise try to parse it
      if (insertActualizacion.fecha instanceof Date) {
        fechaValue = insertActualizacion.fecha;
      } else if (typeof insertActualizacion.fecha === 'string') {
        fechaValue = new Date(insertActualizacion.fecha);
      } else {
        // If it's some other type, use current date
        fechaValue = new Date();
      }
    } else {
      fechaValue = new Date();
    }

    // Handle tipoId - if frontend sends tipo (string), lookup the id from tipos_actualizacion
    let tipoIdValue = insertActualizacion.tipoId;

    // If tipoId is not provided but tipo (string) is, lookup the id
    if (!tipoIdValue && insertActualizacion.tipo) {
      const tipoInput = insertActualizacion.tipo.toLowerCase();

      const tipoFound = await this.db
        .select()
        .from(tiposActualizacion)
        .where(sql`LOWER(${tiposActualizacion.nombre}) = ${tipoInput}`)
        .limit(1);

      if (!tipoFound.length) {
        throw new Error(`Tipo de actualización '${insertActualizacion.tipo}' no encontrado`);
      }

      tipoIdValue = tipoFound[0].id;
    }

    if (!tipoIdValue) {
      throw new Error("tipoId es requerido");
    }

    const newActualizacion: Actualizacion = {
      id,
      procesoId: insertActualizacion.procesoId,
      fecha: fechaValue,
      titulo: insertActualizacion.titulo,
      descripcion: insertActualizacion.descripcion,
      tipoId: tipoIdValue,
      documentoId: insertActualizacion.documentoId ?? null,
      state: insertActualizacion.state ?? true,             // si no viene, por defecto true
    };
    await this.db.insert(actualizaciones).values(newActualizacion);
    
    // Create notification for the client
    try {
      const proceso = await this.getProceso(insertActualizacion.procesoId);
      if (proceso) {
        // Get tipo nombre
        const tipoArray = await this.db.select().from(tiposActualizacion).where(eq(tiposActualizacion.id, tipoIdValue));
        const tipoNombre = tipoArray[0]?.nombre || "Actualización";
        
        await this.createNotificacion({
          procesoId: insertActualizacion.procesoId,
          clienteId: proceso.clienteId,
          abogadoId: proceso.abogadoId,
          titulo: `Nueva actualización: ${proceso.tipoProceso}`,
          mensaje: `${tipoNombre}: ${insertActualizacion.titulo}`,
          tipo: "actualizacion",
        });
      }
    } catch (e) {
      console.error("Error creating notification for actualizacion:", e);
    }
    
    return newActualizacion;
  }

  async deleteActualizacion(id: string): Promise<void> {
    await this.db.delete(actualizaciones).where(eq(actualizaciones.id, id));
  }

  // Documento methods
  async getDocumentos(procesoId: string): Promise<Documento[]> {
    return this.db.query.documentos.findMany({ where: eq(documentos.procesoId, procesoId) });
  }

  async getDocumento(id: string): Promise<Documento | undefined> {
    return this.db.query.documentos.findFirst({ where: eq(documentos.id, id) });
  }

  async createDocumento(insertDocumento: InsertDocumento): Promise<Documento> {
    const id = randomUUID();
    const newDocumento: Documento = {
      ...insertDocumento,
      id,
      descripcion: insertDocumento.descripcion ?? null,
      fechaSubida: insertDocumento.fechaSubida ?? new Date(),
      state: insertDocumento.state ?? true,             // si no viene, por defecto true
    };
    await this.db.insert(documentos).values(newDocumento);
    
    // Create notification for the client
    try {
      const proceso = await this.getProceso(insertDocumento.procesoId);
      if (proceso) {
        const docDescripcion = insertDocumento.descripcion || "documento";
        await this.createNotificacion({
          procesoId: insertDocumento.procesoId,
          clienteId: proceso.clienteId,
          abogadoId: proceso.abogadoId,
          titulo: `Nuevo documento: ${proceso.tipoProceso}`,
          mensaje: `Se ha subido un nuevo documento: ${docDescripcion}`,
          tipo: "actualizacion",
        });
      }
    } catch (e) {
      console.error("Error creating notification for documento:", e);
    }
    
    return newDocumento;
  }

  async deleteDocumento(id: string): Promise<void> {
    await this.db.delete(documentos).where(eq(documentos.id, id));
  }

  // Plan methods
  async getPlan(id: string): Promise<Plan | undefined> {
    return this.db.query.planes.findFirst({ where: eq(planes.id, id) });
  }

  async getPlanes(): Promise<Plan[]> {
    return this.db.query.planes.findMany();
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const newPlan = { ...insertPlan, state: insertPlan.state ?? true };
    await this.db.insert(planes).values(newPlan);
    return newPlan;
  }

  // Tipos de Proceso methods
  async getTiposProceso(): Promise<TiposProceso[]> {
    return this.db.query.tiposProceso.findMany();
  }

  async createTipoProceso(tipo: { nombre: string; descripcion?: string }): Promise<TiposProceso> {
    const newTipo = {
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || null,
      activo: true,
    };
    const result = await this.db.insert(tiposProceso).values(newTipo).execute();
    const inserted = await this.db.select().from(tiposProceso).where(eq(tiposProceso.nombre, tipo.nombre)).execute();
    return inserted[0];
  }

  async updateTipoProceso(id: number, updates: { nombre?: string; descripcion?: string; activo?: boolean }): Promise<TiposProceso | undefined> {
    const set: any = { ...updates };
    await this.db.update(tiposProceso).set(set).where(eq(tiposProceso.id, id));
    const result = await this.db.select().from(tiposProceso).where(eq(tiposProceso.id, id)).execute();
    return result[0];
  }

  async deleteTipoProceso(id: number): Promise<void> {
    await this.db.delete(tiposProceso).where(eq(tiposProceso.id, id));
  }

  async getEstadosProceso(): Promise<EstadoProceso[]> {
    const estados = await this.db.query.estadosProceso.findMany();
    if (estados.length === 0) {
      return []
    }
    const result: EstadoProceso[] = [];
    estados.forEach((e) => {
      result.push(e);
    });
    return result;
  }

  async createEstado(estado: { nombre: string; codigo: string; color: string }): Promise<EstadoProceso> {
    const result = await this.db.insert(estadosProceso).values(estado);
    const insertedId = (result as any).insertId;
    return {
      id: insertedId,
      nombre: estado.nombre,
      codigo: estado.codigo,
      color: estado.color,
      state: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Rol methods
  async getRoles(): Promise<Rol[]> {
    return this.db.query.roles.findMany();
  }

  async getRol(id: number): Promise<Rol | undefined> {
    return this.db.query.roles.findFirst({ where: eq(roles.id, id) });
  }

  async getRolByNombre(nombre: string): Promise<Rol | undefined> {
    return this.db.query.roles.findFirst({ where: eq(roles.nombre, nombre) });
  }

  async createRol(rol: InsertRol): Promise<Rol> {
    await this.db.insert(roles).values(rol);
    // For MySQL, we need to query by nombre since there's no RETURNING
    const created = await this.db.query.roles.findFirst({
      where: eq(roles.nombre, rol.nombre),
    });
    if (!created) throw new Error('Failed to create role');
    return created;
  }

  async deleteRol(id: number): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(rolesPermisos)
        .where(eq(rolesPermisos.rolId, id));

      await tx
        .update(abogados)
        .set({ rolId: null })
        .where(eq(abogados.rolId, id));

      await tx
        .delete(roles)
        .where(eq(roles.id, id));
    });
  }

  // Permiso methods
  async getPermisos(): Promise<Permiso[]> {
    const permisosRaw = await this.db.query.permisos.findMany();

    // Map to add modulo as a string field (derived from codigo for backwards compatibility)
    // e.g., "clientes.ver" -> "clientes"
    return permisosRaw.map(p => ({
      ...p,
      modulo: p.codigo.split('.')[0],
    }));
  }

  async getModulos(): Promise<Modulo[]> {
    try {
      const result = await this.db.select().from(modulos).execute();
      return result;
    } catch (e) {
      // If modulos table doesn't exist, return empty array
      console.warn("modulos table not found:", e);
      return [];
    }
  }

  async getPermisosByRol(rolId: number): Promise<Permiso[]> {
    // Obtener los IDs de permisos asociados al rol
    const rp = await this.db.query.rolesPermisos.findMany({
      where: eq(rolesPermisos.rolId, rolId),
    });

    if (rp.length === 0) return [];

    const permisoIds = rp.map((r) => r.permisoId);
    const result = await this.db.query.permisos.findMany({
      where: inArray(permisos.id, permisoIds),
    });

    return result;
  }

  async getPermisosByUsuario(userId: string, userType: "abogado" | "cliente"): Promise<string[]> {
    const cacheKey = `${userType}_${userId}`;
    if (permisosCache.has(cacheKey)) {
      return permisosCache.get(cacheKey)!;
    }

    let permisos: string[] = [];

    if (userType === "cliente") {
      const cliente = await this.getCliente(userId);

      if (!cliente || !cliente.rolId) {
        permisos = ["procesos.ver", "actualizaciones.ver", "documentos.ver", "perfil.ver"];
      } else {
        const permisosRol = await this.getPermisosByRol(cliente.rolId);
        permisos = permisosRol.filter(p => p.activo).map(p => p.codigo);
      }
    } else {
      const abogado = await this.getAbogado(userId);

      if (!abogado || !abogado.rolId) {
        permisos = [
          "clientes.ver", "clientes.crear", "clientes.editar", "clientes.eliminar",
          "procesos.ver", "procesos.crear", "procesos.editar", "procesos.eliminar",
          "actualizaciones.ver", "actualizaciones.crear", "actualizaciones.eliminar",
          "documentos.ver", "documentos.subir", "documentos.eliminar",
          "dashboard.ver", "perfil.ver", "perfil.editar",
        ];
      } else {
        const permisosRol = await this.getPermisosByRol(abogado.rolId);
        permisos = permisosRol.filter(p => p.activo).map(p => p.codigo);
      }
    }
    permisosCache.set(cacheKey, permisos);

    return permisos;
  }

  // Notificacion methods
  async getNotificacionesByClienteId(clienteId: string): Promise<Notificacion[]> {
    try {
      const results = await this.db
        .select()
        .from(notificaciones)
        .where(eq(notificaciones.clienteId, clienteId))
        .orderBy(desc(notificaciones.createdAt));
      return results;
    } catch (e) {
      console.error("Error getting notificaciones:", e);
      return [];
    }
  }

  async getNotificacionesCountByClienteId(clienteId: string): Promise<number> {
    try {
      const results = await this.db
        .select()
        .from(notificaciones)
        .where(and(
          eq(notificaciones.clienteId, clienteId),
          eq(notificaciones.leidoCliente, false)
        ));
      return results.length;
    } catch (e) {
      console.error("Error getting notificaciones count:", e);
      return 0;
    }
  }

  async markNotificacionLeidaCliente(notificacionId: number): Promise<void> {
    await this.db
      .update(notificaciones)
      .set({ leidoCliente: true, updatedAt: new Date() })
      .where(eq(notificaciones.id, notificacionId));
  }

  async getNotificacionesByAbogadoId(abogadoId: string): Promise<Notificacion[]> {
    try {
      const results = await this.db
        .select()
        .from(notificaciones)
        .where(eq(notificaciones.abogadoId, abogadoId))
        .orderBy(desc(notificaciones.createdAt));
      return results;
    } catch (e) {
      console.error("Error getting notificaciones:", e);
      return [];
    }
  }

  async getNotificacionesCountByAbogadoId(abogadoId: string): Promise<number> {
    try {
      const results = await this.db
        .select()
        .from(notificaciones)
        .where(and(
          eq(notificaciones.abogadoId, abogadoId),
          eq(notificaciones.leidoAbogado, false)
        ));
      return results.length;
    } catch (e) {
      console.error("Error getting notificaciones count:", e);
      return 0;
    }
  }

  async markNotificacionLeidaAbogado(notificacionId: number): Promise<void> {
    await this.db
      .update(notificaciones)
      .set({ leidoAbogado: true, updatedAt: new Date() })
      .where(eq(notificaciones.id, notificacionId));
  }

  async createNotificacion(notificacion: InsertNotificacion): Promise<Notificacion> {
    const newNotificacion = {
      ...notificacion,
      tipo: notificacion.tipo || "estado_cambio",
      leidoCliente: false,
      leidoAbogado: false,
    };
    await this.db.insert(notificaciones).values(newNotificacion);
    // Get the inserted record
    const results = await this.db
      .select()
      .from(notificaciones)
      .where(eq(notificaciones.procesoId, notificacion.procesoId))
      .orderBy(desc(notificaciones.createdAt));
    return results[0];
  }

}

const permisosCache = new Map<string, string[]>();


export const storage = new DrizzleStorage();
