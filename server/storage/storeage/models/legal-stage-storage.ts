import { eq, and, asc, isNull, or } from "drizzle-orm";
import {
  etapasPorTipoProceso,
  type EtapaPorTipoProceso,
  type InsertEtapaPorTipoProceso,
  type EtapaProcesoDTO,
  type LegalStagesResponseDTO,
} from "@/shared/schema";
import type { Database } from "../database-storage";

export class LegalStageStorage {
  constructor(private db: Database) {}

  // ── Consultas ──────────────────────────────────────────────────────────────

  /**
   * Etapas disponibles para un tipo de proceso.
   * Devuelve las específicas del tipo + las genéricas (tipo_proceso_id = NULL),
   * priorizando las específicas cuando hay el mismo código.
   */
  async getByTipoProceso(tipoProcesoId: number | null): Promise<EtapaPorTipoProceso[]> {
    const rows = await this.db
      .select()
      .from(etapasPorTipoProceso)
      .where(
        and(
          eq(etapasPorTipoProceso.activo, 1),
          tipoProcesoId
            ? or(
                eq(etapasPorTipoProceso.tipoProcesoId, tipoProcesoId),
                isNull(etapasPorTipoProceso.tipoProcesoId),
              )
            : isNull(etapasPorTipoProceso.tipoProcesoId),
        ),
      )
      .orderBy(asc(etapasPorTipoProceso.orden));

    // Si hay tipo específico: filtrar duplicados — preferir la específica sobre la genérica
    if (!tipoProcesoId) return rows;

    const seen = new Map<string, EtapaPorTipoProceso>();
    for (const row of rows) {
      const existing = seen.get(row.codigo);
      if (!existing || row.tipoProcesoId !== null) {
        seen.set(row.codigo, row);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.orden - b.orden);
  }

  /** Etapa por código dentro de un tipo de proceso */
  async getByCodigoYTipo(
    codigo: string,
    tipoProcesoId: number | null,
  ): Promise<EtapaPorTipoProceso | undefined> {
    const etapas = await this.getByTipoProceso(tipoProcesoId);
    return etapas.find((e) => e.codigo === codigo);
  }

  /** Siguiente etapa en el flujo (por orden) */
  async getNextEtapa(
    currentCodigo: string,
    tipoProcesoId: number | null,
  ): Promise<EtapaPorTipoProceso | undefined> {
    const etapas = await this.getByTipoProceso(tipoProcesoId);
    const currentIndex = etapas.findIndex((e) => e.codigo === currentCodigo);
    if (currentIndex === -1 || currentIndex === etapas.length - 1) return undefined;
    return etapas[currentIndex + 1];
  }

  /**
   * Construye el DTO completo de etapas para la vista del stepper.
   * Marca cuáles están completadas, cuál es la actual y cuántos días restan.
   */
  async buildStagesResponse(
    tipoProcesoId: number | null,
    currentStage: string | null,
    fechaVencimiento: Date | null,
  ): Promise<LegalStagesResponseDTO> {
    const etapas = await this.getByTipoProceso(tipoProcesoId);
    const currentIndex = currentStage
      ? etapas.findIndex((e) => e.codigo === currentStage)
      : -1;

    const now = new Date();
    const diasRestantes =
      fechaVencimiento
        ? Math.ceil((fechaVencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const mapped: EtapaProcesoDTO[] = etapas.map((e, i) => ({
      id:              e.id,
      codigo:          e.codigo,
      nombre:          e.nombre,
      descripcion:     e.descripcion ?? null,
      orden:           e.orden,
      diasLegales:     e.diasLegales,
      color:           e.color,
      completada:      currentIndex >= 0 && i < currentIndex,
      esActual:        i === currentIndex,
      fechaVencimiento: i === currentIndex ? fechaVencimiento : null,
      diasRestantes:   i === currentIndex ? diasRestantes : null,
    }));

    const etapaActual    = mapped.find((e) => e.esActual) ?? null;
    // Si no hay etapa aún (currentIndex = -1) → la primera es la siguiente
    const siguienteEtapa = currentIndex === -1
      ? (mapped[0] ?? null)
      : currentIndex < mapped.length - 1
      ? mapped[currentIndex + 1]
      : null;

    return { etapas: mapped, etapaActual, siguienteEtapa };
  }

  /** Valida que la transición sea hacia adelante (no retroceder) */
  async isValidTransition(
    fromCodigo: string,
    toCodigo: string,
    tipoProcesoId: number | null,
  ): Promise<boolean> {
    // APPEAL es especial: siempre es válido desde JUDGMENT
    if (fromCodigo === "JUDGMENT" && toCodigo === "APPEAL") return true;

    const etapas = await this.getByTipoProceso(tipoProcesoId);
    const fromIndex = etapas.findIndex((e) => e.codigo === fromCodigo);
    const toIndex   = etapas.findIndex((e) => e.codigo === toCodigo);

    if (fromIndex === -1 || toIndex === -1) return false;
    return toIndex > fromIndex;
  }

  // ── Mutaciones ─────────────────────────────────────────────────────────────

  async create(data: Omit<InsertEtapaPorTipoProceso, "id" | "createdAt">): Promise<EtapaPorTipoProceso> {
    const result = await this.db
      .insert(etapasPorTipoProceso)
      .values({ ...data, activo: 1 });
    const id = (result as any)[0]?.insertId as number;
    const row = await this.db.query.etapasPorTipoProceso.findFirst({
      where: eq(etapasPorTipoProceso.id, id),
    });
    return row!;
  }

  async update(
    id: number,
    data: Partial<Pick<InsertEtapaPorTipoProceso, "nombre" | "descripcion" | "orden" | "diasLegales" | "color" | "activo">>,
  ): Promise<void> {
    await this.db
      .update(etapasPorTipoProceso)
      .set(data)
      .where(eq(etapasPorTipoProceso.id, id));
  }
}
