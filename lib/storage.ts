import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, router } from "expo-router";
import { Platform } from "react-native";

// Nota: Los tokens JWT se manejan exclusivamente vía cookies HttpOnly en el backend para web.
// NO guardamos tokens en localStorage para web - la cookie se envía automáticamente.
// Para móvil, usamos SecureStore para guardar el token ylo enviamos en el header Authorization.

export interface Abogado {
  id: string;
  nombre: string;
  correo: string;
  password: string;
  despacho: string;
  telefono: string;
  planId: string;
  plan?: Plan;
  rolId: number;
  rol?: Rol;
  activo: boolean;
  fechaRegistro: string;
}

// Rol interface
export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// Permiso interface
export interface Permiso {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  moduloId?: number;
  modulo?: string; // For UI display purposes
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

// Plan interface
export interface Plan {
  id: string;
  nombre: string;
  precio: string;
  caracteristicas: string;
}

export interface Cliente {
  id: string;
  abogadoId: string;
  nombre: string;
  correo: string;
  telefono: string;
  documento: string;
  password: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface Proceso {
  id: string;
  abogadoId: string;
  clienteId: string;
  clienteNombre?: string;
  tipoProcesoId: number;
  tipoProceso: string;
  radicado: string;
  juzgado: string;
  estadoId: number;
  estado: {
    id: number;
    codigo: string;
    nombre: string;
    color: string;
  };
  estadoActual?: "activo" | "en_tramite" | "finalizado" | "archivado";
  descripcionEstado: string;
  fechaCreacion: string;
}

// Tipo para crear un nuevo proceso (sin id, fechaCreacion ni el objeto estado relacionado)
export type CreateProceso = Omit<Proceso, "id" | "fechaCreacion" | "estado">;

// Tipo para Estados de Proceso (from database)
export interface EstadoProceso {
  id: number;
  nombre: string;
  codigo: string;
  color: string;
  state: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipo para Tipos de Proceso (from database)
export interface TiposProceso {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Actualizacion {
  id: string;
  procesoId: string;
  fecha: string;
  titulo: string;
  descripcion: string;
  tipo: "manual" | "documento";
  documentoId?: string;
}

export interface Documento {
  id: string;
  procesoId: string;
  nombre: string;
  uri: string;
  tipo: string;
  tamano: number;
  fechaSubida: string;
  descripcion?: string;
}

const KEYS = {
  ABOGADO: "lextrack_abogado",
  CLIENTE: "lextrack_cliente",
  CLIENTES: "lextrack_clientes",
  PROCESOS: "lextrack_procesos",
  ACTUALIZACIONES: "lextrack_actualizaciones",
  DOCUMENTOS: "lextrack_documentos",
  AUTH: "lextrack_auth",
  CLIENT_AUTH: "lextrack_client_auth",
  CLIENT_AUTH_ID: "lextrack_client_auth_id",
  AUTH_TOKEN: "lextrack_auth_token", // JWT token for API requests
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Save auth token
export async function saveAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
}

// Get auth token
export async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
}

// Clear auth token
export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
}

// Make authenticated API request - uses cookies for web, Authorization header for mobile
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const isWeb = Platform.OS === "web";
  
  // Don't set Content-Type for FormData - it needs the boundary from the browser
  const isFormData = options.body instanceof FormData;
  
  let headers: Record<string, string> = {};
  
  // Only set Content-Type for non-FormData requests
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add any additional headers
  if (options.headers) {
    headers = { ...headers, ...options.headers as Record<string, string> };
  }

  // For mobile, add Authorization header with token from storage
  if (!isWeb) {
    const token = await getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Important for web - sends cookies automatically
  });
}

export async function getAbogado(): Promise<Abogado | null> {
  const data = await AsyncStorage.getItem(KEYS.ABOGADO);
  return data ? JSON.parse(data) : null;
}

export async function saveAbogado(abogado: Abogado): Promise<void> {
  await AsyncStorage.setItem(KEYS.ABOGADO, JSON.stringify(abogado));
}

