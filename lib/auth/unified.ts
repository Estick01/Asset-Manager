/**
 * Unified Authentication Module
 * 
 * Handles all authentication operations with unified roles: LAWYER, FIRM, CLIENT
 * This is the new authentication system for the SaaS architecture.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../keys';
import {
  apiRequest,
  saveAuthToken,
  saveRefreshToken,
  clearAuthToken,
} from '../apiClient';
import type { 
  UnifiedLoginParams, 
  UnifiedRegisterParams, 
  UnifiedAuthResponse,
  UnifiedUser,
  VerifySessionResponse,
} from './types';
import { Rol } from '@/shared/schema';

export class AuthRequestError extends Error {
  code?: string;
  requiresEmailVerification?: boolean;
  requiresTwoFactor?: boolean;
  email?: string;
  challengeId?: string;
  newDeviceDetected?: boolean;

  constructor(message: string, options?: { code?: string; requiresEmailVerification?: boolean; requiresTwoFactor?: boolean; email?: string; challengeId?: string; newDeviceDetected?: boolean }) {
    super(message);
    this.name = "AuthRequestError";
    this.code = options?.code;
    this.requiresEmailVerification = options?.requiresEmailVerification;
    this.requiresTwoFactor = options?.requiresTwoFactor;
    this.email = options?.email;
    this.challengeId = options?.challengeId;
    this.newDeviceDetected = options?.newDeviceDetected;
  }
}

// --- Storage Functions ---

/**
 * Get stored user from local storage
 */
export async function getStoredUser(): Promise<UnifiedUser | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  return data ? JSON.parse(data) : null;
}

/**
 * Save user to local storage
 */
export async function saveStoredUser(user: UnifiedUser): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

/**
 * Clear stored user
 */
export async function clearStoredUser(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.USER);
}

// --- Authentication Functions ---

/**
 * Login with unified system (email + password)
 */
export async function loginUnified(
  email: string,
  password: string
): Promise<UnifiedUser | null> {
  const response = await apiRequest("POST", '/api/login', { correo: email, password });


  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AuthRequestError(
      error.error || 'Credenciales inválidas',
      {
        code: error.code,
        requiresEmailVerification: error.requiresEmailVerification,
        email,
      },
    );
  }

  const authData: UnifiedAuthResponse = await response.json();
  if (authData.requiresTwoFactor && authData.challengeId) {
    throw new AuthRequestError(
      'Ingresa el código de autenticación de tu app o un código de recuperación.',
      {
        code: 'TWO_FACTOR_REQUIRED',
        requiresTwoFactor: true,
        challengeId: authData.challengeId,
        email,
        newDeviceDetected: authData.newDeviceDetected,
      },
    );
  }

  // Save tokens (access + refresh) for mobile; web uses httpOnly cookies
  if (authData.token) await saveAuthToken(authData.token);
  if ((authData as any).refreshToken) await saveRefreshToken((authData as any).refreshToken);

  const user: UnifiedUser = {
    user: authData.user,
    profile: authData.profile,
    permisos: authData.permisos ?? [],
  };
  await saveStoredUser(user);
  return user;
}

export async function verifyTwoFactorLogin(
  challengeId: string,
  code: string
): Promise<UnifiedUser | null> {
  const response = await apiRequest("POST", "/api/auth/2fa/verify-login", { challengeId, code });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AuthRequestError(
      error.error || 'No se pudo verificar el código.',
      { code: error.code }
    );
  }

  const authData: UnifiedAuthResponse = await response.json();
  if (authData.token) await saveAuthToken(authData.token);
  if ((authData as any).refreshToken) await saveRefreshToken((authData as any).refreshToken);

  const user: UnifiedUser = {
    user: authData.user,
    profile: authData.profile,
    permisos: authData.permisos ?? [],
  };
  await saveStoredUser(user);
  return user;
}

/**
 * Register a new user with unified system
 */
export async function registerUnified(
  data: UnifiedRegisterParams
): Promise<UnifiedUser | null> {
  const response = await apiRequest("POST", '/api/register', data);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al registrar');
  }

  const authData: UnifiedAuthResponse = await response.json();

  // Save token for WebSocket (needed on all platforms including web)
  if (authData.token) {
    await saveAuthToken(authData.token);
  }

  const user: UnifiedUser =  {user: authData.user, profile: authData.profile};

  await saveStoredUser(user);
  return user;
}

/**
 * Verify if user session is valid
 */
export async function verifyUnifiedSession(): Promise<VerifySessionResponse> {
  try {
    const response = await apiRequest("GET", '/api/auth/verify');
    if (!response.ok) {
      return { authenticated: false, user: undefined };
    }
    const data: VerifySessionResponse = await response.json();

    if (data.authenticated && data.user && data.profile) {
      await saveStoredUser({
        user: data.user,
        profile: data.profile,
        permisos: data.permisos ?? [],
      });
      return data;
    }
    return { authenticated: false, user: undefined };
  } catch {
    return { authenticated: false, user: undefined };
  }
}

/**
 * Logout user
 */
export async function logoutUnified(): Promise<void> {
  try {
    await apiRequest("POST", '/api/auth/logout');
  } catch (error) {
    console.warn('Logout request failed, cleaning up locally anyway.', error);
  }
  await clearStoredUser();
  await clearAuthToken();
}

/**
 * Check if user has required role
 */
export function hasRole(user: UnifiedUser | null, role: Rol): boolean {
  return user?.user?.rol?.id === role.id;
}
