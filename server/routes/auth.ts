import { profile } from 'node:console';
import { storage } from './../storage/storeage/database-storage';


/**
 * Authentication Routes
 * 
 * Authentication endpoints for lawyers (abogados) and clients (clientes).
 * Maintains backward compatibility with the original monolithic routes.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { hashPassword, verifyPassword, verifyToken, authenticate, extractToken, AUTH_COOKIE_NAME, createAuthResponse, getClearCookieOptions } from "../auth.js";
import { JWTPayload } from "@/shared/model.schema.js";
import { validate } from "../middleware/validation.js";
import { loginRateLimiter } from "../middleware/rate-limit.js";
import { Profile } from '@/lib/auth';

// Validation schemas for registration
const lawyerRegisterSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  licenseNumber: z.string().min(1, "El número de licencia es requerido"),
  specialty: z.string().optional(),
  phone: z.string().optional(),
  isIndependent: z.boolean().default(true),
  firmId: z.string().uuid().optional(),
});

const firmRegisterSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  name: z.string().min(1, "El nombre de la firma es requerido"),
  nit: z.string().min(1, "El NIT es requerido"),
  address: z.string().optional(),
  phone: z.string().optional(),
  planId: z.string().optional(),
});





const router = Router();

const loginSchema = z.object({
  correo: z.string().min(1, "El correo es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});


// POST /api/login - Lawyer login
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0].message,
      });
    }

    const { correo, password } = parsed.data;

    const user = await storage.getUserByEmail(correo);

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const isValidPassword = await verifyPassword(
      password,
      user?.passwordHash || ""
    );

    if (!isValidPassword) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const role = await storage.getRol(user.rolId ?? 0);
    if (!role) {
      throw new Error("El usuario no tiene rol asignado");
    }

    const rawProfile = await storage.getUserProfile(user.id,role?.nombre || "");
    if (!rawProfile) {
      throw new Error("El usuario no tiene perfil asignado");
    }
    const profile: Profile = rawProfile;
    if (!role) {
      return res.status(500).json({ error: "Rol no encontrado" });
    }

    const authResponse = createAuthResponse(
      {
        id: user.id,
        email: user.email,
      },
      role,
      res,
      profile

    );

    return res.json(authResponse);
  } catch (err) {
    next(err);
  }
});


// POST /api/register/lawyer - Register a new lawyer with user account
router.post("/register/lawyer", 
  validate(lawyerRegisterSchema),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      address,
      specialization,
      licenseNumber,
      isIndependent,
      firmId,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email y password son obligatorios",
      });
    }

    // Check if email already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        message: "El correo ya está registrado",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Get default plan or create user without plan
    const defaultPlan = await storage.getPlan("free-plan");
    const planId = defaultPlan ? "free-plan" : (await storage.getPlanes())[0]?.id;
    
    // Create lawyer with user
    const lawyer = await storage.createLawyerWithUser(
      {
        id: crypto.randomUUID(),
        email,
        passwordHash: hashedPassword,
        planId: planId || "free-plan",
        rolId: 1,
        name: `${firstName} ${lastName}`,
      },
      {
        id: crypto.randomUUID(),
        firstName,
        lastName,
        phone,
        address,
        specialization,
        licenseNumber,
        isIndependent: isIndependent ?? true,
        firmId: firmId || null,
      }
    );

    return res.status(201).json({
      message: "Abogado creado exitosamente",
      data: lawyer,
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/register/firm - Register a new firm with user account
router.post("/register/firm", 
  validate(firmRegisterSchema),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      password,
      name,
      nit,
      address,
      phone,
      planId,
    } = req.body;

    if (!email || !password || !name || !nit) {
      return res.status(400).json({
        message: "Email, password, nombre y NIT son obligatorios",
      });
    }

    // Check if email already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        message: "El correo ya está registrado",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Get default plan
    const defaultPlan = await storage.getPlan(planId || "free-plan");
    const userPlanId = defaultPlan ? (planId || "free-plan") : (await storage.getPlanes())[0]?.id || "free-plan";

    // Create firm with user
    const firm = await storage.createFirmWithUser(
      {
        id: crypto.randomUUID(),
        email,
        passwordHash: hashedPassword,
        planId: userPlanId,
        rolId: 5,
        name: name,// firm role
      },
      {
        id: crypto.randomUUID(),
        name,
        nit,
        address,
        phone,
        planId: userPlanId,
      }
    );

    return res.status(201).json({
      message: "Firma creada exitosamente",
      data: firm,
    });

  } catch (error) {
    next(error);
  }
});



// GET /api/auth/verify - Verify token
router.get("/auth/verify", async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        error: "No se proporcionó token",
        authenticated: false,
      });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({
        error: "Token inválido o expirado",
        authenticated: false,
      });
    }

    const user = await storage.getUserById(payload.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Usuario no encontrado o inactivo",
        authenticated: false,
      });
    }

    const permisos = await storage.getPermisosByRol(payload.rol.id);
    const profile = await storage.getUserProfile(
      user.id,
      payload.rol.nombre
    );

    res.json({
      authenticated: true,
      user,
      profile,
      type: payload.rol.nombre,
      permisos,
    });

  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout - Logout
router.post("/auth/logout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Clear HttpOnly cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions(isProduction));
    res.json({ message: "Sesión cerrada correctamente" });
  } catch (err) {
    next(err);
  }
});

// GET /api/permisos - Get user permissions
router.get("/permisos", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user as JWTPayload;
    const permisos = await storage.getPermisosByRol(user.rol.id);
    res.json({ permisos });
  } catch (err) {
    next(err);
  }
});

export default router;
