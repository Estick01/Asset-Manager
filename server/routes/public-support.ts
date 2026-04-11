import { randomUUID } from "crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { publicSupportRequests, users } from "@/shared/schema";
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

    res.status(201).json({
      success: true,
      message: "Tu solicitud fue enviada. Nuestro equipo te contactará pronto.",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
