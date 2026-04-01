# Admin Portal — Fase 2: Auditoría + Usuarios

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar el módulo de auditoría compartido y la gestión completa de usuarios al portal de administración.

**Architecture:** Backend en capas (route → controller → service → storage) bajo `server/admin/`. Auditoría como servicio transversal llamado desde controllers. Frontend con tabla paginada en `usuarios/index.tsx` y detalle con acciones en `usuarios/[id].tsx`, ambos usando `AdminShell` como wrapper.

**Tech Stack:** Express, Drizzle ORM (MySQL2), Zod, React Native, Expo Router, `@tanstack/react-query`, `apiRequest` de `lib/apiClient`.

---

## Mapa de archivos

### Crear
| Archivo | Responsabilidad |
|---|---|
| `shared/schema/admin-audit-log.schema.ts` | Tabla `admin_audit_log` en Drizzle |
| `server/admin/storage/admin-audit.storage.ts` | Queries `log()` y `getLog()` |
| `server/admin/services/audit.service.ts` | Fachada para `AdminAuditStorage` |
| `server/admin/storage/admin-users.storage.ts` | Queries de lista, detalle, update |
| `server/admin/services/admin-users.service.ts` | Lógica de negocio de usuarios admin |
| `server/admin/controllers/admin-users.controller.ts` | Zod + service + audit |
| `server/admin/routes/admin-users.routes.ts` | Rutas bajo `/api/admin/users` |
| `app/(admin-tabs)/usuarios/index.tsx` | Tabla paginada con filtros |
| `app/(admin-tabs)/usuarios/[id].tsx` | Detalle + panel de acciones |

### Modificar
| Archivo | Cambio |
|---|---|
| `shared/schema/index.ts` | Exportar `adminAuditLog` |
| `server/storage/storeage/database-storage.ts` | Agregar `adminAudit` y `adminUsers` |
| `server/admin/routes/index.ts` | Registrar `admin-users.routes` |
| `lib/services/adminService.ts` | Agregar `adminUsersService` |

---

## Task 1: Schema `admin_audit_log` + tabla en DB

**Files:**
- Create: `shared/schema/admin-audit-log.schema.ts`
- Modify: `shared/schema/index.ts`

- [ ] **Step 1.1: Crear el schema Drizzle**

```ts
// shared/schema/admin-audit-log.schema.ts
import { mysqlTable, int, varchar, text, timestamp, index } from "drizzle-orm/mysql-core";

export const adminAuditLog = mysqlTable(
  "admin_audit_log",
  {
    id:        int("id").autoincrement().primaryKey(),
    adminId:   varchar("admin_id",  { length: 36 }).notNull(),
    accion:    varchar("accion",    { length: 100 }).notNull(),
    targetId:  varchar("target_id", { length: 36 }),
    detalle:   text("detalle"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    adminIdIdx: index("idx_admin_id").on(table.adminId),
    accionIdx:  index("idx_accion").on(table.accion),
    createdIdx: index("idx_created").on(table.createdAt),
  }),
);

export type AdminAuditLog       = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLog.$inferInsert;
```

- [ ] **Step 1.2: Exportar desde el índice del schema**

Abre `shared/schema/index.ts`. Agrega al final del archivo:

```ts
// Admin Audit Log
export { adminAuditLog, type AdminAuditLog, type InsertAdminAuditLog } from "./admin-audit-log.schema";
```

- [ ] **Step 1.3: Crear la tabla en la base de datos**

```bash
npm run db:push
```

Resultado esperado: mensaje indicando que la tabla `admin_audit_log` fue creada.

- [ ] **Step 1.4: Verificar en MySQL**

```sql
DESCRIBE admin_audit_log;
SHOW INDEX FROM admin_audit_log;
```

Resultado esperado: 6 columnas (`id`, `admin_id`, `accion`, `target_id`, `detalle`, `created_at`) y 3 índices.

- [ ] **Step 1.5: Commit**

```bash
git add shared/schema/admin-audit-log.schema.ts shared/schema/index.ts
git commit -m "feat(admin): agregar schema Drizzle de admin_audit_log"
```

---

## Task 2: `AdminAuditStorage`

**Files:**
- Create: `server/admin/storage/admin-audit.storage.ts`
- Modify: `server/storage/storeage/database-storage.ts`

- [ ] **Step 2.1: Crear el storage**

