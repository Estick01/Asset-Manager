import { eq, and, like, sql } from 'drizzle-orm';
import { Database } from '../database-storage';
import { municipios, Municipio, NewMunicipio } from '@/shared/schema';
import { departamentos } from '@/shared/schema';

export interface MunicipioSearchResult {
  id:                 string;
  nombre:             string;
  departamentoNombre: string;
}

export class MunicipioStorage {
  protected db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async findAll(): Promise<Municipio[]> {
    return this.db.select().from(municipios).where(eq(municipios.state, 1));
  }

  async findByDepartamento(departamentoId: string): Promise<Municipio[]> {
    return this.db.select().from(municipios)
      .where(and(eq(municipios.departamentoId, departamentoId), eq(municipios.state, 1)));
  }

  async findByDepartamentoPaginated(
    departamentoId: string,
    page: number = 1,
    pageSize: number = 10,
    search?: string
  ): Promise<{ data: Municipio[]; total: number; hasMore: boolean }> {
    const pageNum = Math.max(1, page);
    const pageSizeNum = Math.min(100, Math.max(1, pageSize));
    
    const conditions = [eq(municipios.departamentoId, departamentoId), eq(municipios.state, 1)];
    
    if (search && search.trim()) {
      conditions.push(like(municipios.nombre, `%${search.trim()}%`));
    }
    
    // Get total count
    const countResult = await this.db.select({ 
      count: sql<number>`count(*)`
    })
      .from(municipios)
      .where(and(...conditions));
    const total = Number(countResult[0]?.count || 0);
    
    // Get paginated data
    const data = await this.db.select()
      .from(municipios)
      .where(and(...conditions))
      .limit(pageSizeNum)
      .offset((pageNum - 1) * pageSizeNum);
    
    const hasMore = (pageNum * pageSizeNum) < total;
    
    return { data, total, hasMore };
  }

  async searchMunicipios(
    departamentoId: string,
    search: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ data: Municipio[]; total: number; hasMore: boolean }> {
    return this.findByDepartamentoPaginated(departamentoId, page, pageSize, search);
  }

  /** Search municipios across all departamentos (for community city picker). */
  async searchAll(
    search = "",
    limit = 20,
    offset = 0
  ): Promise<{ data: MunicipioSearchResult[]; total: number; hasMore: boolean }> {
    const conditions = [eq(municipios.state, 1)];
    if (search.trim()) {
      conditions.push(like(municipios.nombre, `%${search.trim()}%`));
    }

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(municipios)
      .where(and(...conditions));
    const total = Number(countResult[0]?.count ?? 0);

    const rows = await this.db
      .select({
        id:                 municipios.id,
        nombre:             municipios.nombre,
        departamentoNombre: departamentos.nombre,
      })
      .from(municipios)
      .leftJoin(departamentos, eq(municipios.departamentoId, departamentos.id))
      .where(and(...conditions))
      .orderBy(municipios.nombre)
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map(r => ({
        id:                 r.id,
        nombre:             r.nombre,
        departamentoNombre: r.departamentoNombre ?? "",
      })),
      total,
      hasMore: offset + limit < total,
    };
  }

  async findById(id: string): Promise<Municipio | undefined> {
    const result = await this.db.select().from(municipios).where(eq(municipios.id, id));
    return result[0];
  }

  async findByCodigo(departamentoId: string, codigo: string): Promise<Municipio | undefined> {
    const result = await this.db.select().from(municipios)
      .where(and(eq(municipios.departamentoId, departamentoId), eq(municipios.codigo, codigo)));
    return result[0];
  }

  async create(data: NewMunicipio): Promise<Municipio> {
    await this.db.insert(municipios).values(data);
    return data as Municipio;
  }

  async update(id: string, data: Partial<Municipio>): Promise<Municipio | undefined> {
    await this.db.update(municipios).set(data).where(eq(municipios.id, id));
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    await this.db.update(municipios).set({ state: 0 }).where(eq(municipios.id, id));
    return true;
  }
}
