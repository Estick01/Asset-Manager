/**
 * Seeder: Plantillas de tareas por etapa procesal
 *
 * Se ejecuta desde seedDatabase() en server/index.ts.
 * Inserta las plantillas de tareas predefinidas para cada etapa legal.
 * Es idempotente: si ya existen plantillas no duplica.
 */

import { eq, and } from "drizzle-orm";
import type { Database } from "../../storage/storeage/database-storage.js";
import { etapasTareasPlantilla } from "@/shared/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Definición de plantillas de tareas
// ─────────────────────────────────────────────────────────────────────────────

interface PlantillaDefinicion {
  legalStageCode: string;
  titulo: string;
  prioridad: "baja" | "media" | "alta" | "urgente";
  requerida: boolean;
  orden: number;
}

/**
 * Plantillas de tareas por etapa procesal
 * Se aplican a todos los tipos de proceso (tipoProcesoId = NULL)
 */
const PLANTILLAS_DEFAULT: PlantillaDefinicion[] = [
  { legalStageCode: "FILED",             titulo: "Revisar escrito de demanda",             prioridad: "alta",    requerida: true,  orden: 1 },
  { legalStageCode: "ADMITTED",          titulo: "Notificar al cliente de admisión",        prioridad: "alta",    requerida: true,  orden: 1 },
  { legalStageCode: "NOTIFIED",          titulo: "Confirmar notificación al demandado",     prioridad: "alta",    requerida: true,  orden: 1 },
  { legalStageCode: "ANSWERED",          titulo: "Analizar contestación de demanda",        prioridad: "alta",    requerida: true,  orden: 1 },
  { legalStageCode: "EVIDENCE",          titulo: "Recopilar pruebas documentales",          prioridad: "alta",    requerida: true,  orden: 1 },
  { legalStageCode: "EVIDENCE",          titulo: "Preparar lista de testigos",              prioridad: "media",   requerida: false, orden: 2 },
  { legalStageCode: "HEARING",           titulo: "Confirmar fecha de audiencia",            prioridad: "urgente", requerida: true,  orden: 1 },
  { legalStageCode: "HEARING",           titulo: "Preparar argumentos para audiencia",      prioridad: "alta",    requerida: false, orden: 2 },
  { legalStageCode: "CLOSING_ARGUMENTS", titulo: "Redactar alegatos finales",               prioridad: "alta",    requerida: true,  orden: 1 },
  { legalStageCode: "JUDGMENT",          titulo: "Notificar sentencia al cliente",          prioridad: "urgente", requerida: true,  orden: 1 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Función principal del seeder
// ─────────────────────────────────────────────────────────────────────────────

export async function seedStageTemplates(db: Database): Promise<void> {
  // Verificar si ya existen plantillas (idempotente)
  const existing = await db
    .select({ id: etapasTareasPlantilla.id })
    .from(etapasTareasPlantilla)
    .limit(1);

  if (existing.length > 0) {
    return; // ya sembrado, no duplicar
  }

  console.log("[seed] Sembrando plantillas de tareas por etapa...");

  for (const plantilla of PLANTILLAS_DEFAULT) {
    // Verificar si la plantilla ya existe (por combinación única)
    const alreadyExists = await db
      .select()
      .from(etapasTareasPlantilla)
      .where(
        and(
          eq(etapasTareasPlantilla.legalStageCode, plantilla.legalStageCode),
          eq(etapasTareasPlantilla.titulo, plantilla.titulo),
        ),
      )
      .limit(1);

    if (alreadyExists.length === 0) {
      await db.insert(etapasTareasPlantilla).values({
        tipoProcesoId: null,
        legalStageCode: plantilla.legalStageCode,
        titulo: plantilla.titulo,
        prioridad: plantilla.prioridad,
        requerida: plantilla.requerida ? 1 : 0,
        orden: plantilla.orden,
        activo: 1,
      });
    }
  }

  console.log("[seed] Plantillas de tareas sembradas correctamente.");
}
