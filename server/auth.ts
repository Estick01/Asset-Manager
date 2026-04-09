import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { JWTPayload } from "@/shared/model.schema.js";
import { Rol } from "./storage/index.js";
import { storage } from "./storage/storeage/database-storage";
import { Profile } from '@/lib/services/authService.js';




/* =====================================================
   CONFIG
===================================================== */

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable must be set');
  }
  return secret;
})();
const JWT_EXPIRES_IN = "15m";

const COOKIE_NAME = "procesoclaro_token";
export const AUTH_COOKIE_NAME = COOKIE_NAME;

const COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes, matches JWT_EXPIRES_IN

const REFRESH_COOKIE_NAME = "procesoclaro_refresh";
export const AUTH_REFRESH_COOKIE_NAME = REFRESH_COOKIE_NAME;
export const REFRESH_MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 14 days (reduced from 30)

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? "12", 10);

/* =====================================================
   COOKIE CONFIG
===================================================== */

export function getCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };
}

export function getClearCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/",
  };
}

export function getRefreshCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    maxAge: REFRESH_MAX_AGE,
    path: "/",
  };
}

/* =====================================================
   REFRESH TOKEN
===================================================== */

/** Generate a 64-char opaque refresh token */
export function generateRefreshToken(): string {
  return randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
}

/* =====================================================
   PASSWORD
===================================================== */

export async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/* =====================================================
   JWT
===================================================== */

export function generateToken(payload: Omit<JWTPayload, "jti">): { token: string; jti: string } {
  const jti = randomUUID();
  const token = jwt.sign({ ...payload, jti }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, jti };
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

/* =====================================================
   TOKEN EXTRACTION
===================================================== */

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // For multipart uploads, check body.token
  if (req.body?.token) {
    return req.body.token;
  }

  return req.cookies?.[COOKIE_NAME] ?? null;
}

/* =====================================================
   BASE AUTH MIDDLEWARE
===================================================== */

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      permissions?: string[];
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  // Validate session is still active (not revoked)
  const sessionValid = await storage.sessions.isValid(payload.jti);
  if (!sessionValid) {
    return res.status(401).json({ error: "Sesión inválida o cerrada" });
  }

  req.user = payload;
  next();
}

/* =====================================================
   OPTIONAL AUTH MIDDLEWARE
===================================================== */

/** Sets req.user if a valid token is present, but never returns 401. */
export async function authenticateOptional(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const sessionValid = await storage.sessions.isValid(payload.jti);
      if (sessionValid) req.user = payload;
    }
  }
  next();
}

/* =====================================================
   ROLE GUARD FACTORY (REEMPLAZA authenticateAbogado/Cliente)
===================================================== */

export function requireRole(...allowedRoles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        error: "No tiene permisos para este recurso",
        required: allowedRoles,
      });
    }

    next();
  };
}

/* =====================================================
   PERMISSION GUARD
===================================================== */

export function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    try {
      // Override model: if a firm-specific role is set, use it exclusively.
      // Otherwise fall back to the user's global role.
      const rolId = req.user.firmRolId ?? req.user.rol.id;

      const userPermissions = await storage.getPermisosByRol(rolId);

      const hasAllPermissions = requiredPermissions.every((p) =>
        userPermissions.includes(p)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          error: "Permisos insuficientes",
          required: requiredPermissions,
        });
      }

      req.permissions = userPermissions;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/* =====================================================
   LOGIN RESPONSE (UNIFIED)
===================================================== */

export function createAuthResponse(
  user: { id: string; email: string; name: string | null },
  rol: Rol,
  res?: Response,
  profile?: Profile,
  firmRolId?: number | null
): { token: string; jti: string; user: JWTPayload; profile: Profile | undefined } {
  const payloadBase: Omit<JWTPayload, "jti"> = {
    id: user.id,
    email: user.email,
    rol,
    idProfile: profile?.id,
    UserName: user.name,
    ...(firmRolId != null && { firmRolId }),
  };

  const { token, jti } = generateToken(payloadBase);
  const payload: JWTPayload = { ...payloadBase, jti };

  if (res) {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie(COOKIE_NAME, token, getCookieOptions(isProduction));
  }

  return { token, jti, user: payload, profile };
}
