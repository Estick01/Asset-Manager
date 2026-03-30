/**
 * Document (Documentos) Routes
 * 
 * CRUD operations for documents with S3 storage integration.
 * Maintains backward compatibility with the original monolithic routes.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";

import { authenticate, requirePermission, extractToken, verifyToken } from "../auth.js";
import { storage } from "../storage/storeage/database-storage.js";
import { notificacionesService } from "../services/notificacion.service.js";
import type { JWTPayload } from "@/shared/model.schema.js";
import { EnumRol } from "@/shared/schema/user.schema.js";

const router = Router();

// ── File upload validation ─────────────────────────────────────────────────

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const DOC_MAX_SIZE = 20 * 1024 * 1024; // 20 MB

/** Validates real file type via magic bytes — ignores the client-declared MIME. */
function detectMimeFromBuffer(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  // PDF: %PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
  // ZIP-based (DOCX/XLSX): PK 03 04
  if (buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04) return "application/zip";
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DOC_MAX_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_TYPE"));
    }
  },
});

/**
 * Verifica que el usuario autenticado tenga acceso al proceso al que pertenece un documento.
 *
 * Reglas de acceso por rol:
 *  - cliente   → el proceso debe pertenecer a su cliente
 *  - abogado   → debe ser owner del proceso, estar en proceso_lawyers o ser el responsable activo
 *  - bufete    → debe ser owner del proceso via proceso_ownership (fuente de verdad)
 *  - otros roles autenticados → acceso denegado por defecto
 */
async function assertProcesoDocumentoAccess(
  payload: JWTPayload,
  procesoId: string,
  res: Response,
): Promise<boolean> {
  const proceso = await storage.getProceso(procesoId);
  if (!proceso) {
    res.status(404).json({ error: "Proceso no encontrado" });
    return false;
  }

  const rol        = payload.rol?.nombre;
  const actorId    = payload.idProfile!;

  // ── Cliente ───────────────────────────────────────────────────────────────
  if (rol === EnumRol.CLIENTE.nombre) {
    if (proceso.clienteId !== actorId) {
      res.status(403).json({ error: "No tienes acceso a este documento" });
      return false;
    }
    return true;
  }

  // ── Abogado ───────────────────────────────────────────────────────────────
  if (rol === EnumRol.ABOGADO.nombre) {
    // 1. El abogado es el owner directo del proceso (proceso privado suyo)
    const ownership = await storage.procesoOwnership.getActive(procesoId);
    if (ownership?.ownerType === "abogado" && ownership.ownerId === actorId) {
      return true;
    }

    // 2. El abogado está asignado al proceso (proceso_lawyers)
    const procesoLawyers = await storage.getProcesoLawyers(procesoId);
    if (procesoLawyers.some((pl: any) => pl.lawyerId === actorId)) {
      return true;
    }

    // 3. El abogado es el responsable activo
    if (proceso.responsable?.id === actorId) {
      return true;
    }

    res.status(403).json({ error: "No tienes acceso a este documento" });
    return false;
  }

  // ── Bufete ────────────────────────────────────────────────────────────────
  if (rol === EnumRol.BUFETE.nombre) {
    // Fuente de verdad: proceso_ownership dice que el proceso pertenece a este bufete
    const ownership = await storage.procesoOwnership.getActive(procesoId);
    if (ownership?.ownerType === "bufete" && ownership.ownerId === actorId) {
      return true;
    }

    res.status(403).json({ error: "No tienes acceso a este documento" });
    return false;
  }

  // Cualquier otro rol autenticado no tiene acceso
  res.status(403).json({ error: "No tienes acceso a este documento" });
  return false;
}

