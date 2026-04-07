# Diseño: Pendientes de Suscripciones/Planes

**Fecha:** 2026-03-30
**Proyecto:** LexTrack
**Estado:** Aprobado

---

## Resumen

Completar el flujo de suscripciones implementando los cinco puntos pendientes:
1. Pantalla de retorno post-pago con polling
2. Endpoint de estado de pago
3. PlanGate integrado en pantallas
4. Revert de email enumeration en auth
5. Variables de entorno documentadas

---

## 1. Backend — Nuevo endpoint de estado de pago

### `GET /api/pagos/:pagoId/estado`

**Archivo:** `server/routes/suscripciones.ts`

- Requiere autenticación (`authenticate` middleware)
- Valida que el pago pertenezca al usuario autenticado
- Usa `storage.pagosStorage.getById(pagoId)` (ya existe en `PagoStorage`)
- Respuesta:

```ts
{
  estado: "pendiente" | "aprobado" | "rechazado",
  wompiTransactionId: string | null,
  metodoPago: string | null,
}
```

- Si el pago no existe o no pertenece al usuario → `404`

---

## 2. Frontend — Pantalla `/checkout/result`

### Archivo: `app/checkout/result.tsx`

> Nota: Expo Router trata `app/checkout/result.tsx` como la ruta `/checkout/result`. Crear la carpeta `app/checkout/` y mover `app/checkout.tsx` → `app/checkout/index.tsx` para mantener la ruta `/checkout`.

**Params de entrada:** `pagoId`, `planNombre`, `ciclo`

### Estados de la pantalla

| Estado | Ícono | Título | Acciones |
|---|---|---|---|
| `verificando` | Spinner | "Verificando tu pago..." | — |
| `aprobado` | Verde ✓ | "¡Plan activado!" | "Ir al inicio" |
| `rechazado` | Rojo ✗ | "Pago no aprobado" | "Intentar de nuevo" → `/planes`, "Ir al inicio" |
| `timeout` | Amarillo ⏳ | "Estamos procesando tu pago" | "Ir al inicio" |

### Lógica de polling

```
iniciar polling cada 3 segundos:
  llamar GET /api/pagos/:pagoId/estado
  si estado === "aprobado":
    llamar GET /api/suscripciones/me  (actualizar contexto local)
    mostrar estado "aprobado"
    detener polling
  si estado === "rechazado":
    mostrar estado "rechazado"
    detener polling
  si intentos >= 5 (15 segundos):
    mostrar estado "timeout"
    detener polling

limpiar intervalo al desmontar componente
```

### Ajuste en `app/checkout/index.tsx`

En `PendingView`: en lugar de mostrar el estado pending estático, redirigir a `/checkout/result` con `router.replace` pasando `pagoId`, `planNombre`, `ciclo` como params.

---

## 3. Frontend — PlanGate en pantallas

### Estado actual

`components/subscription/PlanGate.tsx` ya existe como modal completo con props:
- `visible`, `onClose`, `onVerPlanes`, `tipo`, `actual`, `maximo`

### Integración en pantallas

El modal debe dispararse cuando el backend responde `403` con `{ code: "LIMIT_REACHED" }` al intentar crear un proceso o cliente.

**Pantallas a actualizar:**
- Pantalla de creación de procesos
- Pantalla de creación de clientes

**Patrón de integración:**

```ts
// En el handler de creación
try {
  await crearProceso(data);
} catch (err) {
  if (err instanceof LimitReachedError) {
    setPlanGateVisible(true);  // muestra el modal
    return;
  }
  // manejo normal de error
}

// En el JSX
<PlanGate
  visible={planGateVisible}
  onClose={() => setPlanGateVisible(false)}
  onVerPlanes={() => { setPlanGateVisible(false); router.push("/planes"); }}
  tipo="procesos"
  actual={uso.procesosUsados}
  maximo={uso.procesosMax}
/>
```

**Interceptor en `suscripcionService.ts`:** Crear un helper `handleApiError` que detecta el status 403 con `code: "LIMIT_REACHED"` y lanza un `LimitReachedError` tipado con `tipo`, `actual`, `maximo`.

---

## 4. Auth — Revert email enumeration

**Archivo:** `server/routes/auth.ts`

Revertir los dos cambios en `register/lawyer` y `register/firm`:

```ts
// REVERTIR a:
message: "No fue posible completar el registro. Verifica los datos ingresados."
```

Esto evita que un atacante descubra si un email ya existe en el sistema.

---

## 5. Variables de entorno

### `.env.example` (nuevo archivo en raíz)

Copia completa de todas las variables del proyecto con valores de ejemplo, incluyendo:

```env
# ── Wompi (pasarela de pagos) ──────────────────────────────────────────────────
# Sandbox: https://sandbox.wompi.co/v1  |  Producción: https://production.wompi.co/v1
WOMPI_BASE_URL=https://sandbox.wompi.co/v1
WOMPI_PRIVATE_KEY=prv_stagtest_xxxxxxxxxxxx
WOMPI_EVENTS_SECRET=stagtest_integrity_xxxxxxxxxxxx
# Dev: exp://localhost:8081/--/checkout/result
# Producción: https://tudominio.com/checkout/result
WOMPI_REDIRECT_URL=exp://localhost:8081/--/checkout/result

# ── reCAPTCHA v3 (activar en producción) ──────────────────────────────────────
RECAPTCHA_SECRET_KEY=
RECAPTCHA_MIN_SCORE=0.5
```

### `README.md` — sección Variables de entorno

Agregar tabla de Wompi dentro de la sección existente `## Variables de entorno`:

| Variable | Requerida | Descripción | Obtener en |
|---|---|---|---|
| `WOMPI_BASE_URL` | Sí | URL base de la API de Wompi | Panel Wompi |
| `WOMPI_PRIVATE_KEY` | Sí | Llave privada de Wompi | Panel Wompi → Desarrolladores |
| `WOMPI_EVENTS_SECRET` | Sí | Secret para verificar webhooks | Panel Wompi → Webhooks |
| `WOMPI_REDIRECT_URL` | Sí | URL de retorno post-pago | Configurar según entorno |

---

## Orden de implementación

1. `server/routes/auth.ts` — revert (cambio mínimo, sin riesgo)
2. `server/routes/suscripciones.ts` — endpoint `/pagos/:pagoId/estado`
3. `app/checkout/` — reorganizar archivos + crear `result.tsx`
4. `PlanGate` — integrar en pantallas de creación
5. `.env.example` + `README.md` — documentación

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `server/routes/auth.ts` | Revert mensaje email duplicado |
| `server/routes/suscripciones.ts` | Agregar GET `/pagos/:pagoId/estado` |
| `app/checkout.tsx` → `app/checkout/index.tsx` | Renombrar + redirect a result |
| `app/checkout/result.tsx` | Nuevo — pantalla con polling |
| `lib/services/suscripcionService.ts` | Agregar `getPagoEstado`, `LimitReachedError` |
| Pantalla creación procesos | Integrar `PlanGate` |
| Pantalla creación clientes | Integrar `PlanGate` |
| `.env.example` | Nuevo archivo |
| `README.md` | Agregar tabla Wompi en Variables de entorno |
