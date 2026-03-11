/**
 * useChat - Production Grade WebSocket Hook
 * 
 * IMPROVEMENTS:
 * - Exponential backoff for reconnection
 * - Client-side heartbeat
 * - Proper state management
 * - Cleanup on unmount
 * - Connection status tracking
 */

import { useEffect, useRef, useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { API_URL } from "../config";
import { STORAGE_KEYS } from "../keys";
import { getWsToken, apiRequest } from "../apiClient";
import type { MessageDTO, WsIncomingMessage, WsOutgoingMessage } from "@/shared/schema";

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Reconnection
  INITIAL_RECONNECT_DELAY: 3000,
  MAX_RECONNECT_DELAY: 30000,
  RECONNECT_MULTIPLIER: 2,
  
  // Heartbeat
  PING_INTERVAL: 20000,
  PONG_TIMEOUT: 10000,
  
  // URL
  getWsUrl: (): string => {
    const base = API_URL.replace(/^http/, "ws").replace(/\/$/, "");
    return `${base}/ws/chat`;
  },
};

// ============================================
// TYPES
// ============================================

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface UseChatOptions {
  conversationId: string;
  onNewMessage?: (msg: MessageDTO) => void;
  onReadReceipt?: (data: { conversationId: string; userId: string; readAt: string }) => void;
}

interface UseChatReturn {
  status: ConnectionStatus;
  sendMessage: (content: string) => void;
  markRead: () => void;
  reconnect: () => void;
}

// ============================================
// HOOK
// ============================================

