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

// Persona (base para cliente natural, abogado y representante legal)
export {
  personas,
  personasRelations,
  type Persona,
  type InsertPersona,
} from "./persona.schema";

// Representante Legal
export {
  representantesLegales,
  representantesLegalesRelations,
  type RepresentanteLegal,
  type InsertRepresentanteLegal,
} from "./representante-legal.schema";

// Cliente (base)
export { clientes, clientesRelations, type Cliente, type InsertCliente, type ClienteTipo } from "./cliente.schema";

// Cliente Natural (1:1 con clientes)
export {
  clientesNatural,
  clientesNaturalRelations,
  type ClienteNatural,
  type InsertClienteNatural,
} from "./cliente-natural.schema";

// Cliente Empresa (1:1 con clientes)
export {
  clientesEmpresa,
  clientesEmpresaRelations,
  type ClienteEmpresa,
  type InsertClienteEmpresa,
} from "./cliente-empresa.schema";

// Lawyer-Clients (intermediate table)
export { lawyerClients, lawyerClientsRelations, type LawyerClient, type InsertLawyerClient, type LawyerClientStatus } from "./lawyer-clients.schema";

// Tipos Documento
export { tiposDocumento, type TiposDocumento, type InsertTiposDocumento } from "./tipos-documento.schema";

// Estado Proceso
export { estadosProceso, type EstadoProceso, type InsertEstadoProceso } from "./estado-proceso.schema";

// Tipo Proceso
export { tiposProceso, type TiposProceso, type InsertTiposProceso } from "./tipo-proceso.schema";

// Rol
export { roles, type Rol, type InsertRol } from "./rol.schema";

// Permiso
export { permisos, type Permiso, type InsertPermiso } from "./permiso.schema";

// Modulo
export { modulos, type Modulo, type InsertModulo } from "./modulo.schema";

// Roles Permisos
export { rolesPermisos, type RolPermiso, type InsertRolPermiso } from "./rolesPermisos.schema";

// Auth relations (roles ↔ permisos ↔ modulos) — kept separate to avoid circular imports
export {
  rolesRelations,
  permisosRelations,
  modulosRelations,
  rolesPermisosRelations,
} from "./auth-relations";

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

// Proceso Responsables
export {
  procesoResponsables,
  procesoResponsablesRelations,
  type ProcesoResponsable,
  type InsertProcesoResponsable
} from "./proceso-responsables.schema";

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

// Chat
export {
  conversations,
  conversationsRelations,
  conversationParticipants,
  conversationParticipantsRelations,
  messages,
  messagesRelations,
  type ConversationType,
  type MessageType,
  type Conversation,
  type ConversationParticipant,
  type Message,
  type InsertConversation,
  type InsertConversationParticipant,
  type InsertMessage,
  type ConversationDTO,
  type MessageDTO,
  type WsIncomingMessage,
  type WsOutgoingMessage,
} from "./chat.schema";

// Sessions (JWT revocation)
export {
  sessions,
  sessionsRelations,
  type Session,
  type InsertSession,
} from "./session.schema";

// Tareas
export {
  tareas,
  tareasRelations,
  type Tarea,
  type InsertTarea,
  type TareaEstado,
  type TareaPrioridad,
  type CreateTareaDTO,
  type UpdateTareaDTO,
  type CambiarEstadoDTO,
  type TareaResponseDTO,
  type TareasProgresoDTO,
  type MisTareasDTO,
} from "./tarea.schema";

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

// Community (Posts, Comments, Likes, Bookmarks, Tags, Reports, Views)
export {
  posts,
  postsRelations,
  comments,
  commentsRelations,
  postLikes,
  postBookmarks,
  tags,
  postTags,
  postTagsRelations,
  postViews,
  postReports,
  type PostVisibility,
  type Post,
  type Comment,
  type Tag,
  type InsertPost,
  type InsertComment,
  type PostDTO,
  type CommentDTO,
} from "./community.schema";

// Ratings
export {
  ratings,
  type RatingTargetType,
  type Rating,
  type InsertRating,
  type RatingDTO,
  type RatingSummary,
} from "./rating.schema";

