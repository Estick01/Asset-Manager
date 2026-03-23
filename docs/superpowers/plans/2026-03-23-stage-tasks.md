# Stage Tasks, Timeline & Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link tasks, documents, and a timeline to individual legal stages; add template tasks that auto-create on stage advance; block advancing when required tasks are pending.

**Architecture:** Two new SQL tables (`etapa_tareas_plantilla`, `etapa_eventos`) + two new columns on `tareas` (`legal_stage`, `requerida`) and `documentos` (`legal_stage`). Gate logic lives in the existing `PATCH /procesos/:id/legal-stage` handler. New frontend component `StageDetailSheet` shows per-stage tasks/timeline/docs.

**Tech Stack:** MySQL 2 · Drizzle ORM · Express.js 5 · React Native / Expo Router · TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `migrations/0053_stage_task_templates.sql` | Create | DDL: `etapa_tareas_plantilla` + ALTER `tareas` |
| `migrations/0054_stage_events.sql` | Create | DDL: `etapa_eventos` + ALTER `documentos` |
| `shared/schema/stage-task-template.schema.ts` | Create | Drizzle table + types + DTOs for templates |
| `shared/schema/stage-event.schema.ts` | Create | Drizzle table + types + DTOs for events |
| `shared/schema/tarea.schema.ts` | Modify | Add `legalStage`, `requerida` to table + DTOs |
| `shared/schema/index.ts` | Modify | Export two new schemas |
| `server/storage/storeage/models/stage-task-template-storage.ts` | Create | CRUD for template table |
| `server/storage/storeage/models/stage-event-storage.ts` | Create | CRUD + insert helpers for events |
| `server/storage/storeage/database-storage.ts` | Modify | Register two new storage instances |
| `server/db/seeds/stage-templates.seed.ts` | Create | Idempotent seed of 10 default templates |
| `server/index.ts` | Modify | Call `seedStageTemplates` |
| `server/routes/stage-task-templates.ts` | Create | GET/POST/PATCH/DELETE templates |
| `server/routes/stage-events.ts` | Create | GET + POST (notes) for stage timeline |
| `server/routes/index.ts` | Modify | Register two new route files |
| `server/routes/procesos.ts` | Modify | Gate + materialization + events in PATCH legal-stage |
| `server/routes/tareas.ts` | Modify | `?stage=` filter, `legalStage`/`requerida` in create/update, auto-event on complete |
| `server/routes/documentos.ts` | Modify | `?stage=` filter, `legalStage` in upload, auto-event |
| `components/proceso/StageDetailSheet.tsx` | Create | Bottom sheet: tasks/timeline/docs per stage |
| `components/proceso/LegalStageStepper.tsx` | Modify | Tappable steps + blocker badge |
| `app/case/[id].tsx` | Modify | Stage filter chips on Tasks tab + wire StageDetailSheet |
| `lib/services/stageEventService.ts` | Create | Frontend API calls for stage-events |
| `lib/services/stageTemplateService.ts` | Create | Frontend API calls for templates |

---

## Task 1: SQL Migrations

**Files:**
- Create: `migrations/0053_stage_task_templates.sql`
- Create: `migrations/0054_stage_events.sql`

- [ ] **Step 1: Create migration 0053**

```sql
-- migrations/0053_stage_task_templates.sql

CREATE TABLE `etapa_tareas_plantilla` (
  `id`               INT           NOT NULL AUTO_INCREMENT,
  `tipo_proceso_id`  INT           NULL,
  `legal_stage_code` VARCHAR(50)   NOT NULL,
  `titulo`           VARCHAR(255)  NOT NULL,
  `descripcion`      TEXT          NULL,
  `prioridad`        ENUM('baja','media','alta','urgente') NOT NULL DEFAULT 'media',
  `requerida`        TINYINT(1)    NOT NULL DEFAULT 0,
  `orden`            INT           NOT NULL DEFAULT 0,
  `activo`           TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_templates_stage` (`legal_stage_code`),
  INDEX `idx_templates_tipo`  (`tipo_proceso_id`)
);

ALTER TABLE `tareas`
  ADD COLUMN `legal_stage`  VARCHAR(50)  NULL AFTER `proceso_id`,
  ADD COLUMN `requerida`    TINYINT(1)   NOT NULL DEFAULT 0 AFTER `legal_stage`,
  ADD INDEX  `idx_tareas_stage` (`proceso_id`, `legal_stage`);
```

- [ ] **Step 2: Create migration 0054**

```sql
-- migrations/0054_stage_events.sql

