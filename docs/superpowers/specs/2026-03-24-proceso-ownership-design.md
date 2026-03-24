# Diseño: Ownership y Sharing de Procesos Jurídicos

**Fecha:** 2026-03-24
**Estado:** Aprobado (pendiente implementación)
**Rama:** fix/backend-corrections

---

## Contexto

El sistema actual no tiene un modelo de propiedad explícito sobre los procesos jurídicos. El acceso se infiere por la tabla `proceso_lawyers` (junction table de asignación laboral), lo que genera ambigüedad entre "quién controla el proceso" y "quién trabaja en él". Este diseño introduce un modelo de ownership histórico y sharing desacoplado para implementar las reglas de negocio de la relación Abogado ↔ Bufete.

---

## Reglas de negocio

### Ingreso al bufete
- Los procesos previos del abogado **no se migran automáticamente**.
- El sistema requiere una acción explícita por proceso: transferir / compartir / mantener privado.
- El sistema muestra un wizard inmediato al aceptar la invitación.
- La decisión puede modificarse después desde el detalle de cada proceso.

### Acceso por tipo de proceso
- **Independiente** (`owner_type='abogado'`): solo el abogado dueño puede verlo y gestionarlo.
- **Del bufete** (`owner_type='bufete'`): el bufete y sus abogados asignados que sigan en el bufete pueden verlo y gestionarlo.
- **Compartido** (`proceso_sharing` activo): la entidad receptora accede según el permiso asignado.

### Salida del bufete
- El abogado pierde acceso total a los procesos del bufete.
- Los procesos propios del abogado no cambian.
- Los procesos compartidos con el bufete dejan de ser visibles para el bufete.
- Los procesos del bufete quedan sin abogado asignado (el bufete debe reasignarlos).
- Todo se registra en historial.

---

## Sección 1 — Modelo de datos

### Principios
- **Nunca sobrescribir**: toda acción crea un nuevo registro con fecha de vigencia.
- **Separación estricta**: ownership ≠ sharing ≠ asignación laboral.
- **Extensible**: `owner_type` y `shared_with_type` son `VARCHAR(20)` para no requerir migraciones al agregar nuevos tipos.

### Tabla `proceso_ownership` (nueva)

