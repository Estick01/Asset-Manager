import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { sql, desc, and, eq, or, like } from "drizzle-orm";
import { authenticate } from "../../auth.js";
import { requireAdmin, requireAdminRole } from "../middleware/require-admin.js";
import { storage } from "../../storage/storeage/database-storage.js";
import { pagos, planes, suscripciones, users } from "@/shared/schema";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/summary", requireAdminRole("admin_super", "admin_finanzas"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const [subs, pay, monthlyRevenue] = await Promise.all([
      db.select({
        activas: sql<number>`SUM(CASE WHEN ${suscripciones.estado} = 'activa' THEN 1 ELSE 0 END)`,
        canceladas: sql<number>`SUM(CASE WHEN ${suscripciones.estado} = 'cancelada' THEN 1 ELSE 0 END)`,
        vencidas: sql<number>`SUM(CASE WHEN ${suscripciones.estado} = 'vencida' THEN 1 ELSE 0 END)`,
      }).from(suscripciones),
      db.select({
        pendientes: sql<number>`SUM(CASE WHEN ${pagos.estado} = 'pendiente' THEN 1 ELSE 0 END)`,
        aprobados: sql<number>`SUM(CASE WHEN ${pagos.estado} = 'aprobado' THEN 1 ELSE 0 END)`,
        rechazados: sql<number>`SUM(CASE WHEN ${pagos.estado} = 'rechazado' THEN 1 ELSE 0 END)`,
      }).from(pagos),
      db.select({
        totalCop: sql<string>`COALESCE(SUM(CASE WHEN ${pagos.estado} = 'aprobado' AND ${pagos.currency} = 'COP' THEN ${pagos.amountCop} ELSE 0 END), 0)`,
      }).from(pagos),
    ]);

    res.json({
      success: true,
      data: {
        suscripciones: {
          activas: Number(subs[0]?.activas ?? 0),
          canceladas: Number(subs[0]?.canceladas ?? 0),
          vencidas: Number(subs[0]?.vencidas ?? 0),
        },
        pagos: {
          pendientes: Number(pay[0]?.pendientes ?? 0),
          aprobados: Number(pay[0]?.aprobados ?? 0),
          rechazados: Number(pay[0]?.rechazados ?? 0),
        },
        ingresosCopAprobados: Number(monthlyRevenue[0]?.totalCop ?? 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/subscriptions", requireAdminRole("admin_super", "admin_finanzas"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = (page - 1) * limit;
    const estado = typeof req.query.estado === "string" ? req.query.estado : undefined;
    const search = typeof req.query.search === "string" ? `%${req.query.search}%` : undefined;
    const conditions = [];
    if (estado) conditions.push(eq(suscripciones.estado, estado as any));
    if (search) conditions.push(or(like(users.email, search), like(users.name, search))!);
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, countRows] = await Promise.all([
      db.select({
        id: suscripciones.id,
        userId: suscripciones.userId,
        planId: suscripciones.planId,
        estado: suscripciones.estado,
        ciclo: suscripciones.ciclo,
        fechaInicio: suscripciones.fechaInicio,
        fechaVencimiento: suscripciones.fechaVencimiento,
        autoRenovacion: suscripciones.autoRenovacion,
        extraUsers: suscripciones.extraUsers,
        userName: users.name,
        email: users.email,
        planNombre: planes.nombre,
        planTipo: planes.tipo,
      })
        .from(suscripciones)
        .innerJoin(users, eq(users.id, suscripciones.userId))
        .innerJoin(planes, eq(planes.id, suscripciones.planId))
        .where(where)
        .orderBy(desc(suscripciones.fechaInicio))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<string>`COUNT(*)` })
        .from(suscripciones)
        .innerJoin(users, eq(users.id, suscripciones.userId))
        .where(where),
    ]);

    res.json({
      success: true,
      data: rows,
      meta: { total: Number(countRows[0]?.total ?? 0), page, limit },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/payments", requireAdminRole("admin_super", "admin_finanzas"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = (storage as any).db;
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = (page - 1) * limit;
    const estado = typeof req.query.estado === "string" ? req.query.estado : undefined;
    const search = typeof req.query.search === "string" ? `%${req.query.search}%` : undefined;
    const conditions = [];
    if (estado) conditions.push(eq(pagos.estado, estado as any));
    if (search) conditions.push(or(like(users.email, search), like(users.name, search), like(pagos.wompiReference, search))!);
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, countRows] = await Promise.all([
      db.select({
        id: pagos.id,
        estado: pagos.estado,
        currency: pagos.currency,
        amountCop: pagos.amountCop,
        amountUsd: pagos.amountUsd,
        metodoPago: pagos.metodoPago,
        wompiReference: pagos.wompiReference,
        concepto: pagos.concepto,
        createdAt: pagos.createdAt,
        email: users.email,
        userName: users.name,
        planNombre: planes.nombre,
      })
        .from(pagos)
        .innerJoin(users, eq(users.id, pagos.userId))
        .leftJoin(suscripciones, eq(suscripciones.id, pagos.suscripcionId))
        .leftJoin(planes, eq(planes.id, suscripciones.planId))
        .where(where)
        .orderBy(desc(pagos.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<string>`COUNT(*)` })
        .from(pagos)
        .innerJoin(users, eq(users.id, pagos.userId))
        .where(where),
    ]);

    res.json({
      success: true,
      data: rows,
      meta: { total: Number(countRows[0]?.total ?? 0), page, limit },
    });
  } catch (err) {
    next(err);
  }
});

const updateSubscriptionSchema = z.object({
  estado: z.enum(["activa", "cancelada", "vencida", "en_prueba"]).optional(),
  autoRenovacion: z.boolean().optional(),
});

router.patch("/subscriptions/:id", requireAdminRole("admin_super", "admin_finanzas"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateSubscriptionSchema.parse(req.body);
    await (storage as any).db
      .update(suscripciones)
      .set(parsed)
      .where(eq(suscripciones.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
