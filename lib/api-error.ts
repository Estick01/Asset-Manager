import { toast } from 'sonner-native';

/**
 * Read a (cloned) response body and return a user-friendly error string.
 * Handles the shape `{ error: "...", required: [...] }` returned by the backend.
 */
export async function extractApiErrorMessage(res: Response, fallback?: string): Promise<string> {
  try {
    const json = await res.clone().json();
    let msg: string = json?.error || json?.message || fallback || `Error ${res.status}`;
    if (Array.isArray(json?.required) && json.required.length > 0) {
      msg += ` (${json.required.join(', ')})`;
    }
    return msg;
  } catch {
    return fallback || `Error ${res.status}`;
  }
}

/**
 * Show a `toast.error` for a failed API response.
 * Safe to call even if the response body will be read again (uses clone).
 */
export async function toastApiError(res: Response, fallback?: string): Promise<void> {
  const msg = await extractApiErrorMessage(res, fallback);
  toast.error(msg);
}
