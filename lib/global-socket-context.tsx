/**
 * GlobalSocketContext
 *
 * Mantiene una única conexión WebSocket persistente para el usuario autenticado.
 * Despacha señales de timestamp cuando llegan eventos `new_notification` o
 * `new_invitation`, de modo que los contextos dependientes (notificaciones,
 * invitaciones) puedan reaccionar sin necesidad de polling.
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
import { API_URL } from "@/lib/config";
import { getWsToken } from "@/lib/apiClient";

// ─── Config ──────────────────────────────────────────────────────────────────

const PING_INTERVAL   = 25_000;   // ms entre pings
const RECONNECT_BASE  = 3_000;    // ms de espera inicial
const RECONNECT_MAX   = 30_000;   // ms máximo de backoff

function getWsUrl(): string {
  return API_URL.replace(/^http/, "ws").replace(/\/$/, "") + "/ws/chat";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlobalSocketValue {
  /** Se incrementa cada vez que llega un evento new_notification */
  lastNotificationAt: number;
  /** Se incrementa cada vez que llega un evento new_invitation */
  lastInvitationAt: number;
  /** Timestamp del último new_case_match recibido (para refrescar el feed) */
  lastCaseMatchAt: number;
  /** Cantidad de casos nuevos sin ver desde la última visita al tab */
  unseenCaseCount: number;
  /** Llama esto cuando el abogado abre el tab de Comunidad (feed) */
  clearCaseBadge: () => void;
}

const GlobalSocketContext = createContext<GlobalSocketValue>({
  lastNotificationAt: 0,
  lastInvitationAt:   0,
  lastCaseMatchAt:    0,
  unseenCaseCount:    0,
  clearCaseBadge:     () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GlobalSocketProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [lastNotificationAt, setLastNotificationAt] = useState(0);
  const [lastInvitationAt,   setLastInvitationAt]   = useState(0);
  const [lastCaseMatchAt,    setLastCaseMatchAt]    = useState(0);
  const [unseenCaseCount,    setUnseenCaseCount]    = useState(0);

  const clearCaseBadge = useCallback(() => setUnseenCaseCount(0), []);

  const wsRef           = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay  = useRef(RECONNECT_BASE);
  const isMounted       = useRef(true);

  const clearPing = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  const clearReconnect = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  const disconnect = useCallback(() => {
    clearPing();
    clearReconnect();
    if (wsRef.current) {
      wsRef.current.onclose = null; // evitar reconexión en cierre intencional
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!isMounted.current || !isLoggedIn) return;

    const token = await getWsToken();
    if (!token) return;

    const url = `${getWsUrl()}?token=${encodeURIComponent(token)}`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = RECONNECT_BASE; // reset backoff
      // Heartbeat
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL);
    };

    ws.onmessage = (event) => {
      if (!isMounted.current) return;
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "new_notification") {
          setLastNotificationAt(Date.now());
        } else if (msg.type === "new_invitation") {
          setLastInvitationAt(Date.now());
        } else if (msg.type === "new_case_match") {
          const now = Date.now();
          setLastCaseMatchAt(now);
          setUnseenCaseCount(c => c + 1);
        }
      } catch { /* ignorar mensajes malformados */ }
    };

    ws.onclose = () => {
      clearPing();
      if (!isMounted.current || !isLoggedIn) return;
      // Reconexión con backoff exponencial
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, RECONNECT_MAX);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => {
      ws.close(); // onclose se encargará de la reconexión
    };
  }, [isLoggedIn]);

  useEffect(() => {
    isMounted.current = true;
    if (isLoggedIn) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      isMounted.current = false;
      disconnect();
    };
  }, [isLoggedIn, connect, disconnect]);

  return (
    <GlobalSocketContext.Provider value={{ lastNotificationAt, lastInvitationAt, lastCaseMatchAt, unseenCaseCount, clearCaseBadge }}>
      {children}
    </GlobalSocketContext.Provider>
  );
}

export const useGlobalSocket = () => useContext(GlobalSocketContext);
