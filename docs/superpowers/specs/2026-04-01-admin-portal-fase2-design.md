# Diseño: Admin Portal — Fase 2 (Auditoría + Usuarios)

**Fecha:** 2026-04-01
**Estado:** Aprobado
**Proyecto:** Asset-Manager
**Fase anterior:** `docs/superpowers/specs/2026-03-31-admin-portal-design.md`

---

## Contexto

La Fase 1 del portal admin está completa: estructura base (`AdminShell`, `Sidebar`, `Topbar`), roles en DB, middleware `require-admin`, y dashboard con 5 métricas.

Esta fase agrega:
1. **Auditoría** — infraestructura compartida para registrar acciones críticas (usada por todas las fases futuras)
2. **Usuarios** — gestión completa de usuarios finales del sistema

Las Fases 3-5 quedan descritas al final de este documento a alto nivel.

---

## Alcance de Fase 2

### Módulos
| Módulo | Backend | Frontend |
|---|---|---|
| Auditoría | `audit.service.ts` + migración `admin_audit_log` | — (solo se consume en Fase 5) |
| Usuarios | route + controller + service + storage | `usuarios/index.tsx` + `usuarios/[id].tsx` |

### Fuera de scope
- Envío de email en reset-password (se retorna el token, el envío queda para cuando se integre un servicio de email)
- Facturación, Planes, Soporte, Comunidad, Configuración (Fases 3-5)

---

## Arquitectura

### Flujo de una acción crítica

```
Frontend → PATCH /api/admin/users/:id/estado
              ↓
          authenticate → requireAdmin → requireAdminRole("admin_super","admin_soporte")
              ↓
          controller: valida input con Zod
              ↓
          service: llama storage
              ↓
          auditService.log() ← best-effort, no revierte la acción si falla
              ↓
          res.json({ success: true, data })
```

### Archivos nuevos

#### Backend
```
server/
├── db/
│   └── migrations/
│       └── XXXXXX_create_admin_audit_log.ts
└── admin/
    ├── storage/
    │   ├── admin-users.storage.ts     (nuevo)
    │   └── admin-audit.storage.ts     (nuevo)
    ├── services/
    │   ├── admin-users.service.ts     (nuevo)
    │   └── audit.service.ts           (nuevo)
    ├── controllers/
    │   └── admin-users.controller.ts  (nuevo)
    └── routes/
        └── admin-users.routes.ts      (nuevo)
```

#### Frontend
```
app/(admin-tabs)/
└── usuarios/
    ├── index.tsx    (nuevo)
    └── [id].tsx     (nuevo)
```

#### Modificar
```
server/admin/routes/index.ts        ← registrar admin-users.routes
server/storage/storeage/database-storage.ts  ← agregar adminUsers storage
lib/services/adminService.ts        ← agregar adminUsersService
```

---

## Módulo de Auditoría

### Tabla `admin_audit_log`

```sql
CREATE TABLE admin_audit_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  admin_id   VARCHAR(36) NOT NULL,
  accion     VARCHAR(100) NOT NULL,
  target_id  VARCHAR(36),
  detalle    TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_admin_id (admin_id),
  INDEX idx_accion   (accion),
  INDEX idx_created  (created_at)
);
```

### Convención de nombres de acción

| Prefijo | Ejemplos |
|---|---|
| `usuario.*` | `usuario.suspender`, `usuario.activar`, `usuario.cambiar_plan`, `usuario.reset_password` |
| `plan.*` | `plan.editar_precio`, `plan.editar_limites` |
| `facturacion.*` | `facturacion.reembolso`, `facturacion.cancelar_suscripcion`, `facturacion.ajuste_manual` |
| `soporte.*` | `soporte.cerrar_ticket`, `soporte.responder` |
| `config.*` | `config.feature_flag`, `config.admin_rol` |

### `audit.service.ts`

```ts
interface AuditEntry {
  adminId:  string;
  accion:   string;       // convención: "recurso.accion"
  targetId?: string;
  detalle?:  string;      // JSON stringificado con contexto adicional
}

export const auditService = {
  async log(entry: AuditEntry): Promise<void>,
  async getLog(params: {
    page:     number;
    limit:    number;
    adminId?: string;
    accion?:  string;
  }): Promise<{ data: AuditEntry[]; meta: { total: number; page: number; limit: number } }>,
};
```

**Regla:** `auditService.log()` se llama en el **controller** después de que la acción fue exitosa. Si el log falla, no revierte la acción (best-effort).

---

## Módulo de Usuarios — Backend

### Endpoints

| Método | Ruta | Roles permitidos | Descripción |
|---|---|---|---|
| GET | `/api/admin/users` | cualquier admin | Lista paginada con filtros |
| GET | `/api/admin/users/:id` | cualquier admin | Detalle completo |
| PATCH | `/api/admin/users/:id/estado` | super, soporte | Suspender / activar |
| PATCH | `/api/admin/users/:id/plan` | super | Cambiar plan de suscripción activa |
| POST | `/api/admin/users/:id/reset-password` | super | Genera token de reset |

### Query params de lista (`GET /api/admin/users`)

```ts
{
  page?:   number;   // default 1
  limit?:  number;   // default 20, max 100
  tipo?:   "abogado" | "bufete" | "cliente";
  estado?: "activo" | "suspendido";
  search?: string;   // busca en name y email — usa parámetros posicionales, nunca concatenación
}
```

