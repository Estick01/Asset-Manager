
/**
 * Process (Procesos) Routes
 */

import { Router, type Request, type Response, type NextFunction } from "express";

import { authenticate, extractToken, requirePermission, verifyToken } from "../auth.js";
import { storage } from '../storage/storeage/database-storage';
import { JWTPayload } from '@/shared/model.schema.js';
import { TIPO_ASIGNACION_IDS } from '@/shared/schema/tipo-asignacion.schema.js';
import { Rol } from "../storage/index.js";
import { procesosService } from "../services/proceso.service.js";
import { clientesService } from "../services/cliente.service.js";
import { tareaService } from "../services/tarea.service.js";

const router = Router();

/**
 * Verifica que el usuario autenticado tenga acceso al proceso.
 * Retorna el proceso si tiene acceso, null si no existe, o responde 403 directamente.
 */
async function assertProcesoAccess(
  req: Request,
  res: Response,
  procesoId: string,
): Promise<any | null> {
  const user = (req as any).user as JWTPayload;
  const rol       = user.rol.nombre;
  const idProfile = user.idProfile;

  if (!idProfile) {
    res.status(400).json({ error: "idProfile requerido" });
    return null;
  }

  let proceso: any = null;

  switch (rol) {
    case "abogado":
      proceso = await storage.getProceoByAbogadoIdAndProcesoId(idProfile, procesoId);
      break;
    case "bufete":
    case "corporacion":
      proceso = await storage.getProcesoByFirmaIdAndProcesoId(idProfile, procesoId);
      break;
    case "cliente":
      proceso = await storage.getProcesoByClienteIdAndProcesoId(idProfile, procesoId);
      if (proceso && proceso.clienteId !== idProfile) proceso = null;
      break;
    default:
      res.status(403).json({ error: "Rol no autorizado" });
      return null;
  }

  if (!proceso) {
    res.status(404).json({ error: "Proceso no encontrado o sin acceso" });
    return null;
  }

  return proceso;
}

/** Enriquece un resultado paginado con conteos de tareas por proceso */
async function withTareas(result: { data: any[]; total: number }) {
  if (result.data.length === 0) return result;
  try {
    const ids = result.data.map((p: any) => p.id as string);
    const map = await storage.tareas.countByProcesoIds(ids);
    result.data = result.data.map((p: any) => ({
      ...p,
      tareasConteo: map.get(p.id) ?? { total: 0, pendientes: 0, en_progreso: 0, completadas: 0 },
    }));
  } catch (e) {
    console.error("[procesos] Error al enriquecer con tareas:", e);
  }
  return result;
}

// GET /api/procesos - Get all processes
router.get("/procesos", authenticate, requirePermission("procesos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { clienteId, limit, offset, estadoCodigo, search, hasResponsable } = req.query;
    const limitNum = Math.min(Math.max(limit ? parseInt(limit as string, 10) : 10, 1), 100);
    const offsetNum = Math.max(offset ? parseInt(offset as string, 10) : 0, 0);
    const filter = {
      estadoCodigo: estadoCodigo as string,
      search: search as string,
      hasResponsable: hasResponsable !== undefined ? hasResponsable === 'true' : undefined
    };

    if (user.rol.nombre === "abogado") {
      let procesos;
      if (clienteId) {
        procesos = await storage.getProcesosByClienteAndLawyer(user.idProfile, clienteId.toString(), limitNum, offsetNum, filter);
      } else {
        const lawyer = await storage.getAbogadoByIdUser(user.id);
        if (!lawyer) {
          return res.status(404).json({ error: "Lawyer not found" });
        }
        procesos = await storage.getProcesoByAbogadoId(lawyer.id, limitNum, offsetNum, filter);
      }
      return res.json(await withTareas(procesos));
    }

    if (user.rol.nombre === "cliente") {
      const procesos = await storage.getProcesosByClienteId(user.idProfile, limitNum, offsetNum, filter);
      return res.json(await withTareas(procesos));
    }

    if (user.rol.nombre === "bufete") {
      let procesos;
      if (clienteId) {
        procesos = await storage.getProcesosByClienteAndFirma(user.idProfile, clienteId.toString(), limitNum, offsetNum, filter);
      } else {
        procesos = await storage.getProcesosByFirma(user.idProfile, limitNum, offsetNum, filter);
      }
      return res.json(await withTareas(procesos));
    }

    return res.status(400).json({ error: "Unable to fetch processes" });
  } catch (err) {
    next(err);
  }
});

