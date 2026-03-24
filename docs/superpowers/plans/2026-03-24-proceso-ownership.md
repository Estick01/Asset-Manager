# Proceso Ownership & Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an explicit ownership and sharing model for legal processes, replacing the implicit `proceso_lawyers`-based access with `proceso_ownership` (historical, append-only) and `proceso_sharing` (external access grants).

**Architecture:** Two new tables (`proceso_ownership`, `proceso_sharing`) plus rewritten access control (`assertProcesoAccess`). The `proceso_lawyers` table is untouched — it remains the operational assignment layer. All transitions are append-only (never overwrite, use `fecha_fin` + `activo_unique` pattern). The leave-bufete flow is extended to atomically revoke sharing and remove assignments.

**Tech Stack:** MySQL (InnoDB), Drizzle ORM, Express, React Native / Expo Router, TypeScript.

**Spec:** `docs/superpowers/specs/2026-03-24-proceso-ownership-design.md`

> **Note on tests:** The project has no test framework installed. Verification steps use manual curl commands and TypeScript compilation checks instead of automated tests.

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `migrations/0062_proceso_ownership.sql` | DDL for `proceso_ownership` table |
| `migrations/0063_proceso_sharing.sql` | DDL for `proceso_sharing` table |
| `shared/schema/proceso-ownership.schema.ts` | Drizzle table + types + DTOs |
| `shared/schema/proceso-sharing.schema.ts` | Drizzle table + types + DTOs |
| `server/storage/storeage/models/proceso-ownership-storage.ts` | CRUD + queries for ownership |
| `server/storage/storeage/models/proceso-sharing-storage.ts` | CRUD + queries for sharing |
| `server/routes/proceso-ownership.ts` | Transfer, sharing, revoke endpoints |
| `server/services/proceso-ownership.service.ts` | Business logic for ownership/sharing |
| `lib/services/ownershipService.ts` | Frontend HTTP client for ownership/sharing |
| `components/proceso/ProcessAccessPanel.tsx` | Tab "Acceso" in process detail |
| `components/proceso/ProcessDecisionWizard.tsx` | Wizard shown on joining firm |
| `components/proceso/LeaveConfirmModal.tsx` | Confirmation modal before leaving firm (Task 22) |
| `components/bufete/PendingReassignmentBanner.tsx` | Banner for unassigned processes (Task 23) |

### Modified files
| File | Change |
|------|--------|
| `shared/schema/index.ts` | Export new schemas |
| `server/storage/storeage/database-storage.ts` | Instantiate new storage classes |
| `server/storage/storeage/models/proceso-storage.ts` | Add `getProcesosByIds` and `getProcesoIdsByAbogadoAssignment` |
| `server/routes/procesos.ts` | Rewrite `assertProcesoAccess`, update GET queries |
| `server/routes/index.ts` | Register `proceso-ownership` routes |
| `server/routes/lawyer-firma-history.ts` | Extend retire endpoint with ownership revoke flow |
| `server/routes/firm-invitations.ts` | Add `requiresProcessDecision` to accept response |
| `app/case/[id].tsx` | Add "Acceso" tab using ProcessAccessPanel |

---

## Task 1: Migration — `proceso_ownership`

**Files:**
- Create: `migrations/0062_proceso_ownership.sql`

- [ ] **Step 1: Create migration file**

```sql
-- migrations/0062_proceso_ownership.sql
-- Tabla de propiedad histórica de procesos jurídicos.
-- Append-only: nunca se sobrescriben registros, se cierran con fecha_fin.
-- activo_unique: workaround MySQL para partial unique index.
--   1 = registro activo, NULL = histórico (MySQL permite múltiples NULLs en unique index).

CREATE TABLE IF NOT EXISTS proceso_ownership (
  id             VARCHAR(36)   NOT NULL,
  proceso_id     VARCHAR(36)   NOT NULL,
  owner_type     VARCHAR(20)   NOT NULL   COMMENT 'abogado | bufete | sin_owner',
  owner_id       VARCHAR(36)   NOT NULL   COMMENT 'lawyer_profiles.id o firm_profiles.id',
  fecha_inicio   TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP,
  fecha_fin      TIMESTAMP     NULL       COMMENT 'NULL = dueño actual',
  activo_unique  TINYINT(1)    NULL       COMMENT '1 si activo, NULL si histórico',
  creado_por     VARCHAR(36)   NOT NULL   COMMENT 'users.id',
  razon          VARCHAR(500)  NULL,
  created_at     TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE INDEX uq_ownership_activo (proceso_id, activo_unique),
  INDEX idx_ownership_proceso (proceso_id, fecha_fin),
  INDEX idx_ownership_owner   (owner_type, owner_id, fecha_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 2: Run migration against the database**

```bash
# From project root — use the same DB runner used by other migrations
npx drizzle-kit push
# OR if using direct MySQL execution:
# mysql -u <user> -p <dbname> < migrations/0062_proceso_ownership.sql
```

Expected: No errors. Verify with:
```bash
# In MySQL shell:
DESCRIBE proceso_ownership;
SHOW INDEX FROM proceso_ownership;
```

- [ ] **Step 3: Commit**

```bash
git add migrations/0062_proceso_ownership.sql
git commit -m "feat(db): migración proceso_ownership — ownership histórico append-only"
```

---

## Task 2: Migration — `proceso_sharing`

**Files:**
- Create: `migrations/0063_proceso_sharing.sql`

- [ ] **Step 1: Create migration file**

```sql
-- migrations/0063_proceso_sharing.sql
-- Tabla de accesos compartidos a procesos.
-- Append-only: revocar = cerrar con fecha_fin, nunca DELETE.
-- Permite compartir con múltiples entidades (bufete, corporacion, cliente).

