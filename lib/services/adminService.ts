
import {
  LawyerProfile,
  Permiso,
  Plan,
  Rol,
  TiposProceso,
} from '../../shared/schema';
import { apiRequest } from '../query-client';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsuarios:         number;
  suscripcionesActivas:  number;
  ingresosEstimadosCop:  number;
  totalProcesos:         number;
  nuevosEsteMes:         number;
}

// ============ Role and Permission Functions ============

export async function getRoles(): Promise<Rol[]> {
  try {
    const response = await apiRequest("GET", '/api/roles');
    if (!response.ok) {
      console.error('Failed to fetch roles from API');
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching roles:', e);
    return [];
  }
}

export async function getRolWithPermisos(
  id: number
): Promise<{ rol: Rol; permisos: Permiso[] } | null> {
  try {
    const response = await apiRequest("GET", `/api/roles/${id}`);
    if (!response.ok) {
      console.error('Failed to fetch role from API');
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching role with permisos:', e);
    return null;
  }
}

export async function updateRolePermisos(
  id: number,
  permisoIds: number[]
): Promise<{ rol: Rol; permisos: Permiso[] } | null> {
  try {
    const response = await apiRequest("PUT", `/api/roles/${id}/permisos`, { permisoIds });
    if (!response.ok) {
      console.error('Failed to update role permisos from API');
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error('Error updating role permisos:', e);
    return null;
  }
}

export async function getAllPermisos(): Promise<Permiso[]> {
  try {
    const response = await apiRequest("GET", '/api/permisos/all');
    if (!response.ok) {
      console.error('Failed to fetch permisos from API');
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching permisos:', e);
    return [];
  }
}

export async function getUserPermisos(): Promise<string[]> {
    try {
      const response = await apiRequest("GET", "/api/permisos");
      if (!response.ok) {
        console.error("Failed to fetch permissions from API");
        return [];
      }
      const data = await response.json();
      return data.permisos || [];
    } catch (e) {
      console.error("Error fetching permissions:", e);
      return [];
    }
  }

export async function createRol(
  nombre: string,
  descripcion?: string
): Promise<Rol | null> {
  try {
    const response = await apiRequest("POST", '/api/roles', { nombre, descripcion });
    if (!response.ok) {
      console.error('Failed to create role from API');
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error('Error creating role:', e);
    return null;
  }
}

export async function deleteRol(id: number): Promise<boolean> {
  try {
    const response = await apiRequest("DELETE", `/api/roles/${id}`);
    if (!response.ok) {
      console.error('Failed to delete role from API');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error deleting role:', e);
    return false;
  }
}

// ============ Lawyer (LawyerProfile) Management Functions ============

export async function getAllLawyers(): Promise<LawyerProfile[]> {
  try {
    const response = await apiRequest("GET", '/api/lawyers');
    if (!response.ok) {
      console.error('Failed to fetch lawyers from API');
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching lawyers:', e);
    return [];
  }
}

export async function updateLawyerRol(
  lawyerId: string,
  rolId: number
): Promise<boolean> {
  try {
    const response = await apiRequest("PUT", `/api/lawyers/${lawyerId}/rol`, { rolId });
    return response.ok;
  } catch (e) {
    console.error('Error updating lawyer rol:', e);
    return false;
  }
}

export async function updateLawyerEstado(
  lawyerId: string,
  activo: boolean
): Promise<boolean> {
  try {
    const response = await apiRequest("PUT",
      `/api/lawyers/${lawyerId}/estado`,
      { activo }
    );
    return response.ok;
  } catch (e) {
    console.error('Error updating lawyer estado:', e);
    return false;
  }
}

export async function updateLawyerPlan(
  lawyerId: string,
  planId: string
): Promise<boolean> {
  try {
    const response = await apiRequest("PUT",
      `/api/lawyers/${lawyerId}/plan`,
      { planId }
    );
    return response.ok;
  } catch (e) {
    console.error('Error updating lawyer plan:', e);
    return false;
  }
}

// ============ Plan Functions ============

export async function getAllPlanes(): Promise<Plan[]> {
  try {
    const response = await apiRequest("GET", '/api/admin/plans');
    if (!response.ok) {
      console.error('Failed to fetch planes from API');
      return [];
    }
    const body = await response.json();
    return body.data ?? [];
  } catch (e) {
    console.error('Error fetching planes:', e);
    return [];
  }
}

// ============ TipoProceso Functions ============

export async function getAllTiposProceso(): Promise<TiposProceso[]> {
    try {
      const response = await apiRequest("GET", '/api/tipos-proceso');
      if (!response.ok) {
        console.error('Failed to fetch tipos from API');
        return [];
      }
      return await response.json();
    } catch (e) {
      console.error('Error fetching tipos:', e);
      return [];
    }
}

export async function createTipoProceso(tipo: {
  nombre: string;
  descripcion?: string;
}): Promise<TiposProceso | null> {
  try {
    const response = await apiRequest("POST", '/api/tipos-proceso', tipo);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error('Error creating tipo proceso:', e);
    return null;
  }
}

export async function updateTipoProceso(
  id: number,
  tipo: { nombre?: string; descripcion?: string; activo?: boolean }
): Promise<TiposProceso | null> {
  try {
    const response = await apiRequest("PUT", `/api/tipos-proceso/${id}`, tipo);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error('Error updating tipo proceso:', e);
    return null;
  }
}

export async function deleteTipoProceso(id: number): Promise<boolean> {
  try {
    const response = await apiRequest("DELETE", `/api/tipos-proceso/${id}`);
    return response.ok;
  } catch (e) {
    console.error('Error deleting tipo proceso:', e);
    return false;
  }
}

// ============ Dashboard Functions ============

export async function getDashboardStats(): Promise<{
    totalClientes: number;
    totalProcesos: number;
    procesosActivos: number;
    procesosFinalizados: number;
    totalTareas: number;
    tareasPendientes: number;
    tareasEnProgreso: number;
    tareasCompletadas: number;
    procesosRecientes: Array<{
      id: string;
      clienteId: string;
      tipoProceso: string;
      radicado: string;
      estado: string;
      estadoColor: string;
      fechaCreacion: string;
    }>;
  }> {
    const fallbackStats = {
        totalClientes: 0,
        totalProcesos: 0,
        procesosActivos: 0,
        procesosFinalizados: 0,
        totalTareas: 0,
        tareasPendientes: 0,
        tareasEnProgreso: 0,
        tareasCompletadas: 0,
        procesosRecientes: [],
    };

    try {
      const response = await apiRequest("GET", "/api/dashboard");
      if (!response.ok) {
        console.error("Failed to fetch dashboard from API");
        return fallbackStats;
      }
      return await response.json();
    } catch (e) {
      console.error("Error fetching dashboard:", e);
      return fallbackStats;
    }
  }

// ── Stats ─────────────────────────────────────────────────────────────────────

export const adminStatsService = {
  getStats: async (): Promise<{ success: boolean; data: AdminStats }> => {
    const response = await apiRequest("GET", "/api/admin/stats");
    if (!response.ok) {
      throw new Error(`Failed to fetch admin stats: ${response.status}`);
    }
    return await response.json();
  },
};

// ── Usuarios ──────────────────────────────────────────────────────────────────

export interface UserAdminRow {
  id:        string;
  name:      string | null;
  email:     string;
  isActive:  boolean;
  createdAt: string;
  rol:       { nombre: string };
  plan:      { nombre: string } | null;
  emailVerified: boolean;
}

export interface SuscripcionResumen {
  id:          string;
  planNombre:  string;
  ciclo:       string;
  estado:      string;
  fechaInicio: string;
  fechaFin:    string;
}

export interface UserAdminDetail extends UserAdminRow {
  firma:                  { id: string; nombre: string } | null;
  suscripcionActiva:      SuscripcionResumen | null;
  historialSuscripciones: SuscripcionResumen[];
  editableProfile?: {
    roleType: string;
    common: {
      name: string;
      email: string;
    };
    lawyer?: {
      firstName: string;
      lastName: string;
      phone: string;
      document: string;
      address: string;
      specialization: string;
      licenseNumber: string;
    };
    firm?: {
      name: string;
      nit: string;
      address: string;
      phone: string;
    };
    clientNatural?: {
      firstName: string;
      lastName: string;
      phone: string;
      document: string;
      address: string;
    };
    clientEmpresa?: {
      companyName: string;
      nit: string;
      sector: string;
    };
    admin?: {
      displayName: string;
      adminType: string;
    };
  };
  twoFactor?: {
    enabled: boolean;
    enabledAt: string | null;
    recoveryCodesRemaining: number;
  };
  lawyerVerification: {
    profileId: string;
    licenseNumber: string | null;
    status: "pendiente" | "verificado" | "rechazado";
    reviewedAt: string | null;
    reviewedBy: string | null;
    reviewNotes: string | null;
  } | null;
}

export interface LawyerVerificationRow {
  profileId: string;
  userId: string;
  name: string | null;
  email: string;
  licenseNumber: string | null;
  specialization: string | null;
  createdAt: string;
  status: "pendiente" | "verificado" | "rechazado";
  emailVerified: boolean;
}

export interface ListUsersParams {
  page?:   number;
  limit?:  number;
  tipo?:   "abogado" | "bufete" | "cliente";
  estado?: "activo" | "suspendido";
  search?: string;
}

export interface ListUsersResponse {
  success: boolean;
  data:    UserAdminRow[];
  meta:    { total: number; page: number; limit: number };
}

export const adminUsersService = {
  list: async (params: ListUsersParams = {}): Promise<ListUsersResponse> => {
    const query = new URLSearchParams();
    if (params.page  != null) query.set("page",  String(params.page));
    if (params.limit != null) query.set("limit", String(params.limit));
    if (params.tipo)   query.set("tipo",   params.tipo);
    if (params.estado) query.set("estado", params.estado);
    if (params.search) query.set("search", params.search);
    const qs = query.toString();
    const response = await apiRequest("GET", `/api/admin/users${qs ? `?${qs}` : ""}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json();
  },

  getById: async (id: string): Promise<{ success: boolean; data: UserAdminDetail }> => {
    const response = await apiRequest("GET", `/api/admin/users/${id}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json();
  },

  updateEstado: async (id: string, activo: boolean): Promise<void> => {
    const response = await apiRequest("PATCH", `/api/admin/users/${id}/estado`, { activo });
    if (!response.ok) throw new Error(`Error ${response.status}`);
  },

  updatePlan: async (id: string, planId: string): Promise<void> => {
    const response = await apiRequest("PATCH", `/api/admin/users/${id}/plan`, { planId });
    if (!response.ok) throw new Error(`Error ${response.status}`);
  },

  updateProfile: async (
    id: string,
    payload: Partial<NonNullable<UserAdminDetail["editableProfile"]>> & {
      name?: string;
      email?: string;
    },
  ): Promise<void> => {
    const response = await apiRequest("PATCH", `/api/admin/users/${id}/profile`, payload);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? `Error ${response.status}`);
    }
  },

  resetPassword: async (id: string): Promise<{ token: string; expiresIn: string }> => {
    const response = await apiRequest("POST", `/api/admin/users/${id}/reset-password`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },

  revokeSessions: async (id: string): Promise<void> => {
    const response = await apiRequest("POST", `/api/admin/users/${id}/revoke-sessions`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
  },

  resetTwoFactor: async (id: string, reason: string): Promise<void> => {
    const response = await apiRequest("POST", `/api/admin/users/${id}/reset-2fa`, { reason });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? `Error ${response.status}`);
    }
  },

  listLawyerVerifications: async (status: "pendiente" | "verificado" | "rechazado" = "pendiente"): Promise<LawyerVerificationRow[]> => {
    const response = await apiRequest("GET", `/api/admin/users/lawyer-verifications?status=${status}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data ?? [];
  },

  updateLawyerVerification: async (
    id: string,
    payload: { status: "verificado" | "rechazado"; reviewNotes?: string }
  ): Promise<void> => {
    const response = await apiRequest("PATCH", `/api/admin/users/lawyer-verifications/${id}`, payload);
    if (!response.ok) throw new Error(`Error ${response.status}`);
  },
};

export interface AdminPlanRow extends Plan {
  suscriptores?: number;
}

export interface BillingSummary {
  suscripciones: {
    activas: number;
    canceladas: number;
    vencidas: number;
  };
  pagos: {
    pendientes: number;
    aprobados: number;
    rechazados: number;
  };
  ingresosCopAprobados: number;
}

export interface BillingSubscriptionRow {
  id: string;
  userId: string;
  planId: string;
  estado: string;
  ciclo: string;
  fechaInicio: string;
  fechaVencimiento: string;
  autoRenovacion: boolean;
  extraUsers: number;
  userName: string | null;
  email: string;
  planNombre: string;
  planTipo: string;
}

export interface BillingPaymentRow {
  id: string;
  estado: string;
  currency: string;
  amountCop: string | null;
  amountUsd: string | null;
  metodoPago: string | null;
  wompiReference: string;
  concepto: string | null;
  createdAt: string;
  email: string;
  userName: string | null;
  planNombre: string | null;
}

export interface ProcessSummary {
  total: number;
  activos: number;
  archivados: number;
  porTipo: Array<{ nombre: string | null; total: number }>;
}

export interface ProcessRecordRow {
  id: string;
  radicado: string;
  juzgado: string;
  state: boolean;
  fechaCreacion: string;
  tipoProceso: string | null;
  estado: string | null;
  clienteNombre: string;
}

export interface CommunityOverview {
  posts: {
    total: number;
    open: number;
    inProgress: number;
    closed: number;
    disabled: number;
  };
  reports: number;
}

export interface CommunityAdminPostRow {
  id: string;
  title: string;
  status: "open" | "in_progress" | "closed";
  disabled: boolean;
  visibility: string;
  city: string | null;
  createdAt: string;
  authorName: string | null;
  reportCount: number;
}

export interface CommunityReportRow {
  id: string;
  postId: string | null;
  commentId: string | null;
  reason: string;
  detail: string | null;
  createdAt: string;
  reporterEmail: string | null;
  reporterName: string | null;
}

export interface SupportOverview {
  security: {
    total: number;
    loginFail: number;
    blocked: number;
  };
  users: {
    activos: number;
    suspendidos: number;
  };
  support: {
    total: number;
    open: number;
    publicRequests: number;
    publicPending: number;
  };
  audit: Array<{
    id: number;
    adminId: string;
    accion: string;
    targetId: string | null;
    detalle: string | null;
    createdAt: string;
  }>;
}

export interface PublicSupportRequestRow {
  id: string;
  name: string;
  email: string;
  message: string;
  source: "landing" | "login";
  status: "new" | "in_progress" | "resolved" | "spam";
  userId: string | null;
  assignedAdminId: string | null;
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface SecurityEventRow {
  id: string;
  email: string;
  ip: string;
  userAgent: string | null;
  eventType: string;
  success: boolean;
  metadata: string | null;
  createdAt: string;
}

export interface SupportConversationRow {
  id: string;
  name: string | null;
  type: "admin_support";
  updatedAt: string;
  unreadCount: number;
  lastMessage: {
    id: string;
    content: string | null;
    type: string;
    createdAt: string;
  } | null;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    lastReadAt: string | null;
  }>;
}

export interface ConfigOverview {
  roles: Array<Rol & { permisos: string[] }>;
  permisos: Permiso[];
  modulos: Array<{ id: number; nombre: string; descripcion: string | null; icono: string | null; orden: number | null; activo: boolean }>;
}

export const adminPlansService = {
  list: async (): Promise<AdminPlanRow[]> => {
    const response = await apiRequest("GET", "/api/admin/plans");
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data ?? [];
  },

  create: async (payload: Partial<Plan>): Promise<AdminPlanRow> => {
    const response = await apiRequest("POST", "/api/admin/plans", payload);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },

  update: async (id: string, payload: Partial<Plan>): Promise<AdminPlanRow> => {
    const response = await apiRequest("PUT", `/api/admin/plans/${id}`, payload);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },

  archive: async (id: string): Promise<void> => {
    const response = await apiRequest("DELETE", `/api/admin/plans/${id}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
  },
};

export const adminBillingService = {
  getSummary: async (): Promise<BillingSummary> => {
    const response = await apiRequest("GET", "/api/admin/billing/summary");
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },

  listSubscriptions: async (params: { page?: number; limit?: number; estado?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "") query.set(key, String(value));
    });
    const response = await apiRequest("GET", `/api/admin/billing/subscriptions${query.toString() ? `?${query}` : ""}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json() as Promise<{ success: boolean; data: BillingSubscriptionRow[]; meta: { total: number; page: number; limit: number } }>;
  },

  listPayments: async (params: { page?: number; limit?: number; estado?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "") query.set(key, String(value));
    });
    const response = await apiRequest("GET", `/api/admin/billing/payments${query.toString() ? `?${query}` : ""}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json() as Promise<{ success: boolean; data: BillingPaymentRow[]; meta: { total: number; page: number; limit: number } }>;
  },

  updateSubscription: async (id: string, payload: { estado?: string; autoRenovacion?: boolean }) => {
    const response = await apiRequest("PATCH", `/api/admin/billing/subscriptions/${id}`, payload);
    if (!response.ok) throw new Error(`Error ${response.status}`);
  },
};

export const adminProcessesService = {
  getSummary: async (): Promise<ProcessSummary> => {
    const response = await apiRequest("GET", "/api/admin/processes/summary");
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },

  listRecords: async (params: { page?: number; limit?: number; search?: string } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "") query.set(key, String(value));
    });
    const response = await apiRequest("GET", `/api/admin/processes/records${query.toString() ? `?${query}` : ""}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json() as Promise<{ success: boolean; data: ProcessRecordRow[]; meta: { total: number; page: number; limit: number } }>;
  },

  toggleState: async (id: string, state: boolean) => {
    const response = await apiRequest("PATCH", `/api/admin/processes/records/${id}/state`, { state });
    if (!response.ok) throw new Error(`Error ${response.status}`);
  },

  listTypes: async (): Promise<TiposProceso[]> => {
    const response = await apiRequest("GET", "/api/admin/processes/types");
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },

  createType: async (payload: { nombre: string; descripcion?: string }) => {
    const response = await apiRequest("POST", "/api/admin/processes/types", payload);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data as TiposProceso;
  },

  updateType: async (id: number, payload: Partial<TiposProceso>) => {
    const response = await apiRequest("PUT", `/api/admin/processes/types/${id}`, payload);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data as TiposProceso;
  },

  deleteType: async (id: number) => {
    const response = await apiRequest("DELETE", `/api/admin/processes/types/${id}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
  },
};

export const adminCommunityService = {
  getOverview: async (): Promise<CommunityOverview> => {
    const response = await apiRequest("GET", "/api/admin/community/overview");
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },

  listPosts: async (params: { page?: number; limit?: number; status?: string; disabled?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "") query.set(key, String(value));
    });
    const response = await apiRequest("GET", `/api/admin/community/posts${query.toString() ? `?${query}` : ""}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json() as Promise<{ success: boolean; data: CommunityAdminPostRow[]; meta: { total: number; page: number; limit: number } }>;
  },

  listReports: async (): Promise<CommunityReportRow[]> => {
    const response = await apiRequest("GET", "/api/admin/community/reports");
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },

  updatePostStatus: async (id: string, status: CommunityAdminPostRow["status"]) => {
    const response = await apiRequest("PATCH", `/api/admin/community/posts/${id}/status`, { status });
    if (!response.ok) throw new Error(`Error ${response.status}`);
  },

  setDisabled: async (id: string, disabled: boolean) => {
    const response = await apiRequest("PATCH", `/api/admin/community/posts/${id}/disabled`, { disabled });
    if (!response.ok) throw new Error(`Error ${response.status}`);
  },
};

export const adminSupportService = {
  getOverview: async (): Promise<SupportOverview> => {
    const response = await apiRequest("GET", "/api/admin/support/overview");
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },

  listSecurityEvents: async (params: { page?: number; limit?: number; search?: string } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "") query.set(key, String(value));
    });
    const response = await apiRequest("GET", `/api/admin/support/security-events${query.toString() ? `?${query}` : ""}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json() as Promise<{ success: boolean; data: SecurityEventRow[]; meta: { total: number; page: number; limit: number } }>;
  },

  getAuditLog: async (params: { page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "") query.set(key, String(value));
    });
    const response = await apiRequest("GET", `/api/admin/support/audit-log${query.toString() ? `?${query}` : ""}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json() as Promise<{ success: boolean; data: SupportOverview["audit"]; meta: { total: number; page: number; limit: number } }>;
  },

  listConversations: async (params: { limit?: number; offset?: number; search?: string } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== "") query.set(key, String(value));
    });
    const response = await apiRequest("GET", `/api/admin/support/conversations${query.toString() ? `?${query}` : ""}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json() as Promise<{ success: boolean; data: SupportConversationRow[]; meta: { total: number; limit: number; offset: number } }>;
  },

  openConversation: async (targetUserId: string): Promise<SupportConversationRow> => {
    const response = await apiRequest("POST", "/api/admin/support/conversations", { targetUserId });
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },

  listPublicRequests: async (params: { limit?: number; offset?: number; search?: string; status?: string } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== "") query.set(key, String(value));
    });
    const response = await apiRequest("GET", `/api/admin/support/public-requests${query.toString() ? `?${query}` : ""}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json() as Promise<{ success: boolean; data: PublicSupportRequestRow[]; meta: { total: number; limit: number; offset: number } }>;
  },

  updatePublicRequestStatus: async (id: string, status: PublicSupportRequestRow["status"]) => {
    const response = await apiRequest("PATCH", `/api/admin/support/public-requests/${id}`, { status });
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data as PublicSupportRequestRow;
  },

  openPublicRequestConversation: async (id: string): Promise<SupportConversationRow> => {
    const response = await apiRequest("POST", `/api/admin/support/public-requests/${id}/open-conversation`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },
};

export const adminConfigService = {
  getOverview: async (): Promise<ConfigOverview> => {
    const response = await apiRequest("GET", "/api/admin/config/overview");
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },

  getRole: async (id: number) => {
    const response = await apiRequest("GET", `/api/admin/config/roles/${id}`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data as { rol: Rol; assignedCodes: string[]; permisos: Permiso[] };
  },

  updateRolePermissions: async (id: number, permisoIds: number[]) => {
    const response = await apiRequest("PUT", `/api/admin/config/roles/${id}/permisos`, { permisoIds });
    if (!response.ok) throw new Error(`Error ${response.status}`);
    return response.json();
  },
};
