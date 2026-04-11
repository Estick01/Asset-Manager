
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_URL, IS_NGROK } from './config';
import { STORAGE_KEYS } from './keys';
import { apiRequest } from './query-client';
import { featureGateEvents } from './feature-gate-events';
import { getDeviceHeaders } from './device-id';

// Re-export apiRequest for direct use
export { apiRequest };

// --- Token Management ---

// Token storage key for WebSocket (we need this even on web)
const WS_TOKEN_KEY = "procesoclaro_ws_token";

export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS !== 'web') {
    // Mobile: store in AsyncStorage (sandboxed, safe)
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }
  // WebSocket needs the token on all platforms (no HttpOnly cookie access from WS)
  await AsyncStorage.setItem(WS_TOKEN_KEY, token);
}

export async function saveRefreshToken(token: string): Promise<void> {
  if (Platform.OS !== 'web') {
    // Mobile only: on web the refresh token arrives as HttpOnly cookie from the server
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export async function getWsToken(): Promise<string | null> {
  // WebSocket always needs the token from AsyncStorage
  return await AsyncStorage.getItem(WS_TOKEN_KEY)
    || await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    // On web, we don't handle the token directly.
    return null;
  }
  return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  await AsyncStorage.removeItem(WS_TOKEN_KEY);
}

// --- Core API Client ---

/**
 * A wrapper for the Fetch API that handles authentication, platform differences,
 * and automatic redirection on 401 Unauthorized errors.
 *
 * @param endpoint The API endpoint to call (e.g., '/api/clientes').
 * @param options The standard RequestInit options for fetch.
 * @returns A Promise that resolves to the Response object.
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const isWeb = Platform.OS === 'web';
  const url = `${API_URL}${endpoint}`;

  const isFormData = options.body instanceof FormData;

  let headers: Record<string, string> = {};
  Object.assign(headers, await getDeviceHeaders());

  // Don't set Content-Type for FormData, as the browser needs to set it
  // with the correct boundary.
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  // ngrok free tier muestra una página de advertencia sin este header
  if (IS_NGROK) {
    headers['ngrok-skip-browser-warning'] = '1';
  }

  // Apply any custom headers from the options
  if (options.headers) {
    headers = { ...headers, ...(options.headers as Record<string, string>) };
  }

  // On mobile, we add the Authorization header with the token.
  if (!isWeb) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    // This is crucial for web to automatically send the HttpOnly cookie.
    // It has no effect on mobile.
    credentials: 'include',
  });

  // If the response is 401 Unauthorized, try a silent token refresh first.
  if (response.status === 401) {
    // Avoid infinite loop: don't refresh if we're already on the refresh endpoint.
    if (!endpoint.includes('/auth/refresh')) {
      const refreshed = await attemptSilentRefresh();
      if (refreshed) {
        // Retry the original request with the new token
        return authenticatedFetch(endpoint, options);
      }
    }

    // Refresh failed or was unavailable — clear session and return the 401
    await clearAuthToken();
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    await AsyncStorage.removeItem(STORAGE_KEYS.CLIENTE);
    return response;
  }

  // 402 FEATURE_NOT_AVAILABLE → emitir evento global para mostrar modal
  if (response.status === 402) {
    response.clone().json().then((body) => {
      if (body?.error === "FEATURE_NOT_AVAILABLE" && body?.feature) {
        featureGateEvents.emit(body.feature);
      }
    }).catch(() => {});
  }

  return response;
}

// --- Silent Refresh ---

// Shared promise so concurrent 401s don't trigger multiple refresh calls
let _refreshPromise: Promise<boolean> | null = null;

async function attemptSilentRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = _doRefresh().finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

async function _doRefresh(): Promise<boolean> {
  try {
    const refreshToken = await getRefreshToken();
    const isWeb = Platform.OS === 'web';
    const deviceHeaders = await getDeviceHeaders();

    const body = isWeb ? undefined : JSON.stringify({ refreshToken });

    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...deviceHeaders },
      credentials: 'include', // sends httpOnly refresh cookie on web
      body,
    });

    if (!res.ok) return false;

    const data = await res.json();

    if (data.token) await saveAuthToken(data.token);
    if (data.refreshToken) await saveRefreshToken(data.refreshToken);

    return true;
  } catch {
    return false;
  }
}
