# Stage Tasks, Timeline & Gate — Design Spec

## Context

The existing `procesos` system already has legal stages (`legalStage` field + `etapas_por_tipo_proceso` table) and global tasks (`tareas` table linked to `procesoId`). Currently tasks, documents, and the timeline are attached to the whole proceso, not to individual stages. This redesign granularizes all three per stage, adds template tasks that auto-create when a stage is reached, and introduces a configurable gate that prevents advancing to the next stage while required tasks remain incomplete.

**Approach:** Option C — Minimal-invasion column additions + two new tables. No rewrites of existing proceso/tarea logic.

---

## Architecture

**New tables:**
- `etapa_tareas_plantilla` — template tasks per stage code (materialized into `tareas` on stage advance)
- `etapa_eventos` — timeline events per stage (automatic + manual notes)

**Modified tables:**
- `tareas` → add `legalStage VARCHAR(50)` + `requerida TINYINT(1) DEFAULT 0`
- `documentos` → add `legalStage VARCHAR(50)` (nullable)

**New files:**
- `migrations/0053_stage_task_templates.sql`
- `migrations/0054_stage_events.sql`
- `shared/schema/stage-task-template.schema.ts`
- `shared/schema/stage-event.schema.ts`
- `server/storage/storeage/models/stage-task-template-storage.ts`
- `server/storage/storeage/models/stage-event-storage.ts`
- `server/routes/stage-task-templates.ts`
- `server/routes/stage-events.ts`
- `server/db/seeds/stage-templates.seed.ts`
- `components/proceso/StageDetailSheet.tsx`

**Modified files:**
- `shared/schema/tarea.schema.ts` — add `legalStage`, `requerida` fields
- `shared/schema/index.ts` — export new schemas
- `server/storage/storeage/database-storage.ts` — register new storage models
- `server/storage/storeage/models/stage-event-storage.ts` — new
- `server/routes/tareas.ts` — accept `legalStage`, `requerida` in create/update; `?stage=` filter
- `server/routes/documentos.ts` — accept `legalStage` in upload; `?stage=` filter
- `server/routes/procesos.ts` — gate logic in `PATCH /:id/legal-stage`
- `server/services/legal-stage.service.ts` — (or equivalent) materialize templates + insert events on advance
- `server/index.ts` — call `seedStageTemplates`
- `components/proceso/LegalStageStepper.tsx` — make stages tappable, show blocker badges
- `app/case/[id].tsx` — stage filter chips on Tasks tab; stage column on Documents tab

---

## Section 1: Data Model

### Table: `etapa_tareas_plantilla`