```ts
// server/admin/storage/admin-audit.storage.ts
import { sql, eq, and, desc } from "drizzle-orm";
import { adminAuditLog } from "@/shared/schema";
import type { Database } from "../../storage/storeage/database-storage.js";

export interface AuditEntry {
  adminId:   string;
  accion:    string;
  targetId?: string | null;
  detalle?:  string | null;
}

export interface AuditRow {
  id:        number;
  adminId:   string;
  accion:    string;
  targetId:  string | null;
  detalle:   string | null;
  createdAt: Date;
}

export interface AuditLogResult {
  data: AuditRow[];
  meta: { total: number; page: number; limit: number };
}

export class AdminAuditStorage {
  constructor(private db: Database) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.db.insert(adminAuditLog).values({
      adminId:  entry.adminId,
      accion:   entry.accion,
      targetId: entry.targetId ?? null,
      detalle:  entry.detalle  ?? null,
    });
  }

  async getLog(params: {
    page:     number;
    limit:    number;
    adminId?: string;
    accion?:  string;
  }): Promise<AuditLogResult> {
    const page   = Math.max(params.page  ?? 1, 1);
    const limit  = Math.min(params.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params.adminId) conditions.push(eq(adminAuditLog.adminId, params.adminId));
    if (params.accion)  conditions.push(eq(adminAuditLog.accion,  params.accion));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await this.db
      .select({ total: sql<number>`COUNT(*)` })
      .from(adminAuditLog)
      .where(where);

    const rows = await this.db
      .select()
      .from(adminAuditLog)
      .where(where)
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: rows,
      meta: { total: Number(countRow?.total ?? 0), page, limit },
    };
  }
}
```

- [ ] **Step 2.2: Registrar en `DatabaseStorage`**

Abre `server/storage/storeage/database-storage.ts`.

Agrega el import junto a los demás imports de admin storage:
```ts
import { AdminAuditStorage } from "../../admin/storage/admin-audit.storage.js";
```

Agrega la propiedad en la clase (junto a `public adminStats`):
```ts
public adminAudit: AdminAuditStorage;
```

Agrega la inicialización en el constructor (junto a `this.adminStats = ...`):
```ts
this.adminAudit = new AdminAuditStorage(this.db);
```

- [ ] **Step 2.3: Commit**

```bash
git add server/admin/storage/admin-audit.storage.ts server/storage/storeage/database-storage.ts
git commit -m "feat(admin): agregar AdminAuditStorage con log() y getLog()"
```

---

## Task 3: `audit.service.ts`

**Files:**
- Create: `server/admin/services/audit.service.ts`

- [ ] **Step 3.1: Crear el servicio**

```ts
// server/admin/services/audit.service.ts
import { storage } from "../../storage/storeage/database-storage.js";
import type { AuditEntry, AuditLogResult } from "../storage/admin-audit.storage.js";

export const auditService = {
  /**
   * Registra una acción crítica. Best-effort: si falla, no revierte la acción principal.
   * Llamar desde el controller DESPUÉS de que la acción fue exitosa.
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await storage.adminAudit.log(entry);
    } catch (err) {
      console.error("[audit] Error al registrar acción:", entry.accion, err);
    }
  },

  async getLog(params: {
    page:     number;
    limit:    number;
    adminId?: string;
    accion?:  string;
  }): Promise<AuditLogResult> {
    return storage.adminAudit.getLog(params);
  },
};
```

- [ ] **Step 3.2: Commit**

```bash
git add server/admin/services/audit.service.ts
git commit -m "feat(admin): agregar audit.service.ts (best-effort)"
```

---

## Task 4: `AdminUsersStorage`

**Files:**
- Create: `server/admin/storage/admin-users.storage.ts`
- Modify: `server/storage/storeage/database-storage.ts`

- [ ] **Step 4.1: Crear el storage**

```ts
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

    const conditions: any[] = [];
    if (rolIdFiltro !== undefined)      conditions.push(eq(users.rolId, rolIdFiltro));
    if (params.estado === "activo")     conditions.push(eq(users.isActive, true));
    if (params.estado === "suspendido") conditions.push(eq(users.isActive, false));
    if (params.search) {
      const pattern = `%${params.search}%`;
      conditions.push(
        or(
          like(users.name,  pattern),
          like(users.email, pattern),
        ) as any,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await this.db
      .select({ total: sql<number>`COUNT(*)` })
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
        id:              suscripciones.id,
        planNombre:      planes.nombre,
        ciclo:           suscripciones.ciclo,
        estado:          suscripciones.estado,
        fechaInicio:     suscripciones.fechaInicio,
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
```

- [ ] **Step 4.2: Registrar en `DatabaseStorage`**

Abre `server/storage/storeage/database-storage.ts`.