export async function registerAbogado(data: {
  nombre: string;
  correo: string;
  password: string;
  despacho: string;
  telefono: string;
}): Promise<Abogado> {
  try {
    // Call backend API to register
    const response = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include", // Important for web - sends cookies
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al registrar");
    }
    
    const authData = await response.json();
    
    // For mobile only: save token for Authorization header
    // For web: cookie is set automatically by backend
    if (Platform.OS !== "web" && authData.token) {
      await saveAuthToken(authData.token);
    }
    
    // Save user to local storage for offline access
    const abogado: Abogado = {
      id: authData.user.id,
      nombre: authData.user.nombre,
      correo: authData.user.correo,
      password: data.password, // Store password locally for offline login
      despacho: authData.user.despacho,
      telefono: authData.user.telefono || "",
      planId: authData.user.planId || authData.user.plan || "basico",
      rolId: authData.user.rolId || 1,
      activo: true,
      fechaRegistro: new Date().toISOString(),
    };
    await saveAbogado(abogado);
    return abogado;
  } catch (error) {
    console.error("Registration API error:", error);
    throw error;
  }
}

export async function loginAbogado(correo: string, password: string): Promise<Abogado | null> {
  try {
    // Call backend API to login
    const response = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, password }),
      credentials: "include", // Important for web - sends cookies
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error("Login failed:", error.error || "Invalid credentials");
      return null;
    }
    
    const authData = await response.json();
    
    // For mobile only: save token for Authorization header
    // For web: cookie is set automatically by backend
    if (Platform.OS !== "web" && authData.token) {
      await saveAuthToken(authData.token);
    }
    
    // Save user to local storage
    const abogado: Abogado = {
      id: authData.user.id,
      nombre: authData.user.nombre,
      correo: authData.user.correo,
      password: password, // Store password locally for offline login
      despacho: authData.user.despacho,
      telefono: authData.user.telefono || "",
      planId: authData.user.planId || authData.user.plan || "basico",
      rolId: authData.user.rolId || 1,
      activo: true,
      fechaRegistro: authData.user.fechaRegistro || new Date().toISOString(),
    };
    await saveAbogado(abogado);
    return abogado;
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  // Verificar con el servidor - la cookie HttpOnly se envía automáticamente
  // Also try to load token from storage if not already loaded
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/auth/verify");
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    
    // If authenticated, also sync user data from server
    if (data.authenticated && data.user) {
      const storedAbogado = await getAbogado();
      if (storedAbogado) {
        // Keep the local password
        const abogado: Abogado = {
          id: data.user.id,
          nombre: data.user.nombre,
          correo: data.user.correo,
          password: storedAbogado.password,
          despacho: data.user.despacho,
          telefono: data.user.telefono || "",
          planId: data.user.planId || data.user.plan || "basico",
          rolId: data.user.rolId || 1,
          activo: true,
          fechaRegistro: data.user.fechaRegistro || new Date().toISOString(),
        };
        await saveAbogado(abogado);
      }
    }
    
    return data.authenticated === true;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  // Notificar al servidor para limpiar cookie
  try {
    await fetch("http://localhost:5000/api/auth/logout", { 
      method: "POST",
      credentials: "include", // Important for web - sends cookies
    });
  } catch {
    // Ignorar errores
  }
  // Limpiar storage local
  await AsyncStorage.removeItem(KEYS.ABOGADO);
  await clearAuthToken();
  await AsyncStorage.setItem(KEYS.AUTH, "false");
}

