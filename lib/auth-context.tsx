import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { type Abogado, getAbogado, isAuthenticated, loginAbogado, registerAbogado, logout as doLogout, saveAbogado, getPermisos, saveAuthToken, getAuthToken, clearAuthToken } from "@/lib/storage";

interface AuthContextValue {
  user: Abogado | null;
  permisos: string[];
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (correo: string, password: string) => Promise<boolean>;
  register: (data: { nombre: string; correo: string; password: string; despacho: string; telefono: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Abogado>) => Promise<void>;
  hasPermission: (permiso: string) => boolean;
  refreshPermisos: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Abogado | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const auth = await isAuthenticated();
        if (auth) {
          const abogado = await getAbogado();
          if (abogado) {
            setUser(abogado);
            // Cargar permisos (with timeout to prevent hanging)
            try {
              const perms = await Promise.race([
                getPermisos(),
                new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 5000))
              ]);
              setPermisos(perms);
            } catch (permError) {
              console.error("Error loading permisos:", permError);
              setPermisos([]);
            }
          }
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (correo: string, password: string): Promise<boolean> => {
    try {
      const user = await loginAbogado(correo, password);
      if (user) {
        setUser(user);
        // Load permissions after login (with timeout to prevent hanging)
        try {
          const perms = await Promise.race([
            getPermisos(),
            new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 5000))
          ]);
          setPermisos(perms);
        } catch (permError) {
          console.error("Error loading permisos:", permError);
          setPermisos([]);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const register = async (data: { nombre: string; correo: string; password: string; despacho: string; telefono: string }): Promise<boolean> => {
    try {
      const newUser = await registerAbogado(data);
      setUser(newUser);
      // Load permissions after registration (with timeout to prevent hanging)
      try {
        const perms = await Promise.race([
          getPermisos(),
          new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 5000))
        ]);
        setPermisos(perms);
      } catch (permError) {
        console.error("Error loading permisos:", permError);
        setPermisos([]);
      }
      return true;
    } catch (error) {
      console.error("Registration error:", error);
      return false;
    }
  };

  const logout = async () => {
    await doLogout();
    await clearAuthToken();
    setUser(null);
    setPermisos([]);
  };

  const updateProfile = async (updates: Partial<Abogado>) => {
    if (user) {
      const updated = { ...user, ...updates };
      await saveAbogado(updated);
      setUser(updated);
    }
  };

  const refreshPermisos = async () => {
    const perms = await getPermisos();
    setPermisos(perms);
  };

  const hasPermission = (permiso: string): boolean => {
    return permisos.includes(permiso);
  };

  const value = useMemo(
    () => ({
      user,
      permisos,
      isLoading,
      isLoggedIn: !!user,
      login,
      register,
      logout,
      updateProfile,
      hasPermission,
      refreshPermisos,
    }),
    [user, permisos, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
