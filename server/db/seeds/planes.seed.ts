/**
 * Seeder: Planes y features
 * Idempotente — no duplica si ya existen.
 * Se llama desde seedDatabase() en server/index.ts.
 */
import { eq } from "drizzle-orm";
import { planes, features, planFeatures } from "@/shared/schema";
import type { Database } from "../../storage/storeage/database-storage.js";

// ── Definición de planes ──────────────────────────────────────────────────────

const PLANES_SEED = [
  // Abogado independiente
  {
    id: "plan-abogado-gratis",   nombre: "Gratis",    tipo: "abogado" as const,
    precioMensualCop: "0",       precioAnualCop: "0",
    precioMensualUsd: "0",       precioAnualUsd: "0",
    maxProcesos: 5,              maxClientes: 10,      maxStorageGb: 0,
    includedUsers: 1,            maxUsers: 1,
    precioUsuarioExtraCop: null, precioUsuarioExtraUsd: null,
    features: [],
  },
  {
    id: "plan-abogado-esencial", nombre: "Esencial",  tipo: "abogado" as const,
    precioMensualCop: "29900",   precioAnualCop: "287040",
    precioMensualUsd: "7",       precioAnualUsd: "70",
    maxProcesos: 20,             maxClientes: 30,      maxStorageGb: 2,
    includedUsers: 1,            maxUsers: 1,
    precioUsuarioExtraCop: null, precioUsuarioExtraUsd: null,
    features: [
      { code: "calendario",         value: "true" },
      { code: "etapas_procesales",  value: "true" },
      { code: "privacidad_basica",  value: "5" },
    ],
  },
  {
    id: "plan-abogado-pro",      nombre: "Pro",        tipo: "abogado" as const,
    precioMensualCop: "84900",   precioAnualCop: "815040",
    precioMensualUsd: "21",      precioAnualUsd: "199",
    maxProcesos: -1,             maxClientes: -1,      maxStorageGb: 15,
    includedUsers: 1,            maxUsers: 1,
    precioUsuarioExtraCop: null, precioUsuarioExtraUsd: null,
    features: [
      { code: "calendario",          value: "true" },
      { code: "etapas_procesales",   value: "true" },
      { code: "privacidad_basica",   value: "true" },
      { code: "privacidad_avanzada", value: "true" },
      { code: "comunidad",           value: "true" },
      { code: "chat",                value: "true" },
    ],
  },
  // Bufete
  {
    id: "plan-bufete-starter",   nombre: "Starter",   tipo: "bufete" as const,
    precioMensualCop: "180000",  precioAnualCop: "1728000",
    precioMensualUsd: "44",      precioAnualUsd: "422",
    maxProcesos: 60,             maxClientes: 60,      maxStorageGb: 10,
    includedUsers: 3,            maxUsers: 8,
    precioUsuarioExtraCop: "45000", precioUsuarioExtraUsd: "11",
    features: [
      { code: "calendario",          value: "true" },
      { code: "etapas_procesales",   value: "true" },
      { code: "dashboard_bufete",    value: "true" },
      { code: "privacidad_basica",   value: "true" },
      { code: "privacidad_avanzada", value: "true" },
    ],
  },
  {
    id: "plan-bufete-business",  nombre: "Business",  tipo: "bufete" as const,
    precioMensualCop: "350000",  precioAnualCop: "3360000",
    precioMensualUsd: "85",      precioAnualUsd: "816",
    maxProcesos: 300,            maxClientes: 300,     maxStorageGb: 30,
    includedUsers: 8,            maxUsers: 20,
    precioUsuarioExtraCop: "35000", precioUsuarioExtraUsd: "9",
    features: [
      { code: "calendario",          value: "true" },
      { code: "etapas_procesales",   value: "true" },
      { code: "dashboard_bufete",    value: "true" },
      { code: "privacidad_basica",   value: "true" },
      { code: "privacidad_avanzada", value: "true" },
      { code: "comunidad",           value: "true" },
      { code: "chat",                value: "true" },
      { code: "roles_custom",        value: "true" },
    ],
  },
  {
    id: "plan-bufete-enterprise", nombre: "Enterprise", tipo: "bufete" as const,
    precioMensualCop: "600000",  precioAnualCop: "5760000",
    precioMensualUsd: "146",     precioAnualUsd: "1402",
    maxProcesos: -1,             maxClientes: -1,      maxStorageGb: 100,
    includedUsers: 15,           maxUsers: -1,
    precioUsuarioExtraCop: "28000", precioUsuarioExtraUsd: "7",
    features: [
      { code: "calendario",          value: "true" },
      { code: "etapas_procesales",   value: "true" },
      { code: "dashboard_bufete",    value: "true" },
      { code: "privacidad_basica",   value: "true" },
      { code: "privacidad_avanzada", value: "true" },
      { code: "comunidad",           value: "true" },
      { code: "chat",                value: "true" },
      { code: "roles_custom",        value: "true" },
      { code: "soporte_prioritario", value: "true" },
    ],
  },
] as const;

const FEATURES_SEED = [
  { code: "calendario",          nombre: "Calendario",              descripcion: "Gestión de eventos, tareas y vencimientos en calendario" },
  { code: "etapas_procesales",   nombre: "Etapas procesales",       descripcion: "Seguimiento jurídico del proceso con etapas y vencimientos" },
  { code: "comunidad",           nombre: "Comunidad",               descripcion: "Acceso a la comunidad de abogados y matching con clientes" },
  { code: "chat",                nombre: "Chat con cliente",        descripcion: "Mensajería directa con clientes desde la plataforma" },
  { code: "privacidad_basica",   nombre: "Privacidad básica",       descripcion: "Marcar clientes como privados (hasta el límite del plan)" },
  { code: "privacidad_avanzada", nombre: "Privacidad avanzada",     descripcion: "Clientes y procesos privados ilimitados con historial" },
  { code: "dashboard_bufete",    nombre: "Dashboard de bufete",     descripcion: "Panel de control con métricas agregadas del bufete" },
  { code: "roles_custom",        nombre: "Roles personalizados",    descripcion: "Crear y asignar roles personalizados a abogados del bufete" },
  { code: "soporte_prioritario", nombre: "Soporte prioritario",     descripcion: "Acceso a soporte con tiempo de respuesta garantizado" },
] as const;

// ── Función principal ─────────────────────────────────────────────────────────

export async function seedPlanes(db: Database): Promise<void> {
  // 1. Seed features
  for (const f of FEATURES_SEED) {
    const existing = await db.select().from(features).where(eq(features.code, f.code)).limit(1).then(r => r[0]);
    if (!existing) {
      await db.insert(features).values({ ...f, state: true });
    }
  }

  // 2. Seed planes + plan_features
  for (const p of PLANES_SEED) {
    const { features: planFeaturesList, ...planData } = p;
    const existing = await db.select().from(planes).where(eq(planes.id, p.id)).limit(1).then(r => r[0]);
    if (!existing) {
      await db.insert(planes).values({ ...planData, state: true });
    }
    // Upsert plan_features
    for (const pf of planFeaturesList) {
      const existingPf = await db.select().from(planFeatures)
        .where(eq(planFeatures.planId, p.id))
        .then(rows => rows.find(r => r.featureCode === pf.code));
      if (!existingPf) {
        await db.insert(planFeatures).values({ planId: p.id, featureCode: pf.code, value: pf.value });
      }
    }
  }

  console.log("[seed:planes] Planes y features sembrados correctamente.");
}
