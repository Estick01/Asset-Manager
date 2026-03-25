/**
 * Routes Index
 * 
 * Aggregates all route modules and exports them for the Express app.
 */

import { type Express } from "express";
import { apiRateLimiter } from "../middleware/rate-limit.js";
import healthRoutes from "./health.js";
import authRoutes from "./auth.js";
import clientesRoutes from "./clientes.js";
import procesosRoutes from "./procesos.js";
import documentosRoutes from "./documentos.js";
import rolesRoutes from "./roles.js";
import notificacionesRoutes from "./notificaciones.js";
import firmProfileRoutes from "./firm-profile.js";
import lawyerProfileRoutes from "./lawyer-profile.js";
import tiposDocumentoRoutes from "./tipos-documento.js";
import ubicacionRoutes from "./ubicacion.js";
import lawyerFirmaHistoryRoutes from "./lawyer-firma-history.js";
import dashboardRoutes from "./dashboard.js";
import firmInvitationsRoutes from "./firm-invitations.js";
import firmRolesRoutes from "./firm-roles.js";
import chatRoutes from "./chat.js";
import tareasRoutes from "./tareas.js";
import communityRoutes from "./community.js";
import ratingsRoutes from "./ratings.js";
import clientRequestsRoutes from "./client-requests.js";
import passwordResetRoutes from "./password-reset.js";
import firmClientsRoutes from "./firm-clients.js";
import calendarRoutes from "./calendar.js";
import stageTemplatesRoutes from "./stage-task-templates.js";
import stageEventsRoutes from "./stage-events.js";
import procesoOwnershipRoutes from "./proceso-ownership.js";

/**
 * Register all application routes
 * Mounts all modular route handlers under /api prefix
 */
export function registerAppRoutes(app: Express): void {
  // Health check — no /api prefix, no rate limiting (accessible to load balancers)
  app.use("/", healthRoutes);

  // Apply global rate limiting to all API routes
  app.use("/api", apiRateLimiter);

  // Mount all route modules under /api prefix
  app.use("/api", authRoutes);
  app.use("/api", clientesRoutes);
  app.use("/api", procesosRoutes);
  app.use("/api", documentosRoutes);
  app.use("/api", rolesRoutes);
  app.use("/api", notificacionesRoutes);
  app.use("/api", firmProfileRoutes);
  app.use("/api", lawyerProfileRoutes);
  app.use("/api", tiposDocumentoRoutes);
  app.use("/api", ubicacionRoutes);
  app.use("/api", lawyerFirmaHistoryRoutes);
  app.use("/api", dashboardRoutes);
  app.use("/api", firmInvitationsRoutes);
  app.use("/api", firmRolesRoutes);
  app.use("/api", chatRoutes);
  app.use("/api", tareasRoutes);
  app.use("/api", communityRoutes);
  app.use("/api", ratingsRoutes);
  app.use("/api", clientRequestsRoutes);
  app.use("/api", passwordResetRoutes);
  app.use("/api", firmClientsRoutes);
  app.use("/api", calendarRoutes);
  app.use("/api", stageTemplatesRoutes);
  app.use("/api", stageEventsRoutes);
  app.use("/api", procesoOwnershipRoutes);
}

export default registerAppRoutes;
