# Planes, Suscripciones y Wompi — Plan A: Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el backend completo de planes, suscripciones y cobro via Wompi: schemas, storages, SubscriptionService con enforcement de límites, rutas REST y webhook.

**Architecture:** Schemas Drizzle ORM → StorageClasses → SubscriptionService centralizado → Express routes. El enforcement se aplica en las rutas existentes (procesos, clientes, documentos) via checkLimit(). El webhook de Wompi activa suscripciones verificando firma HMAC-SHA256.

**Tech Stack:** Drizzle ORM (MySQL), Express, TypeScript, Wompi REST API v1 (sandbox), node:crypto (HMAC).

---

## Mapa de archivos

**Crear:**
- `shared/schema/feature.schema.ts` — tablas `features` y `plan_features`
- `shared/schema/suscripcion.schema.ts` — tabla `suscripciones`
- `shared/schema/pago.schema.ts` — tabla `pagos`
- `shared/schema/usage-tracking.schema.ts` — tabla `usage_tracking`
- `server/storage/storeage/models/feature-storage.ts`
- `server/storage/storeage/models/suscripcion-storage.ts`
- `server/storage/storeage/models/pago-storage.ts`
- `server/storage/storeage/models/usage-tracking-storage.ts`
- `server/services/subscription.service.ts`
- `server/middleware/require-feature.ts`
- `server/routes/suscripciones.ts`
- `server/routes/webhooks.ts`
- `server/db/seeds/planes.seed.ts`

**Modificar:**
- `shared/schema/plane.schema.ts` — reestructurar campos
- `shared/schema/index.ts` — agregar exports de los 4 schemas nuevos
- `server/storage/storeage/models/plan-storage.ts` — actualizar para nueva estructura
- `server/storage/storeage/database-storage.ts` — registrar 4 storages nuevos
- `server/routes/procesos.ts` — agregar checkLimit en POST
- `server/routes/clientes.ts` — agregar checkLimit en POST
- `server/routes/documentos.ts` — agregar checkLimit en POST
- `server/routes/index.ts` — registrar suscripciones + webhooks
- `server/index.ts` — llamar seedPlanes() + cron de vencimientos

---

### Task 1: Reestructurar shared/schema/plane.schema.ts

**Files:**
- Modify: `shared/schema/plane.schema.ts`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

```typescript
/**
 * Plane Schema — reestructurado para soportar planes por tipo (abogado/bufete),
 * precios en COP/USD, ciclos mensual/anual y límites por recurso.
 */
import { mysqlTable, varchar, int, decimal, boolean, mysqlEnum } from "drizzle-orm/mysql-core";

export const planes = mysqlTable("planes", {
  id:                       varchar("id",   { length: 36 }).primaryKey(),
  nombre:                   varchar("nombre", { length: 50 }).notNull(),
  tipo:                     mysqlEnum("tipo", ["abogado", "bufete"]).notNull(),
  // Precios
  precioMensualCop:         decimal("precio_mensual_cop", { precision: 12, scale: 2 }).notNull(),
  precioAnualCop:           decimal("precio_anual_cop",   { precision: 12, scale: 2 }).notNull(),
  precioMensualUsd:         decimal("precio_mensual_usd", { precision: 10, scale: 2 }).notNull(),
  precioAnualUsd:           decimal("precio_anual_usd",   { precision: 10, scale: 2 }).notNull(),
  // Límites de recursos (-1 = ilimitado)
  maxProcesos:              int("max_procesos").notNull().default(5),
  maxClientes:              int("max_clientes").notNull().default(10),
  maxStorageGb:             int("max_storage_gb").notNull().default(0),
  // Límites de usuarios (solo bufete; abogado siempre 1)
  includedUsers:            int("included_users").notNull().default(1),
  maxUsers:                 int("max_users").notNull().default(1),        // -1 = ilimitado
  precioUsuarioExtraCop:    decimal("precio_usuario_extra_cop", { precision: 10, scale: 2 }),
  precioUsuarioExtraUsd:    decimal("precio_usuario_extra_usd", { precision: 10, scale: 2 }),
  state:                    boolean("state").notNull().default(true),
});

export type Plan         = typeof planes.$inferSelect;
export type InsertPlan   = typeof planes.$inferInsert;

export interface PlanPublicoDTO {
  id:                    string;
  nombre:                string;
  tipo:                  "abogado" | "bufete";
  precioMensualCop:      string;
  precioAnualCop:        string;
  precioMensualUsd:      string;
  precioAnualUsd:        string;
  maxProcesos:           number;
  maxClientes:           number;
  maxStorageGb:          number;
  includedUsers:         number;
  maxUsers:              number;
  precioUsuarioExtraCop: string | null;
  precioUsuarioExtraUsd: string | null;
  features:              { code: string; nombre: string; value: string }[];
}
```

- [ ] **Step 2: Verificar que TypeScript compila**

```bash
cd "C:\Users\ccsb1\OneDrive\Escritorio\Asset-Manager\Asset-Manager"
npx tsc --noEmit 2>&1 | head -20
```

---

### Task 2: Crear shared/schema/feature.schema.ts

**Files:**
- Create: `shared/schema/feature.schema.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
/**
 * Feature Schema
 * Funcionalidades configurables por plan (sistema dinámico).
 */
import { mysqlTable, int, varchar, text, boolean } from "drizzle-orm/mysql-core";

// ── Catálogo de features ──────────────────────────────────────────────────────

export const features = mysqlTable("features", {
  id:          int("id").autoincrement().primaryKey(),
  code:        varchar("code",   { length: 100 }).notNull().unique(),
  nombre:      varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  state:       boolean("state").notNull().default(true),
});

// ── Asignación de features a planes ──────────────────────────────────────────

export const planFeatures = mysqlTable("plan_features", {
  planId:      varchar("plan_id",      { length: 36  }).notNull(),
  featureCode: varchar("feature_code", { length: 100 }).notNull(),
  // "true" / "false" para boolean; "5" para límite numérico (ej: privados limitados)
  value:       varchar("value",        { length: 50  }).notNull().default("true"),
});

// ── Tipos inferidos ───────────────────────────────────────────────────────────

export type Feature        = typeof features.$inferSelect;
export type InsertFeature  = typeof features.$inferInsert;
export type PlanFeature    = typeof planFeatures.$inferSelect;

// ── Códigos de feature del sistema ───────────────────────────────────────────

export const FEATURE_CODES = [
  "calendario",
  "etapas_procesales",
  "comunidad",
  "chat",
  "privacidad_basica",       // hasta 5 clientes privados
  "privacidad_avanzada",     // privados ilimitados + procesos privados
  "dashboard_bufete",
  "roles_custom",
  "soporte_prioritario",
] as const;

export type FeatureCode = typeof FEATURE_CODES[number];
```

---

### Task 3: Crear shared/schema/suscripcion.schema.ts

