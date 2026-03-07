/**
 * Abogado (Lawyer) Storage
 * Handles all database operations for lawyers (lawyer_profiles)
 */

import { InsertLawyerProfile, LawyerProfile, lawyerProfiles, users } from "@/shared/schema";
import { UpdateLawyerProfileDTO } from "@/shared/schema/lawyer-profile.schema";
import { and, eq, like } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";



export class AbogadoStorage {
  constructor(private db: MySql2Database<any>) { }

  async getAllLawyer() {
    return this.db.select().from(lawyerProfiles);
  }

  async getLawyer(id: string): Promise<LawyerProfile | undefined> {
    const result = await this.db
      .select()
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.id, id))
      .limit(1);
    return result[0];
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
      conditions.push(eq(users.isActive, filter.isActive));
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
