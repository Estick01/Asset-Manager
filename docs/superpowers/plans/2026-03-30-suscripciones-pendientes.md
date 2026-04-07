# Suscripciones Pendientes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar el flujo de suscripciones: endpoint de estado de pago, pantalla `/checkout/result` con polling, PlanGate integrado en creación de procesos/clientes, revert de email enumeration, y variables de entorno documentadas.

**Architecture:** Backend-first: agregar endpoint REST mínimo, luego reorganizar rutas de checkout en Expo Router y construir la pantalla de resultado con polling, y finalmente integrar el modal PlanGate existente en los formularios de creación.

**Tech Stack:** Express + Drizzle ORM (backend), Expo Router + React Native (frontend), `suscripcionService.ts` como capa de servicio frontend.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `server/routes/auth.ts` | Modificar | Revert mensaje email duplicado |
| `server/routes/suscripciones.ts` | Modificar | Agregar `GET /api/pagos/:pagoId/estado` |
| `lib/services/suscripcionService.ts` | Modificar | Agregar `getPagoEstado()` + clase `LimitReachedError` |
| `app/checkout.tsx` → `app/checkout/index.tsx` | Renombrar + modificar | Redirigir a `/checkout/result` cuando hay `pagoId` |
| `app/checkout/result.tsx` | Crear | Pantalla con polling de estado de pago |
| `app/case/new.tsx` | Modificar | Integrar `PlanGate` en creación de proceso |
| `app/client/new.tsx` | Modificar | Integrar `PlanGate` en creación de cliente |
| `.env.example` | Crear | Variables de entorno con valores de ejemplo |
| `README.md` | Modificar | Agregar tabla Wompi en sección Variables de entorno |

---

## Task 1: Revert email enumeration en auth.ts

**Files:**
- Modify: `server/routes/auth.ts`

- [ ] **Step 1: Revertir mensaje en register/lawyer**

En `server/routes/auth.ts`, buscar el bloque donde se verifica email duplicado en la ruta `register/lawyer` y cambiar:

```ts
// ANTES (cambio sin commitear):
message: "El correo electrónico ya está registrado.",

// DESPUÉS (revert):
message: "No fue posible completar el registro. Verifica los datos ingresados.",
```

- [ ] **Step 2: Revertir mensaje en register/firm**

En el mismo archivo, hacer el mismo revert en la ruta `register/firm`:

```ts
// ANTES (cambio sin commitear):
message: "El correo electrónico ya está registrado.",

// DESPUÉS (revert):
message: "No fue posible completar el registro. Verifica los datos ingresados.",
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/auth.ts
git commit -m "security: revert email enumeration en registro de abogado y firma"
```

---

## Task 2: Endpoint GET /api/pagos/:pagoId/estado

**Files:**
- Modify: `server/routes/suscripciones.ts`

- [ ] **Step 1: Agregar el endpoint al final de suscripciones.ts (antes del `export default`)**

```ts
// ── GET /api/pagos/:pagoId/estado ─────────────────────────────────────────────

router.get("/pagos/:pagoId/estado", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as JWTPayload;
    const { pagoId } = req.params;

    const pago = await storage.pagosStorage.getById(pagoId);

    if (!pago || pago.userId !== user.id) {
      res.status(404).json({ error: "Pago no encontrado" });
      return;
    }

    res.json({
      estado: pago.estado,
      wompiTransactionId: pago.wompiTransactionId ?? null,
      metodoPago: pago.metodoPago ?? null,
    });
  } catch (err) { next(err); }
});
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/suscripciones.ts
git commit -m "feat(api): agregar GET /api/pagos/:pagoId/estado"
```

---

## Task 3: Agregar getPagoEstado y LimitReachedError en suscripcionService.ts

**Files:**
- Modify: `lib/services/suscripcionService.ts`

- [ ] **Step 1: Agregar la clase LimitReachedError y el tipo PagoEstado**

Al final de los tipos en `lib/services/suscripcionService.ts` (después de `CheckoutResult`), agregar:

