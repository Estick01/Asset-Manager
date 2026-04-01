// server/admin/services/admin-users.service.ts
import { storage } from "../../storage/storeage/database-storage.js";
import type {
  ListUsersParams,
  ListUsersResult,
  UserAdminDetail,
} from "../storage/admin-users.storage.js";

export const adminUsersService = {
  async list(params: ListUsersParams): Promise<ListUsersResult> {
    return storage.adminUsers.list(params);
  },

  async getById(id: string): Promise<UserAdminDetail | null> {
    return storage.adminUsers.getById(id);
  },

  async updateEstado(id: string, isActive: boolean): Promise<void> {
    return storage.adminUsers.updateEstado(id, isActive);
  },

  async updatePlan(id: string, planId: string): Promise<void> {
    return storage.adminUsers.updatePlan(id, planId);
  },
};