// GET /api/procesos/count - Get process count
router.get("/procesos/count", authenticate, requirePermission("procesos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const lawyerId = user.lawyerProfileId;
    const { estadoCodigo } = req.query;
    const filter = estadoCodigo ? { estadoCodigo: estadoCodigo as string } : undefined;
    const count = await storage.getProcesCount(lawyerId, filter);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// GET /api/proceso - Get single process
router.get("/proceso", authenticate, requirePermission("procesos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idProces } = req.query;

    if (!idProces || typeof idProces !== "string") {
      return res.status(400).json({ error: "idProces is required" });
    }

    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "No se proporcionó token", authenticated: false });
    }

    const { rol, idProfile } = verifyToken(token) as JWTPayload;

    if (!idProfile) {
      return res.status(400).json({ error: "idProfile is required" });
    }

    let proceso;
    switch (rol.nombre) {
      case "abogado":
        proceso = await storage.getProceoByAbogadoIdAndProcesoId(idProfile, idProces);
        break;
      case "bufete":
      case "corporacion":
        proceso = await storage.getProcesoByFirmaIdAndProcesoId(idProfile, idProces);
        break;
      case "cliente":
        proceso = await storage.getProcesoByClienteIdAndProcesoId(idProfile, idProces);
        if (proceso && proceso.clienteId !== idProfile) {
          return res.status(403).json({ error: "No tienes acceso a este proceso" });
        }
        break;
      default:
        return res.status(403).json({ error: "Rol no autorizado" });
    }

    if (!proceso) {
      return res.status(404).json({ error: "Proceso not found" });
    }

    res.json(proceso);
  } catch (err) {
    next(err);
  }
});

// POST /api/procesos - Create new process
router.post("/procesos", authenticate, requirePermission("procesos.crear"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "No se proporcionó token", authenticated: false });
    }

    const tokenPayload = verifyToken(token) as JWTPayload;
    if (!tokenPayload) {
      return res.status(401).json({ error: "Token inválido", authenticated: false });
    }

    const { rol, idProfile, id: userId, UserName } = tokenPayload;

    if (!rol) return res.status(400).json({ error: "rol is required" });
    if (!idProfile || typeof idProfile !== "string") return res.status(400).json({ error: "idProfile is required" });

    const newProceso = await storage.createProceso(req.body);
    if (!newProceso) {
      return res.status(500).json({ error: "Error al crear el proceso" });
    }

    switch ((rol as Rol).nombre) {
      case "abogado":
        await storage.addLawyerToProceso(newProceso.id, idProfile, {
          rol: "principal",
          tipoAsignacionId: TIPO_ASIGNACION_IDS.NUEVA_ASIGNACION,
          razonAsignacion: "Abogado creador del proceso",
          asignadoPor: userId,
        });
        break;
      case "bufete":
        if (!req.body.lawyerId) return res.status(400).json({ error: "lawyerId is required para bufete" });
        await storage.addLawyerToProceso(newProceso.id, req.body.lawyerId, {
          rol: "principal",
          tipoAsignacionId: TIPO_ASIGNACION_IDS.NUEVA_ASIGNACION,
          razonAsignacion: `Asignado por bufete ${UserName}`,
          asignadoPor: userId,
        });
        break;
      case "corporacion":
        if (!req.body.lawyerId) return res.status(400).json({ error: "lawyerId is required para corporacion" });
        await storage.addLawyerToProceso(newProceso.id, req.body.lawyerId, {
          rol: "externo",
          tipoAsignacionId: TIPO_ASIGNACION_IDS.SOLICITUD_CLIENTE,
          razonAsignacion: `Contratado por corporación ${UserName}`,
          asignadoPor: userId,
        });
        break;
      case "cliente":
        await storage.deleteProceso(newProceso.id);
        return res.status(403).json({ error: "Los clientes no pueden crear procesos" });
      default:
        await storage.deleteProceso(newProceso.id);
        return res.status(403).json({ error: "Rol no autorizado para crear procesos" });
    }

    // If proceso was created from a community post, link them bidirectionally
    const communityPostId = req.body.communityPostId as string | undefined;
    if (communityPostId) {
      await storage.community.setPostProceso(communityPostId, newProceso.id).catch(() => {});
    }

    res.status(201).json(newProceso);
  } catch (err) {
    next(err);
  }
});

