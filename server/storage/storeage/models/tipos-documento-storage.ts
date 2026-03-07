/**
 * TiposDocumento Storage
 * Handles database operations for tipos_documento
 */

import { TiposDocumento, tiposDocumento } from "@/shared/schema";
import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

export class TiposDocumentoStorage {
  constructor(private db: MySql2Database<any>) { }

  async getAll(): Promise<TiposDocumento[]> {
    const data = await this.db
      .select()
      .from(tiposDocumento)
      .where(eq(tiposDocumento.state, true));
    return data;
  }

  async getById(id: number): Promise<TiposDocumento | undefined> {
    const result = await this.db
      .select()
      .from(tiposDocumento)
      .where(eq(tiposDocumento.id, id))
      .limit(1)
      .then(rows => rows[0]);
    return result;
  }
}