// GET /api/documentos - Get documents for a process
router.get("/documentos", authenticate, requirePermission("documentos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { procesoId } = req.query;
    if (!procesoId || typeof procesoId !== "string") {
      return res.status(400).json({ error: "procesoId is required" });
    }
    const payload = (req as any).user as JWTPayload;
    const allowed = await assertProcesoDocumentoAccess(payload, procesoId, res);
    if (!allowed) return;
    const stage = req.query.stage as string | undefined;
    const documentos = await storage.getDocumentos(procesoId, stage);
    res.json(documentos);
  } catch (err) {
    next(err);
  }
});

// GET /api/documentos/:id - Get single document
router.get("/documentos/:id", authenticate, requirePermission("documentos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const documento = await storage.getDocumento(id.toString());
    if (!documento) {
      return res.status(404).json({ error: "Documento not found" });
    }
    if (documento.procesoId) {
      const payload = (req as any).user as JWTPayload;
      const allowed = await assertProcesoDocumentoAccess(payload, documento.procesoId, res);
      if (!allowed) return;
    }
    res.json(documento);
  } catch (err) {
    next(err);
  }
});

// GET /api/documentos/:id/download - Download document from S3
router.get("/documentos/:id/download", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use extractToken to support both cookie and header authentication
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ error: "No se proporcionó token de autenticación" });
    }
    
    // Verify token
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    // Validate session is still active (not revoked by logout or password change)
    const sessionValid = await storage.sessions.isValid(payload.jti);
    if (!sessionValid) {
      return res.status(401).json({ error: "Sesión inválida o cerrada" });
    }

    // Check permissions
    const userPermissions = await storage.getPermisosByRol(payload.rol.id);
    if (!userPermissions.includes("documentos.ver")) {
      return res.status(403).json({ error: "No tiene permiso para descargar documentos" });
    }

    const { id } = req.params;
    const documento = await storage.getDocumento(id.toString());
    if (!documento) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    // ── Verificar acceso al proceso del documento ─────────────────────────
    if (documento.procesoId) {
      const allowed = await assertProcesoDocumentoAccess(payload as JWTPayload, documento.procesoId, res);
      if (!allowed) return;
    }

    // Get the file URI (S3 key or local path)
    const fileUri = documento.url;
    
    // Check if it's an S3 key (contains '/' and doesn't start with '/')
    if (fileUri && fileUri.includes("/") && !fileUri.startsWith("/") && !fileUri.includes(":\\")) {
      // It's an S3 key - generate presigned URL with 5 minute expiration
      const { getPresignedDownloadUrl } = await import("../services/s3-storage.js");
      const presignedUrl = await getPresignedDownloadUrl(fileUri, documento.nombre, 300); // 5 minutes, force download
      return res.redirect(presignedUrl);
    }
    
    // Fallback: check if file exists on server (local storage)
    const fs = await import("fs");
    if (fileUri && fs.existsSync(fileUri)) {
      // Server file - send as download
      res.setHeader("Content-Disposition", `attachment; filename="${documento.nombre}"`);
      res.setHeader("Content-Type", documento.tipo || "application/octet-stream");
      const fileBuffer = fs.readFileSync(fileUri);
      return res.send(fileBuffer);
    }
    
    // If file doesn't exist, return error
    return res.status(404).json({ error: "Archivo no encontrado" });
  } catch (err) {
    next(err);
  }
});

