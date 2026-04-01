// server/admin/routes/admin-stats.routes.ts
import { Router } from "express";
import { authenticate } from "../../auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { getStats } from "../controllers/admin-stats.controller.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", getStats);

export default router;
