// server/admin/services/audit.service.ts
import { storage } from "../../storage/storeage/database-storage.js";
import type { AuditEntry, AuditLogResult } from "../storage/admin-audit.storage.js";

export const auditService = {
  /**
   * Registra una acción crítica. Best-effort: si falla, no revierte la acción principal.
   * Llamar desde el controller DESPUÉS de que la acción fue exitosa.
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await storage.adminAudit.log(entry);
    } catch (err) {
      console.error("[audit] Error al registrar acción:", entry.accion, err);
    }
  },

  async getLog(params: {
    page?:    number;
    limit?:   number;
    adminId?: string;
    accion?:  string;
  }): Promise<AuditLogResult> {
    return storage.adminAudit.getLog(params);
  },
};
