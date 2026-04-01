// server/admin/routes/admin-users.routes.ts
import { Router } from "express";
import { authenticate } from "../../auth.js";
import {
  requireAdmin,
  requireAdminRole,
} from "../middleware/require-admin.js";
import {
  listUsers,
  getUserById,
  updateEstado,
  updatePlan,
  resetPassword,
} from "../controllers/admin-users.controller.js";

const router = Router();

// Todos los endpoints requieren autenticación + rol admin
router.use(authenticate, requireAdmin);

router.get("/",    listUsers);
router.get("/:id", getUserById);

// Acciones críticas con sub-rol específico
router.patch(
  "/:id/estado",
  requireAdminRole("admin_super", "admin_soporte"),
  updateEstado,
);
router.patch(
  "/:id/plan",
  requireAdminRole("admin_super"),
  updatePlan,
);
router.post(
  "/:id/reset-password",
  requireAdminRole("admin_super"),
  resetPassword,
);

export default router;