export async function loginCliente(documento: string, password: string): Promise<Cliente | null> {
  try {
    // Call backend API to login
    const response = await fetch("http://localhost:5000/api/login-cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documento, password }),
      credentials: "include", // Important for web - sends cookies
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error("Client login failed:", error.error || "Invalid credentials");
      return null;
    }
    
    const authData = await response.json();
    
    // For mobile only: save token for Authorization header
    // For web: cookie is set automatically by backend
    if (Platform.OS !== "web" && authData.token) {
      await saveAuthToken(authData.token);
    }
    
    // Save cliente to local storage
    const cliente: Cliente = {
      id: authData.user.id,
      abogadoId: authData.user.abogadoId,
      nombre: authData.user.nombre,
      correo: authData.user.correo || "",
      telefono: authData.user.telefono || "",
      documento: authData.user.documento,
      password: password, // Store password locally
      activo: true,
      fechaCreacion: authData.user.fechaCreacion || new Date().toISOString(),
    };
    
    // Save to local storage
    const data = await AsyncStorage.getItem(KEYS.CLIENTES);
    const all: Cliente[] = data ? JSON.parse(data) : [];
    // Update or add cliente
    const idx = all.findIndex((c) => c.id === cliente.id);
    if (idx !== -1) {
      all[idx] = cliente;
    } else {
      all.push(cliente);
    }
    await AsyncStorage.setItem(KEYS.CLIENTES, JSON.stringify(all));
    
    // Save current logged in client
    await AsyncStorage.setItem(KEYS.CLIENTE, JSON.stringify(cliente));
    
    // Save client auth ID
    await AsyncStorage.setItem(KEYS.CLIENT_AUTH_ID, cliente.id);
    
    return cliente;
  } catch (error) {
    console.error("Client login error:", error);
    return null;
  }
}

export async function isClientAuthenticated(): Promise<{
  authenticated: boolean;
  clienteId: string | null;
}> {
  try {
    const response = await fetch("http://localhost:5000/api/auth/verify", {
      method: "GET",
      credentials: "include", 
    });

    if (!response.ok) {
      return { authenticated: false, clienteId: null };
    }

    const data = await response.json();

    if (!data.authenticated || data.type !== "cliente") {
      return { authenticated: false, clienteId: null };
    }

    return {
      authenticated: true,
      clienteId: data.user?.id || null,
    };
  } catch {
    return { authenticated: false, clienteId: null };
  }
}

export async function logoutCliente(): Promise<void> {
  // Notificar al servidor - la cookie se elimina automáticamente
  try {
    await fetch("http://localhost:5000/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignorar errores
  }
  
  // Limpiar almacenamiento local
  await AsyncStorage.removeItem(KEYS.CLIENTE);
  await AsyncStorage.removeItem(KEYS.CLIENT_AUTH_ID);
  await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
}

export async function getClientes(abogadoId: string, limit?: number, offset?: number, search?: string): Promise<Cliente[]> {
  try {
    // Build query params (server ignores abogadoId - gets it from JWT)
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (search) params.append('search', search);
    
    const response = await authenticatedFetch(`http://localhost:5000/api/clientes?${params.toString()}`);
    if (!response.ok) {
      console.error("Failed to fetch clients from API");
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching clients:", e);
    return [];
  }
}

// Get Estados de Proceso from the API
export async function getEstadosProceso(): Promise<EstadoProceso[]> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/estado");
    if (!response.ok) {
      console.error("Failed to fetch estados from API");
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching estados:", e);
    return [];
  }
}

// Get Tipos de Proceso from the API
export async function getTiposProceso(): Promise<TiposProceso[]> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/tipos-proceso");
    if (!response.ok) {
      console.error("Failed to fetch tipos from API");
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching tipos:", e);
    return [];
  }
}

