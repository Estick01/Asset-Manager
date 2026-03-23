import { Router } from "express";
import { authenticate } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";
import { clientesService } from "../services/index.js";

const router = Router();

/** GET /api/firm/clients — lista clientes vinculados al bufete vía firm_clients */
router.get("/firm/clients", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user?.rol?.nombre !== "bufete") {
      return res.status(403).json({ error: "Solo los bufetes pueden acceder a esta ruta" });
    }

    const firmId = user.idProfile as string;
    const { limit, offset, search } = req.query;
    const limitNum  = limit  ? parseInt(limit  as string, 10) : 50;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;

    const clients = await clientesService.getClientesByFirm(
      firmId, limitNum, offsetNum,
      { search: search as string | undefined }
    );
    res.json(clients);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

/** PATCH /api/firm/clients/:clientId/remove — soft-delete: status = "inactive" */
router.patch("/firm/clients/:clientId/remove", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user?.rol?.nombre !== "bufete") {
      return res.status(403).json({ error: "Solo los bufetes pueden realizar esta acción" });
    }

    const firmId   = user.idProfile as string;
    const { clientId } = req.params;

    // Verify the client is actually linked to this firm
    const existing = await storage.firmClients.getActiveFirmClient(firmId, clientId);
    if (!existing) {
      return res.status(404).json({ error: "Relación cliente-bufete no encontrada" });
    }

    await storage.firmClients.deactivate(firmId, clientId);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});

export default router;
