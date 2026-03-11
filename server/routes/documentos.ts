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

const router = Router();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/documentos - Get documents for a process
router.get("/documentos", authenticate, requirePermission("documentos.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { procesoId } = req.query;
    if (!procesoId || typeof procesoId !== "string") {
      return res.status(400).json({ error: "procesoId is required" });
    }
    const documentos = await storage.getDocumentos(procesoId);
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
      const { procesoId, nombre, tipo, tamano, descripcion } = req.body;

      if (!file && !nombre) {
        return res.status(400).json({ error: "No se proporcionó archivo" });
      }

      let url = "";

      // If there's a file, upload to S3
      if (file) {
        // Get process information
        const proceso = await storage.getProceso(procesoId);
        if (!proceso) return res.status(404).json({ error: "Proceso no encontrado" });

        // Get client information
        const cliente = await storage.getCliente(proceso.clienteId);

        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

        // Get the lawyer associated with this client through lawyer_clients
        const lawyerRelations = await storage.lawyerClients.getClientLawyers(cliente.id);
        const bufeteId = lawyerRelations.length > 0 ? lawyerRelations[0].lawyerId : null;
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
