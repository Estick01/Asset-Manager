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
  updateProfile,
  resetPassword,
  revokeSessions,
  listLawyerVerifications,
  updateLawyerVerification,
} from "../controllers/admin-users.controller.js";

const router = Router();

// Todos los endpoints requieren autenticación + rol admin
router.use(authenticate, requireAdmin);

router.get("/",    listUsers);
router.get("/lawyer-verifications", listLawyerVerifications);
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
router.patch(
  "/:id/profile",
  requireAdminRole("admin_super", "admin_soporte"),
  updateProfile,
);
router.post(
  "/:id/reset-password",
  requireAdminRole("admin_super"),
  resetPassword,
);
router.post(
  "/:id/revoke-sessions",
  requireAdminRole("admin_super", "admin_soporte"),
  revokeSessions,
);
router.patch(
  "/lawyer-verifications/:id",
  requireAdminRole("admin_super", "admin_soporte"),
  updateLawyerVerification,
);

export default router;
