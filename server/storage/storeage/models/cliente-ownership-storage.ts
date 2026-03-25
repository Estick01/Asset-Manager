// server/storage/storeage/models/cliente-ownership-storage.ts
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  clienteOwnership,
  type ClienteOwnerType,
  type ClienteOwnershipDTO,
} from "@/shared/schema";
import type { Database } from "../database-storage";

export class ClienteOwnershipStorage {
  constructor(private db: Database) {}

  /** Ownership activo de un cliente (activo_unique = 1). */
  async getActive(clienteId: string): Promise<ClienteOwnershipDTO | null> {
    const row = await this.db
      .select()
      .from(clienteOwnership)
      .where(and(
        eq(clienteOwnership.clienteId, clienteId),
        eq(clienteOwnership.activoUnique, 1),
      ))
      .limit(1)
      .then(r => r[0] ?? null);

    return row ? this.toDTO(row) : null;
  }

  /** Historial completo de ownership de un cliente (más reciente primero). */
  async getHistory(clienteId: string): Promise<ClienteOwnershipDTO[]> {
    const rows = await this.db
      .select()
      .from(clienteOwnership)
      .where(eq(clienteOwnership.clienteId, clienteId))
      .orderBy(desc(clienteOwnership.fechaInicio));

    return rows.map(r => this.toDTO(r));
  }

  /** Crear ownership inicial (para cliente recién creado). */
  async create(
    clienteId: string,
    ownerType: ClienteOwnerType,
    ownerId: string,
    creadoPor: string,
    razon?: string,
  ): Promise<ClienteOwnershipDTO> {
    const id = randomUUID();
    await this.db.insert(clienteOwnership).values({
      id, clienteId, ownerType, ownerId,
      activoUnique: 1, creadoPor, razon: razon ?? null,
    });
    return {
      id, clienteId, ownerType, ownerId,
      fechaInicio: new Date(), fechaFin: null,
      activo: true, creadoPor, razon: razon ?? null,
    };
  }

  /** IDs de clientes donde owner_type + owner_id tienen ownership activo. */
  async getClienteIdsByOwner(ownerType: ClienteOwnerType, ownerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ clienteId: clienteOwnership.clienteId })
      .from(clienteOwnership)
      .where(and(
        eq(clienteOwnership.ownerType, ownerType),
        eq(clienteOwnership.ownerId, ownerId),
        eq(clienteOwnership.activoUnique, 1),
      ));
    return rows.map(r => r.clienteId);
  }

  private toDTO(row: typeof clienteOwnership.$inferSelect): ClienteOwnershipDTO {
    return {
      id:          row.id,
      clienteId:   row.clienteId,
      ownerType:   row.ownerType as ClienteOwnerType,
      ownerId:     row.ownerId,
      fechaInicio: row.fechaInicio,
      fechaFin:    row.fechaFin ?? null,
      activo:      row.activoUnique === 1,
      creadoPor:   row.creadoPor,
      razon:       row.razon ?? null,
    };
  }
}