// POST /api/documentos - Upload new document
router.post(
  "/documentos",
  authenticate,
  requirePermission("documentos.subir"),
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file; // uploaded file
      const { procesoId, nombre, tipo, tamano, descripcion, legalStage } = req.body;

      if (!file && !nombre) {
        return res.status(400).json({ error: "No se proporcionó archivo" });
      }

      let url = "";

      // If there's a file, upload to S3
      if (file) {
        // Cross-validate declared MIME against actual file content (magic bytes).
        // Solo rechaza si detectamos POSITIVAMENTE un tipo diferente al declarado.
        // Si detectedMime === null (buffer vacío o tipo no reconocido), dejamos pasar
        // porque fileFilter ya validó el MIME declarado.
        const detectedMime = detectMimeFromBuffer(file.buffer);
        if (detectedMime !== null) {
          const isZipBased = file.mimetype.includes("wordprocessingml") || file.mimetype.includes("spreadsheetml");
          const mimeOk = detectedMime === file.mimetype || (isZipBased && detectedMime === "application/zip");
          if (!mimeOk) {
            return res.status(400).json({ error: "El contenido del archivo no coincide con su tipo declarado" });
          }
        }

        // Get process information
        const proceso = await storage.getProceso(procesoId);
        if (!proceso) return res.status(404).json({ error: "Proceso no encontrado" });

        // Get client information
        const cliente = await storage.getCliente(proceso.clienteId);

        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

        const clienteId = cliente.id;

        // Import S3 function dynamically
        const { uploadDocumentToS3 } = await import("../services/s3-storage.js");

        // Upload file to S3
        const s3Key = await uploadDocumentToS3(
          file.buffer,
          clienteId,
          procesoId,
          nombre || file.originalname,
          file.mimetype
        );

        url = s3Key;
      }

      // Prepare data to save in DB
      const docData = {
        procesoId,
        nombre: nombre || file?.originalname || "Documento sin nombre",
        url,
        tipo: file?.mimetype || tipo,
        tamano: file?.size || tamano,
        descripcion: descripcion || null,
        legalStage: legalStage && legalStage !== "__general__" ? legalStage : null,
      };

      // Save document in the database
      const newDocumento = await storage.createDocumento(docData as any);

      // Notify the client (fire-and-forget)
      try {
        const proc = await storage.getProceso(procesoId);
        if (proc?.clienteId) {
          notificacionesService.onDocumentoSubido({
            procesoId,
            clienteId: proc.clienteId,
            documentoNombre: docData.nombre,
          }).catch(() => {});
        }
      } catch {
        // non-critical
      }

      // Auto-event: emit documento_subido to the stage timeline (fire-and-forget)
      if (legalStage && legalStage !== "__general__") {
        storage.stageEvents.insert({
          procesoId,
          legalStageCode: legalStage,
          tipo: "documento_subido",
          descripcion: `Documento subido: ${newDocumento.nombre}`,
          metadatos: { documentoId: newDocumento.id, nombre: newDocumento.nombre },
          creadoPor: ((req as any).user as JWTPayload)?.idProfile ?? null,
        }).catch((err: unknown) => {
          console.error("Error creating stage event for document upload:", err);
        });
      }

      res.status(201).json(newDocumento);
    } catch (err) {
      // error handled by global error handler
      next(err);
    }
  }
);

// DELETE /api/documentos/:id - Delete document
router.delete("/documentos/:id", authenticate, requirePermission("documentos.eliminar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Get the document first to check if it's an S3 key
    const documento = await storage.getDocumento(id.toString());
    if (documento && documento.url && documento.url.includes("/") && !documento.url.startsWith("/") && !documento.url.includes(":\\")) {
      // It's an S3 key - delete from S3
      const { deleteDocumentFromS3 } = await import("../services/s3-storage.js");
      await deleteDocumentFromS3(documento.url);
    }
    
    await storage.deleteDocumento(id.toString());
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /uploads/:filename - Serve uploaded files
router.get("/uploads/:filename", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const pathModule = await import("path");

    // Prevent path traversal: resolve and verify it stays inside uploads/
    const uploadsDir = pathModule.resolve(process.cwd(), "uploads");
    const filePath = pathModule.resolve(uploadsDir, filename);

    if (!filePath.startsWith(uploadsDir + pathModule.sep) && filePath !== uploadsDir) {
      return res.status(400).json({ error: "Nombre de archivo inválido" });
    }

    // Only allow safe filename characters (no slashes, dots leading path)
    if (!/^[\w\-. ]+$/.test(filename)) {
      return res.status(400).json({ error: "Nombre de archivo inválido" });
    }

    const fs = await import("fs");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Archivo no encontrado" });
    }

    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

export default router;
