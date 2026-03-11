import { storage } from "../storage/storeage/database-storage.js";
import type { InsertNotificacion, Notificacion } from "@/shared/schema";

export class NotificacionesService {

  async createNotificacion(data: InsertNotificacion): Promise<Notificacion> {
    return storage.notificaciones.createNotificacion(data);
  }

  // ── Targeted helpers ──────────────────────────────────────────────────────

  /** Notify a single lawyer */
  async notifyLawyer(
    lawyerId: string,
    procesoId: string,
    titulo: string,
    mensaje: string,
    tipo: string,
  ): Promise<void> {
    try {
      await storage.notificaciones.createNotificacion({
        procesoId,
        lawyerId,
        titulo,
        mensaje,
        tipo,
      });
    } catch (err) {
      console.error("[notificaciones] notifyLawyer error:", err);
    }
  }

  /** Notify a client */
  async notifyCliente(
    clienteId: string,
    procesoId: string,
    titulo: string,
    mensaje: string,
    tipo: string,
  ): Promise<void> {
    try {
      await storage.notificaciones.createNotificacion({
        procesoId,
        clienteId,
        titulo,
        mensaje,
        tipo,
      });
    } catch (err) {
      console.error("[notificaciones] notifyCliente error:", err);
    }
  }

  /** Notify a firm */
  async notifyFirm(
    firmId: string,
    procesoId: string,
    titulo: string,
    mensaje: string,
    tipo: string,
  ): Promise<void> {
    try {
      await storage.notificaciones.createNotificacion({
        procesoId,
        firmId,
        titulo,
        mensaje,
        tipo,
      });
    } catch (err) {
      console.error("[notificaciones] notifyFirm error:", err);
    }
  }

  // ── Domain events ─────────────────────────────────────────────────────────

  /** Called when a new tarea is created — notifies the assigned lawyer and/or the firm. */
  async onTareaCreada(opts: {
    procesoId: string;
    procoNombre:string;
    tareaTitle: string;
    lawlerId: string | null;
    creadoPorNombre: string | null;
    firmId: string | null;
  }): Promise<void> {
    // Notify assigned lawyer (if any)
    if (opts.lawlerId) {
      await this.notifyLawyer(
        opts.lawlerId,
        opts.procesoId,
        "Nueva tarea creada en proceso",
        `se creó la tarea: "${opts.tareaTitle}" en el proceso: "${opts.procoNombre}" por ${opts.creadoPorNombre ?? "Alguien"}`,
        "nueva_tarea",
      );
    }

    // Notify firm (if any and different from assigned lawyer to avoid duplicates)
    if (opts.firmId) {
      await this.notifyFirm(
        opts.firmId,
        opts.procesoId,
        "Nueva tarea creada",
        `se creó la tarea: "${opts.tareaTitle}" en el proceso: "${opts.procoNombre}" por ${opts.creadoPorNombre ?? "Alguien"}`,
        "nueva_tarea",
      );
    }
  }

  /** Called when a tarea is marked completada — notifies creator and the firm. */
  async onTareaCompletada(opts: {
    procesoId: string;
    tareaTitle: string;
    creadoPorId: string;
    responsableNombre: string | null;
    firmId: string | null;
  }): Promise<void> {
    // Notify task creator
    await this.notifyLawyer(
      opts.creadoPorId,
      opts.procesoId,
      "Tarea completada",
      `${opts.responsableNombre ?? "Un abogado"} completó la tarea: "${opts.tareaTitle}"`,
      "tarea_completada",
    );

    // Notify firm
    if (opts.firmId) {
      await this.notifyFirm(
        opts.firmId,
        opts.procesoId,
        "Tarea completada",
        `${opts.responsableNombre ?? "Un abogado"} completó la tarea: "${opts.tareaTitle}"`,
        "tarea_completada",
      );
    }
  }

  /** Called when an actualizacion is added — notifies the process client. */
  async onActualizacionCreada(opts: {
    procesoId: string;
    clienteId: string;
    titulo: string;
  }): Promise<void> {
    await this.notifyCliente(
      opts.clienteId,
      opts.procesoId,
      "Nueva actualización en tu proceso",
      `Se agregó la actualización: "${opts.titulo}"`,
      "nueva_actualizacion",
    );
  }

  /** Called when a document is uploaded — notifies the process client. */
  async onDocumentoSubido(opts: {
    procesoId: string;
    clienteId: string;
    documentoNombre: string;
  }): Promise<void> {
    await this.notifyCliente(
      opts.clienteId,
      opts.procesoId,
      "Nuevo documento disponible",
      `Se subió el documento: "${opts.documentoNombre}" a tu proceso`,
      "nuevo_documento",
    );
  }
}

export const notificacionesService = new NotificacionesService();
