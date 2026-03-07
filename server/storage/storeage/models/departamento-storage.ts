import { eq } from 'drizzle-orm';
import { Database } from '../database-storage';
import { departamentos, Departamento, NewDepartamento } from '@/shared/schema';

export class DepartamentoStorage {
  protected db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async findAll(): Promise<Departamento[]> {
    return this.db.select().from(departamentos).where(eq(departamentos.state, 1));
  }

  async findById(id: string): Promise<Departamento | undefined> {
    const result = await this.db.select().from(departamentos).where(eq(departamentos.id, id));
    return result[0];
  }

  async findByCodigo(codigo: string): Promise<Departamento | undefined> {
    const result = await this.db.select().from(departamentos).where(eq(departamentos.codigo, codigo));
    return result[0];
  }

  async create(data: NewDepartamento): Promise<Departamento> {
    await this.db.insert(departamentos).values(data);
    return data as Departamento;
  }

  async update(id: string, data: Partial<Departamento>): Promise<Departamento | undefined> {
    await this.db.update(departamentos).set(data).where(eq(departamentos.id, id));
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    await this.db.update(departamentos).set({ state: 0 }).where(eq(departamentos.id, id));
    return true;
  }
}
