import { profile } from 'node:console';

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { JWTPayload } from "@/shared/model.schema.js";
import { Rol } from "./storage/index.js";
import { storage } from "./storage/storeage/database-storage";
import { Profile } from '@/lib/services/authService.js';




/* =====================================================
   CONFIG
===================================================== */

const JWT_SECRET = process.env.JWT_SECRET ?? (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }
  return "lextrack-dev-secret";
})();
const JWT_EXPIRES_IN = "7d";

const COOKIE_NAME = "lextrack_token";
export const AUTH_COOKIE_NAME = COOKIE_NAME;

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
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

export function generateToken(payload: JWTPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  req.user = payload;
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
      

      const userPermissions = await storage.getPermisosByRol(
        req.user.rol.id,
      );

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
  user: { id: string; email: string },
  rol: Rol,
  res?: Response,
  profile?:Profile
) {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    rol,
    idProfile:profile?.id,
  };

  const token = generateToken(payload);

  if (res) {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie(COOKIE_NAME, token, getCookieOptions(isProduction));
  }

  return {
    token,
    user: payload,
    profile,
  };
}