import { EstadoProceso, estadosProceso } from "@/shared/schema";
import { eq } from "drizzle-orm";


export class EstadoProcesoStorage {
  constructor(private db: any) {}

  async getEstadosProceso(): Promise<EstadoProceso[]> {
    return this.db.query.estadosProceso.findMany();
  }

  async getEstadoProceso(id: number): Promise<EstadoProceso | undefined> {
    return this.db.query.estadosProceso.findFirst({
      where: eq(estadosProceso.id, id),
    });
  }

  async createEstadoProceso(data: {
    nombre: string;
    descripcion?: string;
    activo?: boolean;
  }): Promise<EstadoProceso> {
    const newEstado = {
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      activo: data.activo ?? true,
    };

    await this.db.insert(estadosProceso).values(newEstado);

    const created = await this.db.query.estadosProceso.findFirst({
      where: eq(estadosProceso.nombre, data.nombre),
    });

    if (!created) {
      throw new Error("No se pudo crear el estado del proceso");
    }

    return created;
  }

  async updateEstadoProceso(
    id: number,
    updates: Partial<EstadoProceso>
  ): Promise<EstadoProceso | undefined> {
    await this.db
      .update(estadosProceso)
      .set(updates)
      .where(eq(estadosProceso.id, id));

    return this.getEstadoProceso(id);
  }

  async deleteEstadoProceso(id: number): Promise<void> {
    await this.db
      .delete(estadosProceso)
      .where(eq(estadosProceso.id, id));
  }
}