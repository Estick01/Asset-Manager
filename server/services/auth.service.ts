import { eq } from "drizzle-orm";
import { db } from "../db";
import { roles, rolesPermisos, permisos, modulos, Rol, InsertRol, Permiso, Modulo } from "@/shared/schema";



const permisosCache = new Map<string, string[]>();

export class AuthService {
  async getRoles(): Promise<Rol[]> {
    return db.query.roles.findMany();
  }

  async getRol(id: number): Promise<Rol | undefined> {
    return db.query.roles.findFirst({ where: eq(roles.id, id) });
  }

  async getRolByNombre(nombre: string): Promise<Rol | undefined> {
    return db.query.roles.findFirst({ where: eq(roles.nombre, nombre) });
  }

  async createRol(rol: InsertRol): Promise<Rol> {
    await db.insert(roles).values(rol);
    const created = await db.query.roles.findFirst({
      where: eq(roles.nombre, rol.nombre),
    });
    if (!created) throw new Error('Failed to create role');
    return created;
  }

  async deleteRol(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(rolesPermisos).where(eq(rolesPermisos.rolId, id));
      // Note: Users now use 'rol' string field instead of rolId foreign key
      // No need to update users as the relationship is different in the new schema
      await tx.delete(roles).where(eq(roles.id, id));
    });
  }

  async getPermisos(): Promise<Permiso[]> {
    const permisosRaw = await db.query.permisos.findMany();
    return permisosRaw.map(p => ({
      ...p,
      modulo: p.codigo.split('.')[0],
    }));
  }

  async getModulos(): Promise<Modulo[]> {
    try {
      return await db.select().from(modulos).execute();
    } catch (e) {
      console.warn("modulos table not found:", e);
      return [];
    }
  }

  async getPermisosByRol(rolId: number): Promise<string[]> {
    const cacheKey = `rol_${rolId}`;
    if (permisosCache.has(cacheKey)) {
      return permisosCache.get(cacheKey)!;
    }

    const result = await db.query.rolesPermisos.findMany({
      where: eq(rolesPermisos.rolId, rolId),
      with: { permiso: true },
    });

    const permisosList = result
      .filter(rp => rp.permiso.activo)
      .map(rp => rp.permiso.codigo);

    permisosCache.set(cacheKey, permisosList);
    return permisosList;
  }
}

export const authService = new AuthService();