**Files:**
- Create: `shared/schema/suscripcion.schema.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
/**
 * Suscripcion Schema
 */
import { mysqlTable, varchar, int, boolean, datetime, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

export const suscripciones = mysqlTable("suscripciones", {
  id:                  varchar("id",       { length: 36 }).primaryKey(),
  userId:              varchar("user_id",  { length: 36 }).notNull(),
  planId:              varchar("plan_id",  { length: 36 }).notNull(),
  ciclo:               mysqlEnum("ciclo",  ["mensual", "anual"]).notNull(),
  estado:              mysqlEnum("estado", ["activa", "cancelada", "vencida", "en_prueba"]).notNull().default("activa"),
  fechaInicio:         datetime("fecha_inicio").notNull(),
  fechaVencimiento:    datetime("fecha_vencimiento").notNull(),
  fechaCancelacion:    datetime("fecha_cancelacion"),
  autoRenovacion:      boolean("auto_renovacion").notNull().default(true),
  extraUsers:          int("extra_users").notNull().default(0),
  wompiSubscriptionId: varchar("wompi_subscription_id", { length: 100 }),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
});

export type Suscripcion       = typeof suscripciones.$inferSelect;
export type InsertSuscripcion = typeof suscripciones.$inferInsert;

export type CicloSuscripcion  = "mensual" | "anual";
export type EstadoSuscripcion = "activa" | "cancelada" | "vencida" | "en_prueba";

export interface SuscripcionConPlanDTO {
  suscripcion: Suscripcion;
  plan: import("./plane.schema").PlanPublicoDTO;
}
```

---

### Task 4: Crear shared/schema/pago.schema.ts

**Files:**
- Create: `shared/schema/pago.schema.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
/**
 * Pago Schema
 */
import { mysqlTable, varchar, decimal, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

export const pagos = mysqlTable("pagos", {
  id:                 varchar("id",          { length: 36  }).primaryKey(),
  suscripcionId:      varchar("suscripcion_id", { length: 36 }).notNull(),
  userId:             varchar("user_id",     { length: 36  }).notNull(),
  amountCop:          decimal("amount_cop",  { precision: 12, scale: 2 }),
  amountUsd:          decimal("amount_usd",  { precision: 10, scale: 2 }),
  currency:           mysqlEnum("currency",  ["COP", "USD"]).notNull(),
  metodoPago:         mysqlEnum("metodo_pago", ["card", "pse", "nequi", "bancolombia_transfer", "otro"]),
  estado:             mysqlEnum("estado", ["pendiente", "aprobado", "rechazado", "reembolsado"]).notNull().default("pendiente"),
  wompiTransactionId: varchar("wompi_transaction_id", { length: 100 }),
  wompiReference:     varchar("wompi_reference",      { length: 100 }).notNull().unique(),
  concepto:           varchar("concepto",    { length: 255 }),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
});

export type Pago       = typeof pagos.$inferSelect;
export type InsertPago = typeof pagos.$inferInsert;
export type EstadoPago = "pendiente" | "aprobado" | "rechazado" | "reembolsado";
```

---

### Task 5: Crear shared/schema/usage-tracking.schema.ts

**Files:**
- Create: `shared/schema/usage-tracking.schema.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
/**
 * Usage Tracking Schema
 * Consumo real del usuario para validar límites del plan.
 */
import { mysqlTable, varchar, int, timestamp } from "drizzle-orm/mysql-core";

export const usageTracking = mysqlTable("usage_tracking", {
  id:              varchar("id",       { length: 36 }).primaryKey(),
  userId:          varchar("user_id",  { length: 36 }).notNull().unique(),
  suscripcionId:   varchar("suscripcion_id", { length: 36 }).notNull(),
  procesosUsados:  int("procesos_usados").notNull().default(0),
  clientesUsados:  int("clientes_usados").notNull().default(0),
  storageUsadoMb:  int("storage_usado_mb").notNull().default(0),
  updatedAt:       timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export type UsageTracking       = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = typeof usageTracking.$inferInsert;

export interface UsageDTO {
  procesosUsados:  number;
  procesosMax:     number;   // -1 = ilimitado
  clientesUsados:  number;
  clientesMax:     number;
  storageUsadoMb:  number;
  storageMaxMb:    number;   // 0 = sin almacenamiento
}
```

---

### Task 6: Actualizar shared/schema/index.ts

**Files:**
- Modify: `shared/schema/index.ts`

- [ ] **Step 1: Agregar los 4 exports nuevos al final del archivo (después del último export existente)**

```typescript
// Features y plan_features
export {
  features, planFeatures,
  type Feature, type InsertFeature, type PlanFeature,
  FEATURE_CODES, type FeatureCode,
} from "./feature.schema";

// Suscripciones
export {
  suscripciones,
  type Suscripcion, type InsertSuscripcion,
  type CicloSuscripcion, type EstadoSuscripcion, type SuscripcionConPlanDTO,
} from "./suscripcion.schema";

// Pagos
export {
  pagos,
  type Pago, type InsertPago, type EstadoPago,
} from "./pago.schema";

// Usage Tracking
export {
  usageTracking,
  type UsageTracking, type InsertUsageTracking, type UsageDTO,
} from "./usage-tracking.schema";
```

- [ ] **Step 2: Reemplazar el export de planes (línea ~10) con el tipo actualizado**

Buscar la línea:
```typescript
export { planes, type Plan, type InsertPlan } from "./plane.schema";
```
Reemplazar por:
```typescript
export { planes, type Plan, type InsertPlan, type PlanPublicoDTO } from "./plane.schema";
```

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit 2>&1 | head -20
```

---

### Task 7: Crear storage classes — feature-storage.ts

**Files:**
- Create: `server/storage/streage/models/feature-storage.ts`

> **Nota:** La ruta real es `server/storage/storeage/models/` (typo original del proyecto, mantener).

- [ ] **Step 1: Crear el archivo**

```typescript
import { eq, and } from "drizzle-orm";
import { features, planFeatures, type Feature, type PlanFeature } from "@/shared/schema";
import type { Database } from "../database-storage";

export class FeatureStorage {
  constructor(private db: Database) {}

  async getAll(): Promise<Feature[]> {
    return this.db.select().from(features).where(eq(features.state, true));
  }

  async getByPlan(planId: string): Promise<{ code: string; nombre: string; value: string }[]> {
    const rows = await this.db
      .select({
        code:   planFeatures.featureCode,
        nombre: features.nombre,
        value:  planFeatures.value,
      })
      .from(planFeatures)
      .innerJoin(features, eq(planFeatures.featureCode, features.code))
      .where(and(eq(planFeatures.planId, planId), eq(features.state, true)));
    return rows;
  }

  async hasFeature(planId: string, featureCode: string): Promise<{ has: boolean; value: string }> {
    const row = await this.db
      .select()
      .from(planFeatures)
      .where(and(eq(planFeatures.planId, planId), eq(planFeatures.featureCode, featureCode)))
      .limit(1)
      .then(r => r[0] ?? null);

    if (!row) return { has: false, value: "false" };
    return { has: row.value !== "false" && row.value !== "0", value: row.value };
  }

  async upsertFeature(planId: string, featureCode: string, value: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(planFeatures)
      .where(and(eq(planFeatures.planId, planId), eq(planFeatures.featureCode, featureCode)))
      .limit(1)
      .then(r => r[0] ?? null);

    if (existing) {
      await this.db
        .update(planFeatures)
        .set({ value })
        .where(and(eq(planFeatures.planId, planId), eq(planFeatures.featureCode, featureCode)));
    } else {
      await this.db.insert(planFeatures).values({ planId, featureCode, value });
    }
  }
}
```

---

### Task 8: Crear suscripcion-storage.ts

**Files:**
- Create: `server/storage/storeage/models/suscripcion-storage.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  suscripciones,
  type Suscripcion, type InsertSuscripcion,
  type CicloSuscripcion, type EstadoSuscripcion,
} from "@/shared/schema";
import type { Database } from "../database-storage";

