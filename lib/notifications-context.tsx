/**
 * NotificationsContext
 *
 * Provides the unread notification count for the current user (lawyer, firm or client).
 * Polls every 30 s so the tab badge stays up to date.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getNotificacionesCountAbogado,
  getNotificacionesCountFirma,
  getNotificacionesCountCliente,
} from "@/lib/services/notificacionService";

interface NotificationsContextValue {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
  resetUnread: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  unreadCount: 0,
  refreshUnread: async () => {},
  resetUnread: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const isMounted = useRef(true);

  const refreshUnread = useCallback(async () => {
    if (!isLoggedIn || !user) return;
    try {
      const rolNombre = user.user?.rol?.nombre;
      const profileId = profile?.id;
      if (!profileId) return;

      let count = 0;
      if (rolNombre === "abogado") {
        count = await getNotificacionesCountAbogado(profileId);
      } else if (rolNombre === "bufete") {
        count = await getNotificacionesCountFirma(profileId);
      } else if (rolNombre === "cliente") {
        count = await getNotificacionesCountCliente(profileId);
      }

      if (isMounted.current) setUnreadCount(count);
    } catch {
      // silent
    }
  }, [isLoggedIn, user, profile]);

  const resetUnread = useCallback(() => setUnreadCount(0), []);

  useEffect(() => {
    isMounted.current = true;
    if (isLoggedIn) {
      refreshUnread();
      const interval = setInterval(refreshUnread, 30_000);
      return () => {
        isMounted.current = false;
        clearInterval(interval);
      };
    } else {
      setUnreadCount(0);
    }
    return () => { isMounted.current = false; };
  }, [isLoggedIn, refreshUnread]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnread, resetUnread }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
