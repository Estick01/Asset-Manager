# Admin Portal — Infraestructura Base + Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el portal de administración web con sidebar, protección por rol y un dashboard de métricas globales del sistema.

**Architecture:** Grupo `(admin-tabs)` con Stack + `AdminShell` como único layout. Roles admin (`admin_super`, `admin_soporte`, `admin_finanzas`) como filas en la tabla `roles` existente. Backend desacoplado en `server/admin/` con capa route → controller → service.

**Tech Stack:** Expo Router (web), React Native, Express, Drizzle ORM (query builder), MySQL2, TypeScript, Zod, Ionicons.

**Spec:** `docs/superpowers/specs/2026-03-31-admin-portal-design.md`

---

## Mapa de archivos

### Crear (nuevos)
| Archivo | Responsabilidad |
|---|---|
| `server/db/seeds/admin-roles.seed.ts` | Seed idempotente de los 3 roles admin |
| `server/admin/middleware/require-admin.ts` | Middleware que verifica rol admin en JWT |
| `server/admin/storage/admin-stats.storage.ts` | Queries Drizzle para métricas globales |
| `server/admin/routes/admin-stats.routes.ts` | Endpoint `GET /api/admin/stats` |
| `server/admin/controllers/admin-stats.controller.ts` | Valida input, llama service, formatea respuesta |
| `server/admin/services/admin-stats.service.ts` | Lógica de negocio stats (delega a storage) |
| `server/admin/routes/index.ts` | Agrega todas las rutas admin bajo `/api/admin` |
| `app/(admin-tabs)/_layout.tsx` | Stack protegido por rol admin |
| `app/(admin-tabs)/_shell/AdminShell.tsx` | Wrapper: Sidebar + Topbar + slot de contenido |
| `app/(admin-tabs)/_shell/Sidebar.tsx` | Nav filtrado por sub-rol, ítem activo resaltado |
| `app/(admin-tabs)/_shell/Topbar.tsx` | Título de página + info de usuario admin |
| `app/(admin-tabs)/dashboard.tsx` | Dashboard con 5 tarjetas de métricas |
| `lib/services/adminService.ts` | Cliente HTTP para el admin (stats) |

### Modificar (existentes)
| Archivo | Cambio |
|---|---|
| `server/storage/storeage/database-storage.ts` | Agregar `adminStats: AdminStatsStorage` |
| `server/routes/index.ts` | Registrar `adminRoutes` bajo `/api/admin` |
| `server/index.ts` | Llamar `seedAdminRoles(db)` en `seedDatabase()` |
| `app/_layout.tsx` | Agregar roles admin a `ROLE_ROUTES` |

---

## Task 1: Seed de roles admin

**Files:**
- Create: `server/db/seeds/admin-roles.seed.ts`
- Modify: `server/index.ts`

- [ ] **Step 1.1: Crear el seeder idempotente**

```ts
// server/db/seeds/admin-roles.seed.ts
import { eq } from "drizzle-orm";
import { roles } from "@/shared/schema";
import type { Database } from "../../storage/storeage/database-storage.js";

const ADMIN_ROLES = [
  { nombre: "admin_super",    descripcion: "Acceso total al portal de administración" },
  { nombre: "admin_soporte",  descripcion: "Gestión de usuarios y tickets de soporte" },
  { nombre: "admin_finanzas", descripcion: "Gestión de planes y facturación" },
] as const;

export async function seedAdminRoles(db: Database): Promise<void> {
  for (const rol of ADMIN_ROLES) {
    const existing = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.nombre, rol.nombre))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(roles).values({
        nombre:      rol.nombre,
        descripcion: rol.descripcion,
        activo:      true,
        firmId:      null,
      });
      console.log(`[seed] Rol creado: ${rol.nombre}`);
    } else {
      console.log(`[seed] Rol ya existe: ${rol.nombre}`);
    }
  }
}
```

- [ ] **Step 1.2: Registrar el seeder en `seedDatabase()`**

Abre `server/index.ts`. Agrega el import después de la última línea de imports de seeds:

