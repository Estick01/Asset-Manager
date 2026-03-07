
import { Actualizacion, actualizaciones, InsertActualizacion } from "@/shared/schema/actualizaciones.schema";
import { tiposActualizacion } from "@/shared/schema/tipos-actualizacion.schema";
import { randomUUID } from "crypto";
import { eq, desc, sql } from "drizzle-orm";


export class ActualizacionStorage {
  constructor(private db: any) {}

  async getActualizaciones(procesoId: string, limit: number = 10, offset: number = 0): Promise<Actualizacion[]> {
    const results = await this.db.query.actualizaciones.findMany({
      where: eq(actualizaciones.procesoId, procesoId),
      orderBy: [desc(actualizaciones.fecha)],
      limit,
      offset,
      with: { tipo: true },
    });

    return results.map((row:any) => ({
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

    const fechaValue = insertActualizacion.fecha
      ? (insertActualizacion.fecha instanceof Date ? insertActualizacion.fecha : new Date(insertActualizacion.fecha))
      : new Date();

    // Handle tipoId - must be a valid number
    if (insertActualizacion.tipoId === undefined || insertActualizacion.tipoId === null) {
      throw new Error("tipoId es requerido");
    }
    
    const tipoIdValue = Number(insertActualizacion.tipoId);
    if (isNaN(tipoIdValue) || tipoIdValue < 1) {
      throw new Error("tipoId debe ser un número válido");
    }

    const tipoLookup = await this.db
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

    await this.db.insert(actualizaciones).values(dbActualizacion);

    return {
      id,
      procesoId: insertActualizacion.procesoId,
      fecha: fechaValue,
      titulo: insertActualizacion.titulo,
      descripcion: insertActualizacion.descripcion,
      tipoId: tipoIdValue,
      documentoId: insertActualizacion.documentoId ?? null,
      state: insertActualizacion.state ?? true
    };
  }

  async deleteActualizacion(id: string): Promise<void> {
    await this.db.delete(actualizaciones).where(eq(actualizaciones.id, id));
  }
}