CREATE TABLE IF NOT EXISTS proceso_sharing (
  id               VARCHAR(36)   NOT NULL,
  proceso_id       VARCHAR(36)   NOT NULL,
  shared_with_type VARCHAR(20)   NOT NULL   COMMENT 'bufete | corporacion | cliente',
  shared_with_id   VARCHAR(36)   NOT NULL,
  permission       VARCHAR(20)   NOT NULL   COMMENT 'ver | comentar | editar',
  fecha_inicio     TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP,
  fecha_fin        TIMESTAMP     NULL       COMMENT 'NULL = acceso activo',
  activo_unique    TINYINT(1)    NULL       COMMENT '1 si activo, NULL si histórico',
  creado_por       VARCHAR(36)   NOT NULL   COMMENT 'users.id',
  razon            VARCHAR(500)  NULL,
  created_at       TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE INDEX uq_sharing_activo (proceso_id, shared_with_type, shared_with_id, activo_unique),
  INDEX idx_sharing_proceso     (proceso_id, fecha_fin),
  INDEX idx_sharing_shared_with (shared_with_type, shared_with_id, fecha_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 2: Run migration**

```bash
npx drizzle-kit push
# Verify:
# DESCRIBE proceso_sharing;
# SHOW INDEX FROM proceso_sharing;
```

- [ ] **Step 3: Commit**

```bash
git add migrations/0063_proceso_sharing.sql
git commit -m "feat(db): migración proceso_sharing — accesos externos con permisos versionados"
```

---

## Task 3: Drizzle Schema — `proceso_ownership`

**Files:**
- Create: `shared/schema/proceso-ownership.schema.ts`

- [ ] **Step 1: Create schema file**

```typescript
// shared/schema/proceso-ownership.schema.ts
import {
  mysqlTable, varchar, timestamp, tinyint,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { procesos } from "./proceso.schema";

export type OwnerType = "abogado" | "bufete" | "sin_owner";

export const procesoOwnership = mysqlTable("proceso_ownership", {
  id:           varchar("id",         { length: 36 }).primaryKey(),
  procesoId:    varchar("proceso_id", { length: 36 }).notNull(),
  ownerType:    varchar("owner_type", { length: 20 }).notNull().$type<OwnerType>(),
  ownerId:      varchar("owner_id",   { length: 36 }).notNull(),
  fechaInicio:  timestamp("fecha_inicio").notNull().defaultNow(),
  fechaFin:     timestamp("fecha_fin"),
  activoUnique: tinyint("activo_unique"),   // 1 = activo, NULL = histórico
  creadoPor:    varchar("creado_por",  { length: 36 }).notNull(),
  razon:        varchar("razon",       { length: 500 }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const procesoOwnershipRelations = relations(procesoOwnership, ({ one }) => ({
  proceso: one(procesos, {
    fields: [procesoOwnership.procesoId],
    references: [procesos.id],
  }),
}));

export type ProcesoOwnership       = typeof procesoOwnership.$inferSelect;
export type InsertProcesoOwnership = typeof procesoOwnership.$inferInsert;

// DTO returned to API consumers
export interface ProcesoOwnershipDTO {
  id:          string;
  procesoId:   string;
  ownerType:   OwnerType;
  ownerId:     string;
  fechaInicio: Date;
  fechaFin:    Date | null;
  activo:      boolean;
  creadoPor:   string;
  razon:       string | null;
}

// Input to create/transfer ownership
export interface TransferOwnershipDTO {
  ownerType: OwnerType;
  ownerId:   string;
  razon?:    string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "proceso-ownership"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add shared/schema/proceso-ownership.schema.ts
git commit -m "feat(schema): ProcesoOwnership — tabla de propiedad histórica de procesos"
```

---

## Task 4: Drizzle Schema — `proceso_sharing`

**Files:**
- Create: `shared/schema/proceso-sharing.schema.ts`

- [ ] **Step 1: Create schema file**

```typescript
// shared/schema/proceso-sharing.schema.ts
import {
  mysqlTable, varchar, timestamp, tinyint,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { procesos } from "./proceso.schema";

export type SharedWithType  = "bufete" | "corporacion" | "cliente";
export type SharingPermission = "ver" | "comentar" | "editar";

// Techo de permisos por tipo de entidad receptora
export const PERMISSION_CEILING: Record<SharedWithType, SharingPermission[]> = {
  bufete:      ["ver", "comentar", "editar"],
  corporacion: ["ver", "comentar", "editar"],
  cliente:     ["ver"],   // Clientes: máximo 'ver'
};

export const procesoSharing = mysqlTable("proceso_sharing", {
  id:             varchar("id",               { length: 36 }).primaryKey(),
  procesoId:      varchar("proceso_id",       { length: 36 }).notNull(),
  sharedWithType: varchar("shared_with_type", { length: 20 }).notNull().$type<SharedWithType>(),
  sharedWithId:   varchar("shared_with_id",   { length: 36 }).notNull(),
  permission:     varchar("permission",       { length: 20 }).notNull().$type<SharingPermission>(),
  fechaInicio:    timestamp("fecha_inicio").notNull().defaultNow(),
  fechaFin:       timestamp("fecha_fin"),
  activoUnique:   tinyint("activo_unique"),
  creadoPor:      varchar("creado_por",        { length: 36 }).notNull(),
  razon:          varchar("razon",             { length: 500 }),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const procesoSharingRelations = relations(procesoSharing, ({ one }) => ({
  proceso: one(procesos, {
    fields: [procesoSharing.procesoId],
    references: [procesos.id],
  }),
}));

export type ProcesoSharing       = typeof procesoSharing.$inferSelect;
export type InsertProcesoSharing = typeof procesoSharing.$inferInsert;

export interface ProcesoSharingDTO {
  id:             string;
  procesoId:      string;
  sharedWithType: SharedWithType;
  sharedWithId:   string;
  permission:     SharingPermission;
  fechaInicio:    Date;
  fechaFin:       Date | null;
  activo:         boolean;
  creadoPor:      string;
  razon:          string | null;
}

export interface CreateSharingDTO {
  sharedWithType: SharedWithType;
  sharedWithId:   string;
  permission:     SharingPermission;
  razon?:         string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "proceso-sharing"
```

- [ ] **Step 3: Commit**

```bash
git add shared/schema/proceso-sharing.schema.ts
git commit -m "feat(schema): ProcesoSharing — accesos externos con historial y permisos por tipo"
```

---

## Task 5: Export schemas from `index.ts`

**Files:**
- Modify: `shared/schema/index.ts`

- [ ] **Step 1: Add exports**

Add at the end of `shared/schema/index.ts`:

```typescript
export {
  procesoOwnership,
  procesoOwnershipRelations,
  type OwnerType,
  type ProcesoOwnership,
  type InsertProcesoOwnership,
  type ProcesoOwnershipDTO,
  type TransferOwnershipDTO,
} from "./proceso-ownership.schema";

export {
  procesoSharing,
  procesoSharingRelations,
  PERMISSION_CEILING,
  type SharedWithType,
  type SharingPermission,
  type ProcesoSharing,
  type InsertProcesoSharing,
  type ProcesoSharingDTO,
  type CreateSharingDTO,
} from "./proceso-sharing.schema";
```

- [ ] **Step 2: Verify exports are visible**

```bash
npx tsc --noEmit 2>&1 | grep -E "ownership|sharing" | head -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add shared/schema/index.ts
git commit -m "feat(schema): exportar ProcesoOwnership y ProcesoSharing desde index"
```

---

## Task 6: Storage — `ProcesoOwnershipStorage`

**Files:**
- Create: `server/storage/storeage/models/proceso-ownership-storage.ts`

- [ ] **Step 1: Create storage class**

```typescript
// server/storage/storeage/models/proceso-ownership-storage.ts
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  procesoOwnership,
  type OwnerType,
  type ProcesoOwnershipDTO,
  type TransferOwnershipDTO,
} from "@/shared/schema";
import type { Database } from "../database-storage";

export class ProcesoOwnershipStorage {
  constructor(private db: Database) {}

  /** Ownership activo de un proceso (activo_unique = 1). */
  async getActive(procesoId: string): Promise<ProcesoOwnershipDTO | null> {
    const row = await this.db
      .select()
      .from(procesoOwnership)
      .where(and(
        eq(procesoOwnership.procesoId, procesoId),
        eq(procesoOwnership.activoUnique, 1),
      ))
      .limit(1)
      .then(r => r[0] ?? null);

    return row ? this.toDTO(row) : null;
  }

  /** Historial completo de ownership de un proceso (más reciente primero). */
  async getHistory(procesoId: string): Promise<ProcesoOwnershipDTO[]> {
    const rows = await this.db
      .select()
      .from(procesoOwnership)
      .where(eq(procesoOwnership.procesoId, procesoId))
      .orderBy(desc(procesoOwnership.fechaInicio));

    return rows.map(r => this.toDTO(r));
  }

  /**
   * Transferir ownership de un proceso.
   * Cierra el registro activo y abre uno nuevo en la misma transacción.
   * MUST be called inside a transaction in the service layer.
   */
  async transfer(
    procesoId: string,
    dto: TransferOwnershipDTO,
    creadoPor: string,
  ): Promise<ProcesoOwnershipDTO> {
    // 1. Cerrar ownership activo
    await this.db
      .update(procesoOwnership)
      .set({ fechaFin: new Date(), activoUnique: null })
      .where(and(
        eq(procesoOwnership.procesoId, procesoId),
        eq(procesoOwnership.activoUnique, 1),
      ));

    // 2. Crear nuevo ownership
    const id = randomUUID();
    await this.db.insert(procesoOwnership).values({
      id,
      procesoId,
      ownerType: dto.ownerType,
      ownerId:   dto.ownerId,
      activoUnique: 1,
      creadoPor,
      razon: dto.razon ?? null,
    });

    return {
      id,
      procesoId,
      ownerType:   dto.ownerType,
      ownerId:     dto.ownerId,
      fechaInicio: new Date(),
      fechaFin:    null,
      activo:      true,
      creadoPor,
      razon:       dto.razon ?? null,
    };
  }

  /**
   * Crear ownership inicial (para proceso recién creado).
   * Solo usar si no existe ningún ownership para el proceso.
   */
  async create(
    procesoId: string,
    ownerType: OwnerType,
    ownerId: string,
    creadoPor: string,
    razon?: string,
  ): Promise<ProcesoOwnershipDTO> {
    const id = randomUUID();
    await this.db.insert(procesoOwnership).values({
      id, procesoId, ownerType, ownerId,
      activoUnique: 1, creadoPor, razon: razon ?? null,
    });
    return {
      id, procesoId, ownerType, ownerId,
      fechaInicio: new Date(), fechaFin: null,
      activo: true, creadoPor, razon: razon ?? null,
    };
  }

  /**
   * Todos los procesoIds donde owner_type + owner_id tienen ownership activo.
   * Usado para construir el listado de procesos por rol.
   */
  async getProcesoIdsByOwner(ownerType: OwnerType, ownerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ procesoId: procesoOwnership.procesoId })
      .from(procesoOwnership)
      .where(and(
        eq(procesoOwnership.ownerType, ownerType),
        eq(procesoOwnership.ownerId, ownerId),
        eq(procesoOwnership.activoUnique, 1),
      ));
    return rows.map(r => r.procesoId);
  }

  private toDTO(row: typeof procesoOwnership.$inferSelect): ProcesoOwnershipDTO {
    return {
      id:          row.id,
      procesoId:   row.procesoId,
      ownerType:   row.ownerType as OwnerType,
      ownerId:     row.ownerId,
      fechaInicio: row.fechaInicio,
      fechaFin:    row.fechaFin ?? null,
      activo:      row.activoUnique === 1,
      creadoPor:   row.creadoPor,
      razon:       row.razon ?? null,
    };
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "proceso-ownership-storage"
```

- [ ] **Step 3: Commit**

```bash
git add server/storage/storeage/models/proceso-ownership-storage.ts
git commit -m "feat(storage): ProcesoOwnershipStorage — CRUD de ownership con historial append-only"
```

---

## Task 7: Storage — `ProcesoSharingStorage`

**Files:**
- Create: `server/storage/storeage/models/proceso-sharing-storage.ts`

- [ ] **Step 1: Create storage class**

```typescript
// server/storage/storeage/models/proceso-sharing-storage.ts
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  procesoSharing,
  PERMISSION_CEILING,
  type SharedWithType,
  type SharingPermission,
  type ProcesoSharingDTO,
  type CreateSharingDTO,
} from "@/shared/schema";
import type { Database } from "../database-storage";

export class ProcesoSharingStorage {
  constructor(private db: Database) {}

  /** Sharing activo de un proceso (todos los receptores). */
  async getActive(procesoId: string): Promise<ProcesoSharingDTO[]> {
    const rows = await this.db
      .select()
      .from(procesoSharing)
      .where(and(
        eq(procesoSharing.procesoId, procesoId),
        eq(procesoSharing.activoUnique, 1),
      ));
    return rows.map(r => this.toDTO(r));
  }

  /** Historial completo de sharing de un proceso. */
  async getHistory(procesoId: string): Promise<ProcesoSharingDTO[]> {
    const rows = await this.db
      .select()
      .from(procesoSharing)
      .where(eq(procesoSharing.procesoId, procesoId))
      .orderBy(desc(procesoSharing.fechaInicio));
    return rows.map(r => this.toDTO(r));
  }

  /** Sharing activo para una entidad específica (para assertProcesoAccess). */
  async findActive(
    procesoId: string,
    sharedWithType: SharedWithType,
    sharedWithId: string,
  ): Promise<ProcesoSharingDTO | null> {
    const row = await this.db
      .select()
      .from(procesoSharing)
      .where(and(
        eq(procesoSharing.procesoId,       procesoId),
        eq(procesoSharing.sharedWithType,  sharedWithType),
        eq(procesoSharing.sharedWithId,    sharedWithId),
        eq(procesoSharing.activoUnique,    1),
      ))
      .limit(1)
      .then(r => r[0] ?? null);
    return row ? this.toDTO(row) : null;
  }

  /**
   * Crear o actualizar sharing.
   * Si existe sharing activo para el mismo proceso+tipo+receptor → cierra y crea nuevo.
   */
  async upsert(
    procesoId: string,
    dto: CreateSharingDTO,
    creadoPor: string,
  ): Promise<ProcesoSharingDTO> {
    // Validar techo de permiso
    const allowed = PERMISSION_CEILING[dto.sharedWithType];
    if (!allowed.includes(dto.permission)) {
      throw new Error(
        `Permiso '${dto.permission}' no permitido para '${dto.sharedWithType}'. Máximo: ${allowed.join(", ")}`,
      );
    }

    // Cerrar sharing activo previo si existe
    await this.db
      .update(procesoSharing)
      .set({ fechaFin: new Date(), activoUnique: null })
      .where(and(
        eq(procesoSharing.procesoId,      procesoId),
        eq(procesoSharing.sharedWithType, dto.sharedWithType),
        eq(procesoSharing.sharedWithId,   dto.sharedWithId),
        eq(procesoSharing.activoUnique,   1),
      ));

    // Crear nuevo registro
    const id = randomUUID();
    await this.db.insert(procesoSharing).values({
      id,
      procesoId,
      sharedWithType: dto.sharedWithType,
      sharedWithId:   dto.sharedWithId,
      permission:     dto.permission,
      activoUnique:   1,
      creadoPor,
      razon:          dto.razon ?? null,
    });

    return {
      id, procesoId,
      sharedWithType: dto.sharedWithType,
      sharedWithId:   dto.sharedWithId,
      permission:     dto.permission,
      fechaInicio:    new Date(),
      fechaFin:       null,
      activo:         true,
      creadoPor,
      razon:          dto.razon ?? null,
    };
  }

  /** Revocar sharing por ID del registro. */
  async revoke(shareId: string, procesoId: string): Promise<void> {
    await this.db
      .update(procesoSharing)
      .set({ fechaFin: new Date(), activoUnique: null })
      .where(and(
        eq(procesoSharing.id,        shareId),
        eq(procesoSharing.procesoId, procesoId),
      ));
  }

  /**
   * Revocar todos los sharings activos de un proceso con una entidad.
   * Usado en el flujo de salida del bufete.
   */
  async revokeAllForEntity(
    sharedWithType: SharedWithType,
    sharedWithId: string,
    procesoIds: string[],
  ): Promise<void> {
    if (procesoIds.length === 0) return;
    // MySQL Drizzle no soporta inArray con update directamente en todas las versiones,
    // ejecutar en lote:
    for (const procesoId of procesoIds) {
      await this.db
        .update(procesoSharing)
        .set({ fechaFin: new Date(), activoUnique: null })
        .where(and(
          eq(procesoSharing.procesoId,      procesoId),
          eq(procesoSharing.sharedWithType, sharedWithType),
          eq(procesoSharing.sharedWithId,   sharedWithId),
          eq(procesoSharing.activoUnique,   1),
        ));
    }
  }

  /** ProcesoIds con sharing activo para una entidad. Para el listado del bufete/corporacion. */
  async getProcesoIdsBySharedWith(
    sharedWithType: SharedWithType,
    sharedWithId: string,
  ): Promise<string[]> {
    const rows = await this.db
      .select({ procesoId: procesoSharing.procesoId })
      .from(procesoSharing)
      .where(and(
        eq(procesoSharing.sharedWithType, sharedWithType),
        eq(procesoSharing.sharedWithId,   sharedWithId),
        eq(procesoSharing.activoUnique,   1),
      ));
    return rows.map(r => r.procesoId);
  }

  private toDTO(row: typeof procesoSharing.$inferSelect): ProcesoSharingDTO {
    return {
      id:             row.id,
      procesoId:      row.procesoId,
      sharedWithType: row.sharedWithType as SharedWithType,
      sharedWithId:   row.sharedWithId,
      permission:     row.permission as SharingPermission,
      fechaInicio:    row.fechaInicio,
      fechaFin:       row.fechaFin ?? null,
      activo:         row.activoUnique === 1,
      creadoPor:      row.creadoPor,
      razon:          row.razon ?? null,
    };
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "proceso-sharing-storage"
```

- [ ] **Step 3: Commit**

```bash
git add server/storage/storeage/models/proceso-sharing-storage.ts
git commit -m "feat(storage): ProcesoSharingStorage — CRUD de sharing con permisos y techo por tipo de entidad"
```

---

## Task 8: Register storage in `database-storage.ts`

**Files:**
- Modify: `server/storage/storeage/database-storage.ts`

- [ ] **Step 1: Add imports**

At the top of `database-storage.ts`, add:

```typescript
import { ProcesoOwnershipStorage } from "./models/proceso-ownership-storage";
import { ProcesoSharingStorage } from "./models/proceso-sharing-storage";
```

- [ ] **Step 2: Add public properties**

In the `DatabaseStorage` class, after the existing storage properties:

```typescript
public procesoOwnership: ProcesoOwnershipStorage;
public procesoSharing:   ProcesoSharingStorage;
```

- [ ] **Step 3: Instantiate in constructor**

In the constructor, after the existing instantiations:

```typescript
this.procesoOwnership = new ProcesoOwnershipStorage(this.db);
this.procesoSharing   = new ProcesoSharingStorage(this.db);
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "database-storage|procesoOwnership|procesoSharing" | head -10
```

- [ ] **Step 5: Add delegation methods to `DatabaseStorage`**

Tasks 9 and 14 call `storage.getProcesosByIds(...)` and `storage.getProcesoIdsByAbogadoAssignment(...)` directly on the `storage` instance. Add these delegating methods to `DatabaseStorage`:

```typescript
// In database-storage.ts — delegate to ProcesoStorage
async getProcesosByIds(ids: string[], filter?: any) {
  return this.proceso.getProcesosByIds(ids, filter);
}

async getProcesoIdsByAbogadoAssignment(lawyerId: string) {
  return this.proceso.getProcesoIdsByAbogadoAssignment(lawyerId);
}
```

> **Note:** `this.proceso` is the existing `ProcesoStorage` instance in `DatabaseStorage`. Adjust the property name if it differs (check for `this.procesos` or similar).

- [ ] **Step 6: Add missing query methods to `proceso-storage.ts`**

These methods are required by Tasks 9 and 14. Add to the `ProcesoStorage` class:

```typescript
/** Obtener procesos por array de IDs (usado en listados por rol con ownership). */
async getProcesosByIds(ids: string[], filter?: any): Promise<ProcesoDTO[]> {
  if (ids.length === 0) return [];
  const rows = await this.db
    .select()
    .from(procesos)
    .where(inArray(procesos.id, ids))
    .orderBy(desc(procesos.fechaCreacion));
  // Usar el mismo mapper interno que usa getProcesos para construir ProcesoDTO
  return Promise.all(rows.map(r => this.buildProcesoDTO(r)));
}

/** IDs de procesos donde el abogado tiene asignación activa. */
async getProcesoIdsByAbogadoAssignment(lawyerId: string): Promise<string[]> {
  const rows = await this.db
    .select({ procesoId: procesoLawyers.procesoId })
    .from(procesoLawyers)
    .where(and(
      eq(procesoLawyers.lawyerId, lawyerId),
      eq(procesoLawyers.status, "activo"),
    ));
  return rows.map(r => r.procesoId);
}
```

> **Note:** If `buildProcesoDTO` is inlined in `getProcesos`, extract it to a `private async buildProcesoDTO(row)` method first. Add `inArray` to Drizzle imports if not present.

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "database-storage|proceso-storage" | head -10
```

- [ ] **Step 8: Commit**

```bash
git add server/storage/storeage/database-storage.ts server/storage/storeage/models/proceso-storage.ts
git commit -m "feat(storage): registrar nuevos storages y agregar getProcesosByIds/getProcesoIdsByAbogadoAssignment"
```

---

## Task 9: Rewrite `assertProcesoAccess` and GET queries

**Files:**
- Modify: `server/routes/procesos.ts`

This is the most critical task. The function changes its return type from `proceso | null` to `ProcesoAccess | null`.

- [ ] **Step 1: Add type import and define ProcesoAccess type**

At the top of `server/routes/procesos.ts`, add after existing imports:

```typescript
import type { SharedWithType } from "@/shared/schema";

type AccessRole       = "owner" | "shared" | "assigned";
type AccessPermission = "ver" | "comentar" | "editar";

interface ProcesoAccess {
  proceso:    any;
  role:       AccessRole;
  permission: AccessPermission;
}

const PERMISSION_RANK: Record<AccessPermission, number> = {
  ver: 1, comentar: 2, editar: 3,
};

function maxPermission(a: AccessPermission, b: AccessPermission): AccessPermission {
  return PERMISSION_RANK[a] >= PERMISSION_RANK[b] ? a : b;
}
```

- [ ] **Step 2: Replace `assertProcesoAccess` function**

Replace the existing `assertProcesoAccess` function (currently lines 23–62) with:

```typescript
async function assertProcesoAccess(
  req: Request,
  res: Response,
  procesoId: string,
): Promise<ProcesoAccess | null> {
  const user = (req as any).user as JWTPayload;
  const rol = user.rol.nombre;
  const idProfile = user.idProfile;

  if (!idProfile) {
    res.status(400).json({ error: "idProfile requerido" });
    return null;
  }

  // Fetch proceso base (needed regardless of role)
  const proceso = await storage.getProceso(procesoId);
  if (!proceso) {
    res.status(404).json({ error: "Proceso no encontrado" });
    return null;
  }

  let bestRole: AccessRole | null       = null;
  let bestPermission: AccessPermission | null = null;

  const updateBest = (role: AccessRole, permission: AccessPermission) => {
    if (
      bestPermission === null ||
      PERMISSION_RANK[permission] > PERMISSION_RANK[bestPermission]
    ) {
      bestRole       = role;
      bestPermission = permission;
    }
  };

  // PASO 1 — Ownership activo
  const ownership = await storage.procesoOwnership.getActive(procesoId);
  if (ownership) {
    if (ownership.ownerType === "sin_owner") {
      // Proceso huérfano — inaccesible hasta revisión manual
      res.status(403).json({ error: "Proceso pendiente de revisión administrativa" });
      return null;
    }
    if (rol === "abogado" && ownership.ownerType === "abogado" && ownership.ownerId === idProfile) {
      updateBest("owner", "editar");
    }
    if (rol === "bufete" && ownership.ownerType === "bufete" && ownership.ownerId === idProfile) {
      updateBest("owner", "editar");
    }
  }

  // PASO 2 — Sharing activo
  if (rol === "bufete" || rol === "corporacion" || rol === "cliente") {
    const sharedWithType = rol as SharedWithType;
    const sharing = await storage.procesoSharing.findActive(procesoId, sharedWithType, idProfile);
    if (sharing) {
      updateBest("shared", sharing.permission as AccessPermission);
    }
  }

  // PASO 3 — Assignment (solo abogado)
  if (rol === "abogado" && bestRole === null) {
    const assigned = await storage.getProceoByAbogadoIdAndProcesoId(idProfile, procesoId);
    if (assigned && ownership) {
      // Subcaso A: proceso del bufete → verificar que el abogado sigue en ese bufete
      if (ownership.ownerType === "bufete") {
        const lawyer = await storage.abogados.getLawyer(idProfile);
        if (lawyer?.firmId === ownership.ownerId) {
          updateBest("assigned", "editar");
        }
      }
      // Subcaso B: proceso de otro abogado → asignación explícita del dueño
      if (ownership.ownerType === "abogado" && ownership.ownerId !== idProfile) {
        updateBest("assigned", "editar");
      }
    }
  }

  if (bestRole === null || bestPermission === null) {
    res.status(403).json({ error: "Sin acceso a este proceso" });
    return null;
  }

  return { proceso, role: bestRole, permission: bestPermission };
}
```

- [ ] **Step 3: Update all call sites of `assertProcesoAccess`**

Search for all uses of `assertProcesoAccess` in `procesos.ts`:

```bash
grep -n "assertProcesoAccess\|const proceso = await assert" server/routes/procesos.ts
```

For each endpoint that was `const proceso = await assertProcesoAccess(...)`, change to:

```typescript
const access = await assertProcesoAccess(req, res, id);
if (!access) return;
const { proceso, role, permission } = access;
```

Then add permission enforcement where needed:
- `PUT /api/procesos/:id` → require `permission` in `['editar']`
- `DELETE /api/procesos/:id` → require `role === 'owner'`
- `PUT /api/procesos/:id/responsable` → require `role === 'owner'`
- `POST /api/procesos/:id/lawyers` → require `role === 'owner'`
- `DELETE /api/procesos/:id/lawyers/:lawyerId` → require `role === 'owner'`

- [ ] **Step 4: Update `GET /api/procesos` query for abogado role**

In the GET /api/procesos handler, find the `case "abogado":` branch and update:

```typescript
case "abogado": {
  // Owned processes
  const ownedIds = await storage.procesoOwnership.getProcesoIdsByOwner("abogado", idProfile);
  // Assigned in bufete-owned processes (still member of that bufete)
  const lawyer = await storage.abogados.getLawyer(idProfile);
  const assignedProcesoIds = await storage.getProcesoIdsByAbogadoAssignment(idProfile);
  // Filter: only include bufete-owned processes where still member
  const validAssignedIds: string[] = [];
  for (const pid of assignedProcesoIds) {
    const ow = await storage.procesoOwnership.getActive(pid);
    if (!ow) continue;
    if (ow.ownerType === "abogado" && ow.ownerId !== idProfile) validAssignedIds.push(pid);
    if (ow.ownerType === "bufete" && lawyer?.firmId === ow.ownerId) validAssignedIds.push(pid);
  }
  const allIds = [...new Set([...ownedIds, ...validAssignedIds])];
  procesos = await storage.getProcesosByIds(allIds, filter);
  break;
}
```

For `bufete`:
```typescript
case "bufete": {
  const ownedIds  = await storage.procesoOwnership.getProcesoIdsByOwner("bufete", idProfile);
  const sharedIds = await storage.procesoSharing.getProcesoIdsBySharedWith("bufete", idProfile);
  const allIds = [...new Set([...ownedIds, ...sharedIds])];
  procesos = await storage.getProcesosByIds(allIds, filter);
  break;
}
```

For `corporacion`:
```typescript
case "corporacion": {
  const sharedIds = await storage.procesoSharing.getProcesoIdsBySharedWith("corporacion", idProfile);
  procesos = await storage.getProcesosByIds(sharedIds, filter);
  break;
}
```

For `cliente`:
```typescript
case "cliente": {
  const sharedIds = await storage.procesoSharing.getProcesoIdsBySharedWith("cliente", idProfile);
  procesos = await storage.getProcesosByIds(sharedIds, filter);
  break;
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "procesos.ts" | head -20
```

Fix any type errors before continuing.

- [ ] **Step 6: Commit**

```bash
git add server/routes/procesos.ts
git commit -m "feat(api): reescribir assertProcesoAccess con modelo ownership/sharing — retorna role+permission"
```

---

## Task 10: Hook ownership into process creation

**Files:**
- Modify: `server/routes/procesos.ts` (POST handler)

When a process is created, we need to set the initial ownership record.

- [ ] **Step 1: Update `POST /api/procesos` to create ownership**

In the `POST /api/procesos` handler, after `const newProceso = await storage.createProceso(...)`, add:

```typescript
// Crear registro de ownership inicial
const ownerType = (rol === "abogado") ? "abogado" : "bufete";
const ownerId   = idProfile;
await storage.procesoOwnership.create(
  newProceso.id,
  ownerType,
  ownerId,
  userId,
  "Creado por " + (rol === "abogado" ? "abogado" : "bufete"),
);
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "procesos.ts"
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/procesos.ts
git commit -m "feat(api): crear registro proceso_ownership al crear nuevo proceso"
```

---

## Task 11: New routes — ownership and sharing endpoints

**Files:**
- Create: `server/routes/proceso-ownership.ts`

- [ ] **Step 0: Verify middleware signatures exist**

```bash
grep -n "export.*validate\|export.*HttpException" \
  server/middleware/validation.ts \
  server/middleware/http-exception.ts 2>/dev/null | head -10
```

Expected: exports named `validate` and `HttpException`. If either file doesn't exist or the export names differ, adjust the import paths and names in Step 1 accordingly before continuing.

- [ ] **Step 1: Create route file**

```typescript
// server/routes/proceso-ownership.ts
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../auth.js";
import { validate } from "../middleware/validation.js";
import { storage } from "../storage/storeage/database-storage.js";
import type { JWTPayload } from "@/shared/schema";
import { HttpException } from "../middleware/http-exception.js";

const router = Router();

function userId(req: Request): string {
  return (req.user as JWTPayload).id;
}

function idProfile(req: Request): string {
  const p = (req.user as JWTPayload).idProfile;
  if (!p) throw HttpException.badRequest("idProfile requerido");
  return p;
}

const transferSchema = z.object({
  razon: z.string().max(500).optional(),
});

const sharingSchema = z.object({
  sharedWithType: z.enum(["bufete", "corporacion", "cliente"]),
  sharedWithId:   z.string().uuid(),
  permission:     z.enum(["ver", "comentar", "editar"]),
  razon:          z.string().max(500).optional(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function assertIsOwner(req: Request, res: Response, procesoId: string): Promise<boolean> {
  const profile = idProfile(req);
  const rol = (req.user as JWTPayload).rol.nombre;
  const ownership = await storage.procesoOwnership.getActive(procesoId);
  if (!ownership) { res.status(404).json({ error: "Proceso sin ownership registrado" }); return false; }

  const isOwner =
    (rol === "abogado" && ownership.ownerType === "abogado" && ownership.ownerId === profile) ||
    ((rol === "bufete" || rol === "corporacion") && ownership.ownerType === "bufete" && ownership.ownerId === profile);

  if (!isOwner) { res.status(403).json({ error: "Solo el dueño puede realizar esta acción" }); return false; }
  return true;
}

// ── Ownership endpoints ───────────────────────────────────────────────────────

/** GET /api/procesos/:id/ownership — historial completo */
router.get(
  "/procesos/:id/ownership",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ok = await assertIsOwner(req, res, req.params.id);
      if (!ok) return;
      const history = await storage.procesoOwnership.getHistory(req.params.id);
      res.json(history);
    } catch (err) { next(err); }
  },
);

/** POST /api/procesos/:id/transfer — transferir al bufete del abogado */
router.post(
  "/procesos/:id/transfer",
  authenticate,
  validate(transferSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const procesoId = req.params.id;
      const user = req.user as JWTPayload;

      if (user.rol.nombre !== "abogado") {
        return res.status(403).json({ error: "Solo el abogado puede transferir un proceso" });
      }

      const ownership = await storage.procesoOwnership.getActive(procesoId);
      if (!ownership || ownership.ownerType !== "abogado" || ownership.ownerId !== user.idProfile) {
        return res.status(403).json({ error: "Solo el abogado dueño puede transferir el proceso" });
      }

      // El abogado debe pertenecer a un bufete para transferir
      const lawyer = await storage.abogados.getLawyer(user.idProfile!);
      if (!lawyer?.firmId) {
        return res.status(400).json({ error: "El abogado no pertenece a ningún bufete" });
      }

      const result = await storage.procesoOwnership.transfer(
        procesoId,
        { ownerType: "bufete", ownerId: lawyer.firmId, razon: req.body.razon },
        userId(req),
      );
      res.status(201).json(result);
    } catch (err) { next(err); }
  },
);

// ── Sharing endpoints ─────────────────────────────────────────────────────────

/** GET /api/procesos/:id/sharing — lista sharing activo + historial */
router.get(
  "/procesos/:id/sharing",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ok = await assertIsOwner(req, res, req.params.id);
      if (!ok) return;
      const history = await storage.procesoSharing.getHistory(req.params.id);
      res.json(history);
    } catch (err) { next(err); }
  },
);

/** POST /api/procesos/:id/sharing — crear o actualizar sharing */
router.post(
  "/procesos/:id/sharing",
  authenticate,
  validate(sharingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ok = await assertIsOwner(req, res, req.params.id);
      if (!ok) return;
      const result = await storage.procesoSharing.upsert(
        req.params.id,
        req.body,
        userId(req),
      );
      res.status(201).json(result);
    } catch (err) { next(err); }
  },
);

