



import { UserWithRol } from '@/shared/schema/user.schema';
import {  type AdminProfile, type Cliente, type Rol, type User, type LawyerProfile  ,type FirmProfile} from '../../shared/schema';

// --- Unified User Types ---

export type Profile = Cliente | LawyerProfile | FirmProfile | AdminProfile

export interface UnifiedUser {
  user: UserWithRol;
  profile?: Profile;
  permisos?: string[];
}

export interface UnifiedLoginParams {
  email: string;
  password: string;
}

export interface UnifiedRegisterParams {
  email: string;
  password: string;
  role: Rol;
  // Profile-specific fields
  firstName?: string;
  lastName?: string;
  // For LAWYER
  licenseNumber?: string;
  specialty?: string;
  isIndependent?: boolean;
  firmId?: string;
  // For FIRM
  firmName?: string;
  nit?: string;
  address?: string;
  phone?: string;
  planId?: string;
  // For CLIENT
  documentType?: string;
  documentNumber?: string;
}

export interface UnifiedAuthResponse {
  user: UserWithRol;
  token?: string;
  profile?: Profile;
  permisos?: string[];
  newDeviceDetected?: boolean;
  requiresTwoFactor?: boolean;
  challengeId?: string;
}

// --- Abogado Types (Legacy) ---

export interface AbogadoLoginParams {
  correo: string;
  password: string;
}

export interface AbogadoRegisterParams {
  nombre: string;
  correo: string;
  password: string;
  despacho: string;
  telefono: string;
}

export interface AbogadoAuthResponse {
  user: UserWithRol;
  token?: string;
}

// --- Cliente Types ---

export interface ClienteLoginParams {
  documento: string;
  password: string;
}

export interface ClienteAuthResponse {
  user: Cliente;
  token?: string;
}

export interface VerifySessionResponse {
  authenticated: boolean;
  user?: UserWithRol;
  role?: Rol;
  profile?: Profile;
  permisos?: string[];
  clienteId?: string | null;
}

// --- Verification Types ---

export interface VerifyAbogadoResponse {
  authenticated: boolean;
  user?: User;
  profile?: LawyerProfile;
  type?: 'abogado' | 'cliente';
  permisos?: string[];
}