// Client Requests
export {
  clientRequests,
  type ClientRequest,
  type ClientRequestStatus,
  type ClientRequestWithSender,
} from "./client-request.schema";

// App Notifications (generic, not tied to procesoId)
export {
  appNotifications,
  type AppNotification,
} from "./app-notification.schema";

// Firm Clients
export {
  firmClients,
  type FirmClient,
} from "./firm-clients.schema";

// Password Reset OTP
export {
  passwordResetOtps,
  type PasswordResetOtp,
} from "./otp.schema";


// Security Audit
export {
  securityEvents,
  type SecurityEvent,
  type InsertSecurityEvent,
  type SecurityEventType,
} from "./security-audit.schema";

// Community Post Matching
export {
  communityPostMatches,
  type PostMatch,
  type LawyerFeedDTO,
} from "./community-match.schema";

// Legal Stages (etapas procesales jurídicas)
export {
  etapasPorTipoProceso,
  etapasPorTipoProcesoRelations,
  LEGAL_STAGE_CODES,
  type LegalStageCode,
  type EtapaPorTipoProceso,
  type InsertEtapaPorTipoProceso,
  type EtapaProcesoDTO,
  type LegalStagesResponseDTO,
  type UpdateLegalStageDTO,
} from "./legal-stage.schema";

// Calendar Events (eventos manuales del abogado)
export {
  calendarEvents,
  calendarEventsRelations,
  REMINDER_OPTIONS,
  type CalendarEventType,
  type CalendarEventSource,
  type CalendarEvent,
  type InsertCalendarEvent,
  type CalendarEventDTO,
  type CreateCalendarEventDTO,
  type UpdateCalendarEventDTO,
} from "./calendar-event.schema";

// Stage task templates
export {
  etapasTareasPlantilla, etapasTareasPlantillaRelations,
  type EtapaTareaPlantilla, type InsertEtapaTareaPlantilla,
  type CreateTemplateDTO, type UpdateTemplateDTO, type TemplateResponseDTO,
} from "./stage-task-template.schema";

// Stage events
export {
  etapaEventos, etapaEventosRelations,
  type EtapaEvento, type InsertEtapaEvento,
  type StageEventTipo, type StageEventResponseDTO,
} from "./stage-event.schema";

// Tarea Extensions (observaciones, subtareas, historial)
export {
  tareaObservaciones,
  tareaObservacionesRelations,
  type TareaObservacion,
  type InsertTareaObservacion,
  type TareaObservacionDTO,
  type CreateObservacionDTO,
} from "./tarea-observacion.schema";

export {
  tareaSubtareas,
  tareaSubtareasRelations,
  type TareaSubtarea,
  type InsertTareaSubtarea,
  type SubtareaDTO,
  type SubtareaEstado,
  type TiempoUnidad,
  type CreateSubtareaDTO,
  type UpdateSubtareaDTO,
} from "./tarea-subtarea.schema";

export {
  tareaHistorial,
  tareaHistorialRelations,
  type TareaHistorialEntry,
  type InsertTareaHistorialEntry,
  type TareaHistorialDTO,
  type TareaAccion,
} from "./tarea-historial.schema";

export {
  tareaArchivos,
  tareaArchivosRelations,
  type TareaArchivo,
  type InsertTareaArchivo,
  type TareaArchivoDTO,
} from "./tarea-archivo.schema";

// Proceso Ownership (propiedad histórica de procesos)
export {
  procesoOwnership,
  procesoOwnershipRelations,
  type OwnerType,
  type ProcesoOwnership,
  type InsertProcesoOwnership,
  type ProcesoOwnershipDTO,
  type TransferOwnershipDTO,
} from "./proceso-ownership.schema";

// Proceso Sharing (accesos externos con historial y permisos por tipo)
export {
  procesoSharing,
  procesoSharingRelations,
  PERMISSION_CEILING,
  type SharedWithType,
  type SharingPermission,
  type ProcesoSharing,
  type InsertProcesoSharing,
  type ProcesoSharingDTO,
  type CreateSharingDTO,
} from "./proceso-sharing.schema";
