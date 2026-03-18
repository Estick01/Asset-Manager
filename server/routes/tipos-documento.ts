/**
 * Tipos Documento Routes
 * API endpoints for tipos_documento
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/storeage/database-storage.js";

const router = Router();

// GET /api/tipos-documento - Public: used in registration forms
router.get("/tipos-documento", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tiposDocumento = await storage.tiposDocumento.getAll();
    res.json(tiposDocumento);
  } catch (err) {
    next(err);
  }
});

export default router;