```ts
import { seedAdminRoles } from "./db/seeds/admin-roles.seed.js";
```

Luego agrega la llamada al final del bloque `seedDatabase()`, después de `await seedPlanes(db)`:

```ts
await seedAdminRoles(db);
```

- [ ] **Step 1.3: Verificar que el seed corre sin errores**

Reinicia el servidor y observa los logs:

```
[seed] Rol creado: admin_super
[seed] Rol creado: admin_soporte
[seed] Rol creado: admin_finanzas
```

Si el servidor ya corrió antes, aparece:
```
[seed] Rol ya existe: admin_super
```

- [ ] **Step 1.4: Verificar en la base de datos**

Ejecuta en MySQL:
```sql
SELECT id, nombre, descripcion, activo FROM roles WHERE nombre LIKE 'admin_%';
```

Resultado esperado: 3 filas con los roles admin.

- [ ] **Step 1.5: Crear manualmente un usuario admin_super para pruebas**

Genera primero el hash de la contraseña desde Node.js:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('Admin1234!', 12).then(h => console.log(h))"
```

Copia el hash resultante (empieza con `$2b$12$...`) y úsalo en el INSERT:

```sql
INSERT INTO users (id, email, password_hash, name, rol_id, is_active)
VALUES (
  UUID(),
  'admin@lextrack.co',
  '<HASH_GENERADO_ARRIBA>',
  'Super Admin',
  (SELECT id FROM roles WHERE nombre = 'admin_super'),
  true
);
```

- [ ] **Step 1.6: Commit**

```bash
git add server/db/seeds/admin-roles.seed.ts server/index.ts
git commit -m "feat(admin): agregar seed idempotente de roles admin"
```

---

## Task 2: Middleware `require-admin`

**Files:**
- Create: `server/admin/middleware/require-admin.ts`

- [ ] **Step 2.1: Crear los directorios del módulo admin**

```bash
mkdir -p server/admin/middleware
mkdir -p server/admin/routes
mkdir -p server/admin/controllers
mkdir -p server/admin/services
mkdir -p server/admin/storage
```

- [ ] **Step 2.2: Crear el middleware**

```ts
// server/admin/middleware/require-admin.ts
import type { Request, Response, NextFunction } from "express";
import type { JWTPayload } from "@/shared/model.schema.js";

export const ADMIN_ROLES = ["admin_super", "admin_soporte", "admin_finanzas"] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

/**
 * Bloquea cualquier request cuyo JWT no tenga un rol admin_*.
 * Usar DESPUÉS de `authenticate`.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as JWTPayload;
  if (!user?.id) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  // JWTPayload.rol es un objeto Rol — usar .nombre para obtener el string
  if (!ADMIN_ROLES.includes(user.rol?.nombre as AdminRole)) {
    res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
    return;
  }
  next();
}

/**
 * Restringe a sub-roles específicos dentro del grupo admin.
 * Ej: requireAdminRole("admin_super", "admin_finanzas")
 */
export function requireAdminRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as JWTPayload;
    // JWTPayload.rol es un objeto Rol — usar .nombre para obtener el string
    if (!roles.includes(user?.rol?.nombre as AdminRole)) {
      res.status(403).json({
        error: `Acceso denegado: se requiere ${roles.join(" o ")}`,
      });
      return;
    }
    next();
  };
}
```

- [ ] **Step 2.3: Confirmar la forma del campo `rol` en `JWTPayload`**

Abre `shared/model.schema.ts` línea ~147. El campo `rol` ya existe y es de tipo `Rol` (objeto con `{ id, nombre, descripcion, activo, ... }`).

El middleware ya usa `user.rol?.nombre` para obtener el string. No se requiere ningún cambio en el schema.

- [ ] **Step 2.4: Commit**

```bash
git add server/admin/middleware/require-admin.ts
git commit -m "feat(admin): agregar middleware require-admin con soporte de sub-roles"
```

---

## Task 3: Storage de stats admin

**Files:**
- Create: `server/admin/storage/admin-stats.storage.ts`
- Modify: `server/storage/storeage/database-storage.ts`

- [ ] **Step 3.1: Crear el storage con las queries de métricas**

```ts
// server/admin/storage/admin-stats.storage.ts
import { sql, inArray } from "drizzle-orm";
import { users, roles, suscripciones, planes, procesos } from "@/shared/schema";
import type { Database } from "../../storage/storeage/database-storage.js";

