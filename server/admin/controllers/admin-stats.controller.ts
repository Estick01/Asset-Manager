// server/admin/controllers/admin-stats.controller.ts
import type { Request, Response, NextFunction } from "express";
import { adminStatsService } from "../services/admin-stats.service.js";

export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await adminStatsService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}