```sql
CREATE TABLE proceso_ownership (
  id             VARCHAR(36)  NOT NULL,
  proceso_id     VARCHAR(36)  NOT NULL,
  owner_type     VARCHAR(20)  NOT NULL,   -- 'abogado', 'bufete'
  owner_id       VARCHAR(36)  NOT NULL,   -- lawyer_profiles.id o firm_profiles.id
  fecha_inicio   TIMESTAMP    NOT NULL    DEFAULT CURRENT_TIMESTAMP,
  fecha_fin      TIMESTAMP    NULL,       -- NULL = dueño actual
  activo_unique  TINYINT(1)   NULL,       -- 1 si activo, NULL si histórico (workaround MySQL)
  creado_por     VARCHAR(36)  NOT NULL,   -- users.id
  razon          VARCHAR(500) NULL,
  created_at     TIMESTAMP    NOT NULL    DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- Garantiza un solo ownership activo por proceso en MySQL
  UNIQUE INDEX uq_ownership_activo (proceso_id, activo_unique),

  INDEX idx_ownership_proceso (proceso_id, fecha_fin),
  INDEX idx_ownership_owner   (owner_type, owner_id, fecha_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Constraint de integridad (MySQL workaround):**
MySQL no soporta índices únicos parciales (WHERE). Se usa `activo_unique = 1` para el registro activo y `activo_unique = NULL` para históricos. MySQL permite múltiples NULLs en un índice único, por lo que `UNIQUE(proceso_id, activo_unique)` garantiza exactamente un registro con `activo_unique=1` por `proceso_id`.

**Ciclo de vida de un registro:**
- Al crear: `fecha_fin = NULL, activo_unique = 1`
- Al cerrar (en la misma transacción antes de crear el nuevo): `fecha_fin = NOW(), activo_unique = NULL`

> **Requerimiento de transaccionalidad:** La secuencia UPDATE (cerrar registro activo) → INSERT (nuevo activo) DEBE ejecutarse dentro de una transacción atómica para garantizar el constraint en todo momento. Una inserción sin el UPDATE previo viola el índice único.

### Tabla `proceso_sharing` (nueva)

```sql
CREATE TABLE proceso_sharing (
  id               VARCHAR(36)  NOT NULL,
  proceso_id       VARCHAR(36)  NOT NULL,
  shared_with_type VARCHAR(20)  NOT NULL,  -- 'bufete', 'corporacion', 'cliente'
  shared_with_id   VARCHAR(36)  NOT NULL,
  permission       VARCHAR(20)  NOT NULL,  -- 'ver', 'comentar', 'editar'
  fecha_inicio     TIMESTAMP    NOT NULL   DEFAULT CURRENT_TIMESTAMP,
  fecha_fin        TIMESTAMP    NULL,      -- NULL = acceso activo
  activo_unique    TINYINT(1)   NULL,      -- 1 si activo, NULL si histórico
  creado_por       VARCHAR(36)  NOT NULL,  -- users.id
  razon            VARCHAR(500) NULL,
  created_at       TIMESTAMP    NOT NULL   DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- Evita duplicar sharing activo para el mismo proceso + entidad
  UNIQUE INDEX uq_sharing_activo (proceso_id, shared_with_type, shared_with_id, activo_unique),

  INDEX idx_sharing_proceso     (proceso_id, fecha_fin),
  INDEX idx_sharing_shared_with (shared_with_type, shared_with_id, fecha_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### `proceso_lawyers` — sin cambios estructurales

Permanece como tabla de **asignación laboral** (quién trabaja en el proceso). No implica ownership ni acceso autónomo.

### Tablas preexistentes referenciadas

- **`proceso_responsables`**: tabla existente que registra el responsable activo de cada proceso con historial. Se usa en el Evento 5 (salida del bufete) para desactivar al abogado como responsable de procesos del bufete.
- **`lawyer_firma_history`**: tabla existente para auditoría de eventos de entrada/salida de abogados en bufetes. Si no existe en el schema actual, se debe crear con migración `0065_lawyer_firma_history.sql`.

### Separación de responsabilidades

| Tabla               | Pregunta que responde                         |
|---------------------|-----------------------------------------------|
| `proceso_ownership` | ¿Quién controla legalmente este proceso?      |
| `proceso_sharing`   | ¿Quién tiene acceso externo y con qué permiso?|
| `proceso_lawyers`   | ¿Quién trabaja operativamente en el proceso?  |

---

## Sección 2 — Control de acceso

### Retorno de `assertProcesoAccess`

```typescript
interface ProcesoAccess {
  proceso: ProcesoDTO;
  role: 'owner' | 'shared' | 'assigned';
  permission: 'ver' | 'comentar' | 'editar';
}
```

### Jerarquía de permisos

```
owner > editar > comentar > ver
```

Cuando un usuario tiene múltiples fuentes de acceso, siempre se retorna el mayor permiso disponible.

### Evaluación determinística (orden fijo)

```
PASO 1 — Ownership activo
  Query: proceso_ownership WHERE proceso_id=X AND activo_unique=1

  abogado: si owner_type='abogado' AND owner_id=abogadoId
           → role='owner', permission='editar'
  bufete:  si owner_type='bufete'  AND owner_id=firmId
           → role='owner', permission='editar'

PASO 2 — Sharing activo
  Query: proceso_sharing
         WHERE proceso_id=X AND shared_with_id=entityId AND activo_unique=1

  Si existe → role='shared', permission=sharing.permission
  (aplica a bufete, corporacion, cliente)

PASO 3 — Assignment (solo abogado)
  Query: proceso_lawyers WHERE proceso_id=X AND lawyer_id=abogadoId AND status='activo'

  Subcaso A — proceso owner_type='bufete':
    Verificar: lawyer_profiles.firm_id = proceso_ownership.owner_id
    (el abogado debe seguir perteneciendo al bufete dueño del proceso)
    Si cumple → role='assigned', permission='editar'
    Si no cumple (salió del bufete) → sin acceso por esta fuente

  Subcaso B — proceso owner_type='abogado' (proceso de otro abogado):
    La asignación en proceso_lawyers fue creada explícitamente por el dueño.
    No requiere verificación de firma.
    Si está en proceso_lawyers activo → role='assigned', permission='editar'

PASO 4 — Resolver permiso final
  maxPermission = max(todos los permisos encontrados según jerarquía)
  Si ninguna fuente aplica → 403 Forbidden

  Caso especial: si proceso_ownership.owner_type = 'sin_owner' (proceso huérfano post-migración):
  → 403 para todos los roles hasta que un administrador resuelva la revisión manual.
  → El sistema no debe exponer este proceso en ningún listado.
```

### Matriz de acceso

| Rol         | Fuente            | `role`     | `permission`  |
|-------------|-------------------|------------|---------------|
| abogado     | Owner activo      | `owner`    | `editar`      |
| abogado     | Asignado + en bufete dueño | `assigned` | `editar` |
| abogado     | Ninguna / bufete cambió | —     | 403           |
| bufete      | Owner activo      | `owner`    | `editar`      |
| bufete      | Sharing activo    | `shared`   | según sharing |
| corporacion | Sharing activo    | `shared`   | según sharing |
| cliente     | Sharing activo (`shared_with_type='cliente'`) | `shared` | máximo `ver` |

> **Nota:** El cliente ya no usa `procesos.cliente_id` como mecanismo de acceso directo. Accede únicamente vía `proceso_sharing`, lo que permite revocar acceso y mantener auditoría.

> **Techo de permiso para cliente:** `shared_with_type='cliente'` tiene un techo máximo de `ver`. El endpoint `POST /api/procesos/:id/sharing` debe rechazar con 400 cualquier intento de asignar `permission='comentar'` o `permission='editar'` a un cliente.

### Enforcement por operación

| Operación                    | Permiso mínimo    |
|------------------------------|-------------------|
| GET proceso / listado        | `ver`             |
| PUT / PATCH editar campos    | `editar`          |
| DELETE proceso               | `role = 'owner'`  |
| Gestionar abogados del proceso | `role = 'owner'` |
| Cambiar etapa legal          | `editar`          |
| Transferir / compartir       | `role = 'owner'`  |

### GET /api/procesos — queries por rol

| Rol         | Query                                                                 |
|-------------|-----------------------------------------------------------------------|
| abogado     | Owner activo + asignado en procesos cuyo bufete dueño es su `firm_id` |
| bufete      | Owner activo + sharing activo (`shared_with_type='bufete'`)           |
| corporacion | Sharing activo (`shared_with_type='corporacion'`)                     |
| cliente     | Sharing activo (`shared_with_type='cliente'`)                         |

---

## Sección 3 — Eventos de negocio

### Evento 1: Abogado se une al bufete

**Trigger:** `POST /api/firm-invitations/:id/accept`

1. `UPDATE lawyer_profiles SET firm_id = bufeteId`
2. Respuesta incluye `requiresProcessDecision: true` + lista de procesos del abogado
3. Frontend muestra wizard de decisión inmediatamente
4. Abogado clasifica cada proceso: privado / compartir (elige permiso) / transferir
5. Submit dispara `POST /api/procesos/batch-decisions` (transacción atómica)

Procesos sin decisión quedan como independientes (privados) por defecto.

> **Scope del wizard:** Solo se muestran procesos donde `proceso_ownership.owner_type='abogado' AND owner_id=abogadoId AND activo_unique=1`. Los procesos previamente transferidos a un bufete anterior no aparecen (ya no son del abogado).

### Evento 2: Transferir proceso al bufete

```sql
BEGIN TRANSACTION
  UPDATE proceso_ownership
  SET fecha_fin = NOW(), activo_unique = NULL
  WHERE proceso_id = :procesoId AND activo_unique = 1;

  INSERT INTO proceso_ownership
    (id, proceso_id, owner_type, owner_id, activo_unique, creado_por, razon)
  VALUES
    (UUID(), :procesoId, 'bufete', :bufeteId, 1, :userId, :razon);
COMMIT
```

Solo ejecutable por `role = 'owner'`. Irreversible sin acción explícita del bufete.

### Evento 3: Compartir proceso (crear o actualizar permiso)

```sql
BEGIN TRANSACTION
  -- Cerrar sharing activo previo si existe
  UPDATE proceso_sharing
  SET fecha_fin = NOW(), activo_unique = NULL
  WHERE proceso_id = :procesoId
    AND shared_with_type = :type
    AND shared_with_id = :entityId
    AND activo_unique = 1;

  -- Crear nuevo registro (siempre versiona, nunca sobrescribe)
  INSERT INTO proceso_sharing
    (id, proceso_id, shared_with_type, shared_with_id,
     permission, activo_unique, creado_por, razon)
  VALUES (UUID(), :procesoId, :type, :entityId, :permission, 1, :userId, :razon);
COMMIT
```

### Evento 4: Revocar sharing

```sql
UPDATE proceso_sharing
SET fecha_fin = NOW(), activo_unique = NULL
WHERE id = :shareId
  AND proceso_id = :procesoId;
```

Se revoca por `id` del registro de sharing (consistente con el endpoint REST `DELETE /api/procesos/:id/sharing/:shareId`). Puede ejecutarlo el owner del proceso o la entidad receptora (auto-revocarse).

### Evento 5: Salida del bufete (abogado o bufete)

Ambos endpoints disparan el mismo flujo atómico:

```sql
BEGIN TRANSACTION
  -- A. Revocar sharing de procesos del abogado con ese bufete
  UPDATE proceso_sharing
  SET fecha_fin = NOW(), activo_unique = NULL
  WHERE shared_with_type = 'bufete'
    AND shared_with_id = :bufeteId
    AND proceso_id IN (
      SELECT proceso_id FROM proceso_ownership
      WHERE owner_type = 'abogado' AND owner_id = :abogadoId AND activo_unique = 1
    )
    AND activo_unique = 1;

  -- B. Remover al abogado de proceso_lawyers de procesos del bufete
  UPDATE proceso_lawyers
  SET status = 'inactivo', fecha_fin = NOW()
  WHERE lawyer_id = :abogadoId
    AND proceso_id IN (
      SELECT proceso_id FROM proceso_ownership
      WHERE owner_type = 'bufete' AND owner_id = :bufeteId AND activo_unique = 1
    );

  -- C. Desactivar como responsable en procesos del bufete
  UPDATE proceso_responsables
  SET activo = false, fecha_fin = NOW()
  WHERE lawyer_id = :abogadoId
    AND activo = true
    AND proceso_id IN (
      SELECT proceso_id FROM proceso_ownership
      WHERE owner_type = 'bufete' AND owner_id = :bufeteId AND activo_unique = 1
    );

  -- D. Desconectar del bufete
  UPDATE lawyer_profiles SET firm_id = NULL
  WHERE id = :abogadoId;

  -- E. Registrar evento
  INSERT INTO lawyer_firma_history
    (id, lawyer_id, firma_id, accion, iniciado_por, fecha)
  VALUES (UUID(), :abogadoId, :bufeteId, 'salida', :userId, NOW());
COMMIT
```

**Post-salida:** Los procesos del bufete quedan sin responsable asignado. El bufete debe reasignarlos (ver pantalla de reasignación pendiente).

> **Procesos transferidos previamente:** Si el abogado había transferido procesos al bufete antes de salir, esos procesos permanecen bajo `owner_type='bufete'`. La transferencia es irreversible salvo acción explícita del bufete. El historial de ownership queda intacto — los registros anteriores en `proceso_ownership` ya fueron cerrados (`fecha_fin` asignado) en el momento de la transferencia (Evento 2), por lo que este flujo de salida no los modifica.

---

## Sección 4 — APIs y pantallas de frontend

### Endpoints nuevos

| Método   | Ruta                                        | Rol            | Descripción                                  |
|----------|---------------------------------------------|----------------|----------------------------------------------|
| `GET`    | `/api/procesos/:id/ownership`               | owner          | Historial completo de ownership              |
| `POST`   | `/api/procesos/:id/transfer`                | owner          | Transferir proceso al bufete                 |
| `GET`    | `/api/procesos/:id/sharing`                 | owner          | Lista sharing activo + historial             |
| `POST`   | `/api/procesos/:id/sharing`                 | owner          | Crear o actualizar sharing                   |
| `DELETE` | `/api/procesos/:id/sharing/:shareId`        | owner / shared | Revocar sharing                              |
| `POST`   | `/api/procesos/batch-decisions`             | abogado        | Batch de decisiones al unirse al bufete      |
| `DELETE` | `/api/lawyer-firma/leave`                   | abogado        | Salir del bufete voluntariamente             |
| `DELETE` | `/api/firm/:firmId/lawyers/:lawyerId`       | bufete         | Remover abogado del bufete                   |
| `GET`    | `/api/firm/:firmId/pending-reassignments`   | bufete         | Procesos sin asignar tras salida de abogado  |

### Endpoints modificados

| Ruta                               | Cambio                                                    |
|------------------------------------|-----------------------------------------------------------|
| `POST /api/firm-invitations/:id/accept` | Respuesta incluye `requiresProcessDecision` + procesos |
| `GET /api/procesos`                | Queries reescritas por rol                                |
| `assertProcesoAccess`              | Retorna `{ proceso, role, permission }`                   |
| `DELETE /api/procesos/:id`         | Requiere `role = 'owner'`                                 |
| `PUT/PATCH /api/procesos/:id`      | Verifica nivel de permiso                                 |

### Pantallas de frontend

#### Wizard de decisión al unirse al bufete

Pantalla modal a pantalla completa que aparece tras aceptar invitación. Puede cerrarse y retomarse desde "Gestionar acceso del bufete" en configuración.

```
┌─────────────────────────────────────────────────┐
│  Tienes 5 procesos. ¿Qué hacemos con ellos?     │
├─────────────────────────────────────────────────┤
│ Proceso A — Caso García                         │
│  ○ Mantener privado                             │
│  ○ Compartir con bufete   [Ver ▾]               │
│  ○ Transferir al bufete                         │
├─────────────────────────────────────────────────┤
│ Proceso B — Caso Martínez                       │
│  ● Mantener privado  ← default                  │
├─────────────────────────────────────────────────┤
│            [Decidir después]  [Confirmar]       │
└─────────────────────────────────────────────────┘
```

#### Panel de acceso por proceso (tab "Acceso" en app/case/[id].tsx)

Visible solo para `role = 'owner'`.

```
┌──────────────────────────────────────┐
│  Propiedad                           │
│  Dueño: Tú (abogado)  desde 12/01   │
│  [Transferir al bufete →]            │
├──────────────────────────────────────┤
│  Acceso compartido                   │
│  Bufete Rodríguez  [Ver]             │
│  [Modificar]  [Revocar]              │
│                                      │
│  [+ Compartir con...]                │
└──────────────────────────────────────┘
```

#### Modal de confirmación de salida del bufete

```
┌──────────────────────────────────────────┐
│  Confirmar salida del bufete             │
│                                          │
│  • 3 procesos del bufete quedarán        │
│    sin abogado asignado                  │
│  • 2 procesos compartidos perderán       │
│    acceso del bufete                     │
│  • Tus 4 procesos propios no cambian     │
│                                          │
│        [Cancelar]  [Confirmar salida]    │
└──────────────────────────────────────────┘
```

#### Vista de reasignación pendiente (dashboard bufete)

Banner/card que aparece tras la salida de un abogado.

```
┌─────────────────────────────────────────┐
│  ⚠ 3 procesos sin abogado asignado      │
│  (tras salida de Carlos López)          │
│                                         │
│  Proceso A  [Asignar abogado ▾]         │
│  Proceso B  [Asignar abogado ▾]         │
│  Proceso C  [Asignar abogado ▾]         │
│                                         │
│              [Resolver después]         │
└─────────────────────────────────────────┘
```

---

## Migraciones

> **Decisión:** Los datos actuales son de prueba. No se requiere migración de datos existentes. Las tablas nuevas parten vacías.

| Migración | Descripción |
|-----------|-------------|
| `0062_proceso_ownership.sql` | Crear tabla `proceso_ownership` con índices y constraint |
| `0063_proceso_sharing.sql`   | Crear tabla `proceso_sharing` con índices y constraint   |

---

## Decisiones de diseño

| Decisión | Razón |
|----------|-------|
| `activo_unique TINYINT NULL` en lugar de partial index | MySQL no soporta partial unique indexes; este workaround es el estándar |
| `VARCHAR(20)` en lugar de `ENUM` para tipos | Extensible sin migraciones futuras |
| `fecha_fin` + `activo_unique` (doble mecanismo) | `fecha_fin` para queries por rango de fechas; `activo_unique` para constraint de unicidad |
| Cliente accede vía `proceso_sharing` | Consistencia del modelo y auditabilidad de accesos |
| `assertProcesoAccess` retorna `{ proceso, role, permission }` | El frontend necesita saber tanto el nivel de permiso como el tipo de relación para mostrar acciones disponibles |
| `corporacion` solo accede vía sharing | Implementación diferida; su modelo de visibilidad jerárquica se define en spec separado |