Agrega el import junto a los demás imports de admin storage:
```ts
import { AdminUsersStorage } from "../../admin/storage/admin-users.storage.js";
```

Agrega la propiedad en la clase:
```ts
public adminUsers: AdminUsersStorage;
```

Agrega la inicialización en el constructor:
```ts
this.adminUsers = new AdminUsersStorage(this.db);
```

- [ ] **Step 4.3: Commit**

```bash
git add server/admin/storage/admin-users.storage.ts server/storage/storeage/database-storage.ts
git commit -m "feat(admin): agregar AdminUsersStorage con lista, detalle y updates"
```

---

## Task 5: `admin-users.service.ts`

**Files:**
- Create: `server/admin/services/admin-users.service.ts`

- [ ] **Step 5.1: Crear el servicio**

```ts
// server/admin/services/admin-users.service.ts
import { storage } from "../../storage/storeage/database-storage.js";
import type {
  ListUsersParams,
  ListUsersResult,
  UserAdminDetail,
} from "../storage/admin-users.storage.js";

export const adminUsersService = {
  async list(params: ListUsersParams): Promise<ListUsersResult> {
    return storage.adminUsers.list(params);
  },

  async getById(id: string): Promise<UserAdminDetail | null> {
    return storage.adminUsers.getById(id);
  },

  async updateEstado(id: string, isActive: boolean): Promise<void> {
    return storage.adminUsers.updateEstado(id, isActive);
  },

  async updatePlan(id: string, planId: string): Promise<void> {
    return storage.adminUsers.updatePlan(id, planId);
  },
};
```

- [ ] **Step 5.2: Commit**

```bash
git add server/admin/services/admin-users.service.ts
git commit -m "feat(admin): agregar admin-users.service.ts"
```

---

## Task 6: `admin-users.controller.ts`

**Files:**
- Create: `server/admin/controllers/admin-users.controller.ts`

- [ ] **Step 6.1: Crear el controller**

```ts
// server/admin/controllers/admin-users.controller.ts
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { adminUsersService } from "../services/admin-users.service.js";
import { auditService } from "../services/audit.service.js";
import type { JWTPayload } from "@/shared/model.schema.js";
import jwt from "jsonwebtoken";

// ── Schemas Zod ───────────────────────────────────────────────────────────────

const listSchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(20),
  tipo:   z.enum(["abogado", "bufete", "cliente"]).optional(),
  estado: z.enum(["activo", "suspendido"]).optional(),
  search: z.string().max(100).optional(),
});

const updateEstadoSchema = z.object({
  activo: z.boolean(),
});

const updatePlanSchema = z.object({
  planId: z.string().min(1),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAdminId(req: Request): string {
  return ((req as any).user as JWTPayload).id;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = listSchema.parse(req.query);
    const result = await adminUsersService.list(params);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await adminUsersService.getById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateEstado(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { activo } = updateEstadoSchema.parse(req.body);
    const userId     = req.params.id;

    await adminUsersService.updateEstado(userId, activo);

    await auditService.log({
      adminId:  getAdminId(req),
      accion:   activo ? "usuario.activar" : "usuario.suspender",
      targetId: userId,
      detalle:  JSON.stringify({ activo }),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function updatePlan(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { planId } = updatePlanSchema.parse(req.body);
    const userId     = req.params.id;

    await adminUsersService.updatePlan(userId, planId);

    await auditService.log({
      adminId:  getAdminId(req),
      accion:   "usuario.cambiar_plan",
      targetId: userId,
      detalle:  JSON.stringify({ planId }),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.params.id;
    const secret = process.env.JWT_SECRET ?? "fallback_secret";

    const token = jwt.sign(
      { userId, purpose: "password_reset" },
      secret,
      { expiresIn: "1h" },
    );

    await auditService.log({
      adminId:  getAdminId(req),
      accion:   "usuario.reset_password",
      targetId: userId,
    });

    res.json({ success: true, data: { token, expiresIn: "1h" } });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 6.2: Commit**

```bash
git add server/admin/controllers/admin-users.controller.ts
git commit -m "feat(admin): agregar admin-users.controller.ts con Zod y auditoría"
```

---

## Task 7: Ruta + registro

**Files:**
- Create: `server/admin/routes/admin-users.routes.ts`
- Modify: `server/admin/routes/index.ts`

- [ ] **Step 7.1: Crear la ruta**

```ts
// server/admin/routes/admin-users.routes.ts
import { Router } from "express";
import { authenticate } from "../../auth.js";
import {
  requireAdmin,
  requireAdminRole,
} from "../middleware/require-admin.js";
import {
  listUsers,
  getUserById,
  updateEstado,
  updatePlan,
  resetPassword,
} from "../controllers/admin-users.controller.js";

