
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

const router = Router();

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

    res.status(201).json(newProceso);
  } catch (err) {
    next(err);
  }
});

// PUT /api/procesos/:id - Update process (notifica abogados si cambia estado)
router.put("/procesos/:id", authenticate, requirePermission("procesos.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updatedProceso = await procesosService.updateProceso(id, req.body);
    if (!updatedProceso) {
      return res.status(404).json({ error: "Proceso not found" });
    }
    res.json(updatedProceso);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/procesos/:id - Delete process
router.delete("/procesos/:id", authenticate, requirePermission("procesos.eliminar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
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

    const proceso = await storage.setResponsable(req.params.id, responsableId, {
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
    const lawyers = await storage.getProcesoLawyers(req.params.id);
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

    if (!lawyerId) {
      return res.status(400).json({ error: "lawyerId es requerido" });
    }

    await storage.addLawyerToProceso(req.params.id, lawyerId, {
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
    await storage.removeLawyerFromProceso(req.params.id, req.params.lawyerId);
    res.status(204).send();
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
    const newActualizacion = await procesosService.createActualizacion(req.body);
    res.status(201).json(newActualizacion);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/actualizaciones/:id - Delete update
router.delete("/actualizaciones/:id", authenticate, requirePermission("actualizaciones.eliminar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
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
      storage.getClientesCount(abogadoId),
      storage.getProcesCount(abogadoId),
      storage.getProcesCount(abogadoId, { estadoCodigo: "activo" }),
      storage.getProcesCount(abogadoId, { estadoCodigo: "en_tramite" }),
      storage.getProcesCount(abogadoId, { estadoCodigo: "finalizado" }),
      storage.tareas.countByLawyer(abogadoId),
      storage.getProcesoByAbogadoId(abogadoId, 1000, 0, undefined),
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

export default router;
