import { eq } from "drizzle-orm";
import { adminProfiles, type AdminProfile, type InsertAdminProfile } from "@/shared/schema";

export class AdminProfileStorage {
  constructor(private db: any) {}

  async getAdminProfileById(id: string): Promise<AdminProfile | undefined> {
    const result = await this.db
      .select()
      .from(adminProfiles)
      .where(eq(adminProfiles.id, id))
      .limit(1);

    return result[0];
  }

  async getAdminProfileByUserId(userId: string): Promise<AdminProfile | undefined> {
    const result = await this.db
      .select()
      .from(adminProfiles)
      .where(eq(adminProfiles.userId, userId))
      .limit(1);

    return result[0];
  }

  async createAdminProfile(data: InsertAdminProfile): Promise<AdminProfile> {
    const newProfile = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.insert(adminProfiles).values(newProfile);

    const created = await this.getAdminProfileByUserId(data.userId);
    if (!created) {
      throw new Error("No se pudo crear el perfil de administrador");
    }

    return created;
  }

  async updateAdminProfile(id: string, updates: Partial<AdminProfile>): Promise<AdminProfile | undefined> {
    const { createdAt, ...safeUpdates } = updates as any;

    await this.db
      .update(adminProfiles)
      .set({
        ...safeUpdates,
        updatedAt: new Date(),
      })
      .where(eq(adminProfiles.id, id));

    return this.getAdminProfileById(id);
  }
}