export interface AdminStats {
  totalUsuarios:         number;   // abogados + bufetes + clientes
  suscripcionesActivas:  number;
  ingresosEstimadosCop:  number;   // suma mensual de suscripciones activas
  totalProcesos:         number;
  nuevosEsteMes:         number;   // usuarios creados este mes (exc. admins)
}

const USER_ROLES = ["abogado", "bufete", "cliente"] as const;

export class AdminStatsStorage {
  constructor(private db: Database) {}

  async getStats(): Promise<AdminStats> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // IDs de roles de usuario final (excluye admins)
    const userRoleRows = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(inArray(roles.nombre, [...USER_ROLES]));

    const userRoleIds = userRoleRows.map(r => r.id);

    const [
      usuariosResult,
      suscripcionesResult,
      ingresosResult,
      procesosResult,
      nuevosResult,
    ] = await Promise.all([

      // Total usuarios finales
      userRoleIds.length > 0
        ? this.db
            .select({ total: sql<number>`COUNT(*)` })
            .from(users)
            .where(inArray(users.rolId, userRoleIds))
        : Promise.resolve([{ total: 0 }]),

      // Suscripciones activas
      this.db
        .select({ total: sql<number>`COUNT(*)` })
        .from(suscripciones)
        .where(sql`${suscripciones.estado} = 'activa'`),

      // Ingresos estimados COP (normalizados a mensual)
      this.db
        .select({
          total: sql<number>`
            SUM(
              CASE ${suscripciones.ciclo}
                WHEN 'mensual' THEN CAST(${planes.precioMensualCop} AS DECIMAL(14,2))
                WHEN 'anual'   THEN CAST(${planes.precioAnualCop}   AS DECIMAL(14,2)) / 12
                ELSE 0
              END
            )
          `,
        })
        .from(suscripciones)
        .innerJoin(planes, sql`${planes.id} = ${suscripciones.planId}`)
        .where(sql`${suscripciones.estado} = 'activa'`),

      // Total procesos activos
      this.db
        .select({ total: sql<number>`COUNT(*)` })
        .from(procesos)
        .where(sql`${procesos.state} = 1`),

      // Nuevos usuarios este mes (solo roles finales)
      userRoleIds.length > 0
        ? this.db
            .select({ total: sql<number>`COUNT(*)` })
            .from(users)
            .where(
              sql`${users.rolId} IN (${sql.join(userRoleIds.map(id => sql`${id}`), sql`, `)})
                  AND ${users.createdAt} >= ${startOfMonth}`
            )
        : Promise.resolve([{ total: 0 }]),
    ]);

    return {
      totalUsuarios:        Number(usuariosResult[0]?.total       ?? 0),
      suscripcionesActivas: Number(suscripcionesResult[0]?.total  ?? 0),
      ingresosEstimadosCop: Number(ingresosResult[0]?.total       ?? 0),
      totalProcesos:        Number(procesosResult[0]?.total        ?? 0),
      nuevosEsteMes:        Number(nuevosResult[0]?.total          ?? 0),
    };
  }
}
```

- [ ] **Step 3.2: Agregar `adminStats` al `DatabaseStorage`**

Abre `server/storage/storeage/database-storage.ts`.

Agrega el import (junto a los demás imports de storage):
```ts
import { AdminStatsStorage } from "../../admin/storage/admin-stats.storage.js";
```

Agrega la propiedad pública en la clase (junto a las demás propiedades):
```ts
public adminStats: AdminStatsStorage;
```

Agrega la inicialización en el constructor (después de la última línea de `this.xxx = new XxxStorage(this.db)`):
```ts
this.adminStats = new AdminStatsStorage(this.db);
```

- [ ] **Step 3.3: Commit**

```bash
git add server/admin/storage/admin-stats.storage.ts server/storage/storeage/database-storage.ts
git commit -m "feat(admin): agregar AdminStatsStorage con métricas globales"
```

---

## Task 4: Service, Controller y Route de stats

**Files:**
- Create: `server/admin/services/admin-stats.service.ts`
- Create: `server/admin/controllers/admin-stats.controller.ts`
- Create: `server/admin/routes/admin-stats.routes.ts`

- [ ] **Step 4.1: Crear el service**

```ts
// server/admin/services/admin-stats.service.ts
import { storage } from "../../storage/storeage/database-storage.js";
import type { AdminStats } from "../storage/admin-stats.storage.js";