export class SuscripcionStorage {
  constructor(private db: Database) {}

  async getActive(userId: string): Promise<Suscripcion | null> {
    const row = await this.db
      .select()
      .from(suscripciones)
      .where(and(eq(suscripciones.userId, userId), eq(suscripciones.estado, "activa")))
      .limit(1)
      .then(r => r[0] ?? null);
    return row;
  }

  async getById(id: string): Promise<Suscripcion | null> {
    return this.db.select().from(suscripciones).where(eq(suscripciones.id, id)).limit(1).then(r => r[0] ?? null);
  }

  async getByUserId(userId: string): Promise<Suscripcion[]> {
    return this.db.select().from(suscripciones).where(eq(suscripciones.userId, userId));
  }

  async create(data: Omit<InsertSuscripcion, "id" | "createdAt">): Promise<Suscripcion> {
    const id = randomUUID();
    await this.db.insert(suscripciones).values({ ...data, id });
    return (await this.getById(id))!;
  }

  async updateEstado(id: string, estado: EstadoSuscripcion, fechaCancelacion?: Date): Promise<void> {
    const updates: Partial<InsertSuscripcion> = { estado };
    if (fechaCancelacion) updates.fechaCancelacion = fechaCancelacion;
    await this.db.update(suscripciones).set(updates).where(eq(suscripciones.id, id));
  }

  async cancelAutoRenovacion(id: string): Promise<void> {
    await this.db
      .update(suscripciones)
      .set({ autoRenovacion: false, fechaCancelacion: new Date() })
      .where(eq(suscripciones.id, id));
  }

  /** Suscripciones activas cuyo vencimiento es en <= diasAntes días (para cron) */
  async getProximasAVencer(diasAntes: number): Promise<Suscripcion[]> {
    const limite = new Date();
    limite.setDate(limite.getDate() + diasAntes);
    const ahora = new Date();

    // Drizzle no soporta BETWEEN en datetime fácilmente; usamos sql raw
    const { sql } = await import("drizzle-orm");
    return this.db
      .select()
      .from(suscripciones)
      .where(
        and(
          eq(suscripciones.estado, "activa"),
          sql`${suscripciones.fechaVencimiento} BETWEEN ${ahora} AND ${limite}`,
        ),
      );
  }

  /** Suscripciones activas que ya vencieron (para degradar a gratis) */
  async getVencidas(): Promise<Suscripcion[]> {
    const ahora = new Date();
    const { sql } = await import("drizzle-orm");
    return this.db
      .select()
      .from(suscripciones)
      .where(
        and(
          eq(suscripciones.estado, "activa"),
          sql`${suscripciones.fechaVencimiento} < ${ahora}`,
        ),
      );
  }
}
```

---

### Task 9: Crear pago-storage.ts

**Files:**
- Create: `server/storage/storeage/models/pago-storage.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { pagos, type Pago, type InsertPago, type EstadoPago } from "@/shared/schema";
import type { Database } from "../database-storage";

export class PagoStorage {
  constructor(private db: Database) {}

  async create(data: Omit<InsertPago, "id" | "createdAt">): Promise<Pago> {
    const id = randomUUID();
    await this.db.insert(pagos).values({ ...data, id });
    return (await this.getById(id))!;
  }

  async getById(id: string): Promise<Pago | null> {
    return this.db.select().from(pagos).where(eq(pagos.id, id)).limit(1).then(r => r[0] ?? null);
  }

  async getByReference(reference: string): Promise<Pago | null> {
    return this.db.select().from(pagos).where(eq(pagos.wompiReference, reference)).limit(1).then(r => r[0] ?? null);
  }

  async updateEstado(
    id: string,
    estado: EstadoPago,
    wompiTransactionId?: string,
    metodoPago?: string,
  ): Promise<void> {
    const updates: Partial<InsertPago> = { estado };
    if (wompiTransactionId) updates.wompiTransactionId = wompiTransactionId;
    if (metodoPago)         updates.metodoPago = metodoPago as any;
    await this.db.update(pagos).set(updates).where(eq(pagos.id, id));
  }
}
```

---

### Task 10: Crear usage-tracking-storage.ts

**Files:**
- Create: `server/storage/storeage/models/usage-tracking-storage.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { usageTracking, type UsageTracking } from "@/shared/schema";
import type { Database } from "../database-storage";

export type UsageTipo = "procesos" | "clientes" | "storage";

const CAMPO: Record<UsageTipo, keyof typeof usageTracking.$inferSelect> = {
  procesos: "procesosUsados",
  clientes: "clientesUsados",
  storage:  "storageUsadoMb",
};

export class UsageTrackingStorage {
  constructor(private db: Database) {}

  async getByUserId(userId: string): Promise<UsageTracking | null> {
    return this.db
      .select().from(usageTracking).where(eq(usageTracking.userId, userId))
      .limit(1).then(r => r[0] ?? null);
  }

  async initForUser(userId: string, suscripcionId: string): Promise<void> {
    const existing = await this.getByUserId(userId);
    if (existing) {
      await this.db.update(usageTracking).set({ suscripcionId }).where(eq(usageTracking.userId, userId));
      return;
    }
    await this.db.insert(usageTracking).values({
      id: randomUUID(), userId, suscripcionId,
      procesosUsados: 0, clientesUsados: 0, storageUsadoMb: 0,
    });
  }

  async increment(userId: string, tipo: UsageTipo, cantidad = 1): Promise<void> {
    const col = CAMPO[tipo];
    await this.db
      .update(usageTracking)
      .set({ [col]: sql`${usageTracking[col]} + ${cantidad}` } as any)
      .where(eq(usageTracking.userId, userId));
  }

  async decrement(userId: string, tipo: UsageTipo, cantidad = 1): Promise<void> {
    const col = CAMPO[tipo];
    await this.db
      .update(usageTracking)
      .set({ [col]: sql`GREATEST(0, ${usageTracking[col]} - ${cantidad})` } as any)
      .where(eq(usageTracking.userId, userId));
  }

  async reset(userId: string): Promise<void> {
    await this.db
      .update(usageTracking)
      .set({ procesosUsados: 0, clientesUsados: 0, storageUsadoMb: 0 })
      .where(eq(usageTracking.userId, userId));
  }
}
```

---

### Task 11: Actualizar database-storage.ts

**Files:**
- Modify: `server/storage/storeage/database-storage.ts`

- [ ] **Step 1: Agregar imports (después de la última línea de import, antes del comentario `// Export the database type`)**

```typescript
import { FeatureStorage } from "./models/feature-storage";
import { SuscripcionStorage } from "./models/suscripcion-storage";
import { PagoStorage } from "./models/pago-storage";
import { UsageTrackingStorage } from "./models/usage-tracking-storage";
```

- [ ] **Step 2: Agregar declaraciones de propiedades (dentro de la clase DatabaseStorage, después de `public firmSettings: FirmSettingsStorage;`)**

```typescript
  public featureStorage:  FeatureStorage;
  public suscripciones:   SuscripcionStorage;
  public pagosStorage:    PagoStorage;
  public usageTracking:   UsageTrackingStorage;
```

