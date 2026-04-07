import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { sql, desc, like, or, eq } from "drizzle-orm";
import { authenticate } from "../../auth.js";
import { requireAdmin, requireAdminRole } from "../middleware/require-admin.js";
import { storage } from "../../storage/storeage/database-storage.js";
import { procesos, tiposProceso, estadosProceso, clientes, clientesNatural, clientesEmpresa, personas } from "@/shared/schema";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/summary", requireAdminRole("admin_super"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const [totals, tipos] = await Promise.all([
      db.select({
        total: sql<number>`COUNT(*)`,
        activos: sql<number>`SUM(CASE WHEN ${procesos.state} = 1 THEN 1 ELSE 0 END)`,
        archivados: sql<number>`SUM(CASE WHEN ${procesos.state} = 0 THEN 1 ELSE 0 END)`,
      }).from(procesos),
      db.select({
        nombre: tiposProceso.nombre,
        total: sql<number>`COUNT(*)`,
      })
        .from(procesos)
        .leftJoin(tiposProceso, eq(tiposProceso.id, procesos.tipoProcesoId))
        .groupBy(tiposProceso.nombre)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(6),
    ]);

    res.json({
      success: true,
      data: {
        total: Number(totals[0]?.total ?? 0),
        activos: Number(totals[0]?.activos ?? 0),
        archivados: Number(totals[0]?.archivados ?? 0),
        porTipo: tipos,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/records", requireAdminRole("admin_super"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === "string" ? `%${req.query.search}%` : undefined;

    const where = search
      ? or(
          like(procesos.radicado, search),
          like(procesos.juzgado, search),
          like(tiposProceso.nombre, search),
          like(personas.nombre, search),
          like(personas.apellido, search),
          like(clientesEmpresa.razonSocial, search),
        )
      : undefined;

    const rows = await db.select({
      id: procesos.id,
      radicado: procesos.radicado,
      juzgado: procesos.juzgado,
      state: procesos.state,
      fechaCreacion: procesos.fechaCreacion,
      tipoProceso: tiposProceso.nombre,
      estado: estadosProceso.nombre,
      clienteNombre: sql<string>`COALESCE(CONCAT(${personas.nombre}, ' ', ${personas.apellido}), ${clientesEmpresa.razonSocial}, 'Sin cliente')`,
    })
      .from(procesos)
      .leftJoin(tiposProceso, eq(tiposProceso.id, procesos.tipoProcesoId))
      .leftJoin(estadosProceso, eq(estadosProceso.id, procesos.estadoId))
      .leftJoin(clientes, eq(clientes.id, procesos.clienteId))
      .leftJoin(clientesNatural, eq(clientesNatural.clienteId, clientes.id))
      .leftJoin(personas, eq(personas.id, clientesNatural.personaId))
      .leftJoin(clientesEmpresa, eq(clientesEmpresa.clienteId, clientes.id))
      .where(where)
      .orderBy(desc(procesos.fechaCreacion))
      .limit(limit)
      .offset(offset);

    const countRows = await db.select({ total: sql<string>`COUNT(*)` })
      .from(procesos)
      .leftJoin(tiposProceso, eq(tiposProceso.id, procesos.tipoProcesoId))
      .leftJoin(clientes, eq(clientes.id, procesos.clienteId))
      .leftJoin(clientesNatural, eq(clientesNatural.clienteId, clientes.id))
      .leftJoin(personas, eq(personas.id, clientesNatural.personaId))
      .leftJoin(clientesEmpresa, eq(clientesEmpresa.clienteId, clientes.id))
      .where(where);

    res.json({
      success: true,
      data: rows,
      meta: { total: Number(countRows[0]?.total ?? 0), page, limit },
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/records/:id/state", requireAdminRole("admin_super"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { state } = z.object({ state: z.boolean() }).parse(req.body);
    const updated = await storage.updateProceso(req.params.id, { state });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.get("/types", requireAdminRole("admin_super"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tipos = await storage.tiposProceso.getTiposProceso();
    res.json({ success: true, data: tipos });
  } catch (err) {
    next(err);
  }
});

router.post("/types", requireAdminRole("admin_super"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = z.object({ nombre: z.string().min(1), descripcion: z.string().optional() }).parse(req.body);
    const created = await storage.tiposProceso.createTipoProceso(parsed);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put("/types/:id", requireAdminRole("admin_super"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const parsed = z.object({
      nombre: z.string().min(1).optional(),
      descripcion: z.string().nullable().optional(),
      activo: z.boolean().optional(),
    }).parse(req.body);
    const updated = await storage.tiposProceso.updateTipoProceso(id, parsed as any);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/types/:id", requireAdminRole("admin_super"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await storage.tiposProceso.deleteTipoProceso(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
