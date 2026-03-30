# Ownership Policy — Clientes y Procesos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el sistema completo de ownership configurable por bufete — incluyendo tabla `firmSettings`, campo `esPrivado`/`createdBy` en clientes y procesos, tabla `clienteOwnership`, servicio de política, corrección del bug de ownership en creación, y visibilidad basada en ownership real en lugar de `firmId`.

**Architecture:** Se agrega una capa de política (`OwnershipPolicyService`) que consulta `firmSettings` y el perfil del abogado para determinar owner, privacidad y validar consistencia cliente–proceso. Las rutas de creación delegan en este servicio antes de insertar. La visibilidad del bufete se migra de `lawyerProfiles.firmId` a `procesoOwnership`/`clienteOwnership`.

**Tech Stack:** TypeScript, Drizzle ORM (MySQL2), Express, Zod — sin librerías nuevas.

---

## Mapa de archivos

### Crear
| Archivo | Responsabilidad |
|---------|----------------|
| `shared/schema/firm-settings.schema.ts` | Tabla `firm_settings` — configuración de privacidad por bufete |
| `shared/schema/cliente-ownership.schema.ts` | Tabla `cliente_ownership` — historial de propiedad de clientes |
| `server/storage/storeage/models/firm-settings-storage.ts` | CRUD de firm_settings |
| `server/storage/storeage/models/cliente-ownership-storage.ts` | CRUD de cliente_ownership |
| `server/services/ownership-policy.service.ts` | Lógica de negocio: determinar owner, validar privacidad, consistencia |
| `server/routes/firm-settings.ts` | GET/PATCH `/api/firm/settings` |

### Modificar
| Archivo | Cambio |
|---------|--------|
| `shared/schema/cliente.schema.ts` | Agregar `esPrivado`, `createdBy` |
| `shared/schema/proceso.schema.ts` | Agregar `esPrivado`, `createdBy` |
| `shared/schema/index.ts` | Exportar nuevos schemas |
| `server/storage/storeage/database-storage.ts` | Registrar `firmSettings`, `clienteOwnership` |
| `server/services/cliente.service.ts` | Aplicar política de ownership, crear `clienteOwnership` |
| `server/routes/procesos.ts` | Aplicar política, corregir bug ownership, validar consistencia |
| `server/storage/storeage/models/proceso-storage.ts` | Corregir `getProcesosByFirma` para usar `procesoOwnership` |
| `server/routes/index.ts` | Registrar nueva ruta firm-settings |

---

## Task 1: Schema — `firm_settings`

**Files:**
- Create: `shared/schema/firm-settings.schema.ts`

- [ ] **Step 1: Crear el archivo de schema**

```typescript
// shared/schema/firm-settings.schema.ts
import { mysqlTable, varchar, boolean, timestamp, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { firmProfiles } from "./firm-profile.schema";

export const firmSettings = mysqlTable("firm_settings", {
  id:                          varchar("id",                           { length: 36 }).primaryKey(),
  firmId:                      varchar("firm_id",                      { length: 36 }).notNull().unique(),
  allowPrivateClientes:        boolean("allow_private_clientes").notNull().default(false),
  allowPrivateProcesos:        boolean("allow_private_procesos").notNull().default(false),
  defaultClienteEsCompartido:  boolean("default_cliente_es_compartido").notNull().default(true),
  defaultProcesoEsCompartido:  boolean("default_proceso_es_compartido").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const firmSettingsRelations = relations(firmSettings, ({ one }) => ({
  firm: one(firmProfiles, {
    fields: [firmSettings.firmId],
    references: [firmProfiles.id],
  }),
}));

export type FirmSettings        = typeof firmSettings.$inferSelect;
export type InsertFirmSettings  = typeof firmSettings.$inferInsert;

export interface FirmSettingsDTO {
  firmId:                     string;
  allowPrivateClientes:       boolean;
  allowPrivateProcesos:       boolean;
  defaultClienteEsCompartido: boolean;
  defaultProcesoEsCompartido: boolean;
}
```

- [ ] **Step 2: Exportar desde el índice** — en `shared/schema/index.ts` agregar al final:

```typescript
// Firm Settings (configuración de privacidad y ownership por bufete)
export {
  firmSettings,
  firmSettingsRelations,
  type FirmSettings,
  type InsertFirmSettings,
  type FirmSettingsDTO,
} from "./firm-settings.schema";
```

- [ ] **Step 3: Verificar compilación**

