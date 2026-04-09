/**
 * Firm Settings Routes
 *
 * Handles GET and PATCH operations for firm privacy settings.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";
import { validate } from "../middleware/validation.js";
import { subscriptionService } from "../services/subscription.service.js";

const router = Router();

const updateFirmSettingsSchema = z.object({
  allowPrivateClientes: z.boolean().optional(),
  allowPrivateProcesos: z.boolean().optional(),
  defaultClienteEsCompartido: z.boolean().optional(),
  defaultProcesoEsCompartido: z.boolean().optional(),
  notifMensajes: z.boolean().optional(),
  notifVencimientos: z.boolean().optional(),
  notifCambiosProcesos: z.boolean().optional(),
  notifEquipoInvitaciones: z.boolean().optional(),
  notifAlertasPlan: z.boolean().optional(),
  notifResumenSemanal: z.boolean().optional(),
});

/**
 * GET /api/firm/settings
 *
 * Retrieves the firm's privacy and sharing settings.
 * Only accessible to firm users.
 */
router.get(
  "/firm/settings",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user?.rol?.nombre !== "bufete") {
        return res.status(403).json({
          error: "Solo los bufetes pueden acceder a esta configuración"
        });
      }

      const settings = await storage.firmSettings.get(user.idProfile);
      res.json(settings);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/firm/settings
 *
 * Updates the firm's privacy and sharing settings.
 * Only accessible to firm users.
 */
router.patch(
  "/firm/settings",
  authenticate,
  validate(updateFirmSettingsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user?.rol?.nombre !== "bufete") {
        return res.status(403).json({
          error: "Solo los bufetes pueden modificar esta configuración"
        });
      }

      const requested = req.body as z.infer<typeof updateFirmSettingsSchema>;
      const needsBasicPrivacy =
        requested.allowPrivateClientes !== undefined ||
        requested.defaultClienteEsCompartido !== undefined;
      const needsAdvancedPrivacy =
        requested.allowPrivateProcesos !== undefined ||
        requested.defaultProcesoEsCompartido !== undefined;

      if (needsBasicPrivacy) {
        const hasBasicPrivacy = await subscriptionService.hasFeature(user.id, "privacidad_basica");
        if (!hasBasicPrivacy) {
          return res.status(402).json({
            error: "FEATURE_NOT_AVAILABLE",
            feature: "privacidad_basica",
            mensaje: "Tu plan actual no incluye configuraciones de clientes privados.",
          });
        }
      }

      if (needsAdvancedPrivacy) {
        const hasAdvancedPrivacy = await subscriptionService.hasFeature(user.id, "privacidad_avanzada");
        if (!hasAdvancedPrivacy) {
          return res.status(402).json({
            error: "FEATURE_NOT_AVAILABLE",
            feature: "privacidad_avanzada",
            mensaje: "Tu plan actual no incluye configuraciones de procesos privados.",
          });
        }
      }

      const updated = await storage.firmSettings.upsert(user.idProfile, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/firm/settings/my-firm
 *
 * Devuelve los settings de privacidad del bufete al que pertenece el abogado.
 * Retorna null si el abogado no pertenece a ningún bufete.
 * Solo accesible por abogados.
 */
router.get(
  "/firm/settings/my-firm",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user?.rol?.nombre !== "abogado") {
        return res.status(403).json({
          error: "Solo los abogados pueden usar este endpoint"
        });
      }

      const lawyer = await storage.lawyerProfiles.getLawyer(user.idProfile);
      if (!lawyer?.firmId) {
        return res.json(null);
      }

      const settings = await storage.firmSettings.get(lawyer.firmId);
      res.json(settings);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
