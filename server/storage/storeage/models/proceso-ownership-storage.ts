// server/storage/storeage/models/proceso-ownership-storage.ts
import { eq, and, desc, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  procesoOwnership,
  type OwnerType,
  type ProcesoOwnershipDTO,
  type TransferOwnershipDTO,
} from "@/shared/schema";
import type { Database } from "../database-storage";

export class ProcesoOwnershipStorage {
  constructor(private db: Database) {}

  /** Ownership activo de un proceso (activo_unique = 1). */
  async getActive(procesoId: string): Promise<ProcesoOwnershipDTO | null> {
    const row = await this.db
      .select()
      .from(procesoOwnership)
      .where(and(
        eq(procesoOwnership.procesoId, procesoId),
        eq(procesoOwnership.activoUnique, 1),
      ))
      .limit(1)
      .then(r => r[0] ?? null);

    return row ? this.toDTO(row) : null;
  }

  /** Historial completo de ownership de un proceso (más reciente primero). */
  async getHistory(procesoId: string): Promise<ProcesoOwnershipDTO[]> {
    const rows = await this.db
      .select()
      .from(procesoOwnership)
      .where(eq(procesoOwnership.procesoId, procesoId))
      .orderBy(desc(procesoOwnership.fechaInicio));

    return rows.map(r => this.toDTO(r));
  }

  /**
   * Transferir ownership de un proceso.
   * Cierra el registro activo y abre uno nuevo.
   */
  async transfer(
    procesoId: string,
    dto: TransferOwnershipDTO,
    creadoPor: string,
  ): Promise<ProcesoOwnershipDTO> {
    const id = randomUUID();

    await this.db.transaction(async (tx) => {
      // 1. Cerrar ownership activo
      await tx
        .update(procesoOwnership)
        .set({ fechaFin: new Date(), activoUnique: null })
        .where(and(
          eq(procesoOwnership.procesoId, procesoId),
          eq(procesoOwnership.activoUnique, 1),
        ));

      // 2. Crear nuevo ownership
      await tx.insert(procesoOwnership).values({
        id,
        procesoId,
        ownerType: dto.ownerType,
        ownerId:   dto.ownerId ?? null,
        activoUnique: 1,
        creadoPor,
        razon: dto.razon ?? null,
      });
    });

    // Note: fechaInicio in returned DTO uses app clock; actual DB value may differ slightly.
    // Use getActive() if you need the authoritative timestamp.
    return {
      id,
      procesoId,
      ownerType:   dto.ownerType,
      ownerId:     dto.ownerId ?? null,
      fechaInicio: new Date(),
      fechaFin:    null,
      activo:      true,
      creadoPor,
      razon:       dto.razon ?? null,
    };
  }

  /**
   * Crear ownership inicial (para proceso recién creado).
   * Solo usar si no existe ningún ownership para el proceso.
   */
  async create(
    procesoId: string,
    ownerType: OwnerType,
    ownerId: string | null,
    creadoPor: string,
    razon?: string,
  ): Promise<ProcesoOwnershipDTO> {
    const id = randomUUID();
    await this.db.insert(procesoOwnership).values({
      id, procesoId, ownerType, ownerId: ownerId ?? null,
      activoUnique: 1, creadoPor, razon: razon ?? null,
    });
    // Note: fechaInicio in returned DTO uses app clock; actual DB value may differ slightly.
    // Use getActive() if you need the authoritative timestamp.
    return {
      id, procesoId, ownerType, ownerId: ownerId ?? null,
      fechaInicio: new Date(), fechaFin: null,
      activo: true, creadoPor, razon: razon ?? null,
    };
  }

  /**
   * Todos los procesoIds donde owner_type + owner_id tienen ownership activo.
   */
  async getProcesoIdsByOwner(ownerType: OwnerType, ownerId: string | null): Promise<string[]> {
    const rows = await this.db
      .select({ procesoId: procesoOwnership.procesoId })
      .from(procesoOwnership)
      .where(and(
        eq(procesoOwnership.ownerType, ownerType),
        ownerId !== null
          ? eq(procesoOwnership.ownerId, ownerId)
          : isNull(procesoOwnership.ownerId),
        eq(procesoOwnership.activoUnique, 1),
      ));
    return rows.map(r => r.procesoId);
  }

  private toDTO(row: typeof procesoOwnership.$inferSelect): ProcesoOwnershipDTO {
    return {
      id:          row.id,
      procesoId:   row.procesoId,
      ownerType:   row.ownerType as OwnerType,
      ownerId:     row.ownerId ?? null,
      fechaInicio: row.fechaInicio,
      fechaFin:    row.fechaFin ?? null,
      activo:      row.activoUnique === 1,
      creadoPor:   row.creadoPor,
      razon:       row.razon ?? null,
    };
  }
}
