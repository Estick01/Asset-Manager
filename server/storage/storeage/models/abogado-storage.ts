/**
 * Abogado (Lawyer) Storage
 * Handles all database operations for lawyers (lawyer_profiles)
 */

import { InsertLawyerProfile, LawyerProfile, lawyerProfiles, users, firmProfiles, personas } from "@/shared/schema";
import { LawyerProfileRelations, UpdateLawyerProfileDTO } from "@/shared/schema/lawyer-profile.schema";
import { and, eq, like } from "drizzle-orm";
import { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "@/shared/schema";

type Database = MySql2Database<typeof schema>;

export class AbogadoStorage {
  constructor(private db: Database) {}

  async getAllLawyer() {
    return this.db.select().from(lawyerProfiles);
  }

  async getLawyer(id: string): Promise<LawyerProfileRelations | undefined> {
    const rows = await this.db
      .select({
        id: lawyerProfiles.id,
        userId: lawyerProfiles.userId,
        firmId: lawyerProfiles.firmId,
        personaId: lawyerProfiles.personaId,
        specialization: lawyerProfiles.specialization,
        licenseNumber: lawyerProfiles.licenseNumber,
        isIndependent: lawyerProfiles.isIndependent,
        createdAt: lawyerProfiles.createdAt,
        updatedAt: lawyerProfiles.updatedAt,
        user: { id: users.id, email: users.email, name: users.name },
        firm: { id: firmProfiles.id, name: firmProfiles.name },
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
      .from(lawyerProfiles)
      .innerJoin(users, eq(lawyerProfiles.userId, users.id))
      .innerJoin(personas, eq(lawyerProfiles.personaId, personas.id))
      .leftJoin(firmProfiles, eq(lawyerProfiles.firmId, firmProfiles.id))
      .where(eq(lawyerProfiles.id, id))
      .limit(1);

    if (!rows[0]) return undefined;
    const row = rows[0];
    return {
      ...row,
      user: row.user?.id ? row.user : null,
      firm: row.firm?.id ? row.firm : null,
      persona: row.persona?.id ? row.persona : null,
    };
  }

  async getLawyerByEmail(email: string): Promise<LawyerProfile | undefined> {
    const userResult = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!userResult[0]) return undefined;
    return this.getLawyerByUserId(userResult[0].id);
  }

  async getLawyerByUserId(userId: string): Promise<LawyerProfile | undefined> {
    const result = await this.db
      .select()
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.userId, userId))
      .limit(1);
    return result[0];
  }

  /** Same as getLawyer but filters by userId instead of profile id */
  async getLawyerByUserIdFull(userId: string): Promise<LawyerProfileRelations | undefined> {
    const rows = await this.db
      .select({
        id: lawyerProfiles.id,
        userId: lawyerProfiles.userId,
        firmId: lawyerProfiles.firmId,
        personaId: lawyerProfiles.personaId,
        specialization: lawyerProfiles.specialization,
        licenseNumber: lawyerProfiles.licenseNumber,
        isIndependent: lawyerProfiles.isIndependent,
        createdAt: lawyerProfiles.createdAt,
        updatedAt: lawyerProfiles.updatedAt,
        user: { id: users.id, email: users.email, name: users.name },
        firm: { id: firmProfiles.id, name: firmProfiles.name },
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
      .from(lawyerProfiles)
      .innerJoin(users, eq(lawyerProfiles.userId, users.id))
      .innerJoin(personas, eq(lawyerProfiles.personaId, personas.id))
      .leftJoin(firmProfiles, eq(lawyerProfiles.firmId, firmProfiles.id))
      .where(eq(lawyerProfiles.userId, userId))
      .limit(1);

    if (!rows[0]) return undefined;
    const row = rows[0];
    return {
      ...row,
      user: row.user?.id ? row.user : null,
      firm: row.firm?.id ? row.firm : null,
      persona: row.persona?.id ? row.persona : null,
    };
  }

  async getAllLawyers(
    limit: number,
    offset: number,
    filter?: { nombre?: string; firstName?: string; isActive?: boolean }
  ): Promise<LawyerProfile[]> {
    const conditions = [];

    const searchNombre = filter?.nombre ?? filter?.firstName;
    if (searchNombre) {
      conditions.push(like(personas.nombre, `%${searchNombre}%`));
    }

    return this.db
      .select({
        id: lawyerProfiles.id,
        userId: lawyerProfiles.userId,
        firmId: lawyerProfiles.firmId,
        personaId: lawyerProfiles.personaId,
        specialization: lawyerProfiles.specialization,
        licenseNumber: lawyerProfiles.licenseNumber,
        isIndependent: lawyerProfiles.isIndependent,
        createdAt: lawyerProfiles.createdAt,
        updatedAt: lawyerProfiles.updatedAt,
      })
      .from(lawyerProfiles)
      .innerJoin(personas, eq(lawyerProfiles.personaId, personas.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset);
  }

  async getLawyersByFirm(firmId: string): Promise<LawyerProfile[]> {
    return this.db
      .select()
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.firmId, firmId));
  }

  async createLawyer(lawyer: InsertLawyerProfile): Promise<LawyerProfile> {
    await this.db.insert(lawyerProfiles).values(lawyer);
    return lawyer as LawyerProfile;
  }

  async updateLawyer(id: string, updates: Partial<UpdateLawyerProfileDTO>): Promise<LawyerProfile | undefined> {
    const { persona: personaUpdates, ...lawyerUpdates } = updates as any;

    if (Object.keys(lawyerUpdates).length > 0) {
      await this.db
        .update(lawyerProfiles)
        .set({ ...lawyerUpdates, updatedAt: new Date() })
        .where(eq(lawyerProfiles.id, id));
    }

    if (personaUpdates) {
      const lawyer = await this.db
        .select({ personaId: lawyerProfiles.personaId, userId: lawyerProfiles.userId })
        .from(lawyerProfiles)
        .where(eq(lawyerProfiles.id, id))
        .limit(1);

      if (lawyer[0]?.personaId) {
        await this.db.update(personas).set(personaUpdates).where(eq(personas.id, lawyer[0].personaId));
      }

      // Keep users.name in sync when first/last name changes
      if (lawyer[0]?.userId && (personaUpdates.nombre !== undefined || personaUpdates.apellido !== undefined)) {
        // Read current persona values to build the full name
        const currentPersona = await this.db
          .select({ nombre: personas.nombre, apellido: personas.apellido })
          .from(personas)
          .where(eq(personas.id, lawyer[0].personaId))
          .limit(1);

        if (currentPersona[0]) {
          const fullName = [currentPersona[0].nombre, currentPersona[0].apellido]
            .filter(Boolean).join(" ").trim();
          if (fullName) {
            await this.db.update(users).set({ name: fullName }).where(eq(users.id, lawyer[0].userId));
          }
        }
      }
    }

    const result = await this.db
      .select()
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.id, id))
      .limit(1);
    return result[0];
  }

  async deleteLawyer(id: string): Promise<void> {
    await this.db.delete(lawyerProfiles).where(eq(lawyerProfiles.id, id));
  }

  async updateFirmId(lawyerId: string, firmId: string | null): Promise<void> {
    await this.db
      .update(lawyerProfiles)
      .set({ firmId })
      .where(eq(lawyerProfiles.id, lawyerId));
  }
}