```bash
cd "C:\Users\ccsb1\OneDrive\Escritorio\Asset-Manager\Asset-Manager"
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sin errores nuevos relacionados con `firm-settings`.

- [ ] **Step 4: Commit**

```bash
git add shared/schema/firm-settings.schema.ts shared/schema/index.ts
git commit -m "feat(schema): tabla firm_settings para configuración de privacidad por bufete"
```

---

## Task 2: Schema — `cliente_ownership`

**Files:**
- Create: `shared/schema/cliente-ownership.schema.ts`
- Modify: `shared/schema/index.ts`

- [ ] **Step 1: Crear el schema**

```typescript
// shared/schema/cliente-ownership.schema.ts
import { mysqlTable, varchar, timestamp, tinyint } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { clientes } from "./cliente.schema";

export type ClienteOwnerType = "abogado" | "bufete";

export const clienteOwnership = mysqlTable("cliente_ownership", {
  id:           varchar("id",          { length: 36 }).primaryKey(),
  clienteId:    varchar("cliente_id",  { length: 36 }).notNull(),
  ownerType:    varchar("owner_type",  { length: 20 }).notNull().$type<ClienteOwnerType>(),
  ownerId:      varchar("owner_id",    { length: 36 }).notNull(),
  fechaInicio:  timestamp("fecha_inicio").notNull().defaultNow(),
  fechaFin:     timestamp("fecha_fin"),
  activoUnique: tinyint("activo_unique"),   // 1 = activo, NULL = histórico
  creadoPor:    varchar("creado_por",  { length: 36 }).notNull(),
  razon:        varchar("razon",       { length: 500 }),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const clienteOwnershipRelations = relations(clienteOwnership, ({ one }) => ({
  cliente: one(clientes, {
    fields: [clienteOwnership.clienteId],
    references: [clientes.id],
  }),
}));

export type ClienteOwnership       = typeof clienteOwnership.$inferSelect;
export type InsertClienteOwnership = typeof clienteOwnership.$inferInsert;

export interface ClienteOwnershipDTO {
  id:          string;
  clienteId:   string;
  ownerType:   ClienteOwnerType;
  ownerId:     string;
  fechaInicio: Date;
  fechaFin:    Date | null;
  activo:      boolean;
  creadoPor:   string;
  razon:       string | null;
}
```

- [ ] **Step 2: Exportar desde el índice** — agregar al final de `shared/schema/index.ts`:

```typescript
// Cliente Ownership (propiedad histórica de clientes)
export {
  clienteOwnership,
  clienteOwnershipRelations,
  type ClienteOwnerType,
  type ClienteOwnership,
  type InsertClienteOwnership,
  type ClienteOwnershipDTO,
} from "./cliente-ownership.schema";
```

- [ ] **Step 3: Commit**

```bash
git add shared/schema/cliente-ownership.schema.ts shared/schema/index.ts
git commit -m "feat(schema): tabla cliente_ownership para propiedad histórica de clientes"
```

---

## Task 3: Schema — campos `esPrivado` y `createdBy` en clientes y procesos

**Files:**
- Modify: `shared/schema/cliente.schema.ts`
- Modify: `shared/schema/proceso.schema.ts`

- [ ] **Step 1: Agregar campos a `clientes`**

En `shared/schema/cliente.schema.ts`, modificar la definición de la tabla:

```typescript
// Reemplazar la definición de clientes por:
export const clientes = mysqlTable("clientes", {
  id:            varchar("id",         { length: 36 }).primaryKey(),
  userId:        varchar("user_id",    { length: 36 }).notNull().unique(),
  tipo:          mysqlEnum("tipo", ["natural", "empresa"]).notNull().default("natural"),
  fechaCreacion: timestamp("fecha_creacion").notNull().default(new Date()),
  activo:        boolean("activo").notNull().default(true),
  esPrivado:     boolean("es_privado").notNull().default(false),
  createdBy:     varchar("created_by", { length: 36 }),   // lawyerId o firmId que lo creó
});
```

Agregar los campos a las interfaces `Cliente` e `InsertCliente`:

```typescript
export interface Cliente {
  id: string;
  userId?: string;
  tipo: ClienteTipo;
  activo: boolean;
  fechaCreacion: Date;
  esPrivado: boolean;
  createdBy: string | null;
  procesosStats: any;
  user?: { id: string; email: string; isActive: boolean; createdAt: Date } | null;
  natural?: import("./cliente-natural.schema").ClienteNatural | null;
  empresa?: import("./cliente-empresa.schema").ClienteEmpresa | null;
}

export interface InsertCliente {
  id: string;
  userId: string;
  tipo: ClienteTipo;
  activo?: boolean;
  fechaCreacion?: Date;
  esPrivado?: boolean;
  createdBy?: string | null;
}
```

- [ ] **Step 2: Agregar campos a `procesos`**

En `shared/schema/proceso.schema.ts`, modificar la tabla y las interfaces:

```typescript
export const procesos = mysqlTable("procesos", {
  id:                   varchar("id",         { length: 36 }).primaryKey(),
  clienteId:            varchar("cliente_id", { length: 36 }).notNull(),
  tipoProcesoId:        int("tipo_proceso_id"),
  radicado:             text("radicado").notNull(),
  juzgado:              text("juzgado").notNull(),
  estadoId:             int("estado_id").notNull(),
  descripcionEstado:    text("descripcion_estado").notNull(),
  legalStage:           varchar("legal_stage", { length: 50 }),
  fechaVencimientoEtapa: datetime("fecha_vencimiento_etapa"),
  etapaActualizadaEn:   timestamp("etapa_actualizada_en"),
  fechaCreacion:        timestamp("fecha_creacion").notNull().default(new Date()),
  state:                boolean("state").notNull().default(true),
  communityPostId:      varchar("community_post_id", { length: 36 }),
  esPrivado:            boolean("es_privado").notNull().default(false),
  createdBy:            varchar("created_by", { length: 36 }),  // lawyerId o firmId que lo creó
});
```

Agregar a las interfaces `Proceso` e `InsertProceso`:

```typescript
// En Proceso:
esPrivado: boolean;
createdBy: string | null;

// En InsertProceso:
esPrivado?: boolean;
createdBy?: string | null;
```

- [ ] **Step 3: Verificar compilación**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Esperado: pueden aparecer errores de tipo en storage/routes donde se construyen objetos sin los nuevos campos — se corregirán en tareas posteriores. Si hay errores en el schema mismo, corregirlos primero.

- [ ] **Step 4: Commit**

```bash
git add shared/schema/cliente.schema.ts shared/schema/proceso.schema.ts
git commit -m "feat(schema): agregar esPrivado y createdBy a clientes y procesos"
```

---

## Task 4: Storage — `FirmSettingsStorage`

**Files:**
- Create: `server/storage/storeage/models/firm-settings-storage.ts`
- Modify: `server/storage/storeage/database-storage.ts`

- [ ] **Step 1: Crear la clase de storage**

```typescript
// server/storage/storeage/models/firm-settings-storage.ts
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { firmSettings, type FirmSettings, type FirmSettingsDTO } from "@/shared/schema";
import type { Database } from "../database-storage";

const DEFAULTS: Omit<FirmSettingsDTO, "firmId"> = {
  allowPrivateClientes:       false,
  allowPrivateProcesos:       false,
  defaultClienteEsCompartido: true,
  defaultProcesoEsCompartido: true,
};

export class FirmSettingsStorage {
  constructor(private db: Database) {}

  /** Obtiene settings del bufete. Si no existen, devuelve los defaults sin persistir. */
  async get(firmId: string): Promise<FirmSettingsDTO> {
    const row = await this.db
      .select()
      .from(firmSettings)
      .where(eq(firmSettings.firmId, firmId))
      .limit(1)
      .then(r => r[0] ?? null);

    if (!row) return { firmId, ...DEFAULTS };
    return this.toDTO(row);
  }

  /** Crea o actualiza los settings de un bufete. */
  async upsert(firmId: string, updates: Partial<Omit<FirmSettingsDTO, "firmId">>): Promise<FirmSettingsDTO> {
    const existing = await this.db
      .select()
      .from(firmSettings)
      .where(eq(firmSettings.firmId, firmId))
      .limit(1)
      .then(r => r[0] ?? null);

    if (existing) {
      await this.db
        .update(firmSettings)
        .set(updates)
        .where(eq(firmSettings.firmId, firmId));
      return this.toDTO({ ...existing, ...updates });
    }

    const id = randomUUID();
    const newRow = { id, firmId, ...DEFAULTS, ...updates };
    await this.db.insert(firmSettings).values(newRow);
    return this.toDTO(newRow as FirmSettings);
  }

  private toDTO(row: FirmSettings): FirmSettingsDTO {
    return {
      firmId:                     row.firmId,
      allowPrivateClientes:       row.allowPrivateClientes,
      allowPrivateProcesos:       row.allowPrivateProcesos,
      defaultClienteEsCompartido: row.defaultClienteEsCompartido,
      defaultProcesoEsCompartido: row.defaultProcesoEsCompartido,
    };
  }
}
```

- [ ] **Step 2: Registrar en `database-storage.ts`**

Agregar el import:
```typescript
import { FirmSettingsStorage } from "./models/firm-settings-storage";
```

Agregar la propiedad pública después de `procesoSharing`:
```typescript
public firmSettings: FirmSettingsStorage;
```

Agregar la inicialización en el constructor después de `this.procesoSharing`:
```typescript
this.firmSettings = new FirmSettingsStorage(this.db);
```

- [ ] **Step 3: Compilar y verificar**

```bash
npx tsc --noEmit 2>&1 | grep -i "firm-settings" | head -20
```

Esperado: sin errores en `firm-settings-storage`.

- [ ] **Step 4: Commit**

```bash
git add server/storage/storeage/models/firm-settings-storage.ts server/storage/storeage/database-storage.ts
git commit -m "feat(storage): FirmSettingsStorage con get y upsert"
```

---

## Task 5: Storage — `ClienteOwnershipStorage`

**Files:**
- Create: `server/storage/storeage/models/cliente-ownership-storage.ts`
- Modify: `server/storage/storeage/database-storage.ts`

- [ ] **Step 1: Crear la clase de storage**

```typescript
// server/storage/storeage/models/cliente-ownership-storage.ts
import { eq, and, desc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  clienteOwnership,
  type ClienteOwnerType,
  type ClienteOwnershipDTO,
} from "@/shared/schema";
import type { Database } from "../database-storage";

export class ClienteOwnershipStorage {
  constructor(private db: Database) {}

  /** Ownership activo de un cliente. */
  async getActive(clienteId: string): Promise<ClienteOwnershipDTO | null> {
    const row = await this.db
      .select()
      .from(clienteOwnership)
      .where(and(
        eq(clienteOwnership.clienteId, clienteId),
        eq(clienteOwnership.activoUnique, 1),
      ))
      .limit(1)
      .then(r => r[0] ?? null);

    return row ? this.toDTO(row) : null;
  }

  /** Historial completo de ownership de un cliente. */
  async getHistory(clienteId: string): Promise<ClienteOwnershipDTO[]> {
    const rows = await this.db
      .select()
      .from(clienteOwnership)
      .where(eq(clienteOwnership.clienteId, clienteId))
      .orderBy(desc(clienteOwnership.fechaInicio));

    return rows.map(r => this.toDTO(r));
  }

  /** Crear ownership inicial (para cliente recién creado). */
  async create(
    clienteId: string,
    ownerType: ClienteOwnerType,
    ownerId: string,
    creadoPor: string,
    razon?: string,
  ): Promise<ClienteOwnershipDTO> {
    const id = randomUUID();
    await this.db.insert(clienteOwnership).values({
      id, clienteId, ownerType, ownerId,
      activoUnique: 1, creadoPor, razon: razon ?? null,
    });
    return { id, clienteId, ownerType, ownerId, fechaInicio: new Date(), fechaFin: null, activo: true, creadoPor, razon: razon ?? null };
  }

  /** IDs de clientes donde owner_type + owner_id tienen ownership activo. */
  async getClienteIdsByOwner(ownerType: ClienteOwnerType, ownerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ clienteId: clienteOwnership.clienteId })
      .from(clienteOwnership)
      .where(and(
        eq(clienteOwnership.ownerType, ownerType),
        eq(clienteOwnership.ownerId, ownerId),
        eq(clienteOwnership.activoUnique, 1),
      ));
    return rows.map(r => r.clienteId);
  }

  private toDTO(row: typeof clienteOwnership.$inferSelect): ClienteOwnershipDTO {
    return {
      id:          row.id,
      clienteId:   row.clienteId,
      ownerType:   row.ownerType as ClienteOwnerType,
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

- [ ] **Step 2: Registrar en `database-storage.ts`**

```typescript
// Import
import { ClienteOwnershipStorage } from "./models/cliente-ownership-storage";

// Propiedad pública
public clienteOwnership: ClienteOwnershipStorage;

// En constructor
this.clienteOwnership = new ClienteOwnershipStorage(this.db);
```

- [ ] **Step 3: Commit**

```bash
git add server/storage/storeage/models/cliente-ownership-storage.ts server/storage/storeage/database-storage.ts
git commit -m "feat(storage): ClienteOwnershipStorage con get, create e historial"
```

---

## Task 6: Service — `OwnershipPolicyService`

**Files:**
- Create: `server/services/ownership-policy.service.ts`
- Modify: `server/services/index.ts`

Este servicio es el núcleo de toda la lógica de negocio. Consulta `firmSettings`, el `firmId` del abogado y determina quién es el dueño real.

- [ ] **Step 1: Crear el servicio**

```typescript
// server/services/ownership-policy.service.ts
import { storage } from "../storage/storeage/database-storage.js";
import type { OwnerType } from "@/shared/schema";
import type { ClienteOwnerType } from "@/shared/schema";

export interface OwnershipContext {
  /** ID del perfil que actúa (lawyerId o firmId) */
  actorId: string;
  /** Nombre del rol: "abogado" | "bufete" */
  rolNombre: string;
  /** ¿El usuario solicitó que sea privado? */
  esPrivadoSolicitado: boolean;
}

export interface OwnershipDecision {
  ownerType: "abogado" | "bufete";
  ownerId: string;
  esPrivado: boolean;
}

export class OwnershipPolicyService {
  /**
   * Determina el owner de un PROCESO recién creado.
   *
   * Reglas (en orden de prioridad):
   * 1. Si el actor es bufete → siempre ownerType=bufete, esPrivado=false
   * 2. Si el actor es abogado SIN firma → ownerType=abogado, esPrivado=false
   * 3. Si el actor es abogado CON firma:
   *    a. Si el bufete NO permite privados → ownerType=bufete, esPrivado=false
   *    b. Si el bufete SÍ permite privados:
   *       - esPrivadoSolicitado=true → ownerType=abogado, esPrivado=true
   *       - esPrivadoSolicitado=false o default → usa defaultProcesoEsCompartido del bufete
   */
  async resolveForProceso(ctx: OwnershipContext): Promise<OwnershipDecision> {
    if (ctx.rolNombre === "bufete") {
      return { ownerType: "bufete", ownerId: ctx.actorId, esPrivado: false };
    }

    if (ctx.rolNombre !== "abogado") {
      return { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: false };
    }

    // Abogado: consultar si pertenece a un bufete
    const lawyerProfile = await storage.lawyerProfiles.getLawyerProfile(ctx.actorId);
    const firmId = lawyerProfile?.firmId ?? null;

    if (!firmId) {
      // Sin firma — el proceso es del abogado
      return { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: false };
    }

    // Abogado en bufete — consultar configuración
    const settings = await storage.firmSettings.get(firmId);

    if (!settings.allowPrivateProcesos) {
      // Bufete no permite privados → siempre del bufete
      return { ownerType: "bufete", ownerId: firmId, esPrivado: false };
    }

    // Bufete permite privados
    const esPrivado = ctx.esPrivadoSolicitado
      ? true
      : !settings.defaultProcesoEsCompartido;

    return esPrivado
      ? { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: true }
      : { ownerType: "bufete", ownerId: firmId, esPrivado: false };
  }

  /**
   * Determina el owner de un CLIENTE recién creado.
   * Misma lógica que proceso pero usando `allowPrivateClientes` y `defaultClienteEsCompartido`.
   */
  async resolveForCliente(ctx: OwnershipContext): Promise<OwnershipDecision> {
    if (ctx.rolNombre === "bufete") {
      return { ownerType: "bufete", ownerId: ctx.actorId, esPrivado: false };
    }

    if (ctx.rolNombre !== "abogado") {
      return { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: false };
    }

    const lawyerProfile = await storage.lawyerProfiles.getLawyerProfile(ctx.actorId);
    const firmId = lawyerProfile?.firmId ?? null;

    if (!firmId) {
      return { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: false };
    }

    const settings = await storage.firmSettings.get(firmId);

    if (!settings.allowPrivateClientes) {
      return { ownerType: "bufete", ownerId: firmId, esPrivado: false };
    }

    const esPrivado = ctx.esPrivadoSolicitado
      ? true
      : !settings.defaultClienteEsCompartido;

    return esPrivado
      ? { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: true }
      : { ownerType: "bufete", ownerId: firmId, esPrivado: false };
  }

  /**
   * Valida que el proceso tenga el mismo tipo de ownership que su cliente.
   * Lanza un error descriptivo si hay inconsistencia.
   * Regla: cliente privado ↔ proceso privado (no se pueden mezclar).
   */
  async validateConsistenciaClienteProceso(
    clienteId: string,
    procesoEsPrivado: boolean,
  ): Promise<void> {
    const clienteOwnershipDTO = await storage.clienteOwnership.getActive(clienteId);
    if (!clienteOwnershipDTO) return; // cliente sin ownership aún (edge case)

    const clienteEsPrivado = clienteOwnershipDTO.ownerType === "abogado";

    if (clienteEsPrivado && !procesoEsPrivado) {
      throw new Error(
        "No se puede crear un proceso del bufete para un cliente privado. El proceso debe ser también privado.",
      );
    }

    if (!clienteEsPrivado && procesoEsPrivado) {
      throw new Error(
        "No se puede crear un proceso privado para un cliente del bufete. El proceso debe pertenecer al bufete.",
      );
    }
  }
}

export const ownershipPolicyService = new OwnershipPolicyService();
```

- [ ] **Step 2: Exportar desde `server/services/index.ts`**

Agregar la línea:
```typescript
export { ownershipPolicyService, type OwnershipContext, type OwnershipDecision } from "./ownership-policy.service.js";
```

- [ ] **Step 3: Verificar que `getLawyerProfile` existe en AbogadoStorage**

```bash
grep -n "getLawyerProfile\|getLawyer" "server/storage/storeage/models/abogado-storage.ts" | head -10
```

Si el método se llama diferente (p.ej. `getAbogadoById`), actualizar la referencia en el servicio. El método debe devolver `{ firmId: string | null }`.

- [ ] **Step 4: Commit**

```bash
git add server/services/ownership-policy.service.ts server/services/index.ts
git commit -m "feat(service): OwnershipPolicyService — determina owner según firmSettings y rol"
```

---

## Task 7: Fix creación de procesos — aplicar política de ownership

**Files:**
- Modify: `server/routes/procesos.ts`

El bug actual (línea 291): cuando un abogado crea un proceso siempre asigna `ownerType="abogado"`, ignorando si pertenece a un bufete.

- [ ] **Step 1: Agregar imports en `procesos.ts`**

En la sección de imports de `server/routes/procesos.ts`, agregar:
```typescript
import { ownershipPolicyService } from "../services/ownership-policy.service.js";
```

- [ ] **Step 2: Reemplazar el bloque de ownership en POST `/procesos`**

Localizar el bloque entre las líneas 290 y 298:
```typescript
// ANTES (líneas 290-299):
// Crear registro de ownership inicial
const ownerType = ((rol as Rol).nombre === "abogado") ? "abogado" : "bufete";
const ownerId   = idProfile;
await storage.procesoOwnership.create(
  newProceso.id,
  ownerType,
  ownerId,
  userId,
  "Creado por " + ((rol as Rol).nombre === "abogado" ? "abogado" : "bufete"),
);
```

Reemplazar por:
```typescript
// Determinar ownership según política del bufete
const esPrivadoSolicitado = req.body.esPrivado === true;
const ownershipDecision = await ownershipPolicyService.resolveForProceso({
  actorId: idProfile,
  rolNombre: (rol as Rol).nombre,
  esPrivadoSolicitado,
});

// Validar consistencia con el cliente
await ownershipPolicyService.validateConsistenciaClienteProceso(
  req.body.clienteId,
  ownershipDecision.esPrivado,
).catch(err => {
  // Eliminar proceso creado y retornar error
  storage.deleteProceso(newProceso.id).catch(() => {});
  throw err;
});

await storage.procesoOwnership.create(
  newProceso.id,
  ownershipDecision.ownerType,
  ownershipDecision.ownerId,
  userId,
  `Creado por ${(rol as Rol).nombre}${ownershipDecision.esPrivado ? " (privado)" : ""}`,
);

// Actualizar esPrivado y createdBy en el proceso
await storage.procesos.updateProceso(newProceso.id, {
  esPrivado: ownershipDecision.esPrivado,
  createdBy: idProfile,
});
```

- [ ] **Step 3: Compilar**

```bash
npx tsc --noEmit 2>&1 | grep "procesos.ts" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/procesos.ts
git commit -m "fix(routes): corregir ownership en creación de proceso — usa OwnershipPolicyService"
```

---

## Task 8: Fix creación de clientes — aplicar política de ownership

**Files:**
- Modify: `server/services/cliente.service.ts`

- [ ] **Step 1: Agregar imports en `cliente.service.ts`**

```typescript
import { ownershipPolicyService } from "./ownership-policy.service.js";
```

- [ ] **Step 2: Agregar parámetros a `createCliente`**

Localizar la firma del método `createCliente` (línea ~84) y agregar parámetros:

```typescript
async createCliente(
  insertCliente: InsertClienteCompleto,
  password: string,
  email: string,
  lawyerId?: string,
  firmId?: string,
  // NUEVO:
  options?: {
    rolNombre?: string;
    actorId?: string;
    esPrivadoSolicitado?: boolean;
    userId?: string;
  }
): Promise<Cliente> {
```

- [ ] **Step 3: Reemplazar la lógica de asociación en `createCliente`**

Localizar el bloque (líneas 110-119):
```typescript
// ANTES:
if (firmId) {
  await storage.firmClients.createFirmClient(firmId, cliente.id);
} else if (lawyerId) {
  await storage.lawyerClients.createLawyerClient({
    id: randomUUID(),
    lawyerId,
    clientId: cliente.id,
    status: "active",
  });
}
```

Reemplazar por:
```typescript
const actorId   = options?.actorId ?? lawyerId ?? firmId ?? "";
const rolNombre = options?.rolNombre ?? (firmId ? "bufete" : "abogado");
const userId    = options?.userId ?? actorId;

// Determinar ownership según política
const ownershipDecision = await ownershipPolicyService.resolveForCliente({
  actorId,
  rolNombre,
  esPrivadoSolicitado: options?.esPrivadoSolicitado ?? false,
});

// Crear ownership en tabla dedicada
await storage.clienteOwnership.create(
  cliente.id,
  ownershipDecision.ownerType,
  ownershipDecision.ownerId,
  userId,
  `Creado por ${rolNombre}${ownershipDecision.esPrivado ? " (privado)" : ""}`,
);

// Actualizar esPrivado y createdBy
await storage.clientes.updateCliente(cliente.id, {
  esPrivado: ownershipDecision.esPrivado,
  createdBy: actorId,
});

// Mantener tablas de relación (firm_clients / lawyer_clients) para compatibilidad
if (ownershipDecision.ownerType === "bufete") {
  await storage.firmClients.createFirmClient(ownershipDecision.ownerId, cliente.id);
} else if (lawyerId) {
  await storage.lawyerClients.createLawyerClient({
    id: randomUUID(),
    lawyerId,
    clientId: cliente.id,
    status: "active",
  });
}
```

- [ ] **Step 4: Actualizar la llamada desde `clientes.ts`**

En `server/routes/clientes.ts`, en el POST `/clientes`, pasar las opciones nuevas:

```typescript
const newCliente = await clientesService.createCliente(
  {
    ...rest,
    tipo,
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    activo: true,
    fechaCreacion: new Date(),
    ...(tipo === "empresa" && representanteLegalId ? { representanteLegalId } : {}),
  },
  password,
  correo ?? `${rest.documento ?? rest.nit}@temp.com`,
  lawyerId,
  firmId,
  // NUEVO:
  {
    rolNombre: user?.rol?.nombre,
    actorId:   user?.idProfile,
    esPrivadoSolicitado: req.body.esPrivado === true,
    userId:    user?.id,
  }
);
```

- [ ] **Step 5: Compilar y verificar**

```bash
npx tsc --noEmit 2>&1 | grep -E "cliente|ownership" | head -20
```

- [ ] **Step 6: Commit**

```bash
git add server/services/cliente.service.ts server/routes/clientes.ts
git commit -m "fix(service): aplicar OwnershipPolicyService al crear cliente — clienteOwnership + esPrivado"
```

---

## Task 9: Fix `getProcesosByFirma` — usar `procesoOwnership` en lugar de `firmId`

**Files:**
- Modify: `server/storage/storeage/models/proceso-storage.ts`

El problema actual: `getProcesosByFirma` (línea 1007) busca procesos a través de `procesoLawyers` + `lawyerProfiles.firmId`. Si un abogado sale del bufete, el bufete pierde los procesos que ese abogado creó. La fuente de verdad debe ser `procesoOwnership`.

- [ ] **Step 1: Reemplazar el paso 1-2 en `getProcesosByFirma`**

Localizar las líneas 1013-1028:
```typescript
// ANTES:
// 1. IDs de abogados de la firma + la firma misma
const firmLawyers = await this.db
  .select({ lawyerId: lawyerProfiles.id })
  .from(lawyerProfiles)
  .where(eq(lawyerProfiles.firmId, firmId));

const allLawyerIds = [...new Set([...firmLawyers.map(l => l.lawyerId), firmId])];

// 2. Procesos asociados a la firma
const firmProcesoIds = await this.db
  .select({ procesoId: procesoLawyers.procesoId })
  .from(procesoLawyers)
  .where(inArray(procesoLawyers.lawyerId, allLawyerIds));

const procesoIds = [...new Set(firmProcesoIds.map(p => p.procesoId))];
```

Reemplazar por:
```typescript
// Fuente de verdad: procesoOwnership donde ownerType="bufete" y ownerId=firmId
const ownedRows = await this.db
  .select({ procesoId: procesoOwnership.procesoId })
  .from(procesoOwnership)
  .where(and(
    eq(procesoOwnership.ownerType, "bufete"),
    eq(procesoOwnership.ownerId, firmId),
    eq(procesoOwnership.activoUnique, 1),
  ));

const procesoIds = [...new Set(ownedRows.map(r => r.procesoId))];
```

- [ ] **Step 2: Aplicar el mismo cambio en `getProcesosByClienteAndFirma`** (líneas ~1231-1245)

```typescript
// Reemplazar el mismo patrón de firmLawyers + procesoLawyers por:
const ownedRows = await this.db
  .select({ procesoId: procesoOwnership.procesoId })
  .from(procesoOwnership)
  .where(and(
    eq(procesoOwnership.ownerType, "bufete"),
    eq(procesoOwnership.ownerId, firmId),
    eq(procesoOwnership.activoUnique, 1),
  ));

const procesoIds = [...new Set(ownedRows.map(r => r.procesoId))];
```

- [ ] **Step 3: Aplicar el mismo cambio en `getProcesoByFirmaIdAndProcesoId`** (líneas ~1332-1344)

```typescript
// Reemplazar firmLawyers + allLawyerIds por:
const ownedRow = await this.db
  .select({ procesoId: procesoOwnership.procesoId })
  .from(procesoOwnership)
  .where(and(
    eq(procesoOwnership.ownerType, "bufete"),
    eq(procesoOwnership.ownerId, firmId),
    eq(procesoOwnership.procesoId, procesoId),
    eq(procesoOwnership.activoUnique, 1),
  ))
  .limit(1)
  .then(r => r[0] ?? null);

if (!ownedRow) return undefined;
```

- [ ] **Step 4: Compilar**

```bash
npx tsc --noEmit 2>&1 | grep "proceso-storage" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add server/storage/storeage/models/proceso-storage.ts
git commit -m "fix(storage): getProcesosByFirma usa procesoOwnership en vez de firmId — mantiene histórico al salir abogado"
```

---

## Task 10: API endpoints — GET/PATCH `/api/firm/settings`

**Files:**
- Create: `server/routes/firm-settings.ts`
- Modify: `server/routes/index.ts`

- [ ] **Step 1: Crear la ruta**

```typescript
// server/routes/firm-settings.ts
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";
import { validate } from "../middleware/validation.js";

const router = Router();

const updateFirmSettingsSchema = z.object({
  allowPrivateClientes:       z.boolean().optional(),
  allowPrivateProcesos:       z.boolean().optional(),
  defaultClienteEsCompartido: z.boolean().optional(),
  defaultProcesoEsCompartido: z.boolean().optional(),
});

// GET /api/firm/settings — obtener configuración del bufete autenticado
router.get(
  "/firm/settings",
  authenticate,
  requirePermission("firma.ver"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user?.rol?.nombre !== "bufete") {
        return res.status(403).json({ error: "Solo los bufetes pueden acceder a esta configuración" });
      }
      const settings = await storage.firmSettings.get(user.idProfile);
      res.json(settings);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/firm/settings — actualizar configuración del bufete
router.patch(
  "/firm/settings",
  authenticate,
  requirePermission("firma.editar"),
  validate(updateFirmSettingsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user?.rol?.nombre !== "bufete") {
        return res.status(403).json({ error: "Solo los bufetes pueden modificar esta configuración" });
      }
      const updated = await storage.firmSettings.upsert(user.idProfile, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
```

- [ ] **Step 2: Registrar la ruta en `server/routes/index.ts`**

Agregar el import:
```typescript
import firmSettingsRoutes from "./firm-settings.js";
```

Agregar el `app.use` junto a las demás rutas:
```typescript
app.use("/api", firmSettingsRoutes);
```

- [ ] **Step 3: Compilar**

```bash
npx tsc --noEmit 2>&1 | grep "firm-settings" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/firm-settings.ts server/routes/index.ts
git commit -m "feat(routes): GET/PATCH /api/firm/settings para configuración de privacidad del bufete"
```

---

## Task 11: Compilación final y verificación

- [ ] **Step 1: Compilar el proyecto completo**

```bash
npx tsc --noEmit 2>&1
```

Resolver cualquier error de tipo remanente, especialmente:
- Constructores de objetos `InsertProceso` / `InsertCliente` que no incluyen `esPrivado`/`createdBy` → agregar `esPrivado: false, createdBy: null` en los valores por defecto
- Métodos de storage que no mapean los nuevos campos → actualizar los `select` o los mappers

- [ ] **Step 2: Smoke test manual — creación de proceso como abogado en bufete**

1. Autenticarse como abogado que tiene `firmId` no nulo
2. `POST /api/procesos` con body `{ ..., esPrivado: false }`
3. Verificar en DB: `proceso_ownership.owner_type = "bufete"` y `proceso_ownership.owner_id = firmId`
4. Verificar: `procesos.es_privado = false` y `procesos.created_by = lawyerId`
5. Autenticarse como bufete y `GET /api/procesos` → el proceso debe aparecer

- [ ] **Step 3: Smoke test — proceso privado con bufete que lo permite**

1. `PATCH /api/firm/settings` con `{ allowPrivateProcesos: true }`
2. Como abogado de ese bufete, `POST /api/procesos` con `{ ..., esPrivado: true }`
3. Verificar: `proceso_ownership.owner_type = "abogado"`, `procesos.es_privado = true`
4. Como bufete, `GET /api/procesos` → el proceso NO debe aparecer

- [ ] **Step 4: Smoke test — consistencia cliente–proceso**

1. Crear cliente del bufete (`esPrivado: false`)
2. Intentar crear proceso privado (`esPrivado: true`) para ese cliente
3. Esperar `400 Bad Request` con mensaje descriptivo de inconsistencia

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "chore: correcciones de compilación post-ownership-policy"
```

---

## Resumen de lo que implementa este plan

| Regla | Tarea |
|-------|-------|
| Bufete configura si permite privados | Task 1 + Task 4 + Task 10 |
| Abogado en bufete → cliente/proceso pertenece al bufete | Task 6 + Task 7 + Task 8 |
| `esPrivado` en clientes y procesos | Task 3 |
| `createdBy` en clientes y procesos | Task 3 + Task 7 + Task 8 |
| `clienteOwnership` tabla dedicada | Task 2 + Task 5 |
| Consistencia cliente–proceso obligatoria | Task 6 (validateConsistencia) + Task 7 |
| Sin firma → pertenece al abogado | Task 6 |
| Visibilidad bufete sin depender de firmId | Task 9 |
| API GET/PATCH firm settings | Task 10 |
| Reglas del bufete tienen prioridad | Task 6 (política explícita) |