export async function getCliente(id: string): Promise<Cliente | null> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/clientes/${id}`);
    if (!response.ok) {
      console.error("Failed to fetch cliente from API");
      // Fallback to local storage
      const data = await AsyncStorage.getItem(KEYS.CLIENTES);
      const all: Cliente[] = data ? JSON.parse(data) : [];
      return all.find((c) => c.id === id) || null;
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching cliente:", e);
    // Fallback to local storage
    const data = await AsyncStorage.getItem(KEYS.CLIENTES);
    const all: Cliente[] = data ? JSON.parse(data) : [];
    return all.find((c) => c.id === id) || null;
  }
}

export async function saveCliente(cliente: Omit<Cliente, "id" | "fechaCreacion" | "activo">): Promise<Cliente> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/clientes", {
      method: "POST",
      body: JSON.stringify(cliente),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al guardar cliente");
    }
    
    return await response.json();
  } catch (e) {
    console.error("Error saving cliente:", e);
    // Fallback to local storage
    const data = await AsyncStorage.getItem(KEYS.CLIENTES);
    const all: Cliente[] = data ? JSON.parse(data) : [];
    const newCliente: Cliente = {
      ...cliente,
      id: generateId(),
      activo: true,
      fechaCreacion: new Date().toISOString(),
    };
    all.push(newCliente);
    await AsyncStorage.setItem(KEYS.CLIENTES, JSON.stringify(all));
    return newCliente;
  }
}

export async function updateCliente(id: string, updates: Partial<Cliente>): Promise<void> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/clientes/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al actualizar cliente");
    }
  } catch (e) {
    console.error("Error updating cliente:", e);
    // Fallback to local storage
    const data = await AsyncStorage.getItem(KEYS.CLIENTES);
    const all: Cliente[] = data ? JSON.parse(data) : [];
    const idx = all.findIndex((c) => c.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      await AsyncStorage.setItem(KEYS.CLIENTES, JSON.stringify(all));
    }
  }
}

export async function deleteCliente(id: string): Promise<void> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/clientes/${id}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al eliminar cliente");
    }
  } catch (e) {
    console.error("Error deleting cliente:", e);
    // Fallback to local storage
    const data = await AsyncStorage.getItem(KEYS.CLIENTES);
    const all: Cliente[] = data ? JSON.parse(data) : [];
    const filtered = all.filter((c) => c.id !== id);
    await AsyncStorage.setItem(KEYS.CLIENTES, JSON.stringify(filtered));
  }
}

export async function getProcesos(
  _abogadoId: string,
  limit?: number,
  offset?: number,
  filter?: { estadoCodigo?: string; search?: string }
): Promise<{ data: Proceso[]; total: number }> {
  try {
    // Build query params (server ignores abogadoId - gets it from JWT)
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (filter?.estadoCodigo) params.append('estadoCodigo', filter.estadoCodigo);
    if (filter?.search) params.append('search', filter.search);
    
    const response = await authenticatedFetch(`http://localhost:5000/api/procesos?${params.toString()}`);
    if (!response.ok) {
      console.error("Failed to fetch procesos from API");
      return { data: [], total: 0 };
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching procesos:", e);
    return { data: [], total: 0 };
  }
}