```ts
export type TipoLimite = "procesos" | "clientes" | "storage";

export interface PagoEstado {
  estado: "pendiente" | "aprobado" | "rechazado";
  wompiTransactionId: string | null;
  metodoPago: string | null;
}

export class LimitReachedError extends Error {
  constructor(
    public readonly tipo: TipoLimite,
    public readonly actual: number,
    public readonly maximo: number,
  ) {
    super(`Límite alcanzado: ${actual}/${maximo} ${tipo}`);
    this.name = "LimitReachedError";
  }
}
```

- [ ] **Step 2: Agregar la función getPagoEstado**

Al final del archivo, antes del cierre, agregar:

```ts
/**
 * Consulta el estado de un pago por su ID.
 */
export async function getPagoEstado(pagoId: string): Promise<PagoEstado> {
  const res = await apiRequest("GET", `/api/pagos/${pagoId}/estado`, undefined, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al consultar el estado del pago");
  }
  return res.json();
}
```

- [ ] **Step 3: Agregar handleApiError para detectar 403 LIMIT_REACHED**

Al final del archivo, agregar:

```ts
/**
 * Lanza LimitReachedError si la respuesta es 403 con code LIMIT_REACHED.
 * De lo contrario lanza un Error genérico con el mensaje del servidor.
 */
export async function handleApiError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  if (res.status === 403 && body.code === "LIMIT_REACHED") {
    throw new LimitReachedError(
      body.tipo ?? "procesos",
      body.actual ?? 0,
      body.maximo ?? 0,
    );
  }
  throw new Error(body.error || body.message || "Error inesperado");
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/services/suscripcionService.ts
git commit -m "feat(service): agregar getPagoEstado, LimitReachedError y handleApiError"
```

---

## Task 4: Reorganizar checkout — mover a carpeta y actualizar redirect

**Files:**
- Rename: `app/checkout.tsx` → `app/checkout/index.tsx`
- Modify: `app/checkout/index.tsx`

- [ ] **Step 1: Crear la carpeta y mover el archivo**

```bash
mkdir "app/checkout"
# Copiar contenido de app/checkout.tsx a app/checkout/index.tsx
# Luego eliminar app/checkout.tsx
```

O hacerlo manualmente: crear `app/checkout/index.tsx` con el mismo contenido de `app/checkout.tsx` y eliminar `app/checkout.tsx`.

- [ ] **Step 2: Actualizar el import de checkout en suscripcionService (si hay alguno)**

Verificar que ningún import apunte a `@/app/checkout` — las rutas de Expo Router no se importan directamente, así que este paso probablemente no aplica.

- [ ] **Step 3: Modificar el estado `pending` en app/checkout/index.tsx**

En la función `iniciarCheckout`, cuando el pago tiene `payment_url`, después de abrir el browser, reemplazar `setEstado("pending")` por la redirección a `/checkout/result`:

```ts
if (result.payment_url) {
  await WebBrowser.openBrowserAsync(result.payment_url);
  // Redirigir a la pantalla de resultado con polling
  router.replace({
    pathname: "/checkout/result",
    params: {
      pagoId: result.pagoId ?? "",
      planNombre: result.planNombre ?? nombrePlan,
      ciclo,
    },
  });
  return;
}

// Si no hay payment_url ni activated, redirigir igual
router.replace({
  pathname: "/checkout/result",
  params: {
    pagoId: "",
    planNombre: nombrePlan,
    ciclo,
  },
});
```

- [ ] **Step 4: Eliminar PendingView de checkout/index.tsx**

El componente `PendingView` y su uso en el JSX ya no son necesarios. Eliminar la función `PendingView` y el bloque `{estado === "pending" && ...}` del JSX.

También eliminar `"pending"` del tipo `Estado`:

```ts
type Estado = "loading" | "error" | "activated";
```

- [ ] **Step 5: Commit**

```bash
git add app/checkout/
git rm app/checkout.tsx 2>/dev/null || true
git commit -m "refactor(checkout): mover a carpeta y redirigir a /checkout/result"
```

