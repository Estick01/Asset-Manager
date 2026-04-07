/**
 * ChatNotificationContext
 *
 * Global context that maintains a persistent WebSocket connection for the
 * logged-in user. Listens for `notification` events (messages received while
 * the user is NOT inside the relevant conversation) and:
 *   - Increments the global unread-message badge count (for the nav tab icon)
 *   - Shows a toast (sonner-native) so the user sees a floating alert on mobile
 *     and a subtle notification on web
 *
 * Also listens for `new_message` events to keep unreadCount in sync when the
 * user IS inside a conversation but another conversation gets a message.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { toast } from "sonner-native";
import { useAuth } from "@/lib/auth-context";
import { getUnreadCount } from "@/lib/services/chatService";
import { getWsToken, apiRequest } from "@/lib/apiClient";
import { STORAGE_KEYS } from "@/lib/keys";
import { API_URL } from "@/lib/config";
import type { WsNotificationData, WsOutgoingMessage } from "@/shared/schema";

// ─── types ───────────────────────────────────────────────────────────────────

interface ChatNotificationContextValue {
  /** Total unread messages across all conversations */
  unreadCount: number;
  /** Call when the user opens a conversation so badge decreases */
  clearConversation: (conversationId: string) => void;
  /** Force a full refresh from the server */
  refreshUnread: () => Promise<void>;
}

// ─── context ─────────────────────────────────────────────────────────────────

const ChatNotificationContext = createContext<ChatNotificationContextValue>({
  unreadCount: 0,
  clearConversation: () => {},
  refreshUnread: async () => {},
});

// ─── WS URL helper ───────────────────────────────────────────────────────────

function getWsUrl(): string {
  const base = API_URL.replace(/^http/, "ws").replace(/\/$/, "");
  return `${base}/ws/chat`;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ChatNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // conversationId → unread delta tracked by this session (for clearConversation)
  const sessionUnread = useRef<Map<string, number>>(new Map());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(4000);
  const isMounted = useRef(true);
  const intentionalClose = useRef(false);

  // ── Fetch total unread from server ────────────────────────────────────────
  const refreshUnread = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const count = await getUnreadCount();
      if (isMounted.current) {
        setUnreadCount(count);
        sessionUnread.current.clear();
      }
    } catch {
      // silent — badge just won't update until next poll
    }
  }, [isLoggedIn]);

  // ── Clear one conversation's contribution to the badge ───────────────────
  const clearConversation = useCallback((conversationId: string) => {
    // Optimistically subtract the local tracked count immediately
    const contribution = sessionUnread.current.get(conversationId) ?? 0;
    sessionUnread.current.delete(conversationId);
    if (contribution > 0) {
      setUnreadCount((prev) => Math.max(0, prev - contribution));
    }
    // Then sync with server to get the accurate count (handles server-loaded unread)
    refreshUnread();
  }, [refreshUnread]);

  // ── Handle incoming WS events ─────────────────────────────────────────────
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const payload: WsOutgoingMessage = JSON.parse(event.data as string);

        if (payload.type === "notification") {
          const data = payload.data as WsNotificationData;

          // Increment badge
          setUnreadCount((prev) => prev + 1);
          const prev = sessionUnread.current.get(data.conversationId) ?? 0;
          sessionUnread.current.set(data.conversationId, prev + 1);

          // Show toast — looks like a push notification on mobile
          if (Platform.OS !== "web") {
            toast(`${data.senderName}`, {
              description: data.preview,
              duration: 5000,
            });
          }
          // On web: only the badge updates (no intrusive toast)
        }
      } catch {
        // ignore parse errors
      }
    },
    []
  );

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!isMounted.current || !isLoggedIn) return;

    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    // Get auth token
    let token = await getWsToken();

    if (!token && Platform.OS === "web") {
      try {
        const res = await apiRequest("GET", "/api/auth/token");
        if (res.ok) {
          const data = await res.json() as { token?: string };
          if (data.token) {
            token = data.token;
            await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
          }
        }
      } catch {
        // ignore
      }
    }

    if (!token) {
      token = await AsyncStorage.getItem(STORAGE_KEYS.CLIENT_AUTH_ID);
    }

    if (!token) return;

    try {
      const ws = new WebSocket(`${getWsUrl()}?token=${encodeURIComponent(token)}`);

      ws.onopen = () => {
        reconnectDelay.current = 4000;
        // Don't join any room — we only want "notification" events that the
        // server sends to users who are NOT in a room
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        if (!isMounted.current || intentionalClose.current) return;
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(
            reconnectDelay.current * 1.5,
            60000
          );
          connect();
        }, reconnectDelay.current);
      };

      ws.onerror = () => {
        // onclose fires automatically after onerror
      };

      wsRef.current = ws;
    } catch {
      // ignore — will retry on next reconnect
    }
  }, [isLoggedIn, handleMessage]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    intentionalClose.current = false;

    if (isLoggedIn) {
      // Load initial unread count
      refreshUnread();
      // Open global WS connection
      connect();
    } else {
      setUnreadCount(0);
      sessionUnread.current.clear();
    }

    return () => {
      isMounted.current = false;
      intentionalClose.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isLoggedIn, connect, refreshUnread]);

  // Refresh badge every 60 s (covers missed WS events)
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(refreshUnread, 60_000);
    return () => clearInterval(interval);
  }, [isLoggedIn, refreshUnread]);

  return (
    <ChatNotificationContext.Provider
      value={{ unreadCount, clearConversation, refreshUnread }}
    >
      {children}
    </ChatNotificationContext.Provider>
  );
}

export const useChatNotifications = () => useContext(ChatNotificationContext);
