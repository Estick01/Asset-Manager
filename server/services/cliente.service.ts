import { eq, and, or, like, desc, sql, SQL, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { Cliente, clientes, InsertCliente, lawyerClients } from "@/shared/schema";
import { db } from "../db";
import { hashPassword } from "@/server/auth";
import { storage } from "../storage/storeage/database-storage";

export class ClientesService {
  async getClientes(lawyerId: string, limit: number, offset: number, filter?: { search?: string, activo?: boolean }): Promise<Cliente[]> {
    // Get client IDs from lawyer_clients table
    const lawyerClientRelations = await db
      .select({ clientId: lawyerClients.clientId })
      .from(lawyerClients)
      .where(
        and(
          eq(lawyerClients.lawyerId, lawyerId),
          eq(lawyerClients.status, "active")
        )
      );

    const clientIds = lawyerClientRelations.map(r => r.clientId);
    
    if (clientIds.length === 0) {
      return [];
    }

    const conditions: any[] = [inArray(clientes.id, clientIds)];

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

    if (filter?.activo !== undefined) {
      conditions.push(eq(clientes.activo, filter.activo));
    }

    const data = await db
      .select()
      .from(clientes)
      .where(and(...conditions))
      .orderBy(desc(clientes.fechaCreacion))
      .limit(limit)
      .offset(offset);

    return data;
  }

  async getClientesCount(lawyerId: string, filter?: any): Promise<number> {
    // Get client IDs from lawyer_clients table
    const lawyerClientRelations = await db
      .select({ clientId: lawyerClients.clientId })
      .from(lawyerClients)
      .where(
        and(
          eq(lawyerClients.lawyerId, lawyerId),
          eq(lawyerClients.status, "active")
        )
      );

    const clientIds = lawyerClientRelations.map(r => r.clientId);
    
    if (clientIds.length === 0) {
      return 0;
    }

    const conditions: any[] = [inArray(clientes.id, clientIds)];

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

    if (filter?.activo !== undefined) {
      conditions.push(eq(clientes.activo, filter.activo === 'true'));
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(clientes)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  async getCliente(id: string): Promise<Cliente | undefined> {
    const result = await db.query.clientes.findFirst({ where: eq(clientes.id, id) });
    if (!result) return undefined;
    return result;
  }

  async getClienteByDocument(documento: string): Promise<Cliente | undefined> {
    const result = await db.query.clientes.findFirst({ where: eq(clientes.documento, documento) });
    if (!result) return undefined;
    return result;
  }

  async createCliente(insertCliente: InsertCliente, password: string, email: string, lawyerId?: string): Promise<Cliente> {
    const hashedPassword = await hashPassword(password);
    
    // Create the user and cliente
    const cliente = await storage.createClienteWithUser(
      {
        id: randomUUID(),
        email: email,
        passwordHash: hashedPassword,
        planId: "",
        rolId: 4, 
        name:`${insertCliente.nombre} ${insertCliente.apellido}`
      },
      {
        ...insertCliente,
      }
    );

    // If lawyerId provided, create the relationship in lawyer_clients
    if (lawyerId) {
      await storage.lawyerClients.createLawyerClient({
        id: randomUUID(),
        lawyerId: lawyerId,
        clientId: cliente.id,
        status: "active",
      });
    }

    return cliente;
  }

  async updateCliente(id: string, updates: Partial<InsertCliente>): Promise<Cliente | undefined> {
    const dbUpdates: any = { ...updates };
    if (updates.fechaCreacion !== undefined) {
      dbUpdates.fechaCreacion = new Date(updates.fechaCreacion);
    }
    await db.update(clientes).set(dbUpdates).where(eq(clientes.id, id));
    return this.getCliente(id);
  }

  async deleteCliente(id: string): Promise<void> {
    await db.delete(clientes).where(eq(clientes.id, id));
  }
}

export const clientesService = new ClientesService();