---

## Task 5: Crear pantalla app/checkout/result.tsx

**Files:**
- Create: `app/checkout/result.tsx`

- [ ] **Step 1: Crear el archivo con la pantalla completa**

```tsx
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getPagoEstado, getMiSuscripcion } from "@/lib/services/suscripcionService";

type Estado = "verificando" | "aprobado" | "rechazado" | "timeout";

const MAX_INTENTOS = 5;
const INTERVALO_MS = 3000;

export default function CheckoutResultScreen() {
  const insets = useSafeAreaInsets();
  const { pagoId, planNombre, ciclo } = useLocalSearchParams<{
    pagoId: string;
    planNombre?: string;
    ciclo?: string;
  }>();

  const [estado, setEstado] = useState<Estado>("verificando");
  const intentosRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const detenerPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const verificar = async () => {
    if (!pagoId) {
      setEstado("timeout");
      detenerPolling();
      return;
    }

    intentosRef.current += 1;

    try {
      const data = await getPagoEstado(pagoId);

      if (data.estado === "aprobado") {
        // Refrescar suscripción en contexto
        await getMiSuscripcion().catch(() => {/* no bloquear si falla */});
        setEstado("aprobado");
        detenerPolling();
        return;
      }

      if (data.estado === "rechazado") {
        setEstado("rechazado");
        detenerPolling();
        return;
      }
    } catch {
      // Error de red — continuar intentando si hay intentos restantes
    }

    if (intentosRef.current >= MAX_INTENTOS) {
      setEstado("timeout");
      detenerPolling();
    }
  };

  useEffect(() => {
    verificar();
    intervalRef.current = setInterval(verificar, INTERVALO_MS);
    return detenerPolling;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cicloLabel = ciclo === "anual" ? "Anual" : "Mensual";

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estado del pago</Text>
      </View>

      <View style={styles.content}>
        {estado === "verificando" && (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
            <Text style={styles.stateTitle}>Verificando tu pago...</Text>
            {!!planNombre && (
              <Text style={styles.stateSubtitle}>
                {planNombre} · {cicloLabel}
              </Text>
            )}
          </View>
        )}

        {estado === "aprobado" && (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="checkmark" size={48} color={Colors.success} />
            </View>
            <Text style={styles.stateTitle}>¡Plan activado!</Text>
            {!!planNombre && <Text style={styles.stateSubtitle}>{planNombre}</Text>}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.primary }]}
              onPress={() => router.replace("/")}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Ir al inicio</Text>
            </TouchableOpacity>
          </View>
        )}

        {estado === "rechazado" && (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.dangerLight }]}>
              <Ionicons name="close" size={48} color={Colors.danger} />
            </View>
            <Text style={styles.stateTitle}>Pago no aprobado</Text>
            <Text style={styles.stateBody}>
              Tu pago fue rechazado. Puedes intentar con otro método de pago.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.primary }]}
              onPress={() => router.replace("/planes")}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Intentar de nuevo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonOutline]}
              onPress={() => router.replace("/")}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { color: Colors.textSecondary }]}>Ir al inicio</Text>
            </TouchableOpacity>
          </View>
        )}

        {estado === "timeout" && (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.warningLight }]}>
              <Ionicons name="time-outline" size={48} color={Colors.warning} />
            </View>
            <Text style={styles.stateTitle}>Estamos procesando tu pago</Text>
            <Text style={styles.stateBody}>
              Esto puede tardar unos minutos. Te notificaremos cuando se confirme.
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.primary }]}
              onPress={() => router.replace("/")}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Ir al inicio</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.text,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  stateContainer: {
    alignItems: "center",
    width: "100%",
  },
  spinner: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  stateTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  stateSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  stateBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonOutline: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.white,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/checkout/result.tsx
git commit -m "feat(checkout): agregar pantalla /checkout/result con polling de estado de pago"
```

---

## Task 6: Integrar PlanGate en creación de procesos

