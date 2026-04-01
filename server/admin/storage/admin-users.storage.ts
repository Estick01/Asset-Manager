// server/admin/storage/admin-users.storage.ts
import { sql, eq, and, or, like, desc } from "drizzle-orm";
import {
  users,
  roles,
  suscripciones,
  planes,
  lawyerProfiles,
  firmProfiles,
} from "@/shared/schema";
import type { Database } from "../../storage/storeage/database-storage.js";

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface ListUsersParams {
  page?:   number;
  limit?:  number;
  tipo?:   "abogado" | "bufete" | "cliente";
  estado?: "activo" | "suspendido";
  search?: string;
}

export interface UserAdminRow {
  id:        string;
  name:      string | null;
  email:     string;
  isActive:  boolean;
  createdAt: string;
  rol:       { nombre: string };
  plan:      { nombre: string } | null;
}

export interface SuscripcionResumen {
  id:          string;
  planNombre:  string;
  ciclo:       string;
  estado:      string;
  fechaInicio: string;
  fechaFin:    string;
}

export interface UserAdminDetail extends UserAdminRow {
  firma:                   { id: string; nombre: string } | null;
  suscripcionActiva:       SuscripcionResumen | null;
  historialSuscripciones:  SuscripcionResumen[];
}

export interface ListUsersResult {
  data: UserAdminRow[];
  meta: { total: number; page: number; limit: number };
}

// ── Storage ───────────────────────────────────────────────────────────────────

export class AdminUsersStorage {
  constructor(private db: Database) {}

  async list(params: ListUsersParams): Promise<ListUsersResult> {
    const page   = Math.max(params.page  ?? 1, 1);
    const limit  = Math.min(params.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    // Filtro por tipo: resolver el rolId correspondiente
    let rolIdFiltro: number | undefined;
    if (params.tipo) {
      const [roleRow] = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.nombre, params.tipo))
        .limit(1);
      rolIdFiltro = roleRow?.id;
    }

    const conditions: ReturnType<typeof eq>[] = [];
    if (rolIdFiltro !== undefined)      conditions.push(eq(users.rolId, rolIdFiltro));
    if (params.estado === "activo")     conditions.push(eq(users.isActive, true));
    if (params.estado === "suspendido") conditions.push(eq(users.isActive, false));
    if (params.search) {
      const pattern = `%${params.search}%`;
      conditions.push(
        or(
          like(users.name,  pattern),
          like(users.email, pattern),
        ) as ReturnType<typeof eq>,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await this.db
      .select({ total: sql<string>`COUNT(*)` })
      .from(users)
      .where(where);

    const rows = await this.db
      .select({
        id:        users.id,
        name:      users.name,
        email:     users.email,
        isActive:  users.isActive,
        createdAt: users.createdAt,
        rolNombre: roles.nombre,
        planNombre: sql<string | null>`(
          SELECT p.nombre FROM suscripciones s
          JOIN planes p ON p.id = s.plan_id
          WHERE s.user_id = ${users.id} AND s.estado = 'activa'
          LIMIT 1
        )`,
      })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.rolId))
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map(r => ({
        id:        r.id,
        name:      r.name,
        email:     r.email,
        isActive:  r.isActive ?? false,
        createdAt: r.createdAt?.toISOString() ?? "",
        rol:       { nombre: r.rolNombre ?? "" },
        plan:      r.planNombre ? { nombre: r.planNombre } : null,
      })),
      meta: { total: Number(countRow?.total ?? 0), page, limit },
    };
  }

  async getById(id: string): Promise<UserAdminDetail | null> {
    const [userRow] = await this.db
      .select({
        id:        users.id,
        name:      users.name,
        email:     users.email,
        isActive:  users.isActive,
        createdAt: users.createdAt,
        rolId:     users.rolId,
        rolNombre: roles.nombre,
      })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.rolId))
      .where(eq(users.id, id))
      .limit(1);

    if (!userRow) return null;

    // Firma asociada (solo abogados que pertenecen a un bufete)
    let firma: { id: string; nombre: string } | null = null;
    const [lpRow] = await this.db
      .select({ firmId: lawyerProfiles.firmId })
      .from(lawyerProfiles)
      .where(eq(lawyerProfiles.userId, id))
      .limit(1);

    if (lpRow?.firmId) {
      const [firmRow] = await this.db
        .select({ id: firmProfiles.id, nombre: firmProfiles.name })
        .from(firmProfiles)
        .where(eq(firmProfiles.id, lpRow.firmId))
        .limit(1);
      if (firmRow) firma = firmRow;
    }

    // Historial de suscripciones (todas, ordenadas por fecha desc)
    const susRows = await this.db
      .select({
        id:               suscripciones.id,
        planNombre:       planes.nombre,
        ciclo:            suscripciones.ciclo,
        estado:           suscripciones.estado,
        fechaInicio:      suscripciones.fechaInicio,
        fechaVencimiento: suscripciones.fechaVencimiento,
      })
      .from(suscripciones)
      .leftJoin(planes, eq(planes.id, suscripciones.planId))
      .where(eq(suscripciones.userId, id))
      .orderBy(desc(suscripciones.fechaInicio));

    const historial: SuscripcionResumen[] = susRows.map(s => ({
      id:          s.id,
      planNombre:  s.planNombre ?? "",
      ciclo:       s.ciclo,
      estado:      s.estado,
      fechaInicio: s.fechaInicio instanceof Date ? s.fechaInicio.toISOString() : String(s.fechaInicio),
      fechaFin:    s.fechaVencimiento instanceof Date ? s.fechaVencimiento.toISOString() : String(s.fechaVencimiento),
    }));

    const suscripcionActiva = historial.find(s => s.estado === "activa") ?? null;

    return {
      id:                     userRow.id,
      name:                   userRow.name,
      email:                  userRow.email,
      isActive:               userRow.isActive ?? false,
      createdAt:              userRow.createdAt?.toISOString() ?? "",
      rol:                    { nombre: userRow.rolNombre ?? "" },
      plan:                   suscripcionActiva ? { nombre: suscripcionActiva.planNombre } : null,
      firma,
      suscripcionActiva,
      historialSuscripciones: historial,
    };
  }

  async updateEstado(id: string, isActive: boolean): Promise<void> {
    await this.db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updatePlan(id: string, planId: string): Promise<void> {
    // Actualiza el planId de la suscripción activa del usuario
    await this.db
      .update(suscripciones)
      .set({ planId })
      .where(
        and(
          eq(suscripciones.userId, id),
          eq(suscripciones.estado, "activa"),
        ),
      );
  }
}
