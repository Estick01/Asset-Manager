/**
 * SubscriptionService
 * Punto central para verificar límites, features y activar suscripciones.
 */
import { storage } from "../storage/storeage/database-storage.js";
import type { UsageTipo } from "../storage/storeage/models/usage-tracking-storage.js";

export interface LimitCheck {
  permitido:  boolean;
  actual:     number;
  maximo:     number;     // -1 = ilimitado
  porcentaje: number;     // 0-100
}

class SubscriptionService {

  // ── Plan activo ───────────────────────────────────────────────────────────

  async getActivePlan(userId: string) {
    const suscripcion = await storage.suscripciones.getActive(userId);
    if (!suscripcion) return null;
    const plan = await storage.planes.getPlan(suscripcion.planId);
    return plan ?? null;
  }

  // ── Verificar límite de recursos ──────────────────────────────────────────

  async checkLimit(
    userId:   string,
    tipo:     UsageTipo,
    mbExtra?: number,
  ): Promise<LimitCheck> {
    const plan  = await this.getActivePlan(userId);
    const usage = await storage.usageTracking.getByUserId(userId);

    // Sin plan → usar gratis por defecto (5 procesos, 10 clientes, 0 storage)
    const maxProcesos = plan?.maxProcesos ?? 5;
    const maxClientes = plan?.maxClientes ?? 10;
    const maxStorage  = (plan?.maxStorageGb ?? 0) * 1024; // en MB

    const actual = usage
      ? tipo === "procesos" ? usage.procesosUsados
      : tipo === "clientes" ? usage.clientesUsados
      : usage.storageUsadoMb
      : 0;

    const maximo = tipo === "procesos" ? maxProcesos
                 : tipo === "clientes" ? maxClientes
                 : maxStorage;

    // -1 = ilimitado
    if (maximo === -1) {
      return { permitido: true, actual, maximo: -1, porcentaje: 0 };
    }

    // Storage: verificar que el nuevo archivo no supere el límite
    const efectivo = tipo === "storage" ? actual + (mbExtra ?? 0) : actual + 1;
    const permitido = maximo === 0 ? false : efectivo <= maximo;
    const porcentaje = maximo === 0 ? 100 : Math.min(100, Math.round((actual / maximo) * 100));

    return { permitido, actual, maximo, porcentaje };
  }

  // ── Verificar feature ─────────────────────────────────────────────────────

  async hasFeature(userId: string, featureCode: string): Promise<boolean> {
    const suscripcion = await storage.suscripciones.getActive(userId);
    if (!suscripcion) return false;
    const { has } = await storage.featureStorage.hasFeature(suscripcion.planId, featureCode);
    return has;
  }

  async getFeatureValue(userId: string, featureCode: string): Promise<string | null> {
    const suscripcion = await storage.suscripciones.getActive(userId);
    if (!suscripcion) return null;
    const { has, value } = await storage.featureStorage.hasFeature(suscripcion.planId, featureCode);
    return has ? value : null;
  }

  // ── Actualizar uso ────────────────────────────────────────────────────────

  async incrementUsage(userId: string, tipo: UsageTipo, cantidad = 1): Promise<void> {
    await storage.usageTracking.increment(userId, tipo, cantidad);
  }

  async decrementUsage(userId: string, tipo: UsageTipo, cantidad = 1): Promise<void> {
    await storage.usageTracking.decrement(userId, tipo, cantidad);
  }

  // ── Activar suscripción (llamado desde webhook Wompi) ─────────────────────

  async activateSuscripcion(
    userId:     string,
    planId:     string,
    ciclo:      "mensual" | "anual",
    extraUsers: number,
    pagoId:     string,
  ): Promise<void> {
    // Cancelar suscripción activa anterior si existe
    const existing = await storage.suscripciones.getActive(userId);
    if (existing) {
      await storage.suscripciones.updateEstado(existing.id, "cancelada", new Date());
    }

    const fechaInicio      = new Date();
    const fechaVencimiento = new Date(fechaInicio);
    if (ciclo === "mensual") {
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);
    } else {
      fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);
    }

    const nueva = await storage.suscripciones.create({
      userId,
      planId,
      ciclo,
      estado:           "activa",
      fechaInicio,
      fechaVencimiento,
      autoRenovacion:   true,
      extraUsers,
    });

    await storage.usageTracking.initForUser(userId, nueva.id);
  }

  // ── Activar plan gratis (al registrarse) ──────────────────────────────────

  async activatePlanGratis(userId: string): Promise<void> {
    const existing = await storage.suscripciones.getActive(userId);
    if (existing) return; // Ya tiene una suscripción

    const fechaInicio      = new Date();
    const fechaVencimiento = new Date("2099-12-31T23:59:59");

    const nueva = await storage.suscripciones.create({
      userId,
      planId:           "plan-abogado-gratis",
      ciclo:            "mensual",
      estado:           "activa",
      fechaInicio,
      fechaVencimiento,
      autoRenovacion:   false,
      extraUsers:       0,
    });

    await storage.usageTracking.initForUser(userId, nueva.id);
  }
}

export const subscriptionService = new SubscriptionService();