// PUT /api/procesos/:id - Update process (notifica abogados si cambia estado)
router.put("/procesos/:id", authenticate, requirePermission("procesos.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });

    const proceso = await assertProcesoAccess(req, res, id);
    if (!proceso) return;

    // Solo campos editables explícitamente (evita mass assignment)
    const { estadoId, descripcionEstado, radicado, juzgado, tipoProcesoId } = req.body;
    const allowed: Record<string, unknown> = {};
    if (estadoId !== undefined)          allowed.estadoId = estadoId;
    if (descripcionEstado !== undefined) allowed.descripcionEstado = descripcionEstado;
    if (radicado !== undefined)          allowed.radicado = radicado;
    if (juzgado !== undefined)           allowed.juzgado = juzgado;
    if (tipoProcesoId !== undefined)     allowed.tipoProcesoId = tipoProcesoId;

    const updatedProceso = await procesosService.updateProceso(id, allowed);
    if (!updatedProceso) return res.status(404).json({ error: "Proceso not found" });
    res.json(updatedProceso);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/procesos/:id - Delete process
router.delete("/procesos/:id", authenticate, requirePermission("procesos.eliminar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });

    const proceso = await assertProcesoAccess(req, res, id);
    if (!proceso) return;

    await procesosService.deleteProceso(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PUT /api/procesos/:id/responsable - Set/change responsable (bufete only)
router.put("/procesos/:id/responsable", authenticate, requirePermission("procesos.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as JWTPayload;
    if (user.rol.nombre !== "bufete") {
      return res.status(403).json({ error: "Solo el bufete puede asignar el responsable del proceso" });
    }

    const { responsableId, razon } = req.body;
    if (!responsableId || typeof responsableId !== "string") {
      return res.status(400).json({ error: "responsableId es requerido" });
    }

    const { id } = req.params;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });

    const access = await assertProcesoAccess(req, res, id);
    if (!access) return;

    const proceso = await storage.setResponsable(id, responsableId, {
      asignadoPorNombre: user.UserName ?? null,
      razon: razon ?? null,
    });
    if (!proceso) {
      return res.status(404).json({ error: "Proceso no encontrado" });
    }

    res.json(proceso);
  } catch (err) {
    next(err);
  }
});

// GET /api/procesos/:id/lawyers - Get lawyers assigned to a proceso
router.get("/procesos/:id/lawyers", authenticate, requirePermission("procesos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });

    const access = await assertProcesoAccess(req, res, id);
    if (!access) return;

    const lawyers = await storage.getProcesoLawyers(id);
    res.json(lawyers);
  } catch (err) {
    next(err);
  }
});

// POST /api/procesos/:id/lawyers - Add a lawyer to a proceso
router.post("/procesos/:id/lawyers", authenticate, requirePermission("procesos.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as JWTPayload;
    const { lawyerId, rol, tipoAsignacionId, razonAsignacion } = req.body;

    if (!lawyerId) return res.status(400).json({ error: "lawyerId es requerido" });

    const { id } = req.params;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });

    const access = await assertProcesoAccess(req, res, id);
    if (!access) return;

    await storage.addLawyerToProceso(id, lawyerId, {
      rol: rol ?? "responsable",
      tipoAsignacionId: tipoAsignacionId ?? null,
      razonAsignacion: razonAsignacion ?? null,
      asignadoPor: user.id,
    });

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/procesos/:id/lawyers/:lawyerId - Remove a lawyer from a proceso
router.delete("/procesos/:id/lawyers/:lawyerId", authenticate, requirePermission("procesos.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, lawyerId } = req.params;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });
    if (!lawyerId || typeof lawyerId !== "string") return res.status(400).json({ error: "lawyerId is required" });

    const access = await assertProcesoAccess(req, res, id);
    if (!access) return;

    await storage.removeLawyerFromProceso(id, lawyerId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PATCH /api/procesos/:id/link-post - Vincular proceso existente con un post de comunidad
router.patch("/procesos/:id/link-post", authenticate, requirePermission("procesos.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { postId } = req.body as { postId?: string };
    if (!postId) return res.status(400).json({ error: "postId es requerido" });

    const proceso = await storage.getProceso(id);
    if (!proceso) return res.status(404).json({ error: "Proceso no encontrado" });
    if (proceso.communityPostId) return res.status(409).json({ error: "El proceso ya está vinculado a un post" });

    await Promise.all([
      storage.setCommunityPostId(id, postId),
      storage.community.setPostProceso(postId, id),
    ]);

    res.json({ success: true, procesoId: id, postId });
  } catch (err) {
    next(err);
  }
});

// GET /api/tipos-proceso - Get all process types
router.get("/tipos-proceso", authenticate, requirePermission("procesos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tipos = await procesosService.getTiposProceso();
    res.json(tipos);
  } catch (err) {
    next(err);
  }
});

// POST /api/tipos-proceso - Create new process type
router.post("/tipos-proceso", authenticate, requirePermission("procesos.crear"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }
    const nuevo = await procesosService.createTipoProceso({ nombre, descripcion });
    res.json(nuevo);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tipos-proceso/:id - Update process type
router.put("/tipos-proceso/:id", authenticate, requirePermission("procesos.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const { nombre, descripcion, activo } = req.body;
    const actualizado = await procesosService.updateTipoProceso(id, { nombre, descripcion, activo });
    if (!actualizado) {
      return res.status(404).json({ error: "Tipo de proceso no encontrado" });
    }
    res.json(actualizado);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tipos-proceso/:id - Delete process type
router.delete("/tipos-proceso/:id", authenticate, requirePermission("procesos.eliminar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    await procesosService.deleteTipoProceso(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/actualizaciones - Get updates for a process
router.get("/actualizaciones", authenticate, requirePermission("actualizaciones.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { procesoId, limit, offset } = req.query;
    if (!procesoId || typeof procesoId !== "string") {
      return res.status(400).json({ error: "procesoId is required" });
    }
    const proceso = await assertProcesoAccess(req, res, procesoId);
    if (!proceso) return;
    const limitNum = Math.min(Math.max(limit ? parseInt(limit as string, 10) : 10, 1), 100);
    const offsetNum = Math.max(offset ? parseInt(offset as string, 10) : 0, 0);
    const actualizaciones = await procesosService.getActualizaciones(procesoId, limitNum, offsetNum);
    res.json(actualizaciones);
  } catch (err) {
    next(err);
  }
});

// POST /api/actualizaciones - Create new update (notifica al cliente automáticamente)
router.post("/actualizaciones", authenticate, requirePermission("actualizaciones.crear"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { procesoId } = req.body;
    if (!procesoId || typeof procesoId !== "string") {
      return res.status(400).json({ error: "procesoId is required" });
    }
    const proceso = await assertProcesoAccess(req, res, procesoId);
    if (!proceso) return;
    const newActualizacion = await procesosService.createActualizacion(req.body);
    res.status(201).json(newActualizacion);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/actualizaciones/:id - Delete update
router.delete("/actualizaciones/:id", authenticate, requirePermission("actualizaciones.eliminar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actualizacion = await storage.getActualizacion(req.params.id as string);
    if (!actualizacion) return res.status(404).json({ error: "Actualización no encontrada" });
    const proceso = await assertProcesoAccess(req, res, actualizacion.procesoId);
    if (!proceso) return;
    await procesosService.deleteActualizacion(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/estado - Get process states
router.get("/estado", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const estados = await procesosService.getEstadosProceso();
    res.json(estados);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard - Get dashboard stats
router.get("/dashboard", authenticate, requirePermission("dashboard.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user: JWTPayload = (req as any).user;
    const abogadoId = user.idProfile;
    if (!abogadoId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [
      totalClientes,
      totalProcesos,
      procesosActivos,
      procesosEnTramite,
      procesosFinalizados,
      tareaStats,
      allProcesos,
    ] = await Promise.all([
      clientesService.getClientesCount(abogadoId),
      procesosService.getProcesosCount(abogadoId),
      procesosService.getProcesosCount(abogadoId, { estadoCodigo: "activo" }),
      procesosService.getProcesosCount(abogadoId, { estadoCodigo: "en_tramite" }),
      procesosService.getProcesosCount(abogadoId, { estadoCodigo: "finalizado" }),
      tareaService.countByLawyer(abogadoId),
      procesosService.getProcesos(abogadoId, 1000, 0, undefined),
    ]);

    const procesosRecientes = allProcesos.data
      .sort((a: any, b: any) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
      .slice(0, 5)
      .map((p: any) => ({
        id: p.id,
        clienteId: p.clienteId,
        tipoProceso: p.tipoProceso,
        radicado: p.radicado,
        estado: p.estado?.nombre || "Sin estado",
        estadoColor: p.estado?.color || "#999",
        fechaCreacion: p.fechaCreacion,
      }));

    res.json({
      totalClientes,
      totalProcesos,
      procesosActivos: procesosActivos + procesosEnTramite,
      procesosFinalizados,
      totalTareas: tareaStats.total,
      tareasPendientes: tareaStats.pendientes,
      tareasEnProgreso: tareaStats.en_progreso,
      tareasCompletadas: tareaStats.completadas,
      procesosRecientes,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Legal Stages
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/legal-stages?tipoProceso=<id>
 * Devuelve las etapas disponibles para un tipo de proceso + estado del proceso actual.
 * Query params: tipoProceso (int, opcional), procesoId (string, opcional)
 */
router.get("/legal-stages", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tipoProcesoId = req.query.tipoProceso
      ? Number(req.query.tipoProceso as string)
      : null;
    const procesoId = typeof req.query.procesoId === "string"
      ? req.query.procesoId
      : undefined;

    let currentStage:     string | null = null;
    let fechaVencimiento: Date   | null = null;

    if (procesoId) {
      const proceso = await storage.getProceso(procesoId);
      if (proceso) {
        currentStage     = proceso.legalStage     ?? null;
        fechaVencimiento = proceso.fechaVencimientoEtapa ?? null;
      }
    }

    const response = await storage.legalStages.buildStagesResponse(
      tipoProcesoId,
      currentStage,
      fechaVencimiento,
    );

    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/procesos/:id/legal-stage
 * Avanza la etapa procesal. Solo abogado o bufete con acceso al proceso.
 * Body: { legalStage: string, fechaVencimientoEtapa?: string }
 * Automatizaciones:
 *  1. Entrada automática en timeline
 *  2. Calcula fecha_vencimiento_etapa (si no se envía manualmente)
 *  3. Si nueva etapa = HEARING → crea evento en calendario
 *  4. Si nueva etapa = JUDGMENT → push notification al cliente
 */
router.patch("/procesos/:id/legal-stage", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user      = (req as any).user as JWTPayload;
    const rol       = user.rol.nombre;
    const idProfile = user.idProfile;
    const procesoId: string = String(req.params.id);

    // Solo abogado o bufete pueden cambiar etapa
    if (rol === "cliente") {
      res.status(403).json({ error: "Los clientes no pueden cambiar la etapa procesal" });
      return;
    }

    const proceso = await assertProcesoAccess(req, res, procesoId);
    if (!proceso) return;

    const { legalStage, fechaVencimientoEtapa: fechaManual } = req.body as {
      legalStage: string;
      fechaVencimientoEtapa?: string | null;
    };

    if (!legalStage) {
      res.status(400).json({ error: "legalStage es requerido" });
      return;
    }

    // Validar que la transición sea hacia adelante
    const oldStage = proceso.legalStage ?? null;

    if (oldStage) {
      const valid = await storage.legalStages.isValidTransition(
        oldStage,
        legalStage,
        proceso.tipoProcesoId ?? null,
      );
      if (!valid) {
        res.status(422).json({
          error: "Transición de etapa inválida. No se puede retroceder a una etapa anterior.",
        });
        return;
      }
    }

    // ── Gate: tareas requeridas pendientes ──────────────────────────────────
    if (oldStage) {
      const bloqueantes = await storage.tareas.getRequiredPendingByStage(procesoId, oldStage);
      if (bloqueantes.length > 0) {
        res.status(422).json({
          error:             "STAGE_BLOCKED",
          message:           "Hay tareas requeridas sin completar en esta etapa",
          tareasBloqueantes: bloqueantes.map(t => ({
            id:        t.id,
            titulo:    t.titulo,
            estado:    t.estado,
            prioridad: t.prioridad,
          })),
        });
        return;
      }
    }

    // Calcular fecha de vencimiento
    let fechaVencimiento: Date | null = fechaManual ? new Date(fechaManual) : null;

    if (!fechaVencimiento) {
      const etapa = await storage.legalStages.getByCodigoYTipo(
        legalStage,
        proceso.tipoProcesoId ?? null,
      );
      if (etapa && etapa.diasLegales > 0) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + etapa.diasLegales);
        fechaVencimiento = fecha;
      }
    }

    // Persistir cambio de etapa
    await storage.procesos.updateLegalStage(procesoId, legalStage, fechaVencimiento);

    // 1. Entrada automática en timeline
    const descripcionAct = fechaVencimiento
      ? `Vencimiento: ${fechaVencimiento.toLocaleDateString("es-CO")}`
      : "Sin fecha de vencimiento";
    await procesosService.createActualizacion({
      procesoId,
      titulo:      `Etapa avanzada: ${legalStage}`,
      descripcion: descripcionAct,
      tipo:        "automatico",
      tipoId:      1,
      documentoId: null,
    });

    // ── Eventos automáticos ──────────────────────────────────────────────────
    if (oldStage) {
      await storage.stageEvents.insert({
        procesoId,
        legalStageCode: oldStage,
        tipo:           "etapa_completada",
        descripcion:    `Etapa completada: ${oldStage}`,
      });
    }
    await storage.stageEvents.insert({
      procesoId,
      legalStageCode: legalStage,
      tipo:           "etapa_iniciada",
      descripcion:    "Etapa iniciada",
    });

    // ── Materializar plantillas ──────────────────────────────────────────────
    const tipoProcesoId = proceso.tipoProcesoId ?? null;
    const plantillas = await storage.stageTemplates.getByStage(legalStage, tipoProcesoId);
    for (const p of plantillas) {
      await storage.tareas.create({
        procesoId,
        legalStage:      p.legalStageCode,
        requerida:       p.requerida ? 1 : 0,
        titulo:          p.titulo,
        descripcion:     p.descripcion ?? null,
        prioridad:       p.prioridad,
        creadoPorNombre: "Sistema",
        orden:           p.orden,
        estado:          "pendiente",
      } as any);
    }

    // 2. Si HEARING → crear evento en calendario del abogado responsable
    if (legalStage === "HEARING" && rol === "abogado" && idProfile) {
      await storage.calendar.create(idProfile, {
        procesoId,
        titulo:              `Audiencia — ${proceso.radicado ?? procesoId}`,
        tipo:                "audiencia",
        fechaInicio:         fechaVencimiento ?? new Date(),
        recordatorioMinutos: 1440,
      });
    }

    // 3. Si JUDGMENT → notificación push al cliente
    if (legalStage === "JUDGMENT" && proceso.clienteId) {
      const cliente = await storage.clientes.getCliente(proceso.clienteId);
      if (cliente?.userId) {
        await storage.appNotifications.createNotification(
          cliente.userId,
          "proceso_judgment",
          "Sentencia en tu proceso",
          `El proceso ${proceso.radicado ?? ""} ha llegado a la etapa de Sentencia.`,
          { procesoId },
        );
      }
    }

    const updated = await storage.getProceso(procesoId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
