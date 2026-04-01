// server/admin/routes/index.ts
import { Router } from "express";
import adminStatsRoutes from "./admin-stats.routes.js";
import adminUsersRoutes from "./admin-users.routes.js";

const router = Router();

router.use("/stats", adminStatsRoutes);
router.use("/users", adminUsersRoutes);

export default router;
