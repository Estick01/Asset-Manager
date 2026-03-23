
import { Actualizacion, actualizaciones, InsertActualizacion } from "@/shared/schema/actualizaciones.schema";
import { tiposActualizacion } from "@/shared/schema/tipos-actualizacion.schema";
import { randomUUID } from "crypto";
import { eq, desc, sql } from "drizzle-orm";


export class ActualizacionStorage {
  constructor(private db: any) { }

  async getActualizaciones(procesoId: string, limit: number = 10, offset: number = 0): Promise<Actualizacion[]> {
    const results = await this.db.query.actualizaciones.findMany({
      where: eq(actualizaciones.procesoId, procesoId),
      orderBy: [desc(actualizaciones.fecha)],
      limit,
      offset,
      with: { tipo: true },
    });

    return results.map((row: any) => ({
      id: row.id,
      procesoId: row.procesoId,
      fecha: row.fecha,
      titulo: row.titulo,
      descripcion: row.descripcion,
      tipoId: row.tipo?.id ?? 1,
      documentoId: row.documentoId ?? null,
      state: row.state ?? true,
      tipo: row.tipo ? {
        id: row.tipo.id,
        nombre: row.tipo.nombre
      } : null,
    }));
  }

  async createActualizacion(insertActualizacion: InsertActualizacion): Promise<Actualizacion> {
    const id = randomUUID();

    const fechaValue = insertActualizacion.fecha
      ? (insertActualizacion.fecha instanceof Date ? insertActualizacion.fecha : new Date(insertActualizacion.fecha))
      : new Date();

    // Handle tipoId - must be a valid number
    if (insertActualizacion.tipo === undefined || insertActualizacion.tipo === null) {
      throw new Error("tipo es requerido");
    }


    const tipoLookup = await this.db
      .select()
      .from(tiposActualizacion)
      .where(eq(tiposActualizacion.nombre, insertActualizacion.tipo))
      .limit(1);

    const tipo = tipoLookup[0];

    if (!tipo) {
      throw new Error("Tipo de actualización no válido");
    }

    const dbActualizacion = {
      id,
      procesoId: insertActualizacion.procesoId,
      fecha: fechaValue,
      titulo: insertActualizacion.titulo,
      descripcion: insertActualizacion.descripcion,
      tipoId: tipo.id,
      documentoId: insertActualizacion.documentoId ?? null,
      state: insertActualizacion.state ?? true,
      tipo: tipo.nombre as 'manual' | 'documento'
    };

    await this.db.insert(actualizaciones).values(dbActualizacion);

    return {
      id,
      procesoId: insertActualizacion.procesoId,
      fecha: fechaValue,
      titulo: insertActualizacion.titulo,
      descripcion: insertActualizacion.descripcion,
      tipoId: insertActualizacion.tipoId,
      documentoId: insertActualizacion.documentoId ?? null,
      state: insertActualizacion.state ?? true
    };
  }

  async getActualizacion(id: string): Promise<{ id: string; procesoId: string } | null> {
    const rows = await this.db
      .select({ id: actualizaciones.id, procesoId: actualizaciones.procesoId })
      .from(actualizaciones)
      .where(eq(actualizaciones.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async deleteActualizacion(id: string): Promise<void> {
    await this.db.delete(actualizaciones).where(eq(actualizaciones.id, id));
  }
}