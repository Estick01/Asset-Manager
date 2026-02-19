import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  app.get("/api/clientes", async (req, res, next) => {
    try {
      const { abogadoId } = req.query;
      if (!abogadoId || typeof abogadoId !== "string") {
        return res.status(400).json({ error: "abogadoId is required" });
      }
      const clientes = await storage.getClientes(abogadoId);
      res.json(clientes);
    } catch (err) {
      next(err);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
