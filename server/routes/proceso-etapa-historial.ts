// server/routes/proceso-etapa-historial.ts
import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requirePermission } from "../auth";
import { storage } from "../storage/storeage/database-storage";
import { randomUUID } from "crypto";
import { JWTPayload } from "@/shared/model.schema";

const router = Router();

// ─── POST /api/procesos/:procesoId/etapas ───────────────────────────────────────
// Registrar un nuevo cambio de estado en una etapa
router.post("/procesos/:procesoId/etapas", authenticate, requirePermission("procesos.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { procesoId } = req.params;
    const procesoIdStr = Array.isArray(procesoId) ? procesoId[0] : procesoId;
    const { etapa, estado, observacion } = req.body as {
      etapa: string;
      estado: string;
      observacion?: string;
    };

    const user = req.user as JWTPayload;
    const usuarioId = user.id;

    if (!etapa || !estado) {
      return res.status(400).json({ error: "etapa y estado son requeridos" });
    }

    // Validar que el estado sea válido
    const estadoValido = await storage.procesoEtapaHistorial.validarEstado(estado);
    if (!estadoValido) {
      return res.status(400).json({ error: "estado no válido" });
    }

    // Verificar que el proceso existe (verificación básica de acceso)
    const proceso = await storage.procesos.getProceso(procesoIdStr);
    if (!proceso) {
      return res.status(404).json({ error: "Proceso no encontrado" });
    }

    const etapaValida = await storage.legalStages.getByCodigoYTipo(
      etapa,
      proceso.tipoProcesoId ?? null,
    );
    if (!etapaValida) {
      return res.status(400).json({ error: "etapa no válida para este tipo de proceso" });
    }

    const historial = await storage.procesoEtapaHistorial.createHistorial({
      id: randomUUID(),
      procesoId: procesoIdStr,
      etapa,
      estado,
      fecha: new Date(),
      observacion: observacion || null,
      usuarioId: usuarioId || null,
    });

    // Actualizar la etapa actual del proceso si es necesario
    // (lógica para determinar cuál es la etapa "actual" basada en el historial)
    await updateEtapaActualFromHistorial(procesoIdStr);

    res.status(201).json(historial);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/procesos/:procesoId/etapas ────────────────────────────────────────
// Obtener todo el historial de etapas de un proceso
router.get("/procesos/:procesoId/etapas", authenticate, requirePermission("procesos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { procesoId } = req.params;
    const procesoIdStr = Array.isArray(procesoId) ? procesoId[0] : procesoId;

    // Verificar que el proceso existe (verificación básica de acceso)
    const proceso = await storage.procesos.getProceso(procesoIdStr);
    if (!proceso) {
      return res.status(404).json({ error: "Proceso no encontrado" });
    }

    const historial = await storage.procesoEtapaHistorial.getHistorialByProceso(procesoIdStr);
    res.json(historial);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/procesos/:procesoId/etapas/ultimos-estados ───────────────────────
// Obtener el último estado de cada etapa
router.get("/procesos/:procesoId/etapas/ultimos-estados", authenticate, requirePermission("procesos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { procesoId } = req.params;
    const procesoIdStr = Array.isArray(procesoId) ? procesoId[0] : procesoId;

    // Verificar que el proceso existe (verificación básica de acceso)
    const proceso = await storage.procesos.getProceso(procesoIdStr);
    if (!proceso) {
      return res.status(404).json({ error: "Proceso no encontrado" });
    }

    const ultimosEstados = await storage.procesoEtapaHistorial.getUltimoEstadoPorEtapa(procesoIdStr);
    res.json(ultimosEstados);
  } catch (err) {
    next(err);
  }
});

// ─── Función auxiliar para actualizar la etapa actual ──────────────────────────
async function updateEtapaActualFromHistorial(procesoId: string) {
  const procesoIdStr = Array.isArray(procesoId) ? procesoId[0] : procesoId;
  try {
    // Obtener el último estado de cada etapa
    const ultimosEstados = await storage.procesoEtapaHistorial.getUltimoEstadoPorEtapa(procesoIdStr);

    // Lógica para determinar cuál es la etapa "actual"
    // Por simplicidad, tomamos la etapa más reciente que no esté completada o cancelada
    let etapaActual: string | null = null;
    let fechaMasReciente: Date | null = null;

    for (const [etapa, registro] of Object.entries(ultimosEstados)) {
      const estadosFinales = ['COMPLETADA', 'CANCELADA', 'SUSPENDIDA'];

      if (!estadosFinales.includes(registro.estado)) {
        const fechaRegistro = new Date(registro.fecha);
        if (!fechaMasReciente || fechaRegistro > fechaMasReciente) {
          fechaMasReciente = fechaRegistro;
          etapaActual = etapa;
        }
      }
    }

    // Actualizar la etapa actual en el proceso
    if (etapaActual) {
      await storage.procesos.updateLegalStage(procesoIdStr, etapaActual, null);
    }
  } catch (error) {
    console.error('Error updating etapa actual from historial:', error);
    // No fallar la operación principal por esto
  }
}

export default router;
