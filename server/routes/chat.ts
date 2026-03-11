/**
 * Chat Routes
 * REST endpoints for conversation management and message history.
 * Real-time messaging is handled by the WebSocket server.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../auth.js";
import { chatService } from "../services/chat.service.js";
import type { ConversationType } from "@/shared/schema";

const router = Router();

// ----------------------------------------------------------------
// GET /api/chat/conversations
// List all conversations for the authenticated user (paginated)
// Query params: limit, offset
// ----------------------------------------------------------------
router.get(
  "/chat/conversations",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await chatService.getConversations(userId, limit, offset);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------
// POST /api/chat/conversations
// Get or create a direct conversation with another user
// Body: { targetUserId, type }
// ----------------------------------------------------------------
router.post(
  "/chat/conversations",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const { targetUserId, type } = req.body as {
        targetUserId: string;
        type: ConversationType;
      };

      if (!targetUserId || !type) {
        return res.status(400).json({ error: "targetUserId y type son requeridos" });
      }

      const conversation = await chatService.getOrCreateConversation(
        userId,
        targetUserId,
        type
      );
      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------
// GET /api/chat/conversations/:id/messages
// Paginated message history for a conversation
// ----------------------------------------------------------------
router.get(
  "/chat/conversations/:id/messages",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const id = req.params.id as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const msgs = await chatService.getMessages(id, userId, limit, offset);
      res.json(msgs);
    } catch (err) {
      if ((err as Error).message === "Forbidden") {
        return res.status(403).json({ error: "No autorizado" });
      }
      next(err);
    }
  }
);

// ----------------------------------------------------------------
// POST /api/chat/conversations/:id/messages
// Send a message (REST fallback — prefer WebSocket)
// ----------------------------------------------------------------
router.post(
  "/chat/conversations/:id/messages",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const id = req.params.id as string;
      const { content } = req.body as { content: string };

      if (!content?.trim()) {
        return res.status(400).json({ error: "El contenido no puede estar vacío" });
      }


      const message = await chatService.sendMessage(id, userId, content.trim());
      res.status(201).json(message);
    } catch (err) {
      if ((err as Error).message === "Forbidden") {
        return res.status(403).json({ error: "No autorizado" });
      }
      next(err);
    }
  }
);

// ----------------------------------------------------------------
// POST /api/chat/conversations/:id/read
// Mark all messages in a conversation as read
// ----------------------------------------------------------------
router.post(
  "/chat/conversations/:id/read",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const id = req.params.id as string;
      await chatService.markRead(id, userId);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------
// DELETE /api/chat/messages/:messageId
// Soft-delete a message (sender only)
// ----------------------------------------------------------------
router.delete(
  "/chat/messages/:messageId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const messageId = req.params.messageId as string;
      const deleted = await chatService.deleteMessage(messageId, userId);
      if (!deleted) {
        return res.status(403).json({ error: "No autorizado o mensaje no encontrado" });
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
