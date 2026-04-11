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
import { registerRateLimiter } from "../middleware/rate-limit.js";
import { subscriptionService } from "../services/subscription.service.js";
import { sendEmailVerificationOtp } from "../services/email.service.js";

const registerClienteNaturalSchema = z.object({
  correo:          z.string().email("Correo inválido"),
  password:        z.string().min(8, "Contraseña mínimo 8 caracteres"),
  nombre:          z.string().min(1, "El nombre es requerido").max(100),
  apellido:        z.string().min(1, "El apellido es requerido").max(100),
  documento:       z.string().min(1, "El documento es requerido").max(50),
  tipoDocumentoId: z.number().int().positive().optional(),
  telefono:        z.string().max(30).optional(),
  direccion:       z.string().max(255).optional(),
  departamentoId:  z.string().optional(),
  municipioId:     z.string().optional(),
  abogadoId:       z.string().uuid().optional(),
});

const registerEmpresaSchema = z.object({
  correo:          z.string().email("Correo inválido"),
  password:        z.string().min(8, "Contraseña mínimo 8 caracteres"),
  razonSocial:     z.string().min(1, "La razón social es requerida").max(200),
  nit:             z.string().min(1, "El NIT es requerido").max(50),
  sector:          z.string().max(100).optional(),
  abogadoId:       z.string().uuid().optional(),
  // representante legal
  repNombre:          z.string().max(100).optional(),
  repApellido:        z.string().max(100).optional(),
  repDocumento:       z.string().max(50).optional(),
  repTipoDocumentoId: z.number().int().positive().optional(),
  repCargo:           z.string().max(100).optional(),
  repEmail:           z.string().email().optional().or(z.literal("")),
  repTelefono:        z.string().max(30).optional(),
});

const router = Router();

async function queueEmailVerification(email: string, userId: string): Promise<void> {
  const code = await storage.otps.createEmailVerificationOtp(userId);
  sendEmailVerificationOtp(email, code).catch((err) => {
    console.error("[email-verification] email send error:", err);
  });
}

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
    const user = (req as any).user;
    const clienteId = req.params.id as string;
    const rol = user?.rol?.nombre;
    const idProfile = user?.idProfile;

    // Ownership check: verify the requester has a relationship with this client
    if (rol === "abogado") {
      const relations = await storage.lawyerClients.getClientLawyers(clienteId);
      const hasAccess = relations.some((r: any) => r.lawyerId === idProfile);
      if (!hasAccess) return res.status(403).json({ error: "No tienes acceso a este cliente" });
    } else if (rol === "bufete") {
      const firmClientIds = await storage.firmClients.getActiveClientIdsByFirm(idProfile);
      if (!firmClientIds.includes(clienteId)) return res.status(403).json({ error: "No tienes acceso a este cliente" });
    } else if (rol === "cliente") {
      const propioCliente = await storage.clientes.getClienteByUser(user.id);
      if (!propioCliente || propioCliente.id !== clienteId) return res.status(403).json({ error: "No tienes acceso a este cliente" });
    }

    const cliente = await clientesService.getCliente(clienteId);
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

    const isFirm   = user?.rol?.nombre === "bufete";
    const lawyerId = isFirm ? undefined : user.idProfile;
    const firmId   = isFirm ? user.idProfile : undefined;

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

    // Verificar límite de clientes del plan
    const limitCheck = await subscriptionService.checkLimit(user.id, "clientes");
    if (!limitCheck.permitido) {
      return res.status(402).json({
        error:   "LIMIT_REACHED",
        tipo:    "clientes",
        actual:  limitCheck.actual,
        maximo:  limitCheck.maximo,
        mensaje: "Has alcanzado el límite de clientes de tu plan. Actualiza para continuar.",
      });
    }

    const newCliente = await clientesService.createCliente(
      {
        ...rest,
        // Security: hardcoded fields must come AFTER ...rest so they cannot be overridden
        tipo,
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        activo: true,
        fechaCreacion: new Date(),
        ...(tipo === "empresa" && representanteLegalId ? { representanteLegalId } : {}),
      },
      password,
      correo ?? `${rest.documento ?? rest.nit}@temp.com`,
      lawyerId,
      firmId,
      {
        rolNombre: user?.rol?.nombre,
        actorId:   user?.idProfile,
        esPrivadoSolicitado: req.body.esPrivado === true,
        userId:    user?.id,
      }
    );

    await subscriptionService.incrementUsage(user.id, "clientes");
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
      let passwordChanged = false;
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
        passwordChanged = true;
      }
      await storage.users.updateUser(authUser.id, userUpdates);
      if (passwordChanged) {
        await storage.sessions.revokeAllForUser(authUser.id);
      }
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
    const user = (req as any).user;
    const id = req.params.id as string;
    const {
      correo, password,
      repNombre, repApellido, repDocumento, repTipoDocumentoId, repCargo, repEmail, repTelefono,
      repDireccion, repDepartamentoId, repMunicipioId,
      // Campos permitidos explícitamente (evita mass assignment)
      nombre, apellido, telefono, direccion, departamentoId, municipioId, documento, tipoDocumentoId,
      razonSocial, nit, sector,
    } = req.body;

    // Objeto de actualización con solo campos permitidos
    const allowedUpdates: Record<string, unknown> = {};
    if (nombre !== undefined)          allowedUpdates.nombre = nombre;
    if (apellido !== undefined)        allowedUpdates.apellido = apellido;
    if (telefono !== undefined)        allowedUpdates.telefono = telefono;
    if (direccion !== undefined)       allowedUpdates.direccion = direccion;
    if (departamentoId !== undefined)  allowedUpdates.departamentoId = departamentoId;
    if (municipioId !== undefined)     allowedUpdates.municipioId = municipioId;
    if (documento !== undefined)       allowedUpdates.documento = documento;
    if (tipoDocumentoId !== undefined) allowedUpdates.tipoDocumentoId = tipoDocumentoId;
    if (razonSocial !== undefined)     allowedUpdates.razonSocial = razonSocial;
    if (nit !== undefined)             allowedUpdates.nit = nit;
    if (sector !== undefined)          allowedUpdates.sector = sector;

    const cliente = await storage.clientes.getCliente(id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

    // ── Verificar ownership ──────────────────────────────────────────────────
    const idProfile = user?.idProfile;
    const rol = user?.rol?.nombre;
    if (rol === "abogado") {
      const relations = await storage.lawyerClients.getClientLawyers(id);
      const hasAccess = relations.some((r: any) => r.lawyerId === idProfile);
      if (!hasAccess) return res.status(403).json({ error: "No tienes acceso a este cliente" });
    } else if (rol === "bufete") {
      const firmClientIds = await storage.firmClients.getActiveClientIdsByFirm(idProfile);
      if (!firmClientIds.includes(id)) return res.status(403).json({ error: "No tienes acceso a este cliente" });
    }

    // Update user email/password if provided
    if (correo || password) {
      const { hashPassword } = await import("../auth.js");
      const userUpdates: any = {};
      let passwordChanged = false;
      if (correo) userUpdates.email = correo;
      if (password) {
        userUpdates.passwordHash = await hashPassword(password);
        passwordChanged = true;
      }
      await storage.users.updateUser(cliente.userId!, userUpdates);
      if (passwordChanged) {
        await storage.sessions.revokeAllForUser(cliente.userId!);
      }
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
        allowedUpdates.representanteLegalId = rep.id;
      }
    }

    const updated = await storage.clientes.updateCliente(id, allowedUpdates);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------
