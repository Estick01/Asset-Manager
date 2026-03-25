/**
 * TareaExtensionStorage
 * Observaciones, subtareas e historial de tareas.
 */

import { eq, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  tareaObservaciones,
  tareaSubtareas,
  tareaHistorial,
  tareaArchivos,
  type TareaObservacionDTO,
  type SubtareaDTO,
  type TareaHistorialDTO,
  type TareaAccion,
  type CreateSubtareaDTO,
  type UpdateSubtareaDTO,
  type TiempoUnidad,
  type TareaArchivoDTO,
} from "@/shared/schema";
import type { Database } from "../database-storage";

export class TareaExtensionStorage {
  constructor(private db: Database) {}

  // ── Observaciones ─────────────────────────────────────────────────────────

  async addObservacion(
    tareaId: string,
    autorId: string,
    autorNombre: string,
    contenido: string,
  ): Promise<TareaObservacionDTO> {
    const id = randomUUID();
    await this.db.insert(tareaObservaciones).values({
      id,
      tareaId,
      autorId,
      autorNombre,
      contenido,
    });
    return {
      id,
      tareaId,
      autor: { id: autorId, nombre: autorNombre },
      contenido,
      createdAt: new Date(),
    };
  }

  async getObservaciones(tareaId: string): Promise<TareaObservacionDTO[]> {
    const rows = await this.db
      .select()
      .from(tareaObservaciones)
      .where(eq(tareaObservaciones.tareaId, tareaId))
      .orderBy(desc(tareaObservaciones.createdAt));

    return rows.map(r => ({
      id:        r.id,
      tareaId:   r.tareaId,
      autor:     { id: r.autorId, nombre: r.autorNombre ?? "" },
      contenido: r.contenido,
      createdAt: r.createdAt,
    }));
  }

  // ── Subtareas ──────────────────────────────────────────────────────────────

  async addSubtarea(
    tareaId: string,
    dto: CreateSubtareaDTO,
    creadoPorId: string,
    creadoPorNombre: string,
  ): Promise<SubtareaDTO> {
    const id = randomUUID();

    // Count existing to assign orden
    const existing = await this.db
      .select({ id: tareaSubtareas.id })
      .from(tareaSubtareas)
      .where(eq(tareaSubtareas.tareaId, tareaId));

    await this.db.insert(tareaSubtareas).values({
      id,
      tareaId,
      titulo:         dto.titulo,
      descripcion:    dto.descripcion ?? null,
      estado:         "pendiente",
      tiempoEstimado: dto.tiempoEstimado != null ? String(dto.tiempoEstimado) : null,
      tiempoUnidad:   (dto.tiempoUnidad ?? null) as TiempoUnidad | null,
      creadoPorId,
      creadoPorNombre,
      orden:          existing.length,
    });

    return {
      id,
      tareaId,
      titulo:         dto.titulo,
      descripcion:    dto.descripcion ?? null,
      estado:         "pendiente",
      tiempoEstimado: dto.tiempoEstimado ?? null,
      tiempoUnidad:   dto.tiempoUnidad ?? null,
      completadaEn:   null,
      creadoPor:      { id: creadoPorId, nombre: creadoPorNombre },
      orden:          existing.length,
      createdAt:      new Date(),
    };
  }

  async getSubtareas(tareaId: string): Promise<SubtareaDTO[]> {
    const rows = await this.db
      .select()
      .from(tareaSubtareas)
      .where(eq(tareaSubtareas.tareaId, tareaId))
      .orderBy(asc(tareaSubtareas.orden), asc(tareaSubtareas.createdAt));

    return rows.map(r => ({
      id:             r.id,
      tareaId:        r.tareaId,
      titulo:         r.titulo,
      descripcion:    r.descripcion ?? null,
      estado:         r.estado,
      tiempoEstimado: r.tiempoEstimado != null ? parseFloat(String(r.tiempoEstimado)) : null,
      tiempoUnidad:   r.tiempoUnidad as TiempoUnidad | null,
      completadaEn:   r.completadaEn ?? null,
      creadoPor:      { id: r.creadoPorId, nombre: r.creadoPorNombre ?? "" },
      orden:          r.orden,
      createdAt:      r.createdAt,
    }));
  }