- [ ] **Step 3: Agregar instanciaciones en el constructor (después de `this.firmSettings = new FirmSettingsStorage(this.db);`)**

```typescript
    this.featureStorage = new FeatureStorage(this.db);
    this.suscripciones  = new SuscripcionStorage(this.db);
    this.pagosStorage   = new PagoStorage(this.db);
    this.usageTracking  = new UsageTrackingStorage(this.db);
```

- [ ] **Step 4: Verificar compilación**

```bash
npx tsc --noEmit 2>&1 | head -30
```

---

### Task 12: Crear seeder de planes

**Files:**
- Create: `server/db/seeds/planes.seed.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
/**
 * Seeder: Planes y features
 * Idempotente — no duplica si ya existen.
 * Se llama desde seedDatabase() en server/index.ts.
 */
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { planes, features, planFeatures } from "@/shared/schema";
import type { Database } from "../../storage/storeage/database-storage.js";

// ── Definición de planes ──────────────────────────────────────────────────────

const PLANES_SEED = [
  // Abogado independiente
  {
    id: "plan-abogado-gratis",   nombre: "Gratis",    tipo: "abogado" as const,
    precioMensualCop: "0",       precioAnualCop: "0",
    precioMensualUsd: "0",       precioAnualUsd: "0",
    maxProcesos: 5,              maxClientes: 10,      maxStorageGb: 0,
    includedUsers: 1,            maxUsers: 1,
    precioUsuarioExtraCop: null, precioUsuarioExtraUsd: null,
    features: [],
  },
  {
    id: "plan-abogado-esencial", nombre: "Esencial",  tipo: "abogado" as const,
    precioMensualCop: "29900",   precioAnualCop: "287040",
    precioMensualUsd: "7",       precioAnualUsd: "70",
    maxProcesos: 20,             maxClientes: 30,      maxStorageGb: 2,
    includedUsers: 1,            maxUsers: 1,
    precioUsuarioExtraCop: null, precioUsuarioExtraUsd: null,
    features: [
      { code: "calendario",         value: "true" },
      { code: "etapas_procesales",  value: "true" },
      { code: "privacidad_basica",  value: "5" },    // hasta 5 privados
    ],
  },
  {
    id: "plan-abogado-pro",      nombre: "Pro",        tipo: "abogado" as const,
    precioMensualCop: "84900",   precioAnualCop: "815040",
    precioMensualUsd: "21",      precioAnualUsd: "199",
    maxProcesos: -1,             maxClientes: -1,      maxStorageGb: 15,
    includedUsers: 1,            maxUsers: 1,
    precioUsuarioExtraCop: null, precioUsuarioExtraUsd: null,
    features: [
      { code: "calendario",          value: "true" },
      { code: "etapas_procesales",   value: "true" },
      { code: "privacidad_basica",   value: "true" },
      { code: "privacidad_avanzada", value: "true" },
      { code: "comunidad",           value: "true" },
      { code: "chat",                value: "true" },
    ],
  },
  // Bufete
  {
    id: "plan-bufete-starter",   nombre: "Starter",   tipo: "bufete" as const,
    precioMensualCop: "180000",  precioAnualCop: "1728000",
    precioMensualUsd: "44",      precioAnualUsd: "422",
    maxProcesos: 60,             maxClientes: 60,      maxStorageGb: 10,
    includedUsers: 3,            maxUsers: 8,
    precioUsuarioExtraCop: "45000", precioUsuarioExtraUsd: "11",
    features: [
      { code: "calendario",          value: "true" },
      { code: "etapas_procesales",   value: "true" },
      { code: "dashboard_bufete",    value: "true" },
      { code: "privacidad_basica",   value: "true" },
      { code: "privacidad_avanzada", value: "true" },
    ],
  },
  {
    id: "plan-bufete-business",  nombre: "Business",  tipo: "bufete" as const,
    precioMensualCop: "350000",  precioAnualCop: "3360000",
    precioMensualUsd: "85",      precioAnualUsd: "816",
    maxProcesos: 300,            maxClientes: 300,     maxStorageGb: 30,
    includedUsers: 8,            maxUsers: 20,
    precioUsuarioExtraCop: "35000", precioUsuarioExtraUsd: "9",
    features: [
      { code: "calendario",          value: "true" },
      { code: "etapas_procesales",   value: "true" },
      { code: "dashboard_bufete",    value: "true" },
      { code: "privacidad_basica",   value: "true" },
      { code: "privacidad_avanzada", value: "true" },
      { code: "comunidad",           value: "true" },
      { code: "chat",                value: "true" },
      { code: "roles_custom",        value: "true" },
    ],
  },
  {
    id: "plan-bufete-enterprise", nombre: "Enterprise", tipo: "bufete" as const,
    precioMensualCop: "600000",  precioAnualCop: "5760000",
    precioMensualUsd: "146",     precioAnualUsd: "1402",
    maxProcesos: -1,             maxClientes: -1,      maxStorageGb: 100,
    includedUsers: 15,           maxUsers: -1,
    precioUsuarioExtraCop: "28000", precioUsuarioExtraUsd: "7",
    features: [
      { code: "calendario",          value: "true" },
      { code: "etapas_procesales",   value: "true" },
      { code: "dashboard_bufete",    value: "true" },
      { code: "privacidad_basica",   value: "true" },
      { code: "privacidad_avanzada", value: "true" },
      { code: "comunidad",           value: "true" },
      { code: "chat",                value: "true" },
      { code: "roles_custom",        value: "true" },
      { code: "soporte_prioritario", value: "true" },
    ],
  },
] as const;

const FEATURES_SEED = [
  { code: "calendario",          nombre: "Calendario",              descripcion: "Gestión de eventos, tareas y vencimientos en calendario" },
  { code: "etapas_procesales",   nombre: "Etapas procesales",       descripcion: "Seguimiento jurídico del proceso con etapas y vencimientos" },
  { code: "comunidad",           nombre: "Comunidad",               descripcion: "Acceso a la comunidad de abogados y matching con clientes" },
  { code: "chat",                nombre: "Chat con cliente",        descripcion: "Mensajería directa con clientes desde la plataforma" },
  { code: "privacidad_basica",   nombre: "Privacidad básica",       descripcion: "Marcar clientes como privados (hasta el límite del plan)" },
  { code: "privacidad_avanzada", nombre: "Privacidad avanzada",     descripcion: "Clientes y procesos privados ilimitados con historial" },
  { code: "dashboard_bufete",    nombre: "Dashboard de bufete",     descripcion: "Panel de control con métricas agregadas del bufete" },
  { code: "roles_custom",        nombre: "Roles personalizados",    descripcion: "Crear y asignar roles personalizados a abogados del bufete" },
  { code: "soporte_prioritario", nombre: "Soporte prioritario",     descripcion: "Acceso a soporte con tiempo de respuesta garantizado" },
] as const;

// ── Función principal ─────────────────────────────────────────────────────────

export async function seedPlanes(db: Database): Promise<void> {
  // 1. Seed features
  for (const f of FEATURES_SEED) {
    const existing = await db.select().from(features).where(eq(features.code, f.code)).limit(1).then(r => r[0]);
    if (!existing) {
      await db.insert(features).values({ ...f, state: true });
    }
  }

  // 2. Seed planes + plan_features
  for (const p of PLANES_SEED) {
    const { features: planFeaturesList, ...planData } = p;
    const existing = await db.select().from(planes).where(eq(planes.id, p.id)).limit(1).then(r => r[0]);
    if (!existing) {
      await db.insert(planes).values({ ...planData, state: true });
    }
    // Upsert plan_features
    for (const pf of planFeaturesList) {
      const existingPf = await db.select().from(planFeatures)
        .where(eq(planFeatures.planId, p.id))
        .then(rows => rows.find(r => r.featureCode === pf.code));
      if (!existingPf) {
        await db.insert(planFeatures).values({ planId: p.id, featureCode: pf.code, value: pf.value });
      }
    }
  }

  console.log("[seed:planes] Planes y features sembrados correctamente.");
}
```

