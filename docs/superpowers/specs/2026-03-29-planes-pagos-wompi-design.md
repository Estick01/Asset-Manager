# Planes, Suscripciones y Pasarela de Pagos (Wompi) — Design Spec

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement this spec task-by-task.

**Goal:** Implementar un sistema de planes SaaS con enforcement de límites y features, suscripciones mensuales/anuales, y cobro via Wompi para abogados independientes y bufetes.

**Architecture:** Modelo híbrido (límites de cantidad + features exclusivas). Planes separados por tipo de usuario (abogado vs bufete). Bufetes pagan precio base + extra por abogado adicional. Enforcement centralizado en `SubscriptionService`. Pagos vía Wompi payment links con webhooks para activación.

**Tech Stack:** Drizzle ORM (MySQL), Express, React Native / Expo, Wompi REST API v1, TypeScript.

---

## 1. Planes definidos

### Abogado Independiente

| Plan | COP/mes | USD/mes | COP/año | USD/año |
|------|---------|---------|---------|---------|
| Gratis | $0 | $0 | — | — |
| Esencial | $29.900 | $7 | $287.040 | $70 |
| Pro | $84.900 | $21 | $815.040 | $199 |

| Límite / Feature | Gratis | Esencial | Pro |
|-----------------|--------|----------|-----|
| max_procesos | 5 | 20 | -1 (ilimitado) |
| max_clientes | 10 | 30 | -1 |
| max_storage_gb | 0 | 2 | 15 |
| calendario | ✗ | ✓ | ✓ |
| etapas_procesales | ✗ | ✓ | ✓ |
| privacidad_basica (hasta 5 privados) | ✗ | ✓ | ✓ |
| privacidad_avanzada (ilimitados + procesos) | ✗ | ✗ | ✓ |
| comunidad | ✗ | ✗ | ✓ |
| chat | ✗ | ✗ | ✓ |

### Bufete (precio base + por abogado extra)

| Plan | Incluidos | COP/mes base | Extra/abogado COP | Max abogados | USD/mes base |
|------|-----------|-------------|-------------------|-------------|-------------|
| Starter | 3 | $180.000 | $45.000 | 8 | $44 |
| Business | 8 | $350.000 | $35.000 | 20 | $85 |
| Enterprise | 15 | $600.000 | $28.000 | -1 | $146 |

| Límite / Feature | Starter | Business | Enterprise |
|-----------------|---------|----------|------------|
| max_procesos | 60 | 300 | -1 |
| max_clientes | 60 | 300 | -1 |
| max_storage_gb | 10 | 30 | 100 |
| calendario | ✓ | ✓ | ✓ |
| etapas_procesales | ✓ | ✓ | ✓ |
| dashboard_bufete | ✓ | ✓ | ✓ |
| privacidad_basica | ✓ | ✓ | ✓ |
| privacidad_avanzada | ✓ | ✓ | ✓ |
| comunidad | ✗ | ✓ | ✓ |
| chat | ✗ | ✓ | ✓ |
| roles_custom | ✗ | ✓ | ✓ |
| soporte_prioritario | ✗ | ✗ | ✓ |

**Anual:** 10 meses de precio (~17% descuento, equivale a 2 meses gratis).

**Ejemplo de cálculo bufete:** Firma con 12 abogados en Business:
`$350.000 + (12-8) × $35.000 = $490.000/mes`

---

## 2. Modelo de datos

### Tabla `planes` — reestructurada

```typescript
export const planes = mysqlTable("planes", {
  id:                       varchar("id", { length: 36 }).primaryKey(),
  nombre:                   varchar("nombre", { length: 50 }).notNull(),
  tipo:                     mysqlEnum("tipo", ["abogado", "bufete"]).notNull(),
  precio_mensual_cop:       decimal("precio_mensual_cop", { precision: 12, scale: 2 }).notNull(),
  precio_anual_cop:         decimal("precio_anual_cop",   { precision: 12, scale: 2 }).notNull(),
  precio_mensual_usd:       decimal("precio_mensual_usd", { precision: 10, scale: 2 }).notNull(),
  precio_anual_usd:         decimal("precio_anual_usd",   { precision: 10, scale: 2 }).notNull(),
  max_procesos:             int("max_procesos").notNull().default(5),       // -1 = ilimitado
  max_clientes:             int("max_clientes").notNull().default(10),      // -1 = ilimitado
  max_storage_gb:           int("max_storage_gb").notNull().default(0),     // 0 = sin almacenamiento
  included_users:           int("included_users").notNull().default(1),     // solo bufete
  max_users:                int("max_users").notNull().default(1),          // -1 = ilimitado, solo bufete
  precio_usuario_extra_cop: decimal("precio_usuario_extra_cop", { precision: 10, scale: 2 }),
  precio_usuario_extra_usd: decimal("precio_usuario_extra_usd", { precision: 10, scale: 2 }),
  state:                    boolean("state").notNull().default(true),
});
```

