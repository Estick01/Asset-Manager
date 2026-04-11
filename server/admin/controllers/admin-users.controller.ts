// server/admin/controllers/admin-users.controller.ts
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { adminUsersService } from "../services/admin-users.service.js";
import { auditService } from "../services/audit.service.js";
import type { JWTPayload } from "@/shared/model.schema.js";
import jwt from "jsonwebtoken";
import type { LawyerProfessionalVerificationStatus } from "@/shared/schema";

const ADMIN_RESET_TOKEN_EXPIRES = "15m";
const RESET_TOKEN_TYPE = "password_reset";

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

const updateProfileSchema = z.object({
  name: z.string().max(120).optional(),
  email: z.string().email().optional(),
  lawyer: z.object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    phone: z.string().max(50).optional(),
    document: z.string().max(50).optional(),
    address: z.string().max(255).optional(),
    specialization: z.string().max(255).optional(),
    licenseNumber: z.string().max(50).optional(),
  }).optional(),
  firm: z.object({
    name: z.string().max(255).optional(),
    nit: z.string().max(50).optional(),
    address: z.string().max(255).optional(),
    phone: z.string().max(50).optional(),
  }).optional(),
  clientNatural: z.object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    phone: z.string().max(50).optional(),
    document: z.string().max(50).optional(),
    address: z.string().max(255).optional(),
  }).optional(),
  clientEmpresa: z.object({
    companyName: z.string().max(255).optional(),
    nit: z.string().max(50).optional(),
    sector: z.string().max(100).optional(),
  }).optional(),
  admin: z.object({
    displayName: z.string().max(120).optional(),
    adminType: z.string().max(50).optional(),
  }).optional(),
});

const lawyerVerificationListSchema = z.object({
  status: z.enum(["pendiente", "verificado", "rechazado"]).default("pendiente"),
});

const updateLawyerVerificationSchema = z.object({
  status: z.enum(["verificado", "rechazado"]),
  reviewNotes: z.string().max(1000).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAdminId(req: Request): string {
  const user = (req as any).user as JWTPayload | undefined;
  if (!user?.id) throw new Error("Unauthorized: no user on request");
  return user.id;
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

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = updateProfileSchema.parse(req.body);
    const userId = req.params.id;

    await adminUsersService.updateProfile(userId, payload);

    await auditService.log({
      adminId: getAdminId(req),
      accion: "usuario.actualizar_perfil",
      targetId: userId,
      detalle: JSON.stringify(payload),
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

    // Verificar que el usuario existe
    const user = await adminUsersService.getById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is not configured");
    }

    const token = jwt.sign(
      { sub: userId, type: RESET_TOKEN_TYPE },
      secret,
      { expiresIn: ADMIN_RESET_TOKEN_EXPIRES },
    );

    await auditService.log({
      adminId:  getAdminId(req),
      accion:   "usuario.reset_password",
      targetId: userId,
      detalle:  JSON.stringify({ email: user.email }),
    });

    res.json({ success: true, data: { token, expiresIn: ADMIN_RESET_TOKEN_EXPIRES } });
  } catch (err) {
    next(err);
  }
}

export async function revokeSessions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.params.id;
    const user = await adminUsersService.getById(userId);

    if (!user) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }

    await adminUsersService.revokeSessions(userId);

    await auditService.log({
      adminId: getAdminId(req),
      accion: "usuario.revocar_sesiones",
      targetId: userId,
      detalle: JSON.stringify({ email: user.email }),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listLawyerVerifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { status } = lawyerVerificationListSchema.parse(req.query);
    const data = await adminUsersService.listLawyerVerifications(status as LawyerProfessionalVerificationStatus);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateLawyerVerification(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { status, reviewNotes } = updateLawyerVerificationSchema.parse(req.body);
    const lawyerProfileId = req.params.id;
    const adminId = getAdminId(req);

    await adminUsersService.updateLawyerVerification(lawyerProfileId, {
      status,
      reviewNotes,
      reviewedBy: adminId,
    });

    await auditService.log({
      adminId,
      accion: `abogado.verificacion_${status}`,
      targetId: lawyerProfileId,
      detalle: JSON.stringify({ status, reviewNotes: reviewNotes ?? null }),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