CREATE TABLE `etapa_eventos` (
  `id`               VARCHAR(36)   NOT NULL,
  `proceso_id`       VARCHAR(36)   NOT NULL,
  `legal_stage_code` VARCHAR(50)   NOT NULL,
  `tipo`             ENUM('etapa_iniciada','etapa_completada','tarea_completada','documento_subido','nota') NOT NULL,
  `descripcion`      TEXT          NOT NULL,
  `metadatos`        JSON          NULL,
  `creado_por`       VARCHAR(36)   NULL,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_eventos_proceso_stage` (`proceso_id`, `legal_stage_code`),
  INDEX `idx_eventos_proceso`       (`proceso_id`)
);

ALTER TABLE `documentos`
  ADD COLUMN `legal_stage` VARCHAR(50) NULL AFTER `proceso_id`,
  ADD INDEX  `idx_docs_stage` (`proceso_id`, `legal_stage`);
```

- [ ] **Step 3: Commit**

```bash
git add migrations/0053_stage_task_templates.sql migrations/0054_stage_events.sql
git commit -m "feat(db): migraciones etapa_tareas_plantilla, etapa_eventos y columnas legalStage"
```

---

## Task 2: Drizzle Schemas

**Files:**
- Create: `shared/schema/stage-task-template.schema.ts`
- Create: `shared/schema/stage-event.schema.ts`
- Modify: `shared/schema/tarea.schema.ts`
- Modify: `shared/schema/index.ts`

- [ ] **Step 1: Create `stage-task-template.schema.ts`**

```typescript
// shared/schema/stage-task-template.schema.ts
import { mysqlTable, int, varchar, text, mysqlEnum, tinyint, timestamp } from "drizzle-orm/mysql-core";
import { tiposProceso } from "./tipo-proceso.schema";
import { relations } from "drizzle-orm";
import type { TareaPrioridad } from "./tarea.schema";

export const etapasTareasPlantilla = mysqlTable("etapa_tareas_plantilla", {
  id:              int("id").autoincrement().primaryKey(),
  tipoProcesoId:   int("tipo_proceso_id"),
  legalStageCode:  varchar("legal_stage_code", { length: 50 }).notNull(),
  titulo:          varchar("titulo",           { length: 255 }).notNull(),
  descripcion:     text("descripcion"),
  prioridad:       mysqlEnum("prioridad", ["baja", "media", "alta", "urgente"]).notNull().default("media"),
  requerida:       tinyint("requerida").notNull().default(0),
  orden:           int("orden").notNull().default(0),
  activo:          tinyint("activo").notNull().default(1),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

export const etapasTareasPlantillaRelations = relations(etapasTareasPlantilla, ({ one }) => ({
  tipoProceso: one(tiposProceso, {
    fields: [etapasTareasPlantilla.tipoProcesoId],
    references: [tiposProceso.id],
  }),
}));

export type EtapaTareaPlantilla       = typeof etapasTareasPlantilla.$inferSelect;
export type InsertEtapaTareaPlantilla = typeof etapasTareasPlantilla.$inferInsert;

export interface CreateTemplateDTO {
  tipoProcesoId?: number | null;
  legalStageCode: string;
  titulo:         string;
  descripcion?:   string | null;
  prioridad?:     TareaPrioridad;
  requerida?:     boolean;
  orden?:         number;
}

export interface UpdateTemplateDTO {
  titulo?:       string;
  descripcion?:  string | null;
  prioridad?:    TareaPrioridad;
  requerida?:    boolean;
  orden?:        number;
  activo?:       boolean;
}

export interface TemplateResponseDTO {
  id:             number;
  tipoProcesoId:  number | null;
  legalStageCode: string;
  titulo:         string;
  descripcion:    string | null;
  prioridad:      TareaPrioridad;
  requerida:      boolean;
  orden:          number;
  activo:         boolean;
}
```

- [ ] **Step 2: Create `stage-event.schema.ts`**

```typescript
// shared/schema/stage-event.schema.ts
import { mysqlTable, varchar, text, mysqlEnum, json, timestamp } from "drizzle-orm/mysql-core";
import { procesos } from "./proceso.schema";
import { relations } from "drizzle-orm";

export type StageEventTipo =
  | "etapa_iniciada"
  | "etapa_completada"
  | "tarea_completada"
  | "documento_subido"
  | "nota";

export const etapaEventos = mysqlTable("etapa_eventos", {
  id:             varchar("id",               { length: 36 }).primaryKey(),
  procesoId:      varchar("proceso_id",       { length: 36 }).notNull(),
  legalStageCode: varchar("legal_stage_code", { length: 50  }).notNull(),
  tipo:           mysqlEnum("tipo", [
    "etapa_iniciada", "etapa_completada",
    "tarea_completada", "documento_subido", "nota",
  ]).notNull(),
  descripcion:    text("descripcion").notNull(),
  metadatos:      json("metadatos"),
  creadoPor:      varchar("creado_por", { length: 36 }),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

export const etapaEventosRelations = relations(etapaEventos, ({ one }) => ({
  proceso: one(procesos, {
    fields: [etapaEventos.procesoId],
    references: [procesos.id],
  }),
}));

export type EtapaEvento       = typeof etapaEventos.$inferSelect;
export type InsertEtapaEvento = typeof etapaEventos.$inferInsert;

export interface StageEventResponseDTO {
  id:             string;
  procesoId:      string;
  legalStageCode: string;
  tipo:           StageEventTipo;
  descripcion:    string;
  metadatos:      Record<string, unknown> | null;
  creadoPor:      string | null;
  createdAt:      Date;
}
```

- [ ] **Step 3: Modify `tarea.schema.ts` — add fields to table and DTOs**

In the `tareas` table definition, after `procesoId`, add:
```typescript
legalStage: varchar("legal_stage", { length: 50 }),
requerida:  tinyint("requerida").notNull().default(0),
```

Update `CreateTareaDTO`:
```typescript
legalStage?: string | null;
requerida?:  boolean;
```

Update `UpdateTareaDTO`:
```typescript
legalStage?: string | null;
requerida?:  boolean;
```

Update `TareaResponseDTO`:
```typescript
legalStage: string | null;
requerida:  boolean;
```

Update `toDTO` helper in `tarea-storage.ts`:
```typescript
legalStage: t.legalStage ?? null,
requerida:  t.requerida === 1,
```

- [ ] **Step 4: Export from `shared/schema/index.ts`**

Add after existing exports:
```typescript
// Stage task templates
export {
  etapasTareasPlantilla, etapasTareasPlantillaRelations,
  type EtapaTareaPlantilla, type InsertEtapaTareaPlantilla,
  type CreateTemplateDTO, type UpdateTemplateDTO, type TemplateResponseDTO,
} from "./stage-task-template.schema";

// Stage events
export {
  etapaEventos, etapaEventosRelations,
  type EtapaEvento, type InsertEtapaEvento,
  type StageEventTipo, type StageEventResponseDTO,
} from "./stage-event.schema";
```

- [ ] **Step 5: Commit**

```bash
git add shared/schema/stage-task-template.schema.ts shared/schema/stage-event.schema.ts shared/schema/tarea.schema.ts shared/schema/index.ts
git commit -m "feat(schema): agregar schemas etapa_tareas_plantilla y etapa_eventos; campos legalStage/requerida a tareas"
```

---

## Task 3: Storage Models

**Files:**
- Create: `server/storage/storeage/models/stage-task-template-storage.ts`
- Create: `server/storage/storeage/models/stage-event-storage.ts`
- Modify: `server/storage/storeage/models/tarea-storage.ts` (update `toDTO`)
- Modify: `server/storage/storeage/database-storage.ts`

- [ ] **Step 1: Create `stage-task-template-storage.ts`**

```typescript
// server/storage/storeage/models/stage-task-template-storage.ts
import { eq, and, or, isNull, asc } from "drizzle-orm";
import {
  etapasTareasPlantilla,
  type EtapaTareaPlantilla,
  type CreateTemplateDTO,
  type UpdateTemplateDTO,
  type TemplateResponseDTO,
  type TareaPrioridad,
} from "@/shared/schema";
import type { Database } from "../database-storage";

function toDTO(r: EtapaTareaPlantilla): TemplateResponseDTO {
  return {
    id:             r.id,
    tipoProcesoId:  r.tipoProcesoId ?? null,
    legalStageCode: r.legalStageCode,
    titulo:         r.titulo,
    descripcion:    r.descripcion ?? null,
    prioridad:      r.prioridad as TareaPrioridad,
    requerida:      r.requerida === 1,
    orden:          r.orden,
    activo:         r.activo === 1,
  };
}

export class StageTaskTemplateStorage {
  constructor(private db: Database) {}

  async getByStage(
    legalStageCode: string,
    tipoProcesoId?: number | null,
  ): Promise<TemplateResponseDTO[]> {
    const rows = await this.db
      .select()
      .from(etapasTareasPlantilla)
      .where(
        and(
          eq(etapasTareasPlantilla.legalStageCode, legalStageCode),
          eq(etapasTareasPlantilla.activo, 1),
          tipoProcesoId != null
            ? or(
                eq(etapasTareasPlantilla.tipoProcesoId, tipoProcesoId),
                isNull(etapasTareasPlantilla.tipoProcesoId),
              )
            : isNull(etapasTareasPlantilla.tipoProcesoId),
        ),
      )
      .orderBy(asc(etapasTareasPlantilla.orden));

    // Dedup: specific overrides generic by titulo
    if (tipoProcesoId == null) return rows.map(toDTO);
    const seen = new Map<string, EtapaTareaPlantilla>();
    for (const row of rows) {
      const key = row.titulo.trim().toLowerCase();
      const existing = seen.get(key);
      if (!existing || row.tipoProcesoId !== null) seen.set(key, row);
    }
    return Array.from(seen.values())
      .sort((a, b) => a.orden - b.orden)
      .map(toDTO);
  }

  async list(
    tipoProcesoId?: number | null,
    legalStageCode?: string,
  ): Promise<TemplateResponseDTO[]> {
    const conditions = [];
    if (tipoProcesoId != null) {
      conditions.push(
        or(
          eq(etapasTareasPlantilla.tipoProcesoId, tipoProcesoId),
          isNull(etapasTareasPlantilla.tipoProcesoId),
        ),
      );
    }
    if (legalStageCode) {
      conditions.push(eq(etapasTareasPlantilla.legalStageCode, legalStageCode));
    }
    const rows = await this.db
      .select()
      .from(etapasTareasPlantilla)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(etapasTareasPlantilla.orden));
    return rows.map(toDTO);
  }

  async create(data: CreateTemplateDTO): Promise<TemplateResponseDTO> {
    const result = await this.db.insert(etapasTareasPlantilla).values({
      tipoProcesoId:  data.tipoProcesoId ?? null,
      legalStageCode: data.legalStageCode,
      titulo:         data.titulo,
      descripcion:    data.descripcion ?? null,
      prioridad:      data.prioridad ?? "media",
      requerida:      data.requerida ? 1 : 0,
      orden:          data.orden ?? 0,
      activo:         1,
    });
    // Use insertId from MySQL result header — avoids race condition with full-table scan
    const insertId = Number((result as any).insertId ?? (result as any)[0]?.insertId);
    const [row] = await this.db
      .select()
      .from(etapasTareasPlantilla)
      .where(eq(etapasTareasPlantilla.id, insertId));
    return toDTO(row);
  }

  async update(id: number, data: UpdateTemplateDTO): Promise<TemplateResponseDTO | null> {
    await this.db
      .update(etapasTareasPlantilla)
      .set({
        ...(data.titulo       !== undefined && { titulo:       data.titulo }),
        ...(data.descripcion  !== undefined && { descripcion:  data.descripcion }),
        ...(data.prioridad    !== undefined && { prioridad:    data.prioridad }),
        ...(data.requerida    !== undefined && { requerida:    data.requerida ? 1 : 0 }),
        ...(data.orden        !== undefined && { orden:        data.orden }),
        ...(data.activo       !== undefined && { activo:       data.activo ? 1 : 0 }),
      })
      .where(eq(etapasTareasPlantilla.id, id));
    const [row] = await this.db
      .select()
      .from(etapasTareasPlantilla)
      .where(eq(etapasTareasPlantilla.id, id));
    return row ? toDTO(row) : null;
  }

  async delete(id: number): Promise<void> {
    await this.db
      .update(etapasTareasPlantilla)
      .set({ activo: 0 })
      .where(eq(etapasTareasPlantilla.id, id));
  }

  async getById(id: number): Promise<TemplateResponseDTO | null> {
    const [row] = await this.db
      .select()
      .from(etapasTareasPlantilla)
      .where(eq(etapasTareasPlantilla.id, id));
    return row ? toDTO(row) : null;
  }
}
```

- [ ] **Step 2: Create `stage-event-storage.ts`**

```typescript
// server/storage/storeage/models/stage-event-storage.ts
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  etapaEventos,
  type EtapaEvento,
  type StageEventTipo,
  type StageEventResponseDTO,
} from "@/shared/schema";
import type { Database } from "../database-storage";

function toDTO(r: EtapaEvento): StageEventResponseDTO {
  return {
    id:             r.id,
    procesoId:      r.procesoId,
    legalStageCode: r.legalStageCode,
    tipo:           r.tipo as StageEventTipo,
    descripcion:    r.descripcion,
    metadatos:      r.metadatos as Record<string, unknown> | null,
    creadoPor:      r.creadoPor ?? null,
    createdAt:      r.createdAt,
  };
}

export class StageEventStorage {
  constructor(private db: Database) {}

  async insert(data: {
    procesoId:      string;
    legalStageCode: string;
    tipo:           StageEventTipo;
    descripcion:    string;
    metadatos?:     Record<string, unknown>;
    creadoPor?:     string | null;
  }): Promise<StageEventResponseDTO> {
    const id = randomUUID();
    await this.db.insert(etapaEventos).values({
      id,
      procesoId:      data.procesoId,
      legalStageCode: data.legalStageCode,
      tipo:           data.tipo,
      descripcion:    data.descripcion,
      metadatos:      data.metadatos ?? null,
      creadoPor:      data.creadoPor ?? null,
    });
    const [row] = await this.db
      .select()
      .from(etapaEventos)
      .where(eq(etapaEventos.id, id));
    return toDTO(row);
  }

  async getByStage(
    procesoId: string,
    legalStageCode: string,
  ): Promise<StageEventResponseDTO[]> {
    const rows = await this.db
      .select()
      .from(etapaEventos)
      .where(
        and(
          eq(etapaEventos.procesoId, procesoId),
          eq(etapaEventos.legalStageCode, legalStageCode),
        ),
      )
      .orderBy(asc(etapaEventos.createdAt));   // chronological per spec
    return rows.map(toDTO);
  }
}
```

- [ ] **Step 3: Register in `database-storage.ts`**

Add imports at top of file (after existing imports):
```typescript
import { StageTaskTemplateStorage } from "./models/stage-task-template-storage";
import { StageEventStorage } from "./models/stage-event-storage";
```

Add public fields in `DatabaseStorage` class (after `calendar`):
```typescript
public stageTemplates: StageTaskTemplateStorage;
public stageEvents:    StageEventStorage;
```

Add in constructor (after `this.calendar = ...`):
```typescript
this.stageTemplates = new StageTaskTemplateStorage(this.db);
this.stageEvents    = new StageEventStorage(this.db);
```

- [ ] **Step 4: Update `tarea-storage.ts` toDTO helper**

In `toDTO` function, add to returned object:
```typescript
legalStage: t.legalStage ?? null,
requerida:  t.requerida === 1,
```

- [ ] **Step 5: Commit**

```bash
git add server/storage/storeage/models/stage-task-template-storage.ts server/storage/storeage/models/stage-event-storage.ts server/storage/storeage/database-storage.ts server/storage/storeage/models/tarea-storage.ts
git commit -m "feat(storage): StageTaskTemplateStorage y StageEventStorage; actualizar tarea toDTO"
```

---

## Task 4: Seed de plantillas

**Files:**
- Create: `server/db/seeds/stage-templates.seed.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Create seed file**

```typescript
// server/db/seeds/stage-templates.seed.ts
import { eq, and } from "drizzle-orm";
import type { Database } from "../../storage/storeage/database-storage.js";
import { etapasTareasPlantilla } from "@/shared/schema";

interface PlantillaDefinicion {
  legalStageCode: string;
  titulo:         string;
  prioridad:      "baja" | "media" | "alta" | "urgente";
  requerida:      boolean;
  orden:          number;
}

const PLANTILLAS_DEFAULT: PlantillaDefinicion[] = [
  { legalStageCode: "FILED",             titulo: "Revisar escrito de demanda",             prioridad: "alta",    requerida: true,  orden: 1 },
  { legalStageCode: "ADMITTED",          titulo: "Notificar al cliente de admisión",        prioridad: "alta",    requerida: true,  orden: 1 },
  { legalStageCode: "NOTIFIED",          titulo: "Confirmar notificación al demandado",     prioridad: "alta",    requerida: true,  orden: 1 },
  { legalStageCode: "ANSWERED",          titulo: "Analizar contestación de demanda",        prioridad: "alta",    requerida: true,  orden: 1 },
  { legalStageCode: "EVIDENCE",          titulo: "Recopilar pruebas documentales",          prioridad: "alta",    requerida: true,  orden: 1 },
  { legalStageCode: "EVIDENCE",          titulo: "Preparar lista de testigos",              prioridad: "media",   requerida: false, orden: 2 },
  { legalStageCode: "HEARING",           titulo: "Confirmar fecha de audiencia",            prioridad: "urgente", requerida: true,  orden: 1 },
  { legalStageCode: "HEARING",           titulo: "Preparar argumentos para audiencia",      prioridad: "alta",    requerida: false, orden: 2 },
  { legalStageCode: "CLOSING_ARGUMENTS", titulo: "Redactar alegatos finales",               prioridad: "alta",    requerida: true,  orden: 1 },
  { legalStageCode: "JUDGMENT",          titulo: "Notificar sentencia al cliente",          prioridad: "urgente", requerida: true,  orden: 1 },
];

export async function seedStageTemplates(db: Database): Promise<void> {
  for (const p of PLANTILLAS_DEFAULT) {
    const existing = await db
      .select()
      .from(etapasTareasPlantilla)
      .where(
        and(
          eq(etapasTareasPlantilla.legalStageCode, p.legalStageCode),
          eq(etapasTareasPlantilla.titulo, p.titulo),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(etapasTareasPlantilla).values({
        tipoProcesoId:  null,
        legalStageCode: p.legalStageCode,
        titulo:         p.titulo,
        prioridad:      p.prioridad,
        requerida:      p.requerida ? 1 : 0,
        orden:          p.orden,
        activo:         1,
      });
    }
  }
}
```

- [ ] **Step 2: Call seed from `server/index.ts`**

In `seedDatabase()` function, after `await seedLegalStages(db);`, add:
```typescript
// Seed plantillas de tareas por etapa
const { seedStageTemplates } = await import("./db/seeds/stage-templates.seed.js");
await seedStageTemplates(db);
```

- [ ] **Step 3: Commit**

```bash
git add server/db/seeds/stage-templates.seed.ts server/index.ts
git commit -m "feat(seed): plantillas de tareas por etapa procesal"
```

---

## Task 5: API — Stage Task Templates

**Files:**
- Create: `server/routes/stage-task-templates.ts`
- Modify: `server/routes/index.ts`

- [ ] **Step 1: Create route file**

```typescript
// server/routes/stage-task-templates.ts
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage/storeage/database-storage.js";
import { authenticate } from "../auth.js";
import { LEGAL_STAGE_CODES } from "@/shared/schema/legal-stage.schema";

const router = Router();

// GET /api/legal-stage-templates?tipoProcesoId=&stageCode=
router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tipoProcesoId = req.query.tipoProcesoId ? Number(req.query.tipoProcesoId) : undefined;
    const stageCode     = req.query.stageCode as string | undefined;
    const templates     = await storage.stageTemplates.list(tipoProcesoId, stageCode);
    res.json(templates);
  } catch (err) { next(err); }
});

