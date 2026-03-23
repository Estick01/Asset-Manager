/**
 * Seeder: Etapas procesales por tipo de proceso
 *
 * Se ejecuta desde seedDatabase() en server/index.ts.
 * Inserta las etapas predefinidas para Civil, Laboral y Penal.
 * Es idempotente: si ya existen etapas no duplica.
 */

import { eq } from "drizzle-orm";
import type { Database } from "../../storage/storeage/database-storage.js";
import { etapasPorTipoProceso } from "@/shared/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Definición de etapas por categoría
// ─────────────────────────────────────────────────────────────────────────────

interface EtapaDefinicion {
  codigo:      string;
  nombre:      string;
  descripcion: string;
  orden:       number;
  diasLegales: number;
  color:       string;
}

/** Etapas genéricas (tipo_proceso_id = NULL) — fallback para cualquier tipo */
const ETAPAS_GENERICAS: EtapaDefinicion[] = [
  { codigo: "PREPROCESS",        nombre: "Etapa preprocesal",     descripcion: "Recopilación de pruebas y preparación de la demanda",    orden: 1,  diasLegales: 15, color: "#6B7280" },
  { codigo: "FILED",             nombre: "Demanda presentada",    descripcion: "Demanda radicada ante el juzgado",                        orden: 2,  diasLegales: 5,  color: "#3B82F6" },
  { codigo: "ADMITTED",          nombre: "Demanda admitida",      descripcion: "Juzgado admite la demanda y ordena notificación",         orden: 3,  diasLegales: 10, color: "#8B5CF6" },
  { codigo: "NOTIFIED",          nombre: "Demandado notificado",  descripcion: "Notificación personal o por aviso al demandado",          orden: 4,  diasLegales: 20, color: "#F59E0B" },
  { codigo: "ANSWERED",          nombre: "Contestación",          descripcion: "Demandado presenta contestación de la demanda",           orden: 5,  diasLegales: 20, color: "#EF4444" },
  { codigo: "EVIDENCE",          nombre: "Etapa probatoria",      descripcion: "Presentación y práctica de pruebas",                     orden: 6,  diasLegales: 30, color: "#10B981" },
  { codigo: "HEARING",           nombre: "Audiencias",            descripcion: "Realización de audiencias programadas",                  orden: 7,  diasLegales: 10, color: "#F97316" },
  { codigo: "CLOSING_ARGUMENTS", nombre: "Alegatos finales",      descripcion: "Presentación de alegatos de conclusión",                 orden: 8,  diasLegales: 10, color: "#6366F1" },
  { codigo: "JUDGMENT",          nombre: "Sentencia",             descripcion: "El juez dicta sentencia",                                orden: 9,  diasLegales: 0,  color: "#22C55E" },
  { codigo: "APPEAL",            nombre: "Apelación",             descripcion: "Recurso de apelación ante tribunal superior",            orden: 10, diasLegales: 10, color: "#EC4899" },
  { codigo: "ENFORCEMENT",       nombre: "Ejecución",             descripcion: "Ejecución de la sentencia",                              orden: 11, diasLegales: 0,  color: "#14B8A6" },
];

/** Etapas específicas para procesos Civiles */
const ETAPAS_CIVIL: EtapaDefinicion[] = [
  { codigo: "PREPROCESS",        nombre: "Etapa preprocesal",     descripcion: "Negociación previa y recopilación de pruebas",           orden: 1,  diasLegales: 15, color: "#6B7280" },
  { codigo: "FILED",             nombre: "Demanda presentada",    descripcion: "Demanda civil radicada ante el juzgado competente",      orden: 2,  diasLegales: 5,  color: "#3B82F6" },
  { codigo: "ADMITTED",          nombre: "Demanda admitida",      descripcion: "Auto admisorio de la demanda",                           orden: 3,  diasLegales: 10, color: "#8B5CF6" },
  { codigo: "NOTIFIED",          nombre: "Demandado notificado",  descripcion: "Notificación personal al demandado",                     orden: 4,  diasLegales: 20, color: "#F59E0B" },
  { codigo: "ANSWERED",          nombre: "Contestación",          descripcion: "Contestación de la demanda y excepciones",               orden: 5,  diasLegales: 20, color: "#EF4444" },
  { codigo: "EVIDENCE",          nombre: "Etapa probatoria",      descripcion: "Decreto y práctica de pruebas",                         orden: 6,  diasLegales: 30, color: "#10B981" },
  { codigo: "HEARING",           nombre: "Audiencia de juicio",   descripcion: "Audiencia de instrucción y juzgamiento",                 orden: 7,  diasLegales: 10, color: "#F97316" },
  { codigo: "CLOSING_ARGUMENTS", nombre: "Alegatos",              descripcion: "Alegatos de conclusión",                                orden: 8,  diasLegales: 10, color: "#6366F1" },
  { codigo: "JUDGMENT",          nombre: "Sentencia",             descripcion: "Sentencia de primera instancia",                        orden: 9,  diasLegales: 0,  color: "#22C55E" },
  { codigo: "APPEAL",            nombre: "Apelación",             descripcion: "Recurso de apelación",                                  orden: 10, diasLegales: 10, color: "#EC4899" },
  { codigo: "ENFORCEMENT",       nombre: "Ejecución",             descripcion: "Proceso ejecutivo de la sentencia",                     orden: 11, diasLegales: 0,  color: "#14B8A6" },
];

