import { Router } from "express";
import { authenticate } from "../auth.js";
import { clientRequestService } from "../services/client-request.service.js";
import { storage } from "../storage/storeage/database-storage.js";
import { rateLimit } from "../middleware/rate-limit.js";

const router = Router();

// Max 5 client-requests per minute per IP
const requestLimiter = rateLimit({ windowMs: 60_000, maxRequests: 5,
  message: "Demasiadas solicitudes de cliente. Intenta de nuevo en un minuto." });

/** POST /api/client-requests — lawyer/firm sends a request to a client */
router.post("/client-requests", authenticate, requestLimiter, async (req, res) => {
  try {
    const fromUserId = req.user!.id;
    const { toUserId } = req.body;
    if (!toUserId) return res.status(400).json({ error: "toUserId es requerido" });

    const result = await clientRequestService.sendRequest(fromUserId, toUserId);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Error interno" });
  }
});

/** GET /api/client-requests/status/:toUserId — check relationship status */
router.get("/client-requests/status/:toUserId", authenticate, async (req, res) => {
  try {
    const fromUserId = req.user!.id;
    const { toUserId } = req.params;
    const result = await clientRequestService.getStatus(fromUserId, toUserId);
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Error interno" });
  }
});

/** GET /api/client-requests/pending — client gets their pending requests */
router.get("/client-requests/pending", authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const requests = await clientRequestService.getPendingForClient(userId);
    res.json(requests);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Error interno" });
  }
});

/** PATCH /api/client-requests/:id/respond — client accepts or rejects */
router.patch("/client-requests/:id/respond", authenticate, async (req, res) => {
  try {
    const clientUserId = req.user!.id;
    const { id }       = req.params;
    const { accept }   = req.body;
    if (typeof accept !== "boolean") {
      return res.status(400).json({ error: "'accept' debe ser true o false" });
    }
    const result = await clientRequestService.respondToRequest(id, clientUserId, accept);
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Error interno" });
  }
});

/** GET /api/app-notifications — all notifications for current user */
router.get("/app-notifications", authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const notifications = await storage.appNotifications.getForUser(userId);
    res.json(notifications);
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});

/** GET /api/app-notifications/unread-count */
router.get("/app-notifications/unread-count", authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const count = await storage.appNotifications.getUnreadCount(userId);
    res.json({ count });
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});

/** PATCH /api/app-notifications/:id/read */
router.patch("/app-notifications/:id/read", authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    await storage.appNotifications.markRead(req.params.id, userId);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});

/** PATCH /api/app-notifications/read-all */
router.patch("/app-notifications/read-all", authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    await storage.appNotifications.markAllRead(userId);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});

export default router;
