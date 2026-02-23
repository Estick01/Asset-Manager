
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Keys para tokens
const KEYS = {
  TOKEN: "lextrack_token",
  CLIENT_TOKEN: "lextrack_client_token",
};

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      return "http://localhost:5000";
    }
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  if (!host.startsWith("http")) {
    host = `https://${host}`;
  }

  const url = new URL(host);

  return url.href;
}

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
  includeAuth: boolean = true
): Promise<Response> {
  const baseUrl = getApiUrl(); // Ej: http://localhost:3000
  const url = `${baseUrl.replace(/\/$/, "")}/${route.replace(/^\//, "")}`;

  // Obtener token JWT del almacenamiento
  let token: string | null = null;
  if (includeAuth) {
    // Try lawyer token first, then client token
    token = await AsyncStorage.getItem(KEYS.TOKEN);
    if (!token) {
      token = await AsyncStorage.getItem(KEYS.CLIENT_TOKEN);
    }
  }

  // Construir headers
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : (data ? { "Content-Type": "application/json" } : {}),
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include", // solo si tu backend permite cookies + CORS
    });

    if (!res.ok) {
      // Handle 401 Unauthorized - clear token and throw specific error
      if (res.status === 401) {
        // Clear invalid token
        await AsyncStorage.removeItem(KEYS.TOKEN);
        await AsyncStorage.removeItem(KEYS.CLIENT_TOKEN);
        const text = await res.text();
        throw new Error(`401: ${text}`);
      }
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    return res;
  } catch (err) {
    // Check if it's a 401 error and re-throw with more specific message
    if (err instanceof Error && err.message.startsWith("401:")) {
      console.error("Authentication error - token cleared");
    }
    console.error("API request failed:", method, url, err);
    throw new Error(
      `Failed to fetch ${method} ${url}: ${(err as Error).message}`
    );
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
