/**
 * Suscripciones Routes
 * GET  /api/planes              — lista planes públicos
 * GET  /api/suscripciones/me    — suscripción activa + uso
 * POST /api/suscripciones/checkout — inicia pago Wompi
 * POST /api/suscripciones/cancelar — cancela renovación automática
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { authenticate } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";
import { subscriptionService } from "../services/subscription.service.js";
import type { JWTPayload } from "@/shared/model.schema.js";

const router = Router();
const WOMPI_BASE = process.env.WOMPI_BASE_URL ?? "https://sandbox.wompi.co/v1";

// ── GET /api/planes ───────────────────────────────────────────────────────────

router.get("/planes", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tipo = req.query.tipo as "abogado" | "bufete" | undefined;
    const list = await storage.planes.getPlanesPublicos(tipo);
    res.json(list);
  } catch (err) { next(err); }
});

// ── GET /api/suscripciones/me ─────────────────────────────────────────────────

router.get("/suscripciones/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as JWTPayload;

    const suscripcion = await storage.suscripciones.getActive(user.id);
    if (!suscripcion) {
      res.status(404).json({ error: "Sin suscripción activa" });
      return;
    }

    const plan  = await storage.planes.getPlanesPublicos().then(list => list.find(p => p.id === suscripcion.planId));
    const usage = await storage.usageTracking.getByUserId(user.id);

    res.json({
      suscripcion,
      plan: plan ?? null,
      uso: usage
        ? {
            procesosUsados: usage.procesosUsados,
            procesosMax:    plan?.maxProcesos ?? 5,
            clientesUsados: usage.clientesUsados,
            clientesMax:    plan?.maxClientes ?? 10,
            storageUsadoMb: usage.storageUsadoMb,
            storageMaxMb:   (plan?.maxStorageGb ?? 0) * 1024,
          }
        : null,
    });
  } catch (err) { next(err); }
});

// ── POST /api/suscripciones/checkout ─────────────────────────────────────────

router.post("/suscripciones/checkout", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as JWTPayload;
    const { planId, ciclo, extraUsers = 0, currency = "COP" } = req.body as {
      planId:     string;
      ciclo:      "mensual" | "anual";
      extraUsers?: number;
      currency?:  "COP" | "USD";
    };

    if (!planId || !ciclo) {
      res.status(400).json({ error: "planId y ciclo son requeridos" });
      return;
    }

    const plan = await storage.planes.getPlan(planId);
    if (!plan || !plan.state) {
      res.status(404).json({ error: "Plan no encontrado" });
      return;
    }

    // Calcular monto
    const precioBase = ciclo === "mensual"
      ? { cop: parseFloat(plan.precioMensualCop), usd: parseFloat(plan.precioMensualUsd) }
      : { cop: parseFloat(plan.precioAnualCop),   usd: parseFloat(plan.precioAnualUsd) };

    const extra = Math.max(0, extraUsers - plan.includedUsers);
    const precioExtraCop = parseFloat(plan.precioUsuarioExtraCop ?? "0");
    const precioExtraUsd = parseFloat(plan.precioUsuarioExtraUsd ?? "0");

    let montoCop: number;
    let montoUsd: number;
    if (ciclo === "mensual") {
      montoCop = precioBase.cop + extra * precioExtraCop;
      montoUsd = precioBase.usd + extra * precioExtraUsd;
    } else {
      // Anual: precio base ya es el precio anual; extra_users se cobra mensual × 10
      montoCop = precioBase.cop + extra * precioExtraCop * 10;
      montoUsd = precioBase.usd + extra * precioExtraUsd * 10;
    }

    // Plan gratis → activar directo sin Wompi
    if (montoCop === 0 && montoUsd === 0) {
      await subscriptionService.activatePlanGratis(user.id);
      res.json({ activated: true, payment_url: null });
      return;
    }

    // Crear referencia única y pago pendiente
    const wompiReference = randomUUID();
    const suscripcionTemp = await storage.suscripciones.getActive(user.id);
    const suscripcionId = suscripcionTemp?.id ?? randomUUID();

    const pago = await storage.pagosStorage.create({
      suscripcionId,
      userId:     user.id,
      amountCop:  currency === "COP" ? montoCop.toFixed(2) : null,
      amountUsd:  currency === "USD" ? montoUsd.toFixed(2) : null,
      currency,
      estado:     "pendiente",
      wompiReference,
      concepto:   `Suscripción ${plan.nombre} - ${ciclo}`,
    });

    // Crear payment link en Wompi
    const amountInCents = currency === "COP"
      ? Math.round(montoCop * 100)
      : Math.round(montoUsd * 100);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // expira en 2 horas

    const wompiRes = await fetch(`${WOMPI_BASE}/payment_links`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${process.env.WOMPI_PRIVATE_KEY}`,
      },
      body: JSON.stringify({
        name:             `Suscripción ${plan.nombre}`,
        description:      `${ciclo === "mensual" ? "Mensual" : "Anual"} — ${plan.nombre}`,
        single_use:       true,
        collect_shipping: false,
        amount_in_cents:  amountInCents,
        currency:         currency,
        redirect_url:     process.env.WOMPI_REDIRECT_URL ?? "exp://localhost:8081/--/checkout/result",
        expires_at:       expiresAt.toISOString(),
        reference:        wompiReference,
      }),
    });

    if (!wompiRes.ok) {
      const err = await wompiRes.json();
      console.error("[checkout] Error Wompi:", err);
      res.status(502).json({ error: "Error al crear el link de pago. Intenta de nuevo." });
      return;
    }

    const wompiData = await wompiRes.json() as { data: { id: string; payment_link: string } };

    res.json({
      payment_url: wompiData.data.payment_link,
      reference:   wompiReference,
      pagoId:      pago.id,
      monto:       currency === "COP" ? montoCop : montoUsd,
      currency,
      planNombre:  plan.nombre,
    });
  } catch (err) { next(err); }
});

// ── POST /api/suscripciones/cancelar ─────────────────────────────────────────

router.post("/suscripciones/cancelar", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as JWTPayload;
    const suscripcion = await storage.suscripciones.getActive(user.id);

    if (!suscripcion) {
      res.status(404).json({ error: "Sin suscripción activa" });
      return;
    }
    if (suscripcion.planId === "plan-abogado-gratis") {
      res.status(400).json({ error: "No puedes cancelar el plan gratuito" });
      return;
    }

    await storage.suscripciones.cancelAutoRenovacion(suscripcion.id);
    res.json({
      mensaje:          "Renovación cancelada. Tu plan sigue activo hasta el vencimiento.",
      fechaVencimiento: suscripcion.fechaVencimiento,
    });
  } catch (err) { next(err); }
});

export default router;