const router = Router();

// Todos los endpoints requieren autenticación + rol admin
router.use(authenticate, requireAdmin);

router.get("/",    listUsers);
router.get("/:id", getUserById);

// Acciones críticas con sub-rol específico
router.patch(
  "/:id/estado",
  requireAdminRole("admin_super", "admin_soporte"),
  updateEstado,
);
router.patch(
  "/:id/plan",
  requireAdminRole("admin_super"),
  updatePlan,
);
router.post(
  "/:id/reset-password",
  requireAdminRole("admin_super"),
  resetPassword,
);

export default router;
```

- [ ] **Step 7.2: Registrar en `server/admin/routes/index.ts`**

Abre `server/admin/routes/index.ts`. Reemplaza el contenido con:

```ts
// server/admin/routes/index.ts
import { Router } from "express";
import adminStatsRoutes from "./admin-stats.routes.js";
import adminUsersRoutes from "./admin-users.routes.js";

const router = Router();

router.use("/stats", adminStatsRoutes);
router.use("/users", adminUsersRoutes);

export default router;
```

- [ ] **Step 7.3: Verificar endpoints con curl**

Primero haz login con el usuario `admin@lextrack.co` y copia el `<TOKEN>`.

```bash
# Lista de usuarios (requiere cualquier admin)
curl -H "Authorization: Bearer <TOKEN>" "http://localhost:3000/api/admin/users?page=1&limit=5"

# Detalle de un usuario (usar un id real de la DB)
curl -H "Authorization: Bearer <TOKEN>" "http://localhost:3000/api/admin/users/<USER_ID>"

# Sin token → debe retornar 401
curl "http://localhost:3000/api/admin/users"

# Con token de abogado → debe retornar 403
curl -H "Authorization: Bearer <TOKEN_ABOGADO>" "http://localhost:3000/api/admin/users"
```

- [ ] **Step 7.4: Commit**

```bash
git add server/admin/routes/admin-users.routes.ts server/admin/routes/index.ts
git commit -m "feat(admin): agregar rutas /api/admin/users con protección por sub-rol"
```

---

## Task 8: Ampliar `adminService.ts` (frontend)

**Files:**
- Modify: `lib/services/adminService.ts`

- [ ] **Step 8.1: Agregar tipos e `adminUsersService`**

Abre `lib/services/adminService.ts`. Agrega al final del archivo (después del `adminStatsService` existente):

```ts
// ── Usuarios ──────────────────────────────────────────────────────────────────

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
  firma:                  { id: string; nombre: string } | null;
  suscripcionActiva:      SuscripcionResumen | null;
  historialSuscripciones: SuscripcionResumen[];
}

export interface ListUsersParams {
  page?:   number;
  limit?:  number;
  tipo?:   "abogado" | "bufete" | "cliente";
  estado?: "activo" | "suspendido";
  search?: string;
}

export interface ListUsersResponse {
  success: boolean;
  data:    UserAdminRow[];
  meta:    { total: number; page: number; limit: number };
}