```sql
CREATE TABLE `etapa_tareas_plantilla` (
  `id`               INT           NOT NULL AUTO_INCREMENT,
  `tipo_proceso_id`  INT           NULL,          -- NULL = all process types
  `legal_stage_code` VARCHAR(50)   NOT NULL,      -- 'FILED', 'EVIDENCE', etc.
  `titulo`           VARCHAR(255)  NOT NULL,
  `descripcion`      TEXT          NULL,
  `prioridad`        ENUM('baja','media','alta','urgente') NOT NULL DEFAULT 'media',
  `requerida`        TINYINT(1)   NOT NULL DEFAULT 0,  -- blocks stage advance if 1
  `orden`            INT           NOT NULL DEFAULT 0,
  `activo`           TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_templates_stage` (`legal_stage_code`),
  INDEX `idx_templates_tipo`  (`tipo_proceso_id`)
);
```

### Table: `etapa_eventos`

```sql
CREATE TABLE `etapa_eventos` (
  `id`               VARCHAR(36)   NOT NULL,
  `proceso_id`       VARCHAR(36)   NOT NULL,
  `legal_stage_code` VARCHAR(50)   NOT NULL,
  `tipo`             ENUM(
                       'etapa_iniciada',
                       'etapa_completada',
                       'tarea_completada',
                       'documento_subido',
                       'nota'
                     ) NOT NULL,
  `descripcion`      TEXT          NOT NULL,
  `metadatos`        JSON          NULL,           -- { tareaId, documentoId, ... }
  `creado_por`       VARCHAR(36)   NULL,           -- lawyerProfileId (null for system events)
  `created_at`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_eventos_proceso_stage` (`proceso_id`, `legal_stage_code`),
  INDEX `idx_eventos_proceso`       (`proceso_id`)
);
```

### Modified: `tareas`

```sql
ALTER TABLE `tareas`
  ADD COLUMN `legal_stage`  VARCHAR(50)  NULL AFTER `proceso_id`,
  ADD COLUMN `requerida`    TINYINT(1)   NOT NULL DEFAULT 0 AFTER `legal_stage`,
  ADD INDEX  `idx_tareas_stage` (`proceso_id`, `legal_stage`);
```

### Modified: `documentos`

```sql
ALTER TABLE `documentos`
  ADD COLUMN `legal_stage` VARCHAR(50) NULL AFTER `proceso_id`,
  ADD INDEX  `idx_docs_stage` (`proceso_id`, `legal_stage`);
```

---

## Section 2: Backend API

### New endpoints

#### Stage task templates
```
GET    /api/legal-stage-templates?tipoProcesoId=&stageCode=
POST   /api/legal-stage-templates
PATCH  /api/legal-stage-templates/:id
DELETE /api/legal-stage-templates/:id
```

Request body (POST/PATCH):
```json
{
  "tipoProcesoId": null,
  "legalStageCode": "EVIDENCE",
  "titulo": "Recopilar pruebas documentales",
  "descripcion": "...",
  "prioridad": "alta",
  "requerida": true,
  "orden": 1
}
```

#### Stage events (timeline)
```
GET  /api/procesos/:id/stage-events?stage=FILED
POST /api/procesos/:id/stage-events          (manual notes only)
```

POST body:
```json
{ "legalStageCode": "FILED", "descripcion": "Nota del abogado..." }
```

### Modified endpoints

**`GET /api/procesos/:id/tareas?stage=FILED`**
- Without `stage` → returns all tasks (backward compatible)
- With `stage` → filters by `legal_stage = stage`

**`POST /api/procesos/:id/tareas`**
- Accepts `legalStage?: string` and `requerida?: boolean` in body

**`PATCH /api/procesos/:id/tareas/:tareaId`**
- Accepts `legalStage?: string` and `requerida?: boolean`

**`GET /api/procesos/:id/documentos?stage=FILED`**
- Without `stage` → returns all (backward compatible)
- With `stage=GENERAL` → returns docs without stage (`legal_stage IS NULL`)

**`POST /api/procesos/:id/documentos`**
- Accepts `legalStage?: string` in multipart body

**`PATCH /api/procesos/:id/legal-stage`** *(gate added)*

Logic:
1. Load tasks where `proceso_id = :id AND legal_stage = currentStage AND requerida = 1 AND estado IN ('pendiente','en_progreso')`
2. If any exist → respond `422`:
   ```json
   {
     "error": "STAGE_BLOCKED",
     "message": "Hay tareas requeridas sin completar en esta etapa",
     "tareasBloqueantes": [{ "id", "titulo", "estado", "prioridad" }]
   }
   ```
3. If none → advance stage, then:
   - Insert `etapa_completada` event for old stage
   - Insert `etapa_iniciada` event for new stage
   - Materialize templates: load `etapa_tareas_plantilla` matching `legal_stage_code = newStage AND (tipo_proceso_id = proceso.tipoProcesoId OR tipo_proceso_id IS NULL)`, insert them as `tareas` rows with `legal_stage = newStage`

---

## Section 3: UI / Frontend

### LegalStageStepper (modified)

- Each `Step` becomes a `Pressable` that calls `onStagePress(etapa)`
- Stages with blocker tasks show a red badge: `⚠ 2` (count of required pending tasks)
- `LegalStageStepper` receives new prop: `onStagePress: (etapa: EtapaProcesoDTO) => void`

### StageDetailSheet (new component)

Bottom sheet (`@gorhom/bottom-sheet` or equivalent). Props:
```typescript
interface StageDetailSheetProps {
  procesoId: string;
  etapa: EtapaProcesoDTO;
  isCurrentStage: boolean;
  onClose: () => void;
}
```

Internal tabs:

**Tab "Tareas"**
- Fetches `GET /api/procesos/:id/tareas?stage=CODE`
- Progress bar: `completadas / total`
- Each task row: title, status chip, priority dot, `🔒` icon if `requerida`
- `+ Añadir tarea` button → opens existing CreateTarea modal with `legalStage` pre-filled

**Tab "Timeline"**
- Fetches `GET /api/procesos/:id/stage-events?stage=CODE`
- Chronological list with icons per event type:
  - 🚀 `etapa_iniciada` — "Etapa iniciada"
  - ✅ `tarea_completada` — "Tarea completada: [titulo]"
  - 📄 `documento_subido` — "Documento subido: [nombre]"
  - 🏁 `etapa_completada` — "Etapa finalizada"
  - 📝 `nota` — free text from lawyer
- `+ Añadir nota` button → inline text input + send button

**Tab "Documentos"**
- Fetches `GET /api/procesos/:id/documentos?stage=CODE`
- `+ Subir documento` → existing upload flow with `legalStage` pre-filled

### Botón "Avanzar etapa" (modified)

On `PATCH` response:
- `200` → success toast, refresh stages
- `422 STAGE_BLOCKED` → modal "No puedes avanzar" listing `tareasBloqueantes` with title + status

### `app/case/[id].tsx` (minor)

- **Tasks tab**: horizontal chip row above the list to filter by stage (`Todas | FILED | EVIDENCE | ...`). Active chip = current stage by default.
- **Documents tab**: document rows show a small stage badge (e.g., `FILED`) or "General"
- Pass `onStagePress` to `LegalStageStepper` → opens `StageDetailSheet`

---

## Section 4: Migration & Compatibility

### Migration files

**`migrations/0053_stage_task_templates.sql`**
- Creates `etapa_tareas_plantilla`
- Adds `legal_stage` + `requerida` to `tareas`

**`migrations/0054_stage_events.sql`**
- Creates `etapa_eventos`
- Adds `legal_stage` to `documentos`

### Seed: `server/db/seeds/stage-templates.seed.ts`

Idempotent (checks before inserting). Suggested defaults:

| Stage | Title | Required |
|-------|-------|----------|
| FILED | Revisar escrito de demanda | ✅ |
| ADMITTED | Notificar al cliente de admisión | ✅ |
| NOTIFIED | Confirmar notificación al demandado | ✅ |
| ANSWERED | Analizar contestación de demanda | ✅ |
| EVIDENCE | Recopilar pruebas documentales | ✅ |
| EVIDENCE | Preparar lista de testigos | ❌ |
| HEARING | Confirmar fecha de audiencia | ✅ |
| HEARING | Preparar argumentos | ❌ |
| CLOSING_ARGUMENTS | Redactar alegatos finales | ✅ |
| JUDGMENT | Notificar sentencia al cliente | ✅ |

### Backward compatibility
- Existing `tareas` → `legal_stage = NULL`, `requerida = 0` (show as "Sin etapa" in filter)
- Existing `documentos` → `legal_stage = NULL` (show as "Generales")
- All existing endpoints unchanged — new fields are optional
- No retroactive events generated for processes already in progress

---

## Verification

1. Advance a stage with a required pending task → must receive 422 with `tareasBloqueantes`
2. Complete all required tasks → advance succeeds, template tasks for new stage are created
3. Tap a completed stage in stepper → StageDetailSheet opens showing past tasks and timeline
4. Upload a document with stage tag → appears in that stage's Documents tab
5. Add manual note in timeline → appears as `nota` event in correct stage
6. Existing tests for `/api/procesos/:id/tareas` still pass (no `stage` param = same behavior)
