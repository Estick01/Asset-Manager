import { randomUUID } from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { documentos, Documento, InsertDocumento } from "@/shared/schema";



export class DocumentoStorage {
  constructor(private db: MySql2Database<any>) {}

  async getDocumentos(procesoId: string, stage?: string): Promise<Documento[]> {
    let result;
    if (stage === undefined) {
      result = await this.db
        .select()
        .from(documentos)
        .where(eq(documentos.procesoId, procesoId));
    } else if (stage === "__general__") {
      result = await this.db
        .select()
        .from(documentos)
        .where(and(eq(documentos.procesoId, procesoId), isNull(documentos.legalStage)));
    } else {
      result = await this.db
        .select()
        .from(documentos)
        .where(and(eq(documentos.procesoId, procesoId), eq(documentos.legalStage, stage)));
    }

    // Cast tipoDocumento to the correct union type
    return result.map(doc => ({
      ...doc,
      tipoDocumento: doc.tipoDocumento as "PROCESAL" | "PROBATORIO"
    }));
  }

  async getDocumento(id: string): Promise<Documento | undefined> {
    const results = await this.db
      .select()
      .from(documentos)
      .where(eq(documentos.id, id))
      .limit(1);
    if (results[0]) {
      return {
        ...results[0],
        tipoDocumento: results[0].tipoDocumento as "PROCESAL" | "PROBATORIO"
      };
    }
    return undefined;
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
      legalStage: insertDocumento.legalStage ?? null,
      tipoDocumento: insertDocumento.tipoDocumento ?? "PROCESAL",
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

  async getDocumentosByTipoDocumento(procesoId: string, tipoDocumento: "PROCESAL" | "PROBATORIO"): Promise<Documento[]> {
    const docs = await this.getDocumentos(procesoId);
    return docs.filter(d => d.tipoDocumento === tipoDocumento);
  }
}
