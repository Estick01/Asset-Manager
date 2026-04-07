/**
 * Subscription Context
 *
 * Caches the active plan + features for the logged-in user.
 * Provides `hasFeature(code)` for client-side gating.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { router } from "expo-router";
import { useAuth } from "./auth-context";
import { getMiSuscripcion, type MiSuscripcion, type PlanPublico } from "./services/suscripcionService";
import { featureGateEvents } from "./feature-gate-events";
import { FeatureLockedModal } from "@/components/subscription/FeatureLockedModal";

// ── Feature labels legibles ──────────────────────────────────────────────────

export const FEATURE_LABELS: Record<string, string> = {
  calendario:           "Calendario",
  etapas_procesales:    "Etapas procesales",
  comunidad:            "Comunidad",
  chat:                 "Chat con clientes",
  privacidad_basica:    "Privacidad básica",
  privacidad_avanzada:  "Privacidad avanzada",
  dashboard_bufete:     "Dashboard de bufete",
  roles_custom:         "Roles personalizados",
  soporte_prioritario:  "Soporte prioritario",
};

// Nombre del plan mínimo que incluye cada feature
export const FEATURE_MIN_PLAN: Record<string, string> = {
  calendario:           "Esencial",
  etapas_procesales:    "Esencial",
  comunidad:            "Pro",
  chat:                 "Pro",
  privacidad_basica:    "Esencial",
  privacidad_avanzada:  "Pro",
  dashboard_bufete:     "Starter",
  roles_custom:         "Business",
  soporte_prioritario:  "Enterprise",
};

// ── Tipos ────────────────────────────────────────────────────────────────────

interface SubscriptionContextValue {
  isLoading: boolean;
  plan: PlanPublico | null;
  suscripcion: MiSuscripcion["suscripcion"] | null;
  uso: MiSuscripcion["uso"] | null;
  hasFeature: (code: string) => boolean;
  refresh: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, user } = useAuth();

  const [isLoading, setIsLoading]           = useState(true);
  const [data, setData]                     = useState<MiSuscripcion | null>(null);
  const [features, setFeatures]             = useState<Set<string>>(new Set());
  const [globalLockedFeature, setGlobalLockedFeature] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isLoggedIn) {
      setData(null);
      setFeatures(new Set());
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await getMiSuscripcion();
      setData(result);
      const featureSet = new Set(
        (result.plan?.features ?? []).map((f) => f.code)
      );
      setFeatures(featureSet);
    } catch {
      // Sin suscripción activa → plan gratis sin features
      setData(null);
      setFeatures(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  // Recargar cuando cambia el usuario logueado
  useEffect(() => {
    load();
  }, [load, user?.user?.id]);

  // Escuchar eventos globales de feature bloqueada (emitidos por apiClient)
  useEffect(() => {
    const unsub = featureGateEvents.subscribe((code) => {
      setGlobalLockedFeature(code);
    });
    return unsub;
  }, []);

  const hasFeature = useCallback(
    (code: string) => features.has(code),
    [features]
  );

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      isLoading,
      plan:        data?.plan ?? null,
      suscripcion: data?.suscripcion ?? null,
      uso:         data?.uso ?? null,
      hasFeature,
      refresh:     load,
    }),
    [isLoading, data, hasFeature, load]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      <FeatureLockedModal
        visible={globalLockedFeature !== null}
        featureCode={globalLockedFeature ?? ""}
        onClose={() => setGlobalLockedFeature(null)}
        onVerPlanes={() => {
          setGlobalLockedFeature(null);
          router.push("/(auth)/planes" as any);
        }}
      />
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}
