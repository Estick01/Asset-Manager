import { storage } from "../storage/storeage/database-storage.js";
import { HttpException } from "../middleware/http-exception.js";
import { notificacionesService } from "./notificacion.service.js";
import type {
  CreateTareaDTO,
  UpdateTareaDTO,
  CambiarEstadoDTO,
  TareaResponseDTO,
  TareasProgresoDTO,
  MisTareasDTO,
  TareaEstado,
} from "@/shared/schema";
import type { InsertActualizacion } from "@/shared/schema/actualizaciones.schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// Valid state transitions
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<TareaEstado, TareaEstado[]> = {
  pendiente:   ["en_progreso", "completada", "cancelada"],
  en_progreso: ["pendiente", "completada", "cancelada"],
  completada:  ["en_progreso", "cancelada"],
  cancelada:   [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface CallerProfile {
  id: string;
  nombre: string | null;
  type: "lawyer" | "firm";
}

/**
 * Resolves the acting profile (lawyer or firm) for a given userId.
 * Tries lawyerProfiles first, then firmProfiles.
 */
async function resolveCaller(userId: string): Promise<CallerProfile> {
  const lawyerProfile = await storage.abogados.getLawyerByUserId(userId);
  if (lawyerProfile) {
    const lawyer = await storage.abogados.getLawyer(lawyerProfile.id);
    const nombre = lawyer?.persona
      ? `${lawyer.persona.nombre ?? ""} ${lawyer.persona.apellido ?? ""}`.trim()
      : "";
    return { id: lawyerProfile.id, nombre, type: "lawyer" };
  }
  const firm = await storage.firmProfiles.getFirmProfileByUserId(userId);
  if (firm) {
    return { id: firm.id, nombre: firm.name, type: "firm" };
  }
  throw HttpException.notFound("Perfil no encontrado");
}

/**
 * Resolves display name for a profile id (lawyer or firm).
 */
async function resolveProfileName(profileId: string): Promise<string | null> {
  const lawyer = await storage.abogados.getLawyer(profileId);
  if (lawyer) {
    return lawyer.persona
      ? `${lawyer.persona.nombre ?? ""} ${lawyer.persona.apellido ?? ""}`.trim()
      : null;
  }
  const firm = await storage.firmProfiles.getFirmProfileById(profileId);
  return firm?.name ?? null;
}

/**
 * Asserts that a caller has access to the proceso.
 * - Lawyer: must be directly listed in procesoLawyers.
 * - Firm: has access if any of its lawyers is in procesoLawyers.
 */
async function assertProcesoAccess(procesoId: string, caller: CallerProfile): Promise<void> {

  const members = await storage.procesos.getProcesoLawyers(procesoId);
  const memberIds = new Set(members.map((l) => l.lawyerId));

  if (caller.type === "lawyer") {
    if (memberIds.has(caller.id)) return;
    // Also grant access if the caller is the active responsable
    const resp = await isResponsable(procesoId, caller.id);
    if (!resp) throw HttpException.forbidden("No tienes acceso a este proceso");
    return;
  }

  // firm: access if the firm's own profile ID is directly in procesoLawyers
  // OR if any of the firm's lawyers is in procesoLawyers
  if (memberIds.has(caller.id)) return;

  const firmLawyers = await storage.abogados.getLawyersByFirm(caller.id);
  const hasMember = firmLawyers.some((l) => memberIds.has(l.id));
  if (!hasMember) {
    throw HttpException.forbidden("No tienes acceso a este proceso");
  }
}

/** Returns true if the caller is the active responsable of the process */
async function isResponsable(procesoId: string, profileId: string): Promise<boolean> {
  const proceso = await storage.procesos.getProceso(procesoId);
  return proceso?.responsable?.id === profileId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class TareaService {

  // ── Create ─────────────────────────────────────────────────────────────────

  async createTarea(
    procesoId: string,
    dto: CreateTareaDTO,
    callerUserId: string,
  ): Promise<TareaResponseDTO> {
    const caller = await resolveCaller(callerUserId);

    // Verify proceso exists
    const proceso = await storage.procesos.getProceso(procesoId);
    if (!proceso) throw HttpException.notFound("Proceso no encontrado");

    // Caller must be a member of the proceso
    await assertProcesoAccess(procesoId, caller);

    // Validate asignadoA
    let asignadoANombre: string | null = null;
    if (dto.asignadoA) {
      // Must be a member of the proceso
      const lawyers = await storage.procesos.getProcesoLawyers(procesoId);
      const isMember = lawyers.some((l) => l.lawyerId === dto.asignadoA);
      if (!isMember) {
        throw HttpException.badRequest("El perfil asignado no pertenece a este proceso");
      }
      // Caller can only assign to others if they are responsable
      if (dto.asignadoA !== caller.id) {
        const canAssign = await isResponsable(procesoId, caller.id);
        if (!canAssign) {
          throw HttpException.forbidden("Solo el responsable puede asignar tareas a otros");
        }
      }
      asignadoANombre = await resolveProfileName(dto.asignadoA);
    }

    const tarea = await storage.tareas.create({
      procesoId,
      titulo: dto.titulo,
      descripcion: dto.descripcion ?? null,
      prioridad: dto.prioridad ?? "media",
      fechaLimite: dto.fechaLimite ? new Date(dto.fechaLimite) : null,
      asignadoA: dto.asignadoA ?? null,
      asignadoANombre,
      creadoPor: caller.id,
      creadoPorNombre: caller.nombre,
      legalStage: dto.legalStage ?? null,
      requerida: dto.requerida ? 1 : 0,
    });

    // Notify responsable/caller + firm (fire-and-forget)
    (async () => {
      // lawlerId: responsable del proceso si existe, si no el caller (si es abogado)
      const lawlerId: string | null =
        proceso.responsable?.id ?? (caller.type === "lawyer" ? caller.id : null);

      // firmId: obtenido del abogado destino de la notificación
      let firmId: string | null = null;
      if (lawlerId) {
        const lawyer = await storage.abogados.getLawyer(lawlerId);
        firmId = lawyer?.firmId ?? null;
      }

      await notificacionesService.onTareaCreada({
        procesoId,
        procoNombre: proceso.radicado,
        tareaTitle: dto.titulo,
        lawlerId,
        creadoPorNombre: caller.nombre,
        firmId,
      });
    })().catch(() => {});

    return tarea;
  }

  // ── List by proceso ────────────────────────────────────────────────────────

  async getTareasByProceso(
    procesoId: string,
    callerUserId: string,
    stage?: string,
  ): Promise<TareasProgresoDTO> {
    const caller = await resolveCaller(callerUserId);
    await assertProcesoAccess(procesoId, caller);

    const tareas = await storage.tareas.findByProceso(procesoId, stage);

    // Progreso: exclude cancelled from denominator
    const active = tareas.filter((t) => t.estado !== "cancelada");
    const completadas = active.filter((t) => t.estado === "completada").length;
    const total = active.length;

    return {
      tareas,
      progreso: {
        total,
        completadas,
        porcentaje: total === 0 ? 0 : Math.round((completadas / total) * 100),
      },
    };
  }

  // ── My tasks ───────────────────────────────────────────────────────────────

  async getMisTareas(callerUserId: string): Promise<MisTareasDTO> {
    const caller = await resolveCaller(callerUserId);
    return storage.tareas.findByLawyer(caller.id);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async updateTarea(
    tareaId: string,
    dto: UpdateTareaDTO,
    callerUserId: string,
  ): Promise<TareaResponseDTO> {
    const caller = await resolveCaller(callerUserId);

    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");

    // Regla: tarea cancelada no puede modificarse
    if (tarea.estado === "cancelada") {
      throw HttpException.unprocessable("Una tarea cancelada no puede modificarse");
    }

    await assertProcesoAccess(tarea.procesoId, caller);

    // Firm can edit any task; lawyers can only edit tasks they created
    if (caller.type === "lawyer" && tarea.creadoPor !== caller.id) {
      throw HttpException.forbidden("Solo puedes modificar las tareas que creaste");
    }

    // Resolve new assignee if changed
    let asignadoANombre = tarea.asignadoANombre;
    if (dto.asignadoA !== undefined) {
      if (dto.asignadoA && dto.asignadoA !== caller.id) {
        const canAssign = await isResponsable(tarea.procesoId, caller.id);
        if (!canAssign) {
          throw HttpException.forbidden("Solo el responsable puede reasignar tareas a otros");
        }
      }
      asignadoANombre = dto.asignadoA
        ? await resolveProfileName(dto.asignadoA)
        : null;
    }

    const updated = await storage.tareas.update(tareaId, {
      ...(dto.titulo !== undefined      && { titulo:      dto.titulo }),
      ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
      ...(dto.prioridad !== undefined   && { prioridad:   dto.prioridad }),
      ...(dto.fechaLimite !== undefined && { fechaLimite: dto.fechaLimite ? new Date(dto.fechaLimite) : null }),
      ...(dto.asignadoA !== undefined   && { asignadoA: dto.asignadoA, asignadoANombre }),
    });

    return updated!;
  }

  // ── Change estado ──────────────────────────────────────────────────────────

  async cambiarEstado(
    tareaId: string,
    dto: CambiarEstadoDTO,
    callerUserId: string,
  ): Promise<TareaResponseDTO> {
    const caller = await resolveCaller(callerUserId);

    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");

    await assertProcesoAccess(tarea.procesoId, caller);

    // Firm → full control. Creator → full control.
    // Responsable (but not creator) → can only mark as "completada".
    // Any other lawyer → denied.
    // Exception: any lawyer in the proceso can move a task to "en_progreso" (they auto-become assignee).
    if (caller.type === "lawyer" && tarea.creadoPor !== caller.id) {
      if (dto.estado === "en_progreso") {
        // Allow: moving to en_progreso auto-assigns the task to this lawyer
      } else {
        const resp = await isResponsable(tarea.procesoId, caller.id);
        if (!resp) {
          throw HttpException.forbidden("Solo puedes cambiar el estado de las tareas que creaste");
        }
        if (dto.estado !== "completada") {
          throw HttpException.forbidden("El responsable solo puede marcar tareas como completadas");
        }
      }
    }

    const current = tarea.estado as TareaEstado;
    const allowed = ALLOWED_TRANSITIONS[current];

    if (!allowed.includes(dto.estado)) {
      throw HttpException.unprocessable(
        `No se puede cambiar de '${current}' a '${dto.estado}'`,
      );
    }


    if (dto.estado === "completada" && tarea.asignadoA !== null) {
      if (caller.id !== tarea.asignadoA) {
        throw HttpException.unprocessable(
          `No se puede completar la tarea ya que no esta asignada a usted, la tarea pertenece a ${tarea.asignadoANombre}`,
        );
      }
    }

    const fechaCompletada = dto.estado === "completada" ? new Date() : null;

    await storage.tareas.updateEstado(tareaId, dto.estado, fechaCompletada);

    // Auto-assign to the lawyer who took the task
    if (dto.estado === "en_progreso") {
      await storage.tareas.update(tareaId, {
        asignadoA: caller.id,
        asignadoANombre: caller.nombre,
      });
    }


    // Create timeline entry (actualizacion) when task is completed
    if (dto.estado === "completada") {
      try {
        const actualizacion: InsertActualizacion = {
          procesoId: tarea.procesoId,
          titulo: tarea.titulo,
          fecha: new Date(),
          descripcion: tarea.descripcion ?? "",
          tipoId: 3,
          tipo: "tarea",
        };
        await storage.createActualizacion(actualizacion);
      } catch (err) {
        console.error("Error creating actualizacion for task completion:", err);
      }

      // Auto-event: emit tarea_completada to the stage timeline
      if (tarea.legalStage) {
        try {
          await storage.stageEvents.insert({
            procesoId: tarea.procesoId,
            legalStageCode: tarea.legalStage,
            tipo: "tarea_completada",
            descripcion: `Tarea completada: ${tarea.titulo}`,
            metadatos: { tareaId: tarea.id, titulo: tarea.titulo },
            creadoPor: caller.id,
          });
        } catch (err) {
          console.error("Error creating stage event for task completion:", err);
        }
      }

      // Notify task creator + firm + client (fire-and-forget)
      (async () => {
        const responsableLawyer = caller.type === "lawyer"
          ? await storage.abogados.getLawyer(caller.id)
          : null;
        const firmId = responsableLawyer?.firmId ?? null;

        // Get proceso to notify client
        const proceso = await storage.procesos.getProceso(tarea.procesoId);

        await Promise.all([
          notificacionesService.onTareaCompletada({
            procesoId: tarea.procesoId,
            tareaTitle: tarea.titulo,
            creadoPorId: tarea.creadoPor,
            responsableNombre: caller.nombre,
            firmId,
          }),
          proceso?.clienteId
            ? notificacionesService.notifyCliente(
                proceso.clienteId,
                tarea.procesoId,
                "Nuevo avance en tu proceso",
                `Se agrego el nuevo avance:"${tarea.titulo}" a tu proceso`,
                "Avance completado",
              )
            : Promise.resolve(),
        ]);
      })().catch(() => {});
    }

    return (await storage.tareas.findById(tareaId))!;
  }

  // ── Completar (shorthand) ──────────────────────────────────────────────────

  async completarTarea(tareaId: string, callerUserId: string): Promise<TareaResponseDTO> {
    return this.cambiarEstado(tareaId, { estado: "completada" }, callerUserId);
  }

  // ── Count by lawyer ────────────────────────────────────────────────────────

  async countByLawyer(lawyerId: string) {
    return storage.tareas.countByLawyer(lawyerId);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async deleteTarea(tareaId: string, callerUserId: string): Promise<void> {
    const caller = await resolveCaller(callerUserId);

    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");

    // Only creator can delete
    if (tarea.creadoPor !== caller.id) {
      throw HttpException.forbidden("Solo el creador puede eliminar la tarea");
    }

    // Cannot delete a task that is already in progress
    if (tarea.estado === "en_progreso") {
      throw HttpException.badRequest("No se puede eliminar una tarea que ya está en progreso");
    }

    await storage.tareas.softDelete(tareaId);
  }
}

export const tareaService = new TareaService();
