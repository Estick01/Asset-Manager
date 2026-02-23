import type { Express , Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import cookieParser from "cookie-parser";
import multer from "multer";
import { storage } from "./storage.js";
import { hashPassword, verifyPassword, createAuthResponse, verifyToken, authenticate, authenticateCliente, requirePermission, extractToken, clearCookieOptions, AUTH_COOKIE_NAME } from "./auth.js";
import { rolesPermisos, roles, insertRolSchema, type InsertRol, procesos, clientes } from "../shared/schema.js";
import { eq, desc } from "drizzle-orm";


export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware para parsear cookies
  app.use(cookieParser());

  const upload = multer({ storage: multer.memoryStorage() });
  
  // put application routes here
  // prefix all routes with /api

  app.post("/api/login", async (req, res, next) => {
    try {
      const { correo, password } = req.body;
      if (!correo || !password) {
        return res.status(400).json({ error: "correo and password are required" });
      }

      const abogado = await storage.getAbogadoByCorreo(correo);
      if (!abogado) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      // Verificar contraseña hasheada
      const isValidPassword = await verifyPassword(password, abogado.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      // Generar respuesta con token JWT y establecer cookie HttpOnly
      const authResponse = createAuthResponse(abogado, "abogado", res);
      res.json(authResponse);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registering new user with data:", req.body);
      
      const { password } = req.body;
      
      // Verificar si el correo ya está registrado
      const existingAbogado = await storage.getAbogadoByCorreo(req.body.correo);
      if (existingAbogado) {
        return res.status(400).json({ error: "El correo ya está registrado" });
      }
      
      // Hashear la contraseña antes de guardar
      const hashedPassword = await hashPassword(password);
      
      const newAbogado = await storage.createAbogado({
        ...req.body,
        password: hashedPassword,
        planId: "default-plan-id",
      });
      console.log("User registered successfully:", newAbogado);
      
      // Generar respuesta con token JWT y establecer cookie HttpOnly
      const authResponse = createAuthResponse(newAbogado, "abogado", res);
      res.status(201).json(authResponse);
    } catch (err) {
      console.error("Error during registration:", err);
      next(err);
    }
  });

  app.post("/api/login-cliente", async (req, res, next) => {
    try {
      const { documento, password } = req.body;
      if (!documento || !password) {
        return res.status(400).json({ error: "documento and password are required" });
      }

      const cliente = await storage.getClienteByDocument(documento);

      if (!cliente || !cliente.activo) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      // Verificar contraseña hasheada
      const isValidPassword = await verifyPassword(password, cliente.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      // Generar respuesta con token JWT y establecer cookie HttpOnly
      const authResponse = createAuthResponse(cliente, "cliente", res);
      res.json(authResponse);
    } catch (err) {
      next(err);
    }
  });

  // --- Rutas protegidas de Cliente (portal) ---
  // Endpoint para que el cliente obtenga sus propios datos
  app.get("/api/cliente/me", authenticateCliente, async (req, res, next) => {
    try {
      const user = (req as any).user;
      const cliente = await storage.getCliente(user.id);
      if (!cliente) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      res.json(cliente);
    } catch (err) {
      next(err);
    }
  });

  // Endpoint para que el cliente actualice sus propios datos
  app.put("/api/cliente/me", authenticateCliente, async (req, res, next) => {
    try {
      const user = (req as any).user;
      const { password, ...rest } = req.body;
      const updateData: any = { ...rest };
      
      // Hashear la nueva contraseña si se proporciona
      if (password) {
        updateData.password = await hashPassword(password);
      }
      
      const updatedCliente = await storage.updateCliente(user.id, updateData);
      if (!updatedCliente) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }
      res.json(updatedCliente);
    } catch (err) {
      next(err);
    }
  });


  // --- Rutas protegidas de Clientes ---
  app.get("/api/clientes", authenticate, requirePermission("clientes.ver"), async (req, res, next) => {
    try {
      // Get user ID from JWT token - never trust frontend
      const user = (req as any).user as { id: string };
      const abogadoId = user.id;
      
      const { limit, offset, search } = req.query;
      const limitNum = limit ? parseInt(limit as string, 10) : 10;
      const offsetNum = offset ? parseInt(offset as string, 10) : 0;
      const filter = search ? { search: search as string } : undefined;
      const clientes = await storage.getClientes(abogadoId, limitNum, offsetNum, filter);
      res.json(clientes);
    } catch (err) {
      next(err);
    }
  });

  // Count clientes - returns just the count
  app.get("/api/clientes/count", authenticate, requirePermission("clientes.ver"), async (req, res, next) => {
    try {
      // Get user ID from JWT token - never trust frontend
      const user = (req as any).user as { id: string };
      const abogadoId = user.id;
      
      const count = await storage.getClientesCount(abogadoId);
      res.json({ count });
    } catch (err) {
      next(err);
    }
  });

  // Count procesos - returns just the count
  app.get("/api/procesos/count", authenticate, requirePermission("procesos.ver"), async (req, res, next) => {
    try {
      // Get user ID from JWT token - never trust frontend
      const user = (req as any).user as { id: string };
      const abogadoId = user.id;
      
      const { estadoCodigo } = req.query;
      const filter = estadoCodigo ? { estadoCodigo: estadoCodigo as string } : undefined;
      const count = await storage.getProcesosCount(abogadoId, filter);
      res.json({ count });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/clientes/:id", authenticate, requirePermission("clientes.ver"), async (req, res, next) => {
    try {
      const { id } = req.params;
      const cliente = await storage.getCliente(id.toString());
      if (!cliente) {
        return res.status(404).json({ error: "Cliente not found" });
      }
      res.json(cliente);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/clientes", authenticate, requirePermission("clientes.crear"), async (req, res, next) => {
    try {
      // Hashear la contraseña antes de guardar
      const { password, ...rest } = req.body;
      const hashedPassword = password ? await hashPassword(password) : "";
      
      const newCliente = await storage.createCliente({
        ...rest,
        password: hashedPassword,
      });
      res.status(201).json(newCliente);
    } catch (err) {
      next(err);
    }
  });

  app.put("/api/clientes/:id", authenticate, requirePermission("clientes.editar"), async (req, res, next) => {
    try {
      const { id } = req.params;
      // Hashear la contraseña solo si se proporciona y no está ya hasheada
      const { password, ...rest } = req.body;
      
      let updates = rest;
      if (password) {
        // Verificar si la contraseña ya está hasheada (los hashes de bcrypt tienen $2)
        const hashedPassword = password.startsWith("$2") ? password : await hashPassword(password);
        updates = { ...rest, password: hashedPassword };
      }
      
      const updatedCliente = await storage.updateCliente(id.toString(), updates);
      if (!updatedCliente) {
        return res.status(404).json({ error: "Cliente not found" });
      }
      res.json(updatedCliente);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/clientes/:id", authenticate, requirePermission("clientes.eliminar"), async (req, res, next) => {
    try {
      const { id } = req.params;
      await storage.deleteCliente(id.toString());
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // --- Rutas protegidas de Procesos ---
  app.get("/api/procesos", authenticate, requirePermission("procesos.ver"), async (req, res, next) => {
    try {
      // Get user ID from JWT token - never trust frontend
      const user = (req as any).user as { id: string; type: string };
      const { clienteId, limit, offset, estadoCodigo, search } = req.query;
      const limitNum = limit ? parseInt(limit as string, 10) : 10;
      const offsetNum = offset ? parseInt(offset as string, 10) : 0;
      const filter = {
        estadoCodigo: estadoCodigo as string | undefined,
        search: search as string | undefined,
      };
      
      // If user is a lawyer, use their ID
      if (user.type === "abogado") {
        const procesos = await storage.getProcesos(user.id, limitNum, offsetNum, filter);
        return res.json(procesos);
      }
      // If user is a client, get processes for that client
      if (user.type === "cliente" && clienteId) {
        const procesos = await storage.getProcesosByCliente(clienteId.toString(), limitNum, offsetNum, filter);
        return res.json(procesos);
      }
      return res.status(400).json({ error: "Unable to fetch processes" });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/procesos/:id", authenticate, requirePermission("procesos.ver"), async (req, res, next) => {
    try {
      const { id } = req.params;
      const proceso = await storage.getProceso(id.toString());
      if (!proceso) {
        return res.status(404).json({ error: "Proceso not found" });
      }
      res.json(proceso);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/procesos", authenticate, requirePermission("procesos.crear"), async (req, res, next) => {
    try {
      // TODO: validate body with zod
      const newProceso = await storage.createProceso(req.body);
      res.status(201).json(newProceso);
    } catch (err) {
      next(err);
    }
  });

  app.put("/api/procesos/:id", authenticate, requirePermission("procesos.editar"), async (req, res, next) => {
    try {
      const { id } = req.params;
      // TODO: validate body with zod
      const updatedProceso = await storage.updateProceso(id.toString(), req.body);
      if (!updatedProceso) {
        return res.status(404).json({ error: "Proceso not found" });
      }
      res.json(updatedProceso);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/procesos/:id", authenticate, requirePermission("procesos.eliminar"), async (req, res, next) => {
    try {
      const { id } = req.params;
      await storage.deleteProceso(id.toString());
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // --- Rutas protegidas de Actualizaciones ---
  app.get("/api/actualizaciones", authenticate, requirePermission("actualizaciones.ver"), async (req, res, next) => {
    try {
      const { procesoId, limit, offset } = req.query;
      if (!procesoId || typeof procesoId !== "string") {
        return res.status(400).json({ error: "procesoId is required" });
      }
      const limitNum = limit ? parseInt(limit as string, 10) : 10;
      const offsetNum = offset ? parseInt(offset as string, 10) : 0;
      const actualizaciones = await storage.getActualizaciones(procesoId, limitNum, offsetNum);
      res.json(actualizaciones);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/actualizaciones", authenticate, requirePermission("actualizaciones.crear"), async (req, res, next) => {
    try {
      // TODO: validate body with zod
      const newActualizacion = await storage.createActualizacion(req.body);
      res.status(201).json(newActualizacion);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/actualizaciones/:id", authenticate, requirePermission("actualizaciones.eliminar"), async (req, res, next) => {
    try {
      const { id } = req.params;
      await storage.deleteActualizacion(id.toString());
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // --- Rutas protegidas de Documentos ---
  app.get("/api/documentos", authenticate, requirePermission("documentos.ver"), async (req, res, next) => {
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

  app.get("/api/documentos/:id", authenticate, requirePermission("documentos.ver"), async (req, res, next) => {
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

  // Download document - serves the actual file from S3
  app.get("/api/documentos/:id/download", async (req, res, next) => {
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
      const { storage } = await import("./storage.js");
      const userPermissions = await storage.getPermisosByUsuario(payload.id, payload.type);
      if (!userPermissions.includes("documentos.ver")) {
        return res.status(403).json({ error: "No tiene permiso para descargar documentos" });
      }

      const { id } = req.params;
      const documento = await storage.getDocumento(id.toString());
      if (!documento) {
        return res.status(404).json({ error: "Documento no encontrado" });
      }
      
      // Get the file URI (S3 key or local path)
      const fileUri = documento.uri;
      
      // Check if it's an S3 key (contains '/' and doesn't start with '/')
      if (fileUri && fileUri.includes("/") && !fileUri.startsWith("/") && !fileUri.includes(":\\")) {
        // It's an S3 key - generate presigned URL with 5 minute expiration
        console.log("Downloading from S3:", fileUri);
        const { getPresignedDownloadUrl } = await import("./s3-storage.js");
        const presignedUrl = await getPresignedDownloadUrl(fileUri, documento.nombre, 300); // 5 minutes, force download
        return res.redirect(presignedUrl);
      }
      
      // Fallback: check if file exists on server (local storage)
      const fs = await import("fs");
      if (fileUri && fs.existsSync(fileUri)) {
        // Server file - send as download
        console.log("Downloading server file:", fileUri);
        res.setHeader("Content-Disposition", `attachment; filename="${documento.nombre}"`);
        res.setHeader("Content-Type", documento.tipo || "application/octet-stream");
        const fileBuffer = fs.readFileSync(fileUri);
        return res.send(fileBuffer);
      }
      
      // If file doesn't exist, return error
      return res.status(404).json({ error: "Archivo no encontrado" });
    } catch (err) {
      console.error("Download error:", err);
      next(err);
    }
  });

  // Static file serving for uploads folder
  app.get("/uploads/:filename", async (req, res, next) => {
    try {
      const { filename } = req.params;
      const path = await import("path");
      const filePath = path.join(process.cwd(), "uploads", filename);
      
      const fs = await import("fs");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }
      
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  });

app.post(
  "/api/documentos",
  authenticate,
  requirePermission("documentos.subir"),
  upload.single("file"), // ← middleware multer aquí
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file; // archivo subido
      const { procesoId, nombre, tipo, tamano, descripcion } = req.body;

      if (!file && !nombre) {
        return res.status(400).json({ error: "No se proporcionó archivo" });
      }

      let uri = "";


      // Si hay archivo, subirlo a S3
      if (file) {
        
        // Obtener información del proceso
        const proceso = await storage.getProceso(procesoId);
        if (!proceso) return res.status(404).json({ error: "Proceso no encontrado" });

        // Obtener información del cliente
        const cliente = await storage.getCliente(proceso.clienteId);
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

        const bufeteId = cliente.abogadoId;
        const clienteId = cliente.id;

        // Importar función de S3 dinámicamente
        const { uploadDocumentToS3 } = await import("./s3-storage.js");

        // Subir archivo a S3
        const s3Key = await uploadDocumentToS3(
          file.buffer,
          bufeteId,
          clienteId,
          procesoId,
          nombre || file.originalname,
          file.mimetype
        );

        uri = s3Key;
      }

      // Preparar datos para guardar en DB
      const docData = {
        procesoId,
        nombre: nombre || file?.originalname || "Documento sin nombre",
        uri,
        tipo: file?.mimetype || tipo,
        tamano: file?.size || tamano,
        descripcion: descripcion || null,
      };

      // Guardar documento en la base de datos
      const newDocumento = await storage.createDocumento(docData as any);

      res.status(201).json(newDocumento);
    } catch (err) {
      console.error("Error uploading document:", err);
      next(err);
    }
  }
);

  app.delete("/api/documentos/:id", authenticate, requirePermission("documentos.eliminar"), async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Get the document first to check if it's an S3 key
      const documento = await storage.getDocumento(id.toString());
      if (documento && documento.uri && documento.uri.includes("/") && !documento.uri.startsWith("/") && !documento.uri.includes(":\\\\")) {
        // It's an S3 key - delete from S3
        const { deleteDocumentFromS3 } = await import("./s3-storage.js");
        await deleteDocumentFromS3(documento.uri);
      }
      
      await storage.deleteDocumento(id.toString());
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting document:", err);
      next(err);
    }
  });

  app.get("/api/estado", authenticate, async (req, res, next) => {
    try {
      const estados = await storage.getEstadosProceso();
      res.json(estados);
    } catch (err) {
      next(err);
    }
  });

  // Rutas de autenticación
  app.get("/api/auth/verify", async (req, res, next) => {
    try {
      const token = extractToken(req);
      
      if (!token) {
        return res.status(401).json({ error: "No se proporcionó token", authenticated: false });
      }
      const payload = verifyToken(token);
      
      if (!payload) {
        return res.status(401).json({ error: "Token inválido o expirado", authenticated: false });
      }
      
      // Obtener usuario actual
      let user;
      if (payload.type === "abogado") {
        user = await storage.getAbogado(payload.id);
      } else {
        user = await storage.getCliente(payload.id);
      }
      
      if (!user || !user.activo) {
        return res.status(401).json({ error: "Usuario no encontrado o inactivo", authenticated: false });
      }
      
      // Obtener permisos del usuario
      const permisos = await storage.getPermisosByUsuario(payload.id, payload.type);
      
      res.json({ authenticated: true, user, type: payload.type, permisos });
    } catch (err) {
      next(err);
    }
  });

  // Rutas de permisos
  app.get("/api/permisos", authenticate, async (req, res, next) => {
    try {
      const user = (req as any).user;
      const permisos = await storage.getPermisosByUsuario(user.id, user.type);
      res.json({ permisos });
    } catch (err) {
      next(err);
    }
  });

  // Rutas de gestión de roles (solo admin)
  app.get("/api/roles", authenticate, requirePermission("configuracion.ver"), async (req, res, next) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (err) {
      next(err);
    }
  });

  // Obtener todos los permisos disponibles
  app.get("/api/permisos/all", authenticate, requirePermission("configuracion.ver"), async (req, res, next) => {
    try {
      const permisos = await storage.getPermisos();
      res.json(permisos);
    } catch (err) {
      next(err);
    }
  });

  // Obtener todos los planes
  app.get("/api/planes", authenticate, requirePermission("configuracion.ver"), async (req, res, next) => {
    try {
      const planes = await storage.getPlanes();
      res.json(planes);
    } catch (err) {
      next(err);
    }
  });

  // Obtener todos los módulos
  app.get("/api/modulos", authenticate, requirePermission("configuracion.ver"), async (req, res, next) => {
    try {
      const modulos = await storage.getModulos();
      res.json(modulos);
    } catch (err) {
      next(err);
    }
  });

  // CRUD de Tipos de Proceso
  app.get("/api/tipos-proceso", authenticate, requirePermission("procesos.ver"), async (req, res, next) => {
    try {
      const tipos = await storage.getTiposProceso();
      res.json(tipos);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/tipos-proceso", authenticate, requirePermission("procesos.crear"), async (req, res, next) => {
    try {
      const { nombre, descripcion } = req.body;
      if (!nombre) {
        return res.status(400).json({ error: "El nombre es requerido" });
      }
      const nuevo = await storage.createTipoProceso({ nombre, descripcion });
      res.json(nuevo);
    } catch (err) {
      next(err);
    }
  });

  app.put("/api/tipos-proceso/:id", authenticate, requirePermission("procesos.editar"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id.toString());
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }
      const { nombre, descripcion, activo } = req.body;
      const actualizado = await storage.updateTipoProceso(id, { nombre, descripcion, activo });
      if (!actualizado) {
        return res.status(404).json({ error: "Tipo de proceso no encontrado" });
      }
      res.json(actualizado);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/tipos-proceso/:id", authenticate, requirePermission("procesos.eliminar"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id.toString());
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }
      await storage.deleteTipoProceso(id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // Obtener todos los abogados (para admin)
  app.get("/api/abogados", authenticate, requirePermission("usuarios.ver"), async (req, res, next) => {
    try {
      const abogados = await storage.getAllAbogados();
      res.json(abogados);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/roles/:id", authenticate, requirePermission("configuracion.ver"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id.toString());
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }
      const rol = await storage.getRol(id);
      if (!rol) {
        return res.status(404).json({ error: "Rol no encontrado" });
      }
      const permisos = await storage.getPermisosByRol(id);
      res.json({ rol, permisos });
    } catch (err) {
      next(err);
    }
  });

  app.put("/api/roles/:id/permisos", authenticate, requirePermission("configuracion.editar"), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id.toString());
      const { permisoIds } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }
      
      if (!Array.isArray(permisoIds)) {
        return res.status(400).json({ error: "permisoIds debe ser un array" });
      }
      
      // Eliminar permisos actuales del rol
      const db = (storage as any).db;
      await db.delete(rolesPermisos).where(eq(rolesPermisos.rolId, id));
      
      // Agregar nuevos permisos
      for (const permisoId of permisoIds) {
        await db.insert(rolesPermisos).values({ rolId: id, permisoId });
      }
      
      const rol = await storage.getRol(id);
      const permisos = await storage.getPermisosByRol(id);
      res.json({ rol, permisos });
    } catch (err: any) {
      console.error("Error updating role permissions:", err);
      res.status(500).json({ error: err.message || "Error al actualizar permisos" });
    }
  });

  // Asignar rol a abogado
  app.put("/api/abogados/:id/rol", authenticate, requirePermission("configuracion.editar"), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { rolId } = req.body;
      
      const updated = await storage.updateAbogado(id.toString(), { rolId: rolId || null });
      if (!updated) {
        return res.status(404).json({ error: "Abogado no encontrado" });
      }
      
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Crear nuevo rol
  app.post("/api/roles", authenticate, requirePermission("configuracion.editar"), async (req, res, next) => {
    try {
      const rolData = req.body;
      const parsed = insertRolSchema.parse(rolData);
      
      // Check if role name already exists
      const existing = await storage.getRolByNombre(parsed.nombre);
      if (existing) {
        return res.status(400).json({ error: "Ya existe un rol con este nombre" });
      }
      
      const created = await storage.createRol(parsed);
      res.status(201).json(created);
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ error: "Datos inválidos", details: err.errors });
      }
      next(err);
    }
  });

  // Eliminar rol
  app.delete("/api/roles/:id", authenticate, requirePermission("configuracion.editar"), async (req, res, next) => {
    try {
      const { id } = req.params;
      const rolId = parseInt(Array.isArray(id) ? id[0] : id);
      
      if (isNaN(rolId)) {
        return res.status(400).json({ error: "ID de rol inválido" });
      }
      
      await storage.deleteRol(rolId);
      res.json({ message: "Rol eliminado correctamente" });
    } catch (err) {
      next(err);
    }
  });

  // Habilitar/deshabilitar cuenta de abogado
  app.put("/api/abogados/:id/estado", authenticate, requirePermission("usuarios.editar"), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { activo } = req.body;
      
      if (typeof activo !== "boolean") {
        return res.status(400).json({ error: "El campo 'activo' debe ser un booleano" });
      }
      
      const updated = await storage.updateAbogado(id.toString(), { activo });
      if (!updated) {
        return res.status(404).json({ error: "Abogado no encontrado" });
      }
      
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Cambiar plan de abogado
  app.put("/api/abogados/:id/plan", authenticate, requirePermission("configuracion.editar"), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { planId } = req.body;
      
      if (!planId) {
        return res.status(400).json({ error: "Se requiere el ID del plan" });
      }
      
      const updated = await storage.updateAbogado(id.toString(), { planId });
      if (!updated) {
        return res.status(404).json({ error: "Abogado no encontrado" });
      }
      
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  
  // Dashboard stats - returns counts and recent processes
  app.get("/api/dashboard", authenticate, requirePermission("dashboard.ver"), async (req, res, next) => {
    try {
      const user = (req as any).user;
      const abogadoId = user.id;
      
      // Get counts
      const totalClientes = await storage.getClientesCount(abogadoId);
      const totalProcesos = await storage.getProcesosCount(abogadoId);
      const procesosActivos = await storage.getProcesosCount(abogadoId, { estadoCodigo: "activo" });
      const procesosEnTramite = await storage.getProcesosCount(abogadoId, { estadoCodigo: "en_tramite" });
      const procesosFinalizados = await storage.getProcesosCount(abogadoId, { estadoCodigo: "finalizado" });
      
      // Get recent processes (last 5) - get all and take last 5
      const allProcesos = await storage.getProcesos(abogadoId, 1000, 0, undefined);
      const procesosRecientes = allProcesos.data
        .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          clienteId: p.clienteId,
          tipoProceso: p.tipoProceso,
          radicado: p.radicado,
          estado: p.estado?.nombre || "Sin estado",
          estadoColor: p.estado?.color || "#999",
          fechaCreacion: p.fechaCreacion,
        }));
      
      res.json({
        totalClientes,
        totalProcesos,
        procesosActivos: procesosActivos + procesosEnTramite,
        procesosFinalizados,
        procesosRecientes,
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/logout", async (req, res, next) => {
    try {
      // Eliminar la cookie HttpOnly
      const isProduction = process.env.NODE_ENV === "production";
      res.clearCookie(AUTH_COOKIE_NAME, clearCookieOptions(isProduction));
      res.json({ message: "Sesión cerrada correctamente" });
    } catch (err) {
      next(err);
    }
  });

  // ============ NOTIFICACIONES ============

  // Get notificaciones for a cliente (client portal)
  app.get("/api/notificaciones/cliente/:clienteId", authenticateCliente, async (req, res, next) => {
    try {
      const { clienteId } = req.params;
      const clienteIdStr = Array.isArray(clienteId) ? clienteId[0] : clienteId;
      const notificaciones = await storage.getNotificacionesByClienteId(clienteIdStr);
      res.json(notificaciones);
    } catch (err) {
      next(err);
    }
  });

  // Get unread count for cliente
  app.get("/api/notificaciones/cliente/:clienteId/count", authenticateCliente, async (req, res, next) => {
    try {
      const { clienteId } = req.params;
      const clienteIdStr = Array.isArray(clienteId) ? clienteId[0] : clienteId;
      const count = await storage.getNotificacionesCountByClienteId(clienteIdStr);
      res.json({ count });
    } catch (err) {
      next(err);
    }
  });

  // Mark notificacion as read for cliente
  app.put("/api/notificaciones/:id/leer-cliente", authenticateCliente, async (req, res, next) => {
    try {
      const { id } = req.params;
      const notificacionId = parseInt(Array.isArray(id) ? id[0] : id);
      
      if (isNaN(notificacionId)) {
        return res.status(400).json({ error: "ID de notificación inválido" });
      }
      
      await storage.markNotificacionLeidaCliente(notificacionId);
      res.json({ message: "Notificación marcada como leída" });
    } catch (err) {
      next(err);
    }
  });

  // Get notificaciones for an abogado (lawyer)
  app.get("/api/notificaciones/abogado/:abogadoId", authenticate, requirePermission("notificaciones.ver"), async (req, res, next) => {
    try {
      const { abogadoId } = req.params;
      const abogadoIdStr = Array.isArray(abogadoId) ? abogadoId[0] : abogadoId;
      const notificaciones = await storage.getNotificacionesByAbogadoId(abogadoIdStr);
      res.json(notificaciones);
    } catch (err) {
      next(err);
    }
  });

  // Get unread count for abogado
  app.get("/api/notificaciones/abogado/:abogadoId/count", authenticate, requirePermission("notificaciones.ver"), async (req, res, next) => {
    try {
      const { abogadoId } = req.params;
      const abogadoIdStr = Array.isArray(abogadoId) ? abogadoId[0] : abogadoId;
      const count = await storage.getNotificacionesCountByAbogadoId(abogadoIdStr);
      res.json({ count });
    } catch (err) {
      next(err);
    }
  });

  // Mark notificacion as read for abogado
  app.put("/api/notificaciones/:id/leer-abogado", authenticate, requirePermission("notificaciones.ver"), async (req, res, next) => {
    try {
      const { id } = req.params;
      const notificacionId = parseInt(Array.isArray(id) ? id[0] : id);
      
      if (isNaN(notificacionId)) {
        return res.status(400).json({ error: "ID de notificación inválido" });
      }
      
      await storage.markNotificacionLeidaAbogado(notificacionId);
      res.json({ message: "Notificación marcada como leída" });
    } catch (err) {
      next(err);
    }
  });

  // Create notification
  app.post("/api/notificaciones", authenticate, requirePermission("notificaciones.crear"), async (req, res, next) => {
    try {
      const notificacionData = req.body;
      
      // Validate required fields
      if (!notificacionData.procesoId || !notificacionData.clienteId || !notificacionData.abogadoId || !notificacionData.titulo || !notificacionData.mensaje) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
      }
      
      const created = await storage.createNotificacion(notificacionData);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
