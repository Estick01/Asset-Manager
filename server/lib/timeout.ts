/**
 * Wraps a promise with a timeout.
 * Throws if the promise doesn't resolve within the given milliseconds.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`[timeout] ${label} exceeded ${ms}ms`)),
      ms
    )
  );
  return Promise.race([promise, timeout]);
}
