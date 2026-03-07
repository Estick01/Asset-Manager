
import { InsertNotificacion, Notificacion } from '../../shared/schema';
import { apiRequest } from '../query-client';

// --- Notificaciones for Cliente (Client Portal) ---

export async function getNotificacionesCliente(
  clienteId: string
): Promise<Notificacion[]> {
  try {
    const response = await apiRequest("GET",
      `/api/notificaciones/cliente/${clienteId}`
    );
    if (!response.ok) {
      console.error('Failed to fetch notificaciones from API');
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching notificaciones:', e);
    return [];
  }
}

export async function getNotificacionesCountCliente(
  clienteId: string
): Promise<number> {
  try {
    const response = await apiRequest("GET",
      `/api/notificaciones/cliente/${clienteId}/count`
    );
    if (!response.ok) {
      return 0;
    }
    const data = await response.json();
    return data.count || 0;
  } catch (e) {
    console.error('Error fetching notification count:', e);
    return 0;
  }
}

export async function markNotificacionLeidaCliente(
  notificacionId: number
): Promise<boolean> {
  try {
    const response = await apiRequest("PUT",
      `/api/notificaciones/${notificacionId}/leer-cliente`
    );
    return response.ok;
  } catch (e) {
    console.error('Error marking notificacion as read:', e);
    return false;
  }
}

// --- Notificaciones for Abogado (Lawyer) ---

export async function getNotificacionesAbogado(): Promise<Notificacion[]> {
  try {
    // The backend should get the abogadoId from the JWT token.
    const response = await apiRequest("GET", `/api/notificaciones/abogado`);
    if (!response.ok) {
      console.error('Failed to fetch notificaciones from API');
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching notificaciones:', e);
    return [];
  }
}

export async function getNotificacionesCountAbogado(): Promise<number> {
  try {
    const response = await apiRequest("GET",
      `/api/notificaciones/abogado/count`
    );
    if (!response.ok) {
      return 0;
    }
    const data = await response.json();
    return data.count || 0;
  } catch (e) {
    console.error('Error fetching notification count:', e);
    return 0;
  }
}

export async function markNotificacionLeidaAbogado(
  notificacionId: number
): Promise<boolean> {
  try {
    const response = await apiRequest("PUT",
      `/api/notificaciones/${notificacionId}/leer-abogado`
    );
    return response.ok;
  } catch (e) {
    console.error('Error marking notificacion as read:', e);
    return false;
  }
}

// --- General ---

export async function createNotificacion(
  notificacion: InsertNotificacion
): Promise<Notificacion | null> {
  try {
    const response = await apiRequest("POST", '/api/notificaciones', notificacion);
    if (!response.ok) {
      console.error('Failed to create notificacion from API');
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error('Error creating notificacion:', e);
    return null;
  }
}

export async function createNotificacionEstadoCambio(
  procesoId: string,
  clienteId: string,
  lawyerId: string,
  procesoTitulo: string,
  estadoAnterior: string,
  estadoNuevo: string
): Promise<Notificacion | null> {
  return createNotificacion({
    procesoId,
    clienteId,
    lawyerId,
    titulo: `Cambio de estado: ${procesoTitulo}`,
    mensaje: `El estado de tu proceso ha cambiado de "${estadoAnterior}" a "${estadoNuevo}"`,
    tipo: 'estado_cambio',
  });
}
