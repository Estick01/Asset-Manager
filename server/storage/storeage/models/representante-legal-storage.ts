/**
 * Representante Legal Storage
 * CRUD for representantes_legales — not unique per persona (can represent multiple entities)
 */

import { representantesLegales, personas, InsertRepresentanteLegal, RepresentanteLegal } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { MySql2Database } from "drizzle-orm/mysql2";

export class RepresentanteLegalStorage {
  constructor(private db: MySql2Database<any>) {}

  async createRepresentante(data: Omit<InsertRepresentanteLegal, "id">, tx?: any): Promise<RepresentanteLegal> {
    const db = tx ?? this.db;
    const id = randomUUID();
    await db.insert(representantesLegales).values({ ...data, id });
    return { id, ...data, persona: null };
  }

  async getRepresentante(id: string): Promise<RepresentanteLegal | undefined> {
    const result = await this.db
      .select({
        id: representantesLegales.id,
        personaId: representantesLegales.personaId,
        cargo: representantesLegales.cargo,
        email: representantesLegales.email,
        persona: {
          id: personas.id,
          nombre: personas.nombre,
          apellido: personas.apellido,
          telefono: personas.telefono,
          documento: personas.documento,
          tipoDocumentoId: personas.tipoDocumentoId,
          direccion: personas.direccion,
          departamentoId: personas.departamentoId,
          municipioId: personas.municipioId,
        },
      })
      .from(representantesLegales)
      .leftJoin(personas, eq(representantesLegales.personaId, personas.id))
      .where(eq(representantesLegales.id, id))
      .limit(1);

    if (!result[0]) return undefined;
    return {
      ...result[0],
      persona: result[0].persona?.id ? result[0].persona : null,
    };
  }

  async getRepresentantesByPersona(personaId: string): Promise<RepresentanteLegal[]> {
    return this.db
      .select()
      .from(representantesLegales)
      .where(eq(representantesLegales.personaId, personaId));
  }

  async updateRepresentante(id: string, updates: Partial<InsertRepresentanteLegal>, tx?: any): Promise<RepresentanteLegal | undefined> {
    const db = tx ?? this.db;
    await db.update(representantesLegales).set(updates).where(eq(representantesLegales.id, id));
    return this.getRepresentante(id);
  }

  async deleteRepresentante(id: string): Promise<void> {
    await this.db.delete(representantesLegales).where(eq(representantesLegales.id, id));
  }
}
