# Diseño: Portal de Administración

**Fecha:** 2026-03-31
**Estado:** Aprobado
**Proyecto:** Asset-Manager

---

## Contexto

La aplicación ya tiene navegación por roles con grupos `(lawyer-tabs)`, `(firm-tabs)` y `portal` (clientes). Se necesita un portal de administración para gestionar usuarios, planes, facturación, soporte y configuración del sistema.

**Decisiones clave tomadas:**
- Portal exclusivamente web (no móvil)
- Roles admin almacenados en la tabla `roles` existente (Opción A)
- Arquitectura: Stack group + `AdminShell` como componente layout (Opción B)

---

## Arquitectura general

### Flujo de acceso

```
Usuario hace login
       ↓
_layout.tsx → verifica rol del JWT
       ↓
rol = "admin_super" | "admin_soporte" | "admin_finanzas"
       ↓
ROLE_ROUTES["admin_*"] → "/(admin-tabs)"
       ↓
AdminShell renderiza: Sidebar + Topbar + {children}
```

### Cambio en `_layout.tsx` principal

```ts
const ROLE_ROUTES: Record<string, AppRoute> = {
  abogado:         "/(lawyer-tabs)",
  bufete:          "/(firm-tabs)",
  cliente:         "/portal",
  admin_super:     "/(admin-tabs)",
  admin_soporte:   "/(admin-tabs)",
  admin_finanzas:  "/(admin-tabs)",
};
```

---

## Estructura de carpetas

### Frontend

```
app/
└── (admin-tabs)/
    ├── _layout.tsx                  ← Stack, protección admin, sin header
    ├── _shell/
    │   ├── AdminShell.tsx           ← Sidebar + Topbar + slot de contenido
    │   ├── Sidebar.tsx              ← Nav items filtrados por sub-rol
    │   └── Topbar.tsx               ← Usuario activo, logout, breadcrumb
    ├── dashboard.tsx
    ├── usuarios/
    │   ├── index.tsx                ← Tabla unificada con filtros por tipo
    │   ├── abogados.tsx
    │   ├── bufetes.tsx
    │   ├── clientes.tsx
    │   └── [id].tsx                 ← Detalle + historial + acciones
    ├── planes/
    │   ├── index.tsx                ← Lista de planes
    │   └── [id].tsx                 ← Editor de plan (CRUD sin seed)
    ├── facturacion.tsx
    ├── procesos.tsx
    ├── soporte/
    │   ├── index.tsx                ← Lista de tickets con filtros
    │   └── [id].tsx                 ← Detalle + respuesta de ticket
    ├── comunidad.tsx
    └── configuracion/
        ├── index.tsx
        ├── feature-flags.tsx
        ├── admin-roles.tsx
        └── logs.tsx
```

### Backend

```
server/
└── admin/
    ├── routes/
    │   ├── index.ts                 ← Registra todo bajo /api/admin
    │   ├── admin-users.routes.ts
    │   ├── admin-planes.routes.ts
    │   ├── admin-facturacion.routes.ts
    │   ├── admin-procesos.routes.ts
    │   ├── admin-soporte.routes.ts
    │   ├── admin-stats.routes.ts
    │   └── admin-config.routes.ts
    ├── controllers/
    │   ├── admin-users.controller.ts
    │   ├── admin-planes.controller.ts
    │   ├── admin-facturacion.controller.ts
    │   ├── admin-procesos.controller.ts
    │   ├── admin-soporte.controller.ts
    │   ├── admin-stats.controller.ts
    │   └── admin-config.controller.ts
    ├── services/
    │   ├── admin-users.service.ts
    │   ├── admin-planes.service.ts
    │   ├── admin-facturacion.service.ts
    │   ├── admin-procesos.service.ts
    │   ├── admin-soporte.service.ts
    │   ├── admin-stats.service.ts
    │   ├── admin-config.service.ts
    │   └── audit.service.ts
    └── middleware/
        └── require-admin.ts

lib/
└── services/
    └── adminService.ts              ← Cliente HTTP centralizado (frontend)
```

---

## Frontend — Diseño detallado

### `_layout.tsx` del grupo admin

Responsabilidad única: verificar rol admin. Si el usuario no tiene rol admin, redirige a `/login`.

```tsx
const ADMIN_ROLES = ["admin_super", "admin_soporte", "admin_finanzas"];

export default function AdminLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  const rol = user?.user?.rol?.nombre ?? "";
  if (!ADMIN_ROLES.includes(rol)) return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### `AdminShell.tsx`

Wrapper que toda pantalla admin usa. Recibe `title` para el breadcrumb del Topbar.

```tsx
interface Props { children: React.ReactNode; title: string; }

