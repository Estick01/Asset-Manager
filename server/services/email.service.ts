import nodemailer from "nodemailer";
import { withTimeout } from "../lib/timeout.js";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || "smtp.gmail.com",
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",   // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || `"LexTrack" <${process.env.SMTP_USER}>`;
const APP_NAME = "LexTrack";

// ── Templates ──────────────────────────────────────────────────────────────

function passwordResetHtml(code: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recuperar contraseña</title>
  <style>
    body { margin: 0; padding: 0; background: #F4F6F8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .wrapper { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #0F2640; padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: -0.3px; }
    .header p  { color: rgba(255,255,255,0.55); margin: 4px 0 0; font-size: 13px; }
    .body { padding: 36px 40px; }
    .body p  { color: #4A5568; font-size: 14px; line-height: 1.7; margin: 0 0 20px; }
    .code-box {
      background: #F0F7FF; border: 1.5px dashed #2196A6;
      border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;
    }
    .code-box .label { font-size: 11px; color: #6B7B8D; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .code-box .code  { font-size: 38px; font-weight: 700; color: #0F2640; letter-spacing: 10px; }
    .expiry { font-size: 12px; color: #9AAABB; text-align: center; margin-top: -8px; margin-bottom: 24px; }
    .footer { background: #F4F6F8; padding: 20px 40px; text-align: center; }
    .footer p { color: #9AAABB; font-size: 11px; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${APP_NAME}</h1>
      <p>Recuperación de contraseña</p>
    </div>
    <div class="body">
      <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente código de verificación:</p>
      <div class="code-box">
        <div class="label">Código de verificación</div>
        <div class="code">${code}</div>
      </div>
      <p class="expiry">⏱ Este código expira en <strong>5 minutos</strong> y es de un solo uso.</p>
      <p>Si no solicitaste este cambio, ignora este correo. Tu contraseña actual permanecerá sin cambios.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${APP_NAME} · Este es un mensaje automático, no respondas a este correo.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ── Exported functions ─────────────────────────────────────────────────────

export async function sendPasswordResetOtp(toEmail: string, code: string): Promise<void> {
  await withTimeout(
    transporter.sendMail({
      from:    FROM,
      to:      toEmail,
      subject: `${code} es tu código de recuperación — ${APP_NAME}`,
      html:    passwordResetHtml(code),
      text:    `Tu código de recuperación de contraseña es: ${code}\nExpira en 5 minutos.\n\nSi no solicitaste este cambio, ignora este mensaje.`,
    }),
    10_000, // 10s timeout for email delivery
    "email.sendPasswordResetOtp"
  );
}
