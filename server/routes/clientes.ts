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

import { hashPassword, authenticate, requirePermission } from "../auth.js";

import { storage } from '../storage/storeage/database-storage.js';
import { clientesService } from '../services';

const router = Router();

// GET /api/clientes - Get clients for a lawyer or firm
router.get("/clientes", authenticate, requirePermission("clientes.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { limit, offset, search } = req.query;

    const idProfile = user?.idProfile;
    if (!idProfile || typeof idProfile !== "string") {
      return res.status(400).json({ error: "Perfil de usuario no encontrado" });
    }

    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;
    const filter = { search: search as string | undefined };

    let result: any[];
    if (user?.rol?.nombre === "bufete") {
      result = await clientesService.getClientesByFirm(idProfile, limitNum, offsetNum, filter);
    } else {
      result = await clientesService.getClientes(idProfile, limitNum, offsetNum, filter);
    }

    res.json(result);
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

    
    // Get lawyer ID from the logged-in user
    const lawyerId = user.idProfile;
    
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
    const lawyerId = user.idProfile;

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
