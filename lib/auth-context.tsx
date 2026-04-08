/**
 * Unified Authentication Context
 * 
 * React Context for managing unified authentication state.
 * Supports roles: LAWYER, FIRM, CLIENT
 * This is the new authentication context for the SaaS architecture.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import {
  loginUnified,
  logoutUnified,
  verifyUnifiedSession,
  saveStoredUser,
  hasRole,
  type UnifiedUser,
  type Profile,
} from './auth';
import { Rol } from '@/shared/schema';

export interface AuthContextValue {
  isLoading: boolean;
  isLoggedIn: boolean;
  user: UnifiedUser | null;
  profile: Profile | undefined;
  isClientUser: boolean;
  isLawyerUser: boolean;
  isFirmUser: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UnifiedUser>) => Promise<void>;
  checkRole: (role: Rol) => boolean;
  /** Returns true if the current user has the given permission code */
  hasPermission: (code: string) => boolean;
}

// Legacy type exports for backward compatibility
export interface AbogadoUser extends UnifiedUser {
  numeroTarjetaProfesional?: string;
  firstName?: string;
  lastName?: string;
  specialization?: string;
  licenseNumber?: string;
}

export interface BufeteUser extends UnifiedUser {
  name?: string;
}

export interface ClienteUser extends UnifiedUser {
  telefono?: string;
}


const AuthContext = createContext<AuthContextValue | null>(null);

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UnifiedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const data = await verifyUnifiedSession();
        if (data.authenticated && data?.user && data.profile) {
          setUser({ user: data.user, profile: data.profile, permisos: data.permisos ?? [] });
          await saveStoredUser({ user: data.user, profile: data.profile, permisos: data.permisos ?? [] });
        } else {
          setUser(null);
        }

      } catch (error) {
        console.error("Error checking unified session:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const loggedInUser = await loginUnified(email, password);
    if (loggedInUser && loggedInUser.user && loggedInUser.profile) {
      setUser(loggedInUser);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(async () => {
    await logoutUnified();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UnifiedUser>) => {
    if (user) {
      const updated = { ...user, ...updates };
      await saveStoredUser(updated);
      setUser(updated);
    }
  }, [user]);

  const checkRole = useCallback((role: Rol): boolean => {
    return hasRole(user, role);
  }, [user]);

  const hasPermission = useCallback((code: string): boolean => {
    return user?.permisos?.includes(code) ?? false;
  }, [user]);

  const value: AuthContextValue = useMemo(() => {
    // Only compute derived values if user exists
    const profile = user?.profile;
    const userRole = user?.user?.rol?.nombre?.toLowerCase() || "";

    return {
      user: user || null,
      profile: profile || undefined,
      isLoading,
      isLoggedIn: !!(user && user.user && user.profile),
      isClientUser: userRole.includes('cliente'),
      isLawyerUser: userRole.includes('abogado') || userRole.includes('lawyer'),
      isFirmUser: userRole.includes('bufete') || userRole.includes('firm') || userRole.includes('empresa'),
      login,
      logout,
      updateProfile,
      checkRole,
      hasPermission,
    };
  }, [user, isLoading, login, logout, updateProfile, checkRole, hasPermission]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within UnifiedAuthProvider');
  }
  return context;
}

// Alias for backward compatibility
export const useUnifiedAuth = useAuth;

