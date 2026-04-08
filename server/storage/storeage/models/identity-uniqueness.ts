import { and, eq, ne } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "@/shared/schema";
import { HttpException } from "@/server/middleware/http-exception.js";

type Database = MySql2Database<typeof schema>;

function normalize(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeLooseText(value?: string | null): string {
  return value?.trim() ?? "";
}

export function normalizeOptionalIdentity(value?: string | null): string | null {
  return normalize(value);
}

export function normalizeRequiredIdentity(value: string | null | undefined, fieldLabel: string): string {
  const normalized = normalize(value);
  if (!normalized) {
    throw HttpException.badRequest(`${fieldLabel} es requerido.`);
  }
  return normalized;
}

export async function assertDocumentoUnique(
  db: Database | any,
  documento: string | null | undefined,
  excludePersonaId?: string,
): Promise<string> {
  const normalized = normalizeRequiredIdentity(documento, "El documento");

  const rows = await db
    .select({ id: schema.personas.id })
    .from(schema.personas)
    .where(
      excludePersonaId
        ? and(eq(schema.personas.documento, normalized), ne(schema.personas.id, excludePersonaId))
        : eq(schema.personas.documento, normalized),
    )
    .limit(1);

  if (rows[0]) {
    throw HttpException.conflict("El documento ya está registrado en la plataforma.");
  }

  return normalized;
}

export async function assertLicenseNumberUnique(
  db: Database | any,
  licenseNumber: string | null | undefined,
  excludeLawyerId?: string,
): Promise<string | null> {
  const normalized = normalize(licenseNumber);
  if (!normalized) return null;

  const rows = await db
    .select({ id: schema.lawyerProfiles.id })
    .from(schema.lawyerProfiles)
    .where(
      excludeLawyerId
        ? and(eq(schema.lawyerProfiles.licenseNumber, normalized), ne(schema.lawyerProfiles.id, excludeLawyerId))
        : eq(schema.lawyerProfiles.licenseNumber, normalized),
    )
    .limit(1);

  if (rows[0]) {
    throw HttpException.conflict("La tarjeta profesional ya está registrada en la plataforma.");
  }

  return normalized;
}

export async function assertNitUnique(
  db: Database | any,
  nit: string | null | undefined,
  options?: { excludeFirmId?: string; excludeClienteEmpresaId?: string },
): Promise<string> {
  const normalized = normalizeRequiredIdentity(nit, "El NIT");

  const firmRows = await db
    .select({ id: schema.firmProfiles.id })
    .from(schema.firmProfiles)
    .where(
      options?.excludeFirmId
        ? and(eq(schema.firmProfiles.nit, normalized), ne(schema.firmProfiles.id, options.excludeFirmId))
        : eq(schema.firmProfiles.nit, normalized),
    )
    .limit(1);

  if (firmRows[0]) {
    throw HttpException.conflict("El NIT ya está registrado en la plataforma.");
  }

  const companyRows = await db
    .select({ clienteId: schema.clientesEmpresa.clienteId })
    .from(schema.clientesEmpresa)
    .where(
      options?.excludeClienteEmpresaId
        ? and(eq(schema.clientesEmpresa.nit, normalized), ne(schema.clientesEmpresa.clienteId, options.excludeClienteEmpresaId))
        : eq(schema.clientesEmpresa.nit, normalized),
    )
    .limit(1);

  if (companyRows[0]) {
    throw HttpException.conflict("El NIT ya está registrado en la plataforma.");
  }

  return normalized;
}
