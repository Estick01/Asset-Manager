
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cliente } from '../../shared/schema';
import { apiRequest } from '../query-client';
import { STORAGE_KEYS } from '../keys';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface SaveClienteNaturalData {
  tipo: "natural";
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  documento: string;
  tipoDocumentoId: number;
  direccion?: string | null;
  departamentoId?: string | null;
  municipioId?: string | null;
  password: string;
}

export interface SaveClienteEmpresaData {
  tipo: "empresa";
  razonSocial: string;
  nit: string;
  sector?: string | null;
  correo: string;
  password: string;
  // representante legal
  repNombre?: string;
  repApellido?: string;
  repDocumento?: string;
  repTipoDocumentoId?: number;
  repCargo?: string;
  repEmail?: string;
  repTelefono?: string;
  repDireccion?: string;
  repDepartamentoId?: string;
  repMunicipioId?: string;
}

export type SaveClienteData = SaveClienteNaturalData | SaveClienteEmpresaData;

// ----------------------------------------------------------------
// API Functions
// ----------------------------------------------------------------

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

    const response = await apiRequest("GET", `/api/clientes?${params.toString()}`);
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function getCliente(id: string): Promise<Cliente | null> {
  try {
    const response = await apiRequest("GET", `/api/clientes/${id}`);
    if (!response.ok) throw new Error('Failed to fetch cliente');
    return await response.json();
  } catch {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CLIENTES);
    const all: Cliente[] = data ? JSON.parse(data) : [];
    return all.find(c => c.id === id) || null;
  }
}

export async function saveCliente(data: SaveClienteData): Promise<Cliente> {
  const endpoint = data.tipo === "empresa" ? "/api/register/empresa" : "/api/register/client";
  const response = await apiRequest("POST", endpoint, data);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || 'Error al guardar cliente');
  }
  const body = await response.json();
  return body.data ?? body;
}

export async function updateCliente(id: string, updates: Partial<Cliente>): Promise<Cliente> {
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

// ----------------------------------------------------------------
// Local portal helpers
// ----------------------------------------------------------------

export async function getCurrentCliente(): Promise<Cliente | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.CLIENTE);
  if (data) {
    try { return JSON.parse(data); } catch { return null; }
  }
  return null;
}

export async function updateCurrentCliente(cliente: Partial<Cliente>): Promise<void> {
  const current = await getCurrentCliente();
  if (current) {
    await AsyncStorage.setItem(STORAGE_KEYS.CLIENTE, JSON.stringify({ ...current, ...cliente }));
  }
}