/** Etapas específicas para procesos Laborales */
const ETAPAS_LABORAL: EtapaDefinicion[] = [
  { codigo: "PREPROCESS",        nombre: "Conciliación previa",   descripcion: "Conciliación obligatoria ante inspector de trabajo",    orden: 1, diasLegales: 10, color: "#6B7280" },
  { codigo: "FILED",             nombre: "Demanda laboral",       descripcion: "Demanda laboral radicada ante el juez del trabajo",     orden: 2, diasLegales: 5,  color: "#3B82F6" },
  { codigo: "ADMITTED",          nombre: "Auto admisorio",        descripcion: "Juzgado admite y cita a audiencia de conciliación",     orden: 3, diasLegales: 10, color: "#8B5CF6" },
  { codigo: "NOTIFIED",          nombre: "Notificación",          descripcion: "Notificación al demandado",                            orden: 4, diasLegales: 10, color: "#F59E0B" },
  { codigo: "ANSWERED",          nombre: "Contestación",          descripcion: "Contestación de la demanda laboral",                   orden: 5, diasLegales: 10, color: "#EF4444" },
  { codigo: "HEARING",           nombre: "Audiencia única",       descripcion: "Audiencia de trámite, juzgamiento y fallo",            orden: 6, diasLegales: 30, color: "#F97316" },
  { codigo: "JUDGMENT",          nombre: "Sentencia",             descripcion: "Sentencia laboral",                                    orden: 7, diasLegales: 0,  color: "#22C55E" },
  { codigo: "APPEAL",            nombre: "Apelación / Consulta",  descripcion: "Recurso de apelación o consulta obligatoria",          orden: 8, diasLegales: 10, color: "#EC4899" },
  { codigo: "ENFORCEMENT",       nombre: "Ejecución",             descripcion: "Ejecutoria de la sentencia laboral",                   orden: 9, diasLegales: 0,  color: "#14B8A6" },
];

/** Etapas específicas para procesos Penales */
const ETAPAS_PENAL: EtapaDefinicion[] = [
  { codigo: "PREPROCESS",        nombre: "Indagación",            descripcion: "Fase de indagación e investigación preliminar",        orden: 1, diasLegales: 90, color: "#6B7280" },
  { codigo: "FILED",             nombre: "Formulación de cargos", descripcion: "Audiencia de formulación de imputación",               orden: 2, diasLegales: 30, color: "#3B82F6" },
  { codigo: "ADMITTED",          nombre: "Acusación",             descripcion: "Escrito de acusación radicado",                       orden: 3, diasLegales: 30, color: "#8B5CF6" },
  { codigo: "EVIDENCE",          nombre: "Preparatoria",          descripcion: "Audiencia preparatoria — descubrimiento probatorio",  orden: 4, diasLegales: 30, color: "#10B981" },
  { codigo: "HEARING",           nombre: "Juicio oral",           descripcion: "Audiencia de juicio oral y público",                  orden: 5, diasLegales: 60, color: "#F97316" },
  { codigo: "JUDGMENT",          nombre: "Sentencia",             descripcion: "Sentencia condenatoria o absolutoria",                orden: 6, diasLegales: 0,  color: "#22C55E" },
  { codigo: "APPEAL",            nombre: "Apelación",             descripcion: "Recurso de apelación o casación",                    orden: 7, diasLegales: 15, color: "#EC4899" },
  { codigo: "ENFORCEMENT",       nombre: "Ejecución de penas",    descripcion: "Cumplimiento de la pena impuesta",                   orden: 8, diasLegales: 0,  color: "#14B8A6" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Función principal del seeder
// ─────────────────────────────────────────────────────────────────────────────

export async function seedLegalStages(db: Database): Promise<void> {
  // Verificar si ya existen etapas (idempotente)
  const existing = await db
    .select({ id: etapasPorTipoProceso.id })
    .from(etapasPorTipoProceso)
    .limit(1);

  if (existing.length > 0) {
    return; // ya sembrado, no duplicar
  }

  console.log("[seed] Sembrando etapas procesales...");

  // 1. Etapas genéricas (aplican a cualquier tipo de proceso)
  await insertEtapas(db, null, ETAPAS_GENERICAS);

  // 2. Buscar tipos de proceso por nombre e insertar etapas específicas
  const { tiposProceso } = await import("@/shared/schema/tipo-proceso.schema.js");

  const tipos = await db
    .select({ id: tiposProceso.id, nombre: tiposProceso.nombre })
    .from(tiposProceso);

  for (const tipo of tipos) {
    const nombreNorm = tipo.nombre?.toLowerCase() ?? "";

    if (nombreNorm.includes("civil")) {
      await insertEtapas(db, tipo.id, ETAPAS_CIVIL);
    } else if (nombreNorm.includes("laboral")) {
      await insertEtapas(db, tipo.id, ETAPAS_LABORAL);
    } else if (nombreNorm.includes("penal")) {
      await insertEtapas(db, tipo.id, ETAPAS_PENAL);
    }
  }

  console.log("[seed] Etapas procesales sembradas correctamente.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

async function insertEtapas(
  db: Database,
  tipoProcesoId: number | null,
  etapas: EtapaDefinicion[],
): Promise<void> {
  for (const e of etapas) {
    await db.insert(etapasPorTipoProceso).values({
      tipoProcesoId,
      codigo:      e.codigo,
      nombre:      e.nombre,
      descripcion: e.descripcion,
      orden:       e.orden,
      diasLegales: e.diasLegales,
      color:       e.color,
      activo:      1,
    });
  }
}
