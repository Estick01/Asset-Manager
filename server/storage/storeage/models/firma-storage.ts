import { FirmProfile, firmProfiles, InsertFirmProfile, representantesLegales, personas } from "@/shared/schema";
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
  // Obtener por userId (con representante legal)
  // ============================
  async getFirmProfileByUserId(userId: string): Promise<FirmProfile | undefined> {
    const rows = await this.db
      .select({
        id: firmProfiles.id,
        userId: firmProfiles.userId,
        name: firmProfiles.name,
        nit: firmProfiles.nit,
        address: firmProfiles.address,
        phone: firmProfiles.phone,
        representanteLegalId: firmProfiles.representanteLegalId,
        createdAt: firmProfiles.createdAt,
        updatedAt: firmProfiles.updatedAt,
        repId: representantesLegales.id,
        repCargo: representantesLegales.cargo,
        repEmail: representantesLegales.email,
        repPersonaId: representantesLegales.personaId,
        repNombre: personas.nombre,
        repApellido: personas.apellido,
        repTelefono: personas.telefono,
        repDocumento: personas.documento,
      })
      .from(firmProfiles)
      .leftJoin(representantesLegales, eq(firmProfiles.representanteLegalId, representantesLegales.id))
      .leftJoin(personas, eq(representantesLegales.personaId, personas.id))
      .where(eq(firmProfiles.userId, userId))
      .limit(1);

    if (!rows[0]) return undefined;
    const row = rows[0];

    const profile: FirmProfile = {
      id: row.id,
      userId: row.userId,
      name: row.name,
      nit: row.nit,
      address: row.address,
      phone: row.phone,
      representanteLegalId: row.representanteLegalId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      representanteLegal: row.repId ? {
        id: row.repId,
        personaId: row.repPersonaId!,
        cargo: row.repCargo!,
        email: row.repEmail!,
        persona: {
          id: row.repPersonaId!,
          nombre: row.repNombre!,
          apellido: row.repApellido!,
          telefono: row.repTelefono!,
          documento: row.repDocumento!,
          tipoDocumentoId: 0,
          direccion: null,
          departamentoId: null,
          municipioId: null,
        },
      } : null,
    };

    return profile;
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