### Tabla `features` — nueva

```typescript
export const features = mysqlTable("features", {
  id:          int("id").autoincrement().primaryKey(),
  code:        varchar("code",   { length: 100 }).notNull().unique(),
  nombre:      varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  state:       boolean("state").notNull().default(true),
});
```

Códigos de feature del sistema:
- `calendario`, `etapas_procesales`, `comunidad`, `chat`
- `privacidad_basica`, `privacidad_avanzada`
- `dashboard_bufete`, `roles_custom`, `soporte_prioritario`

### Tabla `plan_features` — nueva

```typescript
export const planFeatures = mysqlTable("plan_features", {
  planId:      varchar("plan_id",  { length: 36 }).notNull(),
  featureCode: varchar("feature_code", { length: 100 }).notNull(),
  value:       varchar("value",    { length: 50 }).notNull().default("true"),
  // "true"/"false" para boolean, "5" para límite numérico (ej: privados limitados)
});
```

### Tabla `suscripciones` — nueva

```typescript
export const suscripciones = mysqlTable("suscripciones", {
  id:                   varchar("id",       { length: 36 }).primaryKey(),
  userId:               varchar("user_id",  { length: 36 }).notNull(),
  planId:               varchar("plan_id",  { length: 36 }).notNull(),
  ciclo:                mysqlEnum("ciclo",  ["mensual", "anual"]).notNull(),
  estado:               mysqlEnum("estado", ["activa", "cancelada", "vencida", "en_prueba"]).notNull(),
  fecha_inicio:         datetime("fecha_inicio").notNull(),
  fecha_vencimiento:    datetime("fecha_vencimiento").notNull(),
  fecha_cancelacion:    datetime("fecha_cancelacion"),
  auto_renovacion:      boolean("auto_renovacion").notNull().default(true),
  extra_users:          int("extra_users").notNull().default(0),          // abogados extra (bufete)
  wompi_subscription_id: varchar("wompi_subscription_id", { length: 100 }),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
});
```

**Regla:** Solo puede existir una suscripción `activa` por usuario. El plan gratis se representa como una suscripción con `planId = <id-plan-gratis>`, `estado = activa`, `fecha_vencimiento` muy lejana (ej: 2099).

### Tabla `pagos` — nueva

```typescript
export const pagos = mysqlTable("pagos", {
  id:                   varchar("id",        { length: 36 }).primaryKey(),
  suscripcionId:        varchar("suscripcion_id", { length: 36 }).notNull(),
  userId:               varchar("user_id",   { length: 36 }).notNull(),
  amount_cop:           decimal("amount_cop", { precision: 12, scale: 2 }),
  amount_usd:           decimal("amount_usd", { precision: 10, scale: 2 }),
  currency:             mysqlEnum("currency", ["COP", "USD"]).notNull(),
  metodo_pago:          mysqlEnum("metodo_pago", ["card", "pse", "nequi", "bancolombia_transfer", "otro"]),
  estado:               mysqlEnum("estado", ["pendiente", "aprobado", "rechazado", "reembolsado"]).notNull(),
  wompi_transaction_id: varchar("wompi_transaction_id", { length: 100 }),
  wompi_reference:      varchar("wompi_reference",      { length: 100 }).notNull().unique(),
  concepto:             varchar("concepto", { length: 255 }),
  createdAt:            timestamp("created_at").notNull().defaultNow(),
});
```

### Tabla `usage_tracking` — nueva