/** DELETE /api/procesos/:id/sharing/:shareId — revocar sharing */
router.delete(
  "/procesos/:id/sharing/:shareId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: procesoId, shareId } = req.params;

      // Puede revocar el owner del proceso o la entidad receptora (auto-revocarse)
      const ownership = await storage.procesoOwnership.getActive(procesoId);
      const profile   = idProfile(req);
      const rol       = (req.user as JWTPayload).rol.nombre;
      const isOwner   = ownership && (
        (rol === "abogado" && ownership.ownerType === "abogado" && ownership.ownerId === profile) ||
        ((rol === "bufete" || rol === "corporacion") && ownership.ownerType === "bufete" && ownership.ownerId === profile)
      );

      if (!isOwner) {
        // Check if they are the entity receiving the share (self-revoke)
        const history = await storage.procesoSharing.getHistory(procesoId);
        const share = history.find(s => s.id === shareId);
        const isSelfRevoke = share && share.sharedWithId === profile;
        if (!isSelfRevoke) {
          return res.status(403).json({ error: "Sin permiso para revocar este sharing" });
        }
      }

      await storage.procesoSharing.revoke(shareId, procesoId);
      res.status(204).send();
    } catch (err) { next(err); }
  },
);

export default router;
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "proceso-ownership.ts" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/proceso-ownership.ts
git commit -m "feat(api): endpoints ownership (historial, transfer) y sharing (CRUD) de procesos"
```

---

## Task 12: Register new routes

**Files:**
- Modify: `server/routes/index.ts`

- [ ] **Step 1: Add import and registration**

In `server/routes/index.ts`:

```typescript
// Add import with other route imports:
import procesoOwnershipRoutes from "./proceso-ownership.js";

