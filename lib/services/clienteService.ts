
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cliente } from '../../shared/schema';
import { apiRequest } from '../query-client';
import { STORAGE_KEYS } from '../keys';

// --- Online API Functions ---

export async function getClientes(
  limit?: number,
  offset?: number,
  search?: string
): Promise<Cliente[]> {
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (search) params.append('search', search);

    const response = await apiRequest(
      "GET",
      `/api/clientes?${params.toString()}`
    );
    if (!response.ok) {
      console.error('Failed to fetch clients from API. Returning empty array.');
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching clients:', e);
    return []; // Return empty array on error
  }
}

export async function getCliente(id: string): Promise<Cliente | null> {
  try {
    const response = await apiRequest("GET", `/api/clientes/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch cliente from API');
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching cliente:', e, 'Falling back to local storage.');
    // Fallback to local storage
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CLIENTES);
    const all: Cliente[] = data ? JSON.parse(data) : [];
    return all.find((c) => c.id === id) || null;
  }
}

export async function saveCliente(
  cliente: Omit<Cliente, 'id' | 'fechaCreacion' | 'activo' | 'abogadoId'> & { 
    tipoDocumentoId: number; 
    departamentoId?: string | null; 
    municipioId?: string | null;
    password: string;
  }
): Promise<Cliente> {
  const response = await apiRequest("POST", '/api/register/client', cliente);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al guardar cliente');
  }

  return await response.json();
}

export async function updateCliente(
  id: string,
  updates: Partial<Cliente>
): Promise<Cliente> {
  const response = await apiRequest("PUT", `/api/clientes/${id}`, updates);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al actualizar cliente');
  }
  return await response.json();
}

export async function deleteCliente(id: string): Promise<void> {
  const response = await apiRequest("DELETE", `/api/clientes/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al eliminar cliente');
  }
}

// --- Local Client Portal Functions ---

/**
 * Gets the currently logged-in client's data from local storage.
 * Used for the client portal.
 */
export async function getCurrentCliente(): Promise<Cliente | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.CLIENTE);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Updates the currently logged-in client's data in local storage.
 */
export async function updateCurrentCliente(
  cliente: Partial<Cliente>
): Promise<void> {
  const currentCliente = await getCurrentCliente();
  if (currentCliente) {
    const updatedCliente = { ...currentCliente, ...cliente };
    await AsyncStorage.setItem(STORAGE_KEYS.CLIENTE, JSON.stringify(updatedCliente));
  }
}
