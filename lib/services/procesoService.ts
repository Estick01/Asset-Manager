import { CreateProceso } from '../../shared/model.schema';
import { API_URL } from '../config';

import {
  Actualizacion,
  Documento,
  EstadoProceso,
  InsertActualizacion,
  Proceso,
  TiposProceso,
} from '../../shared/schema';
import { apiRequest } from '../query-client';
import { ProcesoDTO } from '@/server/services';
import { ActualizacionRelations } from '@/shared/schema/actualizaciones.schema';

// --- Proceso (Case) Functions ---

export async function getProcesos(
  limit?: number,
  offset?: number,
  filter?: { estadoCodigo?: string; search?: string; hasResponsable?: boolean }
): Promise<{ data: Proceso[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (filter?.estadoCodigo)
      params.append('estadoCodigo', filter.estadoCodigo);
    if (filter?.search) params.append('search', filter.search);
    if (filter?.hasResponsable !== undefined)
      params.append('hasResponsable', filter.hasResponsable.toString());

    const response = await apiRequest(
      "GET",
      `/api/procesos?${params.toString()}`
    );
    if (!response.ok) {
      console.error('Failed to fetch procesos from API');
      return { data: [], total: 0 };
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching procesos:', e);
    return { data: [], total: 0 };
  }
}


export async function getCountProcesos(): Promise<number> {
  try {
    const response = await apiRequest("GET", `/api/procesos/count`);

    if (!response.ok) {
      console.error('Failed to fetch procesos count from API');
      return 0;
    }

    const result = await response.json();
    return result.count ?? 0;

  } catch (e) {
    console.error('Error fetching procesos count:', e);
    return 0;
  }
}



export async function getProcesosByCliente(
  clienteId: string,
  limit?: number,
  offset?: number
): Promise<{ data: ProcesoDTO[]; total: number }> {
  try {
    const params = new URLSearchParams();
    params.append('clienteId', clienteId);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const response = await apiRequest(
      "GET",
      `/api/procesos?${params.toString()}`
    );
    if (!response.ok) {
      console.error('Failed to fetch procesos by cliente from API');
      return { data: [], total: 0 };
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching procesos by cliente:', e);
    return { data: [], total: 0 };
  }
}

export async function getProceso(id: string): Promise<ProcesoDTO | null> {
  try {
    const response = await apiRequest("GET", `/api/proceso?idProces=${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch proceso from API');
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching proceso:', e);
    return null;
  }
}

export async function saveProceso(proceso: CreateProceso): Promise<Proceso> {
  const response = await apiRequest("POST", '/api/procesos', proceso);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al guardar proceso');
  }

  return await response.json();
}

export async function updateProceso(
  id: string,
  updates: Partial<Proceso>
): Promise<Proceso> {
  const response = await apiRequest("PUT", `/api/procesos/${id}`, updates);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al actualizar proceso');
  }
  return await response.json();
}

export async function deleteProceso(id: string): Promise<void> {
  const response = await apiRequest("DELETE", `/api/procesos/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al eliminar proceso');
  }
}

// --- Related to Procesos ---

export async function getEstadosProceso(): Promise<EstadoProceso[]> {
  try {
    const response = await apiRequest("GET", '/api/estado');
    if (!response.ok) {
      console.error('Failed to fetch estados from API');
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching estados:', e);
    return [];
  }
}

export async function getTiposProceso(): Promise<TiposProceso[]> {
  try {
    const response = await apiRequest("GET", '/api/tipos-proceso');
    if (!response.ok) {
      console.error('Failed to fetch tipos from API');
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error('Error fetching tipos:', e);
    return [];
  }
}

// --- Actualizaciones (Updates) ---

export async function getActualizaciones(
  procesoId: string,
  limit?: number,
  offset?: number
): Promise<ActualizacionRelations[]> {
  try {
    const params = new URLSearchParams({ procesoId });
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const response = await apiRequest(
      "GET",
      `/api/actualizaciones?${params}`
    );
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (e) {
    console.error('Error fetching updates from server:', e);
    return [];
  }
}

export async function saveActualizacion(
  act: Omit<InsertActualizacion, 'id'>
): Promise<Actualizacion> {
  const response = await apiRequest("POST", '/api/actualizaciones', act);

  if (!response.ok) {
    throw new Error('Error al guardar actualización');
  }

  return await response.json();
}

export async function deleteActualizacion(id: string): Promise<void> {
  const response = await apiRequest("DELETE", `/api/actualizaciones/${id}`);
  if (!response.ok) {
    throw new Error('Error al eliminar actualización');
  }
}

// --- Documentos (Documents) ---

export async function getDocumentos(procesoId: string): Promise<Documento[]> {
  try {
    const response = await apiRequest(
      "GET",
      `/api/documentos?procesoId=${procesoId}`
    );
    if (response.ok) {
      return await response.json();
    }
    return [];
  } catch (e) {
    console.error('Error fetching documents from server:', e);
    return [];
  }
}

export async function uploadDocument(doc: {
  procesoId: string;
  nombre: string;
  tipo: string;
  tamano: number;
  uri: string;
  descripcion?: string;
}): Promise<Documento> {
  const formData = new FormData();
  const filename = doc.uri.split('/').pop() || doc.nombre;
  
  // Fetch the file and convert to Blob for proper FormData handling
  const fileResponse = await fetch(doc.uri);
  const blob = await fileResponse.blob();

  formData.append('file', blob, filename);
  formData.append('procesoId', doc.procesoId);
  formData.append('nombre', doc.nombre);
  formData.append('tipo', doc.tipo);
  formData.append('tamano', doc.tamano.toString());
  if (doc.descripcion) {
    formData.append('descripcion', doc.descripcion);
  }

  const response = await apiRequest("POST", '/api/documentos', formData);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al subir documento');
  }

  return await response.json();
}

export async function deleteDocumento(id: string): Promise<void> {
  const response = await apiRequest("DELETE", `/api/documentos/${id}`);
  if (!response.ok) {
    throw new Error('Error al eliminar documento');
  }
}

export async function getDocumento(id: string): Promise<Documento | null> {
  try {
    const response = await apiRequest("GET", `/api/documentos/${id}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('Error fetching document from server:', e);
  }
  return null;
}

export async function getDocumentoDownloadUrl(
  documentoId: string
): Promise<string> {
  // The backend should provide a presigned URL directly in the document's `uri` field.
  // This frontend function can construct a fallback URL if needed.
  const doc = await getDocumento(documentoId);
  if (!doc) {
    throw new Error('Documento no encontrado');
  }

  // If the URI is already a full URL (e.g., S3 presigned URL), return it.
  if (doc.url && doc.url.startsWith('http')) {
    return doc.url;
  }
  
  // As a fallback, construct a URL to our own backend endpoint
  const url = new URL(`${API_URL}/api/documentos/${documentoId}/download`);
  return url.toString();
}
