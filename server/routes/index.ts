/**
 * Routes Index
 * 
 * Aggregates all route modules and exports them for the Express app.
 */

import { type Express } from "express";
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
import chatRoutes from "./chat.js";
import tareasRoutes from "./tareas.js";

/**
 * Register all application routes
 * Mounts all modular route handlers under /api prefix
 */
export function registerAppRoutes(app: Express): void {
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
  app.use("/api", chatRoutes);
  app.use("/api", tareasRoutes);
}

export default registerAppRoutes;
