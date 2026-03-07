/**
 * Storage module - Client-side authentication and data persistence
 * 
 * This module re-exports authentication and storage functions from various
 * internal modules to provide a unified API for the auth context.
 * 
 * Now uses unified auth system for all roles (LAWYER, FIRM, CLIENT)
 */

// Re-export unified user type from auth
export type { UnifiedUser } from "./auth";

// Re-export Notificacion type from shared schema
export type { Notificacion } from "../shared/schema";

// Re-export token management functions from apiClient
export {
  saveAuthToken,
  getAuthToken,
  clearAuthToken,
} from "./apiClient";

// Re-export unified authentication functions from authService
export {
  getStoredUser as getUser,
  saveStoredUser as saveUser,
  loginUnified as login,
  registerUnified as register,
  logoutUnified as logout,
  verifyUnifiedSession as isAuthenticated,
} from "./services/authService";

// Re-export permission functions from adminService
export {
  getUserPermisos as getPermisos,
} from "./services/adminService";