### Respuesta de lista

```ts
{
  success: true,
  data: [{
    id, name, email,
    rol: { nombre },
    plan: { nombre } | null,   // plan de suscripción activa
    activo: boolean,
    createdAt: string,
  }],
  meta: { total, page, limit }
}
```

### Respuesta de detalle (`GET /api/admin/users/:id`)

```ts
{
  success: true,
  data: {
    id, name, email, activo, createdAt,
    rol: { id, nombre },
    firma: { id, nombre } | null,       // si el usuario pertenece a un bufete
    suscripcionActiva: {
      id, planNombre, ciclo, estado, fechaInicio, fechaFin
    } | null,
    historialSuscripciones: [{
      id, planNombre, ciclo, estado, fechaInicio, fechaFin
    }]
  }
}
```

### Validación Zod (ejemplos)

```ts
// PATCH /estado
const updateEstadoSchema = z.object({
  activo: z.boolean(),
});

// PATCH /plan
const updatePlanSchema = z.object({
  planId: z.string().uuid(),
});
```

### Auditoría en controller

```ts
// Después de updateEstado exitoso:
await auditService.log({
  adminId:  req.user.id,
  accion:   activo ? "usuario.activar" : "usuario.suspender",
  targetId: userId,
  detalle:  JSON.stringify({ nombre: user.name, email: user.email }),
});
```

---

## Módulo de Usuarios — Frontend

### `usuarios/index.tsx`

Tabla paginada con filtros en la parte superior:

- **Filtros:** tipo (abogado / bufete / cliente / todos), estado (activo / suspendido / todos), búsqueda libre (nombre o email)
- **Columnas:** Nombre, Email, Tipo, Plan activo, Estado (badge), Fecha de registro
- **Paginación:** controles inferior (Anterior / Siguiente + indicador de página)
- Click en fila → navega a `/(admin-tabs)/usuarios/[id]`
- Estado de carga con `ActivityIndicator`, error inline

```ts
// QueryKey incluye filtros para cache automático por combinación
queryKey: ["admin-users", { page, tipo, estado, search }]
```

### `usuarios/[id].tsx`

Layout de dos columnas:

**Columna izquierda — Datos del usuario:**
- Nombre, email, tipo de usuario
- Firma asociada (si aplica)
- Fecha de registro
- Suscripción activa (plan + ciclo + fechas)
- Historial de suscripciones (lista colapsable)

**Columna derecha — Acciones:**

| Acción | Condición | Modal de confirmación |
|---|---|---|
| Suspender / Activar | siempre | Sí — muestra nombre del usuario |
| Cambiar plan | suscripción activa existe | Sí — selector de planes disponibles |
| Reset password | siempre | Sí — muestra token generado tras confirmar |

- Cada acción usa `StyledModal` de confirmación (no `Alert.alert`)
- Errores se muestran inline bajo el botón, no como alerta global
- Tras acción exitosa: invalidar `["admin-users"]` y `["admin-user", id]` en React Query

### `adminService.ts` — nuevos métodos

```ts
export const adminUsersService = {
  list:          (params: ListUsersParams) => apiClient.get("/admin/users", { params }),
  getById:       (id: string) => apiClient.get(`/admin/users/${id}`),
  updateEstado:  (id: string, activo: boolean) =>
                   apiClient.patch(`/admin/users/${id}/estado`, { activo }),
  updatePlan:    (id: string, planId: string) =>
                   apiClient.patch(`/admin/users/${id}/plan`, { planId }),
  resetPassword: (id: string) =>
                   apiClient.post(`/admin/users/${id}/reset-password`),
};
```

---

## Seguridad

- `search` y cualquier input del admin siempre via parámetros posicionales de Drizzle/MySQL2, nunca concatenación de strings
- `requireAdminRole` en cada endpoint según la tabla de roles permitidos
- El token de reset-password expira en 1 hora (definir al implementar)
- `auditService.log()` en todas las acciones PATCH/POST

---

## Fases 3-5 — Alcance futuro (alto nivel)

### Fase 3: Planes + Facturación

**Planes:** CRUD de planes existentes (precio, límites, descripción). Sin crear nuevos planes vía seed — todo desde el admin.

**Facturación (Wompi):** Vista de historial de pagos y suscripciones. Acciones:
- Reembolsos
- Cancelar suscripción
- Generar factura manual
- Ajustes manuales (créditos/débitos)
- Reintentar cobro
- Marcar pago como exitoso manualmente

Todas las acciones de facturación requieren auditoría obligatoria.

### Fase 4: Soporte + Comunidad

**Soporte:** Sistema de tickets interno con diseño orientado a futura integración con herramientas externas (Zendesk, Intercom). Abstracción via interfaz `SoporteProvider` con implementación `InternalProvider`. Acciones: ver lista, responder ticket, cerrar ticket, reasignar.

**Comunidad:** Moderación de publicaciones y comentarios. Acciones: ocultar/mostrar publicación, advertir usuario, banear de la comunidad.

### Fase 5: Configuración

- Feature flags (activar/desactivar funcionalidades por plan o globalmente)
- Gestión de roles admin (crear/desactivar usuarios admin)
- Audit log viewer (tabla paginada con filtros, consume `auditService.getLog()`)