export function useChat({
  conversationId,
  onNewMessage,
  onReadReceipt,
}: UseChatOptions): UseChatReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  
  // Reconnection state
  const reconnectDelay = useRef(CONFIG.INITIAL_RECONNECT_DELAY);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntentionalClose = useRef(false);
  
  // Heartbeat state
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Mount state
  const isMounted = useRef(true);

  // ------------------------------------------
  // Logging
  // ------------------------------------------
  const log = useCallback((message: string, meta?: Record<string, unknown>) => {
    console.log(`[useChat][${new Date().toISOString()}] ${message}`, meta ?? "");
  }, []);

  // ------------------------------------------
  // Clear timers
  // ------------------------------------------
  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (pongTimer.current) {
      clearTimeout(pongTimer.current);
      pongTimer.current = null;
    }
  }, []);

  // ------------------------------------------
  // Handle incoming messages
  // ------------------------------------------
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const payload: WsOutgoingMessage = JSON.parse(event.data as string);
      
      switch (payload.type) {
        case "new_message":
          if (payload.data) {
            onNewMessage?.(payload.data as MessageDTO);
          }
          break;
          
        case "read_receipt":
          if (payload.data) {
            onReadReceipt?.(payload.data as { 
              conversationId: string; 
              userId: string; 
              readAt: string 
            });
          }
          break;
          
        case "pong":
          // Clear pong timeout - server responded
          if (pongTimer.current) {
            clearTimeout(pongTimer.current);
            pongTimer.current = null;
          }
          break;
          
        case "error":
          log("Server error", { message: payload.data });
          break;
      }
    } catch (err) {
      log("Failed to parse message", { error: (err as Error).message });
    }
  }, [onNewMessage, onReadReceipt, log]);

  // ------------------------------------------
  // Handle close
  // ------------------------------------------
  const handleClose = useCallback(() => {
    if (!isMounted.current) return;
    
    clearTimers();
    setStatus("disconnected");
    
    // If intentional close, don't reconnect
    if (isIntentionalClose.current) {
      log("Intentional close, not reconnecting");
      return;
    }
    
    // Exponential backoff
    const delay = Math.min(
      reconnectDelay.current * CONFIG.RECONNECT_MULTIPLIER,
      CONFIG.MAX_RECONNECT_DELAY
    );
    
    log("Scheduling reconnect", { delay, nextDelay: delay * CONFIG.RECONNECT_MULTIPLIER });
    reconnectDelay.current = delay;
    
    reconnectTimer.current = setTimeout(() => {
      if (isMounted.current && !isIntentionalClose.current) {
        connect();
      }
    }, delay);
  }, [clearTimers, log]);

  // ------------------------------------------
  // Handle errors
  // ------------------------------------------
  const handleError = useCallback((error: Event) => {
    log("WebSocket error", { error: (error as unknown as Error).message });
    setStatus("error");
  }, [log]);

  // ------------------------------------------
  // Start heartbeat
  // ------------------------------------------
  const startHeartbeat = useCallback(() => {
    // Clear existing
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
    }
    
    heartbeatTimer.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Send ping
        wsRef.current.send(JSON.stringify({ type: "ping" }));
        
        // Set timeout for pong response
        if (pongTimer.current) {
          clearTimeout(pongTimer.current);
        }
        
        pongTimer.current = setTimeout(() => {
          log("Pong timeout - connection dead");
          wsRef.current?.close();
        }, CONFIG.PONG_TIMEOUT);
      }
    }, CONFIG.PING_INTERVAL);
  }, [log]);

  // ------------------------------------------
  // Connect
  // ------------------------------------------
  const connect = useCallback(async () => {
    if (!isMounted.current) return;
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Get token
    let token = await getWsToken();
    
    // On web, try to get token from API
    if (!token && Platform.OS === "web") {
      try {
        const res = await apiRequest("GET", "/api/auth/token");
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            const newToken = data.token as string;
            token = newToken;
            await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
          }
        }
      } catch {
        // Ignore
      }
    }
    
    if (!token) {
      token = await AsyncStorage.getItem(STORAGE_KEYS.CLIENT_AUTH_ID);
    }
    
    if (!token) {
      log("No token, cannot connect");
      setStatus("disconnected");
      return;
    }
    
    setStatus("connecting");
    log("Connecting", { url: CONFIG.getWsUrl() });
    
    try {
      // Create WebSocket with token in query param
      // Note: React Native doesn't support headers in WebSocket
      const ws = new WebSocket(`${CONFIG.getWsUrl()}?token=${encodeURIComponent(token)}`);
      
      ws.onopen = () => {
        if (!isMounted.current) {
          ws.close();
          return;
        }
        
        log("Connected");
        setStatus("connected");
        reconnectDelay.current = CONFIG.INITIAL_RECONNECT_DELAY;
        
        // Join conversation room
        const joinMsg: WsIncomingMessage = { 
          type: "join", 
          conversationId 
        };
        ws.send(JSON.stringify(joinMsg));
        
        // Start heartbeat
        startHeartbeat();
      };
      
      ws.onmessage = handleMessage;
      ws.onclose = handleClose;
      ws.onerror = handleError;
      
      wsRef.current = ws;
    } catch (err) {
      log("Connection failed", { error: (err as Error).message });
      setStatus("error");
      
      // Schedule reconnect
      reconnectTimer.current = setTimeout(() => {
        if (isMounted.current) {
          connect();
        }
      }, reconnectDelay.current);
      
      reconnectDelay.current = Math.min(
        reconnectDelay.current * CONFIG.RECONNECT_MULTIPLIER,
        CONFIG.MAX_RECONNECT_DELAY
      );
    }
  }, [
    conversationId, 
    handleMessage, 
    handleClose, 
    handleError, 
    startHeartbeat, 
    log
  ]);

  // ------------------------------------------
  // Reconnect (manual)
  // ------------------------------------------
  const reconnect = useCallback(() => {
    isIntentionalClose.current = false;
    reconnectDelay.current = CONFIG.INITIAL_RECONNECT_DELAY;
    connect();
  }, [connect]);

  // ------------------------------------------
  // Send message
  // ------------------------------------------
  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: WsIncomingMessage = {
        type: "send_message",
        conversationId,
        content,
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  }, [conversationId]);

  // ------------------------------------------
  // Mark read
  // ------------------------------------------
  const markRead = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: WsIncomingMessage = {
        type: "mark_read",
        conversationId,
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  }, [conversationId]);

  // ------------------------------------------
  // Connect on mount / conversation change
  // ------------------------------------------
  useEffect(() => {
    isMounted.current = true;
    isIntentionalClose.current = false;
    reconnectDelay.current = CONFIG.INITIAL_RECONNECT_DELAY;
    
    connect();
    
    return () => {
      isMounted.current = false;
      isIntentionalClose.current = true;
      clearTimers();
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, clearTimers]);

  return {
    status,
    sendMessage,
    markRead,
    reconnect,
  };
}
