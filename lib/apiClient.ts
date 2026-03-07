
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { API_URL } from './config';
import { STORAGE_KEYS } from './keys';
import { apiRequest } from './query-client';

// Re-export apiRequest for direct use
export { apiRequest };

// --- Token Management ---

export async function saveAuthToken(token: string): Promise<void> {
  // On mobile, we save the token to AsyncStorage.
  // On web, this is not used as we rely on HttpOnly cookies.
  if (Platform.OS !== 'web') {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    // On web, we don't handle the token directly.
    return null;
  }
  return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export async function clearAuthToken(): Promise<void> {
  if (Platform.OS !== 'web') {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }
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

  // Don't set Content-Type for FormData, as the browser needs to set it
  // with the correct boundary.
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
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

  // If the response is 401 Unauthorized, the session has expired or is invalid.
  if (response.status === 401) {
    console.warn('Session expired (401 Unauthorized). Logging out.');
    // Clean up local session data
    await clearAuthToken();
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    await AsyncStorage.removeItem(STORAGE_KEYS.ABOGADO);
    await AsyncStorage.removeItem(STORAGE_KEYS.CLIENTE);

    // We return the original response so the caller can still handle it if needed,
    // though the redirect will typically interrupt the flow.
    return response;
  }

  return response;
}
