// server/admin/storage/admin-stats.storage.ts
import { sql, inArray, eq } from "drizzle-orm";
import { users, roles, suscripciones, planes, procesos } from "@/shared/schema";
import type { Database } from "../../storage/storeage/database-storage.js";

export interface AdminStats {
  totalUsuarios:         number;
  suscripcionesActivas:  number;
  ingresosEstimadosCop:  number;
  totalProcesos:         number;
  nuevosEsteMes:         number;
}

const USER_ROLES = ["abogado", "bufete", "cliente"] as const;

export class AdminStatsStorage {
  constructor(private db: Database) {}

  async getStats(): Promise<AdminStats> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // IDs de roles de usuario final (excluye admins)
    const userRoleRows = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(inArray(roles.nombre, [...USER_ROLES]));

    const userRoleIds = userRoleRows.map(r => r.id);

    const [
      usuariosResult,
      suscripcionesResult,
      ingresosResult,
      procesosResult,
      nuevosResult,
    ] = await Promise.all([

      // Total usuarios finales
      userRoleIds.length > 0
        ? this.db
            .select({ total: sql<number>`COUNT(*)` })
            .from(users)
            .where(inArray(users.rolId, userRoleIds))
        : Promise.resolve([{ total: 0 }]),

      // Suscripciones activas
      this.db
        .select({ total: sql<number>`COUNT(*)` })
        .from(suscripciones)
        .where(eq(suscripciones.estado, "activa")),

      // Ingresos estimados COP (normalizados a mensual)
      this.db
        .select({
          total: sql<number>`
            SUM(
              CASE ${suscripciones.ciclo}
                WHEN 'mensual' THEN CAST(${planes.precioMensualCop} AS DECIMAL(14,2))
                WHEN 'anual'   THEN CAST(${planes.precioAnualCop}   AS DECIMAL(14,2)) / 12
                ELSE 0
              END
            )
          `,
        })
        .from(suscripciones)
        .innerJoin(planes, eq(planes.id, suscripciones.planId))
        .where(eq(suscripciones.estado, "activa")),

      // Total procesos activos
      this.db
        .select({ total: sql<number>`COUNT(*)` })
        .from(procesos)
        .where(eq(procesos.state, true)),

      // Nuevos usuarios este mes (solo roles finales)
      userRoleIds.length > 0
        ? this.db
            .select({ total: sql<number>`COUNT(*)` })
            .from(users)
            .where(
              sql`${users.rolId} IN (${sql.join(userRoleIds.map(id => sql`${id}`), sql`, `)})
                  AND ${users.createdAt} >= ${startOfMonth}`
            )
        : Promise.resolve([{ total: 0 }]),
    ]);

    return {
      totalUsuarios:        Number(usuariosResult[0]?.total       ?? 0),
      suscripcionesActivas: Number(suscripcionesResult[0]?.total  ?? 0),
      ingresosEstimadosCop: Number(ingresosResult[0]?.total       ?? 0),
      totalProcesos:        Number(procesosResult[0]?.total        ?? 0),
      nuevosEsteMes:        Number(nuevosResult[0]?.total          ?? 0),
    };
  }
}
