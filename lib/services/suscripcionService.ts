import { apiRequest } from "../apiClient";

const SILENT = { silent: true } as const;

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PlanPublico {
  id: string;
  nombre: string;
  tipo: "abogado" | "bufete";
  precioMensualCop: string;
  precioAnualCop: string;
  precioMensualUsd: string;
  precioAnualUsd: string;
  maxProcesos: number;
  maxClientes: number;
  maxStorageGb: number;
  includedUsers: number;
  maxUsers: number;
  precioUsuarioExtraCop: string | null;
  precioUsuarioExtraUsd: string | null;
  features: { code: string; nombre: string; value: string }[];
}

export interface MiSuscripcion {
  suscripcion: {
    id: string;
    planId: string;
    ciclo: "mensual" | "anual";
    estado: "activa" | "cancelada" | "vencida" | "en_prueba";
    fechaInicio: string;
    fechaVencimiento: string;
    autoRenovacion: boolean;
    extraUsers: number;
  };
  plan: PlanPublico | null;
  uso: {
    procesosUsados: number;
    procesosMax: number;
    clientesUsados: number;
    clientesMax: number;
    storageUsadoMb: number;
    storageMaxMb: number;
  } | null;
}

export interface CheckoutResult {
  activated?: boolean;
  payment_url: string | null;
  reference?: string;
  pagoId?: string;
  monto?: number;
  currency?: string;
  planNombre?: string;
}

// ── Funciones ─────────────────────────────────────────────────────────────────

/**
 * Obtiene los planes públicos disponibles, opcionalmente filtrados por tipo.
 */
export async function getPlanes(
  tipo?: "abogado" | "bufete",
): Promise<PlanPublico[]> {
  const params = new URLSearchParams();
  if (tipo) params.set("tipo", tipo);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiRequest("GET", `/api/planes${query}`, undefined, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al obtener planes");
  }
  return res.json();
}

/**
 * Obtiene la suscripción activa del usuario autenticado junto con el uso actual.
 */
export async function getMiSuscripcion(): Promise<MiSuscripcion> {
  const res = await apiRequest("GET", "/api/suscripciones/me", undefined, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al obtener suscripción");
  }
  return res.json();
}

/**
 * Inicia el proceso de pago para un plan. Si el plan es gratuito, lo activa directamente.
 */
export async function checkout(params: {
  planId: string;
  ciclo: "mensual" | "anual";
  extraUsers?: number;
  currency?: "COP" | "USD";
}): Promise<CheckoutResult> {
  const res = await apiRequest("POST", "/api/suscripciones/checkout", params, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al iniciar el checkout");
  }
  return res.json();
}

/**
 * Cancela la renovación automática de la suscripción activa.
 * La suscripción permanece activa hasta la fecha de vencimiento.
 */
export async function cancelarRenovacion(): Promise<{
  mensaje: string;
  fechaVencimiento: string;
}> {
  const res = await apiRequest("POST", "/api/suscripciones/cancelar", undefined, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al cancelar la renovación");
  }
  return res.json();
}

// ── Tipos adicionales para pagos y límites ─────────────────────────────────────

export type TipoLimite = "procesos" | "clientes" | "storage";

export interface PagoEstado {
  estado: "pendiente" | "aprobado" | "rechazado";
  wompiTransactionId: string | null;
  metodoPago: string | null;
}

export class LimitReachedError extends Error {
  constructor(
    public readonly tipo: TipoLimite,
    public readonly actual: number,
    public readonly maximo: number,
  ) {
    super(`Límite alcanzado: ${actual}/${maximo} ${tipo}`);
    this.name = "LimitReachedError";
  }
}

// ── Funciones adicionales ──────────────────────────────────────────────────────

/**
 * Consulta el estado de un pago por su ID.
 */
export async function getPagoEstado(pagoId: string): Promise<PagoEstado> {
  const res = await apiRequest("GET", `/api/pagos/${pagoId}/estado`, undefined, SILENT);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Error al consultar el estado del pago");
  }
  return res.json();
}

/**
 * Lanza LimitReachedError si la respuesta es 403 con code LIMIT_REACHED.
 * De lo contrario lanza un Error genérico con el mensaje del servidor.
 */
export async function handleApiError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  if (res.status === 403 && body.code === "LIMIT_REACHED") {
    throw new LimitReachedError(
      body.tipo ?? "procesos",
      body.actual ?? 0,
      body.maximo ?? 0,
    );
  }
  throw new Error(body.error || body.message || "Error inesperado");
}