// POST /api/register/cliente — self-registration: natural person
// ----------------------------------------------------------------
router.post("/register/cliente", registerRateLimiter, validate(registerClienteNaturalSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      nombre, apellido, telefono, correo, documento,
      tipoDocumentoId, direccion, password, abogadoId,
      departamentoId, municipioId,
    } = req.body;

    const existing = await storage.getUserByEmail(correo);
    if (existing) return res.status(400).json({ message: "No fue posible completar el registro. Verifica los datos ingresados." });

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

    await storage.users.updateUser(cliente.userId!, { emailVerified: false });
    await queueEmailVerification(correo, cliente.userId!);

    res.status(201).json({
      message: "Cliente creado exitosamente. Verifica tu correo para activar el acceso.",
      requiresEmailVerification: true,
      email: correo,
      data: cliente,
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------
// POST /api/register/empresa — self-registration: company
// ----------------------------------------------------------------
router.post("/register/empresa", registerRateLimiter, validate(registerEmpresaSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      razonSocial, nit, sector, correo, password, abogadoId,
      // representante legal
      repNombre, repApellido, repDocumento, repTipoDocumentoId,
      repCargo, repEmail, repTelefono,
    } = req.body;

    const existing = await storage.getUserByEmail(correo);
    if (existing) return res.status(400).json({ message: "No fue posible completar el registro. Verifica los datos ingresados." });

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

    await storage.users.updateUser(cliente.userId!, { emailVerified: false });
    await queueEmailVerification(correo, cliente.userId!);

    res.status(201).json({
      message: "Empresa registrada exitosamente. Verifica tu correo para activar el acceso.",
      requiresEmailVerification: true,
      email: correo,
      data: cliente,
    });
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

    const isFirm   = user?.rol?.nombre === "bufete";
    const lawyerId = isFirm ? undefined : user.idProfile;
    const firmId   = isFirm ? user.idProfile : undefined;

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
      lawyerId,
      firmId
    );

    res.status(201).json({ message: "Cliente registrado exitosamente", data: cliente });
  } catch (error) {
    next(error);
  }
});

export default router;