// Add registration inside registerAppRoutes:
app.use("/api", procesoOwnershipRoutes);
```

- [ ] **Step 2: Verify TypeScript + manual smoke test**

```bash
npx tsc --noEmit 2>&1 | grep "index.ts"
# Start server and test:
# curl -X GET http://localhost:PORT/api/procesos/SOME_ID/ownership \
#   -H "Authorization: Bearer TOKEN"
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/index.ts
git commit -m "feat(api): registrar rutas de proceso-ownership en el router principal"
```

---

## Task 13: Extend lawyer leave flow

**Files:**
- Modify: `server/routes/lawyer-firma-history.ts`

The existing `POST /lawyer-firma-history/:id/retire` endpoint needs to atomically:
1. Revoke all sharing of the lawyer's processes with that firm
2. Remove lawyer from proceso_lawyers of firm-owned processes
3. Deactivate from proceso_responsables of firm-owned processes
4. Update firm_id = NULL in lawyer_profiles (already done by retireLawyer)

- [ ] **Step 1: Verify table existence and read the retire endpoint**

```bash
grep -rn "lawyer_firma_history\|lawyerFirmaHistory" shared/schema/ | head -10
grep -n "retire\|retireLawyer" server/routes/lawyer-firma-history.ts | head -20
```

If `lawyer_firma_history` does not appear in `shared/schema/`, the table may need a migration (`0065_lawyer_firma_history.sql`). Check the DB schema and create the migration before continuing with this task if the table is absent.

- [ ] **Step 2: Add missing storage methods to proceso-storage.ts if needed**

Check if `removeAbogadoFromProcesos` exists:

```bash
grep -n "removeAbogadoFrom\|removeLawyerFrom\|desactivarResponsable" server/storage/storeage/models/proceso-storage.ts
```

If missing, add to `ProcesoStorage`:

```typescript
async removeAbogadoFromProcesos(lawyerId: string, procesoIds: string[]): Promise<void> {
  if (procesoIds.length === 0) return;
  for (const procesoId of procesoIds) {
    await this.db
      .update(procesoLawyers)
      .set({ status: "inactivo", fechaFin: new Date() })
      .where(and(
        eq(procesoLawyers.lawyerId,  lawyerId),
        eq(procesoLawyers.procesoId, procesoId),
        eq(procesoLawyers.status,    "activo"),
      ));
  }
}

