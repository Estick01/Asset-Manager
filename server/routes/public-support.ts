import { randomUUID } from "crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, inArray } from "drizzle-orm";
import { publicSupportRequests, roles, users } from "@/shared/schema";
import { storage } from "../storage/storeage/database-storage.js";

const router = Router();

router.post("/public/support-request", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const source = req.body?.source === "login" ? "login" : req.body?.source === "landing" ? "landing" : null;

    if (!name || !email || !message || !source) {
      return res.status(400).json({
        error: "name, email, message y source son requeridos",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Email inválido" });
    }

    const db = (storage as any).db;
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    await db.insert(publicSupportRequests).values({
      id: randomUUID(),
      name,
      email,
      message,
      source,
      userId: existingUser?.id ?? null,
    });

    const adminRoles = await db.select({ id: roles.id }).from(roles).where(inArray(roles.nombre, ["admin_super", "admin_soporte"]));
    const adminRoleIds = adminRoles.map((role: { id: number }) => role.id);

    if (adminRoleIds.length > 0) {
      const adminUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.rolId, adminRoleIds));

      await Promise.all(
        adminUsers.map((admin: { id: string }) =>
          storage.appNotifications.createNotification(
            admin.id,
            "support_public_request",
            "Nueva consulta pública",
            `${name} dejó una consulta desde ${source === "login" ? "login" : "landing"}.`,
            { route: "/(admin-tabs)/soporte", source, email }
          )
        )
      );
    }

    res.status(201).json({
      success: true,
      message: "Tu solicitud fue enviada. Nuestro equipo te contactará pronto.",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
