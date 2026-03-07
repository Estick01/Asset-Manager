import { desc, and, eq } from "drizzle-orm";
import { InsertNotificacion, Notificacion, notificaciones } from "@/shared/schema";


export class NotificacionStorage {
  constructor(private db: any) {}

  // ============================
  // Crear Notificación
  // ============================
  async createNotificacion(
    data: InsertNotificacion
  ): Promise<Notificacion> {
    const newNotificacion = {
      ...data,
      leidoCliente: data.leidoCliente ?? false,
      leidoLawyer: data.leidoLawyer ?? false,
      createdAt: new Date(),
    };

    await this.db.insert(notificaciones).values(newNotificacion);

    return newNotificacion as Notificacion;
  }

  // ============================
  // Obtener notificaciones por cliente
  // ============================
  async getNotificacionesByClienteId(
    clienteId: string
  ): Promise<Notificacion[]> {
    return this.db.query.notificaciones.findMany({
      where: eq(notificaciones.clienteId, clienteId),
      orderBy: [desc(notificaciones.createdAt)],
    });
  }

  // ============================
  // Obtener notificaciones por abogado
  // ============================
  async getNotificacionesByLawyerId(
    lawyerId: string
  ): Promise<Notificacion[]> {
    return this.db.query.notificaciones.findMany({
      where: eq(notificaciones.lawyerId, lawyerId),
      orderBy: [desc(notificaciones.createdAt)],
    });
  }

  // ============================
  // Obtener no leídas por cliente
  // ============================
  async getNotificacionesNoLeidasByClienteId(
    clienteId: string
  ): Promise<Notificacion[]> {
    return this.db.query.notificaciones.findMany({
      where: and(
        eq(notificaciones.clienteId, clienteId),
        eq(notificaciones.leidoCliente, false)
      ),
    });
  }

  // ============================
  // Obtener no leídas por abogado
  // ============================
  async getNotificacionesNoLeidasByLawyerId(
    lawyerId: string
  ): Promise<Notificacion[]> {
    return this.db.query.notificaciones.findMany({
      where: and(
        eq(notificaciones.lawyerId, lawyerId),
        eq(notificaciones.leidoLawyer, false)
      ),
    });
  }

  // ============================
  // Contar no leídas por cliente
  // ============================
  async countNoLeidasByClienteId(clienteId: string): Promise<number> {
    const result = await this.getNotificacionesNoLeidasByClienteId(clienteId);
    return result.length;
  }

  // ============================
  // Contar no leídas por abogado
  // ============================
  async countNoLeidasByLawyerId(lawyerId: string): Promise<number> {
    const result = await this.getNotificacionesNoLeidasByLawyerId(lawyerId);
    return result.length;
  }

  // ============================
  // Marcar como leída por cliente
  // ============================
  async marcarComoLeidaByClienteId(id: number): Promise<void> {
    await this.db
      .update(notificaciones)
      .set({ leidoCliente: true })
      .where(eq(notificaciones.id, id));
  }

  // ============================
  // Marcar como leída por abogado
  // ============================
  async marcarComoLeidaByLawyerId(id: number): Promise<void> {
    await this.db
      .update(notificaciones)
      .set({ leidoLawyer: true })
      .where(eq(notificaciones.id, id));
  }

  // ============================
  // Marcar todas como leídas por cliente
  // ============================
  async marcarTodasComoLeidasByClienteId(clienteId: string): Promise<void> {
    await this.db
      .update(notificaciones)
      .set({ leidoCliente: true })
      .where(eq(notificaciones.clienteId, clienteId));
  }

  // ============================
  // Marcar todas como leídas por abogado
  // ============================
  async marcarTodasComoLeidasByLawyerId(lawyerId: string): Promise<void> {
    await this.db
      .update(notificaciones)
      .set({ leidoLawyer: true })
      .where(eq(notificaciones.lawyerId, lawyerId));
  }

  // ============================
  // Eliminar
  // ============================
  async deleteNotificacion(id: number): Promise<void> {
    await this.db
      .delete(notificaciones)
      .where(eq(notificaciones.id, id));
  }
}
