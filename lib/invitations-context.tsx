import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getLawyerInvitations } from "@/lib/services/firmInvitationService";
import { useAuth } from "@/lib/auth-context";
import { useGlobalSocket } from "@/lib/global-socket-context";

interface InvitationsContextValue {
  pendingCount: number;
  refreshCount: () => Promise<void>;
}

const InvitationsContext = createContext<InvitationsContextValue>({
  pendingCount: 0,
  refreshCount: async () => {},
});

export function InvitationsProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLawyerUser } = useAuth();
  const { lastInvitationAt } = useGlobalSocket();
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(async () => {
    if (!isLoggedIn || !isLawyerUser) return;
    const result = await getLawyerInvitations();
    if (result.data) {
      setPendingCount(result.data.filter(i => i.status === "pendiente").length);
    }
  }, [isLoggedIn, isLawyerUser]);

  // Carga inicial
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // Refresca cuando llega un new_invitation via WebSocket
  useEffect(() => {
    if (lastInvitationAt > 0) {
      refreshCount();
    }
  }, [lastInvitationAt, refreshCount]);

  return (
    <InvitationsContext.Provider value={{ pendingCount, refreshCount }}>
      {children}
    </InvitationsContext.Provider>
  );
}

export const useInvitations = () => useContext(InvitationsContext);