async desactivarResponsable(lawyerId: string, procesoIds: string[]): Promise<void> {
  if (procesoIds.length === 0) return;
  for (const procesoId of procesoIds) {
    await this.db
      .update(procesoResponsables)
      .set({ activo: false, fechaFin: new Date() })
      .where(and(
        eq(procesoResponsables.lawyerId,  lawyerId),
        eq(procesoResponsables.procesoId, procesoId),
        eq(procesoResponsables.activo,    true),
      ));
  }
}
```

- [ ] **Step 3: Extend the retire handler**

After the existing `await storage.lawyerFirmaHistory.retireLawyer(id, ...)` call, add the ownership cleanup:

```typescript
// Cleanup ownership/sharing after retire
const lawyerId  = record.lawyerId;
const bufeteId  = record.firmaId;

// 1. Obtener procesos propios del abogado
const abogadoProcesoIds = await storage.procesoOwnership.getProcesoIdsByOwner("abogado", lawyerId);

// 2. Revocar sharing de esos procesos con ese bufete
await storage.procesoSharing.revokeAllForEntity("bufete", bufeteId, abogadoProcesoIds);

// 3. Obtener procesos del bufete donde el abogado está asignado
const bufeteProcesoIds = await storage.procesoOwnership.getProcesoIdsByOwner("bufete", bufeteId);

// 4. Remover al abogado de proceso_lawyers de procesos del bufete
await storage.removeAbogadoFromProcesos(lawyerId, bufeteProcesoIds);

