// server/storage/storeage/models/proceso-sharing-storage.ts
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  procesoSharing,
  PERMISSION_CEILING,
  type SharedWithType,
  type SharingPermission,
  type ProcesoSharingDTO,
  type CreateSharingDTO,
} from "@/shared/schema";
import type { Database } from "../database-storage";

export class ProcesoSharingStorage {
  constructor(private db: Database) {}

  /** Sharing activo de un proceso (todos los receptores). */
  async getActive(procesoId: string): Promise<ProcesoSharingDTO[]> {
    const rows = await this.db
      .select()
      .from(procesoSharing)
      .where(and(
        eq(procesoSharing.procesoId, procesoId),
        eq(procesoSharing.activoUnique, 1),
      ));
    return rows.map(r => this.toDTO(r));
  }

  /** Historial completo de sharing de un proceso. */
  async getHistory(procesoId: string): Promise<ProcesoSharingDTO[]> {
    const rows = await this.db
      .select()
      .from(procesoSharing)
      .where(eq(procesoSharing.procesoId, procesoId))
      .orderBy(desc(procesoSharing.fechaInicio));
    return rows.map(r => this.toDTO(r));
  }

  /** Sharing activo para una entidad específica (para assertProcesoAccess). */
  async findActive(
    procesoId: string,
    sharedWithType: SharedWithType,
    sharedWithId: string,
  ): Promise<ProcesoSharingDTO | null> {
    const row = await this.db
      .select()
      .from(procesoSharing)
      .where(and(
        eq(procesoSharing.procesoId,       procesoId),
        eq(procesoSharing.sharedWithType,  sharedWithType),
        eq(procesoSharing.sharedWithId,    sharedWithId),
        eq(procesoSharing.activoUnique,    1),
      ))
      .limit(1)
      .then(r => r[0] ?? null);
    return row ? this.toDTO(row) : null;
  }

  /**
   * Crear o actualizar sharing.
   * Si existe sharing activo para el mismo proceso+tipo+receptor → cierra y crea nuevo.
   */
  async upsert(
    procesoId: string,
    dto: CreateSharingDTO,
    creadoPor: string,
  ): Promise<ProcesoSharingDTO> {
    // Validar techo de permiso
    const allowed = PERMISSION_CEILING[dto.sharedWithType];
    if (!allowed.includes(dto.permission)) {
      throw new Error(
        `Permiso '${dto.permission}' no permitido para '${dto.sharedWithType}'. Máximo: ${allowed.join(", ")}`,
      );
    }

    const id = randomUUID();
    await this.db.transaction(async (tx) => {
      // Cerrar sharing activo previo si existe
      await tx
        .update(procesoSharing)
        .set({ fechaFin: new Date(), activoUnique: null })
        .where(and(
          eq(procesoSharing.procesoId,      procesoId),
          eq(procesoSharing.sharedWithType, dto.sharedWithType),
          eq(procesoSharing.sharedWithId,   dto.sharedWithId),
          eq(procesoSharing.activoUnique,   1),
        ));

      // Crear nuevo registro
      await tx.insert(procesoSharing).values({
        id,
        procesoId,
        sharedWithType: dto.sharedWithType,
        sharedWithId:   dto.sharedWithId,
        permission:     dto.permission,
        activoUnique:   1,
        creadoPor,
        razon:          dto.razon ?? null,
      });
    });

    return {
      id, procesoId,
      sharedWithType: dto.sharedWithType,
      sharedWithId:   dto.sharedWithId,
      permission:     dto.permission,
      fechaInicio:    new Date(),
      fechaFin:       null,
      activo:         true,
      creadoPor,
      razon:          dto.razon ?? null,
    };
  }

  /** Revocar sharing por ID del registro. */
  async revoke(shareId: string, procesoId: string): Promise<void> {
    await this.db
      .update(procesoSharing)
      .set({ fechaFin: new Date(), activoUnique: null })
      .where(and(
        eq(procesoSharing.id,        shareId),
        eq(procesoSharing.procesoId, procesoId),
      ));
  }

  /**
   * Revocar todos los sharings activos de un proceso con una entidad.
   * Usado en el flujo de salida del bufete.
   */
  async revokeAllForEntity(
    sharedWithType: SharedWithType,
    sharedWithId: string,
    procesoIds: string[],
  ): Promise<void> {
    if (procesoIds.length === 0) return;
    for (const procesoId of procesoIds) {
      await this.db
        .update(procesoSharing)
        .set({ fechaFin: new Date(), activoUnique: null })
        .where(and(
          eq(procesoSharing.procesoId,      procesoId),
          eq(procesoSharing.sharedWithType, sharedWithType),
          eq(procesoSharing.sharedWithId,   sharedWithId),
          eq(procesoSharing.activoUnique,   1),
        ));
    }
  }

  /** ProcesoIds con sharing activo para una entidad. */
  async getProcesoIdsBySharedWith(
    sharedWithType: SharedWithType,
    sharedWithId: string,
  ): Promise<string[]> {
    const rows = await this.db
      .select({ procesoId: procesoSharing.procesoId })
      .from(procesoSharing)
      .where(and(
        eq(procesoSharing.sharedWithType, sharedWithType),
        eq(procesoSharing.sharedWithId,   sharedWithId),
        eq(procesoSharing.activoUnique,   1),
      ));
    return rows.map(r => r.procesoId);
  }

  private toDTO(row: typeof procesoSharing.$inferSelect): ProcesoSharingDTO {
    return {
      id:             row.id,
      procesoId:      row.procesoId,
      sharedWithType: row.sharedWithType as SharedWithType,
      sharedWithId:   row.sharedWithId,
      permission:     row.permission as SharingPermission,
      fechaInicio:    row.fechaInicio,
      fechaFin:       row.fechaFin ?? null,
      activo:         row.activoUnique === 1,
      creadoPor:      row.creadoPor,
      razon:          row.razon ?? null,
    };
  }
}