// POST /api/legal-stage-templates
router.post("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (user.rol.nombre === "cliente") {
      res.status(403).json({ error: "Sin permiso" });
      return;
    }
    const { tipoProcesoId, legalStageCode, titulo, descripcion, prioridad, requerida, orden } = req.body;

    if (!legalStageCode || !titulo) {
      res.status(400).json({ error: "legalStageCode y titulo son requeridos" });
      return;
    }
    if (!(LEGAL_STAGE_CODES as readonly string[]).includes(legalStageCode)) {
      res.status(400).json({ error: `legalStageCode inválido: ${legalStageCode}` });
      return;
    }
    const template = await storage.stageTemplates.create({
      tipoProcesoId: tipoProcesoId ?? null,
      legalStageCode,
      titulo,
      descripcion:   descripcion ?? null,
      prioridad:     prioridad ?? "media",
      requerida:     !!requerida,
      orden:         orden ?? 0,
    });
    res.status(201).json(template);
  } catch (err) { next(err); }
});

// PATCH /api/legal-stage-templates/:id
router.patch("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (user.rol.nombre === "cliente") {
      res.status(403).json({ error: "Sin permiso" });
      return;
    }
    const id  = Number(req.params.id);
    const upd = await storage.stageTemplates.update(id, req.body);
    if (!upd) { res.status(404).json({ error: "Plantilla no encontrada" }); return; }
    res.json(upd);
  } catch (err) { next(err); }
});

