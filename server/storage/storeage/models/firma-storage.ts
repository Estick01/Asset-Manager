import { FirmProfile, firmProfiles, InsertFirmProfile } from "@/shared/schema";
import { eq } from "drizzle-orm";


export class FirmProfileStorage {
  constructor(private db: any) {}

  // ============================
  // Obtener por ID
  // ============================
  async getFirmProfileById(id: string): Promise<FirmProfile | undefined> {
    const result = await this.db
      .select()
      .from(firmProfiles)
      .where(eq(firmProfiles.id, id))
      .limit(1);

    return result[0];
  }

  // ============================
  // Obtener por userId
  // ============================
  async getFirmProfileByUserId(
    userId: string
  ): Promise<FirmProfile | undefined> {
    const result = await this.db
      .select()
      .from(firmProfiles)
      .where(eq(firmProfiles.userId, userId))
      .limit(1);

    return result[0];
  }

  // ============================
  // Crear Perfil
  // ============================
  async createFirmProfile(
    data: InsertFirmProfile
  ): Promise<FirmProfile> {
    const newProfile = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.insert(firmProfiles).values(newProfile);

    const created = await this.getFirmProfileByUserId(data.userId);

    if (!created) {
      throw new Error("No se pudo crear el perfil de firma");
    }

    return created;
  }

  // ============================
  // Actualizar Perfil
  // ============================
  async updateFirmProfile(
    id: string,
    updates: Partial<FirmProfile>
  ): Promise<FirmProfile | undefined> {
    const { createdAt, ...safeUpdates } = updates as any;

    await this.db
      .update(firmProfiles)
      .set({
        ...safeUpdates,
        updatedAt: new Date(),
      })
      .where(eq(firmProfiles.id, id));

    return this.getFirmProfileById(id);
  }

  // ============================
  // Eliminar Perfil
  // ============================
  async deleteFirmProfile(id: string): Promise<void> {
    await this.db
      .delete(firmProfiles)
      .where(eq(firmProfiles.id, id));
  }
}