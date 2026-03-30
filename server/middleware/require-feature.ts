import type { Request, Response, NextFunction } from "express";
import type { JWTPayload } from "@/shared/model.schema.js";
import { subscriptionService } from "../services/subscription.service.js";

/**
 * Middleware: bloquea el acceso si el usuario no tiene la feature en su plan.
 *
 * Uso: router.get("/calendar", authenticate, requireFeature("calendario"), handler)
 */
export function requireFeature(featureCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as JWTPayload;
      if (!user?.id) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const has = await subscriptionService.hasFeature(user.id, featureCode);
      if (!has) {
        res.status(402).json({
          error:    "FEATURE_NOT_AVAILABLE",
          feature:  featureCode,
          mensaje:  "Esta funcionalidad no está disponible en tu plan actual. Actualiza para acceder.",
        });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