export const adminStatsService = {
  async getStats(): Promise<AdminStats> {
    return storage.adminStats.getStats();
  },
};
```

- [ ] **Step 4.2: Crear el controller**

```ts
// server/admin/controllers/admin-stats.controller.ts
import type { Request, Response, NextFunction } from "express";
import { adminStatsService } from "../services/admin-stats.service.js";

export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await adminStatsService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 4.3: Crear la ruta**

```ts
// server/admin/routes/admin-stats.routes.ts
import { Router } from "express";
import { authenticate } from "../../auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { getStats } from "../controllers/admin-stats.controller.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", getStats);

export default router;
```

- [ ] **Step 4.4: Crear el index de rutas admin**

```ts
// server/admin/routes/index.ts
import { Router } from "express";
import adminStatsRoutes from "./admin-stats.routes.js";

const router = Router();

router.use("/stats", adminStatsRoutes);

export default router;
```

- [ ] **Step 4.5: Registrar en `server/routes/index.ts`**

Abre `server/routes/index.ts`.

Agrega el import después de los últimos imports:
```ts
import adminRoutes from "../admin/routes/index.js";
```

Agrega el mount al final de `registerAppRoutes`, antes del cierre de la función:
```ts
app.use("/api/admin", adminRoutes);
```

- [ ] **Step 4.6: Verificar el endpoint manualmente**

Primero haz login con el usuario admin creado en Task 1 y copia el token JWT. Luego:

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/admin/stats
```

Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "totalUsuarios": 12,
    "suscripcionesActivas": 8,
    "ingresosEstimadosCop": 359200,
    "totalProcesos": 47,
    "nuevosEsteMes": 3
  }
}
```

Verifica también que sin token retorna 401 y que con un token de abogado retorna 403.

- [ ] **Step 4.7: Commit**

```bash
git add server/admin/services/admin-stats.service.ts \
        server/admin/controllers/admin-stats.controller.ts \
        server/admin/routes/admin-stats.routes.ts \
        server/admin/routes/index.ts \
        server/routes/index.ts
git commit -m "feat(admin): endpoint GET /api/admin/stats con métricas globales"
```

---

## Task 5: Protección de rol en `_layout.tsx` principal

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 5.1: Verificar qué campo del JWT contiene el nombre del rol**

Abre `lib/auth.ts` (o donde se procesa la respuesta del login) y busca dónde se popula `user.rol.nombre`. Confirma que ese valor es el string `"admin_super"`, `"admin_soporte"` o `"admin_finanzas"`.

- [ ] **Step 5.2: Agregar los roles admin a `ROLE_ROUTES`**

Abre `app/_layout.tsx`. Actualiza el tipo `AppRoute` y el objeto `ROLE_ROUTES`:

```ts
// Línea ~45: actualizar el tipo
type AppRoute = "/(lawyer-tabs)" | "/(firm-tabs)" | "/portal" | "/(admin-tabs)";

// Línea ~48: actualizar el mapa de rutas
const ROLE_ROUTES: Record<string, AppRoute> = {
  abogado:         "/(lawyer-tabs)",
  bufete:          "/(firm-tabs)",
  cliente:         "/portal",
  admin_super:     "/(admin-tabs)",
  admin_soporte:   "/(admin-tabs)",
  admin_finanzas:  "/(admin-tabs)",
};
```

