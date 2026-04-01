// server/admin/storage/admin-audit.storage.ts
import { sql, eq, and, desc } from "drizzle-orm";
import { adminAuditLog } from "@/shared/schema";
import type { Database } from "../../storage/storeage/database-storage.js";

export interface AuditEntry {
  adminId:   string;
  accion:    string;
  targetId?: string | null;
  detalle?:  string | null;
}

export interface AuditRow {
  id:        number;
  adminId:   string;
  accion:    string;
  targetId:  string | null;
  detalle:   string | null;
  createdAt: Date;
}

export interface AuditLogResult {
  data: AuditRow[];
  meta: { total: number; page: number; limit: number };
}

export class AdminAuditStorage {
  constructor(private db: Database) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.db.insert(adminAuditLog).values({
      adminId:  entry.adminId,
      accion:   entry.accion,
      targetId: entry.targetId ?? null,
      detalle:  entry.detalle  ?? null,
    });
  }

  async getLog(params: {
    page:     number;
    limit:    number;
    adminId?: string;
    accion?:  string;
  }): Promise<AuditLogResult> {
    const page   = Math.max(params.page  ?? 1, 1);
    const limit  = Math.min(params.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [];
    if (params.adminId) conditions.push(eq(adminAuditLog.adminId, params.adminId));
    if (params.accion)  conditions.push(eq(adminAuditLog.accion,  params.accion));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await this.db
      .select({ total: sql<number>`COUNT(*)` })
      .from(adminAuditLog)
      .where(where);

    const rows = await this.db
      .select()
      .from(adminAuditLog)
      .where(where)
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data: rows,
      meta: { total: Number(countRow?.total ?? 0), page, limit },
    };
  }
}
