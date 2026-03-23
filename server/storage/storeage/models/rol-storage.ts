
import { InsertRol, Rol, roles } from "@/shared/schema/rol.schema";
import { rolesPermisos } from '@/shared/schema/rolesPermisos.schema';
import { lawyerFirmaHistory } from "@/shared/schema/lawyer-firma-history.schema";
import { eq, isNull, and } from "drizzle-orm";


export class RolStorage {
  constructor(private db: any) {}

  async getRoles(): Promise<Rol[]> {
    return this.db.select().from(roles).where(isNull(roles.firmId));
  }

  async getRol(id: number): Promise<Rol | undefined> {
    return this.db.query.roles.findFirst({
      where: eq(roles.id, id),
    });
  }

  async getRolByNombre(nombre: string): Promise<Rol | undefined> {
    return this.db.query.roles.findFirst({
      where: and(eq(roles.nombre, nombre), isNull(roles.firmId)),
    });
  }

  /** Returns all custom roles belonging to a specific firm */
  async getFirmRoles(firmId: string): Promise<Rol[]> {
    return this.db.select().from(roles).where(eq(roles.firmId, firmId));
  }

  async createRol(data: InsertRol): Promise<Rol> {
    await this.db.insert(roles).values(data);

    // For firm roles, find by nombre+firmId; for global roles, by nombre alone
    let created: Rol | undefined;
    if (data.firmId) {
      created = await this.db.query.roles.findFirst({
        where: and(eq(roles.nombre, data.nombre), eq(roles.firmId, data.firmId)),
      });
    } else {
      created = await this.getRolByNombre(data.nombre);
    }

    if (!created) {
      throw new Error("No se pudo crear el rol");
    }

    return created;
  }

  /** Check if any active lawyer is still assigned to this firm role */
  async hasFirmRolAssigned(rolId: number): Promise<boolean> {
    const result = await this.db
      .select({ id: lawyerFirmaHistory.id })
      .from(lawyerFirmaHistory)
      .where(
        and(
          eq(lawyerFirmaHistory.firmRolId, rolId),
          eq(lawyerFirmaHistory.estado, "activo")
        )
      )
      .limit(1);
    return result.length > 0;
  }

  async updateRol(
    id: number,
    updates: Partial<Rol>
  ): Promise<Rol | undefined> {
    await this.db
      .update(roles)
      .set(updates)
      .where(eq(roles.id, id));

    return this.getRol(id);
  }

  async deleteRol(id: number): Promise<void> {
    await this.db.transaction(async (tx: any) => {
      // Primero eliminar relaciones
      await tx
        .delete(rolesPermisos)
        .where(eq(rolesPermisos.rolId, id));

      // Luego eliminar rol
      await tx
        .delete(roles)
        .where(eq(roles.id, id));
    });
  }
}