// DELETE /api/legal-stage-templates/:id
router.delete("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (user.rol.nombre === "cliente") {
      res.status(403).json({ error: "Sin permiso" });
      return;
    }
    await storage.stageTemplates.delete(Number(req.params.id));
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 2: Register route in `server/routes/index.ts`**

Add import:
```typescript
import stageTemplatesRouter from "./stage-task-templates.js";
```

Add registration (inside `registerRoutes`, after existing routes):
```typescript
app.use("/api/legal-stage-templates", stageTemplatesRouter);
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/stage-task-templates.ts server/routes/index.ts
git commit -m "feat(api): CRUD endpoints para plantillas de etapa procesal"
```

---

## Task 6: API — Stage Events (Timeline)

**Files:**
- Create: `server/routes/stage-events.ts`
- Modify: `server/routes/index.ts`

- [ ] **Step 1: Create route file**

```typescript
// server/routes/stage-events.ts
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage/storeage/database-storage.js";
import { authenticate } from "../auth.js";

const router = Router({ mergeParams: true }); // inherits :procesoId

// GET /api/procesos/:procesoId/stage-events?stage=FILED
router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const procesoId = req.params.procesoId;
    const stage     = req.query.stage as string | undefined;
    if (!stage) {
      res.status(400).json({ error: "Parámetro stage es requerido" });
      return;
    }
    const events = await storage.stageEvents.getByStage(procesoId, stage);
    res.json(events);
  } catch (err) { next(err); }
});

// POST /api/procesos/:procesoId/stage-events (manual notes)
router.post("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user      = (req as any).user;
    const procesoId = req.params.procesoId;
    const { legalStageCode, descripcion } = req.body as {
      legalStageCode: string;
      descripcion:    string;
    };
    if (!legalStageCode || !descripcion?.trim()) {
      res.status(400).json({ error: "legalStageCode y descripcion son requeridos" });
      return;
    }
    const event = await storage.stageEvents.insert({
      procesoId,
      legalStageCode,
      tipo:        "nota",
      descripcion: descripcion.trim(),
      creadoPor:   user.idProfile ?? null,
    });
    res.status(201).json(event);
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 2: Register in `server/routes/index.ts`**

Add import:
```typescript
import stageEventsRouter from "./stage-events.js";
```

Add registration (after procesos routes, using nested param):
```typescript
app.use("/api/procesos/:procesoId/stage-events", stageEventsRouter);
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/stage-events.ts server/routes/index.ts
git commit -m "feat(api): endpoints de timeline por etapa procesal"
```

---

## Task 7: Gate + Materialization en PATCH legal-stage

**Files:**
- Modify: `server/routes/procesos.ts` (lines ~639–738)

- [ ] **Step 1: Add gate + materialization to existing handler**

Replace the existing handler body (from after the `isValidTransition` check to the `updateLegalStage` call) with:

```typescript
// ── Gate: tareas requeridas pendientes ──────────────────────────────────
const oldStage = proceso.legalStage ?? null;

