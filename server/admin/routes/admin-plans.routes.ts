import { Router, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { eq, sql, desc, and } from "drizzle-orm";
import { authenticate } from "../../auth.js";
import { requireAdmin, requireAdminRole } from "../middleware/require-admin.js";
import { storage } from "../../storage/storeage/database-storage.js";
import { planes } from "@/shared/schema";

const router = Router();

router.use(authenticate, requireAdmin);

const planSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(["abogado", "bufete"]),
  precioMensualCop: z.coerce.string(),
  precioAnualCop: z.coerce.string(),
  precioMensualUsd: z.coerce.string(),
  precioAnualUsd: z.coerce.string(),
  maxProcesos: z.coerce.number().int(),
  maxClientes: z.coerce.number().int(),
  maxStorageGb: z.coerce.number().int(),
  includedUsers: z.coerce.number().int(),
  maxUsers: z.coerce.number().int(),
  precioUsuarioExtraCop: z.coerce.string().nullable().optional(),
  precioUsuarioExtraUsd: z.coerce.string().nullable().optional(),
  state: z.boolean().optional(),
});

router.get("/", requireAdminRole("admin_super", "admin_finanzas"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const tipo = typeof req.query.tipo === "string" ? req.query.tipo : undefined;
    const estado = typeof req.query.estado === "string" ? req.query.estado : "todos";

    const conditions = [];
    if (tipo === "abogado" || tipo === "bufete") conditions.push(eq(planes.tipo, tipo));
    if (estado === "activo") conditions.push(eq(planes.state, true));
    if (estado === "inactivo") conditions.push(eq(planes.state, false));

    const rows = await db
      .select({
        ...planes,
        suscriptores: sql<number>`(
          SELECT COUNT(*)
          FROM suscripciones s
          WHERE s.plan_id = ${planes.id} AND s.estado = 'activa'
        )`,
      })
      .from(planes)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(planes.state), planes.tipo, planes.nombre);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAdminRole("admin_super", "admin_finanzas"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = planSchema.parse(req.body);
    const created = await storage.planes.createPlan({
      id: randomUUID(),
      ...parsed,
      precioUsuarioExtraCop: parsed.precioUsuarioExtraCop ?? null,
      precioUsuarioExtraUsd: parsed.precioUsuarioExtraUsd ?? null,
      state: parsed.state ?? true,
    } as any);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireAdminRole("admin_super", "admin_finanzas"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = planSchema.partial().parse(req.body);
    const updated = await storage.planes.updatePlan(req.params.id, parsed as any);
    if (!updated) return res.status(404).json({ error: "Plan no encontrado" });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAdminRole("admin_super"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await storage.planes.updatePlan(req.params.id, { state: false } as any);
    if (!updated) return res.status(404).json({ error: "Plan no encontrado" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
