import { InsertNotificacion, Notificacion, notificaciones } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { ProcesoDTO } from "@/shared/schema/proceso.schema";



export class NotificacionesService {
  async getNotificacionesByClienteId(clienteId: string): Promise<Notificacion[]> {
    try {
      return await db
        .select()
        .from(notificaciones)
        .where(eq(notificaciones.clienteId, clienteId))
        .orderBy(desc(notificaciones.createdAt));
    } catch (e) {
      console.error("Error getting notificaciones:", e);
      return [];
    }
  }

  async getNotificacionesCountByClienteId(clienteId: string): Promise<number> {
    try {
      const results = await db
        .select()
        .from(notificaciones)
        .where(and(
          eq(notificaciones.clienteId, clienteId),
          eq(notificaciones.leidoCliente, false)
        ));
      return results.length;
    } catch (e) {
      console.error("Error getting notificaciones count:", e);
      return 0;
    }
  }

  async markNotificacionLeidaCliente(notificacionId: number): Promise<void> {
    await db
      .update(notificaciones)
      .set({ leidoCliente: true, updatedAt: new Date() })
      .where(eq(notificaciones.id, notificacionId));
  }

  async getNotificacionesByAbogadoId(abogadoId: string): Promise<Notificacion[]> {
    try {
      return await db
        .select()
        .from(notificaciones)
        .where(eq(notificaciones.lawyerId, abogadoId))
        .orderBy(desc(notificaciones.createdAt));
    } catch (e) {
      console.error("Error getting notificaciones:", e);
      return [];
    }
  }

  async getNotificacionesCountByAbogadoId(abogadoId: string): Promise<number> {
    try {
      const results = await db
        .select()
        .from(notificaciones)
        .where(and(
          eq(notificaciones.lawyerId, abogadoId),
          eq(notificaciones.leidoLawyer, false)
        ));
      return results.length;
    } catch (e) {
      console.error("Error getting notificaciones count:", e);
      return 0;
    }
  }

  async markNotificacionLeidaAbogado(notificacionId: number): Promise<void> {
    await db
      .update(notificaciones)
      .set({ leidoLawyer: true, updatedAt: new Date() })
      .where(eq(notificaciones.id, notificacionId));
  }

  async createNotificacion(notificacion: InsertNotificacion): Promise<Notificacion> {
    const newNotificacion = {
      ...notificacion,
      tipo: notificacion.tipo || "estado_cambio",
      leidoCliente: false,
      leidoAbogado: false,
    };
    await db.insert(notificaciones).values(newNotificacion);
    
    const results = await db
      .select()
      .from(notificaciones)
      .where(eq(notificaciones.procesoId, notificacion.procesoId))
      .orderBy(desc(notificaciones.createdAt));
    return results[0];
  }

    async notifyProcesoLawyers(
      proceso: ProcesoDTO,
      data: {
        titulo: string;
        mensaje: string;
        tipo: string;
      }
    ): Promise<{ success: boolean; count: number }> {

      if (!proceso.lawyers?.length) {
        return { success: true, count: 0 };
      }

      const results = await Promise.all(
        proceso.lawyers.map((pl) =>
          notificacionesService.createNotificacion({
            procesoId: proceso.id,
            clienteId: proceso.clienteId,
            lawyerId: pl.lawyer.userId,
            titulo: data.titulo,
            mensaje: data.mensaje,
            tipo: data.tipo,
          })
        )
      );

      return {
        success: true,
        count: results.length,
      };
    }
}

export const notificacionesService = new NotificacionesService();