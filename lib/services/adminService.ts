
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
    const response = await apiRequest("GET", '/api/admin/planes');
    if (!response.ok) {
      console.error('Failed to fetch planes from API');
      return [];
    }
    return await response.json();
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
    if (params.page)   query.set("page",   String(params.page));
    if (params.limit)  query.set("limit",  String(params.limit));
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

  resetPassword: async (id: string): Promise<{ token: string; expiresIn: string }> => {
    const response = await apiRequest("POST", `/api/admin/users/${id}/reset-password`);
    if (!response.ok) throw new Error(`Error ${response.status}`);
    const body = await response.json();
    return body.data;
  },
};
