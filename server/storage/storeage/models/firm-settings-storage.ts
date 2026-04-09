// server/storage/storeage/models/firm-settings-storage.ts
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { firmSettings, type FirmSettings, type FirmSettingsDTO } from "@/shared/schema";
import type { Database } from "../database-storage";

const DEFAULTS: Omit<FirmSettingsDTO, "firmId"> = {
  allowPrivateClientes:       false,
  allowPrivateProcesos:       false,
  defaultClienteEsCompartido: true,
  defaultProcesoEsCompartido: true,
  notifMensajes:              true,
  notifVencimientos:          true,
  notifCambiosProcesos:       true,
  notifEquipoInvitaciones:    true,
  notifAlertasPlan:           true,
  notifResumenSemanal:        false,
};

export class FirmSettingsStorage {
  constructor(private db: Database) {}

  /** Obtiene settings del bufete. Si no existen, devuelve los defaults sin persistir. */
  async get(firmId: string): Promise<FirmSettingsDTO> {
    const row = await this.db
      .select()
      .from(firmSettings)
      .where(eq(firmSettings.firmId, firmId))
      .limit(1)
      .then(r => r[0] ?? null);

    if (!row) return { firmId, ...DEFAULTS };
    return this.toDTO(row);
  }

  /** Crea o actualiza los settings de un bufete. */
  async upsert(firmId: string, updates: Partial<Omit<FirmSettingsDTO, "firmId">>): Promise<FirmSettingsDTO> {
    const existing = await this.db
      .select()
      .from(firmSettings)
      .where(eq(firmSettings.firmId, firmId))
      .limit(1)
      .then(r => r[0] ?? null);

    if (existing) {
      await this.db
        .update(firmSettings)
        .set(updates)
        .where(eq(firmSettings.firmId, firmId));
      return this.toDTO({ ...existing, ...updates } as FirmSettings);
    }

    const id = randomUUID();
    const newRow = { id, firmId, ...DEFAULTS, ...updates };
    await this.db.insert(firmSettings).values(newRow);
    return this.toDTO(newRow as FirmSettings);
  }

  private toDTO(row: FirmSettings): FirmSettingsDTO {
    return {
      firmId:                     row.firmId,
      allowPrivateClientes:       row.allowPrivateClientes,
      allowPrivateProcesos:       row.allowPrivateProcesos,
      defaultClienteEsCompartido: row.defaultClienteEsCompartido,
      defaultProcesoEsCompartido: row.defaultProcesoEsCompartido,
      notifMensajes:              row.notifMensajes,
      notifVencimientos:          row.notifVencimientos,
      notifCambiosProcesos:       row.notifCambiosProcesos,
      notifEquipoInvitaciones:    row.notifEquipoInvitaciones,
      notifAlertasPlan:           row.notifAlertasPlan,
      notifResumenSemanal:        row.notifResumenSemanal,
    };
  }
}
