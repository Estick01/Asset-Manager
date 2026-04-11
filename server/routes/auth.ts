import { Rol } from './../../shared/schema/rol.schema';
import { profile } from 'node:console';
import { storage } from './../storage/storeage/database-storage';


/**
 * Authentication Routes
 * 
 * Authentication endpoints for lawyers (abogados) and clients (clientes).
 * Maintains backward compatibility with the original monolithic routes.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { hashPassword, verifyPassword, verifyToken, authenticate, extractToken, AUTH_COOKIE_NAME, AUTH_REFRESH_COOKIE_NAME, REFRESH_MAX_AGE, createAuthResponse, getClearCookieOptions, generateRefreshToken, getRefreshCookieOptions } from "../auth.js";
import { JWTPayload } from "@/shared/model.schema.js";
import { validate } from "../middleware/validation.js";
import { loginRateLimiter, registerRateLimiter } from "../middleware/rate-limit.js";
import { subscriptionService } from "../services/subscription.service.js";
import { sendEmailVerificationOtp } from "../services/email.service.js";
import { queueNotificationEmail } from "../services/email.service.js";
import { generateOtpAuthUrl, generateRecoveryCodes, generateTwoFactorSecret, hashRecoveryCodes, verifyRecoveryCode, verifyTotpCode } from "../services/two-factor.service.js";
import {
  recordFailure,
  recordSuccess,
  auditLog,
  validateRecaptcha,
} from "../services/login-security.service.js";
import { Profile } from '@/lib/auth';
import { EnumRol } from '@/shared/schema/user.schema';

// Validation schemas for registration
const lawyerRegisterSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  phone: z.string().min(1, "El teléfono es requerido"),
  documento: z.string().min(1, "El documento de identidad es requerido"),
  tipoDocumentoId: z.number().int().positive("El tipo de documento es requerido"),
  direccion: z.string().optional(),
  departamentoId: z.string().optional(),
  municipioId: z.string().optional(),
  licenseNumber: z.string().min(1, "El número de licencia es requerido"),
  specialty: z.string().optional(),
  isIndependent: z.boolean().default(true),
  firmId: z.string().uuid().optional(),
});

const firmRegisterSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  name: z.string().min(1, "El nombre de la firma es requerido"),
  nit: z.string().min(1, "El NIT es requerido"),
  address: z.string().optional(),
  phone: z.string().optional(),
  // representante legal (opcional)
  repNombre: z.string().optional(),
  repApellido: z.string().optional(),
  repDocumento: z.string().optional(),
  repTipoDocumentoId: z.number().int().positive().optional(),
  repCargo: z.string().optional(),
  repEmail: z.string().email().optional().or(z.literal("")),
  repTelefono: z.string().optional(),
  repDireccion: z.string().optional(),
  repDepartamentoId: z.string().optional(),
  repMunicipioId: z.string().optional(),
});





const router = Router();

const loginSchema = z.object({
  correo: z.string().min(1, "El correo es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

const emailVerificationRequestSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
});

const emailVerificationVerifySchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  code: z.string().length(6, "El código debe tener 6 dígitos"),
});

const twoFactorCodeSchema = z.object({
  code: z.string().min(6, "Ingresa el código de autenticación"),
});

const verifyTwoFactorLoginSchema = z.object({
  challengeId: z.string().uuid("Challenge inválido"),
  code: z.string().min(6, "Ingresa el código de autenticación"),
});

const disableTwoFactorSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
});

const deviceRevokeParamsSchema = z.object({
  id: z.string().uuid("Dispositivo inválido"),
});

const DEVICE_ID_HEADER = "x-device-id";
const DEVICE_NAME_HEADER = "x-device-name";
const DEVICE_PLATFORM_HEADER = "x-device-platform";

function readHeader(req: Request, header: string): string | null {
  const raw = req.headers[header];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return typeof raw === "string" ? raw : null;
}

function cleanHeaderValue(value: string | null | undefined, maxLength: number): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function defaultDeviceName(platform: string | null): string {
  if (platform === "web") return "Navegador web";
  if (platform === "ios") return "Dispositivo iOS";
  if (platform === "android") return "Dispositivo Android";
  return "Dispositivo";
}

function buildFallbackDeviceId(req: Request, platform: string | null, userAgent: string | null): string {
  const raw = `${req.ip ?? "unknown"}|${platform ?? "unknown"}|${userAgent ?? "unknown"}`;
  return `legacy_${Buffer.from(raw).toString("base64url").slice(0, 160)}`;
}

function getDeviceContext(req: Request) {
  const userAgent = cleanHeaderValue(readHeader(req, "user-agent"), 500);
  const platform = cleanHeaderValue(readHeader(req, DEVICE_PLATFORM_HEADER), 30) ?? "unknown";
  const deviceName = cleanHeaderValue(readHeader(req, DEVICE_NAME_HEADER), 120) ?? defaultDeviceName(platform);
  const deviceId = cleanHeaderValue(readHeader(req, DEVICE_ID_HEADER), 191) ?? buildFallbackDeviceId(req, platform, userAgent);

  return {
    deviceId,
    deviceName,
    platform,
    userAgent,
  };
}

function parseRecoveryCodeHashes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function buildUserLoginContext(userId: string) {
  const user = await storage.getUserById(userId);
  if (!user) throw new Error("Usuario no encontrado");

  const role = await storage.getRol(user.rolId ?? 0);
  if (!role) throw new Error("El usuario no tiene rol asignado");

  const rawProfile = await storage.getUserProfile(user.id, role.nombre);
  if (!rawProfile) throw new Error("El usuario no tiene perfil asignado");

  let firmRolId: number | null = null;
  if (role.nombre === "abogado" && rawProfile?.id) {
    const activeHistory = await storage.lawyerFirmaHistory.getActiveByLawyerId(rawProfile.id);
    if (activeHistory?.firmRolId) firmRolId = activeHistory.firmRolId;
  }

  return {
    user,
    role,
    profile: rawProfile as Profile,
    firmRolId,
  };
}

async function finalizeLogin(req: Request, res: Response, userId: string) {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const { deviceId, deviceName, platform, userAgent } = getDeviceContext(req);
  const { user, role, profile, firmRolId } = await buildUserLoginContext(userId);

  const deviceResult = await storage.userDevices.upsertSeen({
    userId: user.id,
    deviceId,
    deviceName,
    platform,
    userAgent,
    lastIp: ip,
  });

  const authResponse = createAuthResponse(
    { id: user.id, email: user.email, name: user.name },
    role, res, profile, firmRolId
  );

  const refreshToken = generateRefreshToken();
  const isProduction = process.env.NODE_ENV === "production";

  await storage.sessions.create({
    id:               authResponse.jti,
    userId:           user.id,
    expiresAt:        new Date(Date.now() + 2 * 60 * 60 * 1000),
    refreshToken,
    refreshExpiresAt: new Date(Date.now() + REFRESH_MAX_AGE),
    ipAddress:        ip,
    userAgent,
    deviceId:         deviceResult.device.deviceId,
  });

  recordSuccess(ip, user.email).catch(() => {});
  auditLog({ email: user.email, ip, userAgent, eventType: "login_success", success: true }).catch(() => {});

  if (deviceResult.isNewDevice) {
    queueNotificationEmail(
      user.email,
      "Nuevo inicio de sesión detectado",
      [
        "Detectamos un inicio de sesión desde un dispositivo no reconocido.",
        "",
        `Dispositivo: ${deviceResult.device.deviceName ?? "Dispositivo nuevo"}`,
        `Plataforma: ${deviceResult.device.platform ?? "No identificada"}`,
        `IP aproximada: ${ip}`,
        `Fecha: ${new Date().toLocaleString("es-CO")}`,
        "",
        "Si fuiste tú, no necesitas hacer nada. Si no reconoces esta actividad, cambia tu contraseña y revoca los dispositivos activos.",
      ].join("\n")
    );
  }

  res.cookie(AUTH_REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(isProduction));

  const effectiveRolId = firmRolId ?? role.id;
  const permisos = await storage.getPermisosByRol(effectiveRolId);

  return { ...authResponse, refreshToken, permisos, newDeviceDetected: deviceResult.isNewDevice };
}

async function queueEmailVerification(email: string, userId: string): Promise<void> {
  const code = await storage.otps.createEmailVerificationOtp(userId);
  sendEmailVerificationOtp(email, code).catch((err) => {
    console.error("[email-verification] email send error:", err);
  });
}


// POST /api/login
router.post("/login", loginRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const ip        = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const { deviceId, deviceName, platform, userAgent } = getDeviceContext(req);

  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { correo, password } = parsed.data;
    const email = correo.toLowerCase().trim();

    // ── reCAPTCHA (optional) ────────────────────────────────────────────────
    const recaptchaToken = req.body?.recaptchaToken as string | undefined;
    const captchaOk = await validateRecaptcha(recaptchaToken);
    if (!captchaOk) {
      return res.status(400).json({ error: "Verificación de seguridad fallida. Intenta de nuevo." });
    }

    // ── Credential validation ───────────────────────────────────────────────
    const user = await storage.getUserByEmail(email);
    const isValidPassword = user
      ? await verifyPassword(password, user.passwordHash || "")
      : false;

    if (!user || !isValidPassword) {
      // Record failure + audit (fire-and-forget so response isn't delayed)
      recordFailure(ip, email).catch(() => {});
      auditLog({ email, ip, userAgent, eventType: "login_fail", success: false }).catch(() => {});

      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: "Debes verificar tu correo electrónico antes de ingresar.",
        code: "EMAIL_NOT_VERIFIED",
        requiresEmailVerification: true,
      });
    }

    // ── Success ─────────────────────────────────────────────────────────────
    const twoFactor = await storage.userTwoFactor.getByUserId(user.id);
    if (twoFactor?.enabledAt) {
      const challengeId = randomUUID();
      await storage.authChallenges.create({
        id: challengeId,
        userId: user.id,
        challengeType: "two_factor_login",
        deviceId: deviceId,
        ipAddress: ip,
        userAgent,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date(),
      });

      return res.json({
        requiresTwoFactor: true,
        challengeId,
      });
    }
    return res.json(await finalizeLogin(req, res, user.id));
  } catch (err) {
    next(err);
  }
});


// POST /api/register/lawyer - Register a new lawyer with user account
router.post("/register/lawyer",
  registerRateLimiter,
  validate(lawyerRegisterSchema),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      documento,
      tipoDocumentoId,
      direccion,
      departamentoId,
      municipioId,
      specialty,
      licenseNumber,
      isIndependent,
      firmId,
    } = req.body;

    // Check if email already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        message: "No fue posible completar el registro. Verifica los datos ingresados.",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create persona + user + lawyer profile in one transaction
    const lawyer = await storage.createLawyerWithUser(
      {
        id: crypto.randomUUID(),
        email,
        passwordHash: hashedPassword,
        rolId: EnumRol.ABOGADO.id,
        name: `${firstName} ${lastName}`,
        emailVerified: false,
      },
      {
        id: crypto.randomUUID(),
        specialization: specialty ?? null,
        licenseNumber,
        isIndependent: isIndependent ?? true,
        firmId: firmId || null,
        professionalVerificationStatus: "pendiente",
      },
      {
        nombre: firstName,
        apellido: lastName,
        telefono: phone,
        documento,
        tipoDocumentoId,
        direccion: direccion ?? null,
        departamentoId: departamentoId ?? null,
        municipioId: municipioId ?? null,
      }
    );

    await subscriptionService.activatePlanGratis(lawyer.userId, "abogado");
    await queueEmailVerification(email, lawyer.userId);

    return res.status(201).json({
      message: "Abogado creado exitosamente. Verifica tu correo para activar el acceso.",
      requiresEmailVerification: true,
      email,
      professionalVerificationStatus: "pendiente",
      data: lawyer,
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/register/firm - Register a new firm with user account
router.post("/register/firm",
  registerRateLimiter,
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
      repNombre,
      repApellido,
      repDocumento,
      repTipoDocumentoId,
      repCargo,
      repEmail,
      repTelefono,
      repDireccion,
      repDepartamentoId,
      repMunicipioId,
    } = req.body;

    // Check if email already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        message: "No fue posible completar el registro. Verifica los datos ingresados.",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Build optional rep data (only if nombre + documento provided)
    const repData = repNombre && repDocumento
      ? {
          persona: {
            nombre: repNombre,
            apellido: repApellido || "",
            telefono: repTelefono || "",
            documento: repDocumento,
            tipoDocumentoId: repTipoDocumentoId || 1,
            direccion: repDireccion || null,
            departamentoId: repDepartamentoId || null,
            municipioId: repMunicipioId || null,
          },
          rep: {
            cargo: repCargo || "Representante Legal",
            email: repEmail || email,
          },
        }
      : undefined;

    // Create firm with user
    const firm = await storage.createFirmWithUser(
      {
        id: crypto.randomUUID(),
        email,
        passwordHash: hashedPassword,
        rolId: 5,
        name,
        emailVerified: false,
      },
      {
        id: crypto.randomUUID(),
        name,
        nit,
        address,
        phone,
      },
      repData
    );

    await subscriptionService.activatePlanGratis(firm.userId, "bufete");
    await queueEmailVerification(email, firm.userId);

    return res.status(201).json({
      message: "Firma creada exitosamente. Verifica tu correo para activar el acceso.",
      requiresEmailVerification: true,
      email,
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

// GET /api/auth/token - Get token for WebSocket (returns token from cookie)
router.get("/auth/token", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({ error: "No token", authenticated: false });
    }

    // Verify token is valid
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Token invalido", authenticated: false });
    }

    // Verify the session has not been revoked (logout, password change, etc.)
    const sessionValid = await storage.sessions.isValid(payload.jti);
    if (!sessionValid) {
      return res.status(401).json({ error: "Sesion revocada", authenticated: false });
    }

    // Return the token for WebSocket use
    res.json({ token, authenticated: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh - Silent token renewal using refresh token
router.post("/auth/refresh", async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const deviceContext = getDeviceContext(req);

  try {
    // Mobile sends refreshToken in body; web uses httpOnly cookie
    const refreshToken: string | undefined =
      req.cookies?.[AUTH_REFRESH_COOKIE_NAME] || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "Sin refresh token" });
    }

    const session = await storage.sessions.findByRefreshToken(refreshToken);

    if (
      !session ||
      session.revokedAt !== null ||
      !session.refreshExpiresAt ||
      session.refreshExpiresAt < new Date()
    ) {
      return res.status(401).json({ error: "Refresh token inválido o expirado" });
    }

    // Load user + role + profile to build a fresh access token
    const user = await storage.getUserById(session.userId);
    if (!user) return res.status(401).json({ error: "Usuario no encontrado" });

    const role = await storage.getRol(user.rolId ?? 0);
    if (!role) return res.status(401).json({ error: "Rol no encontrado" });

    const rawProfile = await storage.getUserProfile(user.id, role.nombre);

    // For lawyers in a firm, embed their firm-specific role (override model)
    let firmRolId: number | null = null;
    if (role.nombre === "abogado" && rawProfile?.id) {
      const activeHistory = await storage.lawyerFirmaHistory.getActiveByLawyerId(rawProfile.id);
      if (activeHistory?.firmRolId) {
        firmRolId = activeHistory.firmRolId;
      }
    }

    // Issue new access token (sets access cookie on web via createAuthResponse)
    const authResponse = createAuthResponse(
      { id: user.id, email: user.email, name: user.name },
      role,
      res,
      rawProfile ?? undefined,
      firmRolId
    );

    // Rotate: revoke old session, create new session with new JTI + new refresh token
    const newRefreshToken = generateRefreshToken();
    const isProduction = process.env.NODE_ENV === "production";

    await storage.sessions.rotate(
      session.id,
      authResponse.jti,
      newRefreshToken,
      new Date(Date.now() + 2 * 60 * 60 * 1000),
      new Date(Date.now() + REFRESH_MAX_AGE),
    );

    if (session.deviceId) {
      await storage.userDevices.upsertSeen({
        userId: session.userId,
        deviceId: session.deviceId,
        deviceName: deviceContext.deviceName,
        platform: deviceContext.platform,
        userAgent: deviceContext.userAgent,
        lastIp: ip,
      });
    }

    res.cookie(AUTH_REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions(isProduction));

    const effectiveRolId = firmRolId ?? role.id;
    const permisos = await storage.getPermisosByRol(effectiveRolId);

    return res.json({ ...authResponse, refreshToken: newRefreshToken, permisos });
  } catch (err) {
    next(err);
  }
});

router.get("/auth/2fa/status", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const twoFactor = await storage.userTwoFactor.getByUserId(authUser.id);
    const recoveryCodes = parseRecoveryCodeHashes(twoFactor?.recoveryCodes);

    res.json({
      enabled: !!twoFactor?.enabledAt,
      setupPending: !!twoFactor && !twoFactor.enabledAt,
      recoveryCodesRemaining: recoveryCodes.length,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/2fa/setup", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const user = await storage.getUserById(authUser.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const secret = generateTwoFactorSecret();
    await storage.userTwoFactor.upsertSecret(authUser.id, secret);

    res.json({
      secret,
      otpAuthUrl: generateOtpAuthUrl(user.email, secret),
      manualEntryKey: secret,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/2fa/verify-setup", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const { code } = twoFactorCodeSchema.parse(req.body);
    const twoFactor = await storage.userTwoFactor.getByUserId(authUser.id);
    if (!twoFactor) {
      return res.status(400).json({ error: "No hay una configuración de 2FA pendiente." });
    }
    if (!verifyTotpCode(twoFactor.secret, code)) {
      return res.status(400).json({ error: "El código de verificación es inválido." });
    }

    const recoveryCodes = generateRecoveryCodes();
    await storage.userTwoFactor.enable(authUser.id, twoFactor.secret, hashRecoveryCodes(recoveryCodes));

    res.json({
      message: "Autenticación en dos pasos activada.",
      recoveryCodes,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/2fa/disable", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const { currentPassword } = disableTwoFactorSchema.parse(req.body);
    const user = await storage.getUserById(authUser.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

    const valid = await verifyPassword(currentPassword, user.passwordHash || "");
    if (!valid) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta." });
    }

    await storage.userTwoFactor.disable(authUser.id);
    res.json({ message: "Autenticación en dos pasos desactivada." });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/2fa/verify-login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { challengeId, code } = verifyTwoFactorLoginSchema.parse(req.body);
    const challenge = await storage.authChallenges.getValidById(challengeId);
    if (!challenge || challenge.challengeType !== "two_factor_login") {
      return res.status(400).json({ error: "El desafío de autenticación es inválido o expiró." });
    }

    const twoFactor = await storage.userTwoFactor.getByUserId(challenge.userId);
    if (!twoFactor?.enabledAt) {
      return res.status(400).json({ error: "La autenticación en dos pasos no está activa para esta cuenta." });
    }

    let validated = verifyTotpCode(twoFactor.secret, code);
    if (!validated) {
      const recoveryHashes = parseRecoveryCodeHashes(twoFactor.recoveryCodes);
      const recoveryResult = verifyRecoveryCode(code, recoveryHashes);
      if (recoveryResult.valid) {
        validated = true;
        await storage.userTwoFactor.updateRecoveryCodes(challenge.userId, recoveryResult.remaining);
      }
    }

    if (!validated) {
      return res.status(400).json({ error: "El código de autenticación es inválido." });
    }

    await storage.authChallenges.complete(challenge.id);
    return res.json(await finalizeLogin(req, res, challenge.userId));
  } catch (err) {
    next(err);
  }
});

router.get("/auth/devices", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const currentSession = await storage.sessions.findById(authUser.jti);
    const currentDevice = currentSession?.deviceId
      ? await storage.userDevices.getByDeviceId(authUser.id, currentSession.deviceId)
      : undefined;

    const devices = await storage.userDevices.listForUser(authUser.id, currentDevice?.id ?? null);
    res.json(devices);
  } catch (err) {
    next(err);
  }
});

router.post("/auth/devices/:id/revoke", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = deviceRevokeParamsSchema.parse(req.params);
    const authUser = req.user!;
    const currentSession = await storage.sessions.findById(authUser.jti);
    const currentDevice = currentSession?.deviceId
      ? await storage.userDevices.getByDeviceId(authUser.id, currentSession.deviceId)
      : undefined;

    const revoked = await storage.userDevices.revokeById(authUser.id, params.id);
    if (!revoked) {
      return res.status(404).json({ error: "Dispositivo no encontrado" });
    }

    res.json({
      message: "Dispositivo revocado correctamente",
      currentDeviceRevoked: currentDevice?.id === revoked.id,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout - Logout
router.post("/auth/logout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (token) {
      const payload = verifyToken(token);
      if (payload?.jti) {
        await storage.sessions.revoke(payload.jti);
      }
    }

    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions(isProduction));
    res.clearCookie(AUTH_REFRESH_COOKIE_NAME, getClearCookieOptions(isProduction));
    res.json({ message: "Sesión cerrada correctamente" });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/change-password — authenticated user changes their own password
router.put("/auth/change-password", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Se requieren la contraseña actual y la nueva." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres." });
    }
    const authUser = (req as any).user;
    const user = await storage.getUserById(authUser.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
    const valid = await verifyPassword(currentPassword, user.passwordHash || "");
    if (!valid) return res.status(401).json({ error: "La contraseña actual es incorrecta." });
    await storage.users.updateUser(authUser.id, { passwordHash: await hashPassword(newPassword) });
    // Revoke all active sessions — force re-login on other devices
    await storage.sessions.revokeAllForUser(authUser.id);
    res.json({ message: "Contraseña actualizada correctamente." });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/request-email-verification", registerRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = emailVerificationRequestSchema.parse(req.body);
    const user = await storage.getUserByEmail(email.toLowerCase().trim());

    if (user && user.isActive && !user.emailVerified) {
      await queueEmailVerification(user.email, user.id);
    }

    return res.json({
      message: "Si el correo existe y aún no está verificado, recibirás un código en breve.",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/verify-email", registerRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code } = emailVerificationVerifySchema.parse(req.body);
    const user = await storage.getUserByEmail(email.toLowerCase().trim());
    const GENERIC_ERROR = "Código inválido o expirado.";

    if (!user || !user.isActive) {
      return res.status(400).json({ error: GENERIC_ERROR });
    }

    if (user.emailVerified) {
      return res.json({ message: "El correo ya estaba verificado." });
    }

    const result = await storage.otps.verifyEmailVerificationOtp(user.id, code);

    if (result === "too_many_attempts") {
      return res.status(429).json({ error: "Demasiados intentos fallidos. Solicita un nuevo código." });
    }

    if (result !== "valid") {
      return res.status(400).json({ error: GENERIC_ERROR });
    }

    await storage.otps.markEmailVerificationUsed(user.id);
    await storage.users.updateUser(user.id, { emailVerified: true });

    return res.json({ message: "Correo verificado correctamente." });
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
