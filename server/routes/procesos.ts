
/**
 * Process (Procesos) Routes
 * 
 * CRUD operations for legal processes (procesos) and related endpoints.
 * Maintains backward compatibility with the original monolithic routes.
 */

import { Router, type Request, type Response, type NextFunction } from "express";

import { authenticate, extractToken, requirePermission, verifyToken } from "../auth.js";
import { storage } from '../storage/storeage/database-storage';
import { UserDTO } from '@/shared/schema/user.schema.js';
import { JWTPayload } from '@/shared/model.schema.js';
import { TIPO_ASIGNACION_IDS } from '@/shared/schema/tipo-asignacion.schema.js';
import { Rol } from "../storage/index.js";

const router = Router();

// GET /api/procesos - Get all processes
router.get("/procesos", authenticate, requirePermission("procesos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { clienteId, limit, offset, estadoCodigo, search } = req.query;
    const limitNum = limit ? parseInt(limit as string, 10) : 10;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;
    const filter = { estadoCodigo: estadoCodigo as string, search: search as string };

    if (user.rol.nombre === "abogado") {
      let procesos;
      if (clienteId) {
        const clientRelation = await storage.lawyerClients.getActiveLawyerClient(user.idProfile, clienteId.toString());
        if (!clientRelation) {
          return res.status(403).json({ error: "No tiene acceso a este cliente" });
        }
        procesos = await storage.getProcesosByClienteAndLawyer(user.idProfile, clienteId.toString(), limitNum, offsetNum, filter);
      } else {
        const lawyer = await storage.getAbogadoByIdUser(user.id);
        if (!lawyer) {
          return res.status(404).json({ error: "Lawyer not found" });
        }
        procesos = await storage.getProcesoByAbogadoId(lawyer.id, limitNum, offsetNum, filter);
      }
      return res.json(procesos);
    }

    if (user.rol.nombre === "cliente") {
      const procesos = await storage.getProcesosByClienteId(user.idProfile, limitNum, offsetNum, filter);
      return res.json(procesos);
    }

    if (user.rol.nombre === "bufete") {
      let procesos;
      if (clienteId) {
        // Bufete ve procesos de un cliente específico de su firma
        procesos = await storage.getProcesosByClienteAndFirma(
          user.idProfile,
          clienteId.toString(),
          limitNum,
          offsetNum,
          filter
        );
      } else {
        // Bufete ve todos los procesos de su firma
        procesos = await storage.getProcesosByFirma(
          user.idProfile,
          limitNum,
          offsetNum,
          filter
        );
      }
      return res.json(procesos);
    }

    return res.status(400).json({ error: "Unable to fetch processes" });
  } catch (err) {
    next(err);
  }
});

// GET /api/procesos/count - Get process count
router.get("/procesos/count", authenticate, requirePermission("procesos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get user ID from JWT token - never trust frontend
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

// GET /api/proceso/:id - Get single process
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

    const { rol, idProfile, id: userId } = verifyToken(token) as JWTPayload;

    let proceso;
    if(!idProfile){
      return res.status(400).json({ error: "idProfile is required" });
    }

    switch (rol.nombre) {
      case "abogado":
        // Solo puede ver procesos asignados a él
        proceso = await storage.getProceoByAbogadoIdAndProcesoId(idProfile!, idProces);
        break;

      case "bufete":
      case "corporacion":
        // Puede ver cualquier proceso de su firma
        proceso = await storage.getProcesoByFirmaIdAndProcesoId(idProfile,idProces);
        break;

      case "cliente":
        // Solo puede ver sus propios procesos
        proceso = await storage.getProcesoByClienteIdAndProcesoId(idProfile,idProces);
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

    const tokenPayload: JWTPayload | null = verifyToken(token);
    if (!tokenPayload) {
      return res.status(401).json({ error: "Token inválido", authenticated: false });
    }

    const { rol, idProfile, id: userId } = tokenPayload as JWTPayload;


    if (!rol) {
      return res.status(400).json({ error: "rol is required" });
    }

    if (!idProfile || typeof idProfile !== "string") {
      return res.status(400).json({ error: "idProfile is required" });
    }

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
        if (!req.body.lawyerId) {
          return res.status(400).json({ error: "lawyerId is required para bufete" });
        }
        await storage.addLawyerToProceso(newProceso.id, req.body.lawyerId, {
          rol: "principal",
          tipoAsignacionId: TIPO_ASIGNACION_IDS.NUEVA_ASIGNACION,
          razonAsignacion: `Asignado por bufete ${idProfile}`,
          asignadoPor: userId,
        });
        break;

      case "corporacion":
        if (!req.body.lawyerId) {
          return res.status(400).json({ error: "lawyerId is required para corporacion" });
        }
        await storage.addLawyerToProceso(newProceso.id, req.body.lawyerId, {
          rol: "externo",
          tipoAsignacionId: TIPO_ASIGNACION_IDS.SOLICITUD_CLIENTE,
          razonAsignacion: `Contratado por corporación ${idProfile}`,
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

// PUT /api/procesos/:id - Update process
router.put("/procesos/:id", authenticate, requirePermission("procesos.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updatedProceso = await storage.updateProceso(id.toString(), req.body);
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
    await storage.deleteProceso(id.toString());
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/tipos-proceso - Get all process types
router.get("/tipos-proceso", authenticate, requirePermission("procesos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tipos = await storage.getTiposProceso();
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
    const nuevo = await storage.createTipoProceso({ nombre, descripcion });
    res.json(nuevo);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tipos-proceso/:id - Update process type
router.put("/tipos-proceso/:id", authenticate, requirePermission("procesos.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id.toString());
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const { nombre, descripcion, activo } = req.body;
    const actualizado = await storage.updateTipoProceso(id, { nombre, descripcion, activo });
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
    const id = parseInt(req.params.id.toString());
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    await storage.deleteTipoProceso(id);
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
    const limitNum = limit ? parseInt(limit as string, 10) : 10;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;
    const actualizaciones = await storage.getActualizaciones(procesoId, limitNum, offsetNum);
    res.json(actualizaciones);
  } catch (err) {
    next(err);
  }
});

// POST /api/actualizaciones - Create new update
router.post("/actualizaciones", authenticate, requirePermission("actualizaciones.crear"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newActualizacion = await storage.createActualizacion(req.body);
    res.status(201).json(newActualizacion);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/actualizaciones/:id - Delete update
router.delete("/actualizaciones/:id", authenticate, requirePermission("actualizaciones.eliminar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await storage.deleteActualizacion(id.toString());
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/estado - Get process states
router.get("/estado", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const estados = await storage.getEstadosProceso();
    res.json(estados);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard - Get dashboard stats
router.get("/dashboard", authenticate, requirePermission("dashboard.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user: JWTPayload = (req as any).user;
    const abogadoId = user.idProfile
    if (!abogadoId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get counts
    const totalClientes = await storage.getClientesCount(abogadoId);
    const totalProcesos = await storage.getProcesCount(abogadoId);
    const procesosActivos = await storage.getProcesCount(abogadoId, { estadoCodigo: "activo" });
    const procesosEnTramite = await storage.getProcesCount(abogadoId, { estadoCodigo: "en_tramite" });
    const procesosFinalizados = await storage.getProcesCount(abogadoId, { estadoCodigo: "finalizado" });

    // Get recent processes (last 5) - get all and take last 5
    const allProcesos = await storage.getProcesoByAbogadoId(abogadoId, 1000, 0, undefined);
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
      procesosRecientes,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
