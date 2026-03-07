

/**
 * Cliente Storage
 * Handles all database operations for clients (clientes)
 */

import { Cliente, clientes, departamentos, InsertCliente, lawyerClients, municipios, procesoLawyers, procesos, tiposDocumento, users } from "@/shared/schema";
import { randomUUID } from "crypto";
import { eq, and, desc, like, sql, SQL, or, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";



export class ClienteStorage {
  constructor(private db: MySql2Database<any>) { }

  async getClientes(lawyerId: string, limit: number = 10, offset: number = 0, filter?: { search?: string }): Promise<Cliente[]> {
    // Get cliente IDs associated with this lawyer through procesoLawyers
    const lawyerProcesoIds = await this.db
      .select({ procesoId: procesoLawyers.procesoId })
      .from(procesoLawyers)
      .where(eq(procesoLawyers.lawyerId, lawyerId));

    // Get unique cliente IDs from the proceso
    const procesoResults = await this.db
      .select({ clienteId: procesos.clienteId })
      .from(procesos)
      .where(inArray(procesos.id, lawyerProcesoIds.map(p => p.procesoId)));

    const clienteIds = [...new Set([
      ...procesoResults.map(p => p.clienteId)
    ])];

    if (clienteIds.length === 0) {
      return [];
    }

    const conditions: any[] = [inArray(clientes.id, clienteIds)];

    if (filter?.search) {
      const search = `${filter.search}%`;
      const likeConditions = [
        like(clientes.nombre, search),
        like(clientes.documento, search),
      ].filter((c): c is SQL<unknown> => c !== undefined);

      if (likeConditions.length > 0) {
        conditions.push(or(...likeConditions));
      }
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

    async getClientesCount(lawyerId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(lawyerClients)
      .where(
        and(
          eq(lawyerClients.lawyerId, lawyerId),
          eq(lawyerClients.status, "active")
        )
      );

    return Number(result[0]?.count ?? 0);
  }

async getCliente(id: string): Promise<Cliente | undefined> {
  const result = await this.db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      apellido: clientes.apellido,
      telefono: clientes.telefono,
      documento: clientes.documento,
      tipoDocumentoId: clientes.tipoDocumentoId,
      direccion: clientes.direccion,
      departamentoId: clientes.departamentoId,
      municipioId: clientes.municipioId,
      activo: clientes.activo,
      fechaCreacion: clientes.fechaCreacion,
      tipoDocumento: {
        id: tiposDocumento.id,
        codigo: tiposDocumento.codigo,
        nombre: tiposDocumento.nombre,
      },
      user: {
        id: users.id,
        email: users.email,
        isActive: users.isActive,
        createdAt: users.createdAt,
      },
      departamento: {
        id: departamentos.id,
        codigo: departamentos.codigo,
        nombre: departamentos.nombre,
      },
      municipio: {
        id: municipios.id,
        codigo: municipios.codigo,
        nombre: municipios.nombre,
      },
    })
    .from(clientes)
    .innerJoin(users, eq(clientes.userId, users.id))
    .leftJoin(departamentos, eq(clientes.departamentoId, departamentos.id))  
    .leftJoin(municipios, eq(clientes.municipioId, municipios.id))
    .leftJoin(tiposDocumento, eq(clientes.tipoDocumentoId, tiposDocumento.id))          
    .where(eq(clientes.id, id))
    .limit(1);

  if (!result[0]) return undefined;

  const row = result[0];

  return {
    ...row,
    departamento: row.departamento?.id ? row.departamento : null,
    municipio: row.municipio?.id ? row.municipio : null,
    tipoDocumento: row.tipoDocumento?.id ? row.tipoDocumento : null,
    user: row.user?.id ? row.user : null,     
  };
}

  async getClienteByDocument(documento: string): Promise<Cliente | undefined> {
    const result = await this.db
      .select()
      .from(clientes)
      .where(eq(clientes.documento, documento))
      .limit(1)
      .then(rows => rows[0]);
    if (!result) return undefined;
    return {
      ...result,
    };
  }

  async createCliente(cliente: InsertCliente,tx?: any): Promise<Cliente> {
    const dbInstance = tx ?? this.db;

    if (!cliente.userId) {
      throw new Error("userId es obligatorio");
    }

    const id = randomUUID();

    const dbCliente = {
      ...cliente,
      id,
      activo: cliente.activo ?? true,
      fechaCreacion: new Date(),
      departamento_id : cliente.departamentoId ?? null,
      municipio_id : cliente.municipioId ?? null,
    };

    await dbInstance.insert(clientes).values(dbCliente);

    const clienteCreado = await dbInstance
      .select()
      .from(clientes)
      .where(eq(clientes.id, id))
      .limit(1)
      .then((rows: Cliente[]) => rows[0]);

    if (!clienteCreado) {
      throw new Error("No se pudo crear el cliente");
    }

    return clienteCreado;
  }

  async updateCliente(id: string, updates: Partial<InsertCliente>): Promise<Cliente | undefined> {
    const dbUpdates: any = { ...updates };
    if (updates.fechaCreacion !== undefined) {
      dbUpdates.fechaCreacion = new Date(updates.fechaCreacion);
    }
    await this.db.update(clientes).set(dbUpdates).where(eq(clientes.id, id));
    return this.getCliente(id);
  }

  async deleteCliente(id: string): Promise<void> {
    await this.db.delete(clientes).where(eq(clientes.id, id));
  }

  async getClienteByUser(userId: string): Promise<Cliente | undefined> {
    const result = await this.db
      .select()
      .from(clientes)
      .where(eq(clientes.userId, userId))
      .limit(1)
      .then(rows => rows[0]);
    return result;
  }
      
}
