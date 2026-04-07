// server/services/ownership-policy.service.ts
import { storage } from "../storage/storeage/database-storage.js";

export interface OwnershipContext {
  /** ID del perfil que actúa (lawyerId o firmId) */
  actorId: string;
  /** Nombre del rol: "abogado" | "bufete" */
  rolNombre: string;
  /** ¿El usuario solicitó que sea privado? */
  esPrivadoSolicitado: boolean;
}

export interface OwnershipDecision {
  ownerType: "abogado" | "bufete";
  ownerId: string;
  esPrivado: boolean;
}

export class OwnershipPolicyService {
  /**
   * Determina el owner de un PROCESO recién creado.
   *
   * Reglas (en orden de prioridad):
   * 1. Si el actor es bufete → siempre ownerType=bufete, esPrivado=false
   * 2. Si el actor es abogado SIN firma → ownerType=abogado, esPrivado=false
   * 3. Si el actor es abogado CON firma:
   *    a. Bufete NO permite privados → ownerType=bufete, esPrivado=false
   *    b. Bufete SÍ permite privados:
   *       - esPrivadoSolicitado=true → ownerType=abogado, esPrivado=true
   *       - esPrivadoSolicitado=false → usa defaultProcesoEsCompartido del bufete
   */
  async resolveForProceso(ctx: OwnershipContext): Promise<OwnershipDecision> {
    if (ctx.rolNombre === "bufete") {
      return { ownerType: "bufete", ownerId: ctx.actorId, esPrivado: false };
    }

    if (ctx.rolNombre !== "abogado") {
      throw new Error(`Rol '${ctx.rolNombre}' no puede crear este recurso`);
    }

    // Abogado: consultar firmId
    const firmId = await this.getFirmId(ctx.actorId);

    if (!firmId) {
      return { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: false };
    }

    const settings = await storage.firmSettings.get(firmId);

    if (!settings.allowPrivateProcesos) {
      return { ownerType: "bufete", ownerId: firmId, esPrivado: false };
    }

    // esPrivadoSolicitado=true → privado; false → usa default del bufete (invertimos el flag "compartido")
    const esPrivado = ctx.esPrivadoSolicitado
      ? true
      : !settings.defaultProcesoEsCompartido;

    return esPrivado
      ? { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: true }
      : { ownerType: "bufete", ownerId: firmId, esPrivado: false };
  }

  /**
   * Determina el owner de un CLIENTE recién creado.
   * Misma lógica que proceso pero con allowPrivateClientes y defaultClienteEsCompartido.
   */
  async resolveForCliente(ctx: OwnershipContext): Promise<OwnershipDecision> {
    if (ctx.rolNombre === "bufete") {
      return { ownerType: "bufete", ownerId: ctx.actorId, esPrivado: false };
    }

    if (ctx.rolNombre !== "abogado") {
      throw new Error(`Rol '${ctx.rolNombre}' no puede crear este recurso`);
    }

    const firmId = await this.getFirmId(ctx.actorId);

    if (!firmId) {
      return { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: false };
    }

    const settings = await storage.firmSettings.get(firmId);

    if (!settings.allowPrivateClientes) {
      return { ownerType: "bufete", ownerId: firmId, esPrivado: false };
    }

    // esPrivadoSolicitado=true → privado; false → usa default del bufete (invertimos el flag "compartido")
    const esPrivado = ctx.esPrivadoSolicitado
      ? true
      : !settings.defaultClienteEsCompartido;

    return esPrivado
      ? { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: true }
      : { ownerType: "bufete", ownerId: firmId, esPrivado: false };
  }

  /**
   * Valida que el proceso tenga el mismo tipo de ownership que su cliente.
   * Lanza Error si hay inconsistencia.
   */
  async validateConsistenciaClienteProceso(
    clienteId: string,
    procesoEsPrivado: boolean,
  ): Promise<void> {
    const ownership = await storage.clienteOwnership.getActive(clienteId);
    if (!ownership) return; // cliente sin ownership aún — no bloquear

    // Si el cliente pertenece a un abogado, verificar si ese abogado tiene firma.
    // Un abogado independiente (sin firma) no tiene el concepto privado/bufete,
    // así que la validación de consistencia no aplica.
    if (ownership.ownerType === "abogado") {
      const firmId = await this.getFirmId(ownership.ownerId);
      if (!firmId) return; // abogado independiente — no hay bufete que proteger
    }

    const clienteEsPrivado = ownership.ownerType === "abogado";

    if (clienteEsPrivado && !procesoEsPrivado) {
      throw new Error(
        "No se puede crear un proceso del bufete para un cliente privado. El proceso debe ser también privado.",
      );
    }

    if (!clienteEsPrivado && procesoEsPrivado) {
      throw new Error(
        "No se puede crear un proceso privado para un cliente del bufete. El proceso debe pertenecer al bufete.",
      );
    }
  }

  /** Obtiene el firmId del abogado usando getLawyer por ID de perfil. */
  private async getFirmId(lawyerId: string): Promise<string | null> {
    const profile = await storage.lawyerProfiles.getLawyer(lawyerId);
    return profile?.firmId ?? null;
  }
}

export const ownershipPolicyService = new OwnershipPolicyService();
