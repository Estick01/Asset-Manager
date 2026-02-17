import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Abogado {
  id: string;
  nombre: string;
  correo: string;
  password: string;
  despacho: string;
  telefono: string;
  plan: "basico" | "profesional";
  activo: boolean;
  fechaRegistro: string;
}

export interface Cliente {
  id: string;
  abogadoId: string;
  nombre: string;
  correo: string;
  telefono: string;
  documento: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface Proceso {
  id: string;
  abogadoId: string;
  clienteId: string;
  tipoProceso: string;
  radicado: string;
  juzgado: string;
  estadoActual: "activo" | "en_tramite" | "finalizado" | "archivado";
  descripcionEstado: string;
  fechaCreacion: string;
}

export interface Actualizacion {
  id: string;
  procesoId: string;
  fecha: string;
  titulo: string;
  descripcion: string;
}

const KEYS = {
  ABOGADO: "lextrack_abogado",
  CLIENTES: "lextrack_clientes",
  PROCESOS: "lextrack_procesos",
  ACTUALIZACIONES: "lextrack_actualizaciones",
  AUTH: "lextrack_auth",
};

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
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
  const abogado: Abogado = {
    id: generateId(),
    ...data,
    plan: "basico",
    activo: true,
    fechaRegistro: new Date().toISOString(),
  };
  await saveAbogado(abogado);
  await AsyncStorage.setItem(KEYS.AUTH, "true");
  return abogado;
}

export async function loginAbogado(correo: string, password: string): Promise<Abogado | null> {
  const abogado = await getAbogado();
  if (abogado && abogado.correo === correo && abogado.password === password) {
    await AsyncStorage.setItem(KEYS.AUTH, "true");
    return abogado;
  }
  return null;
}

export async function isAuthenticated(): Promise<boolean> {
  const auth = await AsyncStorage.getItem(KEYS.AUTH);
  return auth === "true";
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.AUTH);
}

export async function getClientes(abogadoId: string): Promise<Cliente[]> {
  const data = await AsyncStorage.getItem(KEYS.CLIENTES);
  const all: Cliente[] = data ? JSON.parse(data) : [];
  return all.filter((c) => c.abogadoId === abogadoId);
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const data = await AsyncStorage.getItem(KEYS.CLIENTES);
  const all: Cliente[] = data ? JSON.parse(data) : [];
  return all.find((c) => c.id === id) || null;
}

export async function saveCliente(cliente: Omit<Cliente, "id" | "fechaCreacion" | "activo">): Promise<Cliente> {
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

export async function updateCliente(id: string, updates: Partial<Cliente>): Promise<void> {
  const data = await AsyncStorage.getItem(KEYS.CLIENTES);
  const all: Cliente[] = data ? JSON.parse(data) : [];
  const idx = all.findIndex((c) => c.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates };
    await AsyncStorage.setItem(KEYS.CLIENTES, JSON.stringify(all));
  }
}

export async function deleteCliente(id: string): Promise<void> {
  const data = await AsyncStorage.getItem(KEYS.CLIENTES);
  const all: Cliente[] = data ? JSON.parse(data) : [];
  const filtered = all.filter((c) => c.id !== id);
  await AsyncStorage.setItem(KEYS.CLIENTES, JSON.stringify(filtered));
}

export async function getProcesos(abogadoId: string): Promise<Proceso[]> {
  const data = await AsyncStorage.getItem(KEYS.PROCESOS);
  const all: Proceso[] = data ? JSON.parse(data) : [];
  return all.filter((p) => p.abogadoId === abogadoId);
}

export async function getProcesosByCliente(clienteId: string): Promise<Proceso[]> {
  const data = await AsyncStorage.getItem(KEYS.PROCESOS);
  const all: Proceso[] = data ? JSON.parse(data) : [];
  return all.filter((p) => p.clienteId === clienteId);
}

export async function getProceso(id: string): Promise<Proceso | null> {
  const data = await AsyncStorage.getItem(KEYS.PROCESOS);
  const all: Proceso[] = data ? JSON.parse(data) : [];
  return all.find((p) => p.id === id) || null;
}

export async function saveProceso(proceso: Omit<Proceso, "id" | "fechaCreacion">): Promise<Proceso> {
  const data = await AsyncStorage.getItem(KEYS.PROCESOS);
  const all: Proceso[] = data ? JSON.parse(data) : [];
  const newProceso: Proceso = {
    ...proceso,
    id: generateId(),
    fechaCreacion: new Date().toISOString(),
  };
  all.push(newProceso);
  await AsyncStorage.setItem(KEYS.PROCESOS, JSON.stringify(all));
  return newProceso;
}

export async function updateProceso(id: string, updates: Partial<Proceso>): Promise<void> {
  const data = await AsyncStorage.getItem(KEYS.PROCESOS);
  const all: Proceso[] = data ? JSON.parse(data) : [];
  const idx = all.findIndex((p) => p.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates };
    await AsyncStorage.setItem(KEYS.PROCESOS, JSON.stringify(all));
  }
}

export async function deleteProceso(id: string): Promise<void> {
  const data = await AsyncStorage.getItem(KEYS.PROCESOS);
  const all: Proceso[] = data ? JSON.parse(data) : [];
  const filtered = all.filter((p) => p.id !== id);
  await AsyncStorage.setItem(KEYS.PROCESOS, JSON.stringify(filtered));
}

export async function getActualizaciones(procesoId: string): Promise<Actualizacion[]> {
  const data = await AsyncStorage.getItem(KEYS.ACTUALIZACIONES);
  const all: Actualizacion[] = data ? JSON.parse(data) : [];
  return all.filter((a) => a.procesoId === procesoId).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export async function saveActualizacion(act: Omit<Actualizacion, "id">): Promise<Actualizacion> {
  const data = await AsyncStorage.getItem(KEYS.ACTUALIZACIONES);
  const all: Actualizacion[] = data ? JSON.parse(data) : [];
  const newAct: Actualizacion = { ...act, id: generateId() };
  all.push(newAct);
  await AsyncStorage.setItem(KEYS.ACTUALIZACIONES, JSON.stringify(all));
  return newAct;
}

export async function deleteActualizacion(id: string): Promise<void> {
  const data = await AsyncStorage.getItem(KEYS.ACTUALIZACIONES);
  const all: Actualizacion[] = data ? JSON.parse(data) : [];
  const filtered = all.filter((a) => a.id !== id);
  await AsyncStorage.setItem(KEYS.ACTUALIZACIONES, JSON.stringify(filtered));
}

export async function getDashboardStats(abogadoId: string): Promise<{
  totalClientes: number;
  totalProcesos: number;
  procesosActivos: number;
  procesosFinalizados: number;
}> {
  const clientes = await getClientes(abogadoId);
  const procesos = await getProcesos(abogadoId);
  return {
    totalClientes: clientes.length,
    totalProcesos: procesos.length,
    procesosActivos: procesos.filter((p) => p.estadoActual === "activo" || p.estadoActual === "en_tramite").length,
    procesosFinalizados: procesos.filter((p) => p.estadoActual === "finalizado").length,
  };
}
