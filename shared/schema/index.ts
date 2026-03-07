/**
 * Schema Module Index
 * Exports all database table definitions
 */

// User
export { users, usersRelations, type User, type InsertUser} from "./user.schema";

// Planes
export { planes, type Plan, type InsertPlan } from "./plane.schema";

// Firm Profile
export { firmProfiles, firmProfilesRelations, type FirmProfile, type InsertFirmProfile } from "./firm-profile.schema";

// Lawyer Profile
export { lawyerProfiles, lawyerProfilesRelations, type LawyerProfile, type InsertLawyerProfile } from "./lawyer-profile.schema";

// Cliente
export { clientes, clientesRelations, type Cliente, type InsertCliente } from "./cliente.schema";

// Lawyer-Clients (intermediate table)
export { lawyerClients, type LawyerClient, type InsertLawyerClient, type LawyerClientStatus } from "./lawyer-clients.schema";

// Tipos Documento
export { tiposDocumento, type TiposDocumento, type InsertTiposDocumento } from "./tipos-documento.schema";

// Estado Proceso
export { estadosProceso, type EstadoProceso, type InsertEstadoProceso } from "./estado-proceso.schema";

// Tipo Proceso
export { tiposProceso, type TiposProceso, type InsertTiposProceso } from "./tipo-proceso.schema";

// Rol
export { roles, rolesRelations, type Rol, type InsertRol } from "./rol.schema";

// Permiso
export { permisos, permisosRelations, type Permiso, type InsertPermiso } from "./permiso.schema";

// Modulo
export { modulos, modulosRelations, type Modulo, type InsertModulo } from "./modulo.schema";

// Roles Permisos
export { rolesPermisos, rolesPermisosRelations, type RolPermiso, type InsertRolPermiso } from "./rolesPermisos.schema";

// Actualizaciones
export { 
  actualizaciones, 
  actualizacionesRelations, 
  type Actualizacion, 
  type InsertActualizacion 
} from "./actualizaciones.schema";

// Tipos Actualizacion
export { 
  tiposActualizacion, 
  tiposActualizacionRelations, 
  type TipoActualizacion, 
  type InsertTipoActualizacion 
} from "./tipos-actualizacion.schema";

// Proceso
export { 
  procesos, 
  procesosRelations, 
  type Proceso, 
  type InsertProceso,
  type ProcesoDTO
} from "./proceso.schema";

// ProcesoLawyers (junction table)
export {
  procesoLawyers,
  procesoLawyersRelations,
  type ProcesoLawyer,
  type InsertProcesoLawyer,
  type ProcesoLawyerWithLawyer
} from "./proceso-lawyer.schema";

// TipoAsignacion
export {
  tipoAsignacion,
  type TipoAsignacion,
  type InsertTipoAsignacion
} from "./tipo-asignacion.schema";

// LawyerFirmaHistory
export {
  lawyerFirmaHistory,
  lawyerFirmaHistoryRelations,
  type LawyerFirmaHistory,
  type InsertLawyerFirmaHistory
} from "./lawyer-firma-history.schema";

// FirmInvitations
export {
  firmInvitations,
  firmInvitationsRelations,
  type FirmInvitation,
  type InsertFirmInvitation,
  type FirmInvitationWithDetails
} from "./firm-invitation.schema";

// Documento
export { documentos, documentosRelations, type Documento, type InsertDocumento } from "./documento.schema";

// Notificacion
export { notificaciones, type Notificacion, type InsertNotificacion } from "./notificacion.schema";

// Ubicación (Departamentos y Municipios)
export { 
  departamentos, 
  departamentosRelations,
  municipios, 
  municipiosRelations,
  type Departamento, 
  type NewDepartamento,
  type Municipio, 
  type NewMunicipio 
} from "./ubicacion.schema";