export async function getProcesosByCliente(clienteId: string, limit?: number, offset?: number): Promise<{ data: Proceso[]; total: number }> {
  try {
    const params = new URLSearchParams();
    params.append('clienteId', clienteId);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const response = await authenticatedFetch(`http://localhost:5000/api/procesos?${params.toString()}`);
    if (!response.ok) {
      console.error("Failed to fetch procesos by cliente from API");
      // Fallback to local storage
      const data = await AsyncStorage.getItem(KEYS.PROCESOS);
      const all: Proceso[] = data ? JSON.parse(data) : [];
      const filtered = all.filter((p) => p.clienteId === clienteId);
      return { data: filtered, total: filtered.length };
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching procesos by cliente:", e);
    // Fallback to local storage
    const data = await AsyncStorage.getItem(KEYS.PROCESOS);
    const all: Proceso[] = data ? JSON.parse(data) : [];
    const filtered = all.filter((p) => p.clienteId === clienteId);
    return { data: filtered, total: filtered.length };
  }
}

export async function getProceso(id: string): Promise<Proceso | null> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/procesos/${id}`);
    if (!response.ok) {
      console.error("Failed to fetch proceso from API");
      // Fallback to local storage
      const data = await AsyncStorage.getItem(KEYS.PROCESOS);
      const all: Proceso[] = data ? JSON.parse(data) : [];
      return all.find((p) => p.id === id) || null;
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching proceso:", e);
    // Fallback to local storage
    const data = await AsyncStorage.getItem(KEYS.PROCESOS);
    const all: Proceso[] = data ? JSON.parse(data) : [];
    return all.find((p) => p.id === id) || null;
  }
}

export async function saveProceso(proceso: CreateProceso): Promise<Proceso> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/procesos", {
      method: "POST",
      body: JSON.stringify(proceso),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al guardar proceso");
    }
    
    return await response.json();
  } catch (e) {
    console.error("Error saving proceso:", e);
    // Fallback to local storage
    const data = await AsyncStorage.getItem(KEYS.PROCESOS);
    const all: Proceso[] = data ? JSON.parse(data) : [];
    const newProceso: Proceso = {
      ...proceso,
      id: generateId(),
      fechaCreacion: new Date().toISOString(),
      estado: {
        id: proceso.estadoId,
        codigo: "en_tramite",
        nombre: "En Trámite",
        color: "#3B82F6",
      },
    };
    all.push(newProceso);
    await AsyncStorage.setItem(KEYS.PROCESOS, JSON.stringify(all));
    return newProceso;
  }
}

export async function updateProceso(id: string, updates: Partial<Proceso>): Promise<void> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/procesos/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al actualizar proceso");
    }
  } catch (e) {
    console.error("Error updating proceso:", e);
    // Fallback to local storage
    const data = await AsyncStorage.getItem(KEYS.PROCESOS);
    const all: Proceso[] = data ? JSON.parse(data) : [];
    const idx = all.findIndex((p) => p.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      await AsyncStorage.setItem(KEYS.PROCESOS, JSON.stringify(all));
    }
  }
}

export async function deleteProceso(id: string): Promise<void> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/procesos/${id}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al eliminar proceso");
    }
  } catch (e) {
    console.error("Error deleting proceso:", e);
    // Fallback to local storage
    const data = await AsyncStorage.getItem(KEYS.PROCESOS);
    const all: Proceso[] = data ? JSON.parse(data) : [];
    const filtered = all.filter((p) => p.id !== id);
    await AsyncStorage.setItem(KEYS.PROCESOS, JSON.stringify(filtered));
  }
}

export async function getActualizaciones(procesoId: string, limit?: number, offset?: number): Promise<Actualizacion[]> {
  try {
    const params = new URLSearchParams({ procesoId });
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    
    const response = await authenticatedFetch(`http://localhost:5000/api/actualizaciones?${params}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error("Error fetching updates from server:", e);
  }
  return [];
}

export async function saveActualizacion(act: Omit<Actualizacion, "id">): Promise<Actualizacion> {
  const response = await authenticatedFetch("http://localhost:5000/api/actualizaciones", {
    method: "POST",
    body: JSON.stringify({
      procesoId: act.procesoId,
      titulo: act.titulo,
      descripcion: act.descripcion,
      tipo: act.tipo,
      documentoId: act.documentoId,
      fecha: act.fecha,
    }),
  });
  
  if (!response.ok) {
    throw new Error("Error al guardar actualización");
  }
  
  return await response.json();
}

export async function deleteActualizacion(id: string): Promise<void> {
  const response = await authenticatedFetch(`http://localhost:5000/api/actualizaciones/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Error al eliminar actualización");
  }
}

export async function getDocumentos(procesoId: string): Promise<Documento[]> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/documentos?procesoId=${procesoId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error("Error fetching documents from server:", e);
  }
  return [];
}

export async function uploadDocument(doc: {
  procesoId: string;
  nombre: string;
  tipo: string;
  tamano: number;
  uri: string;
}): Promise<Documento> {
  // Create FormData with the file
  const formData = new FormData();
  
  // Get the file name from the URI
  const filename = doc.uri.split("/").pop() || doc.nombre;
  
  // Fetch the file and convert to Blob for proper FormData handling
  const fileResponse = await fetch(doc.uri);
  const blob = await fileResponse.blob();
  
  // Append the blob directly - works better in React Native
  formData.append("file", blob, filename);
  formData.append("procesoId", doc.procesoId);
  formData.append("nombre", doc.nombre);
  formData.append("tipo", doc.tipo);
  formData.append("tamano", doc.tamano.toString());
  
  // Upload to server
  const response = await authenticatedFetch("http://localhost:5000/api/documentos", {
    method: "POST",
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Error al subir documento");
  }
  
  return await response.json();
}

export async function deleteDocumento(id: string): Promise<void> {
  const response = await authenticatedFetch(`http://localhost:5000/api/documentos/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Error al eliminar documento");
  }
}