- [ ] **Step 5.3: Agregar `(admin-tabs)` al Stack**

En el componente `RootLayout`, dentro del `<Stack>`, agrega la pantalla:

```tsx
<Stack.Screen name="(admin-tabs)" />
```

- [ ] **Step 5.4: Verificar que el login redirige correctamente**

Inicia sesión con `admin@lextrack.co` y confirma que la app redirige a `/(admin-tabs)` en vez de mostrar error o redirigir a otra pantalla.

- [ ] **Step 5.5: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(admin): agregar roles admin a ROLE_ROUTES y Stack"
```

---

## Task 6: Layout del grupo `(admin-tabs)`

**Files:**
- Create: `app/(admin-tabs)/_layout.tsx`

- [ ] **Step 6.1: Crear el layout**

```tsx
// app/(admin-tabs)/_layout.tsx
import { Stack } from "expo-router";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { Platform } from "react-native";

const ADMIN_ROLES = ["admin_super", "admin_soporte", "admin_finanzas"] as const;

export default function AdminLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  const rol = user?.user?.rol?.nombre ?? "";

  if (!ADMIN_ROLES.includes(rol as any)) {
    return <Redirect href="/login" />;
  }

  // El portal admin es exclusivamente web
  if (Platform.OS !== "web") {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
      }}
    />
  );
}
```

- [ ] **Step 6.2: Commit**

```bash
git add "app/(admin-tabs)/_layout.tsx"
git commit -m "feat(admin): crear layout del grupo (admin-tabs) con protección de rol"
```

---

## Task 7: `AdminShell` — Sidebar + Topbar + slot

**Files:**
- Create: `app/(admin-tabs)/_shell/AdminShell.tsx`
- Create: `app/(admin-tabs)/_shell/Sidebar.tsx`
- Create: `app/(admin-tabs)/_shell/Topbar.tsx`

- [ ] **Step 7.1: Crear `Sidebar.tsx`**

```tsx
// app/(admin-tabs)/_shell/Sidebar.tsx
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { router, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type NavItem = {
  label: string;
  route: string;         // segmento relativo, ej: "dashboard"
  icon:  keyof typeof Ionicons.glyphMap;
  roles: string[];
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    route: "dashboard",
    icon:  "grid-outline",
    roles: ["admin_super", "admin_soporte", "admin_finanzas"],
  },
  {
    label: "Usuarios",
    route: "usuarios",
    icon:  "people-outline",
    roles: ["admin_super", "admin_soporte"],
  },
  {
    label: "Planes",
    route: "planes",
    icon:  "layers-outline",
    roles: ["admin_super", "admin_finanzas"],
  },
  {
    label: "Facturación",
    route: "facturacion",
    icon:  "card-outline",
    roles: ["admin_super", "admin_finanzas"],
  },
  {
    label: "Procesos",
    route: "procesos",
    icon:  "document-text-outline",
    roles: ["admin_super"],
  },
  {
    label: "Soporte",
    route: "soporte",
    icon:  "chatbox-ellipses-outline",
    roles: ["admin_super", "admin_soporte"],
  },
  {
    label: "Comunidad",
    route: "comunidad",
    icon:  "globe-outline",
    roles: ["admin_super", "admin_soporte"],
  },
  {
    label: "Configuración",
    route: "configuracion",
    icon:  "settings-outline",
    roles: ["admin_super"],
  },
];

interface Props {
  rol: string;
}

