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
      leidoFirma: data.leidoFirma ?? false,
      createdAt: new Date(),
    };

    await this.db.insert(notificaciones).values(newNotificacion);

    // Return the just-inserted row
    const rows = await this.db
      .select()
      .from(notificaciones)
      .where(eq(notificaciones.procesoId, data.procesoId))
      .orderBy(desc(notificaciones.createdAt))
      .limit(1);

    return rows[0] ?? (newNotificacion as Notificacion);
  }

  // ============================
  // Obtener notificaciones por cliente
  // ============================
  async getNotificacionesByClienteId(
    clienteId: string
  ): Promise<Notificacion[]> {
    return this.db
      .select()
      .from(notificaciones)
      .where(eq(notificaciones.clienteId, clienteId))
      .orderBy(desc(notificaciones.createdAt));
  }

  // ============================
  // Obtener notificaciones por abogado
  // ============================
  async getNotificacionesByLawyerId(
    lawyerId: string
  ): Promise<Notificacion[]> {
    return this.db
      .select()
      .from(notificaciones)
      .where(eq(notificaciones.lawyerId, lawyerId))
      .orderBy(desc(notificaciones.createdAt));
  }

  // ============================
  // Obtener notificaciones por firma
  // ============================
  async getNotificacionesByFirmId(
    firmId: string
  ): Promise<Notificacion[]> {
    return this.db
      .select()
      .from(notificaciones)
      .where(eq(notificaciones.firmId, firmId))
      .orderBy(desc(notificaciones.createdAt));
  }

  // ============================
  // Contar no leídas por cliente
  // ============================
  async countNoLeidasByClienteId(clienteId: string): Promise<number> {
    const result = await this.db
      .select()
      .from(notificaciones)
      .where(and(
        eq(notificaciones.clienteId, clienteId),
        eq(notificaciones.leidoCliente, false)
      ));
    return result.length;
  }

  // ============================
  // Contar no leídas por abogado
  // ============================
  async countNoLeidasByLawyerId(lawyerId: string): Promise<number> {
    const result = await this.db
      .select()
      .from(notificaciones)
      .where(and(
        eq(notificaciones.lawyerId, lawyerId),
        eq(notificaciones.leidoLawyer, false)
      ));
    return result.length;
  }

  // ============================
  // Contar no leídas por firma
  // ============================
  async countNoLeidasByFirmId(firmId: string): Promise<number> {
    const result = await this.db
      .select()
      .from(notificaciones)
      .where(and(
        eq(notificaciones.firmId, firmId),
        eq(notificaciones.leidoFirma, false)
      ));
    return result.length;
  }

  // ============================
  // Marcar como leída por cliente
  // ============================
  async marcarComoLeidaByClienteId(id: number, clienteId: string): Promise<void> {
    await this.db
      .update(notificaciones)
      .set({ leidoCliente: true })
      .where(and(eq(notificaciones.id, id), eq(notificaciones.clienteId, clienteId)));
  }

  // ============================
  // Marcar como leída por abogado
  // ============================
  async marcarComoLeidaByLawyerId(id: number, lawyerId: string): Promise<void> {
    await this.db
      .update(notificaciones)
      .set({ leidoLawyer: true })
      .where(and(eq(notificaciones.id, id), eq(notificaciones.lawyerId, lawyerId)));
  }

  // ============================
  // Marcar como leída por firma
  // ============================
  async marcarComoLeidaByFirmaId(id: number, firmaId: string): Promise<void> {
    await this.db
      .update(notificaciones)
      .set({ leidoFirma: true })
      .where(and(eq(notificaciones.id, id), eq(notificaciones.firmId, firmaId)));
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
  // Marcar todas como leídas por firma
  // ============================
  async marcarTodasComoLeidasByFirmId(firmId: string): Promise<void> {
    await this.db
      .update(notificaciones)
      .set({ leidoFirma: true })
      .where(eq(notificaciones.firmId, firmId));
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