export function AdminShell({ children, title }: Props) {
  const { user } = useAuth();
  const rol = user?.user?.rol?.nombre ?? "";
  return (
    <View style={styles.root}>
      <Sidebar rol={rol} />
      <View style={styles.main}>
        <Topbar title={title} />
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}
// Layout: row flex, sidebar 220px fijo, main flex-1
```

### `Sidebar.tsx`

Items filtrados por sub-rol. El item activo se detecta comparando `useSegments()` con el href.

```ts
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: "/(admin-tabs)/dashboard",     icon: "grid",             roles: ["admin_super", "admin_soporte", "admin_finanzas"] },
  { label: "Usuarios",      href: "/(admin-tabs)/usuarios",      icon: "people",           roles: ["admin_super", "admin_soporte"] },
  { label: "Planes",        href: "/(admin-tabs)/planes",        icon: "layers",           roles: ["admin_super", "admin_finanzas"] },
  { label: "Facturación",   href: "/(admin-tabs)/facturacion",   icon: "card",             roles: ["admin_super", "admin_finanzas"] },
  { label: "Procesos",      href: "/(admin-tabs)/procesos",      icon: "document-text",    roles: ["admin_super"] },
  { label: "Soporte",       href: "/(admin-tabs)/soporte",       icon: "chatbox-ellipses", roles: ["admin_super", "admin_soporte"] },
  { label: "Comunidad",     href: "/(admin-tabs)/comunidad",     icon: "globe",            roles: ["admin_super", "admin_soporte"] },
  { label: "Configuración", href: "/(admin-tabs)/configuracion", icon: "settings",         roles: ["admin_super"] },
];
```

### Visibilidad por sub-rol

| Sección | admin_super | admin_soporte | admin_finanzas |
|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ |
| Usuarios | ✅ | ✅ | ❌ |
| Planes | ✅ | ❌ | ✅ |
| Facturación | ✅ | ❌ | ✅ |
| Procesos | ✅ | ❌ | ❌ |
| Soporte | ✅ | ✅ | ❌ |
| Comunidad | ✅ | ✅ | ❌ |
| Configuración | ✅ | ❌ | ❌ |

### Uso en pantallas

```tsx
export default function DashboardScreen() {
  return (
    <AdminShell title="Dashboard">
      {/* contenido */}
    </AdminShell>
  );
}
```

---

## Backend — Diseño detallado

### Middleware `require-admin.ts`

Dos funciones:
- `requireAdmin` — bloquea cualquier usuario sin rol admin
- `requireAdminRole(...roles)` — restringe a sub-roles específicos dentro del grupo admin

### Patrón de capas

```
Route → valida método/path, aplica middlewares
Controller → valida input con Zod, llama service, formatea respuesta
Service → lógica de negocio + queries SQL directas (sin ORM)
```

> **Seguridad crítica:** Las queries SQL en los services deben usar siempre parámetros
> posicionales (`$1`, `$2`, ...) o el helper `sql` de Drizzle con interpolación segura.
> **Nunca** concatenar strings de usuario directamente en SQL — es SQL injection.
> El parámetro `search` y cualquier input del admin deben sanitizarse via parámetros
> de la librería de DB, no con template literals.

### Endpoints por dominio

| Dominio | Prefijo | Métodos principales |
|---|---|---|
| Stats | `/api/admin/stats` | `GET /` |
| Usuarios | `/api/admin/users` | `GET /`, `GET /:id`, `PATCH /:id/estado`, `PATCH /:id/plan`, `POST /:id/reset-password` |
| Planes | `/api/admin/planes` | `GET /`, `GET /:id`, `PATCH /:id` |
| Facturación | `/api/admin/facturacion` | `GET /`, `GET /fallidos`, `GET /historial` |
| Procesos | `/api/admin/procesos` | `GET /` (sin filtros de ownership) |
| Soporte | `/api/admin/soporte` | `GET /`, `GET /:id`, `PATCH /:id/estado`, `POST /:id/reply` |
| Config | `/api/admin/config` | `GET /feature-flags`, `PATCH /feature-flags/:code`, `GET /audit-log` |

### Restricciones por sub-rol en backend

| Acción | Roles permitidos |
|---|---|
| Ver cualquier sección | `admin_super`, más el sub-rol correspondiente |
| `PATCH /users/:id/estado` | `admin_super`, `admin_soporte` |
| `PATCH /users/:id/plan` | `admin_super` |
| `POST /users/:id/reset-password` | `admin_super` |
| `PATCH /planes/:id` | `admin_super`, `admin_finanzas` |
| `PATCH /config/feature-flags/:code` | `admin_super` |

---

## Auditoría

### Tabla `admin_audit_log`

```sql
CREATE TABLE admin_audit_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  admin_id   VARCHAR(36) NOT NULL,
  accion     VARCHAR(100) NOT NULL,
  target_id  VARCHAR(36),
  detalle    TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_admin_id  (admin_id),
  INDEX idx_accion    (accion),
  INDEX idx_created   (created_at)
);
```

### Convención de nombres de acción

| Prefijo | Ejemplos |
|---|---|
| `usuario.*` | `usuario.suspender`, `usuario.activar`, `usuario.cambiar_plan`, `usuario.reset_password` |
| `plan.*` | `plan.editar_precio`, `plan.editar_limites` |
| `config.*` | `config.feature_flag`, `config.admin_rol` |
| `soporte.*` | `soporte.cerrar_ticket`, `soporte.responder` |

### `audit.service.ts`

```ts
export const auditService = {
  async log({ adminId, accion, targetId, detalle }: AuditEntry): Promise<void>,
  async getLog({ page, limit, adminId, accion }): Promise<AuditEntry[]>,
};
```

Se llama desde el controller después de cada acción crítica — nunca desde el service.

---

## Cliente HTTP frontend (`adminService.ts`)

Un único archivo en `lib/services/adminService.ts` agrupa todos los servicios admin del frontend:

- `adminStatsService.getStats()`
- `adminUsersService.list(params)` / `.getById(id)` / `.updateEstado()` / `.updatePlan()` / `.resetPassword()`
- `adminPlanesService.list()` / `.getById()` / `.update()`
- `adminSoporteService.list()` / `.getById()` / `.updateEstado()` / `.reply()`
- `adminConfigService.getFeatureFlags()` / `.updateFeatureFlag()` / `.getAuditLog()`

Todas las llamadas retornan tipos explícitos. Las pantallas nunca hacen `fetch` directamente.

---

## Escalabilidad y convenciones

### Nombrado

| Capa | Patrón | Ejemplo |
|---|---|---|
| Ruta frontend | `kebab-case` | `feature-flags.tsx` |
| Ruta backend | `kebab-case` | `admin-users.routes.ts` |
| Controller función | `camelCase` | `listUsers`, `updateEstado` |
| Service método | `camelCase` | `adminUsersService.list()` |
| Endpoint URL | `/api/admin/{recurso}` | `/api/admin/users` |
| Acción auditoría | `recurso.accion` | `usuario.suspender` |

### Protocolo para agregar una nueva sección

```
1. Pantalla:    app/(admin-tabs)/nueva-seccion/index.tsx
2. Sidebar:     agregar item en NAV_ITEMS con los roles permitidos
3. Route:       server/admin/routes/admin-nueva.routes.ts
4. Controller:  server/admin/controllers/admin-nueva.controller.ts
5. Service:     server/admin/services/admin-nueva.service.ts
6. Registrar:   server/admin/routes/index.ts
7. Cliente:     lib/services/adminService.ts
```

### Decisiones que evitan deuda técnica

1. **Paginación desde el día 1** — todos los endpoints de lista devuelven `{ data, meta: { total, page, limit } }`
2. **Sin lógica en rutas** — rutas declaran, controllers validan, services ejecutan
3. **`AdminShell` único punto de layout** — cambios visuales en un solo archivo
4. **Auditoría obligatoria** — `auditService.log()` en el controller después de cada acción crítica
5. **Índices en `admin_audit_log`** — logs no degradan con el tiempo
6. **`requireAdmin` + `requireAdminRole` separados** — agregar sub-rol es cambiar un string

---

## DB — Roles a crear (seed inicial)

```sql
INSERT INTO roles (nombre, descripcion, activo, firm_id) VALUES
  ('admin_super',    'Acceso total al portal de administración', true, NULL),
  ('admin_soporte',  'Gestión de usuarios y tickets de soporte',  true, NULL),
  ('admin_finanzas', 'Gestión de planes y facturación',           true, NULL);
```

---

## Fases de implementación sugeridas

| Fase | Contenido | Prioridad |
|---|---|---|
| 1 | Estructura base: `_layout`, `AdminShell`, `Sidebar`, `Topbar`, roles en DB, `require-admin`, registro en `routes/index.ts` | Crítica |
| 2 | Dashboard (stats) + Usuarios (lista, detalle, acciones) | Alta |
| 3 | Planes (CRUD sin seed) + Facturación | Alta |
| 4 | Soporte (tickets) + Comunidad (moderación) | Media |
| 5 | Configuración (feature flags, audit log, admin roles) | Media |