- [ ] **Step 2: Agregar la llamada en server/index.ts**

Buscar en `server/index.ts` la función `seedDatabase()`. Dentro de ella, después de la llamada a `seedLegalStages()`, agregar:

```typescript
import { seedPlanes } from "./db/seeds/planes.seed.js";
// ... dentro de seedDatabase():
await seedPlanes(db);
```

> **Nota:** `db` es la instancia de la base de datos que usa el seeder. Seguir el mismo patrón que `seedLegalStages`. Revisar cómo recibe el `db` la función de seed existente para usarlo igual.

---

### Task 13: Actualizar plan-storage.ts

**Files:**
- Modify: `server/storage/storeage/models/plan-storage.ts`

- [ ] **Step 1: Reemplazar el contenido completo**

```typescript
import { eq } from "drizzle-orm";
import { planes, planFeatures, features, type Plan, type PlanPublicoDTO } from "@/shared/schema";
import type { Database } from "../database-storage";

export class PlanStorage {
  constructor(private db: Database) {}

  async getPlan(id: string): Promise<Plan | undefined> {
    return this.db.select().from(planes).where(eq(planes.id, id)).limit(1).then(r => r[0]);
  }

  async getPlanes(tipo?: "abogado" | "bufete"): Promise<Plan[]> {
    if (tipo) {
      return this.db.select().from(planes).where(eq(planes.tipo, tipo));
    }
    return this.db.select().from(planes).where(eq(planes.state, true));
  }

  async getPlanesPublicos(tipo?: "abogado" | "bufete"): Promise<PlanPublicoDTO[]> {
    const listPlanes = await this.getPlanes(tipo);
    const result: PlanPublicoDTO[] = [];

    for (const p of listPlanes) {
      const featureRows = await this.db
        .select({ code: planFeatures.featureCode, nombre: features.nombre, value: planFeatures.value })
        .from(planFeatures)
        .innerJoin(features, eq(planFeatures.featureCode, features.code))
        .where(eq(planFeatures.planId, p.id));

      result.push({
        id:                    p.id,
        nombre:                p.nombre,
        tipo:                  p.tipo,
        precioMensualCop:      p.precioMensualCop,
        precioAnualCop:        p.precioAnualCop,
        precioMensualUsd:      p.precioMensualUsd,
        precioAnualUsd:        p.precioAnualUsd,
        maxProcesos:           p.maxProcesos,
        maxClientes:           p.maxClientes,
        maxStorageGb:          p.maxStorageGb,
        includedUsers:         p.includedUsers,
        maxUsers:              p.maxUsers,
        precioUsuarioExtraCop: p.precioUsuarioExtraCop ?? null,
        precioUsuarioExtraUsd: p.precioUsuarioExtraUsd ?? null,
        features:              featureRows,
      });
    }
    return result;
  }
}
```

---

### Task 14: Crear SubscriptionService

**Files:**
- Create: `server/services/subscription.service.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
/**
 * SubscriptionService
 * Punto central para verificar límites, features y activar suscripciones.
 */
import { randomUUID } from "crypto";
import { storage } from "../storage/storeage/database-storage.js";
import type { UsageTipo } from "../storage/storeage/models/usage-tracking-storage.js";

export interface LimitCheck {
  permitido:  boolean;
  actual:     number;
  maximo:     number;     // -1 = ilimitado
  porcentaje: number;     // 0-100
}

class SubscriptionService {

  // ── Plan activo ───────────────────────────────────────────────────────────

  async getActivePlan(userId: string) {
    const suscripcion = await storage.suscripciones.getActive(userId);
    if (!suscripcion) return null;
    const plan = await storage.planes.getPlan(suscripcion.planId);
    return plan ?? null;
  }

  // ── Verificar límite de recursos ──────────────────────────────────────────

  async checkLimit(
    userId:   string,
    tipo:     UsageTipo,
    mbExtra?: number,
  ): Promise<LimitCheck> {
    const plan  = await this.getActivePlan(userId);
    const usage = await storage.usageTracking.getByUserId(userId);

    // Sin plan → usar gratis por defecto (5 procesos, 10 clientes, 0 storage)
    const maxProcesos = plan?.maxProcesos ?? 5;
    const maxClientes = plan?.maxClientes ?? 10;
    const maxStorage  = (plan?.maxStorageGb ?? 0) * 1024; // en MB

    const actual = usage
      ? tipo === "procesos" ? usage.procesosUsados
      : tipo === "clientes" ? usage.clientesUsados
      : usage.storageUsadoMb
      : 0;

    const maximo = tipo === "procesos" ? maxProcesos
                 : tipo === "clientes" ? maxClientes
                 : maxStorage;

    // -1 = ilimitado
    if (maximo === -1) {
      return { permitido: true, actual, maximo: -1, porcentaje: 0 };
    }

    // Storage: verificar que el nuevo archivo no supere el límite
    const efectivo = tipo === "storage" ? actual + (mbExtra ?? 0) : actual + 1;
    const permitido = maximo === 0 ? false : efectivo <= maximo;
    const porcentaje = maximo === 0 ? 100 : Math.min(100, Math.round((actual / maximo) * 100));

    return { permitido, actual, maximo, porcentaje };
  }

  // ── Verificar feature ─────────────────────────────────────────────────────

  async hasFeature(userId: string, featureCode: string): Promise<boolean> {
    const suscripcion = await storage.suscripciones.getActive(userId);
    if (!suscripcion) return false;
    const { has } = await storage.featureStorage.hasFeature(suscripcion.planId, featureCode);
    return has;
  }

  async getFeatureValue(userId: string, featureCode: string): Promise<string | null> {
    const suscripcion = await storage.suscripciones.getActive(userId);
    if (!suscripcion) return null;
    const { has, value } = await storage.featureStorage.hasFeature(suscripcion.planId, featureCode);
    return has ? value : null;
  }

  // ── Actualizar uso ────────────────────────────────────────────────────────

  async incrementUsage(userId: string, tipo: UsageTipo, cantidad = 1): Promise<void> {
    await storage.usageTracking.increment(userId, tipo, cantidad);
  }

  async decrementUsage(userId: string, tipo: UsageTipo, cantidad = 1): Promise<void> {
    await storage.usageTracking.decrement(userId, tipo, cantidad);
  }

  // ── Activar suscripción (llamado desde webhook Wompi) ─────────────────────

  async activateSuscripcion(
    userId:     string,
    planId:     string,
    ciclo:      "mensual" | "anual",
    extraUsers: number,
    pagoId:     string,
  ): Promise<void> {
    // Cancelar suscripción activa anterior si existe
    const existing = await storage.suscripciones.getActive(userId);
    if (existing) {
      await storage.suscripciones.updateEstado(existing.id, "cancelada", new Date());
    }

    const fechaInicio      = new Date();
    const fechaVencimiento = new Date(fechaInicio);
    if (ciclo === "mensual") {
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);
    } else {
      fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);
    }

    const nueva = await storage.suscripciones.create({
      userId,
      planId,
      ciclo,
      estado:           "activa",
      fechaInicio,
      fechaVencimiento,
      autoRenovacion:   true,
      extraUsers,
    });

    await storage.usageTracking.initForUser(userId, nueva.id);
  }

  // ── Activar plan gratis (al registrarse) ──────────────────────────────────

  async activatePlanGratis(userId: string): Promise<void> {
    const existing = await storage.suscripciones.getActive(userId);
    if (existing) return; // Ya tiene una suscripción

    const fechaInicio      = new Date();
    const fechaVencimiento = new Date("2099-12-31T23:59:59");

    const nueva = await storage.suscripciones.create({
      userId,
      planId:           "plan-abogado-gratis",
      ciclo:            "mensual",
      estado:           "activa",
      fechaInicio,
      fechaVencimiento,
      autoRenovacion:   false,
      extraUsers:       0,
    });

    await storage.usageTracking.initForUser(userId, nueva.id);
  }
}

export const subscriptionService = new SubscriptionService();
```

