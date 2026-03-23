// server/storage/storeage/models/stage-task-template-storage.ts
import { eq, and, or, isNull, asc } from "drizzle-orm";
import {
  etapasTareasPlantilla,
  type EtapaTareaPlantilla,
  type CreateTemplateDTO,
  type UpdateTemplateDTO,
  type TemplateResponseDTO,
  type TareaPrioridad,
} from "@/shared/schema";
import type { Database } from "../database-storage";

function toDTO(r: EtapaTareaPlantilla): TemplateResponseDTO {
  return {
    id:             r.id,
    tipoProcesoId:  r.tipoProcesoId ?? null,
    legalStageCode: r.legalStageCode,
    titulo:         r.titulo,
    descripcion:    r.descripcion ?? null,
    prioridad:      r.prioridad as TareaPrioridad,
    requerida:      r.requerida === 1,
    orden:          r.orden,
    activo:         r.activo === 1,
  };
}

export class StageTaskTemplateStorage {
  constructor(private db: Database) {}

  async getByStage(
    legalStageCode: string,
    tipoProcesoId?: number | null,
  ): Promise<TemplateResponseDTO[]> {
    const rows = await this.db
      .select()
      .from(etapasTareasPlantilla)
      .where(
        and(
          eq(etapasTareasPlantilla.legalStageCode, legalStageCode),
          eq(etapasTareasPlantilla.activo, 1),
          tipoProcesoId != null
            ? or(
                eq(etapasTareasPlantilla.tipoProcesoId, tipoProcesoId),
                isNull(etapasTareasPlantilla.tipoProcesoId),
              )
            : isNull(etapasTareasPlantilla.tipoProcesoId),
        ),
      )
      .orderBy(asc(etapasTareasPlantilla.orden));

    // Dedup: specific overrides generic by titulo
    if (tipoProcesoId == null) return rows.map(toDTO);
    const seen = new Map<string, EtapaTareaPlantilla>();
    for (const row of rows) {
      const key = row.titulo.trim().toLowerCase();
      const existing = seen.get(key);
      if (!existing || row.tipoProcesoId !== null) seen.set(key, row);
    }
    return Array.from(seen.values())
      .sort((a, b) => a.orden - b.orden)
      .map(toDTO);
  }

  async list(
    tipoProcesoId?: number | null,
    legalStageCode?: string,
  ): Promise<TemplateResponseDTO[]> {
    const conditions = [];
    if (tipoProcesoId != null) {
      conditions.push(
        or(
          eq(etapasTareasPlantilla.tipoProcesoId, tipoProcesoId),
          isNull(etapasTareasPlantilla.tipoProcesoId),
        ),
      );
    }
    if (legalStageCode) {
      conditions.push(eq(etapasTareasPlantilla.legalStageCode, legalStageCode));
    }
    const rows = await this.db
      .select()
      .from(etapasTareasPlantilla)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(etapasTareasPlantilla.orden));
    return rows.map(toDTO);
  }

  async create(data: CreateTemplateDTO): Promise<TemplateResponseDTO> {
    const result = await this.db.insert(etapasTareasPlantilla).values({
      tipoProcesoId:  data.tipoProcesoId ?? null,
      legalStageCode: data.legalStageCode,
      titulo:         data.titulo,
      descripcion:    data.descripcion ?? null,
      prioridad:      data.prioridad ?? "media",
      requerida:      data.requerida ? 1 : 0,
      orden:          data.orden ?? 0,
      activo:         1,
    });
    // Use insertId from MySQL result header — avoids race condition with full-table scan
    const insertId = Number((result as any).insertId ?? (result as any)[0]?.insertId);
    const [row] = await this.db
      .select()
      .from(etapasTareasPlantilla)
      .where(eq(etapasTareasPlantilla.id, insertId));
    return toDTO(row);
  }

  async update(id: number, data: UpdateTemplateDTO): Promise<TemplateResponseDTO | null> {
    await this.db
      .update(etapasTareasPlantilla)
      .set({
        ...(data.titulo       !== undefined && { titulo:       data.titulo }),
        ...(data.descripcion  !== undefined && { descripcion:  data.descripcion }),
        ...(data.prioridad    !== undefined && { prioridad:    data.prioridad }),
        ...(data.requerida    !== undefined && { requerida:    data.requerida ? 1 : 0 }),
        ...(data.orden        !== undefined && { orden:        data.orden }),
        ...(data.activo       !== undefined && { activo:       data.activo ? 1 : 0 }),
      })
      .where(eq(etapasTareasPlantilla.id, id));
    const [row] = await this.db
      .select()
      .from(etapasTareasPlantilla)
      .where(eq(etapasTareasPlantilla.id, id));
    return row ? toDTO(row) : null;
  }

  async delete(id: number): Promise<void> {
    await this.db
      .update(etapasTareasPlantilla)
      .set({ activo: 0 })
      .where(eq(etapasTareasPlantilla.id, id));
  }

  async getById(id: number): Promise<TemplateResponseDTO | null> {
    const [row] = await this.db
      .select()
      .from(etapasTareasPlantilla)
      .where(eq(etapasTareasPlantilla.id, id));
    return row ? toDTO(row) : null;
  }
}
