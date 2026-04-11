/**
 * Auth Module Index
 * 
 * Re-exports all authentication functions from a single entry point.
 * Solo existe un sistema unificado de autenticación para todos los roles:
 * LAWYER, FIRM, CLIENT
 */

// Unified exports (single auth system for all roles)
export {
  getStoredUser,
  saveStoredUser,
  clearStoredUser,
  loginUnified,
  verifyTwoFactorLogin,
  registerUnified,
  verifyUnifiedSession,
  logoutUnified,
  hasRole,
} from './unified';

// Types
export type {
  UnifiedUser,
  Profile,
  UnifiedLoginParams,
  UnifiedRegisterParams,
  UnifiedAuthResponse,
  VerifySessionResponse,
} from './types';