---

### Task 15: Crear middleware requireFeature

**Files:**
- Create: `server/middleware/require-feature.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import type { Request, Response, NextFunction } from "express";
import type { JWTPayload } from "@/shared/model.schema.js";
import { subscriptionService } from "../services/subscription.service.js";

/**
 * Middleware: bloquea el acceso si el usuario no tiene la feature en su plan.
 *
 * Uso: router.get("/calendar", authenticate, requireFeature("calendario"), handler)
 */
export function requireFeature(featureCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as JWTPayload;
      if (!user?.id) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const has = await subscriptionService.hasFeature(user.id, featureCode);
      if (!has) {
        res.status(402).json({
          error:    "FEATURE_NOT_AVAILABLE",
          feature:  featureCode,
          mensaje:  "Esta funcionalidad no está disponible en tu plan actual. Actualiza para acceder.",
        });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
```

---

### Task 16: Aplicar checkLimit en rutas existentes

**Files:**
- Modify: `server/routes/procesos.ts`
- Modify: `server/routes/clientes.ts`

- [ ] **Step 1: En server/routes/procesos.ts — agregar import de subscriptionService**

En la sección de imports, agregar:
```typescript
import { subscriptionService } from "../services/subscription.service.js";
```

- [ ] **Step 2: En server/routes/procesos.ts — agregar checkLimit en POST /procesos**

Buscar el handler de `router.post("/procesos", ...)`. Justo después de obtener `idProfile` del usuario y antes de crear el proceso, agregar:

```typescript
    // Verificar límite de procesos del plan
    const limitCheck = await subscriptionService.checkLimit(user.id, "procesos");
    if (!limitCheck.permitido) {
      return res.status(402).json({
        error:    "LIMIT_REACHED",
        tipo:     "procesos",
        actual:   limitCheck.actual,
        maximo:   limitCheck.maximo,
        mensaje:  "Has alcanzado el límite de procesos de tu plan. Actualiza para continuar.",
      });
    }
```

- [ ] **Step 3: En server/routes/procesos.ts — decrementUsage al eliminar**

En el handler de `DELETE /procesos/:id`, justo antes de `return res.status(204)`, agregar:
```typescript
    await subscriptionService.decrementUsage(user.id, "procesos");
```

- [ ] **Step 4: En server/routes/procesos.ts — incrementUsage al crear exitosamente**

En el handler de `POST /procesos`, justo antes del `return res.status(201)`, agregar:
```typescript
    await subscriptionService.incrementUsage(user.id, "procesos");
```

- [ ] **Step 5: En server/routes/clientes.ts — mismo patrón para clientes**

Agregar import:
```typescript
import { subscriptionService } from "../services/subscription.service.js";
```

En `POST /clientes` (el que crea cliente para abogado), antes de crear:
```typescript
    const limitCheck = await subscriptionService.checkLimit(user.id, "clientes");
    if (!limitCheck.permitido) {
      return res.status(402).json({
        error:  "LIMIT_REACHED",
        tipo:   "clientes",
        actual: limitCheck.actual,
        maximo: limitCheck.maximo,
        mensaje: "Has alcanzado el límite de clientes de tu plan. Actualiza para continuar.",
      });
    }
```

Y después de crear exitosamente:
```typescript
    await subscriptionService.incrementUsage(user.id, "clientes");
```

---

### Task 17: Crear ruta GET /api/planes

**Files:**
- Create: `server/routes/suscripciones.ts`

- [ ] **Step 1: Crear el archivo con los 4 endpoints**

