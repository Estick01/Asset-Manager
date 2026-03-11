
import { notificacionesService } from "./notificacion.service";
import { Documento, EstadoProceso, InsertDocumento, InsertProceso, TiposProceso } from "@/shared/schema";
import { Actualizacion, InsertActualizacion } from '@/shared/schema/actualizaciones.schema';
import { ProcesoDTO } from "@/shared/schema/proceso.schema";
import { storage } from "../storage/storeage/database-storage";

export type ProcesoFilter = {
  estadoCodigo?: string;
  search?: string;
  hasResponsable?: boolean;
};

export class ProcesosService {

  async getProcesos(
    lawyerId: string,
    limit: number = 10,
    offset: number = 0,
    filter?: ProcesoFilter
  ): Promise<{ data: ProcesoDTO[]; total: number }> {
    return storage.procesos.getProcesos(lawyerId, limit, offset, filter);
  }

  async getProcesosCount(lawyerId: string, filter?: ProcesoFilter): Promise<number> {
    return storage.procesos.getProcesosCount(lawyerId, filter);
  }

  async getProcesosByCliente(
    clienteId: string,
    limit: number = 10,
    offset: number = 0,
    filter?: ProcesoFilter
  ): Promise<{ data: ProcesoDTO[]; total: number }> {
    return storage.procesos.getProcesosByCliente(clienteId, limit, offset, filter);
  }

  async getProceso(id: string): Promise<ProcesoDTO | undefined> {
    return storage.procesos.getProceso(id);
  }

  async createProceso(insertProceso: InsertProceso & { lawyerId?: string }): Promise<ProcesoDTO> {
    const { lawyerId, ...procesoData } = insertProceso;
    const newProceso = await storage.procesos.createProceso(procesoData);

    if (lawyerId) {
      await storage.procesos.addLawyerToProceso(newProceso.id, lawyerId, { rol: 'principal' });
    }

    return newProceso;
  }

  async updateProceso(id: string, updates: Partial<InsertProceso>): Promise<ProcesoDTO | undefined> {
    const currentProceso = await storage.procesos.getProceso(id);
    const updatedProceso = await storage.procesos.updateProceso(id, updates);

    if (updates.estadoId && currentProceso && currentProceso.estado?.id !== updates.estadoId) {
      try {
        const newEstado = await storage.estadosProceso.getEstadoProceso(updates.estadoId);
        const oldEstado = currentProceso.estado;
        const tipoProcesoNombre = currentProceso.tipoProceso?.nombre ?? 'Proceso';

        if (newEstado) {
          const lawyers = await storage.procesos.getProcesoLawyers(id);
          await Promise.all(
            lawyers.map(lawyer =>
              notificacionesService.notifyLawyer(
                lawyer.lawyerId,
                id,
                `Cambio de estado: ${tipoProcesoNombre}`,
                `El estado del proceso ha cambiado de "${oldEstado?.nombre ?? "Desconocido"}" a "${newEstado.nombre}"`,
                "estado_cambio"
              )
            )
          );
        }
      } catch (e) {
        console.error("Error creating notification:", e);
      }
    }

    return updatedProceso;
  }

  async deleteProceso(id: string): Promise<void> {
    return storage.procesos.deleteProceso(id);
  }

  // ── Actualizaciones ──────────────────────────────────────────────────────────

  async getActualizaciones(procesoId: string, limit: number = 10, offset: number = 0): Promise<Actualizacion[]> {
    return storage.actualizaciones.getActualizaciones(procesoId, limit, offset);
  }

  async createActualizacion(insertActualizacion: InsertActualizacion): Promise<Actualizacion> {
    const actualizacion = await storage.actualizaciones.createActualizacion(insertActualizacion);

    try {
      const proceso = await storage.procesos.getProceso(insertActualizacion.procesoId);
      if (!proceso) return actualizacion;

      const procesoId = insertActualizacion.procesoId;
      const titulo = `Nueva actualización en tu proceso`;
      const mensaje = insertActualizacion.titulo;
      const tipo = "actualizacion";

      // 1. Notificar al cliente
      if (proceso.clienteId) {
        await notificacionesService.notifyCliente(proceso.clienteId, procesoId, titulo, mensaje, tipo);
      }

      // 2. Notificar a los abogados asignados y recolectar firmIds únicos
      const lawyers = await storage.procesos.getProcesoLawyers(procesoId);
      const firmIds = new Set<string>();
      const notifiedLawyerIds = new Set<string>();

      for (const lawyer of lawyers) {
        await notificacionesService.notifyLawyer(lawyer.lawyerId, procesoId, titulo, mensaje, tipo);
        notifiedLawyerIds.add(lawyer.lawyerId);

        // Buscar el firmId del abogado
        const profile = await storage.lawyerProfiles.getLawyer(lawyer.lawyerId);
        if (profile?.firmId) firmIds.add(profile.firmId);
      }

      // 3. Notificar al responsable si no fue notificado como abogado asignado
      if (proceso.responsable?.id && !notifiedLawyerIds.has(proceso.responsable.id)) {
        await notificacionesService.notifyLawyer(proceso.responsable.id, procesoId, titulo, mensaje, tipo);
        const profile = await storage.lawyerProfiles.getLawyer(proceso.responsable.id);
        if (profile?.firmId) firmIds.add(profile.firmId);
      }

      // 4. Notificar a cada bufete único encontrado
      for (const firmId of firmIds) {
        await notificacionesService.notifyFirm(firmId, procesoId, titulo, mensaje, tipo);
      }

    } catch (e) {
      console.error("Error creating notification for actualizacion:", e);
    }

    return actualizacion;
  }

