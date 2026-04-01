// server/admin/services/admin-stats.service.ts
import { storage } from "../../storage/storeage/database-storage.js";
import type { AdminStats } from "../storage/admin-stats.storage.js";

export const adminStatsService = {
  async getStats(): Promise<AdminStats> {
    return storage.adminStats.getStats();
  },
};
