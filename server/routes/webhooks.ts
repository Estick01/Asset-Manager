/**
 * Webhooks Routes
 * POST /api/webhooks/wompi — recibe eventos de transacciones de Wompi
 *
 * SEGURIDAD: No requiere JWT. Verifica firma HMAC-SHA256 de Wompi.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { createHash } from "crypto";
import { storage } from "../storage/storeage/database-storage.js";
import { subscriptionService } from "../services/subscription.service.js";

const router = Router();

// ── Verificar firma de Wompi ──────────────────────────────────────────────────

function verifyWompiSignature(event: any, integritySecret: string): boolean {
  try {
    const { checksum, properties } = event.signature ?? {};
    if (!checksum || !Array.isArray(properties)) return false;

    // Construir el string a hashear: concatenar valores de las propiedades
    const data = event.data ?? {};
    const toHash = properties
      .map((prop: string) => {
        // prop puede ser "transaction.id", navegamos el objeto
        const value = prop.split(".").reduce((obj: any, key: string) => obj?.[key], data);
        return value ?? "";
      })
      .join("") + integritySecret;

    const expected = createHash("sha256").update(toHash).digest("hex");
    return expected === checksum;
  } catch {
    return false;
  }
}

// ── POST /api/webhooks/wompi ──────────────────────────────────────────────────

router.post("/webhooks/wompi", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const integritySecret = process.env.WOMPI_EVENTS_SECRET;
    if (!integritySecret) {
      console.error("[webhook:wompi] WOMPI_EVENTS_SECRET no configurado");
      res.status(500).json({ error: "Configuración incompleta" });
      return;
    }

    const event = req.body;

    // Verificar firma
    if (!verifyWompiSignature(event, integritySecret)) {
      console.warn("[webhook:wompi] Firma inválida — posible intento de fraude");
      res.status(401).json({ error: "Firma inválida" });
      return;
    }

    // Solo procesar transaction.updated
    if (event.event !== "transaction.updated") {
      res.status(200).json({ received: true });
      return;
    }

    const tx = event.data?.transaction;
    if (!tx) {
      res.status(400).json({ error: "Datos de transacción faltantes" });
      return;
    }

    const { id: wompiTxId, status, reference, payment_method_type } = tx;

    // Buscar el pago por referencia
    const pago = await storage.pagosStorage.getByReference(reference);
    if (!pago) {
      console.warn(`[webhook:wompi] Pago con referencia ${reference} no encontrado`);
      res.status(200).json({ received: true }); // 200 para que Wompi no reintente
      return;
    }

    // Mapear método de pago
    const metodoPagoMap: Record<string, string> = {
      CARD:                 "card",
      PSE:                  "pse",
      NEQUI:                "nequi",
      BANCOLOMBIA_TRANSFER: "bancolombia_transfer",
    };
    const metodoPago = metodoPagoMap[payment_method_type] ?? "otro";

    if (status === "APPROVED") {
      await storage.pagosStorage.updateEstado(pago.id, "aprobado", wompiTxId, metodoPago);

      // Obtener la última suscripción del usuario para recuperar planId/ciclo
      const suscripciones = await storage.suscripciones.getByUserId(pago.userId);
      const ultima = suscripciones.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const planId     = ultima?.planId     ?? "plan-abogado-esencial";
      const ciclo      = ultima?.ciclo      ?? "mensual";
      const extraUsers = ultima?.extraUsers ?? 0;

      await subscriptionService.activateSuscripcion(pago.userId, planId, ciclo, extraUsers, pago.id);

      await storage.appNotifications.createNotification(
        pago.userId,
        "subscription_activated",
        "¡Suscripción activada!",
        "Tu plan ha sido activado exitosamente.",
        { pagoId: pago.id },
      );

      console.log(`[webhook:wompi] Suscripción activada para usuario ${pago.userId}`);
    } else if (status === "DECLINED" || status === "ERROR" || status === "VOIDED") {
      await storage.pagosStorage.updateEstado(pago.id, "rechazado", wompiTxId, metodoPago);
      console.log(`[webhook:wompi] Pago rechazado para usuario ${pago.userId}: ${status}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[webhook:wompi] Error:", err);
    // Siempre responder 200 para que Wompi no reintente indefinidamente
    res.status(200).json({ received: true });
  }
});

export default router;
