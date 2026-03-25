import { eq, and, or, like, SQL, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  Cliente, clientes, lawyerClients,
  clientesEmpresa, personas,
} from "@/shared/schema";
import { InsertClienteCompleto } from "../storage/storeage/models/cliente-storage";
import { db } from "../db";
import { hashPassword } from "@/server/auth";
import { storage } from "../storage/storeage/database-storage";
import { ownershipPolicyService } from "./ownership-policy.service.js";

export class ClientesService {

  // ----------------------------------------------------------------
  // LIST — lawyer
  // ----------------------------------------------------------------
  async getClientes(
    lawyerId: string,
    limit: number,
    offset: number,
    filter?: { search?: string; activo?: boolean }
  ): Promise<any[]> {
    const procesoClienteIds = await storage.clientes.getClienteIdsByProcesoResponsable(lawyerId);
    const list = await storage.clientes.getClientes(lawyerId, limit, offset, filter, procesoClienteIds);
    return this._enrichWithProcesosStats(list);
  }

  async getClientesCount(lawyerId: string, filter?: any): Promise<number> {
    const procesoClienteIds = await storage.clientes.getClienteIdsByProcesoResponsable(lawyerId);
    return storage.clientes.getClientesCount(lawyerId, procesoClienteIds);
  }

  // ----------------------------------------------------------------
  // LIST — firma
  // ----------------------------------------------------------------
  async getClientesByFirm(
    firmId: string,
    limit: number,
    offset: number,
    filter?: { search?: string; activo?: boolean }
  ): Promise<any[]> {
    const lawyers = await storage.abogados.getLawyersByFirm(firmId);
    const lawyerIds = lawyers.map(l => l.id);
    const allIds = [...new Set([...lawyerIds, firmId])];

    const [lawyerRelations, firmClientIds] = await Promise.all([
      db
        .select({ clientId: lawyerClients.clientId })
        .from(lawyerClients)
        .where(and(inArray(lawyerClients.lawyerId, allIds), eq(lawyerClients.status, "active"))),
      storage.firmClients.getActiveClientIdsByFirm(firmId),
    ]);

    const clientIds = [
      ...new Set([
        ...lawyerRelations.map(r => r.clientId),
        ...firmClientIds,
      ]),
    ];
    if (clientIds.length === 0) return [];

    const results: Cliente[] = [];
    for (const id of clientIds.slice(offset, offset + limit)) {
      const c = await storage.clientes.getCliente(id);
      if (c) results.push(c);
    }
    return this._enrichWithProcesosStats(results);
  }

  // ----------------------------------------------------------------
  // SINGLE
  // ----------------------------------------------------------------
  async getCliente(id: string): Promise<Cliente | undefined> {
    return storage.clientes.getCliente(id);
  }

  async getClienteByDocument(documento: string): Promise<Cliente | undefined> {
    return storage.clientes.getClienteByDocument(documento);
  }

  // ----------------------------------------------------------------
  // CREATE — natural person
  // ----------------------------------------------------------------
  async createCliente(
    insertCliente: InsertClienteCompleto,
    password: string,
    email: string,
    lawyerId?: string,
    firmId?: string,
    options?: {
      rolNombre?: string;
      actorId?: string;
      esPrivadoSolicitado?: boolean;
      userId?: string;
    }
  ): Promise<Cliente> {
    const hashedPassword = await hashPassword(password);

    const displayName = insertCliente.tipo === "natural"
      ? `${(insertCliente as any).nombre} ${(insertCliente as any).apellido}`
      : (insertCliente as any).razonSocial;

    const cliente = await db.transaction(async (tx) => {
      const user = await storage.users.createUser({
        id: randomUUID(),
        email,
        passwordHash: hashedPassword,
        planId: "",
        rolId: 4,
        name: displayName,
      }, tx);

      return storage.clientes.createCliente({ ...insertCliente, userId: user.id }, tx);
    });

    const actorId   = options?.actorId ?? lawyerId ?? firmId ?? "";
    const rolNombre = options?.rolNombre ?? (firmId ? "bufete" : "abogado");
    const createdBy = options?.userId ?? actorId;

    // Determinar ownership según política
    const ownershipDecision = await ownershipPolicyService.resolveForCliente({
      actorId,
      rolNombre,
      esPrivadoSolicitado: options?.esPrivadoSolicitado ?? false,
    });

    // Crear ownership en tabla dedicada
    await storage.clienteOwnership.create(
      cliente.id,
      ownershipDecision.ownerType,
      ownershipDecision.ownerId,
      createdBy,
      `Creado por ${rolNombre}${ownershipDecision.esPrivado ? " (privado)" : ""}`,
    );

    // Actualizar esPrivado y createdBy
    await storage.clientes.updateCliente(cliente.id, {
      esPrivado: ownershipDecision.esPrivado,
      createdBy: actorId,
    });

    // Mantener tablas de relación para compatibilidad
    if (ownershipDecision.ownerType === "bufete") {
      await storage.firmClients.createFirmClient(ownershipDecision.ownerId, cliente.id);
    } else if (ownershipDecision.ownerType === "abogado") {
      await storage.lawyerClients.createLawyerClient({
        id: randomUUID(),
        lawyerId: ownershipDecision.ownerId,
        clientId: cliente.id,
        status: "active",
      });
    }

    return cliente;
  }

  // ----------------------------------------------------------------
  // UPDATE
  // ----------------------------------------------------------------
  async updateCliente(id: string, updates: Partial<InsertClienteCompleto>): Promise<Cliente | undefined> {
    return storage.clientes.updateCliente(id, updates);
  }

  // ----------------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------------
  async deleteCliente(id: string): Promise<void> {
    await storage.clientes.deleteCliente(id);
  }

  // ----------------------------------------------------------------
  // PRIVATE
  // ----------------------------------------------------------------
  private async _enrichWithProcesosStats(list: Cliente[]): Promise<any[]> {
    if (list.length === 0) return [];
    const statsMap = await storage.clientes.getProcesosStatsByClientes(list.map(c => c.id));
    return list.map(c => ({
      ...c,
      procesosStats: statsMap.get(c.id) ?? { total: 0, porEstado: [] },
    }));
  }

  private _applyFilters(conditions: SQL[], filter?: { search?: string; activo?: boolean }) {
    if (filter?.search) {
      const s = `${filter.search}%`;
      conditions.push(or(
        like(personas.nombre, s),
        like(personas.documento, s),
        like(clientesEmpresa.razonSocial, s),
      ) as SQL);
    }
    if (filter?.activo !== undefined) {
      conditions.push(eq(clientes.activo, filter.activo) as SQL);
    }
  }
}

export const clientesService = new ClientesService();