```typescript
export const usageTracking = mysqlTable("usage_tracking", {
  id:               varchar("id",      { length: 36 }).primaryKey(),
  userId:           varchar("user_id", { length: 36 }).notNull().unique(),
  suscripcionId:    varchar("suscripcion_id", { length: 36 }).notNull(),
  procesos_usados:  int("procesos_usados").notNull().default(0),
  clientes_usados:  int("clientes_usados").notNull().default(0),
  storage_usado_mb: int("storage_usado_mb").notNull().default(0),
  updatedAt:        timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});
```

---

## 3. Arquitectura de enforcement

### `SubscriptionService` — server/services/subscription.service.ts

```typescript
interface LimitCheck {
  permitido: boolean;
  actual: number;
  maximo: number;      // -1 = ilimitado
  porcentaje: number;
}

class SubscriptionService {
  // Obtiene suscripción activa del usuario (con plan y features)
  getActiveSuscripcion(userId: string): Promise<SuscripcionConPlan>

  // Verifica si el usuario puede crear más del recurso dado
  checkLimit(userId: string, tipo: 'procesos' | 'clientes' | 'storage', mbExtra?: number): Promise<LimitCheck>

  // Verifica acceso a una feature
  hasFeature(userId: string, featureCode: string): Promise<boolean>

  // Actualiza usage_tracking al crear/eliminar recursos
  incrementUsage(userId: string, tipo: 'procesos' | 'clientes' | 'storage', cantidad?: number): Promise<void>
  decrementUsage(userId: string, tipo: 'procesos' | 'clientes' | 'storage', cantidad?: number): Promise<void>

  // Activa suscripción tras pago aprobado en webhook
  activateSuscripcion(userId: string, planId: string, ciclo: string, extraUsers: number, pagoId: string): Promise<void>
}
```

### Middleware `requireFeature`

```typescript
// Uso en rutas:
router.get("/calendar", authenticate, requireFeature("calendario"), ...)
router.get("/community", authenticate, requireFeature("comunidad"), ...)
```

### Dónde se aplica `checkLimit`

| Ruta | Check |
|------|-------|
| `POST /api/procesos` | `checkLimit(userId, 'procesos')` |
| `POST /api/clientes` | `checkLimit(userId, 'clientes')` |
| `POST /api/documentos` | `checkLimit(userId, 'storage', tamanioMb)` |
| `DELETE /api/procesos/:id` | `decrementUsage(userId, 'procesos')` |
| `DELETE /api/clientes/:id` | `decrementUsage(userId, 'clientes')` |
| `DELETE /api/documentos/:id` | `decrementUsage(userId, 'storage', tamanioMb)` |

**Respuesta cuando se supera el límite:**
```json
HTTP 402
{
  "error": "LIMIT_REACHED",
  "tipo": "procesos",
  "actual": 5,
  "maximo": 5,
  "mensaje": "Has alcanzado el límite de procesos de tu plan. Actualiza para continuar."
}
```

---

## 4. Integración Wompi

### Endpoints backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/suscripciones/checkout` | Crea payment link en Wompi, retorna URL |
| `GET` | `/api/suscripciones/me` | Suscripción activa + usage del usuario |
| `POST` | `/api/suscripciones/cancelar` | Cancela renovación (auto_renovacion=false) |
| `POST` | `/api/webhooks/wompi` | Recibe eventos de Wompi, activa suscripción |
| `GET` | `/api/planes` | Lista planes disponibles con features |

### Flujo de checkout

```
1. POST /api/suscripciones/checkout
   Body: { planId, ciclo, extraUsers?, currency }
   → Calcula monto final (base + extra_users × precio_extra × meses)
   → Genera wompi_reference = UUID único
   → Crea pago con estado=pendiente
   → POST https://sandbox.wompi.co/v1/payment_links
     { amount_in_cents, currency, reference, redirect_url, expires_at }
   → Retorna { payment_url, reference }

2. Frontend abre payment_url en WebView

3. POST /api/webhooks/wompi  (evento: transaction.updated)
   → Verifica firma HMAC:
     SHA256(id + status + amount_in_cents + currency + reference + "::" + integrity_secret)
   → Si status = APPROVED:
     - Actualiza pago.estado = aprobado
     - Crea/renueva suscripcion con fecha_vencimiento calculada
     - Crea/actualiza usage_tracking
     - Envía notificación al usuario
   → Si status = DECLINED/ERROR:
     - Actualiza pago.estado = rechazado
```

