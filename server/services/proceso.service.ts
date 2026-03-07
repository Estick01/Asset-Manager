
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

import { notificacionesService } from "./notificacion.service";
import { clientes, Documento, documentos, EstadoProceso, estadosProceso, InsertDocumento, InsertProceso, lawyerProfiles, procesos, procesoLawyers, TiposProceso, tiposProceso } from "@/shared/schema";
import { db } from "../db";
import { Actualizacion, actualizaciones, InsertActualizacion } from '@/shared/schema/actualizaciones.schema';
import { tiposActualizacion } from "@/shared/schema/tipos-actualizacion.schema";
import { ProcesoDTO } from "@/shared/schema/proceso.schema";




export type ProcesoFilter = {
  estadoCodigo?: string;
  search?: string;
};

export class ProcesosService {
  async getProcesos(
    lawyerId: string, // Changed from abogadoId
    limit: number = 10,
    offset: number = 0,
    filter?: ProcesoFilter
  ): Promise<{ data: ProcesoDTO[]; total: number }> {
    const conditions: any[] = [eq(procesoLawyers.lawyerId, lawyerId)];

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

    const [{ count }] = await db
     .select({ count: sql<number>`COUNT(DISTINCT ${procesos.id})` })
      .from(procesos)
      .leftJoin(procesoLawyers, eq(procesos.id, procesoLawyers.procesoId))
      .leftJoin(clientes, eq(procesos.clienteId, clientes.id))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions));

    const results = await db
      .select({
        id: procesos.id,
        state: procesos.state,
        lawyerId: procesoLawyers.lawyerId,
        fechaCreacion: procesos.fechaCreacion,
        clienteId: procesos.clienteId,
        tipoProcesoId: procesos.tipoProcesoId,
        radicado: procesos.radicado,
        juzgado: procesos.juzgado,
        estadoId: procesos.estadoId,
        descripcionEstado: procesos.descripcionEstado,
        clienteNombre: clientes.nombre,
        tiposProceso: tiposProceso,
        estadoIdRel: estadosProceso.id,
        estadoCodigo: estadosProceso.codigo,
        estadoNombre: estadosProceso.nombre,
        estadoColor: estadosProceso.color,
      })
      .from(procesos)
      .leftJoin(procesoLawyers, eq(procesos.id, procesoLawyers.procesoId))
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
      lawyerId: p.lawyerId || '',
      fechaCreacion: p.fechaCreacion,
      clienteId: p.clienteId,
      tipoProcesoId: p.tipoProcesoId,
        tipoProceso: p.tiposProceso
          ? {
              id: p.tiposProceso.id,
              nombre: p.tiposProceso.nombre,
              descripcion: p.tiposProceso.descripcion,
              activo: p.tiposProceso.activo,
              createdAt: p.tiposProceso.createdAt,
              updatedAt: p.tiposProceso.updatedAt,
            }
          : undefined,
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
            state: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : undefined,
    }));

    return { data, total: Number(count) };
  }

  async getProcesosCount(lawyerId: string, filter?: ProcesoFilter): Promise<number> {
    const conditions: any[] = [eq(procesoLawyers.lawyerId, lawyerId)];

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

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(procesos)
      .leftJoin(procesoLawyers, eq(procesos.id, procesoLawyers.procesoId))
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

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(procesos)
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions));

    const results = await db
      .select({
        id: procesos.id,
        state: procesos.state,
        lawyerId: procesoLawyers.lawyerId,
        fechaCreacion: procesos.fechaCreacion,
        clienteId: procesos.clienteId,
        tipoProcesoId: procesos.tipoProcesoId,
        radicado: procesos.radicado,
        juzgado: procesos.juzgado,
        estadoId: procesos.estadoId,
        descripcionEstado: procesos.descripcionEstado,
        tiposProceso: tiposProceso,
        estadoIdRel: estadosProceso.id,
        estadoCodigo: estadosProceso.codigo,
        estadoNombre: estadosProceso.nombre,
        estadoColor: estadosProceso.color,
        estadoState: estadosProceso.state,
        estadoCreatedAt: estadosProceso.createdAt,
        estadoUpdatedAt: estadosProceso.updatedAt,
      })
      .from(procesos)
      .leftJoin(procesoLawyers, eq(procesos.id, procesoLawyers.procesoId))
      .leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id))
      .leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id))
      .where(and(...conditions))
      .orderBy(desc(procesos.fechaCreacion))
      .limit(limit)
      .offset(offset);

    const data = results.map(p => ({
      id: p.id,
      state: p.state,
      lawyerId: p.lawyerId || '',
      fechaCreacion: p.fechaCreacion,
      clienteId: p.clienteId,
      tipoProcesoId: p.tipoProcesoId,
      radicado: p.radicado,
      juzgado: p.juzgado,
      estadoId: p.estadoId,
      descripcionEstado: p.descripcionEstado,
      clienteNombre: 'Sin cliente',
      tipoProceso: p.tiposProceso
        ? {
            id: p.tiposProceso.id,
            nombre: p.tiposProceso.nombre,
            descripcion: p.tiposProceso.descripcion,
            activo: p.tiposProceso.activo,
            createdAt: p.tiposProceso.createdAt,
            updatedAt: p.tiposProceso.updatedAt,
          }
        : undefined,
      estado: p.estadoIdRel
        ? {
            id: p.estadoIdRel,
            codigo: p.estadoCodigo || "",
            nombre: p.estadoNombre || "",
            color: p.estadoColor || "",
            state: p.estadoState ?? true,
            createdAt: p.estadoCreatedAt ?? new Date(),
            updatedAt: p.estadoUpdatedAt ?? new Date(),
          }
        : undefined,
    }));

    return { data, total: Number(count) };
  }

  async getProceso(id: string): Promise<ProcesoDTO | undefined> {
    const rawProceso = await db.query.procesos.findFirst({
      where: eq(procesos.id, id),
      with: {
        cliente: true,
        estado: true,
        tipoProceso: true,
        lawyers: true,
      },
    });

    if (!rawProceso) return undefined;

    // Get the first lawyerId from the lawyers relation (for backward compatibility)
    const lawyerId = rawProceso.lawyers && rawProceso.lawyers.length > 0 
      ? rawProceso.lawyers[0].lawyerId 
      : '';

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
      cliente: rawProceso.cliente,
      estado: rawProceso.estado ? {
        id: rawProceso.estado.id,
        codigo: rawProceso.estado.codigo,
        nombre: rawProceso.estado.nombre,
        color: rawProceso.estado.color,
        state: rawProceso.estado.state,
        createdAt: rawProceso.estado.createdAt,
        updatedAt: rawProceso.estado.updatedAt,
      } : undefined,
    };
  }

  async createProceso(insertProceso: InsertProceso & { lawyerId?: string }): Promise<ProcesoDTO> {
    const id = randomUUID();
    const fechaCreacion = insertProceso.fechaCreacion 
      ? new Date(insertProceso.fechaCreacion) 
      : new Date();
    
    const { fechaCreacion: _fechaCreacion, lawyerId, ...procesoWithoutFecha } = insertProceso;
    
    const newProceso = {
      ...procesoWithoutFecha,
      id,
      fechaCreacion,
      tipoProcesoId: insertProceso.tipoProcesoId ?? null,
      state: insertProceso.state ?? true,
      clienteNombre: '',
      descripcionEstado: insertProceso.descripcionEstado ?? '',
      lawyerId: lawyerId ?? '',
    };
    await db.insert(procesos).values(newProceso);
    
    // Create the lawyer-proceso relationship in the junction table
    if (lawyerId) {
      await db.insert(procesoLawyers).values({
        id: randomUUID(),
        procesoId: id,
        lawyerId: lawyerId,
        rol: 'principal',
      });
    }
    
    return newProceso;
  }

  async updateProceso(id: string, updates: Partial<InsertProceso>): Promise<ProcesoDTO | undefined> {
    const currentProceso = await this.getProceso(id);
    
    const processedUpdates = {
      ...updates,
      state: updates.state ?? true,
      ...(updates.fechaCreacion ? { fechaCreacion: new Date(updates.fechaCreacion) } : {}),
    };
    
    await db.update(procesos).set(processedUpdates).where(eq(procesos.id, id));
    
    if (updates.estadoId && currentProceso && currentProceso.estado?.id !== updates.estadoId) {
      try {
        const newEstadoArray = await db.select().from(estadosProceso).where(eq(estadosProceso.id, updates.estadoId));
        const newEstado = newEstadoArray[0];
        const oldEstado = currentProceso.estado;
        
        // Get tipoProceso nombre
        let tipoProcesoNombre = 'Proceso';
        if (currentProceso.tipoProceso?.id) {
          const tipoProcesoArray = await db.select().from(tiposProceso).where(eq(tiposProceso.id, currentProceso.tipoProceso.id));
          if (tipoProcesoArray[0]?.nombre) {
            tipoProcesoNombre = tipoProcesoArray[0].nombre;
          }
        }
        
        if (newEstado && currentProceso) {
          await notificacionesService.notifyProcesoLawyers(currentProceso, {
            titulo: `Cambio de estado: ${tipoProcesoNombre}`,
            mensaje: `El estado de tu proceso ha cambiado de "${
              oldEstado?.nombre || "Desconocido"
            }" a "${newEstado.nombre}"`,
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
    await db.delete(procesos).where(eq(procesos.id, id));
  }

  async getActualizaciones(procesoId: string, limit: number = 10, offset: number = 0): Promise<Actualizacion[]> {
    const results = await db.query.actualizaciones.findMany({
      where: eq(actualizaciones.procesoId, procesoId),
      orderBy: [desc(actualizaciones.fecha)],
      limit,
      offset,
      with: {
        tipo: true,
      },
    });

    return results.map((row) => ({
      id: row.id,
      procesoId: row.procesoId,
      fecha: row.fecha,
      titulo: row.titulo,
      descripcion: row.descripcion,
      tipoId: row.tipo?.id ?? 1,
      documentoId: row.documentoId ?? null,
      state: row.state ?? true,
    }));
  }

  async createActualizacion(insertActualizacion: InsertActualizacion): Promise<Actualizacion> {
    const id = randomUUID();
    let fechaValue: Date;
    if (insertActualizacion.fecha) {
      if (insertActualizacion.fecha instanceof Date) {
        fechaValue = insertActualizacion.fecha;
      } else if (typeof insertActualizacion.fecha === 'string') {
        fechaValue = new Date(insertActualizacion.fecha);
      } else {
        fechaValue = new Date();
      }
    } else {
      fechaValue = new Date();
    }

    // Handle tipoId - must be a valid number
    if (insertActualizacion.tipoId === undefined || insertActualizacion.tipoId === null) {
      throw new Error("tipoId es requerido");
    }
    
    const tipoIdValue = Number(insertActualizacion.tipoId);
    if (isNaN(tipoIdValue) || tipoIdValue < 1) {
      throw new Error("tipoId debe ser un número válido");
    }

    const tipoLookup = await db
      .select()
      .from(tiposActualizacion)
      .where(eq(tiposActualizacion.id, tipoIdValue))
      .limit(1);

    const tipoValue = tipoLookup[0]?.nombre as 'manual' | 'documento' || 'manual';

    const dbActualizacion = {
      id,
      procesoId: insertActualizacion.procesoId,
      fecha: fechaValue,
      titulo: insertActualizacion.titulo,
      descripcion: insertActualizacion.descripcion,
      tipoId: tipoIdValue,
      documentoId: insertActualizacion.documentoId ?? null,
      state: insertActualizacion.state ?? true,
    };
    await db.insert(actualizaciones).values(dbActualizacion);

    const newActualizacion: Actualizacion = {
      id,
      procesoId: insertActualizacion.procesoId,
      fecha: fechaValue,
      titulo: insertActualizacion.titulo,
      descripcion: insertActualizacion.descripcion,
      tipoId: tipoIdValue,
      state: insertActualizacion.state ?? true,
      documentoId: insertActualizacion.documentoId ?? null,
    };
    
    try {
      const proceso = await this.getProceso(insertActualizacion.procesoId);
      if (proceso) {
          const tipoNombre = tipoValue || "Actualización";

          await notificacionesService.notifyProcesoLawyers(proceso, {
            titulo: `Nueva actualización: ${tipoNombre}`,
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
    await db.delete(actualizaciones).where(eq(actualizaciones.id, id));
  }

  async getDocumentos(procesoId: string): Promise<Documento[]> {
    return db.query.documentos.findMany({ where: eq(documentos.procesoId, procesoId) });
  }

  async getDocumento(id: string): Promise<Documento | undefined> {
    return db.query.documentos.findFirst({ where: eq(documentos.id, id) });
  }

  async createDocumento(insertDocumento: InsertDocumento): Promise<Documento> {
    const id = randomUUID();
    const fechaSubida = insertDocumento.fechaSubida 
      ? new Date(insertDocumento.fechaSubida) 
      : new Date();
    const newDocumento: Documento = {
      ...insertDocumento,
      id,
      descripcion: insertDocumento.descripcion ?? "",
      fechaSubida,
      state: insertDocumento.state ?? true,
    };
    await db.insert(documentos).values(newDocumento);
    
    try {
      const proceso = await this.getProceso(insertDocumento.procesoId);
      if (proceso) {
          const docDescripcion = insertDocumento.descripcion || "documento";
          await notificacionesService.notifyProcesoLawyers(proceso, {
            titulo: `Nuevo documento: ${proceso.tipoProceso?.nombre ?? "Proceso"}`,
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
    await db.delete(documentos).where(eq(documentos.id, id));
  }

  async getTiposProceso(): Promise<TiposProceso[]> {
    return db.query.tiposProceso.findMany();
  }

  async createTipoProceso(tipo: { nombre: string; descripcion?: string }): Promise<TiposProceso> {
    const newTipo = {
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || null,
      activo: true,
    };
    await db.insert(tiposProceso).values(newTipo);
    const inserted = await db.select().from(tiposProceso).where(eq(tiposProceso.nombre, tipo.nombre));
    return inserted[0];
  }

  async updateTipoProceso(id: number, updates: { nombre?: string; descripcion?: string; activo?: boolean }): Promise<TiposProceso | undefined> {
    await db.update(tiposProceso).set(updates).where(eq(tiposProceso.id, id));
    const result = await db.select().from(tiposProceso).where(eq(tiposProceso.id, id));
    return result[0];
  }

  async deleteTipoProceso(id: number): Promise<void> {
    await db.delete(tiposProceso).where(eq(tiposProceso.id, id));
  }

  async getEstadosProceso(): Promise<EstadoProceso[]> {
    return db.query.estadosProceso.findMany();
  }

  async createEstado(estado: { nombre: string; codigo: string; color: string }): Promise<EstadoProceso> {
    const result = await db.insert(estadosProceso).values(estado);
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
}

export const procesosService = new ProcesosService();