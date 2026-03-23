// server/storage/storeage/models/stage-event-storage.ts
import { eq, and, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  etapaEventos,
  type EtapaEvento,
  type StageEventTipo,
  type StageEventResponseDTO,
} from "@/shared/schema";
import type { Database } from "../database-storage";

function toDTO(r: EtapaEvento): StageEventResponseDTO {
  return {
    id:             r.id,
    procesoId:      r.procesoId,
    legalStageCode: r.legalStageCode,
    tipo:           r.tipo as StageEventTipo,
    descripcion:    r.descripcion,
    metadatos:      r.metadatos as Record<string, unknown> | null,
    creadoPor:      r.creadoPor ?? null,
    createdAt:      r.createdAt,
  };
}

export class StageEventStorage {
  constructor(private db: Database) {}

  async insert(data: {
    procesoId:      string;
    legalStageCode: string;
    tipo:           StageEventTipo;
    descripcion:    string;
    metadatos?:     Record<string, unknown>;
    creadoPor?:     string | null;
  }): Promise<StageEventResponseDTO> {
    const id = randomUUID();
    await this.db.insert(etapaEventos).values({
      id,
      procesoId:      data.procesoId,
      legalStageCode: data.legalStageCode,
      tipo:           data.tipo,
      descripcion:    data.descripcion,
      metadatos:      data.metadatos ?? null,
      creadoPor:      data.creadoPor ?? null,
    });
    const [row] = await this.db
      .select()
      .from(etapaEventos)
      .where(eq(etapaEventos.id, id));
    return toDTO(row);
  }

  async getByStage(
    procesoId: string,
    legalStageCode: string,
  ): Promise<StageEventResponseDTO[]> {
    const rows = await this.db
      .select()
      .from(etapaEventos)
      .where(
        and(
          eq(etapaEventos.procesoId, procesoId),
          eq(etapaEventos.legalStageCode, legalStageCode),
        ),
      )
      .orderBy(asc(etapaEventos.createdAt));   // chronological per spec
    return rows.map(toDTO);
  }
}
