/**
 * Centralized Storage Keys
 * 
 * All AsyncStorage keys used throughout the application are defined here.
 * This eliminates duplication and makes key management consistent.
 */

export const STORAGE_KEYS = {
  // Auth tokens
  AUTH_TOKEN: 'lextrack_auth_token',
  REFRESH_TOKEN: 'lextrack_refresh_token',
  
  // Unified user data (new SaaS system)
  USER: 'lextrack_user',
  
  // Abogado (Lawyer) data (legacy)
  ABOGADO: 'lextrack_abogado',
  
  // Cliente (Client) data (legacy)
  CLIENTE: 'lextrack_cliente',
  CLIENT_AUTH_ID: 'lextrack_client_auth_id',
  CLIENTES: 'lextrack_clientes', 
} as const;

// Type for key values
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
