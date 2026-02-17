import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { type Abogado, getAbogado, isAuthenticated, loginAbogado, registerAbogado, logout as doLogout, saveAbogado } from "@/lib/storage";

interface AuthContextValue {
  user: Abogado | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (correo: string, password: string) => Promise<boolean>;
  register: (data: { nombre: string; correo: string; password: string; despacho: string; telefono: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Abogado>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Abogado | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const auth = await isAuthenticated();
      if (auth) {
        const abogado = await getAbogado();
        setUser(abogado);
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (correo: string, password: string): Promise<boolean> => {
    const abogado = await loginAbogado(correo, password);
    if (abogado) {
      setUser(abogado);
      return true;
    }
    return false;
  };

  const register = async (data: { nombre: string; correo: string; password: string; despacho: string; telefono: string }): Promise<boolean> => {
    const abogado = await registerAbogado(data);
    setUser(abogado);
    return true;
  };

  const logout = async () => {
    await doLogout();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<Abogado>) => {
    if (user) {
      const updated = { ...user, ...updates };
      await saveAbogado(updated);
      setUser(updated);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isLoggedIn: !!user,
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, isLoading],
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
