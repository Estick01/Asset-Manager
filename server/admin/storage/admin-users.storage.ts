// server/admin/storage/admin-users.storage.ts
import { sql, eq, and, or, like, desc, type SQL } from "drizzle-orm";
import {
  users,
  roles,
  suscripciones,
  planes,
  lawyerProfiles,
  firmProfiles,
} from "@/shared/schema";
import type { LawyerProfessionalVerificationStatus } from "@/shared/schema";
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
  emailVerified: boolean;
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
  editableProfile?: any;
  lawyerVerification: {
    profileId: string;
    licenseNumber: string | null;
    status: LawyerProfessionalVerificationStatus;
    reviewedAt: string | null;
    reviewedBy: string | null;
    reviewNotes: string | null;
  } | null;
}

export interface LawyerVerificationRow {
  profileId: string;
  userId: string;
  name: string | null;
  email: string;
  licenseNumber: string | null;
  specialization: string | null;
  createdAt: string;
  status: LawyerProfessionalVerificationStatus;
  emailVerified: boolean;
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

    const conditions: SQL[] = [];
    if (rolIdFiltro !== undefined)      conditions.push(eq(users.rolId, rolIdFiltro));
    if (params.estado === "activo")     conditions.push(eq(users.isActive, true));
    if (params.estado === "suspendido") conditions.push(eq(users.isActive, false));
    if (params.search) {
      const pattern = `%${params.search}%`;
      conditions.push(
        or(
          like(users.name,  pattern),
          like(users.email, pattern),
        )!,
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
        emailVerified: users.emailVerified,
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
        emailVerified: r.emailVerified ?? false,
        createdAt: r.createdAt?.toISOString() ?? "",
        rol:       { nombre: r.rolNombre ?? "" },
        plan:      r.planNombre ? { nombre: r.planNombre } : null,
      })),
      meta: { total: Number(countRow?.total ?? 0), page, limit },
    };
  }

  async getById(id: string): Promise<UserAdminDetail | null> {
    const [row] = await this.db
      .select({
        id:         users.id,
        name:       users.name,
        email:      users.email,
        isActive:   users.isActive,
        emailVerified: users.emailVerified,
        createdAt:  users.createdAt,
        rolNombre:  roles.nombre,
        firmId:     firmProfiles.id,
        firmNombre: firmProfiles.name,
        lawyerProfileId: lawyerProfiles.id,
        licenseNumber: lawyerProfiles.licenseNumber,
        lawyerVerificationStatus: lawyerProfiles.professionalVerificationStatus,
        lawyerReviewedAt: lawyerProfiles.professionalReviewedAt,
        lawyerReviewedBy: lawyerProfiles.professionalReviewedBy,
        lawyerReviewNotes: lawyerProfiles.professionalReviewNotes,
      })
      .from(users)
      .leftJoin(roles,          eq(roles.id,              users.rolId))
      .leftJoin(lawyerProfiles, eq(lawyerProfiles.userId,  users.id))
      .leftJoin(firmProfiles,   eq(firmProfiles.id,        lawyerProfiles.firmId))
      .where(eq(users.id, id))
      .limit(1);

    if (!row) return null;

    const firma = row.firmId && row.firmNombre
      ? { id: row.firmId, nombre: row.firmNombre }
      : null;

    // Historial de suscripciones (sin cambios)
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
      id:                     row.id,
      name:                   row.name,
      email:                  row.email,
      isActive:               row.isActive ?? false,
      emailVerified:          row.emailVerified ?? false,
      createdAt:              row.createdAt?.toISOString() ?? "",
      rol:                    { nombre: row.rolNombre ?? "" },
      plan:                   suscripcionActiva ? { nombre: suscripcionActiva.planNombre } : null,
      firma,
      suscripcionActiva,
      historialSuscripciones: historial,
      lawyerVerification: row.lawyerProfileId ? {
        profileId: row.lawyerProfileId,
        licenseNumber: row.licenseNumber ?? null,
        status: (row.lawyerVerificationStatus ?? "pendiente") as LawyerProfessionalVerificationStatus,
        reviewedAt: row.lawyerReviewedAt instanceof Date ? row.lawyerReviewedAt.toISOString() : null,
        reviewedBy: row.lawyerReviewedBy ?? null,
        reviewNotes: row.lawyerReviewNotes ?? null,
      } : null,
    };
  }

  async listLawyerVerifications(status: LawyerProfessionalVerificationStatus = "pendiente"): Promise<LawyerVerificationRow[]> {
    const rows = await this.db
      .select({
        profileId: lawyerProfiles.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        licenseNumber: lawyerProfiles.licenseNumber,
        specialization: lawyerProfiles.specialization,
        createdAt: lawyerProfiles.createdAt,
        status: lawyerProfiles.professionalVerificationStatus,
        emailVerified: users.emailVerified,
      })
      .from(lawyerProfiles)
      .innerJoin(users, eq(users.id, lawyerProfiles.userId))
      .where(eq(lawyerProfiles.professionalVerificationStatus, status))
      .orderBy(desc(lawyerProfiles.createdAt));

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt?.toISOString() ?? "",
      status: (row.status ?? "pendiente") as LawyerProfessionalVerificationStatus,
      emailVerified: row.emailVerified ?? false,
    }));
  }

  async updateLawyerVerification(
    lawyerProfileId: string,
    payload: {
      status: LawyerProfessionalVerificationStatus;
      reviewedBy: string;
      reviewNotes?: string | null;
    },
  ): Promise<void> {
    await this.db
      .update(lawyerProfiles)
      .set({
        professionalVerificationStatus: payload.status,
        professionalReviewedAt: new Date(),
        professionalReviewedBy: payload.reviewedBy,
        professionalReviewNotes: payload.reviewNotes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(lawyerProfiles.id, lawyerProfileId));
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