export async function getDocumento(id: string): Promise<Documento | null> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/documentos/${id}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error("Error fetching document from server:", e);
  }
  return null;
}

// Get user permissions from the backend API
export async function getPermisos(): Promise<string[]> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/permisos");
    if (!response.ok) {
      console.error("Failed to fetch permisos from API");
      return [];
    }
    const data = await response.json();
    return data.permisos || [];
  } catch (e) {
    console.error("Error fetching permisos:", e);
    return [];
  }
}

// Get download URL for a document via the backend API
export async function getDocumentoDownloadUrl(documentoId: string): Promise<string> {
  // First try to get from local storage
  const doc = await getDocumento(documentoId);
  if (!doc) {
    throw new Error("Documento no encontrado");
  }

  // If the URI is already a full URL (e.g., S3 presigned URL), return it directly
  if (doc.uri && doc.uri.startsWith("http")) {
    return doc.uri;
  }

  // If it's a local/relative URI, construct the full URL to the server API
  return `http://localhost:5000/api/documentos/${documentoId}/download`;
}

export async function getDashboardStats(abogadoId: string): Promise<{
  totalClientes: number;
  totalProcesos: number;
  procesosActivos: number;
  procesosFinalizados: number;
  procesosRecientes: Array<{
    id: string;
    clienteId: string;
    tipoProceso: string;
    radicado: string;
    estado: string;
    estadoColor: string;
    fechaCreacion: string;
  }>;
}> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/dashboard");
    if (!response.ok) {
      console.error("Failed to fetch dashboard from API");
      // Fallback to local data
      const clientes = await getClientes(abogadoId);
      const procesosResult = await getProcesos(abogadoId);
      const procesos = procesosResult.data;
      return {
        totalClientes: clientes.length,
        totalProcesos: procesos.length,
        procesosActivos: procesos.filter((p) => p.estadoActual === "activo" || p.estadoActual === "en_tramite").length,
        procesosFinalizados: procesos.filter((p) => p.estadoActual === "finalizado").length,
        procesosRecientes: [],
      };
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching dashboard:", e);
    // Fallback to local data
    const clientes = await getClientes(abogadoId);
    const procesosResult = await getProcesos(abogadoId);
    const procesos = procesosResult.data;
    return {
      totalClientes: clientes.length,
      totalProcesos: procesos.length,
      procesosActivos: procesos.filter((p) => p.estadoActual === "activo" || p.estadoActual === "en_tramite").length,
      procesosFinalizados: procesos.filter((p) => p.estadoActual === "finalizado").length,
      procesosRecientes: [],
    };
  }
}

// ============ Role and Permission Functions ============

// Get all roles from the API
export async function getRoles(): Promise<Rol[]> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/roles");
    if (!response.ok) {
      console.error("Failed to fetch roles from API");
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching roles:", e);
    return [];
  }
}