**Files:**
- Modify: `app/case/new.tsx`

- [ ] **Step 1: Agregar imports necesarios**

Al inicio de `app/case/new.tsx`, agregar:

```ts
import { PlanGate } from "@/components/subscription/PlanGate";
import { LimitReachedError } from "@/lib/services/suscripcionService";
```

- [ ] **Step 2: Agregar estado para el modal y datos de uso**

Dentro del componente `NewCaseScreen`, agregar:

```ts
const [planGateVisible, setPlanGateVisible] = useState(false);
const [limiteUso, setLimiteUso] = useState({ actual: 0, maximo: 0 });
```

- [ ] **Step 3: Actualizar handleSave para capturar LimitReachedError**

Reemplazar el bloque `catch` en `handleSave`:

```ts
} catch (err) {
  if (err instanceof LimitReachedError) {
    setLimiteUso({ actual: err.actual, maximo: err.maximo });
    setPlanGateVisible(true);
    return;
  }
  setError("Error al guardar");
} finally {
```

- [ ] **Step 4: Agregar PlanGate al JSX**

Dentro del `return`, justo antes del cierre de `<View style={styles.screen}>`, agregar:

```tsx
<PlanGate
  visible={planGateVisible}
  onClose={() => setPlanGateVisible(false)}
  onVerPlanes={() => {
    setPlanGateVisible(false);
    router.push("/planes");
  }}
  tipo="procesos"
  actual={limiteUso.actual}
  maximo={limiteUso.maximo}
/>
```

- [ ] **Step 5: Commit**

```bash
git add app/case/new.tsx
git commit -m "feat(casos): integrar PlanGate al crear proceso"
```

---

## Task 7: Integrar PlanGate en creación de clientes

**Files:**
- Modify: `app/client/new.tsx`

- [ ] **Step 1: Agregar imports necesarios**

Al inicio de `app/client/new.tsx`, agregar:

```ts
import { PlanGate } from "@/components/subscription/PlanGate";
import { LimitReachedError } from "@/lib/services/suscripcionService";
```

- [ ] **Step 2: Agregar estado para el modal y datos de uso**

Dentro del componente `NewClientScreen`, agregar:

```ts
const [planGateVisible, setPlanGateVisible] = useState(false);
const [limiteUso, setLimiteUso] = useState({ actual: 0, maximo: 0 });
```

- [ ] **Step 3: Actualizar handleSave para capturar LimitReachedError**

Reemplazar el bloque `catch` en `handleSave` (actualmente `catch (err: any)`):

```ts
} catch (err) {
  if (err instanceof LimitReachedError) {
    setLimiteUso({ actual: err.actual, maximo: err.maximo });
    setPlanGateVisible(true);
    return;
  }
  setError(err instanceof Error ? err.message : "Error al guardar");
} finally {
```

- [ ] **Step 4: Agregar PlanGate al JSX**

Dentro del `return`, justo antes del cierre de `<View style={styles.screen}>`, agregar:

```tsx
<PlanGate
  visible={planGateVisible}
  onClose={() => setPlanGateVisible(false)}
  onVerPlanes={() => {
    setPlanGateVisible(false);
    router.push("/planes");
  }}
  tipo="clientes"
  actual={limiteUso.actual}
  maximo={limiteUso.maximo}
/>
```

- [ ] **Step 5: Commit**

```bash
git add app/client/new.tsx
git commit -m "feat(clientes): integrar PlanGate al crear cliente"
```

---

## Task 8: Documentar variables de entorno

**Files:**
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Crear .env.example en la raíz**

Crear el archivo `.env.example` con todas las variables del proyecto:

