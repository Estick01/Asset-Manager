import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { registerAppRoutes } from "./routes/index.js";
import { setupWebSocketServer } from "./websocket/ws-server.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware for parsing cookies
  app.use(cookieParser());

  // Register all modular routes
  registerAppRoutes(app);

  const httpServer = createServer(app);

  // Attach WebSocket server for real-time chat
  setupWebSocketServer(httpServer);

  return httpServer;
}