### Variables de entorno requeridas

```env
WOMPI_PUBLIC_KEY=pub_test_...
WOMPI_PRIVATE_KEY=prv_test_...
WOMPI_INTEGRITY_SECRET=test_integrity_...
WOMPI_EVENTS_SECRET=test_events_...
WOMPI_BASE_URL=https://sandbox.wompi.co/v1
WOMPI_REDIRECT_URL=myapp://checkout/result
```

### Cron de vencimientos (server/index.ts)

```typescript
// Corre diariamente a las 8am
// Busca suscripciones que vencen en <= 3 días con auto_renovacion=true
// → Envía notificación push + email de recordatorio de renovación
// Busca suscripciones con fecha_vencimiento < ahora y estado=activa
// → Marca como vencida → degrada a plan gratis
```

---

## 5. Frontend

### Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `app/planes.tsx` | Pantalla de selección de plan (toggle abogado/bufete, mensual/anual) |
| `app/checkout.tsx` | WebView de Wompi + manejo de retorno |
| `components/subscription/UsageBars.tsx` | Barras de progreso de uso (procesos, clientes, storage) |
| `components/subscription/PlanGate.tsx` | Modal cuando se alcanza límite de plan |
| `components/subscription/PlanCard.tsx` | Card individual de plan con features |
| `lib/services/suscripcionService.ts` | Llamadas API de suscripción |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/lawyer-componts/lawyer-invitations.tsx` | Agregar sección "Mi suscripción" con UsageBars |
| `app/firm-components/firm-settings.tsx` | Agregar sección "Mi suscripción" con UsageBars |
| `server/routes/procesos.ts` | Agregar checkLimit antes de POST |
| `server/routes/clientes.ts` | Agregar checkLimit antes de POST |
| `server/routes/documentos.ts` | Agregar checkLimit antes de POST |
| `server/routes/index.ts` | Registrar ruta suscripciones y webhook |
| `shared/schema/index.ts` | Exportar nuevos schemas |
| `server/storage/storeage/database-storage.ts` | Instanciar nuevos storages |

### Flujo de navegación

```
Registro (rol=nuevo)
  └──> app/planes.tsx
         ├──> Plan gratis → activa directo → home
         └──> Plan pago → app/checkout.tsx (Wompi WebView)
                             ├──> Éxito → home con toast "¡Plan activado!"
                             └──> Error → planes.tsx con mensaje de error

Settings (abogado/bufete)
  └──> "Mi suscripción"
         ├──> UsageBars (procesos, clientes, storage)
         ├──> Cambiar plan → planes.tsx
         └──> Cancelar renovación → confirma → PATCH auto_renovacion=false

Acción bloqueada (crear proceso/cliente sobre límite)
  └──> PlanGate modal
         └──> "Ver planes" → planes.tsx
```

---

## 6. Seeder de planes

Al iniciar el servidor, `seedDatabase()` debe insertar los 6 planes (3 abogado + 3 bufete) y sus `plan_features` si no existen. Esto garantiza que la DB siempre tenga los planes definidos en este spec.

---

## 7. Consideraciones de seguridad

- El webhook de Wompi **siempre** debe verificar la firma antes de activar cualquier suscripción.
- El `wompi_reference` debe ser único por pago (UUID) para prevenir replay attacks.
- Los endpoints `/api/suscripciones/*` requieren autenticación JWT.
- El endpoint `/api/webhooks/wompi` **no** requiere JWT (viene de Wompi), pero sí verificación de firma.
- Nunca loggear llaves privadas de Wompi ni datos de tarjeta.
- El campo `planId` en `users` puede eliminarse progresivamente; la fuente de verdad es `suscripciones`.

---

## 8. Fases de implementación sugeridas

1. **DB + Schemas** — nuevas tablas, seed de planes y features
2. **SubscriptionService + enforcement** — checkLimit, hasFeature, middleware
3. **Rutas backend** — checkout, webhook, /me, /cancelar, /planes
4. **Frontend planes.tsx + PlanGate** — selección de plan y bloqueo por límite
5. **Frontend checkout.tsx + UsageBars** — flujo de pago y visualización de uso
6. **Cron de vencimientos** — recordatorios y degradación automática