```env
# ── Base de datos ──────────────────────────────────────────────────────────────
DATABASE_URL=mysql://usuario:contraseña@localhost:3306/lextrack

# ── Seguridad JWT ──────────────────────────────────────────────────────────────
JWT_SECRET="clave-secreta-segura-cambiar-en-produccion"
BCRYPT_SALT_ROUNDS=12

# ── Redis (rate limiting) ──────────────────────────────────────────────────────
# Dejar vacío para usar fallback en memoria (solo dev, un servidor)
REDIS_URL=redis://localhost:6379

# ── Email (SMTP Gmail) ─────────────────────────────────────────────────────────
# Requiere una App Password de Google (no la contraseña normal)
# Activar en: https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
SMTP_FROM="LexTrack <tu-correo@gmail.com>"

# ── AWS S3 (documentos) ────────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_REGION=us-east-2
AWS_BUCKET_NAME=lextrack-documentos-prod

# ── Servidor ───────────────────────────────────────────────────────────────────
PORT=5000
LOCAL_IP=192.168.1.X
EXPO_PUBLIC_LOCAL_IP=192.168.1.X

# ── Wompi (pasarela de pagos Colombia) ────────────────────────────────────────
# Sandbox:    https://sandbox.wompi.co/v1
# Producción: https://production.wompi.co/v1
WOMPI_BASE_URL=https://sandbox.wompi.co/v1
# Obtener en: Panel Wompi → Desarrolladores → Llaves
WOMPI_PRIVATE_KEY=prv_stagtest_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Obtener en: Panel Wompi → Desarrolladores → Webhooks → Integrity secret
WOMPI_EVENTS_SECRET=stagtest_integrity_xxxxxxxxxxxxxxxxxxxx
# Dev:        exp://localhost:8081/--/checkout/result
# Producción: https://tudominio.com/checkout/result
WOMPI_REDIRECT_URL=exp://localhost:8081/--/checkout/result

# ── reCAPTCHA v3 (activar solo en producción) ─────────────────────────────────
# Registrar en: https://www.google.com/recaptcha/admin/create  (tipo: v3)
# RECAPTCHA_SECRET_KEY=6Lc...
# RECAPTCHA_MIN_SCORE=0.5
```

- [ ] **Step 2: Agregar tabla Wompi en README.md**

En `README.md`, dentro de la sección `## Variables de entorno` (después del bloque de código existente, antes del `>`), agregar:

```markdown
### Wompi — Pasarela de pagos

| Variable | Requerida | Descripción | Cómo obtenerla |
|---|---|---|---|
| `WOMPI_BASE_URL` | Sí | URL base de la API | Sandbox: `https://sandbox.wompi.co/v1` / Prod: `https://production.wompi.co/v1` |
| `WOMPI_PRIVATE_KEY` | Sí | Llave privada | Panel Wompi → Desarrolladores → Llaves |
| `WOMPI_EVENTS_SECRET` | Sí | Secret para verificar webhooks | Panel Wompi → Desarrolladores → Webhooks → Integrity secret |
| `WOMPI_REDIRECT_URL` | Sí | URL de retorno post-pago | Dev: `exp://localhost:8081/--/checkout/result` · Prod: tu dominio |
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: agregar .env.example y tabla Wompi en README"
```

---

## Self-Review

**Spec coverage:**
- ✅ Task 1 → Revert email enumeration
- ✅ Task 2 → Endpoint `/api/pagos/:pagoId/estado`
- ✅ Task 3 → `getPagoEstado`, `LimitReachedError`, `handleApiError` en suscripcionService
- ✅ Task 4 → Reorganizar checkout + redirigir a result
- ✅ Task 5 → Pantalla `/checkout/result` con polling (5 intentos × 3s)
- ✅ Task 6 → PlanGate en creación de procesos
- ✅ Task 7 → PlanGate en creación de clientes
- ✅ Task 8 → `.env.example` + tabla Wompi en README

**Consistencia de tipos:**
- `LimitReachedError` definido en Task 3, importado en Tasks 6 y 7 ✅
- `getPagoEstado` definido en Task 3, usado en Task 5 ✅
- `getMiSuscripcion` ya existe en el service, usado en Task 5 ✅
- `PagoEstado.estado` retorna `"pendiente" | "aprobado" | "rechazado"` — coincide con lo que consume la pantalla ✅

**Placeholders:** Ninguno encontrado ✅
