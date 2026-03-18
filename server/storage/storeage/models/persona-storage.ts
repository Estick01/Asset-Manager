/**
 * Persona Storage
 * CRUD for the personas table — shared base for clientes_natural, lawyer_profiles and representantes_legales
 */

import { personas, InsertPersona, Persona } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { MySql2Database } from "drizzle-orm/mysql2";

export class PersonaStorage {
  constructor(private db: MySql2Database<any>) {}

  async createPersona(data: Omit<InsertPersona, "id">, tx?: any): Promise<Persona> {
    const db = tx ?? this.db;
    const id = randomUUID();
    await db.insert(personas).values({ ...data, id });
    const result = await db
      .select()
      .from(personas)
      .where(eq(personas.id, id))
      .limit(1);
    if (!result[0]) throw new Error("No se pudo crear la persona");
    return result[0];
  }

  async getPersona(id: string): Promise<Persona | undefined> {
    const result = await this.db
      .select()
      .from(personas)
      .where(eq(personas.id, id))
      .limit(1);
    return result[0];
  }

  async updatePersona(id: string, updates: Partial<InsertPersona>, tx?: any): Promise<Persona | undefined> {
    const db = tx ?? this.db;
    await db.update(personas).set(updates).where(eq(personas.id, id));
    return this.getPersona(id);
  }

  async deletePersona(id: string): Promise<void> {
    await this.db.delete(personas).where(eq(personas.id, id));
  }
}
