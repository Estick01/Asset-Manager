import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { type Abogado, type Cliente } from "../shared/schema.js";

// Configuración de JWT
const JWT_SECRET = process.env.JWT_SECRET || "lextrack-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d"; // Token expira en 7 días

// Configuración de cookies
const COOKIE_NAME = "lextrack_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

// Rounds de salt para bcrypt - usar variable de entorno para mayor seguridad
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

/**
 * Nombre de la cookie de autenticación
 */
export const AUTH_COOKIE_NAME = COOKIE_NAME;

/**
 * Opciones de cookie para producción segura
 */
export function getCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true, // No accesible desde JavaScript
    secure: isProduction, // Solo HTTPS en producción
    sameSite: "strict" as const, // CSRF protection
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

/**
 * Limpia la cookie de autenticación
 */
export function clearCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/",
  };
}

/**
 * Hashea una contraseña usando bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compara una contraseña con un hash
 * También acepta contraseñas en texto plano para compatibilidad hacia atrás
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Primero intentar con bcrypt
  try {
    const bcryptMatch = await bcrypt.compare(password, hash);
    if (bcryptMatch) {
      return true;
    }
  } catch {
    // Si falla bcrypt, puede ser una contraseña en texto plano
  }
  
  // Compatibilidad hacia atrás: aceptar contraseña en texto plano
  // Esto es para usuarios registrados antes de implementar hash
  return password === hash;
}

/**
 * Genera un token JWT para un usuario
 */
export function generateToken(user: { id: string; correo: string; nombre: string }, type: "abogado" | "cliente"): string {
  const payload = {
    id: user.id,
    correo: user.correo,
    nombre: user.nombre,
    type,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Decodifica un token JWT sin verificar (para obtener info del payload)
 */
export function decodeToken(token: string): { id: string; correo: string; nombre: string; type: "abogado" | "cliente" } | null {
  try {
    const decoded = jwt.decode(token);
    return decoded as { id: string; correo: string; nombre: string; type: "abogado" | "cliente" };
  } catch {
    return null;
  }
}

/**
 * Verifica un token JWT y retorna el payload
 */
export function verifyToken(token: string): { id: string; correo: string; nombre: string; type: "abogado" | "cliente" } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as { id: string; correo: string; nombre: string; type: "abogado" | "cliente" };
  } catch {
    return null;
  }
}

/**
 * Tipo para el payload del JWT
 */
export interface TokenPayload {
  id: string;
  correo: string;
  nombre: string;
  type: "abogado" | "cliente";
}

/**
 * Middleware de autenticación para Express
 */
import type { Request, Response, NextFunction } from "express";

/**
 * Extrae el token JWT de la cookie o del header Authorization
 * Prioriza el header para compatibilidad con móvil
 */
export function extractToken(req: Request): string | null {
  // Primero intentar obtener del header Authorization (para móvil)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
    if (token) return token;
  }
  
  // Luego intentar obtener de la cookie (para web)
  const tokenFromCookie = req.cookies?.[COOKIE_NAME];
  if (tokenFromCookie) {
    return tokenFromCookie;
  }
  
  return null;
}

export function authenticateAbogado(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({ error: "No se proporcionó token de autenticación" });
  }
  
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
  
  if (payload.type !== "abogado") {
    return res.status(403).json({ error: "Acceso denegado. Se requiere cuenta de abogado" });
  }
  
  // Adjuntar el usuario al request
  (req as any).user = payload;
  next();
}

export function authenticateCliente(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({ error: "No se proporcionó token de autenticación" });
  }
  
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
  
  if (payload.type !== "cliente") {
    return res.status(403).json({ error: "Acceso denegado. Se requiere cuenta de cliente" });
  }
  
  // Adjuntar el usuario al request
  (req as any).user = payload;
  next();
}

/**
 * Middleware de autenticación genérico (acepta abogado o cliente)
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({ error: "No se proporcionó token de autenticación" });
  }
  
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
  
  // Adjuntar el usuario al request
  (req as any).user = payload;
  next();
}

/**
 * Middleware factory para verificar permisos específicos
 * Requiere que authenticate se haya ejecutado antes
 */
export function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as TokenPayload | undefined;
    
    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    
    try {
      // Importar storage dinámicamente para evitar dependencia circular
      const { storage } = await import("./storage.js");
      const userPermissions = await storage.getPermisosByUsuario(user.id, user.type);
      
      const hasPermission = requiredPermissions.every((p) => userPermissions.includes(p));
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: "No tiene permisos para realizar esta acción",
          required: requiredPermissions,
        });
      }
      
      // Adjuntar permisos al request para uso posterior
      (req as any).permissions = userPermissions;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Genera respuesta de login exitosa con token
 * Establece cookie HttpOnly para web
 */
export function createAuthResponse(user: Abogado | Cliente, type: "abogado" | "cliente", res?: Response) {
  const token = generateToken(
    {
      id: user.id,
      correo: user.correo,
      nombre: user.nombre,
    },
    type
  );
  
  // No incluir la contraseña en la respuesta
  const { password, ...userWithoutPassword } = user;
  
  // Si tenemos acceso a la respuesta, establecer cookie HttpOnly (para web)
  if (res) {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie(COOKIE_NAME, token, getCookieOptions(isProduction));
  }
  
  return {
    token,
    user: userWithoutPassword,
  };
}
