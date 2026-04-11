import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

const APP_NAME = "ProcesoClaro";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function bufferToBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32ToBuffer(value: string): Buffer {
  const normalized = value.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let current = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    current = (current << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((current >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const hmac = createHmac("sha1", base32ToBuffer(secret)).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binaryCode % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function generateTwoFactorSecret(): string {
  return bufferToBase32(randomBytes(20));
}

export function generateOtpAuthUrl(email: string, secret: string): string {
  const label = encodeURIComponent(`${APP_NAME}:${email}`);
  const issuer = encodeURIComponent(APP_NAME);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

export function verifyTotpCode(secret: string, code: string, window = 1): boolean {
  const normalizedCode = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalizedCode)) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
  for (let offset = -window; offset <= window; offset += 1) {
    if (hotp(secret, currentCounter + offset) === normalizedCode) {
      return true;
    }
  }
  return false;
}

export function normalizeRecoveryCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}

export function verifyRecoveryCode(code: string, hashes: string[]): { valid: boolean; remaining: string[] } {
  const hashed = Buffer.from(hashRecoveryCode(code), "hex");
  let matched = false;
  const remaining = hashes.filter((item) => {
    const current = Buffer.from(item, "hex");
    const equal = current.length === hashed.length && timingSafeEqual(current, hashed);
    if (equal) matched = true;
    return !equal;
  });

  return { valid: matched, remaining };
}

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(4).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
}

export function hashRecoveryCodes(codes: string[]): string[] {
  return codes.map(hashRecoveryCode);
}
