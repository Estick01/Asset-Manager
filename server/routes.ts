import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { registerAppRoutes } from "./routes/index.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware for parsing cookies
  app.use(cookieParser());

  // Register all modular routes
  registerAppRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
