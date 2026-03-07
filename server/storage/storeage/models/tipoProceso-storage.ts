import { tiposProceso, TiposProceso } from "@/shared/schema";
import { eq } from "drizzle-orm";


export class TipoProcesoStorage {
  constructor(private db: any) {}

  async getTiposProceso(): Promise<TiposProceso[]> {
    return this.db.query.tiposProceso.findMany();
  }

  async getTipoProceso(id: number): Promise<TiposProceso | undefined> {
    return this.db.query.tiposProceso.findFirst({
      where: eq(tiposProceso.id, id),
    });
  }

  async createTipoProceso(data: {
    nombre: string;
    descripcion?: string;
    activo?: boolean;
  }): Promise<TiposProceso> {
    const newTipo = {
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      activo: data.activo ?? true,
    };

    await this.db.insert(tiposProceso).values(newTipo);

    const created = await this.db.query.tiposProceso.findFirst({
      where: eq(tiposProceso.nombre, data.nombre),
    });

    if (!created) {
      throw new Error("No se pudo crear el tipo de proceso");
    }

    return created;
  }

  async updateTipoProceso(
    id: number,
    updates: Partial<TiposProceso>
  ): Promise<TiposProceso | undefined> {
    await this.db
      .update(tiposProceso)
      .set(updates)
      .where(eq(tiposProceso.id, id));

    return this.getTipoProceso(id);
  }

  async deleteTipoProceso(id: number): Promise<void> {
    await this.db
      .delete(tiposProceso)
      .where(eq(tiposProceso.id, id));
  }
}