// 5. Desactivar como responsable en procesos del bufete
await storage.desactivarResponsable(lawyerId, bufeteProcesoIds);
```

- [ ] **Step 4: Add abogado-initiated leave endpoint**

The spec defines `DELETE /api/lawyer-firma/leave` (abogado leaves voluntarily). Locate or create that handler. It must call the same cleanup logic as Step 3. If the route already exists, add the cleanup block after the existing `retireLawyer` call:

```bash
grep -n "DELETE.*leave\|lawyer-firma.*leave" server/routes/lawyer-firma-history.ts | head -5
```

If the endpoint does not exist, add it to `lawyer-firma-history.ts`:

```typescript
/** DELETE /lawyer-firma/leave — abogado exits voluntarily */
router.delete(
  "/lawyer-firma/leave",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as JWTPayload;
      if (user.rol.nombre !== "abogado") {
        return res.status(403).json({ error: "Solo el abogado puede usar este endpoint" });
      }
      const lawyer = await storage.abogados.getLawyer(user.idProfile!);
      if (!lawyer?.firmId) {
        return res.status(400).json({ error: "El abogado no pertenece a ningún bufete" });
      }
      const lawyerId = user.idProfile!;
      const bufeteId = lawyer.firmId;

      // Mismo cleanup que el flujo retire del bufete
      const abogadoProcesoIds = await storage.procesoOwnership.getProcesoIdsByOwner("abogado", lawyerId);
      await storage.procesoSharing.revokeAllForEntity("bufete", bufeteId, abogadoProcesoIds);
      const bufeteProcesoIds = await storage.procesoOwnership.getProcesoIdsByOwner("bufete", bufeteId);
      await storage.removeAbogadoFromProcesos(lawyerId, bufeteProcesoIds);
      await storage.desactivarResponsable(lawyerId, bufeteProcesoIds);

      await storage.abogados.updateFirmId(lawyerId, null);

      // Registrar en historial (audit trail — equivalente al INSERT del flujo bufete-initiated)
      await storage.lawyerFirmaHistory.create({
        lawyerId,
        firmaId:    bufeteId,
        accion:     "salida",
        iniciadoPor: lawyerId,
      });

      res.json({ success: true });
    } catch (err) { next(err); }
  },
);
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "lawyer-firma-history|proceso-storage" | head -10
```

- [ ] **Step 6: Commit**

```bash
git add server/routes/lawyer-firma-history.ts server/storage/storeage/models/proceso-storage.ts
git commit -m "feat(api): extender flujo retire con revocación de ownership y sharing al salir del bufete"
```

---

## Task 14: Batch decisions endpoint (joining firm)

**Files:**
- Modify: `server/routes/firm-invitations.ts`

- [ ] **Step 1: Read accept endpoint**

```bash
grep -n "accept\|POST" server/routes/firm-invitations.ts | head -20
```

- [ ] **Step 2: Modify accept response to include process list**

In the `POST /firm-invitations/:id/accept` handler, after updating `firm_id`, add:

```typescript
// Fetch abogado's owned processes for the wizard
const procesoIds = await storage.procesoOwnership.getProcesoIdsByOwner("abogado", idProfile);
const procesoList = await storage.getProcesosByIds(procesoIds, {});

res.json({
  ...invitation,
  requiresProcessDecision: procesoList.length > 0,
  procesos: procesoList,
});
```

- [ ] **Step 3: Add batch-decisions endpoint**

Add a new route file or add to `firm-invitations.ts`:

```typescript
// POST /api/procesos/batch-decisions
// Body: { decisions: Array<{ procesoId, action: 'privado'|'compartir'|'transferir', permission?: SharingPermission }> }

const batchDecisionSchema = z.object({
  bufeteId: z.string().uuid(),
  decisions: z.array(z.object({
    procesoId:  z.string().uuid(),
    action:     z.enum(["privado", "compartir", "transferir"]),
    permission: z.enum(["ver", "comentar", "editar"]).optional(),
  })),
});

router.post(
  "/procesos/batch-decisions",
  authenticate,
  validate(batchDecisionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as JWTPayload;
      if (user.rol.nombre !== "abogado") {
        return res.status(403).json({ error: "Solo el abogado puede ejecutar batch-decisions" });
      }

      const { bufeteId, decisions } = req.body;
      const results = { transferidos: 0, compartidos: 0, privados: 0, errores: [] as string[] };

      for (const d of decisions) {
        try {
          const ownership = await storage.procesoOwnership.getActive(d.procesoId);
          if (!ownership || ownership.ownerType !== "abogado" || ownership.ownerId !== user.idProfile) {
            results.errores.push(`${d.procesoId}: sin ownership`);
            continue;
          }
          if (d.action === "transferir") {
            await storage.procesoOwnership.transfer(
              d.procesoId,
              { ownerType: "bufete", ownerId: bufeteId, razon: "Transferido al unirse al bufete" },
              userId(req),
            );
            results.transferidos++;
          } else if (d.action === "compartir") {
            await storage.procesoSharing.upsert(
              d.procesoId,
              { sharedWithType: "bufete", sharedWithId: bufeteId, permission: d.permission ?? "ver", razon: "Compartido al unirse al bufete" },
              userId(req),
            );
            results.compartidos++;
          } else {
            results.privados++;
          }
        } catch (e: any) {
          results.errores.push(`${d.procesoId}: ${e.message}`);
        }
      }

      res.json(results);
    } catch (err) { next(err); }
  },
);
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "firm-invitations\|batch" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/firm-invitations.ts
git commit -m "feat(api): batch-decisions al unirse a bufete + requiresProcessDecision en accept invitation"
```

---

## Task 15: Frontend service — `ownershipService.ts`

**Files:**
- Create: `lib/services/ownershipService.ts`

- [ ] **Step 1: Create service**

```typescript
// lib/services/ownershipService.ts
import { apiRequest } from "../apiClient";
import type {
  ProcesoOwnershipDTO,
  ProcesoSharingDTO,
  CreateSharingDTO,
} from "@/shared/schema";

const SILENT = { silent: true } as const;