if (oldStage) {
  const bloqueantes = await storage.tareas.getRequiredPendingByStage(procesoId, oldStage);
  if (bloqueantes.length > 0) {
    res.status(422).json({
      error:             "STAGE_BLOCKED",
      message:           "Hay tareas requeridas sin completar en esta etapa",
      tareasBloqueantes: bloqueantes.map(t => ({
        id:        t.id,
        titulo:    t.titulo,
        estado:    t.estado,
        prioridad: t.prioridad,
      })),
    });
    return;
  }
}

// ── Calcular fecha de vencimiento ────────────────────────────────────────
let fechaVencimiento: Date | null = fechaManual ? new Date(fechaManual) : null;
if (!fechaVencimiento) {
  const etapa = await storage.legalStages.getByCodigoYTipo(legalStage, proceso.tipoProcesoId ?? null);
  if (etapa && etapa.diasLegales > 0) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + etapa.diasLegales);
    fechaVencimiento = fecha;
  }
}

// ── Persistir + eventos + materializar (todo en orden, errores propagan) ─
await storage.procesos.updateLegalStage(procesoId, legalStage, fechaVencimiento);

if (oldStage) {
  await storage.stageEvents.insert({
    procesoId, legalStageCode: oldStage,
    tipo: "etapa_completada", descripcion: `Etapa completada: ${oldStage}`,
  });
}
await storage.stageEvents.insert({
  procesoId, legalStageCode: legalStage,
  tipo: "etapa_iniciada",
  descripcion: fechaVencimiento
    ? `Etapa iniciada. Vencimiento: ${fechaVencimiento.toLocaleDateString("es-CO")}`
    : "Etapa iniciada",
});