  async updateSubtarea(
    subtareaId: string,
    dto: UpdateSubtareaDTO,
    usuarioId: string,
  ): Promise<SubtareaDTO | null> {
    const updates: Partial<typeof tareaSubtareas.$inferInsert> = {};

    if (dto.titulo        !== undefined) updates.titulo        = dto.titulo;
    if (dto.descripcion   !== undefined) updates.descripcion   = dto.descripcion ?? null;
    if (dto.tiempoUnidad  !== undefined) updates.tiempoUnidad  = dto.tiempoUnidad as TiempoUnidad | null ?? null;
    if (dto.tiempoEstimado !== undefined) {
      updates.tiempoEstimado = dto.tiempoEstimado != null ? String(dto.tiempoEstimado) : null;
    }
    if (dto.estado !== undefined) {
      updates.estado       = dto.estado;
      updates.completadaEn = dto.estado === "completada" ? new Date() : null;
      if (dto.estado === "completada") {
        updates.completadaPorId = usuarioId;
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.db
        .update(tareaSubtareas)
        .set(updates)
        .where(eq(tareaSubtareas.id, subtareaId));
    }

    const row = await this.db.query.tareaSubtareas.findFirst({
      where: eq(tareaSubtareas.id, subtareaId),
    });
    if (!row) return null;

    return {
      id:             row.id,
      tareaId:        row.tareaId,
      titulo:         row.titulo,
      descripcion:    row.descripcion ?? null,
      estado:         row.estado,
      tiempoEstimado: row.tiempoEstimado != null ? parseFloat(String(row.tiempoEstimado)) : null,
      tiempoUnidad:   row.tiempoUnidad as TiempoUnidad | null,
      completadaEn:   row.completadaEn ?? null,
      creadoPor:      { id: row.creadoPorId, nombre: row.creadoPorNombre ?? "" },
      orden:          row.orden,
      createdAt:      row.createdAt,
    };
  }

  async deleteSubtarea(subtareaId: string): Promise<void> {
    await this.db
      .delete(tareaSubtareas)
      .where(eq(tareaSubtareas.id, subtareaId));
  }

  async countSubtareas(tareaId: string): Promise<{ total: number; completadas: number }> {
    const rows = await this.db
      .select({ estado: tareaSubtareas.estado })
      .from(tareaSubtareas)
      .where(eq(tareaSubtareas.tareaId, tareaId));

    return {
      total:       rows.length,
      completadas: rows.filter(r => r.estado === "completada").length,
    };
  }

  // ── Historial ──────────────────────────────────────────────────────────────

  async addHistorial(
    tareaId:       string,
    usuarioId:     string,
    usuarioNombre: string,
    accion:        TareaAccion,
    detalle?:      string,
  ): Promise<void> {
    await this.db.insert(tareaHistorial).values({
      id: randomUUID(),
      tareaId,
      usuarioId,
      usuarioNombre,
      accion,
      detalle: detalle ?? null,
    });
  }

  async getHistorial(tareaId: string): Promise<TareaHistorialDTO[]> {
    const rows = await this.db
      .select()
      .from(tareaHistorial)
      .where(eq(tareaHistorial.tareaId, tareaId))
      .orderBy(desc(tareaHistorial.createdAt));

    return rows.map(r => ({
      id:        r.id,
      tareaId:   r.tareaId,
      usuario:   { id: r.usuarioId, nombre: r.usuarioNombre ?? "" },
      accion:    r.accion as TareaAccion,
      detalle:   r.detalle ?? null,
      createdAt: r.createdAt,
    }));
  }

  // ── Archivos ───────────────────────────────────────────────────────────────

  async addArchivo(
    tareaId:      string,
    nombre:       string,
    url:          string,
    mimeType:     string,
    tamano:       number,
    subidoPorId:  string,
  ): Promise<TareaArchivoDTO> {
    const id = randomUUID();
    await this.db.insert(tareaArchivos).values({ id, tareaId, nombre, url, mimeType, tamano, subidoPorId });
    return {
      id, tareaId, nombre, url, mimeType, tamano,
      esImagen: mimeType.startsWith("image/"),
      subidoPorId,
      createdAt: new Date(),
    };
  }

  async getArchivos(tareaId: string): Promise<TareaArchivoDTO[]> {
    const rows = await this.db
      .select()
      .from(tareaArchivos)
      .where(eq(tareaArchivos.tareaId, tareaId))
      .orderBy(desc(tareaArchivos.createdAt));

    return rows.map(r => ({
      id:          r.id,
      tareaId:     r.tareaId,
      nombre:      r.nombre,
      url:         r.url,
      mimeType:    r.mimeType,
      tamano:      r.tamano,
      esImagen:    r.mimeType.startsWith("image/"),
      subidoPorId: r.subidoPorId,
      createdAt:   r.createdAt,
    }));
  }

  async deleteArchivo(archivoId: string): Promise<void> {
    await this.db.delete(tareaArchivos).where(eq(tareaArchivos.id, archivoId));
  }

  async findArchivo(archivoId: string): Promise<TareaArchivoDTO | null> {
    const row = await this.db.query.tareaArchivos.findFirst({
      where: eq(tareaArchivos.id, archivoId),
    });
    if (!row) return null;
    return {
      id:          row.id,
      tareaId:     row.tareaId,
      nombre:      row.nombre,
      url:         row.url,
      mimeType:    row.mimeType,
      tamano:      row.tamano,
      esImagen:    row.mimeType.startsWith("image/"),
      subidoPorId: row.subidoPorId,
      createdAt:   row.createdAt,
    };
  }
}