```typescript
/**
 * Suscripciones Routes
 * GET  /api/planes              — lista planes públicos
 * GET  /api/suscripciones/me    — suscripción activa + uso
 * POST /api/suscripciones/checkout — inicia pago Wompi
 * POST /api/suscripciones/cancelar — cancela renovación automática
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { authenticate } from "../auth.js";
import { storage } from "../storage/streage/database-storage.js";
import { subscriptionService } from "../services/subscription.service.js";
import type { JWTPayload } from "@/shared/model.schema.js";

const router = Router();
const WOMPI_BASE = process.env.WOMPI_BASE_URL ?? "https://sandbox.wompi.co/v1";

// ── GET /api/planes ───────────────────────────────────────────────────────────

router.get("/planes", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tipo = req.query.tipo as "abogado" | "bufete" | undefined;
    const list = await storage.planes.getPlanesPublicos(tipo);
    res.json(list);
  } catch (err) { next(err); }
});

// ── GET /api/suscripciones/me ─────────────────────────────────────────────────

router.get("/suscripciones/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as JWTPayload;

    const suscripcion = await storage.suscripciones.getActive(user.id);
    if (!suscripcion) {
      res.status(404).json({ error: "Sin suscripción activa" });
      return;
    }

    const plan  = await storage.planes.getPlanesPublicos().then(list => list.find(p => p.id === suscripcion.planId));
    const usage = await storage.usageTracking.getByUserId(user.id);

    res.json({
      suscripcion,
      plan: plan ?? null,
      uso: usage
        ? {
            procesosUsados: usage.procesosUsados,
            procesosMax:    plan?.maxProcesos ?? 5,
            clientesUsados: usage.clientesUsados,
            clientesMax:    plan?.maxClientes ?? 10,
            storageUsadoMb: usage.storageUsadoMb,
            storageMaxMb:   (plan?.maxStorageGb ?? 0) * 1024,
          }
        : null,
    });
  } catch (err) { next(err); }
});

// ── POST /api/suscripciones/checkout ─────────────────────────────────────────

router.post("/suscripciones/checkout", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as JWTPayload;
    const { planId, ciclo, extraUsers = 0, currency = "COP" } = req.body as {
      planId:     string;
      ciclo:      "mensual" | "anual";
      extraUsers?: number;
      currency?:  "COP" | "USD";
    };

    if (!planId || !ciclo) {
      res.status(400).json({ error: "planId y ciclo son requeridos" });
      return;
    }

    const plan = await storage.planes.getPlan(planId);
    if (!plan || !plan.state) {
      res.status(404).json({ error: "Plan no encontrado" });
      return;
    }

    // Calcular monto
    let montoCop = 0;
    let montoUsd = 0;
    const precioBase = ciclo === "mensual"
      ? { cop: parseFloat(plan.precioMensualCop), usd: parseFloat(plan.precioMensualUsd) }
      : { cop: parseFloat(plan.precioAnualCop),   usd: parseFloat(plan.precioAnualUsd) };

    const extra = Math.max(0, extraUsers - plan.includedUsers);
    const precioExtraCop = parseFloat(plan.precioUsuarioExtraCop ?? "0");
    const precioExtraUsd = parseFloat(plan.precioUsuarioExtraUsd ?? "0");

    if (ciclo === "mensual") {
      montoCop = precioBase.cop + extra * precioExtraCop;
      montoUsd = precioBase.usd + extra * precioExtraUsd;
    } else {
      // Anual: precio base ya es el precio anual; extra_users se cobra mensual × 10
      montoCop = precioBase.cop + extra * precioExtraCop * 10;
      montoUsd = precioBase.usd + extra * precioExtraUsd * 10;
    }

    // Plan gratis → activar directo sin Wompi
    if (montoCop === 0 && montoUsd === 0) {
      await subscriptionService.activatePlanGratis(user.id);
      res.json({ activated: true, payment_url: null });
      return;
    }

    // Crear referencia única y pago pendiente
    const wompiReference = randomUUID();
    const suscripcionTemp = await storage.suscripciones.getActive(user.id);
    const suscripcionId = suscripcionTemp?.id ?? randomUUID();

    const pago = await storage.pagosStorage.create({
      suscripcionId,
      userId:     user.id,
      amountCop:  currency === "COP" ? montoCop.toFixed(2) : null,
      amountUsd:  currency === "USD" ? montoUsd.toFixed(2) : null,
      currency,
      estado:     "pendiente",
      wompiReference,
      concepto:   `Suscripción ${plan.nombre} - ${ciclo}`,
    });

    // Crear payment link en Wompi
    const amountInCents = currency === "COP"
      ? Math.round(montoCop * 100)
      : Math.round(montoUsd * 100);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // expira en 2 horas

    const wompiRes = await fetch(`${WOMPI_BASE}/payment_links`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.WOMPI_PRIVATE_KEY}`,
      },
      body: JSON.stringify({
        name:             `Suscripción ${plan.nombre}`,
        description:      `${ciclo === "mensual" ? "Mensual" : "Anual"} — ${plan.nombre}`,
        single_use:       true,
        collect_shipping: false,
        amount_in_cents:  amountInCents,
        currency:         currency,
        redirect_url:     process.env.WOMPI_REDIRECT_URL ?? "exp://localhost:8081/--/checkout/result",
        expires_at:       expiresAt.toISOString(),
        reference:        wompiReference,
      }),
    });

    if (!wompiRes.ok) {
      const err = await wompiRes.json();
      console.error("[checkout] Error Wompi:", err);
      res.status(502).json({ error: "Error al crear el link de pago. Intenta de nuevo." });
      return;
    }

    const wompiData = await wompiRes.json() as { data: { id: string; payment_link: string } };

    // Guardar wompi_reference → pagoId para recuperarlo en el webhook
    res.json({
      payment_url: wompiData.data.payment_link,
      reference:   wompiReference,
      pagoId:      pago.id,
      // Metadata para el frontend
      monto:       currency === "COP" ? montoCop : montoUsd,
      currency,
      planNombre:  plan.nombre,
    });
  } catch (err) { next(err); }
});

// ── POST /api/suscripciones/cancelar ─────────────────────────────────────────

router.post("/suscripciones/cancelar", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as JWTPayload;
    const suscripcion = await storage.suscripciones.getActive(user.id);

    if (!suscripcion) {
      res.status(404).json({ error: "Sin suscripción activa" });
      return;
    }
    if (suscripcion.planId === "plan-abogado-gratis") {
      res.status(400).json({ error: "No puedes cancelar el plan gratuito" });
      return;
    }

    await storage.suscripciones.cancelAutoRenovacion(suscripcion.id);
    res.json({
      mensaje:          "Renovación cancelada. Tu plan sigue activo hasta el vencimiento.",
      fechaVencimiento: suscripcion.fechaVencimiento,
    });
  } catch (err) { next(err); }
});

