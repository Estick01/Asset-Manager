
import { InsertRol, Rol, roles } from "@/shared/schema/rol.schema";
import { rolesPermisos } from '@/shared/schema/rolesPermisos.schema';
import { eq } from "drizzle-orm";


export class RolStorage {
  constructor(private db: any) {}

  async getRoles(): Promise<Rol[]> {
    return this.db.query.roles.findMany();
  }

  async getRol(id: number): Promise<Rol | undefined> {
    return this.db.query.roles.findFirst({
      where: eq(roles.id, id),
    });
  }

  async getRolByNombre(nombre: string): Promise<Rol | undefined> {
    return this.db.query.roles.findFirst({
      where: eq(roles.nombre, nombre),
    });
  }

  async createRol(data: InsertRol): Promise<Rol> {
    await this.db.insert(roles).values(data);

    const created = await this.getRolByNombre(data.nombre);

    if (!created) {
      throw new Error("No se pudo crear el rol");
    }

    return created;
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