// server/admin/routes/index.ts
import { Router } from "express";
import adminStatsRoutes from "./admin-stats.routes.js";

const router = Router();

router.use("/stats", adminStatsRoutes);

export default router;
