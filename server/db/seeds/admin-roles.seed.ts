// server/db/seeds/admin-roles.seed.ts
import { eq } from "drizzle-orm";
import { roles } from "@/shared/schema";
import type { Database } from "../../storage/storeage/database-storage.js";

const ADMIN_ROLES = [
  { nombre: "admin_super",    descripcion: "Acceso total al portal de administración" },
  { nombre: "admin_soporte",  descripcion: "Gestión de usuarios y tickets de soporte" },
  { nombre: "admin_finanzas", descripcion: "Gestión de planes y facturación" },
] as const;

export async function seedAdminRoles(db: Database): Promise<void> {
  for (const rol of ADMIN_ROLES) {
    const existing = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.nombre, rol.nombre))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(roles).values({
        nombre:      rol.nombre,
        descripcion: rol.descripcion,
        activo:      true,
        firmId:      null,
      });
      console.log(`[seed] Rol creado: ${rol.nombre}`);
    } else {
      console.log(`[seed] Rol ya existe: ${rol.nombre}`);
    }
  }
}
