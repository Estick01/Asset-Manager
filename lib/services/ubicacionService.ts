import { API_URL } from "@/lib/config";

export interface TipoDocumento {
  id: number;
  nombre: string;
  codigo: string;
}

export interface Departamento {
  id: string;
  codigo: string;
  nombre: string;
}

export interface Municipio {
  id: string;
  codigo: string;
  nombre: string;
}

export interface MunicipioResponse {
  data: Municipio[];
  total: number;
  hasMore: boolean;
}

export async function getTiposDocumento(): Promise<TipoDocumento[]> {
  const r = await fetch(`${API_URL}/api/tipos-documento`);
  return r.ok ? r.json() : [];
}

export async function getDepartamentos(): Promise<Departamento[]> {
  const r = await fetch(`${API_URL}/api/departamentos`);
  return r.ok ? r.json() : [];
}

export async function getMunicipios(
  departamentoId: string,
  page = 1,
  pageSize = 10,
  search = ""
): Promise<MunicipioResponse> {
  const params = new URLSearchParams({
    departamentoId,
    page: String(page),
    pageSize: String(pageSize),
    ...(search ? { search } : {}),
  });
  const r = await fetch(`${API_URL}/api/municipios?${params}`);
  if (r.ok) return r.json();
  return { data: [], total: 0, hasMore: false };
}