export async function getOwnershipHistory(procesoId: string): Promise<ProcesoOwnershipDTO[]> {
  const res = await apiRequest("GET", `/api/procesos/${procesoId}/ownership`, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener historial de ownership");
  return res.json();
}

export async function transferProceso(procesoId: string, razon?: string): Promise<ProcesoOwnershipDTO> {
  const res = await apiRequest("POST", `/api/procesos/${procesoId}/transfer`, { razon }, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al transferir proceso");
  }
  return res.json();
}

export async function getSharingList(procesoId: string): Promise<ProcesoSharingDTO[]> {
  const res = await apiRequest("GET", `/api/procesos/${procesoId}/sharing`, undefined, SILENT);
  if (!res.ok) throw new Error("Error al obtener accesos compartidos");
  return res.json();
}

export async function shareProcess(procesoId: string, dto: CreateSharingDTO): Promise<ProcesoSharingDTO> {
  const res = await apiRequest("POST", `/api/procesos/${procesoId}/sharing`, dto, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al compartir proceso");
  }
  return res.json();
}

export async function revokeSharing(procesoId: string, shareId: string): Promise<void> {
  const res = await apiRequest("DELETE", `/api/procesos/${procesoId}/sharing/${shareId}`, undefined, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al revocar acceso");
  }
}

export interface BatchDecision {
  procesoId:  string;
  action:     "privado" | "compartir" | "transferir";
  permission?: "ver" | "comentar" | "editar";
}

export async function submitBatchDecisions(
  bufeteId: string,
  decisions: BatchDecision[],
): Promise<{ transferidos: number; compartidos: number; privados: number; errores: string[] }> {
  const res = await apiRequest("POST", `/api/procesos/batch-decisions`, { bufeteId, decisions });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al procesar decisiones");
  }
  return res.json();
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "ownershipService" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add lib/services/ownershipService.ts
git commit -m "feat(services): ownershipService — cliente HTTP para ownership y sharing de procesos"
```

---

## Task 16: Frontend — `ProcessDecisionWizard`

**Files:**
- Create: `components/proceso/ProcessDecisionWizard.tsx`

- [ ] **Step 1: Create wizard component**

```typescript
// components/proceso/ProcessDecisionWizard.tsx
import React, { useState } from "react";
import {
  Modal, View, Text, Pressable, ScrollView,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import { submitBatchDecisions, type BatchDecision } from "@/lib/services/ownershipService";
import type { ProcesoDTO } from "@/shared/schema";

type Action = "privado" | "compartir" | "transferir";
type Permission = "ver" | "comentar" | "editar";

interface DecisionRow {
  procesoId:  string;
  titulo:     string;
  action:     Action;
  permission: Permission;
}

interface Props {
  visible:    boolean;
  bufeteId:   string;
  bufeteNombre: string;
  procesos:   { id: string; radicado: string }[];
  onClose:    () => void;
  onCompleted: () => void;
}

export function ProcessDecisionWizard({ visible, bufeteId, bufeteNombre, procesos, onClose, onCompleted }: Props) {
  const [decisions, setDecisions] = useState<DecisionRow[]>(
    procesos.map(p => ({ procesoId: p.id, titulo: p.radicado, action: "privado", permission: "ver" })),
  );
  const [loading, setLoading] = useState(false);

  const setAction = (procesoId: string, action: Action) => {
    setDecisions(prev => prev.map(d => d.procesoId === procesoId ? { ...d, action } : d));
  };

  const setPermission = (procesoId: string, permission: Permission) => {
    setDecisions(prev => prev.map(d => d.procesoId === procesoId ? { ...d, permission } : d));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const batch: BatchDecision[] = decisions.map(d => ({
        procesoId:  d.procesoId,
        action:     d.action,
        permission: d.action === "compartir" ? d.permission : undefined,
      }));
      await submitBatchDecisions(bufeteId, batch);
      toast.success("Decisiones guardadas");
      onCompleted();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tus procesos y el bufete</Text>
          <Text style={styles.subtitle}>
            Ahora perteneces a {bufeteNombre}. ¿Qué hacemos con tus {procesos.length} proceso(s)?
          </Text>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }}>
          {decisions.map(d => (
            <View key={d.procesoId} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={1}>{d.titulo}</Text>

              <View style={styles.options}>
                {(["privado", "compartir", "transferir"] as Action[]).map(a => (
                  <Pressable
                    key={a}
                    style={[styles.option, d.action === a && styles.optionSelected]}
                    onPress={() => setAction(d.procesoId, a)}
                  >
                    <Text style={[styles.optionText, d.action === a && styles.optionTextSelected]}>
                      {a === "privado" ? "Privado" : a === "compartir" ? "Compartir" : "Transferir"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {d.action === "compartir" && (
                <View style={styles.permRow}>
                  <Text style={styles.permLabel}>Permiso:</Text>
                  {(["ver", "comentar", "editar"] as Permission[]).map(p => (
                    <Pressable
                      key={p}
                      style={[styles.permChip, d.permission === p && styles.permChipSelected]}
                      onPress={() => setPermission(d.procesoId, p)}
                    >
                      <Text style={[styles.permText, d.permission === p && styles.permTextSelected]}>
                        {p}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.btnSecondary} onPress={onClose}>
            <Text style={styles.btnSecondaryText}>Decidir después</Text>
          </Pressable>
          <Pressable style={styles.btnPrimary} onPress={handleConfirm} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnPrimaryText}>Confirmar</Text>
            }
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#F9FAFB" },
  header:      { padding: 20, paddingTop: 40, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  title:       { fontSize: 20, fontFamily: "Inter_700Bold", color: "#111827", marginBottom: 4 },
  subtitle:    { fontSize: 14, fontFamily: "Inter_400Regular", color: "#6B7280" },
  list:        { flex: 1 },
  card:        { backgroundColor: "#fff", margin: 12, borderRadius: 12, padding: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, gap: 10 },
  cardTitle:   { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1F2937" },
  options:     { flexDirection: "row", gap: 8 },
  option:      { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center" },
  optionSelected: { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" },
  optionText:  { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#6B7280" },
  optionTextSelected: { color: "#3B82F6" },
  permRow:     { flexDirection: "row", alignItems: "center", gap: 6 },
  permLabel:   { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular" },
  permChip:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "#D1D5DB" },
  permChipSelected: { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" },
  permText:    { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#6B7280" },
  permTextSelected: { color: "#3B82F6" },
  footer:      { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", backgroundColor: "#fff" },
  btnSecondary: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center" },
  btnSecondaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#374151" },
  btnPrimary:  { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: "#3B82F6", alignItems: "center" },
  btnPrimaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "ProcessDecisionWizard" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add components/proceso/ProcessDecisionWizard.tsx
git commit -m "feat(ui): ProcessDecisionWizard — pantalla de decisión de procesos al unirse a bufete"
```

---

## Task 17: Frontend — `ProcessAccessPanel`

**Files:**
- Create: `components/proceso/ProcessAccessPanel.tsx`

- [ ] **Step 1: Create access panel component**

```typescript
// components/proceso/ProcessAccessPanel.tsx
import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import {
  getOwnershipHistory, getSharingList,
  transferProceso, shareProcess, revokeSharing,
} from "@/lib/services/ownershipService";
import type { ProcesoOwnershipDTO, ProcesoSharingDTO } from "@/shared/schema";

interface Props {
  procesoId:  string;
  isOwner:    boolean;   // role === 'owner' from assertProcesoAccess
  bufeteId?:  string;    // lawyer's current firm (if any)
  bufeteNombre?: string;
}

export function ProcessAccessPanel({ procesoId, isOwner, bufeteId, bufeteNombre }: Props) {
  const [ownership, setOwnership] = useState<ProcesoOwnershipDTO | null>(null);
  const [sharing,   setSharing]   = useState<ProcesoSharingDTO[]>([]);
  const [loading,   setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [hist, shares] = await Promise.all([
        getOwnershipHistory(procesoId),
        getSharingList(procesoId),
      ]);
      setOwnership(hist.find(h => h.activo) ?? null);
      setSharing(shares.filter(s => s.activo));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [procesoId]);

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

  const handleTransfer = () => {
    Alert.alert(
      "Transferir al bufete",
      `¿Transferir este proceso a ${bufeteNombre}? Esta acción es irreversible salvo acción del bufete.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Transferir",
          style: "destructive",
          onPress: async () => {
            try {
              await transferProceso(procesoId, `Transferido a ${bufeteNombre}`);
              toast.success("Proceso transferido");
              load();
            } catch (e: any) { toast.error(e.message); }
          },
        },
      ],
    );
  };

  const handleRevoke = (shareId: string) => {
    Alert.alert("Revocar acceso", "¿Eliminar este acceso compartido?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Revocar",
        style: "destructive",
        onPress: async () => {
          try {
            await revokeSharing(procesoId, shareId);
            toast.success("Acceso revocado");
            load();
          } catch (e: any) { toast.error(e.message); }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Propiedad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Propiedad</Text>
        <View style={styles.row}>
          <Ionicons name="person-circle-outline" size={16} color="#6B7280" />
          <Text style={styles.rowText}>
            {ownership?.ownerType === "abogado" ? "Tú (abogado)" :
             ownership?.ownerType === "bufete"   ? "Bufete" : "Sin dueño"}
          </Text>
          {ownership?.fechaInicio && (
            <Text style={styles.rowMeta}>
              desde {new Date(ownership.fechaInicio).toLocaleDateString("es-CO")}
            </Text>
          )}
        </View>
        {isOwner && ownership?.ownerType === "abogado" && bufeteId && (
          <Pressable style={styles.transferBtn} onPress={handleTransfer}>
            <Text style={styles.transferBtnText}>Transferir al bufete →</Text>
          </Pressable>
        )}
      </View>

      {/* Accesos compartidos */}
      {isOwner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceso compartido</Text>
          {sharing.length === 0 ? (
            <Text style={styles.emptyText}>Sin accesos compartidos activos</Text>
          ) : (
            sharing.map(s => (
              <View key={s.id} style={styles.shareRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shareEntity}>
                    {s.sharedWithType === "bufete" ? "Bufete" :
                     s.sharedWithType === "cliente" ? "Cliente" : "Corporación"}
                  </Text>
                  <Text style={styles.sharePerm}>{s.permission}</Text>
                </View>
                <Pressable onPress={() => handleRevoke(s.id)} hitSlop={8}>
                  <Text style={styles.revokeText}>Revocar</Text>
                </Pressable>
              </View>
            ))
          )}
          {bufeteId && ownership?.ownerType === "abogado" && (
            <Pressable
              style={styles.addShareBtn}
              onPress={async () => {
                try {
                  await shareProcess(procesoId, {
                    sharedWithType: "bufete",
                    sharedWithId:   bufeteId,
                    permission:     "ver",
                  });
                  toast.success("Proceso compartido con el bufete");
                  load();
                } catch (e: any) { toast.error(e.message); }
              }}
            >
              <Ionicons name="add" size={14} color="#3B82F6" />
              <Text style={styles.addShareText}>Compartir con bufete</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, padding: 16, gap: 16 },
  section:      { backgroundColor: "#fff", borderRadius: 12, padding: 14, gap: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 },
  row:          { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText:      { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1F2937" },
  rowMeta:      { fontSize: 12, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
  transferBtn:  { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#EFF6FF", borderRadius: 8, borderWidth: 1, borderColor: "#BFDBFE" },
  transferBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#3B82F6" },
  emptyText:    { fontSize: 13, color: "#9CA3AF", fontFamily: "Inter_400Regular" },
  shareRow:     { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  shareEntity:  { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#374151" },
  sharePerm:    { fontSize: 11, color: "#6B7280", fontFamily: "Inter_400Regular" },
  revokeText:   { fontSize: 12, color: "#EF4444", fontFamily: "Inter_600SemiBold" },
  addShareBtn:  { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#EFF6FF", borderRadius: 8, marginTop: 4 },
  addShareText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#3B82F6" },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "ProcessAccessPanel" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add components/proceso/ProcessAccessPanel.tsx
git commit -m "feat(ui): ProcessAccessPanel — panel de ownership y sharing en detalle del proceso"
```

---

## Task 18: Wire wizard into firm invitation accept flow

**Files:**
- Modify: the screen that handles `firm-invitations` acceptance (check `app/` for the invite screen)

- [ ] **Step 1: Find where invitations are accepted in the frontend**

```bash
grep -rn "firm-invitations\|accept.*invitation\|requiresProcessDecision" app/ lib/ --include="*.tsx" --include="*.ts" | head -20
```

- [ ] **Step 2: Import and use `ProcessDecisionWizard`**

In the invitation accept flow, after a successful accept response:

```typescript
// When res.requiresProcessDecision === true:
if (result.requiresProcessDecision && result.procesos?.length > 0) {
  setShowWizard(true);
  setWizardData({ procesos: result.procesos, bufeteId: result.firmaId, bufeteNombre: result.firmaNombre });
}
```

Add the wizard to the JSX:

```typescript
<ProcessDecisionWizard
  visible={showWizard}
  bufeteId={wizardData?.bufeteId ?? ""}
  bufeteNombre={wizardData?.bufeteNombre ?? ""}
  procesos={wizardData?.procesos ?? []}
  onClose={() => setShowWizard(false)}
  onCompleted={() => setShowWizard(false)}
/>
```

- [ ] **Step 3: Commit**

```bash
git add <modified invitation screen>
git commit -m "feat(ui): mostrar ProcessDecisionWizard al aceptar invitación de bufete"
```

---

## Task 19: Add "Acceso" tab to case detail

**Files:**
- Modify: `app/case/[id].tsx`

- [ ] **Step 1: Find existing tab structure in case detail**

```bash
grep -n "tab\|Tab\|section\|Section" app/case/[id].tsx | head -30
```

- [ ] **Step 2: Add import and "Acceso" tab**

```typescript
import { ProcessAccessPanel } from "@/components/proceso/ProcessAccessPanel";
```

Add to the tabs array (only visible when `role === 'owner'`):

```typescript
// In tab list:
{ key: "acceso", label: "Acceso", icon: "lock-closed-outline" }

// In tab content switch:
case "acceso":
  return (
    <ProcessAccessPanel
      procesoId={procesoId}
      isOwner={access?.role === "owner"}
      bufeteId={lawyerProfile?.firmId ?? undefined}
      bufeteNombre={firmProfile?.name ?? undefined}
    />
  );
```

- [ ] **Step 3: Verify TypeScript and visual check**

```bash
npx tsc --noEmit 2>&1 | grep "case/\[id\]" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add app/case/[id].tsx
git commit -m "feat(ui): agregar tab Acceso en detalle del caso con ProcessAccessPanel"
```

---

## Task 20: Final TypeScript check and integration verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -40
```

Fix any remaining type errors.

- [ ] **Step 2: Verify route registration**

```bash
grep -n "procesoOwnership\|batch-decisions\|proceso-ownership" server/routes/index.ts
```

- [ ] **Step 3: Manual smoke test — create process, check ownership**

Start the server and:
1. Create a process as an abogado → verify `proceso_ownership` record is created with `owner_type='abogado'`
2. GET `/api/procesos/:id/ownership` → should return the ownership history
3. POST `/api/procesos/:id/sharing` → should create a sharing record
4. GET `/api/procesos/:id` as bufete with sharing → should return the process

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: sistema de ownership y sharing de procesos — implementación completa"
```

---

## Task 21: Backend — `GET /api/firm/:firmId/pending-reassignments`

**Files:**
- Modify: `server/routes/proceso-ownership.ts`

Bufete needs a list of processes that have no active lawyer assignment after a lawyer exits (used by `PendingReassignmentBanner`).

- [ ] **Step 1: Add storage query to `ProcesoOwnershipStorage`**

First, verify the existing imports in `proceso-ownership-storage.ts` and add any missing ones:

```typescript
// Ensure these imports are present at the top of proceso-ownership-storage.ts:
import { procesoLawyers } from "@/shared/schema";  // if not already imported
import { inArray } from "drizzle-orm";               // if not already imported
```

Then add the method to `ProcesoOwnershipStorage`:

```typescript
/** Procesos del bufete sin asignación activa (para el banner de reasignación) */
async getPendingReassignmentIds(bufeteId: string): Promise<string[]> {
  const ownedIds = await this.getProcesoIdsByOwner("bufete", bufeteId);
  if (ownedIds.length === 0) return [];
  // Exclude processes that still have at least one active lawyer assigned
  const assigned = await this.db
    .selectDistinct({ procesoId: procesoLawyers.procesoId })
    .from(procesoLawyers)
    .where(and(
      inArray(procesoLawyers.procesoId, ownedIds),
      eq(procesoLawyers.status, "activo"),
    ));
  const assignedSet = new Set(assigned.map(r => r.procesoId));
  return ownedIds.filter(id => !assignedSet.has(id));
}
```

- [ ] **Step 2: Add route to `proceso-ownership.ts`**

```typescript
/** GET /api/firm/:firmId/pending-reassignments */
router.get(
  "/firm/:firmId/pending-reassignments",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as JWTPayload;
      const rol = user.rol.nombre;
      if (rol !== "bufete" && rol !== "corporacion") {
        return res.status(403).json({ error: "Acceso denegado" });
      }
      const ids = await storage.procesoOwnership.getPendingReassignmentIds(req.params.firmId);
      const procesos = await storage.getProcesosByIds(ids, {});
      res.json(procesos);
    } catch (err) { next(err); }
  },
);
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "proceso-ownership" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/proceso-ownership.ts server/storage/storeage/models/proceso-ownership-storage.ts
git commit -m "feat(api): endpoint pending-reassignments para banner de bufete tras salida de abogado"
```

---

## Task 22: Frontend — `LeaveConfirmModal`

**Files:**
- Create: `components/proceso/LeaveConfirmModal.tsx`

Shown to the abogado before confirming they leave the firm. Lists the impact: processes whose sharing will be revoked, and processes from the firm they'll lose access to.

- [ ] **Step 1: Create component**

```typescript
// components/proceso/LeaveConfirmModal.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import StyledModal from "@/components/StyledModal";

interface LeaveConfirmModalProps {
  visible: boolean;
  impactSummary: {
    sharedToBeRevoked: number;
    firmProcessesLost: number;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export function LeaveConfirmModal({
  visible,
  impactSummary,
  onConfirm,
  onCancel,
}: LeaveConfirmModalProps) {
  return (
    <StyledModal visible={visible} onClose={onCancel} title="¿Salir del bufete?">
      <Text style={styles.body}>Al salir del bufete ocurrirá lo siguiente:</Text>
      <Text style={styles.bullet}>
        • {impactSummary.sharedToBeRevoked} proceso(s) dejará(n) de estar compartidos con el bufete.
      </Text>
      <Text style={styles.bullet}>
        • Perderás acceso a {impactSummary.firmProcessesLost} proceso(s) del bufete donde estás asignado.
      </Text>
      <Text style={styles.bullet}>
        • Esta acción no se puede deshacer directamente; el bufete deberá reinvitarte.
      </Text>
      <View style={styles.actions}>
        <Text style={styles.cancelBtn} onPress={onCancel}>Cancelar</Text>
        <Text style={styles.confirmBtn} onPress={onConfirm}>Salir del bufete</Text>
      </View>
    </StyledModal>
  );
}

const styles = StyleSheet.create({
  body:       { marginBottom: 8, color: "#374151" },
  bullet:     { marginBottom: 6, color: "#374151" },
  actions:    { flexDirection: "row", justifyContent: "flex-end", marginTop: 16, gap: 16 },
  cancelBtn:  { color: "#6B7280", fontSize: 14 },
  confirmBtn: { color: "#EF4444", fontSize: 14, fontWeight: "600" },
});
```

- [ ] **Step 2: Wire into the bufete membership screen**

Find where the leave-firm action currently lives:

```bash
grep -rn "leave\|salir.*bufete\|retireLawyer" app/ components/ | grep -v "node_modules" | head -10
```

Replace any direct confirmation prompt with `<LeaveConfirmModal />`. Pass real impact data by calling `ownershipService.getLeaveFirmImpact(firmId)` (add this helper to `ownershipService.ts` in Task 15 if not present).

- [ ] **Step 3: Commit**

```bash
git add components/proceso/LeaveConfirmModal.tsx
git commit -m "feat(ui): LeaveConfirmModal con resumen de impacto antes de salir del bufete"
```

---

## Task 23: Frontend — `PendingReassignmentBanner`

**Files:**
- Create: `components/bufete/PendingReassignmentBanner.tsx`

Shown in the bufete dashboard when there are processes with no active lawyer assignment (after a lawyer has left).

- [ ] **Step 1: Create component**

```typescript
// components/bufete/PendingReassignmentBanner.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

interface PendingReassignmentBannerProps {
  count: number;
  firmId: string;
}

export function PendingReassignmentBanner({ count, firmId }: PendingReassignmentBannerProps) {
  const router = useRouter();
  if (count === 0) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        {count} proceso(s) sin abogado asignado tras una salida reciente.
      </Text>
      <TouchableOpacity onPress={() => router.push(`/(bufete-tabs)/procesos?filter=sin_asignar`)}>
        <Text style={styles.action}>Ver procesos</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FEF3C7",
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  text:   { flex: 1, color: "#92400E", fontSize: 13 },
  action: { color: "#D97706", fontWeight: "600", marginLeft: 8 },
});
```

- [ ] **Step 2: Integrate into bufete dashboard**

Find the bufete dashboard screen:

```bash
grep -rn "bufete.*dashboard\|firma.*tabs\|bufete-tabs" app/ | head -10
```

Import and render the banner, fetching the count from the API:

```typescript
const [pendingCount, setPendingCount] = useState(0);

useEffect(() => {
  ownershipService.getPendingReassignments(firmId).then(list => setPendingCount(list.length));
}, [firmId]);

// In JSX:
<PendingReassignmentBanner count={pendingCount} firmId={firmId} />
```

Add `getPendingReassignments(firmId)` to `ownershipService.ts` (Task 15) if not present.

- [ ] **Step 3: Commit**

```bash
git add components/bufete/PendingReassignmentBanner.tsx
git commit -m "feat(ui): PendingReassignmentBanner en dashboard del bufete para procesos sin abogado asignado"
```

---

## Summary

| Task | Scope | Files |
|------|-------|-------|
| 1–2 | DB migrations | `0062`, `0063` |
| 3–5 | Drizzle schemas | `proceso-ownership.schema.ts`, `proceso-sharing.schema.ts`, `index.ts` |
| 6–8 | Storage layer | `proceso-ownership-storage.ts`, `proceso-sharing-storage.ts`, `database-storage.ts` |
| 9–12 | API — core access + new routes | `procesos.ts`, `proceso-ownership.ts`, `routes/index.ts` |
| 13–14 | API — leave + join flows | `lawyer-firma-history.ts`, `firm-invitations.ts` |
| 15 | Frontend services | `ownershipService.ts` |
| 16–19 | Frontend components | `ProcessDecisionWizard`, `ProcessAccessPanel`, `case/[id].tsx` |
| 20 | Verification | — |
| 21 | API — pending-reassignments endpoint | `proceso-ownership.ts`, `proceso-ownership-storage.ts` |
| 22–23 | Frontend — leave modal + reassignment banner | `LeaveConfirmModal`, `PendingReassignmentBanner` |
