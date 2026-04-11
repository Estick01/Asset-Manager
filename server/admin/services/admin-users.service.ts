// server/admin/services/admin-users.service.ts
import { storage } from "../../storage/storeage/database-storage.js";
import type {
  ListUsersParams,
  ListUsersResult,
  UserAdminDetail,
  LawyerVerificationRow,
} from "../storage/admin-users.storage.js";
import type { LawyerProfessionalVerificationStatus } from "@/shared/schema";

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

  async revokeSessions(id: string): Promise<void> {
    await storage.sessions.revokeAllForUser(id);
  },

  async listLawyerVerifications(status?: LawyerProfessionalVerificationStatus): Promise<LawyerVerificationRow[]> {
    return storage.adminUsers.listLawyerVerifications(status);
  },

  async updateLawyerVerification(
    lawyerProfileId: string,
    payload: {
      status: LawyerProfessionalVerificationStatus;
      reviewedBy: string;
      reviewNotes?: string | null;
    },
  ): Promise<void> {
    return storage.adminUsers.updateLawyerVerification(lawyerProfileId, payload);
  },
};
