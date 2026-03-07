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
import { Cliente, InsertCliente, InsertUser, InsertLawyerProfile, LawyerProfile, InsertFirmProfile, FirmProfile } from '@/shared/schema';
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

  }

  // Backwards compatibility wrapper methods for routes
  // These delegate to the individual storage classes or return mock data
  // TODO: Complete implementation to match old storage interface



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
      password: user.passwordHash,
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
    return this.actualizaciones.getActualizaciones(procesoId);
  }

  async deleteActualizacion(id: string) {
    return this.actualizaciones.deleteActualizacion(id);
  }

  async getDocumentos(idProceso:string){
    return this.documentos.getDocumentos(idProceso);
  
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

  async markNotificacionLeidaCliente(id: number) {
    return this.notificaciones.marcarComoLeidaByClienteId(id);
  }

  async getNotificacionesByAbogadoId(abogadoId: string) {
    return this.notificaciones.getNotificacionesByLawyerId(abogadoId);
  }

  async getNotificacionesCountByAbogadoId(abogadoId: string) {
    return this.notificaciones.countNoLeidasByLawyerId(abogadoId);
  }

  async markNotificacionLeidaAbogado(id: number) {
    return this.notificaciones.marcarComoLeidaByLawyerId(id);
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

  async getProcesosByClienteAndFirma(clienteId: string, firmaId: string, limit: number, offset: number, filter?: any) {
    return this.procesos.getProcesosByClienteAndFirma(clienteId, firmaId, limit, offset, filter);
  }

  async getProcesosByFirma( idProfile:string , limit: number, offset: number, filter?: any){
    return this.procesos.getProcesosByFirma(idProfile, limit, offset, filter);
  }



  






  async createClienteWithUser(userData: InsertUser, clienteData: Omit<InsertCliente, "userId">): Promise<Cliente> {
    return await this.db.transaction(async (tx) => {
      const user = await this.users.createUser(userData, tx);
      const cliente = await this.clientes.createCliente(
        {
          ...clienteData,
          userId: user.id,
        },
        tx
      );
      return cliente;
    });
  }

  // Create lawyer with user (SaaS model)
  async createLawyerWithUser(
    userData: InsertUser,
    lawyerData: Omit<InsertLawyerProfile, "userId">
  ): Promise<LawyerProfile> {
    return await this.db.transaction(async (tx) => {
      const user = await this.users.createUser(userData, tx);
      const lawyer = await this.abogados.createLawyer(
        {
          ...lawyerData,
          userId: user.id,
        }
      );
      return lawyer;
    });
  }

  // Create firm with user (SaaS model)
  async createFirmWithUser(
    userData: InsertUser,
    firmData: Omit<InsertFirmProfile, "userId">
  ): Promise<FirmProfile> {
    return await this.db.transaction(async (tx) => {
      const user = await this.users.createUser(userData, tx);
      const firm = await this.firmProfiles.createFirmProfile(
        {
          ...firmData,
          userId: user.id,
        }
      );
      return firm;
    });
  }

  async getUserProfile(userId: string, rolNombre: string) {
      switch (rolNombre) {
        case "abogado":
          return await this.abogados.getLawyerByUserId(userId);
        case "cliente":
          return await this.clientes.getClienteByUser(userId);
        case "bufete":
          return await this.firmProfiles.getFirmProfileByUserId(userId);
        default:
          return null;
      }
    }
}

// Create singleton instance for backwards compatibility with routes
export const storage = new DatabaseStorage();
