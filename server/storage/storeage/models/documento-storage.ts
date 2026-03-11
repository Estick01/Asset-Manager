import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { documentos, Documento, InsertDocumento } from "@/shared/schema";



export class DocumentoStorage {
  constructor(private db: MySql2Database<any>) {}

  async getDocumentos(procesoId: string): Promise<Documento[]> {
    return this.db
      .select()
      .from(documentos)
      .where(eq(documentos.procesoId, procesoId));
  }

  async getDocumento(id: string): Promise<Documento | undefined> {
    const results = await this.db
      .select()
      .from(documentos)
      .where(eq(documentos.id, id))
      .limit(1);
    return results[0];
  }

  async createDocumento(insertDocumento: InsertDocumento): Promise<Documento> {
    const id = randomUUID();
    const fechaSubida = insertDocumento.fechaSubida 
      ? new Date(insertDocumento.fechaSubida) 
      : new Date();
    
    const newDocumento: Documento = {
      ...insertDocumento,
      id,
      tamano: insertDocumento.tamano ?? 0,
      descripcion: insertDocumento.descripcion ?? "",
      fechaSubida,
      state: insertDocumento.state ?? true,
    };
    await this.db.insert(documentos).values(newDocumento);
    return newDocumento;
  }

  async updateDocumento(id: string, updates: Partial<InsertDocumento>): Promise<Documento | undefined> {
    await this.db
      .update(documentos)
      .set(updates)
      .where(eq(documentos.id, id));
    
    return this.getDocumento(id);
  }

  async deleteDocumento(id: string): Promise<void> {
    await this.db.delete(documentos).where(eq(documentos.id, id));
  }

  async getDocumentosByTipo(procesoId: string, tipo: string): Promise<Documento[]> {
    const docs = await this.getDocumentos(procesoId);
    return docs.filter(d => d.tipo === tipo);
  }
}
