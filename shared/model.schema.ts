// Shared model types for the LexTrack application
// These types are used across both client and server code

import { lawyerProfiles, users } from "./schema";
import { Plan } from "./schema/plane.schema";
import { Rol } from "./schema/rol.schema";

// Note: The 'password' field is intentionally omitted from frontend types.
export interface Abogado {
  id: string;
  nombre: string;
  correo: string;
  despacho: string;
  telefono: string;
  planId: string;
  plan?: Plan;
  rolId: number | null;
  role?: Rol | null;
  activo: boolean;
  fechaRegistro: string | Date;
  password?: string; // Solo para formularios, no se debe exponer en la UI
}

// The Rol and Permiso types from the DB are safe to use on the frontend.
// export type Rol = typeof roles.$inferSelect;
// export type Permiso = typeof permisos.$inferSelect;
// export type Plan = typeof planes.$inferSelect;

// Note: The 'password' field is intentionally omitted.
export interface Cliente {
  id: string;
  lawyerId: string;
  nombre: string;
  correo: string;
  telefono: string;
  documento: string;
  rolId: number;
  activo?: boolean;
  fechaCreacion: string | Date;
  state?: boolean;
  password?: string; // Solo para formularios, no se debe exponer en la UI
}

export interface Proceso {
  id: string;
  lawyerId: string; // Now uses lawyer_profiles via junction table
  clienteId: string;
  clienteNombre?: string;
  tipoProcesoId?: number | null;
  tipoProceso?: string | null;
  radicado: string;
  juzgado: string;
  estadoId: number;
  estado?: {
    id: number;
    codigo: string;
    nombre: string;
    color: string;
  };
  estadoActual?: "activo" | "en_tramite" | "finalizado" | "archivado";
  descripcionEstado: string;
  fechaCreacion: string | Date;
  state?: boolean;
}

// Type for creating a new process (omitting generated fields)
export type CreateProceso = Omit<Proceso, 'id' | 'fechaCreacion' | 'estado'>;

// export type EstadoProceso = typeof estadosProceso.$inferSelect;
// export type TiposProceso = typeof tiposProceso.$inferSelect;

export interface Actualizacion {
  id: string;
  procesoId: string;
  fecha: string;
  titulo: string;
  descripcion: string;
  tipo: 'manual' | 'documento';
  documentoId?: string;
}

export interface Documento {
  id: string;
  procesoId: string;
  nombre: string;
  uri: string;
  tipo: string;
  tamano: number;
  fechaSubida: Date;
  descripcion?: string | null;
  state?: boolean;
}

// export type Notificacion = typeof notificaciones.$inferSelect;

export interface CreateNotificacion {
  procesoId: string;
  clienteId: string;
  lawyerId: string;
  titulo: string;
  mensaje: string;
  tipo?: 'estado_cambio' | 'actualizacion' | 'recordatorio' | 'general';
}

// =================================================================
// NUEVOS TIPOS PARA ARQUITECTURA SAAS
// =================================================================

export interface User {
  id: string;
  email: string;
  password: string; 
  rol:Rol;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface FirmProfile {
  id: string;
  userId: string;
  name: string;
  nit: string;
  address?: string | null;
  phone?: string | null;
  planId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}



export interface ClientProfile {
  id: string;
  userId: string;
  lawyerId?: string | null;
  firmId?: string | null;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  phone?: string | null;
  address?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Tipos para JWT
export interface JWTPayload {
  id: string;
  email: string;
  rol: Rol;
  idProfile?: string;
  UserName: string | null;
  /** JWT ID — used to look up / revoke the session */
  jti: string;
}

export interface LawyerDTO {
  id: string;          
  correo: string;
  isActive: boolean;
  createdAt: Date;
  profile: {
    id: string;            
    firstName: string;
    lastName: string;
    fullName: string;
    phone?: string | null;
    address?: string | null;
    specialization?: string | null;
    licenseNumber?: string | null;
    isIndependent: boolean;
    userId: string;
    
  };
  firm?: {
    id: string;
    name: string;
    nit: string;
  };
}