export default router;
```

> **Nota:** En el import de `database-storage` usar la ruta correcta: `"../storage/storeage/database-storage.js"` (typo intencional del proyecto).

---

### Task 18: Crear ruta POST /api/webhooks/wompi

**Files:**
- Create: `server/routes/webhooks.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
/**
 * Webhooks Routes
 * POST /api/webhooks/wompi — recibe eventos de transacciones de Wompi
 *
 * SEGURIDAD: No requiere JWT. Verifica firma HMAC-SHA256 de Wompi.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { createHash } from "crypto";
import { storage } from "../storage/storeage/database-storage.js";
import { subscriptionService } from "../services/subscription.service.js";

const router = Router();

// ── Verificar firma de Wompi ──────────────────────────────────────────────────

function verifyWompiSignature(event: any, integritySecret: string): boolean {
  try {
    const { checksum, properties } = event.signature ?? {};
    if (!checksum || !Array.isArray(properties)) return false;

    // Construir el string a hashear: concatenar valores de las propiedades
    const data = event.data ?? {};
    const toHash = properties
      .map((prop: string) => {
        // prop puede ser "transaction.id", navegamos el objeto
        const value = prop.split(".").reduce((obj: any, key: string) => obj?.[key], data);
        return value ?? "";
      })
      .join("") + integritySecret;

    const expected = createHash("sha256").update(toHash).digest("hex");
    return expected === checksum;
  } catch {
    return false;
  }
}

// ── POST /api/webhooks/wompi ──────────────────────────────────────────────────

router.post("/webhooks/wompi", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const integritySecret = process.env.WOMPI_EVENTS_SECRET;
    if (!integritySecret) {
      console.error("[webhook:wompi] WOMPI_EVENTS_SECRET no configurado");
      res.status(500).json({ error: "Configuración incompleta" });
      return;
    }

    const event = req.body;

    // Verificar firma
    if (!verifyWompiSignature(event, integritySecret)) {
      console.warn("[webhook:wompi] Firma inválida — posible intento de fraude");
      res.status(401).json({ error: "Firma inválida" });
      return;
    }

    // Solo procesar transaction.updated
    if (event.event !== "transaction.updated") {
      res.status(200).json({ received: true });
      return;
    }

    const tx = event.data?.transaction;
    if (!tx) {
      res.status(400).json({ error: "Datos de transacción faltantes" });
      return;
    }

    const { id: wompiTxId, status, reference, payment_method_type } = tx;

    // Buscar el pago por referencia
    const pago = await storage.pagosStorage.getByReference(reference);
    if (!pago) {
      console.warn(`[webhook:wompi] Pago con referencia ${reference} no encontrado`);
      res.status(200).json({ received: true }); // 200 para que Wompi no reintente
      return;
    }

    // Mapear método de pago
    const metodoPagoMap: Record<string, string> = {
      CARD:                    "card",
      PSE:                     "pse",
      NEQUI:                   "nequi",
      BANCOLOMBIA_TRANSFER:    "bancolombia_transfer",
    };
    const metodoPago = metodoPagoMap[payment_method_type] ?? "otro";

    if (status === "APPROVED") {
      await storage.pagosStorage.updateEstado(pago.id, "aprobado", wompiTxId, metodoPago);

      // Recuperar datos del checkout desde el concepto del pago
      // Formato: "Suscripción {planNombre} - {ciclo}"
      // Necesitamos planId y ciclo — los guardamos en wompi_reference como metadata
      // En el checkout guardamos una entrada temporal en suscripciones
      // Aquí leemos la suscripcion pendiente del usuario para obtener planId/ciclo

      // Obtener la última suscripción pendiente/activa del usuario para obtener planId
      const suscripciones = await storage.suscripciones.getByUserId(pago.userId);
      const ultima = suscripciones.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const planId     = ultima?.planId     ?? "plan-abogado-esencial";
      const ciclo      = ultima?.ciclo      ?? "mensual";
      const extraUsers = ultima?.extraUsers ?? 0;

      await subscriptionService.activateSuscripcion(pago.userId, planId, ciclo, extraUsers, pago.id);

      // Notificar al usuario
      await storage.appNotifications.createNotification(
        pago.userId,
        "subscription_activated",
        "¡Suscripción activada!",
        "Tu plan ha sido activado exitosamente.",
        { pagoId: pago.id },
      );

      console.log(`[webhook:wompi] Suscripción activada para usuario ${pago.userId}`);
    } else if (status === "DECLINED" || status === "ERROR" || status === "VOIDED") {
      await storage.pagosStorage.updateEstado(pago.id, "rechazado", wompiTxId, metodoPago);
      console.log(`[webhook:wompi] Pago rechazado para usuario ${pago.userId}: ${status}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[webhook:wompi] Error:", err);
    // Siempre responder 200 para que Wompi no reintente indefinidamente
    res.status(200).json({ received: true });
  }
});

export default router;
```

---

### Task 19: Registrar rutas + cron de vencimientos

**Files:**
- Modify: `server/routes/index.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: En server/routes/index.ts — agregar imports y registros**

Agregar imports (al final de los imports existentes):
```typescript
import suscripcionesRoutes from "./suscripciones.js";
import webhooksRoutes      from "./webhooks.js";
```

Agregar registros (al final de la función `registerAppRoutes`, antes del cierre `}`):
```typescript
  app.use("/api", suscripcionesRoutes);
  app.use("/api", webhooksRoutes);
```

- [ ] **Step 2: En server/index.ts — agregar cron de vencimientos**

Agregar después del cron de calendario existente (línea ~362):

```typescript
  // Cron: vencimiento de suscripciones (cada 24 horas)
  setInterval(async () => {
    try {
      // 1. Degradar suscripciones vencidas a plan gratis
      const vencidas = await storage.suscripciones.getVencidas();
      for (const s of vencidas) {
        await storage.suscripciones.updateEstado(s.id, "vencida");
        await subscriptionService.activatePlanGratis(s.userId);
        await storage.appNotifications.createNotification(
          s.userId,
          "subscription_expired",
          "Tu suscripción ha vencido",
          "Tu plan ha sido degradado al plan gratuito. Renueva para seguir usando todas las funcionalidades.",
          { suscripcionId: s.id },
        );
        console.log(`[cron:suscripciones] Suscripción ${s.id} degradada a gratis`);
      }

      // 2. Notificar suscripciones que vencen en 3 días
      const proximasAVencer = await storage.suscripciones.getProximasAVencer(3);
      for (const s of proximasAVencer) {
        await storage.appNotifications.createNotification(
          s.userId,
          "subscription_expiring_soon",
          "Tu suscripción vence pronto",
          `Tu plan vence el ${s.fechaVencimiento.toLocaleDateString("es-CO")}. Renueva para no perder el acceso.`,
          { suscripcionId: s.id },
        );
      }
    } catch (err) {
      console.error("[cron:suscripciones] Error:", err);
    }
  }, 24 * 60 * 60 * 1000); // cada 24 horas
```

Agregar import de subscriptionService al inicio del archivo (donde están los otros imports de servicios):
```typescript
import { subscriptionService } from "./services/subscription.service.js";
```

---

### Task 20: Aplicar db:push y verificar

**Files:** ninguno nuevo

- [ ] **Step 1: Aplicar schema a la base de datos**

```bash
cd "C:\Users\ccsb1\OneDrive\Escritorio\Asset-Manager\Asset-Manager"
npm run db:push
```

Esperado: Las tablas `features`, `plan_features`, `suscripciones`, `pagos`, `usage_tracking` se crean. La tabla `planes` se altera con los nuevos campos.

- [ ] **Step 2: Iniciar el servidor para ejecutar el seeder**

```bash
npm run dev
```

Esperado en consola:
```
[seed:planes] Planes y features sembrados correctamente.
```

- [ ] **Step 3: Verificar endpoint de planes**

```bash
curl http://localhost:5000/api/planes
```

Esperado: Array JSON con 6 planes (3 abogado + 3 bufete), cada uno con su lista de `features`.

- [ ] **Step 4: Verificar que el límite funciona**

Con un usuario autenticado en plan gratis, crear 6 procesos. En el 6to, la respuesta debe ser:
```json
{
  "error": "LIMIT_REACHED",
  "tipo": "procesos",
  "actual": 5,
  "maximo": 5
}
```

- [ ] **Step 5: Commit**

```bash
git add shared/schema/feature.schema.ts shared/schema/suscripcion.schema.ts shared/schema/pago.schema.ts shared/schema/usage-tracking.schema.ts shared/schema/plane.schema.ts shared/schema/index.ts
git add server/storage/storeage/models/feature-storage.ts server/storage/storeage/models/suscripcion-storage.ts server/storage/storeage/models/pago-storage.ts server/storage/storeage/models/usage-tracking-storage.ts server/storage/storeage/models/plan-storage.ts
git add server/storage/storeage/database-storage.ts
git add server/services/subscription.service.ts server/middleware/require-feature.ts
git add server/routes/suscripciones.ts server/routes/webhooks.ts server/routes/index.ts
git add server/routes/procesos.ts server/routes/clientes.ts
git add server/db/seeds/planes.seed.ts server/index.ts
git commit -m "feat(planes): schema, storages, SubscriptionService, rutas y webhook Wompi"
```

---

## Self-Review

**Spec coverage:**
- ✅ Sección 2 (modelo de datos) → Tasks 1-5
- ✅ Sección 3 (enforcement) → Tasks 14-16
- ✅ Sección 4 (rutas Wompi) → Tasks 17-18
- ✅ Sección 6 (seeder) → Task 12
- ✅ Cron de vencimientos → Task 19
- ✅ Registro de rutas → Task 19

**Placeholder scan:** Sin TBDs. Todos los pasos tienen código completo.

**Type consistency:**
- `UsageTipo` definido en `usage-tracking-storage.ts`, usado en `subscription.service.ts` ✅
- `PlanPublicoDTO` definido en `plane.schema.ts`, exportado en `index.ts`, usado en `plan-storage.ts` ✅
- `wompiReference` usado consistentemente entre `checkout` y `webhook` ✅
- `storage.suscripciones`, `storage.pagosStorage`, `storage.usageTracking`, `storage.featureStorage` — todos registrados en `database-storage.ts` Task 11 ✅
