
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from './config';
import { STORAGE_KEYS } from './keys';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown,
  includeAuth = true
): Promise<Response> {
  const url = `${API_URL.replace(/\/$/, "")}/${route.replace(/^\//, "")}`;

  const headers: Record<string, string> = {};

  // Don't set Content-Type for FormData, let the browser set it with the correct boundary
  const isFormData = data instanceof FormData;
  if (data && !isFormData) {
    headers["Content-Type"] = "application/json";
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
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.CLIENT_AUTH_ID);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    await AsyncStorage.removeItem(STORAGE_KEYS.ABOGADO);
    await AsyncStorage.removeItem(STORAGE_KEYS.CLIENTE);
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