// Materializar plantillas de la nueva etapa
const plantillas = await storage.stageTemplates.getByStage(legalStage, proceso.tipoProcesoId ?? null);
for (const p of plantillas) {
  await storage.tareas.create({
    procesoId,
    legalStage:        p.legalStageCode,
    requerida:         p.requerida ? 1 : 0,
    titulo:            p.titulo,
    descripcion:       p.descripcion ?? null,
    prioridad:         p.prioridad,
    creadoPor:         idProfile ?? procesoId,
    creadoPorNombre:   "Sistema",
    orden:             p.orden,
    estado:            "pendiente",
  } as any);
}
```

- [ ] **Step 2: Add `getRequiredPendingByStage` to `TareaStorage`**

In `server/storage/storeage/models/tarea-storage.ts`, add method:
```typescript
async getRequiredPendingByStage(
  procesoId: string,
  legalStage: string,
): Promise<Tarea[]> {
  return this.db
    .select()
    .from(tareas)
    .where(
      and(
        eq(tareas.procesoId,   procesoId),
        eq(tareas.legalStage,  legalStage),
        eq(tareas.requerida,   1),
        inArray(tareas.estado, ["pendiente", "en_progreso"]),
      ),
    );
}
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/procesos.ts server/storage/storeage/models/tarea-storage.ts
git commit -m "feat(api): gate de etapa + materialización de plantillas + eventos automáticos"
```

---

## Task 8: Tareas Route — legalStage + auto-event

**Files:**
- Modify: `server/routes/tareas.ts`

- [ ] **Step 1: Add `?stage=` filter to GET tareas**

In the handler for `GET /api/procesos/:id/tareas`, before calling `storage.tareas.getByProceso(...)`:
```typescript
const stage = req.query.stage as string | undefined;
```
Pass it to the storage call. In `TareaStorage.getByProceso`, add optional `stage` param and add `and(eq(tareas.legalStage, stage))` condition when present.

- [ ] **Step 2: Accept `legalStage` + `requerida` in POST (crear tarea)**

In create handler, extract from body:
```typescript
const { titulo, descripcion, prioridad, fechaLimite, asignadoA, legalStage, requerida } = req.body;
```
Pass to `storage.tareas.create(...)`:
```typescript
legalStage: legalStage ?? null,
requerida:  requerida ? 1 : 0,
```

- [ ] **Step 3: Auto-event when task completed**

In `PATCH /tareas/:tareaId/estado` handler, after updating status, add:
```typescript
if (body.estado === "completada") {
  const tarea = await storage.tareas.getById(tareaId);
  if (tarea?.legalStage) {
    await storage.stageEvents.insert({
      procesoId: tarea.procesoId,
      legalStageCode: tarea.legalStage,
      tipo: "tarea_completada",
      descripcion: `Tarea completada: ${tarea.titulo}`,
      metadatos: { tareaId: tarea.id, titulo: tarea.titulo },
      creadoPor: (req as any).user?.idProfile ?? null,
    });
  }
}
```

Add `getById` to `TareaStorage`:
```typescript
async getById(id: string): Promise<Tarea | null> {
  const [row] = await this.db.select().from(tareas).where(eq(tareas.id, id));
  return row ?? null;
}
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/tareas.ts server/storage/storeage/models/tarea-storage.ts
git commit -m "feat(api): filtro por etapa en tareas, legalStage/requerida en create, auto-evento tarea_completada"
```

---

## Task 9: Documentos Route — legalStage + auto-event

**Files:**
- Modify: `server/routes/documentos.ts`

- [ ] **Step 1: Add `?stage=` filter and `legalStage` to documentos**

In GET handler, add `?stage=` filter (skip if not provided; use `isNull` filter if `stage=__general__`).

In POST/upload handler, read `legalStage` from multipart body fields and persist to DB.

Add auto-event after successful upload:
```typescript
if (legalStage && legalStage !== "__general__") {
  await storage.stageEvents.insert({
    procesoId,
    legalStageCode: legalStage,
    tipo:        "documento_subido",
    descripcion: `Documento subido: ${doc.nombre}`,
    metadatos:   { documentoId: doc.id, nombre: doc.nombre },
    creadoPor:   (req as any).user?.idProfile ?? null,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/documentos.ts
git commit -m "feat(api): legalStage en documentos, filtro por etapa, auto-evento documento_subido"
```

---

## Task 10: Frontend Services

**Files:**
- Create: `lib/services/stageEventService.ts`
- Create: `lib/services/stageTemplateService.ts`

- [ ] **Step 1: Create `stageEventService.ts`**

```typescript
// lib/services/stageEventService.ts
import apiClient from "@/lib/apiClient";
import type { StageEventResponseDTO } from "@/shared/schema";

export async function getStageEvents(
  procesoId: string,
  stage: string,
): Promise<StageEventResponseDTO[]> {
  const res = await apiClient.get(`/procesos/${procesoId}/stage-events?stage=${stage}`);
  return res.data;
}

export async function addStageNote(
  procesoId: string,
  legalStageCode: string,
  descripcion: string,
): Promise<StageEventResponseDTO> {
  const res = await apiClient.post(`/procesos/${procesoId}/stage-events`, {
    legalStageCode,
    descripcion,
  });
  return res.data;
}
```

- [ ] **Step 2: Create `stageTemplateService.ts`**

```typescript
// lib/services/stageTemplateService.ts
import apiClient from "@/lib/apiClient";
import type { TemplateResponseDTO, CreateTemplateDTO } from "@/shared/schema";

export async function getTemplates(
  stageCode?: string,
  tipoProcesoId?: number,
): Promise<TemplateResponseDTO[]> {
  const params = new URLSearchParams();
  if (stageCode)       params.set("stageCode",     stageCode);
  if (tipoProcesoId)   params.set("tipoProcesoId", String(tipoProcesoId));
  const res = await apiClient.get(`/legal-stage-templates?${params.toString()}`);
  return res.data;
}

export async function createTemplate(data: CreateTemplateDTO): Promise<TemplateResponseDTO> {
  const res = await apiClient.post("/legal-stage-templates", data);
  return res.data;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/services/stageEventService.ts lib/services/stageTemplateService.ts
git commit -m "feat(services): stageEventService y stageTemplateService"
```

---

## Task 11: StageDetailSheet Component

**Files:**
- Create: `components/proceso/StageDetailSheet.tsx`

- [ ] **Step 1: Create component**

```typescript
// components/proceso/StageDetailSheet.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, TextInput, Modal, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { EtapaProcesoDTO, StageEventResponseDTO, TareaResponseDTO } from "@/shared/schema";
import { getStageEvents, addStageNote } from "@/lib/services/stageEventService";
import { getTareasByProceso } from "@/lib/services/tareaService";
import apiClient from "@/lib/apiClient";

type Tab = "tareas" | "timeline" | "documentos";

interface Props {
  visible:        boolean;
  procesoId:      string;
  etapa:          EtapaProcesoDTO;
  isCurrentStage: boolean;
  onClose:        () => void;
  onAddTarea?:    (legalStage: string) => void;
  onUploadDoc?:   (legalStage: string) => void;
}

const EVENT_ICONS: Record<string, string> = {
  etapa_iniciada:    "rocket-outline",
  etapa_completada:  "flag-outline",
  tarea_completada:  "checkmark-circle-outline",
  documento_subido:  "document-outline",
  nota:              "create-outline",
};

export function StageDetailSheet({
  visible, procesoId, etapa, isCurrentStage, onClose, onAddTarea, onUploadDoc,
}: Props) {
  const insets          = useSafeAreaInsets();
  const [tab, setTab]   = useState<Tab>("tareas");
  const [tareas,   setTareas]   = useState<TareaResponseDTO[]>([]);
  const [events,   setEvents]   = useState<StageEventResponseDTO[]>([]);
  const [docs,     setDocs]     = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [nota,     setNota]     = useState("");
  const [sending,  setSending]  = useState(false);

  const load = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    const [t, e, d] = await Promise.all([
      getTareasByProceso(procesoId, etapa.codigo),
      getStageEvents(procesoId, etapa.codigo),
      apiClient.get(`/procesos/${procesoId}/documentos?stage=${etapa.codigo}`).then(r => r.data).catch(() => []),
    ]);
    setTareas(t?.tareas ?? []);
    setEvents(e);
    setDocs(Array.isArray(d) ? d : []);
    setLoading(false);
  }, [visible, procesoId, etapa.codigo]);

  useEffect(() => { load(); }, [load]);

  const completadas = tareas.filter(t => t.estado === "completada").length;
  const total       = tareas.length;
  const pct         = total > 0 ? Math.round((completadas / total) * 100) : 0;

  const sendNote = async () => {
    if (!nota.trim() || sending) return;
    setSending(true);
    await addStageNote(procesoId, etapa.codigo, nota.trim());
    setNota("");
    const e = await getStageEvents(procesoId, etapa.codigo);
    setEvents(e);
    setSending(false);
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "tareas",    label: "Tareas",     icon: "checkmark-circle-outline" },
    { key: "timeline",  label: "Timeline",   icon: "time-outline" },
    { key: "documentos",label: "Documentos", icon: "document-outline" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.stageDot, { backgroundColor: etapa.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.etapaNombre}>{etapa.nombre}</Text>
            {etapa.completada && (
              <Text style={styles.etapaCompletada}>Etapa completada</Text>
            )}
            {etapa.esActual && (
              <Text style={styles.etapaActual}>Etapa actual</Text>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={Colors.textLight} />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
            >
              <Ionicons
                name={t.icon as any}
                size={13}
                color={tab === t.key ? Colors.primary : Colors.textLight}
              />
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={Colors.primary} />
        ) : (
          <>
            {/* ── Tab: Tareas ── */}
            {tab === "tareas" && (
              <View style={{ flex: 1 }}>
                {/* Progress */}
                {total > 0 && (
                  <View style={styles.progressWrap}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                    </View>
                    <Text style={styles.progressText}>{completadas}/{total} completadas</Text>
                  </View>
                )}
                <FlatList
                  data={tareas}
                  keyExtractor={t => t.id}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}
                  renderItem={({ item: t }) => (
                    <View style={styles.tareaRow}>
                      <View style={[
                        styles.estadoChip,
                        t.estado === "completada" && { backgroundColor: "#D1FAE5" },
                        t.estado === "en_progreso" && { backgroundColor: "#FEF3C7" },
                        t.estado === "pendiente" && { backgroundColor: "#F3F4F6" },
                      ]}>
                        <Text style={styles.estadoText}>{t.estado}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tareaTitulo}>{t.titulo}</Text>
                      </View>
                      {t.requerida && (
                        <View style={styles.reqBadge}>
                          <Ionicons name="lock-closed" size={9} color="#0F2640" />
                          <Text style={styles.reqText}>Requerida</Text>
                        </View>
                      )}
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>Sin tareas en esta etapa</Text>
                  }
                />
                {isCurrentStage && (
                  <Pressable
                    style={styles.addBtn}
                    onPress={() => onAddTarea?.(etapa.codigo)}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Añadir tarea</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* ── Tab: Timeline ── */}
            {tab === "timeline" && (
              <View style={{ flex: 1 }}>
                <FlatList
                  data={events}
                  keyExtractor={e => e.id}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}
                  renderItem={({ item: e }) => (
                    <View style={styles.eventRow}>
                      <View style={styles.eventIcon}>
                        <Ionicons
                          name={(EVENT_ICONS[e.tipo] ?? "ellipse-outline") as any}
                          size={14}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventDesc}>{e.descripcion}</Text>
                        <Text style={styles.eventTime}>
                          {new Date(e.createdAt).toLocaleDateString("es-CO", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>Sin eventos en esta etapa</Text>
                  }
                />
                {/* Add note */}
                <View style={styles.noteRow}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Añadir nota..."
                    value={nota}
                    onChangeText={setNota}
                    multiline
                  />
                  <Pressable
                    style={[styles.sendBtn, (!nota.trim() || sending) && { opacity: 0.4 }]}
                    onPress={sendNote}
                    disabled={!nota.trim() || sending}
                  >
                    {sending
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="send" size={14} color="#fff" />
                    }
                  </Pressable>
                </View>
              </View>
            )}

            {/* ── Tab: Documentos ── */}
            {tab === "documentos" && (
              <View style={{ flex: 1 }}>
                <FlatList
                  data={docs}
                  keyExtractor={d => d.id}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}
                  renderItem={({ item: d }) => (
                    <View style={styles.tareaRow}>
                      <Ionicons name="document-outline" size={16} color={Colors.textLight} />
                      <Text style={[styles.tareaTitulo, { flex: 1 }]}>{d.nombre ?? d.name ?? "Documento"}</Text>
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>Sin documentos en esta etapa</Text>
                  }
                />
                {isCurrentStage && (
                  <Pressable
                    style={[styles.addBtn]}
                    onPress={() => onUploadDoc?.(etapa.codigo)}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Subir documento</Text>
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "78%", minHeight: 300,
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#F0F2F4",
  },
  stageDot:      { width: 12, height: 12, borderRadius: 6 },
  etapaNombre:   { fontSize: 15, fontWeight: "700", color: "#1B2B3B" },
  etapaActual:   { fontSize: 11, color: "#2196A6", marginTop: 2 },
  etapaCompletada: { fontSize: 11, color: "#27AE7A", marginTop: 2 },
  tabRow: {
    flexDirection: "row", paddingHorizontal: 12,
    paddingVertical: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: "#F0F2F4",
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F4F6F8",
  },
  tabBtnActive:  { backgroundColor: "#E8F4F5" },
  tabLabel:      { fontSize: 12, color: "#6B7B8D" },
  tabLabelActive:{ fontSize: 12, color: "#2196A6", fontWeight: "600" },
  progressWrap:  { paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
  progressBar:   { height: 4, backgroundColor: "#E8ECF0", borderRadius: 2, overflow: "hidden" },
  progressFill:  { height: "100%", backgroundColor: "#2196A6", borderRadius: 2 },
  progressText:  { fontSize: 11, color: "#6B7B8D", textAlign: "right" },
  tareaRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F9FAFB", borderRadius: 10, padding: 10,
  },
  estadoChip:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  estadoText:    { fontSize: 10, fontWeight: "600", color: "#374151" },
  tareaTitulo:   { fontSize: 13, color: "#1B2B3B" },
  reqBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#E0E7FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  reqText:       { fontSize: 9, color: "#0F2640", fontWeight: "600" },
  eventRow:      { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  eventIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#E8F4F5", alignItems: "center", justifyContent: "center",
  },
  eventDesc:     { fontSize: 13, color: "#1B2B3B" },
  eventTime:     { fontSize: 10, color: "#9AAABB", marginTop: 2 },
  noteRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0F2F4",
  },
  noteInput: {
    flex: 1, backgroundColor: "#F4F6F8", borderRadius: 10, padding: 10,
    fontSize: 13, color: "#1B2B3B", maxHeight: 80,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#2196A6", alignItems: "center", justifyContent: "center",
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginHorizontal: 16, marginTop: 8, backgroundColor: "#2196A6",
    borderRadius: 10, paddingVertical: 10,
  },
  addBtnText:    { fontSize: 13, fontWeight: "600", color: "#fff" },
  emptyText:     { textAlign: "center", color: "#9AAABB", fontSize: 13, marginTop: 24 },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/proceso/StageDetailSheet.tsx
git commit -m "feat(ui): StageDetailSheet con tabs tareas/timeline/documentos por etapa"
```

---

## Task 12: LegalStageStepper — Tappable + Blocker Badge

**Files:**
- Modify: `components/proceso/LegalStageStepper.tsx`

- [ ] **Step 1: Add `onStagePress` prop and blocker badge**

Add prop to component signature:
```typescript
interface Props {
  data:          LegalStagesResponseDTO;
  onStagePress?: (etapa: EtapaProcesoDTO) => void;
}
```

In `Step` component add `blockerCount?: number` prop and render badge:
```tsx
{blockerCount != null && blockerCount > 0 && (
  <View style={styles.blockerBadge}>
    <Text style={styles.blockerBadgeText}>⚠ {blockerCount}</Text>
  </View>
)}
```

Wrap each `Step` in a `Pressable` that calls `onStagePress?.(etapa)`.

Add styles:
```typescript
blockerBadge: {
  position: "absolute", top: -4, right: -4,
  backgroundColor: "#E05252", borderRadius: 8,
  paddingHorizontal: 4, paddingVertical: 1,
},
blockerBadgeText: { fontSize: 8, color: "#fff", fontWeight: "700" },
```

- [ ] **Step 2: Commit**

```bash
git add components/proceso/LegalStageStepper.tsx
git commit -m "feat(ui): LegalStageStepper tappable con badge de tareas bloqueantes"
```

---

## Task 13: case/[id].tsx — Wire StageDetailSheet

**Files:**
- Modify: `app/case/[id].tsx`

- [ ] **Step 1: Add state + imports**

```typescript
import { StageDetailSheet } from "@/components/proceso/StageDetailSheet";
// ...
const [selectedStage,      setSelectedStage]      = useState<EtapaProcesoDTO | null>(null);
const [stageSheetOpen,     setStageSheetOpen]     = useState(false);
const [newTareaLegalStage, setNewTareaLegalStage] = useState<string | null>(null);
// newTareaLegalStage is passed into the existing create-tarea modal/sheet
// so the new task is pre-assigned to the selected stage
```

- [ ] **Step 2: Pass `onStagePress` to LegalStageStepper**

```tsx
<LegalStageStepper
  data={legalStages}
  onStagePress={(etapa) => {
    setSelectedStage(etapa);
    setStageSheetOpen(true);
  }}
/>
```

- [ ] **Step 3: Add StageDetailSheet to render**

```tsx
{selectedStage && (
  <StageDetailSheet
    visible={stageSheetOpen}
    procesoId={proceso.id}
    etapa={selectedStage}
    isCurrentStage={selectedStage.esActual}
    onClose={() => setStageSheetOpen(false)}
    onAddTarea={(stage) => {
      setStageSheetOpen(false);
      // Pre-fill the existing create-tarea sheet with this stage:
      // 1. Find the existing state variable that toggles the create-tarea bottom sheet
      //    (look for setCreateTareaVisible or setShowCreateTarea in this file).
      // 2. Add: setNewTareaLegalStage(stage) — then pass legalStage={newTareaLegalStage}
      //    as a prop to the CreateTarea modal/sheet component.
      // 3. Inside the create-tarea form, default the legalStage field to this value.
      setNewTareaLegalStage(stage);
      setCreateTareaVisible(true); // replace with actual state toggle name used in this file
    }}
  />
)}
```

- [ ] **Step 4: Add stage filter chips to Tasks tab**

Above the `TareasList`, add horizontal stage chips to filter by stage. Active chip passes `?stage=CODE` to the tareas fetch.

- [ ] **Step 5: Commit**

```bash
git add app/case/[id].tsx
git commit -m "feat(ui): integrar StageDetailSheet en case/[id] + chips de filtro por etapa"
```

---

## Verification

- [ ] Run server: `npm run dev`
- [ ] Advance a stage that has required pending tasks → expect 422 `STAGE_BLOCKED`
- [ ] Complete all required tasks → advance succeeds, template tasks created for new stage
- [ ] Tap a stage in stepper → `StageDetailSheet` opens
- [ ] Add note in Timeline tab → appears in event list
- [ ] Upload document with stage tag → `documento_subido` event appears in timeline
- [ ] Existing `GET /api/procesos/:id/tareas` without `?stage=` still returns all tasks
