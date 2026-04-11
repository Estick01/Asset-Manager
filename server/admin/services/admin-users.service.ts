// server/admin/services/admin-users.service.ts
import { storage } from "../../storage/storeage/database-storage.js";
import type {
  ListUsersParams,
  ListUsersResult,
  UserAdminDetail,
  LawyerVerificationRow,
} from "../storage/admin-users.storage.js";
import type { LawyerProfessionalVerificationStatus } from "@/shared/schema";

type AdminUserUpdatePayload = {
  name?: string;
  email?: string;
  lawyer?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    document?: string;
    address?: string;
    specialization?: string;
    licenseNumber?: string;
  };
  firm?: {
    name?: string;
    nit?: string;
    address?: string;
    phone?: string;
  };
  clientNatural?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    document?: string;
    address?: string;
  };
  clientEmpresa?: {
    companyName?: string;
    nit?: string;
    sector?: string;
  };
  admin?: {
    displayName?: string;
    adminType?: string;
  };
};

function buildEditableProfile(user: any, profile: any) {
  const roleName = user?.rol?.nombre;
  const common = {
    name: user?.name ?? "",
    email: user?.email ?? "",
  };

  if (!roleName) return { roleType: "desconocido", common };

  if (roleName === "abogado" && profile) {
    return {
      roleType: "abogado",
      common,
      lawyer: {
        firstName: profile.persona?.nombre ?? "",
        lastName: profile.persona?.apellido ?? "",
        phone: profile.persona?.telefono ?? "",
        document: profile.persona?.documento ?? "",
        address: profile.persona?.direccion ?? "",
        specialization: profile.specialization ?? "",
        licenseNumber: profile.licenseNumber ?? "",
      },
    };
  }

  if (roleName === "bufete" && profile) {
    return {
      roleType: "bufete",
      common: {
        name: profile.name ?? common.name,
        email: common.email,
      },
      firm: {
        name: profile.name ?? "",
        nit: profile.nit ?? "",
        address: profile.address ?? "",
        phone: profile.phone ?? "",
      },
    };
  }

  if (roleName === "cliente" && profile) {
    if (profile.tipo === "natural") {
      return {
        roleType: "cliente_natural",
        common,
        clientNatural: {
          firstName: profile.natural?.persona?.nombre ?? "",
          lastName: profile.natural?.persona?.apellido ?? "",
          phone: profile.natural?.persona?.telefono ?? "",
          document: profile.natural?.persona?.documento ?? "",
          address: profile.natural?.persona?.direccion ?? "",
        },
      };
    }

    return {
      roleType: "cliente_empresa",
      common: {
        name: profile.empresa?.razonSocial ?? common.name,
        email: common.email,
      },
      clientEmpresa: {
        companyName: profile.empresa?.razonSocial ?? "",
        nit: profile.empresa?.nit ?? "",
        sector: profile.empresa?.sector ?? "",
      },
    };
  }

  if (roleName.startsWith("admin_") && profile) {
    return {
      roleType: "admin",
      common,
      admin: {
        displayName: profile.displayName ?? common.name,
        adminType: profile.adminType ?? "",
      },
    };
  }

  return { roleType: roleName, common };
}

