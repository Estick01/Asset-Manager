import { firmProfiles } from './../../../shared/schema/firm-profile.schema';
import { FirmDashboardStats, FirmDashboardStorage } from './models/firm-dashboard.storage';

import mysql2 from 'mysql2/promise';
import { drizzle } from "drizzle-orm/mysql2";
import { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "@/shared/schema";
import { ActualizacionStorage } from "./models/actualizacion-storage";
import { EstadoProcesoStorage } from "./models/estadoProceso-storage";
import { FirmProfileStorage } from "./models/firma-storage";
import { PermisoStorage } from "./models/permisos-storage";
import { PlanStorage } from "./models/plan-storage";
import { RolStorage } from "./models/rol-storage";
import { TipoProcesoStorage } from "./models/tipoProceso-storage";
import { UserStorage } from "./models/user-storage";
import { ClienteStorage } from "./models/cliente-storage";
import { ProcesoStorage } from "./models/proceso-storage";
import { DocumentoStorage } from "./models/documento-storage";
import { NotificacionStorage } from "./models/notificacion-storage";
import { AbogadoStorage } from "./models/abogado-storage";
import { LawyerClientsStorage } from "./models/lawyer-clients-storage";
import { TiposDocumentoStorage } from "./models/tipos-documento-storage";
import { DepartamentoStorage } from "./models/departamento-storage";
import { MunicipioStorage } from "./models/municipio-storage";
import { LawyerFirmaHistoryStorage } from "./models/lawyer-firma-history-storage";
import { FirmInvitationStorage } from "./models/firm-invitation-storage";
import { ChatStorage } from "./models/chat-storage";
import { SessionStorage } from "./models/session-storage";
import { TareaStorage } from "./models/tarea-storage";
import { PersonaStorage } from "./models/persona-storage";
import { RepresentanteLegalStorage } from "./models/representante-legal-storage";
import { CommunityStorage } from "./models/community-storage";
import { RatingStorage } from "./models/rating-storage";
import { ClientRequestStorage } from "./models/client-request-storage";
import { AppNotificationStorage } from "./models/app-notification-storage";
import { FirmClientsStorage } from "./models/firm-clients-storage";
import { OtpStorage } from "./models/otp-storage";
import { SecurityEventsStorage } from "./models/security-events-storage";
import { MatchingStorage } from "./models/matching-storage";
import { RecommendationStorage } from "./models/recommendation-storage";
import { LegalStageStorage } from "./models/legal-stage-storage";
import { CalendarStorage } from "./models/calendar-storage";
import { StageTaskTemplateStorage } from "./models/stage-task-template-storage";
import { StageEventStorage } from "./models/stage-event-storage";
import { TareaExtensionStorage } from "./models/tarea-extension-storage";
import { ProcesoOwnershipStorage } from "./models/proceso-ownership-storage";
import { ProcesoSharingStorage } from "./models/proceso-sharing-storage";
import { ClienteOwnershipStorage } from "./models/cliente-ownership-storage";
import { FirmSettingsStorage } from "./models/firm-settings-storage";
import { Cliente, InsertCliente, InsertUser, InsertLawyerProfile, LawyerProfile, InsertFirmProfile, FirmProfile, InsertPersona, InsertRepresentanteLegal } from '@/shared/schema';
import { UpdateLawyerProfileDTO } from '@/shared/schema/lawyer-profile.schema';

// Export the database type for use in storage classes
export type Database = MySql2Database<typeof schema>;

export class DatabaseStorage {
  protected db: MySql2Database<typeof schema>;

  public clientes: ClienteStorage;
  public procesos: ProcesoStorage;
  public documentos: DocumentoStorage;
  public notificaciones: NotificacionStorage;
  public actualizaciones: ActualizacionStorage;
  public planes: PlanStorage;
  public estadosProceso: EstadoProcesoStorage;
  public tiposProceso: TipoProcesoStorage;
  public roles: RolStorage;
  public permisos: PermisoStorage;
  public users: UserStorage;
  public firmProfiles: FirmProfileStorage;
  public lawyerProfiles: AbogadoStorage; // For lawyer profiles
  public abogados: AbogadoStorage; // Backwards compatibility alias
  public lawyerClients: LawyerClientsStorage;
  public tiposDocumento: TiposDocumentoStorage;
  public departamentos: DepartamentoStorage;
  public municipios: MunicipioStorage;
  public lawyerFirmaHistory: LawyerFirmaHistoryStorage;
  public firmInvitation: FirmInvitationStorage;
  public FirmDashboardStorage: FirmDashboardStorage;
  public chat: ChatStorage;
  public sessions: SessionStorage;
  public tareas: TareaStorage;
  public personas: PersonaStorage;
  public representantesLegales: RepresentanteLegalStorage;
  public community: CommunityStorage;
  public ratings: RatingStorage;
  public clientRequests: ClientRequestStorage;
  public appNotifications: AppNotificationStorage;
  public firmClients: FirmClientsStorage;
  public otps: OtpStorage;
  public securityEvents: SecurityEventsStorage;
  public matching: MatchingStorage;
  public recommendations: RecommendationStorage;
  public legalStages: LegalStageStorage;
  public calendar: CalendarStorage;
  public stageTemplates: StageTaskTemplateStorage;
  public stageEvents:    StageEventStorage;
  public tareaExtensions: TareaExtensionStorage;
  public procesoOwnership:   ProcesoOwnershipStorage;
  public procesoSharing:     ProcesoSharingStorage;
  public clienteOwnership:   ClienteOwnershipStorage;
  public firmSettings:       FirmSettingsStorage;

  constructor(databaseUrl?: string) {
    const dbUrl = databaseUrl || process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is not set");

    const connection = mysql2.createPool({ uri: dbUrl });

    this.db = drizzle(connection, {
      schema,
      mode: "default",
    });

    this.actualizaciones = new ActualizacionStorage(this.db);
    this.planes = new PlanStorage(this.db);
    this.estadosProceso = new EstadoProcesoStorage(this.db);
    this.tiposProceso = new TipoProcesoStorage(this.db);
    this.roles = new RolStorage(this.db);
    this.permisos = new PermisoStorage(this.db);
    this.users = new UserStorage(this.db);
    this.firmProfiles = new FirmProfileStorage(this.db);
    this.lawyerProfiles = new AbogadoStorage(this.db);
    this.clientes = new ClienteStorage(this.db);
    this.procesos = new ProcesoStorage(this.db);
    this.documentos = new DocumentoStorage(this.db);
    this.abogados = new AbogadoStorage(this.db);
    this.notificaciones = new NotificacionStorage(this.db);
    this.lawyerClients = new LawyerClientsStorage(this.db);
    this.tiposDocumento = new TiposDocumentoStorage(this.db);
    this.departamentos = new DepartamentoStorage(this.db);
    this.municipios = new MunicipioStorage(this.db);
    this.lawyerFirmaHistory = new LawyerFirmaHistoryStorage(this.db);
    this.firmInvitation = new FirmInvitationStorage(this.db);
    this.FirmDashboardStorage = new FirmDashboardStorage(this.db);
    this.chat = new ChatStorage(this.db);
    this.sessions = new SessionStorage(this.db);
    this.tareas = new TareaStorage(this.db);
    this.personas = new PersonaStorage(this.db);
    this.representantesLegales = new RepresentanteLegalStorage(this.db);
    this.community = new CommunityStorage(this.db);
    this.ratings = new RatingStorage(this.db);
    this.clientRequests = new ClientRequestStorage(this.db);
    this.appNotifications = new AppNotificationStorage(this.db);
    this.firmClients = new FirmClientsStorage(this.db);
    this.otps = new OtpStorage(this.db);
    this.securityEvents = new SecurityEventsStorage(this.db);
    this.matching = new MatchingStorage(this.db);
    this.recommendations = new RecommendationStorage(this.db);
    this.legalStages = new LegalStageStorage(this.db);
    this.calendar = new CalendarStorage(this.db);
    this.stageTemplates   = new StageTaskTemplateStorage(this.db);
    this.stageEvents      = new StageEventStorage(this.db);
    this.tareaExtensions  = new TareaExtensionStorage(this.db);
    this.procesoOwnership = new ProcesoOwnershipStorage(this.db);
    this.procesoSharing   = new ProcesoSharingStorage(this.db);
    this.clienteOwnership = new ClienteOwnershipStorage(this.db);
    this.firmSettings     = new FirmSettingsStorage(this.db);

    // Cleanup expired sessions every hour
    setInterval(() => this.sessions.deleteExpired(), 60 * 60 * 1000);
    // Cleanup expired OTPs every hour
    setInterval(() => this.otps.deleteExpired(), 60 * 60 * 1000);
  }

  // Backwards compatibility wrapper methods for routes
  // These delegate to the individual storage classes or return mock data
  // TODO: Complete implementation to match old storage interface

  async getProcesosByIds(ids: string[], filter?: any) {
    return this.procesos.getProcesosByIds(ids, filter);
  }

  async removeAbogadoFromProcesos(lawyerId: string, procesoIds: string[]): Promise<void> {
    return this.procesos.removeAbogadoFromProcesos(lawyerId, procesoIds);
  }

  async desactivarResponsable(lawyerId: string, procesoIds: string[]): Promise<void> {
    return this.procesos.desactivarResponsable(lawyerId, procesoIds);
  }

  async getProcesoIdsByAbogadoAssignment(lawyerId: string) {
    return this.procesos.getProcesoIdsByAbogadoAssignment(lawyerId);
  }

  async getAbogadoByIdUser(userId: string) {
    return this.abogados.getLawyerByUserId(userId);
  }

  async getAbogadoUpdate(id:string , update: UpdateLawyerProfileDTO) {
    return this.abogados.updateLawyer(id,update);
  }

  async getAbogadoByCorreo(correo: string) {
    // First get the user to find password hash
    const user = await this.users.getUserByEmail(correo);
    if (!user) return undefined;

    // Then get the lawyer profile
    const lawyer = await this.abogados.getLawyerByUserId(user.id);
    if (!lawyer) return undefined;

    return {
      id: user.id,
      nombre: `${lawyer.firstName} ${lawyer.lastName}`,
      correo: user.email,
      despacho: '',
      telefono: lawyer.phone || '',
      planId: lawyer.firmId || 'free',
      rolId: 1,
      activo: user.isActive,
      fechaRegistro: lawyer.createdAt,
      state: true,
    };
  }

  async createAbogado(data: any) {
    const lawyer = await this.abogados.createLawyer({
      id: data.id,
      userId: data.id,
      firstName: data.nombre?.split(' ')[0] || '',
      lastName: data.nombre?.split(' ').slice(1).join(' ') || '',
      licenseNumber: data.licenseNumber || '',
      isIndependent: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return lawyer;
  }

  async getLawyerProfileById(id: string){
    return this.abogados.getLawyer(id);
  }

  async getAllLawyers(limit: number, offset: number, filter?: any ) {
    return this.abogados.getAllLawyers( limit,offset, filter);
  }


  async getLisRol(){
    return this.roles.getRoles();
  }

  async getRol(id: number) {
    return this.roles.getRol(id);
  }

  async getRolByNombre(nombre: string) {
    return this.roles.getRolByNombre(nombre);
  }

  async createRol(data: any){
    return this.roles.createRol(data);
  }

  async deleteRol(id: number) {
    return this.roles.deleteRol(id);
  }

  async getPermisos() {
    return this.permisos.getPermisos();
  }

  async getPlanes() {
    return this.planes.getPlanes();
  }


  async getModulos() {
    return this.permisos.getModulos();
  }


  async getCliente(id: string) {
    return this.clientes.getCliente(id);
  }

  async getClientesCount(abogadoId: string) {
    
    return this.clientes.getClientesCount(abogadoId);
  }


  async getClienteByDocument(documento: string) {
    return this.clientes.getClienteByDocument(documento);
  }

  async createCliente(data: InsertCliente) {
    return this.clientes.createCliente(data);
  }

  async getPlan(id: string) {
    return this.planes.getPlan(id);
  }

  async createPlan(data: any) {
    return this.planes.createPlan(data);
  }

  // User methods (delegate to users storage)
  async getUserByEmail(email: string) {
    return this.users.getUserByEmail(email);
  }

  async getUserById(id: string) {
    return this.users.getUserById(id);
  }

  async createUser(user: InsertUser) {
    return this.users.createUser(user);
  }

  async getEstadosProceso() {
    return this.estadosProceso.getEstadosProceso();
  }

  async getProceso(id: string) {
    return this.procesos.getProceso(id);
  }

  async setCommunityPostId(procesoId: string, communityPostId: string | null) {
    return this.procesos.setCommunityPostId(procesoId, communityPostId);
  }

  async getProcesoByFirmaIdAndProcesoId(firmaId: string, procesoId: string) {
    return this.procesos.getProcesoByFirmaIdAndProcesoId(firmaId, procesoId);
  }

  async getProcesosByClienteId(clienteId: string ,limit: number, offset: number, filter?: any) {
    return this.procesos.getProcesosByCliente(clienteId ,limit, offset, filter);
  }

  async getProcesosByClienteAndLawyer(abogadoId: string, clienteId: string, limit: number, offset: number, filter?: any){
    return this.procesos.getProcesosByClienteAndLawyer(abogadoId, clienteId, limit, offset, filter);
  }

  async getProcesoByAbogadoId(abogadoId: string, limit: number, offset: number, filter?: any) {
    return this.procesos.getProcesos(abogadoId, limit, offset, filter);
  }

  async getProceoByAbogadoIdAndProcesoId(abogadoId: string, procesoId: string) {
    return this.procesos.getProcesoByAbogadoIdAndProcesoId(abogadoId, procesoId);
  }

  async getProcesoByClienteIdAndProcesoId(clienteId: string, procesoId: string) {
    return this.procesos.getProcesoByClienteIdAndProcesoId(clienteId, procesoId);
  }


  async getProcesCount(abogadoId: string, filter?: any) {
    return this.procesos.getProcesosCount(abogadoId, filter);
  }

  async createProceso(data: any) {
    return this.procesos.createProceso(data);
  }

  async createDocumento(data: any) {
    return this.documentos.createDocumento(data);
  }

  async getDocumento(id: string) {
    return this.documentos.getDocumento(id);
  }
  
  async updateProceso(id: string, updates: any) {
    return this.procesos.updateProceso(id, updates);
  }

  async getTiposProceso() {
    return this.tiposProceso.getTiposProceso();
  }

  async deleteProceso(id: string) {
    return this.procesos.deleteProceso(id);
  }

  async createTipoProceso(data: any) {
    return this.tiposProceso.createTipoProceso(data);
  }

  async createNotificacion(data: any) {
    return this.notificaciones.createNotificacion(data);
  }
  async updateTipoProceso(id: number, updates: any) {
    return this.tiposProceso.updateTipoProceso(id, updates);
  }

  async deleteTipoProceso(id: number) {
    return this.tiposProceso.deleteTipoProceso(id); 
  }

  async createActualizacion(data: any) {
    return this.actualizaciones.createActualizacion(data);
  }

  async getActualizaciones(procesoId: string , limit: number, offset: number, filter?: any) {
    return this.actualizaciones.getActualizaciones(procesoId, limit, offset);
  }

  async getActualizacion(id: string) {
    return this.actualizaciones.getActualizacion(id);
  }

  async deleteActualizacion(id: string) {
    return this.actualizaciones.deleteActualizacion(id);
  }

  async getDocumentos(idProceso: string, stage?: string) {
    return this.documentos.getDocumentos(idProceso, stage);
  }

  async deleteDocumento(id: string) {
    return this.documentos.deleteDocumento(id);
  }


  async getPermisosByRol(idRol: number) {
    return this.permisos.getPermisosByRol(idRol);
  }

  async createEstado(data: any) {
    // @ts-ignore - method may not exist
    return this.estadosProceso.createEstado?.(data);
  }

  async getNotificacionesByClienteId(clienteId: string) {
    return this.notificaciones.getNotificacionesByClienteId(clienteId);
  }

  async getNotificacionesCountByClienteId(clienteId: string) {
    return this.notificaciones.countNoLeidasByClienteId(clienteId);
  }

  async markNotificacionLeidaCliente(id: number, clienteId: string) {
    return this.notificaciones.marcarComoLeidaByClienteId(id, clienteId);
  }

  async markTodasLeidasCliente(clienteId: string) {
    return this.notificaciones.marcarTodasComoLeidasByClienteId(clienteId);
  }

  async getNotificacionesByAbogadoId(abogadoId: string) {
    return this.notificaciones.getNotificacionesByLawyerId(abogadoId);
  }

  async getNotificacionesCountByAbogadoId(abogadoId: string) {
    return this.notificaciones.countNoLeidasByLawyerId(abogadoId);
  }

  async markNotificacionLeidaAbogado(id: number, lawyerId: string) {
    return this.notificaciones.marcarComoLeidaByLawyerId(id, lawyerId);
  }

  async markTodasLeidasAbogado(abogadoId: string) {
    return this.notificaciones.marcarTodasComoLeidasByLawyerId(abogadoId);
  }

  async getNotificacionesByFirmaId(firmaId: string) {
    return this.notificaciones.getNotificacionesByFirmId(firmaId);
  }

  async getNotificacionesCountByFirmaId(firmaId: string) {
    return this.notificaciones.countNoLeidasByFirmId(firmaId);
  }

  async markNotificacionLeidaFirma(id: number, firmaId: string) {
    return this.notificaciones.marcarComoLeidaByFirmaId(id, firmaId);
  }

  async markTodasLeidasFirma(firmaId: string) {
    return this.notificaciones.marcarTodasComoLeidasByFirmId(firmaId);
  }

  async getFirmProfileByUserId(userId: string) {
    return this.firmProfiles.getFirmProfileByUserId(userId);
  }

  async updateFirmProfile(id: string, updates: any) {
    return this.firmProfiles.updateFirmProfile(id, updates);
  }

  async addLawyerToProceso(procesoId: string, lawyerId: string, options: {   rol?: string;   tipoAsignacionId?: number | null;   razonAsignacion?: string | null;   asignadoPor?: string | null;  fechaFin?: Date | null;  status?: string;  } = {}) {
    return this.procesos.addLawyerToProceso(procesoId, lawyerId, options);
  }

  async getProcesoLawyers(procesoId: string) {
    return this.procesos.getProcesoLawyers(procesoId);
  }

  async removeLawyerFromProceso(procesoId: string, lawyerId: string) {
    return this.procesos.removeLawyerFromProceso(procesoId, lawyerId);
  }

  async getProcesosByClienteAndFirma(clienteId: string, firmaId: string, limit: number, offset: number, filter?: any) {
    return this.procesos.getProcesosByClienteAndFirma(clienteId, firmaId, limit, offset, filter);
  }

  async getProcesosByFirma( idProfile:string , limit: number, offset: number, filter?: any){
    return this.procesos.getProcesosByFirma(idProfile, limit, offset, filter);
  }

  async setResponsable(procesoId: string, responsableId: string | null, options?: { asignadoPor?: string | null; asignadoPorNombre?: string | null; razon?: string | null }) {
    return this.procesos.setResponsable(procesoId, responsableId, options);
  }



  // Create lawyer with user (SaaS model)
  async createLawyerWithUser(
    userData: InsertUser,
    lawyerData: Omit<InsertLawyerProfile, "userId" | "personaId">,
    personaData: Omit<InsertPersona, "id">
  ): Promise<LawyerProfile> {
    return await this.db.transaction(async (tx) => {
      const user = await this.users.createUser(userData, tx);
      const persona = await this.personas.createPersona(personaData, tx);
      const lawyer = await this.abogados.createLawyer({
        ...lawyerData,
        userId: user.id,
        personaId: persona.id,
      });
      return lawyer;
    });
  }

  // Create firm with user (SaaS model)
  async createFirmWithUser(
    userData: InsertUser,
    firmData: Omit<InsertFirmProfile, "userId">,
    repData?: {
      persona: Omit<InsertPersona, "id">;
      rep: Omit<InsertRepresentanteLegal, "id" | "personaId">;
    }
  ): Promise<FirmProfile> {
    return await this.db.transaction(async (tx) => {
      const user = await this.users.createUser(userData, tx);

      let representanteLegalId: string | null = null;
      if (repData) {
        const persona = await this.personas.createPersona(repData.persona, tx);
        const rep = await this.representantesLegales.createRepresentante(
          { ...repData.rep, personaId: persona.id },
          tx
        );
        representanteLegalId = rep.id;
      }

      const firm = await this.firmProfiles.createFirmProfile({
        ...firmData,
        userId: user.id,
        representanteLegalId,
      });
      return firm;
    });
  }

  async getUserProfile(userId: string, rolNombre: string) {
    console.log(rolNombre,'rolNombre', userId,'userId')
    switch (rolNombre) {
      case "abogado": {
        // getLawyerByUserId returns bare row without persona JOIN — resolve full profile
        const bare = await this.abogados.getLawyerByUserId(userId);
        if (!bare) return null;
        return this.abogados.getLawyer(bare.id);
      }
      case "cliente":
        // getClienteByUser delegates to getCliente which does the full JOIN
        return this.clientes.getClienteByUser(userId);
      case "bufete": {
        const firm = await this.firmProfiles.getFirmProfileByUserId(userId);
        if (!firm) return null;
        if (firm.representanteLegalId) {
          const representante = await this.representantesLegales.getRepresentante(firm.representanteLegalId);
          return { ...firm, representanteLegal: representante ?? null };
        }
        return { ...firm, representanteLegal: null };
      }
      default:
        return null;
    }
  }
}

// Create singleton instance for backwards compatibility with routes
export const storage = new DatabaseStorage();
