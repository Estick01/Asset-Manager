// server/admin/controllers/admin-users.controller.ts
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { adminUsersService } from "../services/admin-users.service.js";
import { auditService } from "../services/audit.service.js";
import type { JWTPayload } from "@/shared/model.schema.js";
import jwt from "jsonwebtoken";

// ── Schemas Zod ───────────────────────────────────────────────────────────────

const listSchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(20),
  tipo:   z.enum(["abogado", "bufete", "cliente"]).optional(),
  estado: z.enum(["activo", "suspendido"]).optional(),
  search: z.string().max(100).optional(),
});

const updateEstadoSchema = z.object({
  activo: z.boolean(),
});

const updatePlanSchema = z.object({
  planId: z.string().min(1),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAdminId(req: Request): string {
  return ((req as any).user as JWTPayload).id;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = listSchema.parse(req.query);
    const result = await adminUsersService.list(params);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await adminUsersService.getById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateEstado(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { activo } = updateEstadoSchema.parse(req.body);
    const userId     = req.params.id;

    await adminUsersService.updateEstado(userId, activo);

    await auditService.log({
      adminId:  getAdminId(req),
      accion:   activo ? "usuario.activar" : "usuario.suspender",
      targetId: userId,
      detalle:  JSON.stringify({ activo }),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function updatePlan(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { planId } = updatePlanSchema.parse(req.body);
    const userId     = req.params.id;

    await adminUsersService.updatePlan(userId, planId);

    await auditService.log({
      adminId:  getAdminId(req),
      accion:   "usuario.cambiar_plan",
      targetId: userId,
      detalle:  JSON.stringify({ planId }),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.params.id;
    const secret = process.env.JWT_SECRET ?? "fallback_secret";

    const token = jwt.sign(
      { userId, purpose: "password_reset" },
      secret,
      { expiresIn: "1h" },
    );

    await auditService.log({
      adminId:  getAdminId(req),
      accion:   "usuario.reset_password",
      targetId: userId,
    });

    res.json({ success: true, data: { token, expiresIn: "1h" } });
  } catch (err) {
    next(err);
  }
}
