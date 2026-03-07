import { profile } from 'node:console';
import { User } from './../../shared/model.schema';
import { lawyerClients } from './../../shared/schema/lawyer-clients.schema';
import { users } from './../../shared/schema/user.schema';
import { getClientes, deleteCliente } from '@/lib/services/clienteService.js';
/**
 * Client (Clientes) Routes
 * 
 * CRUD operations for clients (clientes).
 * Maintains backward compatibility with the original monolithic routes.
 */

import { Router, type Request, type Response, type NextFunction } from "express";

import { hashPassword, authenticate, requirePermission, extractToken, verifyToken } from "../auth.js";

import { storage } from '../storage/storeage/database-storage.js';
import { clientesService } from '../services';

const router = Router();

// GET /api/clientes - Get clients for a lawyer (with lawyer_clients)
router.get("/clientes", authenticate, requirePermission("clientes.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = req.query;
    
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        error: "No se proporcionó token",
        authenticated: false,
      });
    }
    
    const idProfile = verifyToken(token)?.idProfile;
    
    if (!idProfile || typeof idProfile !== "string") {
      return res.status(400).json({ error: "abogadoId is required" });
    }
    const limitNum = limit ? parseInt(limit as string, 10) : 10;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;

    const clientes = await clientesService.getClientes(idProfile, limitNum, offsetNum);
    res.json(clientes);
  } catch (err) {
    next(err);
  }
});




// GET /api/clientes/:id - Get single client
router.get("/clientes/:id", authenticate, requirePermission("clientes.ver"), async (req: Request, res: Response, next: NextFunction) => {
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

// POST /api/clientes - Create new client
router.post("/clientes", authenticate, requirePermission("clientes.crear"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { password, tipoDocumentoId, departamentoId, municipioId, ...rest } = req.body;
    const hashedPassword = password ? await hashPassword(password) : "";
    
    // Get lawyer ID from the logged-in user
    const lawyerId = user.id;
    
    // Create the cliente through the service (which handles lawyer_clients relationship)
    const newCliente = await clientesService.createCliente(
      {
        ...rest,
        tipoDocumentoId: tipoDocumentoId || 1,
        departamentoId: departamentoId || null,
        municipioId: municipioId || null,
        activo: true,
        fechaCreacion: new Date(),
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
      },
      password,
      user.email || `${rest.documento}@temp.com`, // Use existing email or create temp
      lawyerId
    );
    
    res.status(201).json(newCliente);
  } catch (err) {
    next(err);
  }
});





// GET /api/cliente/me - Get current client's own data (client portal)
router.get("/cliente/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
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

router.post("/register/cliente", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      nombre,
      apellido,
      telefono,
      correo,
      documento,
      tipoDocumentoId,
      direccion,
      password,
      abogadoId,
      departamentoId,
      municipioId,
    } = req.body;

    if (!correo || !password) {
      return res.status(400).json({
        message: "Correo y password son obligatorios",
      });
    }

    const cliente = await clientesService.createCliente(
      {
        nombre,
        apellido,
        telefono,
        documento,
        tipoDocumentoId,
        direccion,
        departamentoId: departamentoId || null,
        municipioId: municipioId || null,
        activo: true,
        fechaCreacion: new Date(),
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
      },
      password,
      correo,
      abogadoId
    );

    return res.status(201).json({
      message: "Cliente creado exitosamente",
      data: cliente,
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/register/client - Register a new client from lawyer dashboard
router.post("/register/client", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const {
      nombre,
      apellido,
      telefono,
      correo,
      documento,
      tipoDocumentoId,
      direccion,
      password,
      departamentoId,
      municipioId,
    } = req.body;

    if (!correo || !password) {
      return res.status(400).json({
        message: "Correo y password son obligatorios",
      });
    }

    // Get lawyerId from the authenticated user
    const lawyerId = user.id;

    const cliente = await clientesService.createCliente(
      {
        nombre,
        apellido,
        telefono,
        documento,
        tipoDocumentoId: tipoDocumentoId || 1,
        direccion,
        departamentoId: departamentoId || null,
        municipioId: municipioId || null,
        activo: true,
        fechaCreacion: new Date(),
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
      },
      password,
      correo,
      lawyerId
    );

    return res.status(201).json({
      message: "Cliente registrado exitosamente",
      data: cliente,
    });

  } catch (error) {
    next(error);
  }
});


export default router;