export function Sidebar({ rol }: Props) {
  const segments = useSegments();
  const currentSegment = segments[1] ?? "dashboard";   // segments[0] = "(admin-tabs)"

  const visible = NAV_ITEMS.filter(item => item.roles.includes(rol));

  return (
    <View style={styles.sidebar}>
      <View style={styles.logoContainer}>
        <Ionicons name="scale-outline" size={22} color="#2563EB" />
        <Text style={styles.logoText}>LexTrack</Text>
      </View>
      <Text style={styles.sectionLabel}>ADMINISTRACIÓN</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {visible.map(item => {
          const active = currentSegment === item.route ||
                         currentSegment.startsWith(item.route + "/");
          return (
            <Pressable
              key={item.route}
              onPress={() => router.push(`/(admin-tabs)/${item.route}` as any)}
              style={({ pressed }) => [
                styles.item,
                active   && styles.itemActive,
                pressed  && styles.itemPressed,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={active ? "#2563EB" : "#64748B"}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderColor: "#E2E8F0",
    paddingTop: 24,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    marginBottom: 28,
  },
  logoText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#1E293B",
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#94A3B8",
    letterSpacing: 1,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  itemActive: {
    backgroundColor: "#EFF6FF",
  },
  itemPressed: {
    backgroundColor: "#F1F5F9",
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
  },
  labelActive: {
    color: "#2563EB",
    fontFamily: "Inter_600SemiBold",
  },
});
```

- [ ] **Step 7.2: Crear `Topbar.tsx`**

```tsx
// app/(admin-tabs)/_shell/Topbar.tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";

const ROL_LABELS: Record<string, string> = {
  admin_super:    "Super Admin",
  admin_soporte:  "Admin Soporte",
  admin_finanzas: "Admin Finanzas",
};

interface Props {
  title: string;
}

export function Topbar({ title }: Props) {
  const { user, logout } = useAuth();
  const rolNombre  = user?.user?.rol?.nombre ?? "";
  const rolLabel   = ROL_LABELS[rolNombre] ?? rolNombre;
  const userName   = user?.user?.name ?? user?.user?.email ?? "Admin";

  return (
    <View style={styles.topbar}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.userSection}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userRol}>{rolLabel}</Text>
        </View>
        <Pressable
          onPress={logout}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
          accessibilityLabel="Cerrar sesión"
        >
          <Ionicons name="log-out-outline" size={20} color="#64748B" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    height: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#1E293B",
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userInfo: {
    alignItems: "flex-end",
  },
  userName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#1E293B",
  },
  userRol: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
  },
  logoutPressed: {
    backgroundColor: "#F1F5F9",
  },
});
```

- [ ] **Step 7.3: Crear `AdminShell.tsx`**

```tsx
// app/(admin-tabs)/_shell/AdminShell.tsx
import { View, StyleSheet, ScrollView } from "react-native";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "@/lib/auth-context";

interface Props {
  children:   React.ReactNode;
  title:      string;
  scrollable?: boolean;   // false si la pantalla maneja su propio scroll
}

export function AdminShell({ children, title, scrollable = true }: Props) {
  const { user } = useAuth();
  const rol = user?.user?.rol?.nombre ?? "";

  return (
    <View style={styles.root}>
      <Sidebar rol={rol} />
      <View style={styles.main}>
        <Topbar title={title} />
        {scrollable ? (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.content}>{children}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  main: {
    flex: 1,
    flexDirection: "column",
    overflow: "hidden" as any,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    padding: 28,
    gap: 20,
  },
});
```

- [ ] **Step 7.4: Commit**

```bash
git add "app/(admin-tabs)/_shell/"
git commit -m "feat(admin): crear AdminShell, Sidebar y Topbar"
```

---

## Task 8: Cliente HTTP del admin

**Files:**
- Create: `lib/services/adminService.ts`

- [ ] **Step 8.1: Crear el cliente HTTP**

```ts
// lib/services/adminService.ts
import { apiClient } from "@/lib/apiClient";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsuarios:         number;
  suscripcionesActivas:  number;
  ingresosEstimadosCop:  number;
  totalProcesos:         number;
  nuevosEsteMes:         number;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export const adminStatsService = {
  getStats: (): Promise<{ success: boolean; data: AdminStats }> =>
    apiClient.get("/admin/stats"),
};
```

- [ ] **Step 8.2: Commit**

```bash
git add lib/services/adminService.ts
git commit -m "feat(admin): agregar adminService con cliente HTTP para stats"
```

---

## Task 9: Dashboard screen

**Files:**
- Create: `app/(admin-tabs)/dashboard.tsx`

- [ ] **Step 9.1: Crear el dashboard**

```tsx
// app/(admin-tabs)/dashboard.tsx
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "./_shell/AdminShell";
import { adminStatsService, type AdminStats } from "@/lib/services/adminService";
import { Ionicons } from "@expo/vector-icons";

// ── StatCard ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:    string;
  value:    string | number;
  icon:     keyof typeof Ionicons.glyphMap;
  color:    string;
  sub?:     string;
}

function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={[styles.cardIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardLabel}>{label}</Text>
        {sub ? <Text style={styles.cardSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style:    "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn:  () => adminStatsService.getStats(),
    staleTime: 60_000,   // 1 minuto
  });

  const stats: AdminStats | undefined = data?.data;

  return (
    <AdminShell title="Dashboard">
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando métricas...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
          <Text style={styles.errorText}>
            Error al cargar las métricas. Intenta recargar la página.
          </Text>
        </View>
      )}

      {stats && (
        <>
          <Text style={styles.sectionTitle}>Resumen general</Text>
          <View style={styles.grid}>
            <StatCard
              label="Usuarios registrados"
              value={stats.totalUsuarios.toLocaleString("es-CO")}
              icon="people-outline"
              color="#2563EB"
              sub={`+${stats.nuevosEsteMes} este mes`}
            />
            <StatCard
              label="Suscripciones activas"
              value={stats.suscripcionesActivas.toLocaleString("es-CO")}
              icon="checkmark-circle-outline"
              color="#16A34A"
            />
            <StatCard
              label="Ingresos estimados / mes"
              value={formatCOP(stats.ingresosEstimadosCop)}
              icon="card-outline"
              color="#9333EA"
              sub="Solo suscripciones activas"
            />
            <StatCard
              label="Procesos activos"
              value={stats.totalProcesos.toLocaleString("es-CO")}
              icon="document-text-outline"
              color="#EA580C"
            />
            <StatCard
              label="Nuevos usuarios este mes"
              value={stats.nuevosEsteMes.toLocaleString("es-CO")}
              icon="person-add-outline"
              color="#0891B2"
            />
          </View>
        </>
      )}
    </AdminShell>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#64748B",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 10,
    padding: 14,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#DC2626",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#1E293B",
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minWidth: 200,
    flex: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#1E293B",
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
  },
  cardSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    marginTop: 2,
  },
});
```

- [ ] **Step 9.2: Verificar el dashboard en el navegador**

1. Inicia el servidor Expo en modo web: `npx expo start --web`
2. Navega a la URL local
3. Inicia sesión con `admin@lextrack.co`
4. Verifica que:
   - El sidebar aparece con los 8 items (para admin_super)
   - Las 5 tarjetas de métricas muestran datos reales
   - El nombre del admin y su rol aparecen en el Topbar
   - El botón de logout funciona

- [ ] **Step 9.3: Commit final**

```bash
git add "app/(admin-tabs)/dashboard.tsx" lib/services/adminService.ts
git commit -m "feat(admin): dashboard con métricas globales del sistema"
```

---

## Verificación final de la entrega

Antes de dar por completado el Plan 1, verificar:

- [ ] Login con `admin@lextrack.co` redirige a `/(admin-tabs)/dashboard`
- [ ] Login con usuario `abogado` NO redirige al portal admin
- [ ] `GET /api/admin/stats` sin token → 401
- [ ] `GET /api/admin/stats` con token de abogado → 403
- [ ] `GET /api/admin/stats` con token admin → 200 con datos reales
- [ ] Sidebar muestra ítems correctos según sub-rol (crear usuarios admin_soporte y admin_finanzas para validar)
- [ ] El seed es idempotente (reiniciar el servidor no duplica los roles)

---

## Plan 2 (siguiente)

Una vez validado este plan, el Plan 2 cubrirá:
- Gestión de Usuarios (lista, detalle, suspender, cambiar plan, reset password)
- CRUD de Planes (sin seed estático)
- Facturación y soporte de tickets
- Moderación de comunidad
- Configuración: feature flags y audit log
