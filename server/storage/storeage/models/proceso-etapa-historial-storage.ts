import { randomUUID } from "crypto";
import { eq, and, desc, asc } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { procesoEtapaHistorial, ProcesoEtapaHistorial, InsertProcesoEtapaHistorial, ETAPA_ESTADOS } from "@/shared/schema";

export class ProcesoEtapaHistorialStorage {
  constructor(private db: MySql2Database<any>) {}

  async createHistorial(insertData: InsertProcesoEtapaHistorial): Promise<ProcesoEtapaHistorial> {
    const id = randomUUID();
    const newRecord: ProcesoEtapaHistorial = {
      ...insertData,
      id,
      fecha: insertData.fecha || new Date(),
      observacion: insertData.observacion || null,
      usuarioId: insertData.usuarioId || null,
      createdAt: new Date(),
    };

    await this.db.insert(procesoEtapaHistorial).values(newRecord);
    return newRecord;
  }

  async getHistorialByProceso(procesoId: string): Promise<ProcesoEtapaHistorial[]> {
    return this.db
      .select()
      .from(procesoEtapaHistorial)
      .where(eq(procesoEtapaHistorial.procesoId, procesoId))
      .orderBy(asc(procesoEtapaHistorial.fecha));
  }

  async getHistorialByProcesoYEtapa(procesoId: string, etapa: string): Promise<ProcesoEtapaHistorial[]> {
    return this.db
      .select()
      .from(procesoEtapaHistorial)
      .where(and(
        eq(procesoEtapaHistorial.procesoId, procesoId),
        eq(procesoEtapaHistorial.etapa, etapa)
      ))
      .orderBy(desc(procesoEtapaHistorial.fecha)); // Más reciente primero
  }

  async getUltimoEstadoPorEtapa(procesoId: string): Promise<Record<string, ProcesoEtapaHistorial>> {
    const historial = await this.getHistorialByProceso(procesoId);
    const ultimoPorEtapa: Record<string, ProcesoEtapaHistorial> = {};

    // Procesar en orden cronológico para obtener el último estado de cada etapa
    for (const registro of historial) {
      if (!ultimoPorEtapa[registro.etapa]) {
        ultimoPorEtapa[registro.etapa] = registro;
      }
    }

    return ultimoPorEtapa;
  }

  async getUltimoEstado(procesoId: string, etapa: string): Promise<ProcesoEtapaHistorial | null> {
    const historial = await this.getHistorialByProcesoYEtapa(procesoId, etapa);
    return historial[0] || null;
  }

  async validarEstado(estado: string): Promise<boolean> {
    return ETAPA_ESTADOS.includes(estado as any);
  }
}