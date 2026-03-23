/**
 * NotificationsContext
 *
 * Provee el conteo de notificaciones no leídas.
 * Se actualiza en tiempo real via WebSocket (new_notification) en lugar de polling.
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
import { useGlobalSocket } from "@/lib/global-socket-context";
import {
  getNotificacionesCountAbogado,
  getNotificacionesCountFirma,
  getNotificacionesCountCliente,
} from "@/lib/services/notificacionService";
import { getAppNotificationsUnreadCount } from "@/lib/services/clientRequestService";

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
  const { lastNotificationAt } = useGlobalSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const isMounted = useRef(true);

  const refreshUnread = useCallback(async () => {
    if (!isLoggedIn || !user) return;
    try {
      const rolNombre = user.user?.rol?.nombre;
      const profileId = profile?.id;
      if (!profileId) return;

      // Fetch old (process/task) notifications + new (community/app) notifications in parallel
      let legacyCount = 0;
      if (rolNombre === "abogado") {
        legacyCount = await getNotificacionesCountAbogado(profileId);
      } else if (rolNombre === "bufete") {
        legacyCount = await getNotificacionesCountFirma(profileId);
      } else if (rolNombre === "cliente") {
        legacyCount = await getNotificacionesCountCliente(profileId);
      }

      const appCount = await getAppNotificationsUnreadCount();
      if (isMounted.current) setUnreadCount(legacyCount + appCount);
    } catch {
      // silent
    }
  }, [isLoggedIn, user, profile]);

  const resetUnread = useCallback(() => setUnreadCount(0), []);

  // Carga inicial al autenticarse
  useEffect(() => {
    isMounted.current = true;
    if (isLoggedIn) {
      refreshUnread();
    } else {
      setUnreadCount(0);
    }
    return () => { isMounted.current = false; };
  }, [isLoggedIn, refreshUnread]);

  // Refresca cuando llega un new_notification via WebSocket
  useEffect(() => {
    if (lastNotificationAt > 0) {
      refreshUnread();
    }
  }, [lastNotificationAt, refreshUnread]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnread, resetUnread }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