// Get role with its permissions
export async function getRolWithPermisos(id: number): Promise<{ rol: Rol; permisos: Permiso[] } | null> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/roles/${id}`);
    if (!response.ok) {
      console.error("Failed to fetch role from API");
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching role with permisos:", e);
    return null;
  }
}

// Update role permissions
export async function updateRolePermisos(id: number, permisoIds: number[]): Promise<{ rol: Rol; permisos: Permiso[] } | null> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/roles/${id}/permisos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permisoIds }),
    });
    if (!response.ok) {
      console.error("Failed to update role permisos from API");
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error("Error updating role permisos:", e);
    return null;
  }
}

// Get all permissions
export async function getAllPermisos(): Promise<Permiso[]> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/permisos/all");
    if (!response.ok) {
      console.error("Failed to fetch permisos from API");
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching permisos:", e);
    return [];
  }
}

// Create a new role
export async function createRol(nombre: string, descripcion?: string): Promise<Rol | null> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, descripcion }),
    });
    if (!response.ok) {
      console.error("Failed to create role from API");
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error("Error creating role:", e);
    return null;
  }
}

// Delete a role
export async function deleteRol(id: number): Promise<boolean> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/roles/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      console.error("Failed to delete role from API");
      return false;
    }
    return true;
  } catch (e) {
    console.error("Error deleting role:", e);
    return false;
  }
}

// ============ Lawyer (Abogado) Management Functions ============

// Get all lawyers
export async function getAllAbogados(): Promise<Abogado[]> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/abogados");
    if (!response.ok) {
      console.error("Failed to fetch abogados from API");
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching abogados:", e);
    return [];
  }
}

// Update lawyer's role
export async function updateAbogadoRol(abogadoId: string, rolId: number): Promise<boolean> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/abogados/${abogadoId}/rol`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rolId }),
    });
    if (!response.ok) {
      console.error("Failed to update abogado rol from API");
      return false;
    }
    return true;
  } catch (e) {
    console.error("Error updating abogado rol:", e);
    return false;
  }
}

// Update lawyer's status (activo)
export async function updateAbogadoEstado(abogadoId: string, activo: boolean): Promise<boolean> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/abogados/${abogadoId}/estado`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo }),
    });
    if (!response.ok) {
      console.error("Failed to update abogado estado from API");
      return false;
    }
    return true;
  } catch (e) {
    console.error("Error updating abogado estado:", e);
    return false;
  }
}

// Update lawyer's plan
export async function updateAbogadoPlan(abogadoId: string, planId: string): Promise<boolean> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/abogados/${abogadoId}/plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    if (!response.ok) {
      console.error("Failed to update abogado plan from API");
      return false;
    }
    return true;
  } catch (e) {
    console.error("Error updating abogado plan:", e);
    return false;
  }
}

// ============ Plan Functions ============

// Get all plans
export async function getAllPlanes(): Promise<Plan[]> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/planes");
    if (!response.ok) {
      console.error("Failed to fetch planes from API");
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching planes:", e);
    return [];
  }
}

// ============ TipoProceso Functions ============

// Get all tipos proceso (alias for getTiposProceso)
export async function getAllTiposProceso(): Promise<TiposProceso[]> {
  return getTiposProceso();
}

// Create tipo proceso
export async function createTipoProceso(tipo: { nombre: string; descripcion?: string }): Promise<TiposProceso | null> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/tipos-proceso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tipo),
    });
    if (!response.ok) {
      console.error("Failed to create tipo proceso from API");
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error("Error creating tipo proceso:", e);
    return null;
  }
}

// Update tipo proceso
export async function updateTipoProceso(id: number, tipo: { nombre?: string; descripcion?: string; activo?: boolean }): Promise<TiposProceso | null> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/tipos-proceso/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tipo),
    });
    if (!response.ok) {
      console.error("Failed to update tipo proceso from API");
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error("Error updating tipo proceso:", e);
    return null;
  }
}

// Delete tipo proceso
export async function deleteTipoProceso(id: number): Promise<boolean> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/tipos-proceso/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      console.error("Failed to delete tipo proceso from API");
      return false;
    }
    return true;
  } catch (e) {
    console.error("Error deleting tipo proceso:", e);
    return false;
  }
}

// ============ Cliente (Client Portal) Functions ============

// Get current logged in cliente from local storage
export async function getCurrentCliente(): Promise<Cliente | null> {
  const data = await AsyncStorage.getItem(KEYS.CLIENTE);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

// Update current logged in cliente in local storage
export async function updateCurrentCliente(cliente: Partial<Cliente>): Promise<void> {
  const currentCliente = await getCurrentCliente();
  if (currentCliente) {
    const updatedCliente = { ...currentCliente, ...cliente };
    await AsyncStorage.setItem(KEYS.CLIENTE, JSON.stringify(updatedCliente));
  }
}

// ============ Notificaciones Functions ============

// Notificacion interface
export interface Notificacion {
  id: number;
  procesoId: string;
  clienteId: string;
  abogadoId: string;
  titulo: string;
  mensaje: string;
  tipo: "estado_cambio" | "actualizacion" | "recordatorio" | "general";
  leidoCliente: boolean;
  leidoAbogado: boolean;
  createdAt: string;
  updatedAt: string;
}

// Create Notificacion input
export interface CreateNotificacion {
  procesoId: string;
  clienteId: string;
  abogadoId: string;
  titulo: string;
  mensaje: string;
  tipo?: "estado_cambio" | "actualizacion" | "recordatorio" | "general";
}

// Get notifications for a cliente (client portal)
export async function getNotificacionesCliente(clienteId: string): Promise<Notificacion[]> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/notificaciones/cliente/${clienteId}`);
    if (!response.ok) {
      console.error("Failed to fetch notificaciones from API");
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching notificaciones:", e);
    return [];
  }
}

