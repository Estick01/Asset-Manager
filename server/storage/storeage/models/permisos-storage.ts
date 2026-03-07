import { Modulo, modulos } from "@/shared/schema/modulo.schema";
import { Permiso } from "@/shared/schema/permiso.schema";
import { rolesPermisos } from "@/shared/schema/rolesPermisos.schema";
import { eq } from "drizzle-orm";


// Cache simple en memoria
const permisosCache = new Map<string, string[]>();

export class PermisoStorage {
  constructor(private db: any) {}

  // ===============================
  // Obtener todos los permisos
  // ===============================
  async getPermisos(): Promise<Permiso[]> {
    const permisosRaw = await this.db.query.permisos.findMany();

    return permisosRaw.map((p: Permiso) => ({
      ...p,
      modulo: p.codigo.split(".")[0], // ejemplo: "procesos.crear"
    }));
  }

  // ===============================
  // Obtener módulos
  // ===============================
  async getModulos(): Promise<Modulo[]> {
    try {
      return await this.db.select().from(modulos).execute();
    } catch (error) {
      console.warn("Tabla modulos no encontrada:", error);
      return [];
    }
  }

  // ===============================
  // Obtener permisos por rol
  // ===============================
  async getPermisosByRol(rolId: number): Promise<string[]> {
    const cacheKey = `rol_${rolId}`;

    if (permisosCache.has(cacheKey)) {
      return permisosCache.get(cacheKey)!;
    }

    const result = await this.db.query.rolesPermisos.findMany({
      where: eq(rolesPermisos.rolId, rolId),
      with: { permiso: true },
    });

    const permisosRol = result
      .filter((rp: any) => rp.permiso.activo)
      .map((rp: any) => rp.permiso.codigo);

    permisosCache.set(cacheKey, permisosRol);

    return permisosRol;
  }

  // ===============================
  // Asignar permisos a rol
  // ===============================
  async assignPermisosToRol(
    rolId: number,
    permisosIds: number[]
  ): Promise<void> {
    // Limpiar cache
    permisosCache.delete(`rol_${rolId}`);

    // Eliminar permisos actuales
    await this.db
      .delete(rolesPermisos)
      .where(eq(rolesPermisos.rolId, rolId));

    // Insertar nuevos
    if (permisosIds.length > 0) {
      const values = permisosIds.map((permisoId) => ({
        rolId,
        permisoId,
      }));

      await this.db.insert(rolesPermisos).values(values);
    }
  }
}