  async deleteActualizacion(id: string): Promise<void> {
    return storage.actualizaciones.deleteActualizacion(id);
  }

  // ── Documentos ───────────────────────────────────────────────────────────────

  async getDocumentos(procesoId: string): Promise<Documento[]> {
    return storage.documentos.getDocumentos(procesoId);
  }

  async getDocumento(id: string): Promise<Documento | undefined> {
    return storage.documentos.getDocumento(id);
  }

  async createDocumento(insertDocumento: InsertDocumento): Promise<Documento> {
    const documento = await storage.documentos.createDocumento(insertDocumento);

    try {
      const proceso = await storage.procesos.getProceso(insertDocumento.procesoId);
      if (!proceso) return documento;

      const procesoId = insertDocumento.procesoId;
      const titulo = `Nuevo documento en tu proceso`;
      const mensaje = `Se subió el documento: ${insertDocumento.descripcion || "documento"}`;
      const tipo = "nuevo_documento";

      // 1. Notificar al cliente
      if (proceso.clienteId) {
        await notificacionesService.notifyCliente(proceso.clienteId, procesoId, titulo, mensaje, tipo);
      }

      // 2. Notificar a los abogados asignados y recolectar firmIds únicos
      const lawyers = await storage.procesos.getProcesoLawyers(procesoId);
      const firmIds = new Set<string>();
      const notifiedLawyerIds = new Set<string>();

      for (const lawyer of lawyers) {
        await notificacionesService.notifyLawyer(lawyer.lawyerId, procesoId, titulo, mensaje, tipo);
        notifiedLawyerIds.add(lawyer.lawyerId);

        const profile = await storage.lawyerProfiles.getLawyer(lawyer.lawyerId);
        if (profile?.firmId) firmIds.add(profile.firmId);
      }

      // 3. Notificar al responsable si no fue notificado como abogado asignado
      if (proceso.responsable?.id && !notifiedLawyerIds.has(proceso.responsable.id)) {
        await notificacionesService.notifyLawyer(proceso.responsable.id, procesoId, titulo, mensaje, tipo);
        const profile = await storage.lawyerProfiles.getLawyer(proceso.responsable.id);
        if (profile?.firmId) firmIds.add(profile.firmId);
      }

      // 4. Notificar a cada bufete único encontrado
      for (const firmId of firmIds) {
        await notificacionesService.notifyFirm(firmId, procesoId, titulo, mensaje, tipo);
      }

    } catch (e) {
      console.error("Error creating notification for documento:", e);
    }

    return documento;
  }

  async deleteDocumento(id: string): Promise<void> {
    return storage.documentos.deleteDocumento(id);
  }

  // ── Tipos de Proceso ─────────────────────────────────────────────────────────

  async getTiposProceso(): Promise<TiposProceso[]> {
    return storage.tiposProceso.getTiposProceso();
  }

  async createTipoProceso(tipo: { nombre: string; descripcion?: string }): Promise<TiposProceso> {
    return storage.tiposProceso.createTipoProceso(tipo);
  }

  async updateTipoProceso(id: number, updates: { nombre?: string; descripcion?: string; activo?: boolean }): Promise<TiposProceso | undefined> {
    return storage.tiposProceso.updateTipoProceso(id, updates);
  }

  async deleteTipoProceso(id: number): Promise<void> {
    return storage.tiposProceso.deleteTipoProceso(id);
  }

  // ── Estados de Proceso ───────────────────────────────────────────────────────

  async getEstadosProceso(): Promise<EstadoProceso[]> {
    return storage.estadosProceso.getEstadosProceso();
  }

  async createEstado(estado: { nombre: string; codigo: string; color: string }): Promise<EstadoProceso> {
    return storage.estadosProceso.createEstadoProceso(estado);
  }
}

export const procesosService = new ProcesosService();
