/**
 * Chat Routes
 * REST endpoints for conversation management and message history.
 * Real-time messaging is handled by the WebSocket server.
 */

import path from "path";
import crypto from "crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { authenticate } from "../auth.js";
import { chatService } from "../services/chat.service.js";
import { uploadBuffer } from "../services/s3-storage.js";
import { broadcastToRoom } from "../websocket/ws-server.js";
import type { ConversationType } from "@/shared/schema";

const router = Router();

// ----------------------------------------------------------------
// Multer — memory storage, 10 MB hard cap (enforced again per-MIME below)
// ----------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

// Magic bytes signatures for real file type verification
function detectMimeFromBuffer(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  // PDF: %PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
  // ZIP (DOCX/XLSX): PK 03 04
  if (buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04) {
    // Both DOCX and XLSX are ZIP — trust the declared MIME for distinction
    return "application/zip";
  }
  return null;
}

const IMAGE_MAX = 5 * 1024 * 1024;   // 5 MB for images
const DOC_MAX  = 10 * 1024 * 1024;   // 10 MB for documents

// ----------------------------------------------------------------
// GET /api/chat/conversations
// ----------------------------------------------------------------
router.get(
  "/chat/conversations",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const limit  = Math.min(Math.max(parseInt(req.query.limit  as string) || 20, 1), 100);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const result = await chatService.getConversations(userId, limit, offset);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------
// POST /api/chat/conversations
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

      const conversation = await chatService.getOrCreateConversation(userId, targetUserId, type);
      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------
// GET /api/chat/conversations/:id/messages
// ----------------------------------------------------------------
router.get(
  "/chat/conversations/:id/messages",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const id     = req.params.id as string;
      const limit  = req.query.limit  ? parseInt(req.query.limit  as string, 10) : 50;
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
// POST /api/chat/conversations/:id/messages  (REST fallback)
// ----------------------------------------------------------------
router.post(
  "/chat/conversations/:id/messages",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId  = (req as any).user?.id;
      const id      = req.params.id as string;
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
// POST /api/chat/conversations/:conversationId/upload
// Multipart file upload — saves to S3, inserts message, broadcasts via WS
// ----------------------------------------------------------------
router.post(
  "/chat/conversations/:conversationId/upload",
  authenticate,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId         = (req as any).user?.id as string;
      const conversationId = req.params.conversationId as string;
      const procesoId      = typeof req.body.procesoId === "string" ? req.body.procesoId : null;
      const tempId         = typeof req.body.tempId    === "string" ? req.body.tempId    : null;

      if (!req.file) {
        return res.status(400).json({ error: "FILE_MISSING" });
      }

      // 1. Validate participant
      const isMember = await chatService.getParticipantUserIds(conversationId)
        .then(ids => ids.includes(userId));
      if (!isMember) {
        return res.status(403).json({ error: "NOT_PARTICIPANT" });
      }

      // 2. Validate MIME — verify real content via magic bytes, not just client header
      const mime = req.file.mimetype;
      if (!ALLOWED_MIMES.has(mime)) {
        return res.status(400).json({ error: "INVALID_TYPE" });
      }
      const detectedMime = detectMimeFromBuffer(req.file.buffer);
      const isZipBased   = mime.includes("wordprocessingml") || mime.includes("spreadsheetml");
      if (detectedMime === null || (detectedMime !== mime && !(isZipBased && detectedMime === "application/zip"))) {
        return res.status(400).json({ error: "INVALID_TYPE" });
      }

      // 3. Validate size per MIME category
      const isImage  = mime.startsWith("image/");
      const maxBytes = isImage ? IMAGE_MAX : DOC_MAX;
      if (req.file.size > maxBytes) {
        return res.status(400).json({ error: "FILE_TOO_LARGE" });
      }

      // 4. Build S3 key
      const now  = new Date();
      const year = now.getFullYear().toString();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const uuid = crypto.randomUUID();
      const ext  = path.extname(req.file.originalname).toLowerCase() || "";

      const s3Key = procesoId
        ? `procesos/${procesoId}/chat/${year}/${month}/${uuid}${ext}`
        : `chat/${conversationId}/${year}/${month}/${uuid}${ext}`;

      // 5. Compute SHA-256 hash (audit only — not used for deduplication)
      const fileHash = crypto
        .createHash("sha256")
        .update(req.file.buffer)
        .digest("hex");

      // 6. Upload to S3
      await uploadBuffer(s3Key, req.file.buffer, mime);

      // 7. Insert message (fileKey stored internally, never sent to client)
      const message = await chatService.sendFileMessage({
        conversationId,
        senderId: userId,
        fileKey:  s3Key,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileMime: mime,
        fileHash,
      });

      // 8. Broadcast via WebSocket (tempId included for sender-side optimistic replacement)
      broadcastToRoom(conversationId, {
        type: "new_message",
        data: { ...message, tempId: tempId ?? undefined },
      });

      // 9. Respond
      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------
// GET /api/chat/messages/:messageId/download
// Returns a 60-second signed S3 URL — file_key never leaves the backend
// ----------------------------------------------------------------
router.get(
  "/chat/messages/:messageId/download",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId    = (req as any).user?.id as string;
      const messageId = req.params.messageId as string;

      const url = await chatService.getDownloadUrl(messageId, userId);
      res.json({ url });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "Forbidden")  return res.status(403).json({ error: "NOT_PARTICIPANT" });
      if (msg === "NotFound")   return res.status(404).json({ error: "MESSAGE_NOT_FOUND" });
      next(err);
    }
  }
);

// ----------------------------------------------------------------
// POST /api/chat/conversations/:id/read
// ----------------------------------------------------------------
router.post(
  "/chat/conversations/:id/read",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const id     = req.params.id as string;
      await chatService.markRead(id, userId);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------
// DELETE /api/chat/messages/:messageId
// ----------------------------------------------------------------
router.delete(
  "/chat/messages/:messageId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId    = (req as any).user?.id;
      const messageId = req.params.messageId as string;
      const deleted   = await chatService.deleteMessage(messageId, userId);
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