// Get unread notification count for a cliente
export async function getNotificacionesCountCliente(clienteId: string): Promise<number> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/notificaciones/cliente/${clienteId}/count`);
    if (!response.ok) {
      return 0;
    }
    const data = await response.json();
    return data.count || 0;
  } catch (e) {
    console.error("Error fetching notification count:", e);
    return 0;
  }
}

// Mark notification as read for cliente
export async function markNotificacionLeidaCliente(notificacionId: number): Promise<boolean> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/notificaciones/${notificacionId}/leer-cliente`, {
      method: "PUT",
    });
    return response.ok;
  } catch (e) {
    console.error("Error marking notificacion as read:", e);
    return false;
  }
}

// Get notifications for an abogado (lawyer)
export async function getNotificacionesAbogado(abogadoId: string): Promise<Notificacion[]> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/notificaciones/abogado/${abogadoId}`);
    if (!response.ok) {
      console.error("Failed to fetch notificaciones from API");
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error("Error fetching notificaciones:", e);
    return [];
  }
}

// Get unread notification count for an abogado
export async function getNotificacionesCountAbogado(abogadoId: string): Promise<number> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/notificaciones/abogado/${abogadoId}/count`);
    if (!response.ok) {
      return 0;
    }
    const data = await response.json();
    return data.count || 0;
  } catch (e) {
    console.error("Error fetching notification count:", e);
    return 0;
  }
}

// Mark notification as read for abogado
export async function markNotificacionLeidaAbogado(notificacionId: number): Promise<boolean> {
  try {
    const response = await authenticatedFetch(`http://localhost:5000/api/notificaciones/${notificacionId}/leer-abogado`, {
      method: "PUT",
    });
    return response.ok;
  } catch (e) {
    console.error("Error marking notificacion as read:", e);
    return false;
  }
}

// Create a notification
export async function createNotificacion(notificacion: CreateNotificacion): Promise<Notificacion | null> {
  try {
    const response = await authenticatedFetch("http://localhost:5000/api/notificaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificacion),
    });
    if (!response.ok) {
      console.error("Failed to create notificacion from API");
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error("Error creating notificacion:", e);
    return null;
  }
}

// Create notification for process state change
export async function createNotificacionEstadoCambio(
  procesoId: string,
  clienteId: string,
  abogadoId: string,
  procesoTitulo: string,
  estadoAnterior: string,
  estadoNuevo: string
): Promise<Notificacion | null> {
  return createNotificacion({
    procesoId,
    clienteId,
    abogadoId,
    titulo: `Cambio de estado: ${procesoTitulo}`,
    mensaje: `El estado de tu proceso ha cambiado de "${estadoAnterior}" a "${estadoNuevo}"`,
    tipo: "estado_cambio",
  });
}
