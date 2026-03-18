/**
 * Client (Clientes) Routes
 * Supports both natural persons and companies
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { authenticate, requirePermission } from "../auth.js";
import { storage } from '../storage/storeage/database-storage.js';
import { clientesService } from '../services';
import { validate } from "../middleware/validation.js";

const registerClienteNaturalSchema = z.object({
  correo:          z.string().email("Correo inválido"),
  password:        z.string().min(6, "Contraseña mínimo 6 caracteres"),
  nombre:          z.string().min(1, "El nombre es requerido"),
  apellido:        z.string().min(1, "El apellido es requerido"),
  documento:       z.string().min(1, "El documento es requerido"),
  tipoDocumentoId: z.number().int().positive().optional(),
  telefono:        z.string().optional(),
  direccion:       z.string().optional(),
  departamentoId:  z.string().optional(),
  municipioId:     z.string().optional(),
  abogadoId:       z.string().uuid().optional(),
});

const registerEmpresaSchema = z.object({
  correo:          z.string().email("Correo inválido"),
  password:        z.string().min(6, "Contraseña mínimo 6 caracteres"),
  razonSocial:     z.string().min(1, "La razón social es requerida"),
  nit:             z.string().min(1, "El NIT es requerido"),
  sector:          z.string().optional(),
  abogadoId:       z.string().uuid().optional(),
  // representante legal
  repNombre:          z.string().optional(),
  repApellido:        z.string().optional(),
  repDocumento:       z.string().optional(),
  repTipoDocumentoId: z.number().int().positive().optional(),
  repCargo:           z.string().optional(),
  repEmail:           z.string().email().optional().or(z.literal("")),
  repTelefono:        z.string().optional(),
});

const router = Router();

// ----------------------------------------------------------------
// GET /api/clientes — list for lawyer or firm
// ----------------------------------------------------------------
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

    const result = user?.rol?.nombre === "bufete"
      ? await clientesService.getClientesByFirm(idProfile, limitNum, offsetNum, filter)
      : await clientesService.getClientes(idProfile, limitNum, offsetNum, filter);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// GET /api/clientes/:id
// ----------------------------------------------------------------
router.get("/clientes/:id", authenticate, requirePermission("clientes.ver"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cliente = await clientesService.getCliente(req.params.id as string);
    if (!cliente) return res.status(404).json({ error: "Cliente not found" });
    res.json(cliente);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// POST /api/clientes — create from lawyer/firm dashboard
// ----------------------------------------------------------------
router.post("/clientes", authenticate, requirePermission("clientes.crear"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const {
      password, correo, tipo = "natural",
      repNombre, repApellido, repDocumento, repTipoDocumentoId, repCargo, repEmail, repTelefono,
      repDireccion, repDepartamentoId, repMunicipioId,
      ...rest
    } = req.body;

    const lawyerId = user.idProfile;

    // For empresa: create representante legal if data was provided
    let representanteLegalId: string | undefined;
    if (tipo === "empresa" && repNombre && repDocumento) {
      const persona = await storage.personas.createPersona({
        nombre: repNombre,
        apellido: repApellido || "",
        telefono: repTelefono || "",
        documento: repDocumento,
        tipoDocumentoId: repTipoDocumentoId || 1,
        direccion: repDireccion || null,
        departamentoId: repDepartamentoId || null,
        municipioId: repMunicipioId || null,
      });
      const rep = await storage.representantesLegales.createRepresentante({
        personaId: persona.id,
        cargo: repCargo || "Representante Legal",
        email: repEmail || correo || "",
      });
      representanteLegalId = rep.id;
    }

    const newCliente = await clientesService.createCliente(
      {
        tipo,
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        activo: true,
        fechaCreacion: new Date(),
        ...rest,
        ...(tipo === "empresa" && representanteLegalId ? { representanteLegalId } : {}),
      },
      password,
      correo ?? `${rest.documento ?? rest.nit}@temp.com`,
      lawyerId
    );

    res.status(201).json(newCliente);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// GET /api/cliente/me — portal: current client's own data
// ----------------------------------------------------------------
router.get("/cliente/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const cliente = await storage.clientes.getClienteByUser(user.id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

    // Attach representante legal with persona for empresa clients
    if (cliente.tipo === "empresa" && cliente.empresa?.representanteLegalId) {
      const rep = await storage.representantesLegales.getRepresentante(cliente.empresa.representanteLegalId);
      const clienteConRep = {
        ...cliente,
        empresa: { ...cliente.empresa, representanteLegal: rep ?? null },
      };
      return res.json(clienteConRep);
    }

    res.json(cliente);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// PUT /api/cliente/me — portal: update own profile (natural & empresa)
// ----------------------------------------------------------------
router.put("/cliente/me", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hashPassword } = await import("../auth.js");
    const authUser = (req as any).user;
    const cliente = await storage.clientes.getClienteByUser(authUser.id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

    const { correo, password, currentPassword, repNombre, repApellido, repTelefono, repDocumento, repTipoDocumentoId, repCargo, repEmail, repDireccion, repDepartamentoId, repMunicipioId, ...rest } = req.body;

    // Update user email / password if provided
    if (correo || password) {
      const userUpdates: any = {};
      if (correo) userUpdates.email = correo;
      if (password) {
        if (!currentPassword) {
          return res.status(400).json({ error: "Debes ingresar tu contraseña actual para cambiarla." });
        }
        const { verifyPassword } = await import("../auth.js");
        const user = await storage.getUserById(authUser.id);
        const valid = await verifyPassword(currentPassword, user?.passwordHash || "");
        if (!valid) {
          return res.status(401).json({ error: "La contraseña actual es incorrecta." });
        }
        userUpdates.passwordHash = await hashPassword(password);
      }
      await storage.users.updateUser(authUser.id, userUpdates);
    }

    // Update or create representante legal for empresa clients
    if (cliente.tipo === "empresa") {
      if (cliente.empresa?.representanteLegalId) {
        // Update existing representante
        const repId = cliente.empresa.representanteLegalId;
        const repUpdates: any = {};
        if (repCargo !== undefined) repUpdates.cargo = repCargo;
        if (repEmail !== undefined) repUpdates.email = repEmail;
        if (Object.keys(repUpdates).length > 0) {
          await storage.representantesLegales.updateRepresentante(repId, repUpdates);
        }
        const rep = await storage.representantesLegales.getRepresentante(repId);
        if (rep?.personaId) {
          const personaUpdates: any = {};
          if (repNombre !== undefined) personaUpdates.nombre = repNombre;
          if (repApellido !== undefined) personaUpdates.apellido = repApellido;
          if (repTelefono !== undefined) personaUpdates.telefono = repTelefono;
          if (repDocumento !== undefined) personaUpdates.documento = repDocumento;
          if (repTipoDocumentoId !== undefined) personaUpdates.tipoDocumentoId = repTipoDocumentoId;
          if (repDireccion !== undefined) personaUpdates.direccion = repDireccion;
          if (repDepartamentoId !== undefined) personaUpdates.departamentoId = repDepartamentoId;
          if (repMunicipioId !== undefined) personaUpdates.municipioId = repMunicipioId;
          if (Object.keys(personaUpdates).length > 0) {
            await storage.personas.updatePersona(rep.personaId, personaUpdates);
          }
        }
      } else if (repNombre && repDocumento) {
        // Create new representante legal
        const persona = await storage.personas.createPersona({
          nombre: repNombre,
          apellido: repApellido || "",
          telefono: repTelefono || "",
          documento: repDocumento,
          tipoDocumentoId: repTipoDocumentoId || 1,
          direccion: repDireccion || null,
          departamentoId: repDepartamentoId || null,
          municipioId: repMunicipioId || null,
        });
        const rep = await storage.representantesLegales.createRepresentante({
          personaId: persona.id,
          cargo: repCargo || "Representante Legal",
          email: repEmail || correo || "",
        });
        rest.representanteLegalId = rep.id;
      }
    }

    const updated = await storage.clientes.updateCliente(cliente.id, rest);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// PUT /api/clientes/:id — update from lawyer/firm dashboard
// ----------------------------------------------------------------
router.put("/clientes/:id", authenticate, requirePermission("clientes.editar"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const {
      correo, password,
      repNombre, repApellido, repDocumento, repTipoDocumentoId, repCargo, repEmail, repTelefono,
      repDireccion, repDepartamentoId, repMunicipioId,
      ...rest
    } = req.body;

    const cliente = await storage.clientes.getCliente(id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

    // Update user email/password if provided
    if (correo || password) {
      const { hashPassword } = await import("../auth.js");
      const userUpdates: any = {};
      if (correo) userUpdates.email = correo;
      if (password) userUpdates.passwordHash = await hashPassword(password);
      await storage.users.updateUser(cliente.userId!, userUpdates);
    }

    // Handle representante legal for empresa clients
    if (cliente.tipo === "empresa") {
      if (cliente.empresa?.representanteLegalId) {
        const repId = cliente.empresa.representanteLegalId;
        const repUpdates: any = {};
        if (repCargo !== undefined) repUpdates.cargo = repCargo;
        if (repEmail !== undefined) repUpdates.email = repEmail;
        if (Object.keys(repUpdates).length > 0) {
          await storage.representantesLegales.updateRepresentante(repId, repUpdates);
        }
        const rep = await storage.representantesLegales.getRepresentante(repId);
        if (rep?.personaId) {
          const personaUpdates: any = {};
          if (repNombre !== undefined) personaUpdates.nombre = repNombre;
          if (repApellido !== undefined) personaUpdates.apellido = repApellido;
          if (repTelefono !== undefined) personaUpdates.telefono = repTelefono;
          if (repDocumento !== undefined) personaUpdates.documento = repDocumento;
          if (repTipoDocumentoId !== undefined) personaUpdates.tipoDocumentoId = repTipoDocumentoId;
          if (repDireccion !== undefined) personaUpdates.direccion = repDireccion;
          if (repDepartamentoId !== undefined) personaUpdates.departamentoId = repDepartamentoId;
          if (repMunicipioId !== undefined) personaUpdates.municipioId = repMunicipioId;
          if (Object.keys(personaUpdates).length > 0) {
            await storage.personas.updatePersona(rep.personaId, personaUpdates);
          }
        }
      } else if (repNombre && repDocumento) {
        const persona = await storage.personas.createPersona({
          nombre: repNombre,
          apellido: repApellido || "",
          telefono: repTelefono || "",
          documento: repDocumento,
          tipoDocumentoId: repTipoDocumentoId || 1,
          direccion: repDireccion || null,
          departamentoId: repDepartamentoId || null,
          municipioId: repMunicipioId || null,
        });
        const rep = await storage.representantesLegales.createRepresentante({
          personaId: persona.id,
          cargo: repCargo || "Representante Legal",
          email: repEmail || correo || "",
        });
        rest.representanteLegalId = rep.id;
      }
    }

    const updated = await storage.clientes.updateCliente(id, rest);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// POST /api/register/cliente — self-registration: natural person
// ----------------------------------------------------------------
router.post("/register/cliente", validate(registerClienteNaturalSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      nombre, apellido, telefono, correo, documento,
      tipoDocumentoId, direccion, password, abogadoId,
      departamentoId, municipioId,
    } = req.body;

    const existing = await storage.getUserByEmail(correo);
    if (existing) return res.status(400).json({ message: "El correo ya está registrado" });

    const cliente = await clientesService.createCliente(
      {
        tipo: "natural",
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        activo: true,
        fechaCreacion: new Date(),
        nombre, apellido, telefono: telefono || "", documento,
        tipoDocumentoId: tipoDocumentoId || 1,
        direccion: direccion || null,
        departamentoId: departamentoId || null,
        municipioId: municipioId || null,
      },
      password,
      correo,
      abogadoId
    );

    res.status(201).json({ message: "Cliente creado exitosamente", data: cliente });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------
// POST /api/register/empresa — self-registration: company
// ----------------------------------------------------------------
router.post("/register/empresa", validate(registerEmpresaSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      razonSocial, nit, sector, correo, password, abogadoId,
      // representante legal
      repNombre, repApellido, repDocumento, repTipoDocumentoId,
      repCargo, repEmail, repTelefono,
    } = req.body;

    const existing = await storage.getUserByEmail(correo);
    if (existing) return res.status(400).json({ message: "El correo ya está registrado" });

    // Create representante legal first if provided
    let representanteLegalId: string | undefined;
    if (repNombre && repDocumento) {
      const persona = await storage.personas.createPersona({
        nombre: repNombre,
        apellido: repApellido,
        telefono: repTelefono || "",
        documento: repDocumento,
        tipoDocumentoId: repTipoDocumentoId || 1,
      });
      const rep = await storage.representantesLegales.createRepresentante({
        personaId: persona.id,
        cargo: repCargo || "Representante Legal",
        email: repEmail || correo,
      });
      representanteLegalId = rep.id;
    }

    const cliente = await clientesService.createCliente(
      {
        tipo: "empresa",
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        activo: true,
        fechaCreacion: new Date(),
        razonSocial,
        nit,
        sector: sector || null,
        representanteLegalId: representanteLegalId || null,
      },
      password,
      correo,
      abogadoId
    );

    res.status(201).json({ message: "Empresa registrada exitosamente", data: cliente });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------
// POST /api/register/client — authenticated: create from lawyer dashboard
// ----------------------------------------------------------------
router.post("/register/client", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { correo, password, tipo = "natural", ...rest } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ message: "Correo y password son obligatorios" });
    }

    const lawyerId = user.idProfile;

    const cliente = await clientesService.createCliente(
      {
        tipo,
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        activo: true,
        fechaCreacion: new Date(),
        tipoDocumentoId: rest.tipoDocumentoId || 1,
        departamentoId: rest.departamentoId || null,
        municipioId: rest.municipioId || null,
        ...rest,
      },
      password,
      correo,
      lawyerId
    );

    res.status(201).json({ message: "Cliente registrado exitosamente", data: cliente });
  } catch (error) {
    next(error);
  }
});

export default router;