export const adminUsersService = {
  async list(params: ListUsersParams): Promise<ListUsersResult> {
    return storage.adminUsers.list(params);
  },

  async getById(id: string): Promise<UserAdminDetail | null> {
    const detail = await storage.adminUsers.getById(id);
    if (!detail) return null;

    const user = await storage.getUserById(id);
    const profile = user?.rol?.nombre ? await storage.getUserProfile(id, user.rol.nombre) : null;

    return {
      ...detail,
      editableProfile: buildEditableProfile(user, profile),
    };
  },

  async updateEstado(id: string, isActive: boolean): Promise<void> {
    return storage.adminUsers.updateEstado(id, isActive);
  },

  async updatePlan(id: string, planId: string): Promise<void> {
    return storage.adminUsers.updatePlan(id, planId);
  },

  async updateProfile(id: string, payload: AdminUserUpdatePayload): Promise<void> {
    const user = await storage.getUserById(id);
    if (!user) throw new Error("Usuario no encontrado");

    const roleName = user.rol?.nombre ?? "";

    if (payload.email && payload.email !== user.email) {
      const existing = await storage.getUserByEmail(payload.email);
      if (existing && existing.id !== id) {
        throw new Error("El correo ya esta en uso por otro usuario");
      }
    }

    const commonUpdates: Record<string, unknown> = {};
    if (payload.email !== undefined) commonUpdates.email = payload.email.trim().toLowerCase();
    if (payload.name !== undefined) commonUpdates.name = payload.name.trim();

    if (Object.keys(commonUpdates).length > 0) {
      await storage.users.updateUser(id, commonUpdates as any);
    }

    if (roleName === "abogado") {
      const lawyer = await storage.lawyerProfiles.getLawyerByUserId(id);
      if (!lawyer) throw new Error("Perfil de abogado no encontrado");

      await storage.lawyerProfiles.updateLawyer(lawyer.id, {
        specialization: payload.lawyer?.specialization,
        licenseNumber: payload.lawyer?.licenseNumber,
        persona: {
          nombre: payload.lawyer?.firstName,
          apellido: payload.lawyer?.lastName,
          telefono: payload.lawyer?.phone,
          documento: payload.lawyer?.document,
          direccion: payload.lawyer?.address,
        },
      });
      return;
    }

    if (roleName === "bufete") {
      const firm = await storage.firmProfiles.getFirmProfileByUserId(id);
      if (!firm) throw new Error("Perfil de bufete no encontrado");

      await storage.updateFirmProfile(firm.id, {
        name: payload.firm?.name,
        nit: payload.firm?.nit,
        address: payload.firm?.address,
        phone: payload.firm?.phone,
      });

      if (payload.firm?.name && payload.name === undefined) {
        await storage.users.updateUser(id, { name: payload.firm.name.trim() } as any);
      }
      return;
    }

    if (roleName === "cliente") {
      const cliente = await storage.clientes.getClienteByUser(id);
      if (!cliente) throw new Error("Perfil de cliente no encontrado");

      if (cliente.tipo === "natural") {
        await storage.clientes.updateCliente(cliente.id, {
          nombre: payload.clientNatural?.firstName,
          apellido: payload.clientNatural?.lastName,
          telefono: payload.clientNatural?.phone,
          documento: payload.clientNatural?.document,
          direccion: payload.clientNatural?.address,
        } as any);

        if ((payload.clientNatural?.firstName || payload.clientNatural?.lastName) && payload.name === undefined) {
          const fullName = [payload.clientNatural?.firstName, payload.clientNatural?.lastName].filter(Boolean).join(" ").trim();
          if (fullName) await storage.users.updateUser(id, { name: fullName } as any);
        }
      } else {
        await storage.clientes.updateCliente(cliente.id, {
          razonSocial: payload.clientEmpresa?.companyName,
          nit: payload.clientEmpresa?.nit,
          sector: payload.clientEmpresa?.sector,
        } as any);

        if (payload.clientEmpresa?.companyName && payload.name === undefined) {
          await storage.users.updateUser(id, { name: payload.clientEmpresa.companyName.trim() } as any);
        }
      }
      return;
    }

    if (roleName.startsWith("admin_")) {
      const adminProfile = await storage.adminProfiles.getAdminProfileByUserId(id);
      if (adminProfile) {
        await storage.adminProfiles.updateAdminProfile(adminProfile.id, {
          displayName: payload.admin?.displayName,
          adminType: payload.admin?.adminType,
        } as any);
      }

      if (payload.admin?.displayName && payload.name === undefined) {
        await storage.users.updateUser(id, { name: payload.admin.displayName.trim() } as any);
      }
    }
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
