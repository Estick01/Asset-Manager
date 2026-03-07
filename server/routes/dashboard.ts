import { FirmDashboardStorage } from './../storage/storeage/models/firm-dashboard.storage';
// routes/firm-dashboard.routes.ts

import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate, requirePermission } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";
import { extractToken, verifyToken } from "../auth.js";
import { JWTPayload } from "@/shared/model.schema.js";


const router = Router();

router.get("/firm/dashboard", authenticate, requirePermission("dashboard.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "No se proporcionó token" });
    }

    const { idProfile } = verifyToken(token) as JWTPayload;

    if (!idProfile) {
      return res.status(400).json({ error: "idProfile is required" });
    }

    const stats = await storage.FirmDashboardStorage.getStats(idProfile);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

export default router;