export const adminUsersService = {
  list: async (params: ListUsersParams = {}): Promise<ListUsersResponse> => {
    const query = new URLSearchParams();
    if (params.page)   query.set("page",   String(params.page));
    if (params.limit)  query.set("limit",  String(params.limit));
    if (params.tipo)   query.set("tipo",   params.tipo);
    if (params.estado) query.set("estado", params.estado);
    if (params.search) query.set("search", params.search);
    const qs = query.toString();
    const response = await apiRequest("GET", `/api/admin/users${qs ? `?${qs}` : ""}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json();
  },

  getById: async (id: string): Promise<{ success: boolean; data: UserAdminDetail }> => {
    const response = await apiRequest("GET", `/api/admin/users/${id}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json();
  },

  updateEstado: async (id: string, activo: boolean): Promise<void> => {
    const response = await apiRequest("PATCH", `/api/admin/users/${id}/estado`, { activo });
    if (!response.ok) throw new Error(`Error ${response.status}`);
  },

  updatePlan: async (id: string, planId: string): Promise<void> => {
    const response = await apiRequest("PATCH", `/api/admin/users/${id}/plan`, { planId });
    if (!response.ok) throw new Error(`Error ${response.status}`);
  },

  resetPassword: async (id: string): Promise<{ token: string; expiresIn: string }> => {
    const response = await apiRequest("POST", `/api/admin/users/${id}/reset-password`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },
};
```

- [ ] **Step 8.2: Verificar que `apiRequest` está importado**

La primera línea del archivo debe tener `import { apiRequest } from "../apiClient";`. Si no está, agrégala.

- [ ] **Step 8.3: Commit**

```bash
git add lib/services/adminService.ts
git commit -m "feat(admin): agregar adminUsersService al cliente HTTP frontend"
```

---

## Task 9: `usuarios/index.tsx` — Tabla paginada

**Files:**
- Create: `app/(admin-tabs)/usuarios/index.tsx`

- [ ] **Step 9.1: Crear la pantalla**

```tsx
// app/(admin-tabs)/usuarios/index.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AdminShell } from "../_shell/AdminShell";
import {
  adminUsersService,
  type ListUsersParams,
  type UserAdminRow,
} from "@/lib/services/adminService";

// ── Tipos de filtro ───────────────────────────────────────────────────────────

type TipoFiltro   = "todos" | "abogado" | "bufete" | "cliente";
type EstadoFiltro = "todos" | "activo" | "suspendido";

// ── Componentes auxiliares ────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function EstadoBadge({ activo }: { activo: boolean }) {
  return (
    <View style={[styles.badge, activo ? styles.badgeActivo : styles.badgeSuspendido]}>
      <Text style={[styles.badgeText, activo ? styles.badgeTextoActivo : styles.badgeTextoSuspendido]}>
        {activo ? "Activo" : "Suspendido"}
      </Text>
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function UsuariosScreen() {
  const [page,   setPage]   = useState(1);
  const [tipo,   setTipo]   = useState<TipoFiltro>("todos");
  const [estado, setEstado] = useState<EstadoFiltro>("todos");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const params: ListUsersParams = {
    page,
    limit: 20,
    tipo:   tipo   !== "todos" ? tipo   : undefined,
    estado: estado !== "todos" ? estado : undefined,
    search: search || undefined,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey:  ["admin-users", params],
    queryFn:   () => adminUsersService.list(params),
    staleTime: 30_000,
  });

  const usuarios: UserAdminRow[] = data?.data ?? [];
  const meta = data?.meta;

  function handleSearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  function handleTipo(value: TipoFiltro) {
    setTipo(value);
    setPage(1);
  }

  function handleEstado(value: EstadoFiltro) {
    setEstado(value);
    setPage(1);
  }

  return (
    <AdminShell title="Usuarios" scrollable={false}>
      {/* Barra de búsqueda */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o email..."
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Pressable onPress={handleSearch} style={styles.searchBtn}>
          <Ionicons name="search-outline" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Filtros */}
      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Tipo:</Text>
          {(["todos", "abogado", "bufete", "cliente"] as TipoFiltro[]).map(t => (
            <FilterChip
              key={t}
              label={t === "todos" ? "Todos" : t.charAt(0).toUpperCase() + t.slice(1)}
              active={tipo === t}
              onPress={() => handleTipo(t)}
            />
          ))}
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Estado:</Text>
          {(["todos", "activo", "suspendido"] as EstadoFiltro[]).map(e => (
            <FilterChip
              key={e}
              label={e === "todos" ? "Todos" : e.charAt(0).toUpperCase() + e.slice(1)}
              active={estado === e}
              onPress={() => handleEstado(e)}
            />
          ))}
        </View>
      </View>

      {/* Estados de carga / error */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}
      {isError && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.errorText}>Error al cargar usuarios.</Text>
        </View>
      )}

      {/* Tabla */}
      {!isLoading && !isError && (
        <>
          {/* Encabezado */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 2 }]}>Nombre</Text>
            <Text style={[styles.headerCell, { flex: 2 }]}>Email</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Tipo</Text>
            <Text style={[styles.headerCell, { flex: 1.5 }]}>Plan</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Estado</Text>
          </View>

          {usuarios.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No se encontraron usuarios.</Text>
            </View>
          )}

          {usuarios.map(u => (
            <Pressable
              key={u.id}
              onPress={() => router.push(`/(admin-tabs)/usuarios/${u.id}` as any)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>
                {u.name ?? "—"}
              </Text>
              <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>
                {u.email}
              </Text>
              <Text style={[styles.cell, { flex: 1 }]} numberOfLines={1}>
                {u.rol.nombre}
              </Text>
              <Text style={[styles.cell, { flex: 1.5 }]} numberOfLines={1}>
                {u.plan?.nombre ?? "—"}
              </Text>
              <View style={{ flex: 1 }}>
                <EstadoBadge activo={u.isActive} />
              </View>
            </Pressable>
          ))}

          {/* Paginación */}
          {meta && meta.total > 0 && (
            <View style={styles.pagination}>
              <Pressable
                onPress={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page <= 1}
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              >
                <Ionicons name="chevron-back-outline" size={16} color={page <= 1 ? "#CBD5E1" : "#2563EB"} />
                <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Anterior</Text>
              </Pressable>
              <Text style={styles.pageInfo}>
                Página {page} · {meta.total} usuarios
              </Text>
              <Pressable
                onPress={() => setPage(p => p + 1)}
                disabled={page * (meta.limit) >= meta.total}
                style={[styles.pageBtn, page * meta.limit >= meta.total && styles.pageBtnDisabled]}
              >
                <Text style={[styles.pageBtnText, page * meta.limit >= meta.total && styles.pageBtnTextDisabled]}>Siguiente</Text>
                <Ionicons name="chevron-forward-outline" size={16} color={page * meta.limit >= meta.total ? "#CBD5E1" : "#2563EB"} />
              </Pressable>
            </View>
          )}
        </>
      )}
    </AdminShell>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    backgroundColor: "#fff",
  },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  filters: {
    gap: 8,
    marginBottom: 16,
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
    marginRight: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
  },
  chipTextActive: {
    color: "#2563EB",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#DC2626",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerCell: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#fff",
  },
  rowPressed: {
    backgroundColor: "#F8FAFC",
  },
  cell: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#1E293B",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeActivo: {
    backgroundColor: "#DCFCE7",
  },
  badgeSuspendido: {
    backgroundColor: "#FEF2F2",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  badgeTextoActivo: {
    color: "#16A34A",
  },
  badgeTextoSuspendido: {
    color: "#DC2626",
  },
  empty: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 4,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563EB",
  },
  pageBtnDisabled: {
    borderColor: "#E2E8F0",
  },
  pageBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#2563EB",
  },
  pageBtnTextDisabled: {
    color: "#CBD5E1",
  },
  pageInfo: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
  },
});
```

- [ ] **Step 9.2: Commit**

```bash
git add "app/(admin-tabs)/usuarios/index.tsx"
git commit -m "feat(admin): agregar tabla paginada de usuarios con filtros"
```

---

## Task 10: `usuarios/[id].tsx` — Detalle + acciones

**Files:**
- Create: `app/(admin-tabs)/usuarios/[id].tsx`

- [ ] **Step 10.1: Crear la pantalla de detalle**

```tsx
// app/(admin-tabs)/usuarios/[id].tsx
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AdminShell } from "../_shell/AdminShell";
import { StyledModal } from "@/components/StyledModal";
import {
  adminUsersService,
  type UserAdminDetail,
  type SuscripcionResumen,
} from "@/lib/services/adminService";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  });
}

