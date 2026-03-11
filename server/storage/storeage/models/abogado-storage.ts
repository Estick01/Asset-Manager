
/**
 * Abogado (Lawyer) Storage
 * Handles all database operations for lawyers (lawyer_profiles)
 */

import { InsertLawyerProfile, LawyerProfile, lawyerProfiles, users, firmProfiles } from "@/shared/schema";
import { LawyerProfileRelations, UpdateLawyerProfileDTO } from "@/shared/schema/lawyer-profile.schema";
import { and, eq, like } from "drizzle-orm";
import { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "@/shared/schema";

// Use proper typing with schema
type Database = MySql2Database<typeof schema>;

export class AbogadoStorage {
  constructor(private db: Database) { }

  async getAllLawyer() {
    return this.db.select().from(lawyerProfiles);
  }

  async getLawyer(id: string): Promise<LawyerProfileRelations | undefined> {
  // Get lawyer
  const lawyerResult = await this.db
    .select()
    .from(lawyerProfiles)
    .where(eq(lawyerProfiles.id, id))
    .limit(1);

  if (!lawyerResult[0]) return undefined;

  const lawyer = lawyerResult[0];

  // Get related user (ONLY required fields)
  const userResult = await this.db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, lawyer.userId))
    .limit(1);

  let firm = null;

  if (lawyer.firmId) {
    const firmResult = await this.db
      .select({
        id: firmProfiles.id,
        name: firmProfiles.name,
      })
      .from(firmProfiles)
      .where(eq(firmProfiles.id, lawyer.firmId))
      .limit(1);

    firm = firmResult[0] || null;
  }

  return {
    ...lawyer,
    user: userResult[0] || null,
    firm,
  };
}
  async getLawyerByEmail(email: string): Promise<LawyerProfile | undefined> {
    const userResult = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!userResult[0]) return undefined;

    const result = await this.db
      .select()
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.userId, userResult[0].id))
      .limit(1);
    return result[0];
  }

  async getLawyerByUserId(userId: string): Promise<LawyerProfile | undefined> {
    const result = await this.db
      .select()
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.userId, userId))
      .limit(1);
    return result[0];
  }

  async getAllLawyers(
    limit: number,
    offset: number,
    filter?: {
      firstName?: string;
      city?: string;
      isActive?: boolean;
    }
  ): Promise<LawyerProfile[]> {

    const conditions = [];

    if (filter?.firstName) {
      conditions.push(
        like(lawyerProfiles.firstName, `%${filter.firstName}%`)
      );
    }

     if (filter?.isActive !== undefined) {
       // Note: Filtering by user.isActive requires a join - for now we skip this filter
       // To properly implement, would need to join with users table
     }


    return await this.db
      .select()
      .from(lawyerProfiles)
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
    const { createdAt, ...updateData } = updates as any;
    await this.db
      .update(lawyerProfiles)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(lawyerProfiles.id, id));

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
