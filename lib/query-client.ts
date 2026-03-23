
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from 'react-native';
import { API_URL, IS_NGROK } from './config';
import { STORAGE_KEYS } from './keys';
import { toastApiError } from './api-error';

// ─── Silent Refresh ───────────────────────────────────────────────────────────
// Shared promise: concurrent 401s reuse the same refresh attempt
let _refreshPromise: Promise<boolean> | null = null;

function attemptSilentRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = _doRefresh().finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

async function _doRefresh(): Promise<boolean> {
  try {
    const isWeb = Platform.OS === 'web';
    const refreshToken = isWeb ? null : await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    const res = await fetch(`${API_URL.replace(/\/$/, "")}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(IS_NGROK ? { 'ngrok-skip-browser-warning': '1' } : {}),
      },
      credentials: 'include',
      body: isWeb ? undefined : JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();

    if (data.token) {
      if (!isWeb) await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
      // WS token needed on all platforms
      await AsyncStorage.setItem('lextrack_ws_token', data.token);
    }
    if (data.refreshToken && !isWeb) {
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
    }

    return true;
  } catch {
    return false;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export interface ApiRequestOptions {
  /** Include auth token in request headers (default: true) */
  includeAuth?: boolean;
  /**
   * When true, suppresses the automatic toast for non-ok responses.
   * Use for flows that render their own inline error UI (e.g. login/register forms).
   * Default: false — errors are shown as toasts automatically.
   */
  silent?: boolean;
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown,
  options: ApiRequestOptions | boolean = true
): Promise<Response> {
  // Backwards-compatible: old callers passed a boolean as 4th arg
  const opts: ApiRequestOptions =
    typeof options === 'boolean' ? { includeAuth: options } : options;
  const { includeAuth = true, silent = false } = opts;

  const url = `${API_URL.replace(/\/$/, "")}/${route.replace(/^\//, "")}`;

  const headers: Record<string, string> = {};

  // Don't set Content-Type for FormData, let the browser set it with the correct boundary
  const isFormData = data instanceof FormData;
  if (data && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (IS_NGROK) {
    headers['ngrok-skip-browser-warning'] = '1';
  }

  // Try lawyer token first, then client token
  if (includeAuth) {
    let token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) {
      token = await AsyncStorage.getItem(STORAGE_KEYS.CLIENT_AUTH_ID);
    }
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  if (res.status === 401) {
    // Avoid infinite loop on the refresh/logout endpoints themselves
    const isAuthEndpoint = route.includes('/auth/refresh') || route.includes('/auth/logout');

    if (!isAuthEndpoint) {
      const refreshed = await attemptSilentRefresh();
      if (refreshed) {
        // Retry the original request with the new access token
        return apiRequest(method, route, data, options);
      }
    }

    // Refresh failed or not applicable — clear session
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.CLIENT_AUTH_ID);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    await AsyncStorage.removeItem(STORAGE_KEYS.ABOGADO);
    await AsyncStorage.removeItem(STORAGE_KEYS.CLIENTE);
    return res;
  }

  if (!res.ok && !silent) {
    await toastApiError(res);
  }

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

const SESSION_EXPIRED = "SESSION_EXPIRED";

export const getQueryFn =
  <T>(options: { on401: UnauthorizedBehavior }): QueryFunction<T> =>
  async ({ queryKey }) => {
    const route = queryKey.join("/");

    try {
      const res = await apiRequest("GET", route);
      if (res.status === 401) {
        if (options.on401 === "returnNull") {
          return null as T;
        }
        const error = new Error(SESSION_EXPIRED);
        throw error;
      }
      await throwIfResNotOk(res);
      return await res.json() as T;
    } catch (error) {
      if (
        options.on401 === "returnNull" &&
        error instanceof Error &&
        error.message === SESSION_EXPIRED
      ) {
        return null as T;
      }

      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