function EstadoBadge({ estado }: { estado: string }) {
  const isActiva = estado === "activa";
  return (
    <View style={[
      styles.badge,
      isActiva ? styles.badgeActivo : styles.badgeOtro,
    ]}>
      <Text style={[
        styles.badgeText,
        isActiva ? styles.badgeTextoActivo : styles.badgeTextoOtro,
      ]}>
        {estado}
      </Text>
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function UsuarioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Modals
  const [modalEstado,     setModalEstado]     = useState(false);
  const [modalPlan,       setModalPlan]       = useState(false);
  const [modalReset,      setModalReset]      = useState(false);
  const [resetToken,      setResetToken]      = useState<string | null>(null);
  const [errorMsg,        setErrorMsg]        = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-user", id],
    queryFn:  () => adminUsersService.getById(id),
    enabled:  !!id,
  });

  const user: UserAdminDetail | undefined = data?.data;

  // Mutaciones
  const mutEstado = useMutation({
    mutationFn: (activo: boolean) => adminUsersService.updateEstado(id, activo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user",  id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setModalEstado(false);
      setErrorMsg(null);
    },
    onError: () => setErrorMsg("Error al cambiar el estado del usuario."),
  });

  const mutPlan = useMutation({
    mutationFn: (planId: string) => adminUsersService.updatePlan(id, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user",  id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setModalPlan(false);
      setErrorMsg(null);
    },
    onError: () => setErrorMsg("Error al cambiar el plan."),
  });

  const mutReset = useMutation({
    mutationFn: () => adminUsersService.resetPassword(id),
    onSuccess: (result) => {
      setResetToken(result.token);
      setModalReset(false);
      setErrorMsg(null);
    },
    onError: () => setErrorMsg("Error al generar el token de reset."),
  });

  if (isLoading) {
    return (
      <AdminShell title="Usuario">
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </AdminShell>
    );
  }

  if (isError || !user) {
    return (
      <AdminShell title="Usuario">
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.errorText}>Error al cargar el usuario.</Text>
        </View>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={user.name ?? user.email} scrollable={false}>
      {/* Botón volver */}
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
      >
        <Ionicons name="arrow-back-outline" size={16} color="#2563EB" />
        <Text style={styles.backBtnText}>Volver a Usuarios</Text>
      </Pressable>

      <View style={styles.layout}>
        {/* ── Columna izquierda: Datos ── */}
        <ScrollView style={styles.leftCol} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Datos del usuario</Text>

          <View style={styles.infoCard}>
            <InfoRow icon="person-outline"   label="Nombre"  value={user.name ?? "—"} />
            <InfoRow icon="mail-outline"     label="Email"   value={user.email} />
            <InfoRow icon="shield-outline"   label="Rol"     value={user.rol.nombre} />
            {user.firma && (
              <InfoRow icon="business-outline" label="Firma" value={user.firma.nombre} />
            )}
            <InfoRow
              icon="calendar-outline"
              label="Registro"
              value={formatDate(user.createdAt)}
            />
            <InfoRow
              icon="ellipse-outline"
              label="Estado"
              value={user.isActive ? "Activo" : "Suspendido"}
              valueColor={user.isActive ? "#16A34A" : "#DC2626"}
            />
          </View>

          {/* Suscripción activa */}
          <Text style={styles.sectionTitle}>Suscripción activa</Text>
          {user.suscripcionActiva ? (
            <View style={styles.infoCard}>
              <InfoRow icon="layers-outline" label="Plan"  value={user.suscripcionActiva.planNombre} />
              <InfoRow icon="repeat-outline" label="Ciclo" value={user.suscripcionActiva.ciclo} />
              <InfoRow
                icon="calendar-outline"
                label="Vence"
                value={formatDate(user.suscripcionActiva.fechaFin)}
              />
            </View>
          ) : (
            <Text style={styles.emptyText}>Sin suscripción activa.</Text>
          )}

          {/* Historial de suscripciones */}
          {user.historialSuscripciones.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Historial de suscripciones</Text>
              {user.historialSuscripciones.map((s: SuscripcionResumen) => (
                <View key={s.id} style={styles.historialRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historialPlan}>{s.planNombre}</Text>
                    <Text style={styles.historialFecha}>
                      {formatDate(s.fechaInicio)} → {formatDate(s.fechaFin)}
                    </Text>
                  </View>
                  <EstadoBadge estado={s.estado} />
                </View>
              ))}
            </>
          )}
        </ScrollView>

        {/* ── Columna derecha: Acciones ── */}
        <View style={styles.rightCol}>
          <Text style={styles.sectionTitle}>Acciones</Text>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Reset token generado */}
          {resetToken && (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>Token de reset (válido 1 hora):</Text>
              <Text style={styles.tokenValue} selectable>{resetToken}</Text>
              <Pressable onPress={() => setResetToken(null)} style={styles.tokenClose}>
                <Ionicons name="close-outline" size={16} color="#64748B" />
              </Pressable>
            </View>
          )}

          <ActionButton
            icon={user.isActive ? "ban-outline" : "checkmark-circle-outline"}
            label={user.isActive ? "Suspender usuario" : "Activar usuario"}
            color={user.isActive ? "#DC2626" : "#16A34A"}
            onPress={() => setModalEstado(true)}
          />
          <ActionButton
            icon="layers-outline"
            label="Cambiar plan"
            color="#2563EB"
            onPress={() => setModalPlan(true)}
            disabled={!user.suscripcionActiva}
          />
          <ActionButton
            icon="key-outline"
            label="Generar reset de contraseña"
            color="#9333EA"
            onPress={() => setModalReset(true)}
          />
        </View>
      </View>

      {/* Modal: cambiar estado */}
      <StyledModal
        visible={modalEstado}
        onClose={() => setModalEstado(false)}
        title={user.isActive ? "Suspender usuario" : "Activar usuario"}
        confirmText={user.isActive ? "Suspender" : "Activar"}
        confirmVariant={user.isActive ? "danger" : "primary"}
        onConfirm={() => mutEstado.mutate(!user.isActive)}
      >
        <Text style={styles.modalBody}>
          {user.isActive
            ? `¿Confirmas suspender a ${user.name ?? user.email}? No podrá ingresar al sistema.`
            : `¿Confirmas reactivar a ${user.name ?? user.email}?`}
        </Text>
      </StyledModal>

      {/* Modal: cambiar plan */}
      <StyledModal
        visible={modalPlan}
        onClose={() => setModalPlan(false)}
        title="Cambiar plan"
        confirmText="Confirmar"
        confirmVariant="primary"
        onConfirm={() => {
          // TODO Fase 3: conectar con selector de planes dinámico.
          // Por ahora el modal informa que esta función se completa en Fase 3.
        }}
        hideConfirm
      >
        <Text style={styles.modalBody}>
          El selector de planes se habilitará en la Fase 3 (módulo de Planes).
        </Text>
      </StyledModal>

      {/* Modal: reset password */}
      <StyledModal
        visible={modalReset}
        onClose={() => setModalReset(false)}
        title="Generar reset de contraseña"
        confirmText="Generar token"
        confirmVariant="primary"
        onConfirm={() => mutReset.mutate()}
      >
        <Text style={styles.modalBody}>
          Se generará un token de reset válido por 1 hora para{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold" }}>
            {user.name ?? user.email}
          </Text>
          . El token se mostrará aquí para que puedas compartirlo con el usuario.
        </Text>
      </StyledModal>
    </AdminShell>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color="#94A3B8" style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
  disabled = false,
}: {
  icon:     keyof typeof Ionicons.glyphMap;
  label:    string;
  color:    string;
  onPress:  () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        { borderColor: color + "40" },
        pressed  && styles.actionBtnPressed,
        disabled && styles.actionBtnDisabled,
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={disabled ? "#CBD5E1" : color}
      />
      <Text style={[
        styles.actionBtnText,
        { color: disabled ? "#CBD5E1" : color },
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginBottom: 16,
    padding: 4,
  },
  backBtnPressed: { opacity: 0.7 },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#2563EB",
  },
  layout: {
    flex: 1,
    flexDirection: "row",
    gap: 24,
  },
  leftCol: {
    flex: 2,
  },
  rightCol: {
    width: 260,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoIcon: {
    marginRight: 10,
  },
  infoLabel: {
    width: 90,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#1E293B",
  },
  historialRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 6,
  },
  historialPlan: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#1E293B",
  },
  historialFecha: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeActivo: { backgroundColor: "#DCFCE7" },
  badgeOtro:   { backgroundColor: "#F1F5F9" },
  badgeText:   { fontSize: 12, fontFamily: "Inter_500Medium" },
  badgeTextoActivo: { color: "#16A34A" },
  badgeTextoOtro:   { color: "#64748B" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#DC2626",
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    marginBottom: 8,
  },
  tokenBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    position: "relative",
  },
  tokenLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#16A34A",
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#166534",
    wordBreak: "break-all" as any,
  },
  tokenClose: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#fff",
  },
  actionBtnPressed: { opacity: 0.8 },
  actionBtnDisabled: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  modalBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#475569",
    lineHeight: 22,
  },
});
```

- [ ] **Step 10.2: Verificar en el navegador**

1. Navega a `/(admin-tabs)/usuarios`
2. Verifica que la tabla carga con filtros funcionales
3. Haz click en un usuario → verifica que navega al detalle
4. En el detalle, verifica que los datos del usuario aparecen correctamente
5. Haz click en "Suspender usuario" → confirma en el modal → verifica que el estado cambia
6. Haz click en "Generar reset de contraseña" → confirma → verifica que aparece el token

- [ ] **Step 10.3: Commit final**

```bash
git add "app/(admin-tabs)/usuarios/[id].tsx"
git commit -m "feat(admin): agregar detalle de usuario con acciones y auditoría"
```

---

## Verificación final

Antes de dar por completada la Fase 2:

- [ ] `GET /api/admin/users` retorna lista paginada con meta
- [ ] `GET /api/admin/users/:id` retorna detalle completo
- [ ] `PATCH /api/admin/users/:id/estado` cambia `is_active` y crea registro en `admin_audit_log`
- [ ] `POST /api/admin/users/:id/reset-password` retorna token JWT
- [ ] Sin token → 401; con token de abogado → 403; con `admin_soporte` en PATCH plan → 403
- [ ] Tabla en UI carga y filtra correctamente
- [ ] Modal de confirmación aparece antes de cada acción
- [ ] `admin_audit_log` tiene registros tras las acciones críticas

```sql
-- Verificar auditoría en DB
SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 10;
```
