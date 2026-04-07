/**
 * Mini pub-sub para emitir eventos de feature no disponible globalmente.
 * Usado por el apiClient para notificar sin que cada pantalla maneje el 402.
 */

type Listener = (featureCode: string) => void;

const listeners = new Set<Listener>();

export const featureGateEvents = {
  emit(featureCode: string) {
    listeners.forEach((fn) => fn(featureCode));
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
