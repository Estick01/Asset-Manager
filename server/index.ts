
import "dotenv/config";
import "./lib/env.js"; // validate env vars at startup
import express from "express";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { registerRoutes } from "./routes.js";

import * as fs from "fs";
import * as path from "path";
import { storage } from './storage/storeage/database-storage.js';
import { db } from './db.js';
import { setupWebSocketServer } from "./websocket/ws-server.js";
import { seedLegalStages } from "./db/seeds/legal-stages.seed.js";
import { seedStageTemplates } from "./db/seeds/stage-templates.seed.js";
import { seedPlanes } from "./db/seeds/planes.seed.js";
import { seedAdminRoles } from "./db/seeds/admin-roles.seed.js";
import { subscriptionService } from "./services/subscription.service.js";

const app = express();
app.use(cookieParser());
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function seedDatabase() {
  if (process.env.NODE_ENV === "production") {
    log("[seed] WARNING: Running database seed on startup in production. Consider moving this to a dedicated migration/seed script.");
  }

  // Idempotent seed: always checks before inserting
  const defaultPlanId = "default-plan-id";
  const defaultPlan = await storage.getPlan(defaultPlanId);

  if (!defaultPlan) {
    log("No default plan found, creating one.");
    await storage.createPlan({
      id: defaultPlanId,
      nombre: "Básico",
      precio: "0.00",
      caracteristicas: "Plan básico gratuito",
    });
  }

  // Seed default estados if they don't exist
  const estados = await storage.getEstadosProceso();
  if (estados.length === 0) {
    log("No estados found, creating default estados.");
    await storage.createEstado({ nombre: "Activo", codigo: "activo", color: "#22c55e" });
    await storage.createEstado({ nombre: "En Tramite", codigo: "en_tramite", color: "#f59e0b" });
    await storage.createEstado({ nombre: "Finalizado", codigo: "finalizado", color: "#3b82f6" });
    await storage.createEstado({ nombre: "Archivado", codigo: "archivado", color: "#9ca3af" });
  }

  // Seed etapas procesales (legal stages)
  await seedLegalStages(db);

  // Seed plantillas de tareas por etapa
  await seedStageTemplates(db);

  // Seed planes y features
  await seedPlanes(db);

  // Seed roles admin
  await seedAdminRoles(db);
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    // Allow localhost only outside production (Expo web development)
    const isProduction = process.env.NODE_ENV === "production";
    const isLocalhost =
      !isProduction &&
      (origin?.startsWith("http://localhost:") ||
        origin?.startsWith("http://127.0.0.1:"));

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: "1mb", // JSON payloads should never be large; files go via multer/S3
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  
  // Configure multer for multipart/form-data (file uploads)
  const upload = multer({
    storage: multer.memoryStorage(), // Store files in memory for S3 upload
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
  });
  
  // Make multer available to routes
  app.set("upload", upload);
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    // Never capture body for auth routes (tokens, passwords, etc.)
    const isSensitivePath = /^\/(api\/)?(login|register|refresh|logout|password)/.test(path);

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      if (!isSensitivePath) capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const isProduction = process.env.NODE_ENV === "production";

    // Only log full error server-side, never expose stack traces to clients
    if (!isProduction) {
      console.error("Error:", err);
    }

    if (res.headersSent) {
      return next(err);
    }

    // In production expose only generic message for 500 errors
    const message =
      isProduction && status >= 500
        ? "Error interno del servidor"
        : error.message || "Internal Server Error";

    return res.status(status).json({ message });
  });
}

(async () => {
  await seedDatabase();
  const isProduction = process.env.NODE_ENV === "production";

  // Trust the first proxy hop (Nginx / Cloudflare) so req.ip reflects the
  // real client IP and rate-limiting / security logs are accurate.
  if (isProduction) app.set("trust proxy", 1);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // needed for Expo assets
    // Prevent clickjacking
    frameguard: { action: "deny" },
    // Hide X-Powered-By: Express
    hidePoweredBy: true,
    // Force HTTPS in production
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    // Prevent MIME sniffing
    noSniff: true,
    // Block XSS in older browsers
    xssFilter: true,
    // CSP: restrictive but compatible with React Native Web / Expo
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // RN Web requires inline scripts
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    } : false,
  }));
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  // Setup WebSocket server for real-time chat
  setupWebSocketServer(server);

  // Cron: recordatorios de calendario (cada hora)
  setInterval(async () => {
    try {
      const pendientes = await storage.calendar.getPendingReminders();
      for (const evento of pendientes) {
        await storage.appNotifications.createNotification(
          evento.lawyerId,
          "calendar_reminder",
          `Recordatorio: ${evento.titulo}`,
          `Tienes un evento programado para hoy: ${evento.titulo}`,
          { eventoId: evento.id, tipo: evento.tipo },
        );
        await storage.calendar.markNotificado(evento.id);
      }
    } catch (err) {
      console.error("[cron:calendar] Error al procesar recordatorios:", err);
    }
  }, 60 * 60 * 1000); // cada hora

  // Cron: vencimiento de suscripciones (cada 24 horas)
  setInterval(async () => {
    try {
      // 1. Degradar suscripciones vencidas a plan gratis
      const vencidas = await storage.suscripciones.getVencidas();
      for (const s of vencidas) {
        await storage.suscripciones.updateEstado(s.id, "vencida");
        await subscriptionService.activatePlanGratis(s.userId);
        await storage.appNotifications.createNotification(
          s.userId,
          "subscription_expired",
          "Tu suscripción ha vencido",
          "Tu plan ha sido degradado al plan gratuito. Renueva para seguir usando todas las funcionalidades.",
          { suscripcionId: s.id },
        );
        console.log(`[cron:suscripciones] Suscripción ${s.id} degradada a gratis`);
      }

      // 2. Notificar suscripciones que vencen en 3 días
      const proximasAVencer = await storage.suscripciones.getProximasAVencer(3);
      for (const s of proximasAVencer) {
        await storage.appNotifications.createNotification(
          s.userId,
          "subscription_expiring_soon",
          "Tu suscripción vence pronto",
          `Tu plan vence el ${s.fechaVencimiento.toLocaleDateString("es-CO")}. Renueva para no perder el acceso.`,
          { suscripcionId: s.id },
        );
      }
    } catch (err) {
      console.error("[cron:suscripciones] Error:", err);
    }
  }, 24 * 60 * 60 * 1000); // cada 24 horas

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();