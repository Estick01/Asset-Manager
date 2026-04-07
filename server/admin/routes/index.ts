// server/admin/routes/index.ts
import { Router } from "express";
import adminStatsRoutes from "./admin-stats.routes.js";
import adminUsersRoutes from "./admin-users.routes.js";
import adminPlansRoutes from "./admin-plans.routes.js";
import adminBillingRoutes from "./admin-billing.routes.js";
import adminProcessesRoutes from "./admin-processes.routes.js";
import adminCommunityRoutes from "./admin-community.routes.js";
import adminSupportRoutes from "./admin-support.routes.js";
import adminConfigRoutes from "./admin-config.routes.js";

const router = Router();

router.use("/stats", adminStatsRoutes);
router.use("/users", adminUsersRoutes);
router.use("/plans", adminPlansRoutes);
router.use("/billing", adminBillingRoutes);
router.use("/processes", adminProcessesRoutes);
router.use("/community", adminCommunityRoutes);
router.use("/support", adminSupportRoutes);
router.use("/config", adminConfigRoutes);

export default router;
