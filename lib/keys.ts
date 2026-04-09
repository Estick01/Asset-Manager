/**
 * Centralized Storage Keys
 * 
 * All AsyncStorage keys used throughout the application are defined here.
 * This eliminates duplication and makes key management consistent.
 */

export const STORAGE_KEYS = {
  // Auth tokens
  AUTH_TOKEN: 'procesoclaro_auth_token',
  REFRESH_TOKEN: 'procesoclaro_refresh_token',
  
  // Unified user data (new SaaS system)
  USER: 'procesoclaro_user',
  
  // Abogado (Lawyer) data (legacy)
  ABOGADO: 'procesoclaro_abogado',
  
  // Cliente (Client) data (legacy)
  CLIENTE: 'procesoclaro_cliente',
  CLIENT_AUTH_ID: 'procesoclaro_client_auth_id',
  CLIENTES: 'procesoclaro_clientes', 
} as const;

// Type for key values
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
