var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema/rol.schema.ts
import { mysqlTable, int, varchar, boolean, text, timestamp } from "drizzle-orm/mysql-core";
var roles;
var init_rol_schema = __esm({
  "shared/schema/rol.schema.ts"() {
    "use strict";
    roles = mysqlTable("roles", {
      id: int("id").autoincrement().primaryKey(),
      nombre: varchar("nombre", { length: 50 }).notNull(),
      descripcion: text("descripcion"),
      activo: boolean("activo").notNull().default(true),
      /** NULL = rol global del sistema; firmId = rol personalizado de ese bufete */
      firmId: varchar("firm_id", { length: 36 }),
      createdAt: timestamp("created_at").notNull().defaultNow(),
      updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
      state: boolean("state").notNull().default(true)
    });
  }
});

// shared/schema/user.schema.ts
import { mysqlTable as mysqlTable2, varchar as varchar2, boolean as boolean2, timestamp as timestamp2, int as int2 } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
var users, usersRelations, EnumRol;
var init_user_schema = __esm({
  "shared/schema/user.schema.ts"() {
    "use strict";
    init_rol_schema();
    users = mysqlTable2("users", {
      id: varchar2("id", { length: 36 }).primaryKey(),
      email: varchar2("email", { length: 255 }).notNull().unique(),
      passwordHash: varchar2("password_hash", { length: 255 }).notNull(),
      name: varchar2("name", { length: 100 }),
      rolId: int2("rol_id"),
      isActive: boolean2("is_active").notNull().default(true),
      emailVerified: boolean2("email_verified").notNull().default(false),
      createdAt: timestamp2("created_at").notNull().default(/* @__PURE__ */ new Date()),
      updatedAt: timestamp2("updated_at").notNull().default(/* @__PURE__ */ new Date()).onUpdateNow()
    });
    usersRelations = relations(users, ({ one }) => ({
      rol: one(roles, {
        fields: [users.rolId],
        references: [roles.id]
      })
    }));
    EnumRol = {
      ADMIN: { id: 1, nombre: "admin" },
      ABOGADO: { id: 2, nombre: "abogado" },
      NUEVO: { id: 3, nombre: "nuevo" },
      CLIENTE: { id: 4, nombre: "cliente" },
      BUFETE: { id: 5, nombre: "bufete" }
    };
  }
});

// shared/schema/admin-profile.schema.ts
import { relations as relations2 } from "drizzle-orm";
import { mysqlTable as mysqlTable3, timestamp as timestamp3, varchar as varchar3 } from "drizzle-orm/mysql-core";
var adminProfiles, adminProfilesRelations;
var init_admin_profile_schema = __esm({
  "shared/schema/admin-profile.schema.ts"() {
    "use strict";
    init_user_schema();
    adminProfiles = mysqlTable3("admin_profiles", {
      id: varchar3("id", { length: 36 }).primaryKey(),
      userId: varchar3("user_id", { length: 36 }).notNull().unique(),
      displayName: varchar3("display_name", { length: 120 }).notNull(),
      adminType: varchar3("admin_type", { length: 50 }).notNull(),
      createdAt: timestamp3("created_at").notNull().default(/* @__PURE__ */ new Date()),
      updatedAt: timestamp3("updated_at").notNull().default(/* @__PURE__ */ new Date()).onUpdateNow()
    });
    adminProfilesRelations = relations2(adminProfiles, ({ one }) => ({
      user: one(users, {
        fields: [adminProfiles.userId],
        references: [users.id]
      })
    }));
  }
});

// shared/schema/plane.schema.ts
import { mysqlTable as mysqlTable4, varchar as varchar4, int as int3, decimal, boolean as boolean3, mysqlEnum } from "drizzle-orm/mysql-core";
var planes;
var init_plane_schema = __esm({
  "shared/schema/plane.schema.ts"() {
    "use strict";
    planes = mysqlTable4("planes", {
      id: varchar4("id", { length: 36 }).primaryKey(),
      nombre: varchar4("nombre", { length: 50 }).notNull(),
      tipo: mysqlEnum("tipo", ["abogado", "bufete"]).notNull(),
      // Precios
      precioMensualCop: decimal("precio_mensual_cop", { precision: 12, scale: 2 }).notNull(),
      precioAnualCop: decimal("precio_anual_cop", { precision: 12, scale: 2 }).notNull(),
      precioMensualUsd: decimal("precio_mensual_usd", { precision: 10, scale: 2 }).notNull(),
      precioAnualUsd: decimal("precio_anual_usd", { precision: 10, scale: 2 }).notNull(),
      // Límites de recursos (-1 = ilimitado)
      maxProcesos: int3("max_procesos").notNull().default(5),
      maxClientes: int3("max_clientes").notNull().default(10),
      maxStorageGb: int3("max_storage_gb").notNull().default(0),
      // Límites de usuarios (solo bufete; abogado siempre 1)
      includedUsers: int3("included_users").notNull().default(1),
      maxUsers: int3("max_users").notNull().default(1),
      // -1 = ilimitado
      precioUsuarioExtraCop: decimal("precio_usuario_extra_cop", { precision: 10, scale: 2 }),
      precioUsuarioExtraUsd: decimal("precio_usuario_extra_usd", { precision: 10, scale: 2 }),
      state: boolean3("state").notNull().default(true)
    });
  }
});

// shared/schema/tipos-documento.schema.ts
import { mysqlTable as mysqlTable5, varchar as varchar5, boolean as boolean4, int as int4 } from "drizzle-orm/mysql-core";
var tiposDocumento;
var init_tipos_documento_schema = __esm({
  "shared/schema/tipos-documento.schema.ts"() {
    "use strict";
    tiposDocumento = mysqlTable5("tipos_documento", {
      id: int4("id").autoincrement().primaryKey(),
      nombre: varchar5("nombre", { length: 50 }).notNull(),
      // "Cédula", "Pasaporte", "NIT", etc.
      codigo: varchar5("codigo", { length: 20 }).notNull().unique(),
      // "CC", "CE", "NIT", etc.
      state: boolean4("state").notNull().default(true)
    });
  }
});

// shared/schema/ubicacion.schema.ts
import { mysqlTable as mysqlTable6, varchar as varchar6, tinyint, timestamp as timestamp4 } from "drizzle-orm/mysql-core";
import { relations as relations3 } from "drizzle-orm";
var departamentos, departamentosRelations, municipios, municipiosRelations;
var init_ubicacion_schema = __esm({
  "shared/schema/ubicacion.schema.ts"() {
    "use strict";
    departamentos = mysqlTable6("departamentos", {
      id: varchar6("id", { length: 36 }).primaryKey(),
      codigo: varchar6("codigo", { length: 10 }).notNull().unique(),
      nombre: varchar6("nombre", { length: 100 }).notNull(),
      state: tinyint("state").notNull().default(1),
      createdAt: timestamp4("created_at").notNull().defaultNow(),
      updatedAt: timestamp4("updated_at").notNull().defaultNow().onUpdateNow()
    });
    departamentosRelations = relations3(departamentos, ({ many }) => ({
      municipios: many(municipios)
    }));
    municipios = mysqlTable6("municipios", {
      id: varchar6("id", { length: 36 }).primaryKey(),
      departamentoId: varchar6("departamento_id", { length: 36 }).notNull(),
      codigo: varchar6("codigo", { length: 10 }).notNull(),
      nombre: varchar6("nombre", { length: 100 }).notNull(),
      state: tinyint("state").notNull().default(1),
      createdAt: timestamp4("created_at").notNull().defaultNow(),
      updatedAt: timestamp4("updated_at").notNull().defaultNow().onUpdateNow()
    });
    municipiosRelations = relations3(municipios, ({ one }) => ({
      departamento: one(departamentos, {
        fields: [municipios.departamentoId],
        references: [departamentos.id]
      })
    }));
  }
});

// shared/schema/persona.schema.ts
import { relations as relations4 } from "drizzle-orm";
import { mysqlTable as mysqlTable7, varchar as varchar7, text as text3, int as int5, uniqueIndex } from "drizzle-orm/mysql-core";
var personas, personasRelations;
var init_persona_schema = __esm({
  "shared/schema/persona.schema.ts"() {
    "use strict";
    init_tipos_documento_schema();
    init_ubicacion_schema();
    personas = mysqlTable7("personas", {
      id: varchar7("id", { length: 36 }).primaryKey(),
      nombre: varchar7("nombre", { length: 100 }).notNull(),
      apellido: varchar7("apellido", { length: 100 }).notNull(),
      telefono: varchar7("telefono", { length: 50 }).notNull(),
      documento: varchar7("documento", { length: 50 }).notNull(),
      tipoDocumentoId: int5("tipo_documento_id").notNull(),
      direccion: text3("direccion"),
      departamentoId: varchar7("departamento_id", { length: 36 }),
      municipioId: varchar7("municipio_id", { length: 36 })
    }, (table) => ({
      documentoUnique: uniqueIndex("personas_documento_unique").on(table.documento)
    }));
    personasRelations = relations4(personas, ({ one }) => ({
      tipoDocumento: one(tiposDocumento, {
        fields: [personas.tipoDocumentoId],
        references: [tiposDocumento.id]
      }),
      departamento: one(departamentos, {
        fields: [personas.departamentoId],
        references: [departamentos.id]
      }),
      municipio: one(municipios, {
        fields: [personas.municipioId],
        references: [municipios.id]
      })
    }));
  }
});

// shared/schema/representante-legal.schema.ts
import { relations as relations5 } from "drizzle-orm";
import { mysqlTable as mysqlTable8, varchar as varchar8 } from "drizzle-orm/mysql-core";
var representantesLegales, representantesLegalesRelations;
var init_representante_legal_schema = __esm({
  "shared/schema/representante-legal.schema.ts"() {
    "use strict";
    init_persona_schema();
    representantesLegales = mysqlTable8("representantes_legales", {
      id: varchar8("id", { length: 36 }).primaryKey(),
      personaId: varchar8("persona_id", { length: 36 }).notNull(),
      cargo: varchar8("cargo", { length: 100 }).notNull(),
      email: varchar8("email", { length: 255 }).notNull()
    });
    representantesLegalesRelations = relations5(representantesLegales, ({ one }) => ({
      persona: one(personas, {
        fields: [representantesLegales.personaId],
        references: [personas.id]
      })
    }));
  }
});

// shared/schema/firm-profile.schema.ts
import { relations as relations6 } from "drizzle-orm";
import { mysqlTable as mysqlTable9, text as text4, varchar as varchar9, timestamp as timestamp5, uniqueIndex as uniqueIndex2 } from "drizzle-orm/mysql-core";
var firmProfiles, firmProfilesRelations;
var init_firm_profile_schema = __esm({
  "shared/schema/firm-profile.schema.ts"() {
    "use strict";
    init_user_schema();
    init_representante_legal_schema();
    firmProfiles = mysqlTable9("firm_profiles", {
      id: varchar9("id", { length: 36 }).primaryKey(),
      userId: varchar9("user_id", { length: 36 }).notNull().unique(),
      name: varchar9("name", { length: 255 }).notNull(),
      nit: varchar9("nit", { length: 50 }).notNull(),
      address: text4("address"),
      phone: varchar9("phone", { length: 50 }),
      representanteLegalId: varchar9("representante_legal_id", { length: 36 }),
      createdAt: timestamp5("created_at").notNull().default(/* @__PURE__ */ new Date()),
      updatedAt: timestamp5("updated_at").notNull().default(/* @__PURE__ */ new Date()).onUpdateNow()
    }, (table) => ({
      nitUnique: uniqueIndex2("firm_profiles_nit_unique").on(table.nit)
    }));
    firmProfilesRelations = relations6(firmProfiles, ({ one }) => ({
      user: one(users, {
        fields: [firmProfiles.userId],
        references: [users.id]
      }),
      representanteLegal: one(representantesLegales, {
        fields: [firmProfiles.representanteLegalId],
        references: [representantesLegales.id]
      })
    }));
  }
});

// shared/schema/tipo-proceso.schema.ts
var tipo_proceso_schema_exports = {};
__export(tipo_proceso_schema_exports, {
  tiposProceso: () => tiposProceso
});
import { mysqlTable as mysqlTable10, varchar as varchar10, text as text5, boolean as boolean5, timestamp as timestamp6, int as int6 } from "drizzle-orm/mysql-core";
var tiposProceso;
var init_tipo_proceso_schema = __esm({
  "shared/schema/tipo-proceso.schema.ts"() {
    "use strict";
    tiposProceso = mysqlTable10("tipos_proceso", {
      id: int6("id").autoincrement().primaryKey(),
      nombre: varchar10("nombre", { length: 100 }).notNull(),
      descripcion: text5("descripcion"),
      activo: boolean5("activo").notNull().default(true),
      createdAt: timestamp6("created_at").notNull().default(/* @__PURE__ */ new Date()),
      updatedAt: timestamp6("updated_at").notNull().default(/* @__PURE__ */ new Date()).onUpdateNow()
    });
  }
});

// shared/schema/estado-proceso.schema.ts
import { mysqlTable as mysqlTable11, varchar as varchar11, boolean as boolean6, timestamp as timestamp7, int as int7 } from "drizzle-orm/mysql-core";
var estadosProceso;
var init_estado_proceso_schema = __esm({
  "shared/schema/estado-proceso.schema.ts"() {
    "use strict";
    estadosProceso = mysqlTable11("estados_proceso", {
      id: int7("id").autoincrement().primaryKey(),
      nombre: varchar11("nombre", { length: 50 }).notNull(),
      codigo: varchar11("codigo", { length: 50 }).notNull().unique(),
      color: varchar11("color", { length: 20 }).notNull(),
      // ejemplo: #FF0000
      state: boolean6("state").notNull().default(true),
      // activo / inactivo
      createdAt: timestamp7("created_at").notNull().default(/* @__PURE__ */ new Date()),
      updatedAt: timestamp7("updated_at").notNull().default(/* @__PURE__ */ new Date()).onUpdateNow()
    });
  }
});

// shared/schema/tipo-asignacion.schema.ts
import { mysqlTable as mysqlTable12, varchar as varchar12, text as text6, boolean as boolean7, timestamp as timestamp8, int as int8 } from "drizzle-orm/mysql-core";
var tipoAsignacion, TIPO_ASIGNACION_IDS;
var init_tipo_asignacion_schema = __esm({
  "shared/schema/tipo-asignacion.schema.ts"() {
    "use strict";
    tipoAsignacion = mysqlTable12("tipo_asignacion", {
      id: int8("id").autoincrement().primaryKey(),
      nombre: varchar12("nombre", { length: 100 }).notNull(),
      descripcion: text6("descripcion"),
      color: varchar12("color", { length: 7 }),
      // Hex color for UI
      activo: boolean7("activo").notNull().default(true),
      fechaCreacion: timestamp8("fecha_creacion").notNull().default(/* @__PURE__ */ new Date())
    });
    TIPO_ASIGNACION_IDS = {
      NUEVA_ASIGNACION: 1,
      REEMPLAZO: 2,
      ASISTENCIA: 3,
      DELEGACION: 4,
      SUPERVISION: 5,
      CONFLICTO_INTERES: 6,
      CARGA_TRABAJO: 7,
      SOLICITUD_CLIENTE: 8,
      ESPECIALIDAD: 9,
      TEMPORAL: 10,
      OTRO: 11
    };
  }
});

// shared/schema/proceso-lawyer.schema.ts
import { relations as relations7 } from "drizzle-orm";
import { mysqlTable as mysqlTable13, varchar as varchar13, timestamp as timestamp9, int as int9 } from "drizzle-orm/mysql-core";
var procesoLawyers, procesoLawyersRelations;
var init_proceso_lawyer_schema = __esm({
  "shared/schema/proceso-lawyer.schema.ts"() {
    "use strict";
    init_proceso_schema();
    init_lawyer_profile_schema();
    init_user_schema();
    init_tipo_asignacion_schema();
    procesoLawyers = mysqlTable13("proceso_lawyers", {
      id: varchar13("id", { length: 36 }).primaryKey(),
      procesoId: varchar13("proceso_id", { length: 36 }).notNull(),
      lawyerId: varchar13("lawyer_id", { length: 36 }).notNull(),
      tipoAsignacionId: int9("tipo_asignacion_id"),
      // FK to tipo_asignacion
      rol: varchar13("rol", { length: 20 }).notNull().default("asistente"),
      // "principal" | "asistente"
      razonAsignacion: varchar13("razon_asignacion", { length: 500 }),
      // Razón de la asignación
      fechaAsignacion: timestamp9("fecha_asignacion").notNull().default(/* @__PURE__ */ new Date()),
      fechaFin: timestamp9("fecha_fin"),
      // Fecha fin de la asignación (nullable)
      asignadoPor: varchar13("asignado_por", { length: 36 }),
      // FK to users - who assigned this lawyer to the proceso
      status: varchar13("status", { length: 20 }).notNull().default("activo")
      // "activo" | "inactivo"
    });
    procesoLawyersRelations = relations7(procesoLawyers, ({ one }) => ({
      proceso: one(procesos, {
        fields: [procesoLawyers.procesoId],
        references: [procesos.id]
      }),
      lawyer: one(lawyerProfiles, {
        fields: [procesoLawyers.lawyerId],
        references: [lawyerProfiles.id]
      }),
      asignadoPorUser: one(users, {
        fields: [procesoLawyers.asignadoPor],
        references: [users.id]
      }),
      tipoAsignacion: one(tipoAsignacion, {
        fields: [procesoLawyers.tipoAsignacionId],
        references: [tipoAsignacion.id]
      })
    }));
  }
});

// shared/schema/proceso.schema.ts
import { relations as relations8 } from "drizzle-orm";
import { mysqlTable as mysqlTable14, text as text7, varchar as varchar14, boolean as boolean8, timestamp as timestamp10, int as int10, datetime } from "drizzle-orm/mysql-core";
var procesos, procesosRelations;
var init_proceso_schema = __esm({
  "shared/schema/proceso.schema.ts"() {
    "use strict";
    init_cliente_schema();
    init_tipo_proceso_schema();
    init_estado_proceso_schema();
    init_proceso_lawyer_schema();
    procesos = mysqlTable14("procesos", {
      id: varchar14("id", { length: 36 }).primaryKey(),
      clienteId: varchar14("cliente_id", { length: 36 }).notNull(),
      tipoProcesoId: int10("tipo_proceso_id"),
      // FK to tiposProceso
      radicado: text7("radicado").notNull(),
      juzgado: text7("juzgado").notNull(),
      estadoId: int10("estado_id").notNull(),
      descripcionEstado: text7("descripcion_estado").notNull(),
      legalStage: varchar14("legal_stage", { length: 50 }),
      // etapa jurídica actual
      fechaVencimientoEtapa: datetime("fecha_vencimiento_etapa"),
      // deadline de la etapa
      etapaActualizadaEn: timestamp10("etapa_actualizada_en"),
      // cuándo cambió de etapa
      fechaCreacion: timestamp10("fecha_creacion").notNull().default(/* @__PURE__ */ new Date()),
      state: boolean8("state").notNull().default(true),
      communityPostId: varchar14("community_post_id", { length: 36 }),
      // FK to posts (origen comunidad)
      esPrivado: boolean8("es_privado").notNull().default(false),
      createdBy: varchar14("created_by", { length: 36 })
    });
    procesosRelations = relations8(procesos, ({ one, many }) => ({
      cliente: one(clientes, {
        fields: [procesos.clienteId],
        references: [clientes.id]
      }),
      tipoProceso: one(tiposProceso, {
        fields: [procesos.tipoProcesoId],
        references: [tiposProceso.id]
      }),
      estado: one(estadosProceso, {
        fields: [procesos.estadoId],
        references: [estadosProceso.id]
      }),
      lawyers: many(procesoLawyers)
    }));
  }
});

// shared/schema/cliente-natural.schema.ts
import { relations as relations9 } from "drizzle-orm";
import { mysqlTable as mysqlTable15, varchar as varchar15 } from "drizzle-orm/mysql-core";
var clientesNatural, clientesNaturalRelations;
var init_cliente_natural_schema = __esm({
  "shared/schema/cliente-natural.schema.ts"() {
    "use strict";
    init_cliente_schema();
    init_persona_schema();
    clientesNatural = mysqlTable15("clientes_natural", {
      clienteId: varchar15("cliente_id", { length: 36 }).primaryKey(),
      personaId: varchar15("persona_id", { length: 36 }).notNull().unique()
    });
    clientesNaturalRelations = relations9(clientesNatural, ({ one }) => ({
      cliente: one(clientes, {
        fields: [clientesNatural.clienteId],
        references: [clientes.id]
      }),
      persona: one(personas, {
        fields: [clientesNatural.personaId],
        references: [personas.id]
      })
    }));
  }
});

// shared/schema/cliente-empresa.schema.ts
import { relations as relations10 } from "drizzle-orm";
import { mysqlTable as mysqlTable16, varchar as varchar16, uniqueIndex as uniqueIndex3 } from "drizzle-orm/mysql-core";
var clientesEmpresa, clientesEmpresaRelations;
var init_cliente_empresa_schema = __esm({
  "shared/schema/cliente-empresa.schema.ts"() {
    "use strict";
    init_cliente_schema();
    init_representante_legal_schema();
    clientesEmpresa = mysqlTable16("clientes_empresa", {
      clienteId: varchar16("cliente_id", { length: 36 }).primaryKey(),
      razonSocial: varchar16("razon_social", { length: 255 }).notNull(),
      nit: varchar16("nit", { length: 50 }).notNull(),
      sector: varchar16("sector", { length: 100 }),
      representanteLegalId: varchar16("representante_legal_id", { length: 36 })
    }, (table) => ({
      nitUnique: uniqueIndex3("clientes_empresa_nit_unique").on(table.nit)
    }));
    clientesEmpresaRelations = relations10(clientesEmpresa, ({ one }) => ({
      cliente: one(clientes, {
        fields: [clientesEmpresa.clienteId],
        references: [clientes.id]
      }),
      representanteLegal: one(representantesLegales, {
        fields: [clientesEmpresa.representanteLegalId],
        references: [representantesLegales.id]
      })
    }));
  }
});

// shared/schema/cliente.schema.ts
import { relations as relations11 } from "drizzle-orm";
import { mysqlTable as mysqlTable17, varchar as varchar17, boolean as boolean9, timestamp as timestamp11, mysqlEnum as mysqlEnum2 } from "drizzle-orm/mysql-core";
var clientes, clientesRelations;
var init_cliente_schema = __esm({
  "shared/schema/cliente.schema.ts"() {
    "use strict";
    init_user_schema();
    init_proceso_schema();
    init_lawyer_clients_schema();
    init_cliente_natural_schema();
    init_cliente_empresa_schema();
    clientes = mysqlTable17("clientes", {
      id: varchar17("id", { length: 36 }).primaryKey(),
      userId: varchar17("user_id", { length: 36 }).notNull().unique(),
      tipo: mysqlEnum2("tipo", ["natural", "empresa"]).notNull().default("natural"),
      fechaCreacion: timestamp11("fecha_creacion").notNull().default(/* @__PURE__ */ new Date()),
      activo: boolean9("activo").notNull().default(true),
      esPrivado: boolean9("es_privado").notNull().default(false),
      createdBy: varchar17("created_by", { length: 36 })
    });
    clientesRelations = relations11(clientes, ({ one, many }) => ({
      user: one(users, {
        fields: [clientes.userId],
        references: [users.id]
      }),
      natural: one(clientesNatural, {
        fields: [clientes.id],
        references: [clientesNatural.clienteId]
      }),
      empresa: one(clientesEmpresa, {
        fields: [clientes.id],
        references: [clientesEmpresa.clienteId]
      }),
      procesos: many(procesos),
      lawyerClients: many(lawyerClients)
    }));
  }
});

// shared/schema/lawyer-clients.schema.ts
import { relations as relations12 } from "drizzle-orm";
import { mysqlTable as mysqlTable18, varchar as varchar18, text as text8, timestamp as timestamp12, mysqlEnum as mysqlEnum3 } from "drizzle-orm/mysql-core";
var lawyerClients, lawyerClientsRelations;
var init_lawyer_clients_schema = __esm({
  "shared/schema/lawyer-clients.schema.ts"() {
    "use strict";
    init_lawyer_profile_schema();
    init_cliente_schema();
    lawyerClients = mysqlTable18("lawyer_clients", {
      id: varchar18("id", { length: 36 }).primaryKey(),
      lawyerId: varchar18("lawyer_id", { length: 36 }).notNull(),
      clientId: varchar18("client_id", { length: 36 }).notNull(),
      status: mysqlEnum3("status", [
        "active",
        "inactive",
        "terminated"
      ]).notNull().default("active"),
      relationshipStartedAt: timestamp12("relationship_started_at").defaultNow().notNull(),
      relationshipEndedAt: timestamp12("relationship_ended_at"),
      createdBy: varchar18("created_by", { length: 36 }),
      notes: text8("notes"),
      createdAt: timestamp12("created_at").defaultNow().notNull(),
      updatedAt: timestamp12("updated_at").defaultNow().onUpdateNow()
    });
    lawyerClientsRelations = relations12(lawyerClients, ({ one }) => ({
      lawyer: one(lawyerProfiles, {
        fields: [lawyerClients.lawyerId],
        references: [lawyerProfiles.id]
      }),
      client: one(clientes, {
        fields: [lawyerClients.clientId],
        references: [clientes.id]
      })
    }));
  }
});

// shared/schema/lawyer-profile.schema.ts
import { relations as relations13 } from "drizzle-orm";
import { mysqlTable as mysqlTable19, varchar as varchar19, boolean as boolean10, timestamp as timestamp13, text as text9, uniqueIndex as uniqueIndex4 } from "drizzle-orm/mysql-core";
var lawyerProfiles, lawyerProfilesRelations;
var init_lawyer_profile_schema = __esm({
  "shared/schema/lawyer-profile.schema.ts"() {
    "use strict";
    init_user_schema();
    init_firm_profile_schema();
    init_lawyer_clients_schema();
    init_persona_schema();
    lawyerProfiles = mysqlTable19("lawyer_profiles", {
      id: varchar19("id", { length: 36 }).primaryKey(),
      userId: varchar19("user_id", { length: 36 }).notNull().unique(),
      firmId: varchar19("firm_id", { length: 36 }).references(() => firmProfiles.id),
      personaId: varchar19("persona_id", { length: 36 }).notNull().unique(),
      specialization: varchar19("specialization", { length: 255 }),
      licenseNumber: varchar19("license_number", { length: 50 }),
      isIndependent: boolean10("is_independent").notNull().default(false),
      professionalVerificationStatus: varchar19("professional_verification_status", { length: 20 }).notNull().default("pendiente"),
      professionalReviewedAt: timestamp13("professional_reviewed_at"),
      professionalReviewedBy: varchar19("professional_reviewed_by", { length: 36 }),
      professionalReviewNotes: text9("professional_review_notes"),
      createdAt: timestamp13("created_at").notNull().default(/* @__PURE__ */ new Date()),
      updatedAt: timestamp13("updated_at").notNull().default(/* @__PURE__ */ new Date()).onUpdateNow()
    }, (table) => ({
      licenseNumberUnique: uniqueIndex4("lawyer_profiles_license_number_unique").on(table.licenseNumber)
    }));
    lawyerProfilesRelations = relations13(lawyerProfiles, ({ one, many }) => ({
      user: one(users, {
        fields: [lawyerProfiles.userId],
        references: [users.id]
      }),
      firm: one(firmProfiles, {
        fields: [lawyerProfiles.firmId],
        references: [firmProfiles.id]
      }),
      persona: one(personas, {
        fields: [lawyerProfiles.personaId],
        references: [personas.id]
      }),
      lawyerClients: many(lawyerClients)
    }));
  }
});

// shared/schema/permiso.schema.ts
import { mysqlTable as mysqlTable20, int as int11, varchar as varchar20, text as text10, boolean as boolean11, timestamp as timestamp14 } from "drizzle-orm/mysql-core";
var permisos;
var init_permiso_schema = __esm({
  "shared/schema/permiso.schema.ts"() {
    "use strict";
    permisos = mysqlTable20("permisos", {
      id: int11("id").autoincrement().primaryKey(),
      codigo: varchar20("codigo", { length: 100 }).notNull().unique(),
      nombre: varchar20("nombre", { length: 100 }).notNull(),
      descripcion: text10("descripcion"),
      moduloId: int11("modulo_id"),
      activo: boolean11("activo").notNull().default(true),
      createdAt: timestamp14("created_at").notNull().defaultNow(),
      updatedAt: timestamp14("updated_at").notNull().defaultNow().onUpdateNow(),
      state: boolean11("state").notNull().default(true)
    });
  }
});

// shared/schema/modulo.schema.ts
import { mysqlTable as mysqlTable21, int as int12, varchar as varchar21, text as text11, boolean as boolean12, timestamp as timestamp15 } from "drizzle-orm/mysql-core";
var modulos;
var init_modulo_schema = __esm({
  "shared/schema/modulo.schema.ts"() {
    "use strict";
    modulos = mysqlTable21("modulos", {
      id: int12("id").autoincrement().primaryKey(),
      nombre: varchar21("nombre", { length: 50 }).notNull().unique(),
      descripcion: text11("descripcion"),
      icono: varchar21("icono", { length: 50 }),
      orden: int12("orden").default(0),
      activo: boolean12("activo").notNull().default(true),
      createdAt: timestamp15("created_at").notNull().defaultNow(),
      updatedAt: timestamp15("updated_at").notNull().defaultNow().onUpdateNow(),
      state: boolean12("state").notNull().default(true)
    });
  }
});

// shared/schema/rolesPermisos.schema.ts
import { mysqlTable as mysqlTable22, int as int13, timestamp as timestamp16 } from "drizzle-orm/mysql-core";
var rolesPermisos;
var init_rolesPermisos_schema = __esm({
  "shared/schema/rolesPermisos.schema.ts"() {
    "use strict";
    rolesPermisos = mysqlTable22("roles_permisos", {
      id: int13("id").autoincrement().primaryKey(),
      rolId: int13("rol_id").notNull(),
      permisoId: int13("permiso_id").notNull(),
      createdAt: timestamp16("created_at").notNull().defaultNow()
    });
  }
});

// shared/schema/auth-relations.ts
import { relations as relations14 } from "drizzle-orm";
var permisosRelations, modulosRelations, rolesPermisosRelations, rolesRelations;
var init_auth_relations = __esm({
  "shared/schema/auth-relations.ts"() {
    "use strict";
    init_permiso_schema();
    init_modulo_schema();
    init_rolesPermisos_schema();
    init_rol_schema();
    permisosRelations = relations14(permisos, ({ one, many }) => ({
      modulo: one(modulos, { fields: [permisos.moduloId], references: [modulos.id] }),
      rolesPermisos: many(rolesPermisos)
    }));
    modulosRelations = relations14(modulos, ({ many }) => ({
      permisos: many(permisos)
    }));
    rolesPermisosRelations = relations14(rolesPermisos, ({ one }) => ({
      rol: one(roles, { fields: [rolesPermisos.rolId], references: [roles.id] }),
      permiso: one(permisos, { fields: [rolesPermisos.permisoId], references: [permisos.id] })
    }));
    rolesRelations = relations14(roles, ({ many }) => ({
      rolesPermisos: many(rolesPermisos)
    }));
  }
});

// shared/schema/tipos-actualizacion.schema.ts
import { mysqlTable as mysqlTable23, int as int14, varchar as varchar22 } from "drizzle-orm/mysql-core";
import { relations as relations15 } from "drizzle-orm";
var tiposActualizacion, tiposActualizacionRelations;
var init_tipos_actualizacion_schema = __esm({
  "shared/schema/tipos-actualizacion.schema.ts"() {
    "use strict";
    init_actualizaciones_schema();
    tiposActualizacion = mysqlTable23("tipos_actualizacion", {
      id: int14("id").autoincrement().primaryKey(),
      nombre: varchar22("nombre", { length: 50 }).notNull()
      // "manual", "documento"
    });
    tiposActualizacionRelations = relations15(tiposActualizacion, ({ many }) => ({
      actualizaciones: many(actualizaciones)
    }));
  }
});

// shared/schema/documento.schema.ts
import { relations as relations16 } from "drizzle-orm";
import { mysqlTable as mysqlTable24, text as text13, varchar as varchar23, boolean as boolean13, timestamp as timestamp17, int as int15 } from "drizzle-orm/mysql-core";
var documentos, documentosRelations;
var init_documento_schema = __esm({
  "shared/schema/documento.schema.ts"() {
    "use strict";
    init_proceso_schema();
    documentos = mysqlTable24("documentos", {
      id: varchar23("id", { length: 36 }).primaryKey(),
      procesoId: varchar23("proceso_id", { length: 36 }).notNull(),
      nombre: varchar23("nombre", { length: 255 }).notNull(),
      url: text13("url").notNull(),
      tipo: varchar23("tipo", { length: 50 }).notNull(),
      // "demanda", "contestacion", "sentencia", etc.
      tipoDocumento: varchar23("tipo_documento", { length: 20 }).notNull().default("PROCESAL"),
      // "PROCESAL" | "PROBATORIO"
      tamano: int15("tamano").notNull().default(0),
      descripcion: text13("descripcion"),
      fechaSubida: timestamp17("fecha_subida").notNull().default(/* @__PURE__ */ new Date()),
      state: boolean13("state").notNull().default(true),
      legalStage: varchar23("legal_stage", { length: 50 })
    });
    documentosRelations = relations16(documentos, ({ one }) => ({
      proceso: one(procesos, {
        fields: [documentos.procesoId],
        references: [procesos.id]
      })
    }));
  }
});

// shared/schema/actualizaciones.schema.ts
import { mysqlTable as mysqlTable25, varchar as varchar24, text as text14, int as int16, timestamp as timestamp18, boolean as boolean14 } from "drizzle-orm/mysql-core";
import { relations as relations17, sql } from "drizzle-orm";
var actualizaciones, actualizacionesRelations;
var init_actualizaciones_schema = __esm({
  "shared/schema/actualizaciones.schema.ts"() {
    "use strict";
    init_proceso_schema();
    init_tipos_actualizacion_schema();
    init_documento_schema();
    actualizaciones = mysqlTable25("actualizaciones", {
      id: varchar24("id", { length: 36 }).primaryKey(),
      procesoId: varchar24("proceso_id", { length: 36 }).notNull(),
      fecha: timestamp18("fecha").notNull().default(sql`now()`),
      titulo: text14("titulo").notNull(),
      descripcion: text14("descripcion").notNull(),
      tipoId: int16("tipo_id").notNull(),
      // FK to tipos_actualizacion
      documentoId: varchar24("documento_id", { length: 36 }),
      // Nullable
      state: boolean14("state").notNull().default(true)
    });
    actualizacionesRelations = relations17(actualizaciones, ({ one }) => ({
      proceso: one(procesos, { fields: [actualizaciones.procesoId], references: [procesos.id] }),
      tipo: one(tiposActualizacion, { fields: [actualizaciones.tipoId], references: [tiposActualizacion.id] }),
      documento: one(documentos, { fields: [actualizaciones.documentoId], references: [documentos.id] })
    }));
  }
});

// shared/schema/proceso-responsables.schema.ts
import { boolean as boolean15, datetime as datetime2, mysqlTable as mysqlTable26, varchar as varchar25 } from "drizzle-orm/mysql-core";
import { relations as relations18 } from "drizzle-orm";
var procesoResponsables, procesoResponsablesRelations;
var init_proceso_responsables_schema = __esm({
  "shared/schema/proceso-responsables.schema.ts"() {
    "use strict";
    init_proceso_schema();
    init_lawyer_profile_schema();
    procesoResponsables = mysqlTable26("proceso_responsables", {
      id: varchar25("id", { length: 36 }).primaryKey(),
      procesoId: varchar25("proceso_id", { length: 36 }).notNull(),
      lawyerId: varchar25("lawyer_id", { length: 36 }).notNull(),
      asignadoPor: varchar25("asignado_por", { length: 36 }),
      asignadoPorNombre: varchar25("asignado_por_nombre", { length: 255 }),
      fechaInicio: datetime2("fecha_inicio", { mode: "date", fsp: 3 }).notNull(),
      fechaFin: datetime2("fecha_fin", { mode: "date", fsp: 3 }),
      razon: varchar25("razon", { length: 255 }),
      activo: boolean15("activo").default(true).notNull()
    });
    procesoResponsablesRelations = relations18(procesoResponsables, ({ one }) => ({
      proceso: one(procesos, {
        fields: [procesoResponsables.procesoId],
        references: [procesos.id]
      }),
      lawyer: one(lawyerProfiles, {
        fields: [procesoResponsables.lawyerId],
        references: [lawyerProfiles.id]
      }),
      asignadoPor: one(lawyerProfiles, {
        fields: [procesoResponsables.asignadoPor],
        references: [lawyerProfiles.id]
      })
    }));
  }
});

// shared/schema/proceso-etapa-historial.schema.ts
import { mysqlTable as mysqlTable27, varchar as varchar26, text as text15, timestamp as timestamp19 } from "drizzle-orm/mysql-core";
import { relations as relations19 } from "drizzle-orm";
var ETAPA_ESTADOS, procesoEtapaHistorial, procesoEtapaHistorialRelations;
var init_proceso_etapa_historial_schema = __esm({
  "shared/schema/proceso-etapa-historial.schema.ts"() {
    "use strict";
    init_proceso_schema();
    init_user_schema();
    ETAPA_ESTADOS = [
      "INICIADA",
      // Etapa iniciada
      "EN_PROCESO",
      // En proceso de ejecución
      "COMPLETADA",
      // Completada exitosamente
      "NO_ADMITIDA",
      // Rechazada/no admitida
      "SUBSANADA",
      // Subsanada después de rechazo
      "FALLIDA",
      // Falló (ej: notificación fallida)
      "REINTENTO",
      // Reintento después de falla
      "APLAZADA",
      // Aplazada (ej: audiencia)
      "CANCELADA",
      // Cancelada
      "SUSPENDIDA"
      // Suspendida temporalmente
    ];
    procesoEtapaHistorial = mysqlTable27("proceso_etapa_historial", {
      id: varchar26("id", { length: 36 }).primaryKey(),
      procesoId: varchar26("proceso_id", { length: 36 }).notNull(),
      etapa: varchar26("etapa", { length: 50 }).notNull(),
      // Código de la etapa (ej: "DEMANDA", "NOTIFICACION")
      estado: varchar26("estado", { length: 20 }).notNull(),
      // Estado dentro de la etapa
      fecha: timestamp19("fecha").notNull().defaultNow(),
      observacion: text15("observacion"),
      // Observaciones opcionales
      usuarioId: varchar26("usuario_id", { length: 36 }),
      // Usuario que realizó el cambio
      createdAt: timestamp19("created_at").notNull().defaultNow()
    });
    procesoEtapaHistorialRelations = relations19(procesoEtapaHistorial, ({ one }) => ({
      proceso: one(procesos, {
        fields: [procesoEtapaHistorial.procesoId],
        references: [procesos.id]
      }),
      usuario: one(users, {
        fields: [procesoEtapaHistorial.usuarioId],
        references: [users.id]
      })
    }));
  }
});

// shared/schema/lawyer-firma-history.schema.ts
import { relations as relations20 } from "drizzle-orm";
import { mysqlTable as mysqlTable28, varchar as varchar27, timestamp as timestamp20, text as text16, int as int17 } from "drizzle-orm/mysql-core";
var lawyerFirmaHistory, lawyerFirmaHistoryRelations;
var init_lawyer_firma_history_schema = __esm({
  "shared/schema/lawyer-firma-history.schema.ts"() {
    "use strict";
    init_lawyer_profile_schema();
    init_firm_profile_schema();
    init_user_schema();
    init_rol_schema();
    lawyerFirmaHistory = mysqlTable28("lawyer_firma_history", {
      id: varchar27("id", { length: 36 }).primaryKey(),
      lawyerId: varchar27("lawyer_id", { length: 36 }).notNull(),
      firmaId: varchar27("firma_id", { length: 36 }).notNull(),
      fechaIngreso: timestamp20("fecha_ingreso").notNull().defaultNow(),
      fechaSalida: timestamp20("fecha_salida"),
      // null = firma actual
      motivoSalida: varchar27("motivo_salida", { length: 255 }),
      estado: varchar27("estado", { length: 20 }).notNull().default("activo"),
      // "activo" | "retirado" | "suspendido" | "transferido"
      /** Rol personalizado asignado por el bufete. NULL = usa el rol global del usuario */
      firmRolId: int17("firm_rol_id"),
      createdBy: varchar27("created_by", { length: 36 }),
      notas: text16("notas"),
      createdAt: timestamp20("created_at").notNull().defaultNow()
    });
    lawyerFirmaHistoryRelations = relations20(lawyerFirmaHistory, ({ one }) => ({
      lawyer: one(lawyerProfiles, {
        fields: [lawyerFirmaHistory.lawyerId],
        references: [lawyerProfiles.id]
      }),
      firma: one(firmProfiles, {
        fields: [lawyerFirmaHistory.firmaId],
        references: [firmProfiles.id]
      }),
      firmRol: one(roles, {
        fields: [lawyerFirmaHistory.firmRolId],
        references: [roles.id]
      }),
      creadoPor: one(users, {
        fields: [lawyerFirmaHistory.createdBy],
        references: [users.id]
      })
    }));
  }
});

// shared/schema/firm-invitation.schema.ts
import { mysqlTable as mysqlTable29, varchar as varchar28, timestamp as timestamp21, mysqlEnum as mysqlEnum4, text as text17 } from "drizzle-orm/mysql-core";
import { relations as relations21 } from "drizzle-orm";
var firmInvitations, firmInvitationsRelations;
var init_firm_invitation_schema = __esm({
  "shared/schema/firm-invitation.schema.ts"() {
    "use strict";
    init_firm_profile_schema();
    init_lawyer_profile_schema();
    init_user_schema();
    firmInvitations = mysqlTable29("firm_invitations", {
      id: varchar28("id", { length: 36 }).primaryKey(),
      firmId: varchar28("firm_id", { length: 36 }).notNull(),
      lawyerId: varchar28("lawyer_id", { length: 36 }).notNull(),
      invitadoPor: varchar28("invitado_por", { length: 36 }).notNull(),
      // FK users
      status: mysqlEnum4("status", [
        "pendiente",
        "aceptada",
        "rechazada",
        "cancelada"
      ]).notNull().default("pendiente"),
      mensaje: text17("mensaje"),
      // mensaje opcional de la firma
      motivoRechazo: text17("motivo_rechazo"),
      // si el abogado rechaza
      expiresAt: timestamp21("expires_at"),
      // expiración de la invitación
      respondedAt: timestamp21("responded_at"),
      createdAt: timestamp21("created_at").notNull().defaultNow(),
      updatedAt: timestamp21("updated_at").notNull().defaultNow().onUpdateNow()
    });
    firmInvitationsRelations = relations21(firmInvitations, ({ one }) => ({
      firm: one(firmProfiles, {
        fields: [firmInvitations.firmId],
        references: [firmProfiles.id]
      }),
      lawyer: one(lawyerProfiles, {
        fields: [firmInvitations.lawyerId],
        references: [lawyerProfiles.id]
      }),
      invitadoPorUser: one(users, {
        fields: [firmInvitations.invitadoPor],
        references: [users.id]
      })
    }));
  }
});

// shared/schema/notificacion.schema.ts
import { mysqlTable as mysqlTable30, varchar as varchar29, text as text18, boolean as boolean16, timestamp as timestamp22, int as int18 } from "drizzle-orm/mysql-core";
var notificaciones;
var init_notificacion_schema = __esm({
  "shared/schema/notificacion.schema.ts"() {
    "use strict";
    notificaciones = mysqlTable30("notificaciones", {
      id: int18("id").autoincrement().primaryKey(),
      procesoId: varchar29("proceso_id", { length: 36 }).notNull(),
      /** Target client — nullable when notification targets a lawyer or firm only */
      clienteId: varchar29("cliente_id", { length: 36 }),
      /** Target lawyer — nullable when notification targets a client or firm only */
      lawyerId: varchar29("lawyer_id", { length: 36 }),
      /** Target firm — nullable when notification targets a client or lawyer only */
      firmId: varchar29("firm_id", { length: 36 }),
      titulo: varchar29("titulo", { length: 255 }).notNull(),
      mensaje: text18("mensaje").notNull(),
      tipo: varchar29("tipo", { length: 50 }).notNull().default("estado_cambio"),
      leidoCliente: boolean16("leido_cliente").notNull().default(false),
      leidoLawyer: boolean16("leido_lawyer").notNull().default(false),
      leidoFirma: boolean16("leido_firma").notNull().default(false),
      createdAt: timestamp22("created_at").notNull().default(/* @__PURE__ */ new Date()),
      updatedAt: timestamp22("updated_at").notNull().default(/* @__PURE__ */ new Date()).onUpdateNow()
    });
  }
});

// shared/schema/chat.schema.ts
import { relations as relations22 } from "drizzle-orm";
import {
  mysqlTable as mysqlTable31,
  varchar as varchar30,
  text as text19,
  int as int19,
  timestamp as timestamp23,
  boolean as boolean17,
  mysqlEnum as mysqlEnum5
} from "drizzle-orm/mysql-core";
var conversations, conversationParticipants, messages, conversationsRelations, conversationParticipantsRelations, messagesRelations;
var init_chat_schema = __esm({
  "shared/schema/chat.schema.ts"() {
    "use strict";
    init_user_schema();
    conversations = mysqlTable31("conversations", {
      id: varchar30("id", { length: 36 }).primaryKey(),
      /** Human-readable name, optional (e.g. group chats in the future) */
      name: varchar30("name", { length: 200 }),
      /** Who triggered this conversation: firm_lawyer | lawyer_client | community | direct | admin_support */
      type: mysqlEnum5("type", ["firm_lawyer", "lawyer_client", "community", "direct", "admin_support"]).notNull(),
      /** Set when type === "community" — links the conversation to its originating post */
      sourcePostId: varchar30("source_post_id", { length: 36 }),
      createdAt: timestamp23("created_at").notNull().defaultNow(),
      updatedAt: timestamp23("updated_at").notNull().defaultNow().onUpdateNow()
    });
    conversationParticipants = mysqlTable31(
      "conversation_participants",
      {
        id: varchar30("id", { length: 36 }).primaryKey(),
        conversationId: varchar30("conversation_id", { length: 36 }).notNull(),
        userId: varchar30("user_id", { length: 36 }).notNull(),
        /** Last time the user read this conversation */
        lastReadAt: timestamp23("last_read_at"),
        joinedAt: timestamp23("joined_at").notNull().defaultNow()
      }
    );
    messages = mysqlTable31("messages", {
      id: varchar30("id", { length: 36 }).primaryKey(),
      conversationId: varchar30("conversation_id", { length: 36 }).notNull(),
      senderId: varchar30("sender_id", { length: 36 }).notNull(),
      /** Null for file-type messages */
      content: text19("content"),
      type: mysqlEnum5("type", ["text", "file"]).notNull().default("text"),
      /** Soft-delete flag */
      isDeleted: boolean17("is_deleted").notNull().default(false),
      createdAt: timestamp23("created_at").notNull().defaultNow(),
      // ── File attachment fields ──────────────────────────────────
      /** Internal S3 key — NEVER exposed to the frontend */
      fileKey: varchar30("file_key", { length: 500 }),
      /** Original filename shown to the user */
      fileName: varchar30("file_name", { length: 255 }),
      /** File size in bytes */
      fileSize: int19("file_size"),
      /** MIME type (e.g. image/png, application/pdf) */
      fileMime: varchar30("file_mime", { length: 100 }),
      /** SHA-256 hex digest of the file buffer — for audit only */
      fileHash: varchar30("file_hash", { length: 64 })
    });
    conversationsRelations = relations22(
      conversations,
      ({ many }) => ({
        participants: many(conversationParticipants),
        messages: many(messages)
      })
    );
    conversationParticipantsRelations = relations22(
      conversationParticipants,
      ({ one }) => ({
        conversation: one(conversations, {
          fields: [conversationParticipants.conversationId],
          references: [conversations.id]
        }),
        user: one(users, {
          fields: [conversationParticipants.userId],
          references: [users.id]
        })
      })
    );
    messagesRelations = relations22(messages, ({ one }) => ({
      conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id]
      }),
      sender: one(users, {
        fields: [messages.senderId],
        references: [users.id]
      })
    }));
  }
});

// shared/schema/session.schema.ts
import { mysqlTable as mysqlTable32, varchar as varchar31, timestamp as timestamp24 } from "drizzle-orm/mysql-core";
import { relations as relations23 } from "drizzle-orm";
var sessions, sessionsRelations;
var init_session_schema = __esm({
  "shared/schema/session.schema.ts"() {
    "use strict";
    init_user_schema();
    sessions = mysqlTable32("sessions", {
      /** JWT ID (jti claim) - used as primary key to look up / revoke tokens */
      id: varchar31("id", { length: 36 }).primaryKey(),
      userId: varchar31("user_id", { length: 36 }).notNull(),
      expiresAt: timestamp24("expires_at").notNull(),
      revokedAt: timestamp24("revoked_at"),
      ipAddress: varchar31("ip_address", { length: 45 }),
      userAgent: varchar31("user_agent", { length: 500 }),
      deviceId: varchar31("device_id", { length: 191 }),
      createdAt: timestamp24("created_at").notNull().defaultNow(),
      /** Opaque refresh token - used to issue a new access token without re-login */
      refreshToken: varchar31("refresh_token", { length: 64 }).unique(),
      refreshExpiresAt: timestamp24("refresh_expires_at")
    });
    sessionsRelations = relations23(sessions, ({ one }) => ({
      user: one(users, {
        fields: [sessions.userId],
        references: [users.id]
      })
    }));
  }
});

// shared/schema/user-device.schema.ts
import { relations as relations24 } from "drizzle-orm";
import { index, mysqlTable as mysqlTable33, timestamp as timestamp25, uniqueIndex as uniqueIndex5, varchar as varchar32 } from "drizzle-orm/mysql-core";
var userDevices, userDevicesRelations;
var init_user_device_schema = __esm({
  "shared/schema/user-device.schema.ts"() {
    "use strict";
    init_user_schema();
    userDevices = mysqlTable33("user_devices", {
      id: varchar32("id", { length: 36 }).primaryKey(),
      userId: varchar32("user_id", { length: 36 }).notNull(),
      deviceId: varchar32("device_id", { length: 191 }).notNull(),
      deviceName: varchar32("device_name", { length: 120 }),
      platform: varchar32("platform", { length: 30 }),
      userAgent: varchar32("user_agent", { length: 500 }),
      lastIp: varchar32("last_ip", { length: 45 }),
      firstSeenAt: timestamp25("first_seen_at").notNull().defaultNow(),
      lastSeenAt: timestamp25("last_seen_at").notNull().defaultNow(),
      trustedAt: timestamp25("trusted_at").notNull().defaultNow(),
      revokedAt: timestamp25("revoked_at"),
      createdAt: timestamp25("created_at").notNull().defaultNow(),
      updatedAt: timestamp25("updated_at").notNull().defaultNow().onUpdateNow()
    }, (table) => ({
      userDeviceUnique: uniqueIndex5("user_devices_user_device_unique").on(table.userId, table.deviceId),
      userLastSeenIdx: index("user_devices_user_last_seen_idx").on(table.userId, table.lastSeenAt)
    }));
    userDevicesRelations = relations24(userDevices, ({ one }) => ({
      user: one(users, {
        fields: [userDevices.userId],
        references: [users.id]
      })
    }));
  }
});

// shared/schema/user-two-factor.schema.ts
import { relations as relations25 } from "drizzle-orm";
import { mysqlTable as mysqlTable34, text as text20, timestamp as timestamp26, varchar as varchar33 } from "drizzle-orm/mysql-core";
var userTwoFactor, userTwoFactorRelations;
var init_user_two_factor_schema = __esm({
  "shared/schema/user-two-factor.schema.ts"() {
    "use strict";
    init_user_schema();
    userTwoFactor = mysqlTable34("user_two_factor", {
      userId: varchar33("user_id", { length: 36 }).primaryKey(),
      secret: varchar33("secret", { length: 128 }).notNull(),
      recoveryCodes: text20("recovery_codes"),
      enabledAt: timestamp26("enabled_at"),
      createdAt: timestamp26("created_at").notNull().defaultNow(),
      updatedAt: timestamp26("updated_at").notNull().defaultNow().onUpdateNow()
    });
    userTwoFactorRelations = relations25(userTwoFactor, ({ one }) => ({
      user: one(users, {
        fields: [userTwoFactor.userId],
        references: [users.id]
      })
    }));
  }
});

// shared/schema/auth-challenge.schema.ts
import { relations as relations26 } from "drizzle-orm";
import { index as index2, mysqlTable as mysqlTable35, timestamp as timestamp27, varchar as varchar34 } from "drizzle-orm/mysql-core";
var authChallenges, authChallengesRelations;
var init_auth_challenge_schema = __esm({
  "shared/schema/auth-challenge.schema.ts"() {
    "use strict";
    init_user_schema();
    authChallenges = mysqlTable35("auth_challenges", {
      id: varchar34("id", { length: 36 }).primaryKey(),
      userId: varchar34("user_id", { length: 36 }).notNull(),
      challengeType: varchar34("challenge_type", { length: 30 }).notNull(),
      deviceId: varchar34("device_id", { length: 191 }),
      ipAddress: varchar34("ip_address", { length: 45 }),
      userAgent: varchar34("user_agent", { length: 500 }),
      expiresAt: timestamp27("expires_at").notNull(),
      completedAt: timestamp27("completed_at"),
      createdAt: timestamp27("created_at").notNull().defaultNow()
    }, (table) => ({
      userTypeIdx: index2("auth_challenges_user_type_idx").on(table.userId, table.challengeType)
    }));
    authChallengesRelations = relations26(authChallenges, ({ one }) => ({
      user: one(users, {
        fields: [authChallenges.userId],
        references: [users.id]
      })
    }));
  }
});

// shared/schema/tarea.schema.ts
import { relations as relations27 } from "drizzle-orm";
import {
  mysqlTable as mysqlTable36,
  varchar as varchar35,
  text as text21,
  mysqlEnum as mysqlEnum6,
  int as int20,
  decimal as decimal2,
  date,
  timestamp as timestamp28,
  boolean as boolean18,
  tinyint as tinyint2
} from "drizzle-orm/mysql-core";
var tareas, tareasRelations;
var init_tarea_schema = __esm({
  "shared/schema/tarea.schema.ts"() {
    "use strict";
    init_proceso_schema();
    init_lawyer_profile_schema();
    tareas = mysqlTable36("tareas", {
      id: varchar35("id", { length: 36 }).primaryKey(),
      procesoId: varchar35("proceso_id", { length: 36 }).notNull(),
      legalStage: varchar35("legal_stage", { length: 50 }),
      requerida: tinyint2("requerida").notNull().default(0),
      titulo: varchar35("titulo", { length: 255 }).notNull(),
      descripcion: text21("descripcion"),
      estado: mysqlEnum6("estado", ["pendiente", "en_progreso", "completada", "cancelada"]).notNull().default("pendiente"),
      prioridad: mysqlEnum6("prioridad", ["baja", "media", "alta", "urgente"]).notNull().default("media"),
      fechaLimite: date("fecha_limite", { mode: "date" }),
      fechaCompletada: timestamp28("fecha_completada"),
      /** FK al perfil del abogado asignado (puede ser null) */
      asignadoA: varchar35("asignado_a", { length: 36 }),
      /** Nombre desnormalizado para evitar joins en listados */
      asignadoANombre: varchar35("asignado_a_nombre", { length: 255 }),
      /** FK al perfil del abogado que creó la tarea */
      creadoPor: varchar35("creado_por", { length: 36 }).notNull(),
      /** Nombre desnormalizado */
      creadoPorNombre: varchar35("creado_por_nombre", { length: 255 }),
      /** Tiempo estimado para completar la tarea */
      tiempoEstimado: decimal2("tiempo_estimado", { precision: 6, scale: 1 }),
      tiempoUnidad: mysqlEnum6("tiempo_unidad", ["minutos", "horas", "dias", "semanas"]),
      /** Posición para drag & drop futuro */
      orden: int20("orden").notNull().default(0),
      state: boolean18("state").notNull().default(true),
      createdAt: timestamp28("created_at").notNull().defaultNow(),
      updatedAt: timestamp28("updated_at").notNull().defaultNow().onUpdateNow()
    });
    tareasRelations = relations27(tareas, ({ one }) => ({
      proceso: one(procesos, {
        fields: [tareas.procesoId],
        references: [procesos.id]
      }),
      asignado: one(lawyerProfiles, {
        fields: [tareas.asignadoA],
        references: [lawyerProfiles.id],
        relationName: "tareas_asignado"
      }),
      creador: one(lawyerProfiles, {
        fields: [tareas.creadoPor],
        references: [lawyerProfiles.id],
        relationName: "tareas_creador"
      })
    }));
  }
});

// shared/schema/community.schema.ts
import { relations as relations28 } from "drizzle-orm";
import {
  mysqlTable as mysqlTable37,
  varchar as varchar36,
  text as text22,
  int as int21,
  tinyint as tinyint3,
  boolean as boolean19,
  timestamp as timestamp29,
  mysqlEnum as mysqlEnum7,
  index as index3,
  primaryKey
} from "drizzle-orm/mysql-core";
var posts, comments, postLikes, postBookmarks, tags, postTags, postViews, postReports, postsRelations, commentsRelations, postTagsRelations;
var init_community_schema = __esm({
  "shared/schema/community.schema.ts"() {
    "use strict";
    init_user_schema();
    posts = mysqlTable37(
      "posts",
      {
        id: varchar36("id", { length: 36 }).primaryKey(),
        userId: varchar36("user_id", { length: 36 }).notNull(),
        title: varchar36("title", { length: 255 }).notNull(),
        content: text22("content").notNull(),
        visibility: mysqlEnum7("visibility", ["public", "anonymous"]).notNull().default("public"),
        caseType: varchar36("case_type", { length: 50 }),
        isUrgent: tinyint3("is_urgent").notNull().default(0),
        city: varchar36("city", { length: 100 }),
        viewCount: int21("view_count").notNull().default(0),
        status: mysqlEnum7("status", ["open", "in_progress", "closed"]).notNull().default("open"),
        disabled: boolean19("disabled").notNull().default(false),
        takenByLawyerId: varchar36("taken_by_lawyer_id", { length: 36 }),
        takenByUserId: varchar36("taken_by_user_id", { length: 36 }),
        takenAt: timestamp29("taken_at"),
        takenExpiresAt: timestamp29("taken_expires_at"),
        clientAccepted: tinyint3("client_accepted"),
        procesoId: varchar36("proceso_id", { length: 36 }),
        createdAt: timestamp29("created_at").notNull().defaultNow(),
        updatedAt: timestamp29("updated_at").notNull().defaultNow().onUpdateNow()
      },
      (t) => [index3("idx_posts_user").on(t.userId), index3("idx_posts_created").on(t.createdAt), index3("idx_posts_status").on(t.status)]
    );
    comments = mysqlTable37(
      "comments",
      {
        id: varchar36("id", { length: 36 }).primaryKey(),
        postId: varchar36("post_id", { length: 36 }).notNull(),
        userId: varchar36("user_id", { length: 36 }).notNull(),
        content: text22("content").notNull(),
        parentId: varchar36("parent_id", { length: 36 }),
        createdAt: timestamp29("created_at").notNull().defaultNow(),
        updatedAt: timestamp29("updated_at").notNull().defaultNow().onUpdateNow()
      },
      (t) => [
        index3("idx_comments_post").on(t.postId),
        index3("idx_comments_parent").on(t.parentId)
      ]
    );
    postLikes = mysqlTable37(
      "post_likes",
      {
        id: varchar36("id", { length: 36 }).primaryKey(),
        postId: varchar36("post_id", { length: 36 }).notNull(),
        userId: varchar36("user_id", { length: 36 }).notNull(),
        createdAt: timestamp29("created_at").notNull().defaultNow()
      },
      (t) => [index3("idx_likes_post").on(t.postId)]
    );
    postBookmarks = mysqlTable37(
      "post_bookmarks",
      {
        id: varchar36("id", { length: 36 }).primaryKey(),
        postId: varchar36("post_id", { length: 36 }).notNull(),
        userId: varchar36("user_id", { length: 36 }).notNull(),
        createdAt: timestamp29("created_at").notNull().defaultNow()
      },
      (t) => [index3("idx_bookmarks_user").on(t.userId)]
    );
    tags = mysqlTable37("tags", {
      id: varchar36("id", { length: 36 }).primaryKey(),
      name: varchar36("name", { length: 50 }).notNull(),
      slug: varchar36("slug", { length: 50 }).notNull()
    });
    postTags = mysqlTable37(
      "post_tags",
      {
        postId: varchar36("post_id", { length: 36 }).notNull(),
        tagId: varchar36("tag_id", { length: 36 }).notNull()
      },
      (t) => [primaryKey({ columns: [t.postId, t.tagId] })]
    );
    postViews = mysqlTable37(
      "post_views",
      {
        postId: varchar36("post_id", { length: 36 }).notNull(),
        userId: varchar36("user_id", { length: 36 }).notNull(),
        viewedAt: timestamp29("viewed_at").notNull().defaultNow()
      },
      (t) => [primaryKey({ columns: [t.postId, t.userId] })]
    );
    postReports = mysqlTable37(
      "post_reports",
      {
        id: varchar36("id", { length: 36 }).primaryKey(),
        postId: varchar36("post_id", { length: 36 }),
        commentId: varchar36("comment_id", { length: 36 }),
        reporterUserId: varchar36("reporter_user_id", { length: 36 }).notNull(),
        reason: varchar36("reason", { length: 50 }).notNull(),
        detail: text22("detail"),
        createdAt: timestamp29("created_at").notNull().defaultNow()
      },
      (t) => [
        index3("idx_reports_post").on(t.postId),
        index3("idx_reports_comment").on(t.commentId)
      ]
    );
    postsRelations = relations28(posts, ({ one, many }) => ({
      author: one(users, { fields: [posts.userId], references: [users.id] }),
      comments: many(comments),
      likes: many(postLikes),
      bookmarks: many(postBookmarks),
      postTags: many(postTags)
    }));
    commentsRelations = relations28(comments, ({ one, many }) => ({
      post: one(posts, { fields: [comments.postId], references: [posts.id] }),
      author: one(users, { fields: [comments.userId], references: [users.id] }),
      parent: one(comments, { fields: [comments.parentId], references: [comments.id], relationName: "replies" }),
      replies: many(comments, { relationName: "replies" })
    }));
    postTagsRelations = relations28(postTags, ({ one }) => ({
      post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
      tag: one(tags, { fields: [postTags.tagId], references: [tags.id] })
    }));
  }
});

// shared/schema/rating.schema.ts
import { mysqlTable as mysqlTable38, varchar as varchar37, text as text23, timestamp as timestamp30, mysqlEnum as mysqlEnum8, int as int22, index as index4 } from "drizzle-orm/mysql-core";
var ratings;
var init_rating_schema = __esm({
  "shared/schema/rating.schema.ts"() {
    "use strict";
    ratings = mysqlTable38(
      "ratings",
      {
        id: varchar37("id", { length: 36 }).primaryKey(),
        fromUserId: varchar37("from_user_id", { length: 36 }).notNull(),
        targetUserId: varchar37("target_user_id", { length: 36 }).notNull(),
        targetType: mysqlEnum8("target_type", ["lawyer", "firm"]).notNull(),
        score: int22("score").notNull(),
        comment: text23("comment"),
        procesoId: varchar37("proceso_id", { length: 36 }).notNull(),
        createdAt: timestamp30("created_at").notNull().defaultNow()
      },
      (table) => [
        index4("idx_ratings_target").on(table.targetUserId, table.targetType),
        index4("idx_ratings_from").on(table.fromUserId)
      ]
    );
  }
});

// shared/schema/client-request.schema.ts
import { mysqlTable as mysqlTable39, varchar as varchar38, mysqlEnum as mysqlEnum9, timestamp as timestamp31 } from "drizzle-orm/mysql-core";
var clientRequests;
var init_client_request_schema = __esm({
  "shared/schema/client-request.schema.ts"() {
    "use strict";
    clientRequests = mysqlTable39("client_requests", {
      id: varchar38("id", { length: 36 }).primaryKey(),
      fromUserId: varchar38("from_user_id", { length: 36 }).notNull(),
      toUserId: varchar38("to_user_id", { length: 36 }).notNull(),
      status: mysqlEnum9("status", ["pending", "accepted", "rejected", "expired"]).notNull().default("pending"),
      createdAt: timestamp31("created_at").defaultNow().notNull(),
      expiresAt: timestamp31("expires_at").notNull(),
      respondedAt: timestamp31("responded_at")
    });
  }
});

// shared/schema/app-notification.schema.ts
import { mysqlTable as mysqlTable40, varchar as varchar39, text as text24, timestamp as timestamp32, json } from "drizzle-orm/mysql-core";
var appNotifications;
var init_app_notification_schema = __esm({
  "shared/schema/app-notification.schema.ts"() {
    "use strict";
    appNotifications = mysqlTable40("app_notifications", {
      id: varchar39("id", { length: 36 }).primaryKey(),
      userId: varchar39("user_id", { length: 36 }).notNull(),
      type: varchar39("type", { length: 50 }).notNull().default("info"),
      title: varchar39("title", { length: 255 }).notNull(),
      body: text24("body").notNull(),
      data: json("data"),
      readAt: timestamp32("read_at"),
      createdAt: timestamp32("created_at").defaultNow().notNull()
    });
  }
});

// shared/schema/firm-clients.schema.ts
import { mysqlTable as mysqlTable41, varchar as varchar40, mysqlEnum as mysqlEnum10, timestamp as timestamp33 } from "drizzle-orm/mysql-core";
var firmClients;
var init_firm_clients_schema = __esm({
  "shared/schema/firm-clients.schema.ts"() {
    "use strict";
    firmClients = mysqlTable41("firm_clients", {
      id: varchar40("id", { length: 36 }).primaryKey(),
      firmId: varchar40("firm_id", { length: 36 }).notNull(),
      clientId: varchar40("client_id", { length: 36 }).notNull(),
      status: mysqlEnum10("status", ["active", "inactive"]).notNull().default("active"),
      createdAt: timestamp33("created_at").defaultNow().notNull()
    });
  }
});

// shared/schema/otp.schema.ts
import { mysqlTable as mysqlTable42, varchar as varchar41, boolean as boolean20, timestamp as timestamp34, int as int23 } from "drizzle-orm/mysql-core";
var passwordResetOtps, emailVerificationOtps;
var init_otp_schema = __esm({
  "shared/schema/otp.schema.ts"() {
    "use strict";
    passwordResetOtps = mysqlTable42("password_reset_otps", {
      id: varchar41("id", { length: 36 }).primaryKey(),
      userId: varchar41("user_id", { length: 36 }).notNull(),
      code: varchar41("code", { length: 6 }).notNull(),
      expiresAt: timestamp34("expires_at").notNull(),
      isUsed: boolean20("is_used").notNull().default(false),
      attempts: int23("attempts").notNull().default(0),
      createdAt: timestamp34("created_at").notNull().defaultNow()
    });
    emailVerificationOtps = mysqlTable42("email_verification_otps", {
      id: varchar41("id", { length: 36 }).primaryKey(),
      userId: varchar41("user_id", { length: 36 }).notNull(),
      code: varchar41("code", { length: 6 }).notNull(),
      expiresAt: timestamp34("expires_at").notNull(),
      isUsed: boolean20("is_used").notNull().default(false),
      attempts: int23("attempts").notNull().default(0),
      createdAt: timestamp34("created_at").notNull().defaultNow()
    });
  }
});

// shared/schema/security-audit.schema.ts
import { mysqlTable as mysqlTable43, varchar as varchar42, boolean as boolean21, timestamp as timestamp35, text as text25 } from "drizzle-orm/mysql-core";
var securityEvents;
var init_security_audit_schema = __esm({
  "shared/schema/security-audit.schema.ts"() {
    "use strict";
    securityEvents = mysqlTable43("security_events", {
      id: varchar42("id", { length: 36 }).primaryKey(),
      email: varchar42("email", { length: 255 }).notNull(),
      ip: varchar42("ip", { length: 45 }).notNull(),
      userAgent: varchar42("user_agent", { length: 500 }),
      eventType: varchar42("event_type", { length: 32 }).notNull(),
      // SecurityEventType
      success: boolean21("success").notNull().default(false),
      metadata: text25("metadata"),
      // JSON string for extra context
      createdAt: timestamp35("created_at").notNull().defaultNow()
    });
  }
});

// shared/schema/community-match.schema.ts
import { mysqlTable as mysqlTable44, varchar as varchar43, tinyint as tinyint4, timestamp as timestamp36, index as index5, uniqueIndex as uniqueIndex6 } from "drizzle-orm/mysql-core";
var communityPostMatches;
var init_community_match_schema = __esm({
  "shared/schema/community-match.schema.ts"() {
    "use strict";
    communityPostMatches = mysqlTable44(
      "community_post_matches",
      {
        id: varchar43("id", { length: 36 }).primaryKey(),
        postId: varchar43("post_id", { length: 36 }).notNull(),
        lawyerId: varchar43("lawyer_id", { length: 36 }).notNull(),
        // lawyer_profiles.id
        score: tinyint4("score").notNull().default(0),
        // 1–10
        notified: tinyint4("notified").notNull().default(0),
        // 1 = sent
        seen: tinyint4("seen").notNull().default(0),
        // 1 = opened
        createdAt: timestamp36("created_at").notNull().defaultNow()
      },
      (t) => [
        uniqueIndex6("uq_post_lawyer").on(t.postId, t.lawyerId),
        index5("idx_match_lawyer").on(t.lawyerId),
        index5("idx_match_post").on(t.postId)
      ]
    );
  }
});

// shared/schema/legal-stage.schema.ts
import { mysqlTable as mysqlTable45, varchar as varchar44, int as int24, tinyint as tinyint5, timestamp as timestamp37 } from "drizzle-orm/mysql-core";
import { relations as relations29 } from "drizzle-orm";
var LEGAL_STAGE_CODES, etapasPorTipoProceso, etapasPorTipoProcesoRelations;
var init_legal_stage_schema = __esm({
  "shared/schema/legal-stage.schema.ts"() {
    "use strict";
    init_tipo_proceso_schema();
    LEGAL_STAGE_CODES = [
      "PREPROCESS",
      // Etapa preprocesal
      "FILED",
      // Demanda presentada
      "ADMITTED",
      // Demanda admitida
      "NOTIFIED",
      // Demandado notificado
      "ANSWERED",
      // Contestación de demanda
      "EVIDENCE",
      // Etapa probatoria
      "HEARING",
      // Audiencias
      "CLOSING_ARGUMENTS",
      // Alegatos finales
      "JUDGMENT",
      // Sentencia
      "APPEAL",
      // Apelación (puede reabrir flujo)
      "ENFORCEMENT"
      // Ejecución de sentencia
    ];
    etapasPorTipoProceso = mysqlTable45("etapas_por_tipo_proceso", {
      id: int24("id").autoincrement().primaryKey(),
      tipoProcesoId: int24("tipo_proceso_id"),
      // NULL = aplica a todos
      codigo: varchar44("codigo", { length: 50 }).notNull(),
      nombre: varchar44("nombre", { length: 100 }).notNull(),
      descripcion: varchar44("descripcion", { length: 255 }),
      orden: int24("orden").notNull().default(0),
      diasLegales: int24("dias_legales").notNull().default(0),
      // días hábiles del término
      color: varchar44("color", { length: 20 }).notNull().default("#6B7280"),
      activo: tinyint5("activo").notNull().default(1),
      createdAt: timestamp37("created_at").notNull().defaultNow()
    });
    etapasPorTipoProcesoRelations = relations29(etapasPorTipoProceso, ({ one }) => ({
      tipoProceso: one(tiposProceso, {
        fields: [etapasPorTipoProceso.tipoProcesoId],
        references: [tiposProceso.id]
      })
    }));
  }
});

// shared/schema/calendar-event.schema.ts
import { relations as relations30 } from "drizzle-orm";
import {
  mysqlTable as mysqlTable46,
  varchar as varchar45,
  text as text26,
  mysqlEnum as mysqlEnum11,
  int as int25,
  tinyint as tinyint6,
  datetime as datetime3,
  timestamp as timestamp38
} from "drizzle-orm/mysql-core";
var REMINDER_OPTIONS, calendarEvents, calendarEventsRelations;
var init_calendar_event_schema = __esm({
  "shared/schema/calendar-event.schema.ts"() {
    "use strict";
    init_lawyer_profile_schema();
    init_proceso_schema();
    REMINDER_OPTIONS = {
      EN_EL_MOMENTO: 0,
      QUINCE_MINUTOS: 15,
      UNA_HORA: 60,
      TRES_HORAS: 180,
      UN_DIA: 1440,
      TRES_DIAS: 4320
    };
    calendarEvents = mysqlTable46("calendar_events", {
      id: varchar45("id", { length: 36 }).primaryKey(),
      lawyerId: varchar45("lawyer_id", { length: 36 }).notNull(),
      procesoId: varchar45("proceso_id", { length: 36 }),
      titulo: varchar45("titulo", { length: 255 }).notNull(),
      descripcion: text26("descripcion"),
      tipo: mysqlEnum11("tipo", [
        "audiencia",
        "reunion_cliente",
        "diligencia",
        "vencimiento",
        "otro"
      ]).notNull().default("otro"),
      fechaInicio: datetime3("fecha_inicio").notNull(),
      fechaFin: datetime3("fecha_fin"),
      // null = sin duración definida
      recordatorioMinutos: int25("recordatorio_minutos").notNull().default(1440),
      notificado: tinyint6("notificado").notNull().default(0),
      state: tinyint6("state").notNull().default(1),
      createdAt: timestamp38("created_at").notNull().defaultNow(),
      updatedAt: timestamp38("updated_at").notNull().defaultNow().onUpdateNow()
    });
    calendarEventsRelations = relations30(calendarEvents, ({ one }) => ({
      lawyer: one(lawyerProfiles, {
        fields: [calendarEvents.lawyerId],
        references: [lawyerProfiles.id]
      }),
      proceso: one(procesos, {
        fields: [calendarEvents.procesoId],
        references: [procesos.id]
      })
    }));
  }
});

// shared/schema/stage-task-template.schema.ts
import { mysqlTable as mysqlTable47, int as int26, varchar as varchar46, text as text27, mysqlEnum as mysqlEnum12, tinyint as tinyint7, timestamp as timestamp39 } from "drizzle-orm/mysql-core";
import { relations as relations31 } from "drizzle-orm";
var etapasTareasPlantilla, etapasTareasPlantillaRelations;
var init_stage_task_template_schema = __esm({
  "shared/schema/stage-task-template.schema.ts"() {
    "use strict";
    init_tipo_proceso_schema();
    etapasTareasPlantilla = mysqlTable47("etapa_tareas_plantilla", {
      id: int26("id").autoincrement().primaryKey(),
      tipoProcesoId: int26("tipo_proceso_id"),
      legalStageCode: varchar46("legal_stage_code", { length: 50 }).notNull(),
      titulo: varchar46("titulo", { length: 255 }).notNull(),
      descripcion: text27("descripcion"),
      prioridad: mysqlEnum12("prioridad", ["baja", "media", "alta", "urgente"]).notNull().default("media"),
      requerida: tinyint7("requerida").notNull().default(0),
      orden: int26("orden").notNull().default(0),
      activo: tinyint7("activo").notNull().default(1),
      createdAt: timestamp39("created_at").notNull().defaultNow()
    });
    etapasTareasPlantillaRelations = relations31(etapasTareasPlantilla, ({ one }) => ({
      tipoProceso: one(tiposProceso, {
        fields: [etapasTareasPlantilla.tipoProcesoId],
        references: [tiposProceso.id]
      })
    }));
  }
});

// shared/schema/stage-event.schema.ts
import { mysqlTable as mysqlTable48, varchar as varchar47, text as text28, mysqlEnum as mysqlEnum13, json as json2, timestamp as timestamp40 } from "drizzle-orm/mysql-core";
import { relations as relations32 } from "drizzle-orm";
var etapaEventos, etapaEventosRelations;
var init_stage_event_schema = __esm({
  "shared/schema/stage-event.schema.ts"() {
    "use strict";
    init_proceso_schema();
    etapaEventos = mysqlTable48("etapa_eventos", {
      id: varchar47("id", { length: 36 }).primaryKey(),
      procesoId: varchar47("proceso_id", { length: 36 }).notNull(),
      legalStageCode: varchar47("legal_stage_code", { length: 50 }).notNull(),
      tipo: mysqlEnum13("tipo", [
        "etapa_iniciada",
        "etapa_completada",
        "tarea_completada",
        "documento_subido",
        "nota"
      ]).notNull(),
      descripcion: text28("descripcion").notNull(),
      metadatos: json2("metadatos"),
      creadoPor: varchar47("creado_por", { length: 36 }),
      createdAt: timestamp40("created_at").notNull().defaultNow()
    });
    etapaEventosRelations = relations32(etapaEventos, ({ one }) => ({
      proceso: one(procesos, {
        fields: [etapaEventos.procesoId],
        references: [procesos.id]
      })
    }));
  }
});

// shared/schema/tarea-observacion.schema.ts
import { mysqlTable as mysqlTable49, varchar as varchar48, text as text29, timestamp as timestamp41 } from "drizzle-orm/mysql-core";
import { relations as relations33 } from "drizzle-orm";
var tareaObservaciones, tareaObservacionesRelations;
var init_tarea_observacion_schema = __esm({
  "shared/schema/tarea-observacion.schema.ts"() {
    "use strict";
    init_tarea_schema();
    tareaObservaciones = mysqlTable49("tarea_observaciones", {
      id: varchar48("id", { length: 36 }).primaryKey(),
      tareaId: varchar48("tarea_id", { length: 36 }).notNull(),
      autorId: varchar48("autor_id", { length: 36 }).notNull(),
      autorNombre: varchar48("autor_nombre", { length: 255 }),
      contenido: text29("contenido").notNull(),
      createdAt: timestamp41("created_at").notNull().defaultNow()
    });
    tareaObservacionesRelations = relations33(tareaObservaciones, ({ one }) => ({
      tarea: one(tareas, {
        fields: [tareaObservaciones.tareaId],
        references: [tareas.id]
      })
    }));
  }
});

// shared/schema/tarea-subtarea.schema.ts
import { mysqlTable as mysqlTable50, varchar as varchar49, text as text30, mysqlEnum as mysqlEnum14, decimal as decimal3, int as int27, timestamp as timestamp42 } from "drizzle-orm/mysql-core";
import { relations as relations34 } from "drizzle-orm";
var tareaSubtareas, tareaSubtareasRelations;
var init_tarea_subtarea_schema = __esm({
  "shared/schema/tarea-subtarea.schema.ts"() {
    "use strict";
    init_tarea_schema();
    tareaSubtareas = mysqlTable50("tarea_subtareas", {
      id: varchar49("id", { length: 36 }).primaryKey(),
      tareaId: varchar49("tarea_id", { length: 36 }).notNull(),
      titulo: varchar49("titulo", { length: 255 }).notNull(),
      descripcion: text30("descripcion"),
      estado: mysqlEnum14("estado", ["pendiente", "completada"]).notNull().default("pendiente"),
      tiempoEstimado: decimal3("tiempo_estimado", { precision: 6, scale: 1 }),
      tiempoUnidad: mysqlEnum14("tiempo_unidad", ["minutos", "horas", "dias", "semanas"]),
      completadaEn: timestamp42("completada_en"),
      completadaPorId: varchar49("completada_por_id", { length: 36 }),
      creadoPorId: varchar49("creado_por_id", { length: 36 }).notNull(),
      creadoPorNombre: varchar49("creado_por_nombre", { length: 255 }),
      orden: int27("orden").notNull().default(0),
      createdAt: timestamp42("created_at").notNull().defaultNow(),
      updatedAt: timestamp42("updated_at").notNull().defaultNow().onUpdateNow()
    });
    tareaSubtareasRelations = relations34(tareaSubtareas, ({ one }) => ({
      tarea: one(tareas, {
        fields: [tareaSubtareas.tareaId],
        references: [tareas.id]
      })
    }));
  }
});

// shared/schema/tarea-historial.schema.ts
import { mysqlTable as mysqlTable51, varchar as varchar50, text as text31, timestamp as timestamp43 } from "drizzle-orm/mysql-core";
import { relations as relations35 } from "drizzle-orm";
var tareaHistorial, tareaHistorialRelations;
var init_tarea_historial_schema = __esm({
  "shared/schema/tarea-historial.schema.ts"() {
    "use strict";
    init_tarea_schema();
    tareaHistorial = mysqlTable51("tarea_historial", {
      id: varchar50("id", { length: 36 }).primaryKey(),
      tareaId: varchar50("tarea_id", { length: 36 }).notNull(),
      usuarioId: varchar50("usuario_id", { length: 36 }).notNull(),
      usuarioNombre: varchar50("usuario_nombre", { length: 255 }),
      accion: varchar50("accion", { length: 50 }).notNull(),
      detalle: text31("detalle"),
      createdAt: timestamp43("created_at").notNull().defaultNow()
    });
    tareaHistorialRelations = relations35(tareaHistorial, ({ one }) => ({
      tarea: one(tareas, {
        fields: [tareaHistorial.tareaId],
        references: [tareas.id]
      })
    }));
  }
});

// shared/schema/tarea-archivo.schema.ts
import { mysqlTable as mysqlTable52, varchar as varchar51, int as int28, text as text32, timestamp as timestamp44 } from "drizzle-orm/mysql-core";
import { relations as relations36 } from "drizzle-orm";
var tareaArchivos, tareaArchivosRelations;
var init_tarea_archivo_schema = __esm({
  "shared/schema/tarea-archivo.schema.ts"() {
    "use strict";
    init_tarea_schema();
    tareaArchivos = mysqlTable52("tarea_archivos", {
      id: varchar51("id", { length: 36 }).primaryKey(),
      tareaId: varchar51("tarea_id", { length: 36 }).notNull(),
      nombre: varchar51("nombre", { length: 255 }).notNull(),
      url: text32("url").notNull(),
      // S3 key or local path
      mimeType: varchar51("mime_type", { length: 100 }).notNull(),
      tamano: int28("tamano").notNull().default(0),
      // bytes
      subidoPorId: varchar51("subido_por_id", { length: 36 }).notNull(),
      createdAt: timestamp44("created_at").notNull().defaultNow()
    });
    tareaArchivosRelations = relations36(tareaArchivos, ({ one }) => ({
      tarea: one(tareas, {
        fields: [tareaArchivos.tareaId],
        references: [tareas.id]
      })
    }));
  }
});

// shared/schema/proceso-ownership.schema.ts
import {
  mysqlTable as mysqlTable53,
  varchar as varchar52,
  timestamp as timestamp45,
  tinyint as tinyint8
} from "drizzle-orm/mysql-core";
import { relations as relations37 } from "drizzle-orm";
var procesoOwnership, procesoOwnershipRelations;
var init_proceso_ownership_schema = __esm({
  "shared/schema/proceso-ownership.schema.ts"() {
    "use strict";
    init_proceso_schema();
    procesoOwnership = mysqlTable53("proceso_ownership", {
      id: varchar52("id", { length: 36 }).primaryKey(),
      procesoId: varchar52("proceso_id", { length: 36 }).notNull(),
      ownerType: varchar52("owner_type", { length: 20 }).notNull().$type(),
      ownerId: varchar52("owner_id", { length: 36 }),
      // NULL when sin_owner
      fechaInicio: timestamp45("fecha_inicio").notNull().defaultNow(),
      fechaFin: timestamp45("fecha_fin"),
      activoUnique: tinyint8("activo_unique"),
      // 1 = activo, NULL = histórico
      creadoPor: varchar52("creado_por", { length: 36 }).notNull(),
      razon: varchar52("razon", { length: 500 }),
      createdAt: timestamp45("created_at").notNull().defaultNow(),
      updatedAt: timestamp45("updated_at").notNull().defaultNow().onUpdateNow()
    });
    procesoOwnershipRelations = relations37(procesoOwnership, ({ one }) => ({
      proceso: one(procesos, {
        fields: [procesoOwnership.procesoId],
        references: [procesos.id]
      })
    }));
  }
});

// shared/schema/proceso-sharing.schema.ts
import {
  mysqlTable as mysqlTable54,
  varchar as varchar53,
  timestamp as timestamp46,
  tinyint as tinyint9
} from "drizzle-orm/mysql-core";
import { relations as relations38 } from "drizzle-orm";
var PERMISSION_CEILING, procesoSharing, procesoSharingRelations;
var init_proceso_sharing_schema = __esm({
  "shared/schema/proceso-sharing.schema.ts"() {
    "use strict";
    init_proceso_schema();
    PERMISSION_CEILING = {
      bufete: ["ver", "comentar", "editar"],
      corporacion: ["ver", "comentar", "editar"],
      cliente: ["ver"]
      // Clientes: máximo 'ver'
    };
    procesoSharing = mysqlTable54("proceso_sharing", {
      id: varchar53("id", { length: 36 }).primaryKey(),
      procesoId: varchar53("proceso_id", { length: 36 }).notNull(),
      sharedWithType: varchar53("shared_with_type", { length: 20 }).notNull().$type(),
      sharedWithId: varchar53("shared_with_id", { length: 36 }).notNull(),
      permission: varchar53("permission", { length: 20 }).notNull().$type(),
      fechaInicio: timestamp46("fecha_inicio").notNull().defaultNow(),
      fechaFin: timestamp46("fecha_fin"),
      activoUnique: tinyint9("activo_unique"),
      creadoPor: varchar53("creado_por", { length: 36 }).notNull(),
      razon: varchar53("razon", { length: 500 }),
      createdAt: timestamp46("created_at").notNull().defaultNow(),
      updatedAt: timestamp46("updated_at").notNull().defaultNow().onUpdateNow()
    });
    procesoSharingRelations = relations38(procesoSharing, ({ one }) => ({
      proceso: one(procesos, {
        fields: [procesoSharing.procesoId],
        references: [procesos.id]
      })
    }));
  }
});

// shared/schema/firm-settings.schema.ts
import { mysqlTable as mysqlTable55, varchar as varchar54, boolean as boolean22, timestamp as timestamp47 } from "drizzle-orm/mysql-core";
import { relations as relations39 } from "drizzle-orm";
var firmSettings, firmSettingsRelations;
var init_firm_settings_schema = __esm({
  "shared/schema/firm-settings.schema.ts"() {
    "use strict";
    init_firm_profile_schema();
    firmSettings = mysqlTable55("firm_settings", {
      id: varchar54("id", { length: 36 }).primaryKey(),
      firmId: varchar54("firm_id", { length: 36 }).notNull().unique(),
      allowPrivateClientes: boolean22("allow_private_clientes").notNull().default(false),
      allowPrivateProcesos: boolean22("allow_private_procesos").notNull().default(false),
      defaultClienteEsCompartido: boolean22("default_cliente_es_compartido").notNull().default(true),
      defaultProcesoEsCompartido: boolean22("default_proceso_es_compartido").notNull().default(true),
      notifMensajes: boolean22("notif_mensajes").notNull().default(true),
      notifVencimientos: boolean22("notif_vencimientos").notNull().default(true),
      notifCambiosProcesos: boolean22("notif_cambios_procesos").notNull().default(true),
      notifEquipoInvitaciones: boolean22("notif_equipo_invitaciones").notNull().default(true),
      notifAlertasPlan: boolean22("notif_alertas_plan").notNull().default(true),
      notifResumenSemanal: boolean22("notif_resumen_semanal").notNull().default(false),
      createdAt: timestamp47("created_at").notNull().defaultNow(),
      updatedAt: timestamp47("updated_at").notNull().defaultNow().onUpdateNow()
    });
    firmSettingsRelations = relations39(firmSettings, ({ one }) => ({
      firm: one(firmProfiles, {
        fields: [firmSettings.firmId],
        references: [firmProfiles.id]
      })
    }));
  }
});

// shared/schema/cliente-ownership.schema.ts
import {
  mysqlTable as mysqlTable56,
  varchar as varchar55,
  timestamp as timestamp48,
  tinyint as tinyint10
} from "drizzle-orm/mysql-core";
import { relations as relations40 } from "drizzle-orm";
var clienteOwnership, clienteOwnershipRelations;
var init_cliente_ownership_schema = __esm({
  "shared/schema/cliente-ownership.schema.ts"() {
    "use strict";
    init_cliente_schema();
    clienteOwnership = mysqlTable56("cliente_ownership", {
      id: varchar55("id", { length: 36 }).primaryKey(),
      clienteId: varchar55("cliente_id", { length: 36 }).notNull(),
      ownerType: varchar55("owner_type", { length: 20 }).notNull().$type(),
      ownerId: varchar55("owner_id", { length: 36 }).notNull(),
      fechaInicio: timestamp48("fecha_inicio").notNull().defaultNow(),
      fechaFin: timestamp48("fecha_fin"),
      activoUnique: tinyint10("activo_unique"),
      // 1 = activo, NULL = histórico
      creadoPor: varchar55("creado_por", { length: 36 }).notNull(),
      razon: varchar55("razon", { length: 500 }),
      createdAt: timestamp48("created_at").notNull().defaultNow(),
      updatedAt: timestamp48("updated_at").notNull().defaultNow().onUpdateNow()
    });
    clienteOwnershipRelations = relations40(clienteOwnership, ({ one }) => ({
      cliente: one(clientes, {
        fields: [clienteOwnership.clienteId],
        references: [clientes.id]
      })
    }));
  }
});

// shared/schema/feature.schema.ts
import { mysqlTable as mysqlTable57, int as int29, varchar as varchar56, text as text33, boolean as boolean23 } from "drizzle-orm/mysql-core";
var features, planFeatures, FEATURE_CODES;
var init_feature_schema = __esm({
  "shared/schema/feature.schema.ts"() {
    "use strict";
    features = mysqlTable57("features", {
      id: int29("id").autoincrement().primaryKey(),
      code: varchar56("code", { length: 100 }).notNull().unique(),
      nombre: varchar56("nombre", { length: 100 }).notNull(),
      descripcion: text33("descripcion"),
      state: boolean23("state").notNull().default(true)
    });
    planFeatures = mysqlTable57("plan_features", {
      planId: varchar56("plan_id", { length: 36 }).notNull(),
      featureCode: varchar56("feature_code", { length: 100 }).notNull(),
      // "true" / "false" para boolean; "5" para límite numérico (ej: privados limitados)
      value: varchar56("value", { length: 50 }).notNull().default("true")
    });
    FEATURE_CODES = [
      "calendario",
      "etapas_procesales",
      "comunidad",
      "chat",
      "privacidad_basica",
      // hasta 5 clientes privados
      "privacidad_avanzada",
      // privados ilimitados + procesos privados
      "dashboard_bufete",
      "roles_custom",
      "soporte_prioritario"
    ];
  }
});

// shared/schema/suscripcion.schema.ts
import { mysqlTable as mysqlTable58, varchar as varchar57, int as int30, boolean as boolean24, datetime as datetime4, timestamp as timestamp49, mysqlEnum as mysqlEnum15 } from "drizzle-orm/mysql-core";
var suscripciones;
var init_suscripcion_schema = __esm({
  "shared/schema/suscripcion.schema.ts"() {
    "use strict";
    suscripciones = mysqlTable58("suscripciones", {
      id: varchar57("id", { length: 36 }).primaryKey(),
      userId: varchar57("user_id", { length: 36 }).notNull(),
      planId: varchar57("plan_id", { length: 36 }).notNull(),
      ciclo: mysqlEnum15("ciclo", ["mensual", "anual"]).notNull(),
      estado: mysqlEnum15("estado", ["activa", "cancelada", "vencida", "en_prueba"]).notNull().default("activa"),
      fechaInicio: datetime4("fecha_inicio").notNull(),
      fechaVencimiento: datetime4("fecha_vencimiento").notNull(),
      fechaCancelacion: datetime4("fecha_cancelacion"),
      autoRenovacion: boolean24("auto_renovacion").notNull().default(true),
      extraUsers: int30("extra_users").notNull().default(0),
      wompiSubscriptionId: varchar57("wompi_subscription_id", { length: 100 }),
      createdAt: timestamp49("created_at").notNull().defaultNow()
    });
  }
});

// shared/schema/pago.schema.ts
import { mysqlTable as mysqlTable59, varchar as varchar58, decimal as decimal4, timestamp as timestamp50, mysqlEnum as mysqlEnum16 } from "drizzle-orm/mysql-core";
var pagos;
var init_pago_schema = __esm({
  "shared/schema/pago.schema.ts"() {
    "use strict";
    pagos = mysqlTable59("pagos", {
      id: varchar58("id", { length: 36 }).primaryKey(),
      suscripcionId: varchar58("suscripcion_id", { length: 36 }).notNull(),
      userId: varchar58("user_id", { length: 36 }).notNull(),
      amountCop: decimal4("amount_cop", { precision: 12, scale: 2 }),
      amountUsd: decimal4("amount_usd", { precision: 10, scale: 2 }),
      currency: mysqlEnum16("currency", ["COP", "USD"]).notNull(),
      metodoPago: mysqlEnum16("metodo_pago", ["card", "pse", "nequi", "bancolombia_transfer", "otro"]),
      estado: mysqlEnum16("estado", ["pendiente", "aprobado", "rechazado", "reembolsado"]).notNull().default("pendiente"),
      wompiTransactionId: varchar58("wompi_transaction_id", { length: 100 }),
      wompiReference: varchar58("wompi_reference", { length: 100 }).notNull().unique(),
      concepto: varchar58("concepto", { length: 255 }),
      createdAt: timestamp50("created_at").notNull().defaultNow()
    });
  }
});

// shared/schema/usage-tracking.schema.ts
import { mysqlTable as mysqlTable60, varchar as varchar59, int as int31, timestamp as timestamp51 } from "drizzle-orm/mysql-core";
var usageTracking;
var init_usage_tracking_schema = __esm({
  "shared/schema/usage-tracking.schema.ts"() {
    "use strict";
    usageTracking = mysqlTable60("usage_tracking", {
      id: varchar59("id", { length: 36 }).primaryKey(),
      userId: varchar59("user_id", { length: 36 }).notNull().unique(),
      suscripcionId: varchar59("suscripcion_id", { length: 36 }).notNull(),
      procesosUsados: int31("procesos_usados").notNull().default(0),
      clientesUsados: int31("clientes_usados").notNull().default(0),
      storageUsadoMb: int31("storage_usado_mb").notNull().default(0),
      updatedAt: timestamp51("updated_at").notNull().defaultNow().onUpdateNow()
    });
  }
});

// shared/schema/admin-audit-log.schema.ts
import { mysqlTable as mysqlTable61, int as int32, varchar as varchar60, text as text34, timestamp as timestamp52, index as index6 } from "drizzle-orm/mysql-core";
var adminAuditLog;
var init_admin_audit_log_schema = __esm({
  "shared/schema/admin-audit-log.schema.ts"() {
    "use strict";
    adminAuditLog = mysqlTable61(
      "admin_audit_log",
      {
        id: int32("id").autoincrement().primaryKey(),
        /** Referencia soft a users.id — sin FK intencional: los logs de auditoría persisten aunque el admin sea eliminado */
        adminId: varchar60("admin_id", { length: 36 }).notNull(),
        accion: varchar60("accion", { length: 100 }).notNull(),
        targetId: varchar60("target_id", { length: 36 }),
        detalle: text34("detalle"),
        createdAt: timestamp52("created_at").notNull().defaultNow()
      },
      (table) => [
        index6("idx_admin_id").on(table.adminId),
        index6("idx_accion").on(table.accion),
        index6("idx_created").on(table.createdAt)
      ]
    );
  }
});

// shared/schema/public-support-request.schema.ts
import { mysqlTable as mysqlTable62, varchar as varchar61, text as text35, mysqlEnum as mysqlEnum17, timestamp as timestamp53 } from "drizzle-orm/mysql-core";
var publicSupportRequests;
var init_public_support_request_schema = __esm({
  "shared/schema/public-support-request.schema.ts"() {
    "use strict";
    publicSupportRequests = mysqlTable62("public_support_requests", {
      id: varchar61("id", { length: 36 }).primaryKey(),
      name: varchar61("name", { length: 120 }).notNull(),
      email: varchar61("email", { length: 180 }).notNull(),
      message: text35("message").notNull(),
      source: mysqlEnum17("source", ["landing", "login"]).notNull(),
      status: mysqlEnum17("status", ["new", "in_progress", "resolved", "spam"]).notNull().default("new"),
      userId: varchar61("user_id", { length: 36 }),
      assignedAdminId: varchar61("assigned_admin_id", { length: 36 }),
      conversationId: varchar61("conversation_id", { length: 36 }),
      createdAt: timestamp53("created_at").notNull().defaultNow(),
      updatedAt: timestamp53("updated_at").notNull().defaultNow().onUpdateNow(),
      resolvedAt: timestamp53("resolved_at")
    });
  }
});

// shared/schema/index.ts
var schema_exports = {};
__export(schema_exports, {
  ETAPA_ESTADOS: () => ETAPA_ESTADOS,
  FEATURE_CODES: () => FEATURE_CODES,
  LEGAL_STAGE_CODES: () => LEGAL_STAGE_CODES,
  PERMISSION_CEILING: () => PERMISSION_CEILING,
  REMINDER_OPTIONS: () => REMINDER_OPTIONS,
  actualizaciones: () => actualizaciones,
  actualizacionesRelations: () => actualizacionesRelations,
  adminAuditLog: () => adminAuditLog,
  adminProfiles: () => adminProfiles,
  adminProfilesRelations: () => adminProfilesRelations,
  appNotifications: () => appNotifications,
  authChallenges: () => authChallenges,
  authChallengesRelations: () => authChallengesRelations,
  calendarEvents: () => calendarEvents,
  calendarEventsRelations: () => calendarEventsRelations,
  clientRequests: () => clientRequests,
  clienteOwnership: () => clienteOwnership,
  clienteOwnershipRelations: () => clienteOwnershipRelations,
  clientes: () => clientes,
  clientesEmpresa: () => clientesEmpresa,
  clientesEmpresaRelations: () => clientesEmpresaRelations,
  clientesNatural: () => clientesNatural,
  clientesNaturalRelations: () => clientesNaturalRelations,
  clientesRelations: () => clientesRelations,
  comments: () => comments,
  commentsRelations: () => commentsRelations,
  communityPostMatches: () => communityPostMatches,
  conversationParticipants: () => conversationParticipants,
  conversationParticipantsRelations: () => conversationParticipantsRelations,
  conversations: () => conversations,
  conversationsRelations: () => conversationsRelations,
  departamentos: () => departamentos,
  departamentosRelations: () => departamentosRelations,
  documentos: () => documentos,
  documentosRelations: () => documentosRelations,
  emailVerificationOtps: () => emailVerificationOtps,
  estadosProceso: () => estadosProceso,
  etapaEventos: () => etapaEventos,
  etapaEventosRelations: () => etapaEventosRelations,
  etapasPorTipoProceso: () => etapasPorTipoProceso,
  etapasPorTipoProcesoRelations: () => etapasPorTipoProcesoRelations,
  etapasTareasPlantilla: () => etapasTareasPlantilla,
  etapasTareasPlantillaRelations: () => etapasTareasPlantillaRelations,
  features: () => features,
  firmClients: () => firmClients,
  firmInvitations: () => firmInvitations,
  firmInvitationsRelations: () => firmInvitationsRelations,
  firmProfiles: () => firmProfiles,
  firmProfilesRelations: () => firmProfilesRelations,
  firmSettings: () => firmSettings,
  firmSettingsRelations: () => firmSettingsRelations,
  lawyerClients: () => lawyerClients,
  lawyerClientsRelations: () => lawyerClientsRelations,
  lawyerFirmaHistory: () => lawyerFirmaHistory,
  lawyerFirmaHistoryRelations: () => lawyerFirmaHistoryRelations,
  lawyerProfiles: () => lawyerProfiles,
  lawyerProfilesRelations: () => lawyerProfilesRelations,
  messages: () => messages,
  messagesRelations: () => messagesRelations,
  modulos: () => modulos,
  modulosRelations: () => modulosRelations,
  municipios: () => municipios,
  municipiosRelations: () => municipiosRelations,
  notificaciones: () => notificaciones,
  pagos: () => pagos,
  passwordResetOtps: () => passwordResetOtps,
  permisos: () => permisos,
  permisosRelations: () => permisosRelations,
  personas: () => personas,
  personasRelations: () => personasRelations,
  planFeatures: () => planFeatures,
  planes: () => planes,
  postBookmarks: () => postBookmarks,
  postLikes: () => postLikes,
  postReports: () => postReports,
  postTags: () => postTags,
  postTagsRelations: () => postTagsRelations,
  postViews: () => postViews,
  posts: () => posts,
  postsRelations: () => postsRelations,
  procesoEtapaHistorial: () => procesoEtapaHistorial,
  procesoEtapaHistorialRelations: () => procesoEtapaHistorialRelations,
  procesoLawyers: () => procesoLawyers,
  procesoLawyersRelations: () => procesoLawyersRelations,
  procesoOwnership: () => procesoOwnership,
  procesoOwnershipRelations: () => procesoOwnershipRelations,
  procesoResponsables: () => procesoResponsables,
  procesoResponsablesRelations: () => procesoResponsablesRelations,
  procesoSharing: () => procesoSharing,
  procesoSharingRelations: () => procesoSharingRelations,
  procesos: () => procesos,
  procesosRelations: () => procesosRelations,
  publicSupportRequests: () => publicSupportRequests,
  ratings: () => ratings,
  representantesLegales: () => representantesLegales,
  representantesLegalesRelations: () => representantesLegalesRelations,
  roles: () => roles,
  rolesPermisos: () => rolesPermisos,
  rolesPermisosRelations: () => rolesPermisosRelations,
  rolesRelations: () => rolesRelations,
  securityEvents: () => securityEvents,
  sessions: () => sessions,
  sessionsRelations: () => sessionsRelations,
  suscripciones: () => suscripciones,
  tags: () => tags,
  tareaArchivos: () => tareaArchivos,
  tareaArchivosRelations: () => tareaArchivosRelations,
  tareaHistorial: () => tareaHistorial,
  tareaHistorialRelations: () => tareaHistorialRelations,
  tareaObservaciones: () => tareaObservaciones,
  tareaObservacionesRelations: () => tareaObservacionesRelations,
  tareaSubtareas: () => tareaSubtareas,
  tareaSubtareasRelations: () => tareaSubtareasRelations,
  tareas: () => tareas,
  tareasRelations: () => tareasRelations,
  tipoAsignacion: () => tipoAsignacion,
  tiposActualizacion: () => tiposActualizacion,
  tiposActualizacionRelations: () => tiposActualizacionRelations,
  tiposDocumento: () => tiposDocumento,
  tiposProceso: () => tiposProceso,
  usageTracking: () => usageTracking,
  userDevices: () => userDevices,
  userDevicesRelations: () => userDevicesRelations,
  userTwoFactor: () => userTwoFactor,
  userTwoFactorRelations: () => userTwoFactorRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
var init_schema = __esm({
  "shared/schema/index.ts"() {
    "use strict";
    init_user_schema();
    init_admin_profile_schema();
    init_plane_schema();
    init_firm_profile_schema();
    init_lawyer_profile_schema();
    init_persona_schema();
    init_representante_legal_schema();
    init_cliente_schema();
    init_cliente_natural_schema();
    init_cliente_empresa_schema();
    init_lawyer_clients_schema();
    init_tipos_documento_schema();
    init_estado_proceso_schema();
    init_tipo_proceso_schema();
    init_rol_schema();
    init_permiso_schema();
    init_modulo_schema();
    init_rolesPermisos_schema();
    init_auth_relations();
    init_actualizaciones_schema();
    init_tipos_actualizacion_schema();
    init_proceso_schema();
    init_proceso_lawyer_schema();
    init_tipo_asignacion_schema();
    init_proceso_responsables_schema();
    init_proceso_etapa_historial_schema();
    init_lawyer_firma_history_schema();
    init_firm_invitation_schema();
    init_documento_schema();
    init_notificacion_schema();
    init_chat_schema();
    init_session_schema();
    init_user_device_schema();
    init_user_two_factor_schema();
    init_auth_challenge_schema();
    init_tarea_schema();
    init_ubicacion_schema();
    init_community_schema();
    init_rating_schema();
    init_client_request_schema();
    init_app_notification_schema();
    init_firm_clients_schema();
    init_otp_schema();
    init_security_audit_schema();
    init_community_match_schema();
    init_legal_stage_schema();
    init_calendar_event_schema();
    init_stage_task_template_schema();
    init_stage_event_schema();
    init_tarea_observacion_schema();
    init_tarea_subtarea_schema();
    init_tarea_historial_schema();
    init_tarea_archivo_schema();
    init_proceso_ownership_schema();
    init_proceso_sharing_schema();
    init_firm_settings_schema();
    init_cliente_ownership_schema();
    init_feature_schema();
    init_suscripcion_schema();
    init_pago_schema();
    init_usage_tracking_schema();
    init_admin_audit_log_schema();
    init_public_support_request_schema();
  }
});

// server/storage/storeage/models/firm-dashboard.storage.ts
import { and, eq, gte, inArray, sql as sql2 } from "drizzle-orm";
var FirmDashboardStorage;
var init_firm_dashboard_storage = __esm({
  "server/storage/storeage/models/firm-dashboard.storage.ts"() {
    "use strict";
    init_schema();
    FirmDashboardStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getStats(firmId) {
        const startOfMonth = /* @__PURE__ */ new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const [ownedRows, sharedRows] = await Promise.all([
          this.db.select({ procesoId: procesoOwnership.procesoId }).from(procesoOwnership).where(and(
            eq(procesoOwnership.ownerType, "bufete"),
            eq(procesoOwnership.ownerId, firmId),
            sql2`${procesoOwnership.activoUnique} = 1`
          )),
          this.db.select({ procesoId: procesoSharing.procesoId }).from(procesoSharing).where(and(
            eq(procesoSharing.sharedWithType, "bufete"),
            eq(procesoSharing.sharedWithId, firmId),
            sql2`${procesoSharing.activoUnique} = 1`
          ))
        ]);
        const procesoIdSet = /* @__PURE__ */ new Set([
          ...ownedRows.map((r) => r.procesoId),
          ...sharedRows.map((r) => r.procesoId)
        ]);
        const procesoIds = [...procesoIdSet];
        const [
          abogadosStats,
          clientesStats,
          procesosStats,
          procesosEsteMes,
          documentosTotal,
          actualizacionesEsteMes,
          procesosPorEstado,
          procesosPorTipo
        ] = await Promise.all([
          // Abogados de la firma (histórico + activos)
          this.db.select({
            total: sql2`COUNT(*)`,
            activos: sql2`SUM(CASE WHEN ${lawyerFirmaHistory.estado} = 'activo' THEN 1 ELSE 0 END)`,
            suspendidos: sql2`SUM(CASE WHEN ${lawyerFirmaHistory.estado} = 'suspendido' THEN 1 ELSE 0 END)`
          }).from(lawyerFirmaHistory).where(eq(lawyerFirmaHistory.firmaId, firmId)),
          // Clientes propios del bufete por ownership activo.
          // Esto excluye clientes privados de abogados vinculados a la firma.
          this.db.select({
            total: sql2`COUNT(DISTINCT ${clienteOwnership.clienteId})`,
            activos: sql2`COUNT(DISTINCT CASE WHEN ${clientes.activo} = 1 THEN ${clienteOwnership.clienteId} END)`
          }).from(clienteOwnership).innerJoin(clientes, eq(clienteOwnership.clienteId, clientes.id)).where(and(
            eq(clienteOwnership.ownerType, "bufete"),
            eq(clienteOwnership.ownerId, firmId),
            sql2`${clienteOwnership.activoUnique} = 1`
          )),
          // Procesos — usar IDs ya calculados (owned + shared del bufete)
          procesoIds.length > 0 ? this.db.select({
            total: sql2`COUNT(DISTINCT ${procesos.id})`,
            activos: sql2`COUNT(DISTINCT CASE WHEN ${estadosProceso.codigo} = 'activo' THEN ${procesos.id} END)`,
            finalizados: sql2`COUNT(DISTINCT CASE WHEN ${estadosProceso.codigo} = 'finalizado' THEN ${procesos.id} END)`
          }).from(procesos).leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id)).where(and(inArray(procesos.id, procesoIds), eq(procesos.state, true))) : Promise.resolve([{ total: 0, activos: 0, finalizados: 0 }]),
          // Procesos este mes
          procesoIds.length > 0 ? this.db.select({ total: sql2`COUNT(DISTINCT ${procesos.id})` }).from(procesos).where(and(
            inArray(procesos.id, procesoIds),
            eq(procesos.state, true),
            gte(procesos.fechaCreacion, startOfMonth)
          )) : Promise.resolve([{ total: 0 }]),
          // Documentos de los procesos de la firma
          procesoIds.length > 0 ? this.db.select({ total: sql2`COUNT(DISTINCT ${documentos.id})` }).from(documentos).where(inArray(documentos.procesoId, procesoIds)) : Promise.resolve([{ total: 0 }]),
          // Actualizaciones este mes
          procesoIds.length > 0 ? this.db.select({ total: sql2`COUNT(DISTINCT ${actualizaciones.id})` }).from(actualizaciones).where(and(
            inArray(actualizaciones.procesoId, procesoIds),
            gte(actualizaciones.fecha, startOfMonth)
          )) : Promise.resolve([{ total: 0 }]),
          // Procesos por estado
          procesoIds.length > 0 ? this.db.select({
            nombre: estadosProceso.nombre,
            color: estadosProceso.color,
            total: sql2`COUNT(DISTINCT ${procesos.id})`
          }).from(procesos).leftJoin(estadosProceso, eq(procesos.estadoId, estadosProceso.id)).where(and(inArray(procesos.id, procesoIds), eq(procesos.state, true))).groupBy(estadosProceso.id, estadosProceso.nombre, estadosProceso.color) : Promise.resolve([]),
          // Procesos por tipo
          procesoIds.length > 0 ? this.db.select({
            nombre: tiposProceso.nombre,
            total: sql2`COUNT(DISTINCT ${procesos.id})`
          }).from(procesos).leftJoin(tiposProceso, eq(procesos.tipoProcesoId, tiposProceso.id)).where(and(inArray(procesos.id, procesoIds), eq(procesos.state, true))).groupBy(tiposProceso.id, tiposProceso.nombre) : Promise.resolve([])
        ]);
        let totalTareas = 0, tareasPendientes = 0, tareasEnProgreso = 0, tareasCompletadas = 0;
        try {
          if (procesoIds.length > 0) {
            const result = await this.db.select({
              total: sql2`COUNT(DISTINCT ${tareas.id})`,
              pendientes: sql2`COUNT(DISTINCT CASE WHEN ${tareas.estado} = 'pendiente'   THEN ${tareas.id} END)`,
              en_progreso: sql2`COUNT(DISTINCT CASE WHEN ${tareas.estado} = 'en_progreso' THEN ${tareas.id} END)`,
              completadas: sql2`COUNT(DISTINCT CASE WHEN ${tareas.estado} = 'completada'  THEN ${tareas.id} END)`
            }).from(tareas).where(and(
              eq(tareas.state, true),
              inArray(tareas.procesoId, procesoIds)
            ));
            totalTareas = Number(result[0]?.total ?? 0);
            tareasPendientes = Number(result[0]?.pendientes ?? 0);
            tareasEnProgreso = Number(result[0]?.en_progreso ?? 0);
            tareasCompletadas = Number(result[0]?.completadas ?? 0);
          }
        } catch (e) {
          console.error("[firm-dashboard] Error al obtener stats de tareas:", e);
        }
        return {
          totalAbogados: Number(abogadosStats[0]?.total ?? 0),
          abogadosActivos: Number(abogadosStats[0]?.activos ?? 0),
          abogadosSuspendidos: Number(abogadosStats[0]?.suspendidos ?? 0),
          totalClientes: Number(clientesStats[0]?.total ?? 0),
          clientesActivos: Number(clientesStats[0]?.activos ?? 0),
          totalProcesos: Number(procesosStats[0]?.total ?? 0),
          procesosActivos: Number(procesosStats[0]?.activos ?? 0),
          procesosFinalizados: Number(procesosStats[0]?.finalizados ?? 0),
          procesosEsteMes: Number(procesosEsteMes[0]?.total ?? 0),
          totalDocumentos: Number(documentosTotal[0]?.total ?? 0),
          actualizacionesEsteMes: Number(actualizacionesEsteMes[0]?.total ?? 0),
          totalTareas,
          tareasPendientes,
          tareasEnProgreso,
          tareasCompletadas,
          procesosPorEstado: procesosPorEstado.map((e) => ({
            nombre: e.nombre || "Sin estado",
            color: e.color || "#607D8B",
            total: Number(e.total)
          })),
          procesosPorTipo: procesosPorTipo.map((t) => ({
            nombre: t.nombre || "Sin tipo",
            total: Number(t.total)
          }))
        };
      }
    };
  }
});

// server/storage/storeage/models/actualizacion-storage.ts
import { randomUUID } from "crypto";
import { eq as eq2, desc } from "drizzle-orm";
var ActualizacionStorage;
var init_actualizacion_storage = __esm({
  "server/storage/storeage/models/actualizacion-storage.ts"() {
    "use strict";
    init_actualizaciones_schema();
    init_tipos_actualizacion_schema();
    ActualizacionStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getActualizaciones(procesoId, limit = 10, offset = 0) {
        const results = await this.db.query.actualizaciones.findMany({
          where: eq2(actualizaciones.procesoId, procesoId),
          orderBy: [desc(actualizaciones.fecha)],
          limit,
          offset,
          with: { tipo: true }
        });
        return results.map((row) => ({
          id: row.id,
          procesoId: row.procesoId,
          fecha: row.fecha,
          titulo: row.titulo,
          descripcion: row.descripcion,
          tipoId: row.tipo?.id ?? 1,
          documentoId: row.documentoId ?? null,
          state: row.state ?? true,
          tipo: row.tipo ? {
            id: row.tipo.id,
            nombre: row.tipo.nombre
          } : null
        }));
      }
      async createActualizacion(insertActualizacion) {
        const id = randomUUID();
        const fechaValue = insertActualizacion.fecha ? insertActualizacion.fecha instanceof Date ? insertActualizacion.fecha : new Date(insertActualizacion.fecha) : /* @__PURE__ */ new Date();
        if (insertActualizacion.tipo === void 0 || insertActualizacion.tipo === null) {
          throw new Error("tipo es requerido");
        }
        const tipoLookup = await this.db.select().from(tiposActualizacion).where(eq2(tiposActualizacion.nombre, insertActualizacion.tipo)).limit(1);
        const tipo = tipoLookup[0];
        if (!tipo) {
          throw new Error("Tipo de actualizaci\xF3n no v\xE1lido");
        }
        const dbActualizacion = {
          id,
          procesoId: insertActualizacion.procesoId,
          fecha: fechaValue,
          titulo: insertActualizacion.titulo,
          descripcion: insertActualizacion.descripcion,
          tipoId: tipo.id,
          documentoId: insertActualizacion.documentoId ?? null,
          state: insertActualizacion.state ?? true,
          tipo: tipo.nombre
        };
        await this.db.insert(actualizaciones).values(dbActualizacion);
        return {
          id,
          procesoId: insertActualizacion.procesoId,
          fecha: fechaValue,
          titulo: insertActualizacion.titulo,
          descripcion: insertActualizacion.descripcion,
          tipoId: insertActualizacion.tipoId,
          documentoId: insertActualizacion.documentoId ?? null,
          state: insertActualizacion.state ?? true
        };
      }
      async getActualizacion(id) {
        const rows = await this.db.select({ id: actualizaciones.id, procesoId: actualizaciones.procesoId }).from(actualizaciones).where(eq2(actualizaciones.id, id)).limit(1);
        return rows[0] ?? null;
      }
      async deleteActualizacion(id) {
        await this.db.delete(actualizaciones).where(eq2(actualizaciones.id, id));
      }
    };
  }
});

// server/storage/storeage/models/estadoProceso-storage.ts
import { eq as eq3 } from "drizzle-orm";
var EstadoProcesoStorage;
var init_estadoProceso_storage = __esm({
  "server/storage/storeage/models/estadoProceso-storage.ts"() {
    "use strict";
    init_schema();
    EstadoProcesoStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getEstadosProceso() {
        return this.db.query.estadosProceso.findMany();
      }
      async getEstadoProceso(id) {
        return this.db.query.estadosProceso.findFirst({
          where: eq3(estadosProceso.id, id)
        });
      }
      async createEstadoProceso(data) {
        const newEstado = {
          nombre: data.nombre,
          descripcion: data.descripcion ?? null,
          activo: data.activo ?? true
        };
        await this.db.insert(estadosProceso).values(newEstado);
        const created = await this.db.query.estadosProceso.findFirst({
          where: eq3(estadosProceso.nombre, data.nombre)
        });
        if (!created) {
          throw new Error("No se pudo crear el estado del proceso");
        }
        return created;
      }
      async updateEstadoProceso(id, updates) {
        await this.db.update(estadosProceso).set(updates).where(eq3(estadosProceso.id, id));
        return this.getEstadoProceso(id);
      }
      async deleteEstadoProceso(id) {
        await this.db.delete(estadosProceso).where(eq3(estadosProceso.id, id));
      }
    };
  }
});

// server/middleware/http-exception.ts
var HttpException;
var init_http_exception = __esm({
  "server/middleware/http-exception.ts"() {
    "use strict";
    HttpException = class _HttpException extends Error {
      constructor(status, message) {
        super(message);
        this.status = status;
        this.name = "HttpException";
        Object.setPrototypeOf(this, new.target.prototype);
      }
      static badRequest(message) {
        return new _HttpException(400, message);
      }
      static unauthorized(message = "No autenticado") {
        return new _HttpException(401, message);
      }
      static forbidden(message = "Sin permisos para esta acci\xF3n") {
        return new _HttpException(403, message);
      }
      static notFound(message = "Recurso no encontrado") {
        return new _HttpException(404, message);
      }
      static conflict(message) {
        return new _HttpException(409, message);
      }
      static unprocessable(message) {
        return new _HttpException(422, message);
      }
    };
  }
});

// server/storage/storeage/models/identity-uniqueness.ts
import { and as and2, eq as eq4, ne } from "drizzle-orm";
function normalize(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
function normalizeLooseText(value) {
  return value?.trim() ?? "";
}
function normalizeOptionalIdentity(value) {
  return normalize(value);
}
function normalizeRequiredIdentity(value, fieldLabel) {
  const normalized = normalize(value);
  if (!normalized) {
    throw HttpException.badRequest(`${fieldLabel} es requerido.`);
  }
  return normalized;
}
async function assertDocumentoUnique(db2, documento, excludePersonaId) {
  const normalized = normalizeRequiredIdentity(documento, "El documento");
  const rows = await db2.select({ id: personas.id }).from(personas).where(
    excludePersonaId ? and2(eq4(personas.documento, normalized), ne(personas.id, excludePersonaId)) : eq4(personas.documento, normalized)
  ).limit(1);
  if (rows[0]) {
    throw HttpException.conflict("El documento ya est\xE1 registrado en la plataforma.");
  }
  return normalized;
}
async function assertLicenseNumberUnique(db2, licenseNumber, excludeLawyerId) {
  const normalized = normalize(licenseNumber);
  if (!normalized) return null;
  const rows = await db2.select({ id: lawyerProfiles.id }).from(lawyerProfiles).where(
    excludeLawyerId ? and2(eq4(lawyerProfiles.licenseNumber, normalized), ne(lawyerProfiles.id, excludeLawyerId)) : eq4(lawyerProfiles.licenseNumber, normalized)
  ).limit(1);
  if (rows[0]) {
    throw HttpException.conflict("La tarjeta profesional ya est\xE1 registrada en la plataforma.");
  }
  return normalized;
}
async function assertNitUnique(db2, nit, options) {
  const normalized = normalizeRequiredIdentity(nit, "El NIT");
  const firmRows = await db2.select({ id: firmProfiles.id }).from(firmProfiles).where(
    options?.excludeFirmId ? and2(eq4(firmProfiles.nit, normalized), ne(firmProfiles.id, options.excludeFirmId)) : eq4(firmProfiles.nit, normalized)
  ).limit(1);
  if (firmRows[0]) {
    throw HttpException.conflict("El NIT ya est\xE1 registrado en la plataforma.");
  }
  const companyRows = await db2.select({ clienteId: clientesEmpresa.clienteId }).from(clientesEmpresa).where(
    options?.excludeClienteEmpresaId ? and2(eq4(clientesEmpresa.nit, normalized), ne(clientesEmpresa.clienteId, options.excludeClienteEmpresaId)) : eq4(clientesEmpresa.nit, normalized)
  ).limit(1);
  if (companyRows[0]) {
    throw HttpException.conflict("El NIT ya est\xE1 registrado en la plataforma.");
  }
  return normalized;
}
var init_identity_uniqueness = __esm({
  "server/storage/storeage/models/identity-uniqueness.ts"() {
    "use strict";
    init_schema();
    init_http_exception();
  }
});

// server/storage/storeage/models/firma-storage.ts
import { eq as eq5 } from "drizzle-orm";
var FirmProfileStorage;
var init_firma_storage = __esm({
  "server/storage/storeage/models/firma-storage.ts"() {
    "use strict";
    init_schema();
    init_identity_uniqueness();
    FirmProfileStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ============================
      // Obtener por ID
      // ============================
      async getFirmProfileById(id) {
        const result = await this.db.select().from(firmProfiles).where(eq5(firmProfiles.id, id)).limit(1);
        return result[0];
      }
      // ============================
      // Obtener por userId (con representante legal)
      // ============================
      async getFirmProfileByUserId(userId2) {
        const rows = await this.db.select({
          id: firmProfiles.id,
          userId: firmProfiles.userId,
          name: firmProfiles.name,
          nit: firmProfiles.nit,
          address: firmProfiles.address,
          phone: firmProfiles.phone,
          representanteLegalId: firmProfiles.representanteLegalId,
          createdAt: firmProfiles.createdAt,
          updatedAt: firmProfiles.updatedAt,
          repId: representantesLegales.id,
          repCargo: representantesLegales.cargo,
          repEmail: representantesLegales.email,
          repPersonaId: representantesLegales.personaId,
          repNombre: personas.nombre,
          repApellido: personas.apellido,
          repTelefono: personas.telefono,
          repDocumento: personas.documento
        }).from(firmProfiles).leftJoin(representantesLegales, eq5(firmProfiles.representanteLegalId, representantesLegales.id)).leftJoin(personas, eq5(representantesLegales.personaId, personas.id)).where(eq5(firmProfiles.userId, userId2)).limit(1);
        if (!rows[0]) return void 0;
        const row = rows[0];
        const profile = {
          id: row.id,
          userId: row.userId,
          name: row.name,
          nit: row.nit,
          address: row.address,
          phone: row.phone,
          representanteLegalId: row.representanteLegalId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          representanteLegal: row.repId ? {
            id: row.repId,
            personaId: row.repPersonaId,
            cargo: row.repCargo,
            email: row.repEmail,
            persona: {
              id: row.repPersonaId,
              nombre: row.repNombre,
              apellido: row.repApellido,
              telefono: row.repTelefono,
              documento: row.repDocumento,
              tipoDocumentoId: 0,
              direccion: null,
              departamentoId: null,
              municipioId: null
            }
          } : null
        };
        return profile;
      }
      // ============================
      // Crear Perfil
      // ============================
      async createFirmProfile(data) {
        const nit = await assertNitUnique(this.db, data.nit);
        const newProfile = {
          ...data,
          name: normalizeRequiredIdentity(data.name, "El nombre de la firma"),
          nit,
          address: normalizeOptionalIdentity(data.address),
          phone: normalizeOptionalIdentity(data.phone),
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        await this.db.insert(firmProfiles).values(newProfile);
        const created = await this.getFirmProfileByUserId(data.userId);
        if (!created) {
          throw new Error("No se pudo crear el perfil de firma");
        }
        return created;
      }
      // ============================
      // Actualizar Perfil
      // ============================
      async updateFirmProfile(id, updates) {
        const { createdAt, ...safeUpdates } = updates;
        const payload = { ...safeUpdates };
        if (safeUpdates.name !== void 0) payload.name = normalizeRequiredIdentity(safeUpdates.name, "El nombre de la firma");
        if (safeUpdates.nit !== void 0) payload.nit = await assertNitUnique(this.db, safeUpdates.nit, { excludeFirmId: id });
        if (safeUpdates.address !== void 0) payload.address = normalizeOptionalIdentity(safeUpdates.address);
        if (safeUpdates.phone !== void 0) payload.phone = normalizeOptionalIdentity(safeUpdates.phone);
        await this.db.update(firmProfiles).set({
          ...payload,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq5(firmProfiles.id, id));
        return this.getFirmProfileById(id);
      }
      // ============================
      // Eliminar Perfil
      // ============================
      async deleteFirmProfile(id) {
        await this.db.delete(firmProfiles).where(eq5(firmProfiles.id, id));
      }
    };
  }
});

// server/storage/storeage/models/permisos-storage.ts
import { eq as eq6 } from "drizzle-orm";
var permisosCache, PermisoStorage;
var init_permisos_storage = __esm({
  "server/storage/storeage/models/permisos-storage.ts"() {
    "use strict";
    init_modulo_schema();
    init_rolesPermisos_schema();
    permisosCache = /* @__PURE__ */ new Map();
    PermisoStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ===============================
      // Obtener todos los permisos
      // ===============================
      async getPermisos() {
        const permisosRaw = await this.db.query.permisos.findMany();
        return permisosRaw.map((p) => ({
          ...p,
          modulo: p.codigo.split(".")[0]
          // ejemplo: "procesos.crear"
        }));
      }
      // ===============================
      // Obtener módulos
      // ===============================
      async getModulos() {
        try {
          return await this.db.select().from(modulos).execute();
        } catch (error) {
          console.warn("Tabla modulos no encontrada:", error);
          return [];
        }
      }
      // ===============================
      // Obtener permisos por rol
      // ===============================
      async getPermisosByRol(rolId) {
        const cacheKey = `rol_${rolId}`;
        if (permisosCache.has(cacheKey)) {
          return permisosCache.get(cacheKey);
        }
        const result = await this.db.query.rolesPermisos.findMany({
          where: eq6(rolesPermisos.rolId, rolId),
          with: { permiso: true }
        });
        const permisosRol = result.filter((rp) => rp.permiso.activo).map((rp) => rp.permiso.codigo);
        permisosCache.set(cacheKey, permisosRol);
        return permisosRol;
      }
      // ===============================
      // Asignar permisos a rol
      // ===============================
      async assignPermisosToRol(rolId, permisosIds) {
        permisosCache.delete(`rol_${rolId}`);
        await this.db.delete(rolesPermisos).where(eq6(rolesPermisos.rolId, rolId));
        if (permisosIds.length > 0) {
          const values = permisosIds.map((permisoId) => ({
            rolId,
            permisoId
          }));
          await this.db.insert(rolesPermisos).values(values);
        }
      }
    };
  }
});

// server/storage/storeage/models/plan-storage.ts
import { eq as eq7, and as and3 } from "drizzle-orm";
var PlanStorage;
var init_plan_storage = __esm({
  "server/storage/storeage/models/plan-storage.ts"() {
    "use strict";
    init_schema();
    PlanStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getPlan(id) {
        return this.db.select().from(planes).where(eq7(planes.id, id)).limit(1).then((r) => r[0]);
      }
      async getPlanes(tipo) {
        if (tipo) {
          return this.db.select().from(planes).where(and3(eq7(planes.tipo, tipo), eq7(planes.state, true)));
        }
        return this.db.select().from(planes).where(eq7(planes.state, true));
      }
      async getPlanesPublicos(tipo) {
        const listPlanes = await this.getPlanes(tipo);
        const result = [];
        for (const p of listPlanes) {
          const featureRows = await this.db.select({ code: planFeatures.featureCode, nombre: features.nombre, value: planFeatures.value }).from(planFeatures).innerJoin(features, eq7(planFeatures.featureCode, features.code)).where(eq7(planFeatures.planId, p.id));
          result.push({
            id: p.id,
            nombre: p.nombre,
            tipo: p.tipo,
            precioMensualCop: p.precioMensualCop,
            precioAnualCop: p.precioAnualCop,
            precioMensualUsd: p.precioMensualUsd,
            precioAnualUsd: p.precioAnualUsd,
            maxProcesos: p.maxProcesos,
            maxClientes: p.maxClientes,
            maxStorageGb: p.maxStorageGb,
            includedUsers: p.includedUsers,
            maxUsers: p.maxUsers,
            precioUsuarioExtraCop: p.precioUsuarioExtraCop ?? null,
            precioUsuarioExtraUsd: p.precioUsuarioExtraUsd ?? null,
            features: featureRows
          });
        }
        return result;
      }
      /** Compatibilidad legacy — usado por server/index.ts seedDatabase() */
      async createPlan(insertPlan) {
        const newPlan = {
          id: insertPlan.id,
          nombre: insertPlan.nombre,
          tipo: insertPlan.tipo ?? "abogado",
          precioMensualCop: insertPlan.precioMensualCop ?? insertPlan.precio ?? "0",
          precioAnualCop: insertPlan.precioAnualCop ?? "0",
          precioMensualUsd: insertPlan.precioMensualUsd ?? "0",
          precioAnualUsd: insertPlan.precioAnualUsd ?? "0",
          maxProcesos: insertPlan.maxProcesos ?? 5,
          maxClientes: insertPlan.maxClientes ?? 10,
          maxStorageGb: insertPlan.maxStorageGb ?? 0,
          includedUsers: insertPlan.includedUsers ?? 1,
          maxUsers: insertPlan.maxUsers ?? 1,
          precioUsuarioExtraCop: insertPlan.precioUsuarioExtraCop ?? null,
          precioUsuarioExtraUsd: insertPlan.precioUsuarioExtraUsd ?? null,
          state: insertPlan.state ?? true
        };
        await this.db.insert(planes).values(newPlan);
        return await this.getPlan(insertPlan.id);
      }
      async updatePlan(id, data) {
        await this.db.update(planes).set(data).where(eq7(planes.id, id));
        return this.getPlan(id);
      }
      async deletePlan(id) {
        await this.db.delete(planes).where(eq7(planes.id, id));
      }
    };
  }
});

// server/storage/storeage/models/rol-storage.ts
import { eq as eq8, isNull, and as and4 } from "drizzle-orm";
var RolStorage;
var init_rol_storage = __esm({
  "server/storage/storeage/models/rol-storage.ts"() {
    "use strict";
    init_rol_schema();
    init_rolesPermisos_schema();
    init_lawyer_firma_history_schema();
    RolStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getRoles() {
        return this.db.select().from(roles).where(isNull(roles.firmId));
      }
      async getRol(id) {
        return this.db.query.roles.findFirst({
          where: eq8(roles.id, id)
        });
      }
      async getRolByNombre(nombre) {
        return this.db.query.roles.findFirst({
          where: and4(eq8(roles.nombre, nombre), isNull(roles.firmId))
        });
      }
      /** Returns all custom roles belonging to a specific firm */
      async getFirmRoles(firmId) {
        return this.db.select().from(roles).where(eq8(roles.firmId, firmId));
      }
      async createRol(data) {
        await this.db.insert(roles).values(data);
        let created;
        if (data.firmId) {
          created = await this.db.query.roles.findFirst({
            where: and4(eq8(roles.nombre, data.nombre), eq8(roles.firmId, data.firmId))
          });
        } else {
          created = await this.getRolByNombre(data.nombre);
        }
        if (!created) {
          throw new Error("No se pudo crear el rol");
        }
        return created;
      }
      /** Check if any active lawyer is still assigned to this firm role */
      async hasFirmRolAssigned(rolId) {
        const result = await this.db.select({ id: lawyerFirmaHistory.id }).from(lawyerFirmaHistory).where(
          and4(
            eq8(lawyerFirmaHistory.firmRolId, rolId),
            eq8(lawyerFirmaHistory.estado, "activo")
          )
        ).limit(1);
        return result.length > 0;
      }
      async updateRol(id, updates) {
        await this.db.update(roles).set(updates).where(eq8(roles.id, id));
        return this.getRol(id);
      }
      async deleteRol(id) {
        await this.db.transaction(async (tx) => {
          await tx.delete(rolesPermisos).where(eq8(rolesPermisos.rolId, id));
          await tx.delete(roles).where(eq8(roles.id, id));
        });
      }
    };
  }
});

// server/storage/storeage/models/tipoProceso-storage.ts
import { eq as eq9 } from "drizzle-orm";
var TipoProcesoStorage;
var init_tipoProceso_storage = __esm({
  "server/storage/storeage/models/tipoProceso-storage.ts"() {
    "use strict";
    init_schema();
    TipoProcesoStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getTiposProceso() {
        return this.db.query.tiposProceso.findMany();
      }
      async getTipoProceso(id) {
        return this.db.query.tiposProceso.findFirst({
          where: eq9(tiposProceso.id, id)
        });
      }
      async createTipoProceso(data) {
        const newTipo = {
          nombre: data.nombre,
          descripcion: data.descripcion ?? null,
          activo: data.activo ?? true
        };
        await this.db.insert(tiposProceso).values(newTipo);
        const created = await this.db.query.tiposProceso.findFirst({
          where: eq9(tiposProceso.nombre, data.nombre)
        });
        if (!created) {
          throw new Error("No se pudo crear el tipo de proceso");
        }
        return created;
      }
      async updateTipoProceso(id, updates) {
        await this.db.update(tiposProceso).set(updates).where(eq9(tiposProceso.id, id));
        return this.getTipoProceso(id);
      }
      async deleteTipoProceso(id) {
        await this.db.delete(tiposProceso).where(eq9(tiposProceso.id, id));
      }
    };
  }
});

// server/storage/storeage/models/user-storage.ts
import { eq as eq10, like, or } from "drizzle-orm";
var UserStorage;
var init_user_storage = __esm({
  "server/storage/storeage/models/user-storage.ts"() {
    "use strict";
    init_schema();
    UserStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ============================
      // Buscar por Email
      // ============================
      async getUserByEmail(email) {
        const result = await this.db.select().from(users).where(eq10(users.email, email)).limit(1);
        return result[0];
      }
      // ============================
      // Buscar por ID
      // ============================
      async getUserById(id) {
        return await this.db.query.users.findFirst({
          where: eq10(users.id, id),
          with: {
            rol: true
          }
        });
      }
      // ============================
      // Crear Usuario
      // ============================
      async createUser(user, tx) {
        const dbInstance = tx ?? this.db;
        const newUser = {
          ...user,
          isActive: user.isActive ?? true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        await dbInstance.insert(users).values(newUser);
        const existing = await this.getUserByEmail(user.email);
        if (existing) {
          throw new Error("El correo ya existe");
        }
        return newUser;
      }
      // ============================
      // Buscar Lawyers (abogados disponibles)
      // ============================
      async searchLawyers(search) {
        const results = await this.db.select({
          id: users.id,
          email: users.email,
          name: users.name
        }).from(users).innerJoin(lawyerProfiles, eq10(users.id, lawyerProfiles.userId)).where(
          or(
            like(users.name, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        ).limit(20);
        return results;
      }
      // ============================
      // Actualizar Usuario
      // ============================
      async updateUser(id, updates) {
        await this.db.update(users).set({
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq10(users.id, id));
        return this.getUserById(id);
      }
      // ============================
      // Activar / Desactivar
      // ============================
      async setUserActiveStatus(id, isActive) {
        await this.db.update(users).set({
          isActive,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq10(users.id, id));
        return this.getUserById(id);
      }
      // ============================
      // Obtener usuario con rol
      // ============================
      async getUserWithRole(id) {
        return this.db.query.users.findFirst({
          where: eq10(users.id, id),
          with: {
            rol: true
            // depende de que tengas relación definida en schema
          }
        });
      }
    };
  }
});

// server/storage/storeage/models/cliente-storage.ts
import { randomUUID as randomUUID2 } from "crypto";
import { eq as eq11, and as and6, desc as desc2, like as like2, or as or2, inArray as inArray2, sql as sql4 } from "drizzle-orm";
var ClienteStorage;
var init_cliente_storage = __esm({
  "server/storage/storeage/models/cliente-storage.ts"() {
    "use strict";
    init_schema();
    init_identity_uniqueness();
    ClienteStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ----------------------------------------------------------------
      // LIST
      // ----------------------------------------------------------------
      /** Returns clientIds of procesos where lawyerId is the active responsable */
      async getClienteIdsByProcesoResponsable(lawyerId) {
        const rows = await this.db.select({ clienteId: procesos.clienteId }).from(procesoResponsables).innerJoin(procesos, eq11(procesoResponsables.procesoId, procesos.id)).where(and6(
          eq11(procesoResponsables.lawyerId, lawyerId),
          eq11(procesoResponsables.activo, true)
        ));
        return [...new Set(rows.map((r) => r.clienteId).filter(Boolean))];
      }
      async getClientes(lawyerId, limit = 10, offset = 0, filter, extraClientIds) {
        const clienteIdRows = await this.db.select({ clienteId: lawyerClients.clientId }).from(lawyerClients).where(and6(eq11(lawyerClients.lawyerId, lawyerId), eq11(lawyerClients.status, "active")));
        const clienteIds = [
          .../* @__PURE__ */ new Set([
            ...clienteIdRows.map((r) => r.clienteId).filter(Boolean),
            ...extraClientIds ?? []
          ])
        ];
        if (clienteIds.length === 0) return [];
        const conditions = [inArray2(clientes.id, clienteIds)];
        if (filter?.search) {
          const search = `${filter.search}%`;
          conditions.push(
            or2(
              like2(personas.nombre, search),
              like2(personas.documento, search),
              like2(clientesEmpresa.razonSocial, search),
              like2(clientesEmpresa.nit, search)
            )
          );
        }
        const rows = await this.db.select({
          id: clientes.id,
          userId: clientes.userId,
          tipo: clientes.tipo,
          activo: clientes.activo,
          fechaCreacion: clientes.fechaCreacion,
          user: { id: users.id, email: users.email, isActive: users.isActive, createdAt: users.createdAt },
          // natural
          natural: {
            clienteId: clientesNatural.clienteId,
            personaId: clientesNatural.personaId
          },
          persona: {
            id: personas.id,
            nombre: personas.nombre,
            apellido: personas.apellido,
            telefono: personas.telefono,
            documento: personas.documento,
            tipoDocumentoId: personas.tipoDocumentoId,
            direccion: personas.direccion,
            departamentoId: personas.departamentoId,
            municipioId: personas.municipioId
          },
          // empresa
          empresa: {
            clienteId: clientesEmpresa.clienteId,
            razonSocial: clientesEmpresa.razonSocial,
            nit: clientesEmpresa.nit,
            sector: clientesEmpresa.sector,
            representanteLegalId: clientesEmpresa.representanteLegalId
          }
        }).from(clientes).innerJoin(users, eq11(clientes.userId, users.id)).leftJoin(clientesNatural, eq11(clientes.id, clientesNatural.clienteId)).leftJoin(personas, eq11(clientesNatural.personaId, personas.id)).leftJoin(clientesEmpresa, eq11(clientes.id, clientesEmpresa.clienteId)).where(and6(...conditions)).orderBy(desc2(clientes.fechaCreacion)).limit(limit).offset(offset);
        return rows.map((row) => this._mapRow(row));
      }
      async getProcesosStatsByClientes(clienteIds) {
        if (clienteIds.length === 0) return /* @__PURE__ */ new Map();
        const rows = await this.db.select({
          clienteId: procesos.clienteId,
          codigo: estadosProceso.codigo,
          nombre: estadosProceso.nombre,
          count: sql4`COUNT(*)`
        }).from(procesos).innerJoin(estadosProceso, eq11(procesos.estadoId, estadosProceso.id)).where(inArray2(procesos.clienteId, clienteIds)).groupBy(procesos.clienteId, estadosProceso.id, estadosProceso.codigo, estadosProceso.nombre);
        const map = /* @__PURE__ */ new Map();
        for (const row of rows) {
          if (!row.clienteId) continue;
          if (!map.has(row.clienteId)) map.set(row.clienteId, { total: 0, porEstado: [] });
          const entry = map.get(row.clienteId);
          const count4 = Number(row.count);
          entry.total += count4;
          entry.porEstado.push({ codigo: row.codigo, nombre: row.nombre, count: count4 });
        }
        return map;
      }
      async getClientesCount(lawyerId, extraClientIds) {
        const rows = await this.db.select({ clienteId: lawyerClients.clientId }).from(lawyerClients).where(and6(eq11(lawyerClients.lawyerId, lawyerId), eq11(lawyerClients.status, "active")));
        const allIds = /* @__PURE__ */ new Set([
          ...rows.map((r) => r.clienteId).filter(Boolean),
          ...extraClientIds ?? []
        ]);
        return allIds.size;
      }
      // ----------------------------------------------------------------
      // SINGLE
      // ----------------------------------------------------------------
      async getCliente(id, tx) {
        const db2 = tx ?? this.db;
        const rows = await db2.select({
          id: clientes.id,
          userId: clientes.userId,
          tipo: clientes.tipo,
          activo: clientes.activo,
          fechaCreacion: clientes.fechaCreacion,
          user: { id: users.id, email: users.email, isActive: users.isActive, createdAt: users.createdAt },
          natural: { clienteId: clientesNatural.clienteId, personaId: clientesNatural.personaId },
          persona: {
            id: personas.id,
            nombre: personas.nombre,
            apellido: personas.apellido,
            telefono: personas.telefono,
            documento: personas.documento,
            tipoDocumentoId: personas.tipoDocumentoId,
            direccion: personas.direccion,
            departamentoId: personas.departamentoId,
            municipioId: personas.municipioId,
            tipoDocumento: { id: tiposDocumento.id, codigo: tiposDocumento.codigo, nombre: tiposDocumento.nombre },
            departamento: { id: departamentos.id, codigo: departamentos.codigo, nombre: departamentos.nombre },
            municipio: { id: municipios.id, codigo: municipios.codigo, nombre: municipios.nombre }
          },
          empresa: {
            clienteId: clientesEmpresa.clienteId,
            razonSocial: clientesEmpresa.razonSocial,
            nit: clientesEmpresa.nit,
            sector: clientesEmpresa.sector,
            representanteLegalId: clientesEmpresa.representanteLegalId
          }
        }).from(clientes).innerJoin(users, eq11(clientes.userId, users.id)).leftJoin(clientesNatural, eq11(clientes.id, clientesNatural.clienteId)).leftJoin(personas, eq11(clientesNatural.personaId, personas.id)).leftJoin(tiposDocumento, eq11(personas.tipoDocumentoId, tiposDocumento.id)).leftJoin(departamentos, eq11(personas.departamentoId, departamentos.id)).leftJoin(municipios, eq11(personas.municipioId, municipios.id)).leftJoin(clientesEmpresa, eq11(clientes.id, clientesEmpresa.clienteId)).where(eq11(clientes.id, id)).limit(1);
        if (!rows[0]) return void 0;
        const cliente = this._mapRow(rows[0]);
        if (cliente.tipo === "empresa" && cliente.empresa?.representanteLegalId) {
          const repRows = await this.db.select({
            repId: representantesLegales.id,
            repPersonaId: representantesLegales.personaId,
            repCargo: representantesLegales.cargo,
            repEmail: representantesLegales.email,
            pId: personas.id,
            pNombre: personas.nombre,
            pApellido: personas.apellido,
            pTelefono: personas.telefono,
            pDocumento: personas.documento,
            pTipoDocId: personas.tipoDocumentoId,
            pDireccion: personas.direccion,
            pDeptoId: personas.departamentoId,
            pMunicipioId: personas.municipioId,
            tdId: tiposDocumento.id,
            tdCod: tiposDocumento.codigo,
            tdNom: tiposDocumento.nombre,
            dId: departamentos.id,
            dCod: departamentos.codigo,
            dNom: departamentos.nombre,
            mId: municipios.id,
            mCod: municipios.codigo,
            mNom: municipios.nombre
          }).from(representantesLegales).leftJoin(personas, eq11(representantesLegales.personaId, personas.id)).leftJoin(tiposDocumento, eq11(personas.tipoDocumentoId, tiposDocumento.id)).leftJoin(departamentos, eq11(personas.departamentoId, departamentos.id)).leftJoin(municipios, eq11(personas.municipioId, municipios.id)).where(eq11(representantesLegales.id, cliente.empresa.representanteLegalId)).limit(1);
          if (repRows[0]) {
            const r = repRows[0];
            const persona = r.pId ? {
              id: r.pId,
              nombre: r.pNombre,
              apellido: r.pApellido,
              telefono: r.pTelefono,
              documento: r.pDocumento,
              tipoDocumentoId: r.pTipoDocId,
              direccion: r.pDireccion,
              departamentoId: r.pDeptoId,
              municipioId: r.pMunicipioId,
              tipoDocumento: r.tdId ? { id: r.tdId, codigo: r.tdCod, nombre: r.tdNom } : null,
              departamento: r.dId ? { id: r.dId, codigo: r.dCod, nombre: r.dNom } : null,
              municipio: r.mId ? { id: r.mId, codigo: r.mCod, nombre: r.mNom } : null
            } : null;
            cliente.empresa.representanteLegal = {
              id: r.repId,
              personaId: r.repPersonaId,
              cargo: r.repCargo,
              email: r.repEmail,
              persona
            };
          }
        }
        return cliente;
      }
      async getClienteByDocument(documento) {
        const personaResult = await this.db.select({ id: personas.id }).from(personas).where(eq11(personas.documento, documento)).limit(1);
        if (!personaResult[0]) return void 0;
        const naturalResult = await this.db.select({ clienteId: clientesNatural.clienteId }).from(clientesNatural).where(eq11(clientesNatural.personaId, personaResult[0].id)).limit(1);
        if (!naturalResult[0]) return void 0;
        return this.getCliente(naturalResult[0].clienteId);
      }
      async getClienteByUser(userId2) {
        const result = await this.db.select({ id: clientes.id }).from(clientes).where(eq11(clientes.userId, userId2)).limit(1);
        if (!result[0]) return void 0;
        return this.getCliente(result[0].id);
      }
      // ----------------------------------------------------------------
      // CREATE
      // ----------------------------------------------------------------
      async createCliente(data, tx) {
        const db2 = tx ?? this.db;
        const id = randomUUID2();
        await db2.insert(clientes).values({
          id,
          userId: data.userId,
          tipo: data.tipo,
          activo: data.activo ?? true,
          fechaCreacion: /* @__PURE__ */ new Date()
        });
        if (data.tipo === "natural") {
          const d = data;
          const personaId = randomUUID2();
          const documento = await assertDocumentoUnique(db2, d.documento);
          await db2.insert(personas).values({
            id: personaId,
            nombre: normalizeLooseText(d.nombre),
            apellido: normalizeLooseText(d.apellido),
            telefono: normalizeLooseText(d.telefono),
            documento,
            tipoDocumentoId: d.tipoDocumentoId,
            direccion: normalizeOptionalIdentity(d.direccion),
            departamentoId: d.departamentoId ?? null,
            municipioId: d.municipioId ?? null
          });
          await db2.insert(clientesNatural).values({ clienteId: id, personaId });
        } else {
          const d = data;
          const nit = await assertNitUnique(db2, d.nit);
          await db2.insert(clientesEmpresa).values({
            clienteId: id,
            razonSocial: normalizeRequiredIdentity(d.razonSocial, "La raz\xF3n social"),
            nit,
            sector: normalizeOptionalIdentity(d.sector),
            representanteLegalId: d.representanteLegalId ?? null
          });
        }
        const created = await this.getCliente(id, tx);
        if (!created) throw new Error("No se pudo crear el cliente");
        return created;
      }
      // ----------------------------------------------------------------
      // UPDATE
      // ----------------------------------------------------------------
      async updateCliente(id, updates, tx) {
        const db2 = tx ?? this.db;
        const { tipo, userId: userId2, activo, fechaCreacion, ...rest } = updates;
        const baseUpdates = {};
        if (activo !== void 0) baseUpdates.activo = activo;
        if (Object.keys(baseUpdates).length > 0) {
          await db2.update(clientes).set(baseUpdates).where(eq11(clientes.id, id));
        }
        const current = await this.getCliente(id);
        if (!current) return void 0;
        if (current.tipo === "natural") {
          const { nombre, apellido, telefono, documento, tipoDocumentoId, direccion, departamentoId, municipioId } = rest;
          const personaUpdates = {};
          if (nombre !== void 0) personaUpdates.nombre = normalizeLooseText(nombre);
          if (apellido !== void 0) personaUpdates.apellido = normalizeLooseText(apellido);
          if (telefono !== void 0) personaUpdates.telefono = normalizeLooseText(telefono);
          if (documento !== void 0) personaUpdates.documento = await assertDocumentoUnique(db2, documento, current.natural?.personaId);
          if (tipoDocumentoId !== void 0) personaUpdates.tipoDocumentoId = tipoDocumentoId;
          if (direccion !== void 0) personaUpdates.direccion = normalizeOptionalIdentity(direccion);
          if (departamentoId !== void 0) personaUpdates.departamentoId = departamentoId;
          if (municipioId !== void 0) personaUpdates.municipioId = municipioId;
          if (Object.keys(personaUpdates).length > 0 && current.natural?.personaId) {
            await db2.update(personas).set(personaUpdates).where(eq11(personas.id, current.natural.personaId));
          }
        } else {
          const { razonSocial, nit, sector, representanteLegalId } = rest;
          const empresaUpdates = {};
          if (razonSocial !== void 0) empresaUpdates.razonSocial = normalizeRequiredIdentity(razonSocial, "La raz\xF3n social");
          if (nit !== void 0) empresaUpdates.nit = await assertNitUnique(db2, nit, { excludeClienteEmpresaId: id });
          if (sector !== void 0) empresaUpdates.sector = normalizeOptionalIdentity(sector);
          if (representanteLegalId !== void 0) empresaUpdates.representanteLegalId = representanteLegalId;
          if (Object.keys(empresaUpdates).length > 0) {
            await db2.update(clientesEmpresa).set(empresaUpdates).where(eq11(clientesEmpresa.clienteId, id));
          }
        }
        return this.getCliente(id, tx);
      }
      // ----------------------------------------------------------------
      // DELETE
      // ----------------------------------------------------------------
      async deleteCliente(id) {
        await this.db.delete(clientes).where(eq11(clientes.id, id));
      }
      // ----------------------------------------------------------------
      // PRIVATE helpers
      // ----------------------------------------------------------------
      _mapRow(row) {
        return {
          id: row.id,
          userId: row.userId,
          tipo: row.tipo,
          activo: row.activo,
          fechaCreacion: row.fechaCreacion,
          user: row.user?.id ? row.user : null,
          natural: row.natural?.clienteId ? {
            clienteId: row.natural.clienteId,
            personaId: row.natural.personaId,
            persona: row.persona?.id ? {
              ...row.persona,
              tipoDocumento: row.persona.tipoDocumento?.id ? row.persona.tipoDocumento : null,
              departamento: row.persona.departamento?.id ? row.persona.departamento : null,
              municipio: row.persona.municipio?.id ? row.persona.municipio : null
            } : null
          } : null,
          empresa: row.empresa?.clienteId ? {
            clienteId: row.empresa.clienteId,
            razonSocial: row.empresa.razonSocial,
            nit: row.empresa.nit,
            sector: row.empresa.sector,
            representanteLegalId: row.empresa.representanteLegalId
          } : null
        };
      }
    };
  }
});

// server/storage/storeage/models/proceso-storage.ts
import { randomUUID as randomUUID3 } from "crypto";
import { eq as eq12, and as and7, desc as desc3, sql as sql5, inArray as inArray3, isNull as isNull2 } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
var ProcesoStorage;
var init_proceso_storage = __esm({
  "server/storage/storeage/models/proceso-storage.ts"() {
    "use strict";
    init_schema();
    ProcesoStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getActiveResponsable(procesoId) {
        const personasResponsable = alias(personas, "personasResponsable");
        const result = await this.db.select({
          lawyer: lawyerProfiles,
          personaId: personasResponsable.id,
          personaNombre: personasResponsable.nombre,
          personaApellido: personasResponsable.apellido,
          personaTelefono: personasResponsable.telefono,
          personaDocumento: personasResponsable.documento,
          personaDireccion: personasResponsable.direccion,
          personaTipoDocumentoId: personasResponsable.tipoDocumentoId,
          personaDepartamentoId: personasResponsable.departamentoId,
          personaMunicipioId: personasResponsable.municipioId,
          fechaInicio: procesoResponsables.fechaInicio,
          razon: procesoResponsables.razon,
          asignadoPorNombre: procesoResponsables.asignadoPorNombre
        }).from(procesoResponsables).innerJoin(lawyerProfiles, eq12(procesoResponsables.lawyerId, lawyerProfiles.id)).leftJoin(personasResponsable, eq12(lawyerProfiles.personaId, personasResponsable.id)).where(and7(
          eq12(procesoResponsables.procesoId, procesoId),
          eq12(procesoResponsables.activo, true)
        )).limit(1);
        if (!result[0]) return null;
        const r = result[0];
        return {
          lawyer: {
            ...r.lawyer,
            persona: r.personaId ? {
              id: r.personaId,
              nombre: r.personaNombre ?? "",
              apellido: r.personaApellido ?? "",
              telefono: r.personaTelefono ?? "",
              documento: r.personaDocumento ?? "",
              direccion: r.personaDireccion ?? "",
              tipoDocumentoId: r.personaTipoDocumentoId ?? 0,
              departamentoId: r.personaDepartamentoId,
              municipioId: r.personaMunicipioId
            } : null
          },
          fechaInicio: r.fechaInicio,
          razon: r.razon,
          asignadoPorNombre: r.asignadoPorNombre
        };
      }
      async getProcesos(lawyerId, limit = 10, offset = 0, filter) {
        const [lawyerProcesoIds, responsableProcesoIds, ownedProcesoIds] = await Promise.all([
          this.db.select({ procesoId: procesoLawyers.procesoId }).from(procesoLawyers).where(eq12(procesoLawyers.lawyerId, lawyerId)),
          this.db.select({ procesoId: procesoResponsables.procesoId }).from(procesoResponsables).where(and7(
            eq12(procesoResponsables.lawyerId, lawyerId),
            eq12(procesoResponsables.activo, true)
          )),
          this.db.select({ procesoId: procesoOwnership.procesoId }).from(procesoOwnership).where(and7(
            eq12(procesoOwnership.ownerType, "abogado"),
            eq12(procesoOwnership.ownerId, lawyerId),
            sql5`${procesoOwnership.activoUnique} = 1`
          ))
        ]);
        const procesoIds = [.../* @__PURE__ */ new Set([
          ...lawyerProcesoIds.map((p) => p.procesoId),
          ...responsableProcesoIds.map((p) => p.procesoId),
          ...ownedProcesoIds.map((p) => p.procesoId)
        ])];
        if (procesoIds.length === 0) return { data: [], total: 0 };
        const responsableLawyer = alias(lawyerProfiles, "responsableLawyer");
        const responsableJoin = alias(procesoResponsables, "responsableJoin");
        const personasResponsable = alias(personas, "personasResponsable");
        const personasCliente = alias(personas, "personasCliente");
        const deptosCliente = alias(departamentos, "deptosCliente");
        const municipiosCliente = alias(municipios, "municipiosCliente");
        const repLegal = alias(representantesLegales, "repLegal");
        const personasRepLegal = alias(personas, "personasRepLegal");
        const conditions = [inArray3(procesos.id, procesoIds), eq12(procesos.state, true)];
        if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
          conditions.push(eq12(estadosProceso.codigo, filter.estadoCodigo));
        }
        if (filter?.search) {
          const search = `%${filter.search}%`;
          conditions.push(
            sql5`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido})) LIKE LOWER(${search}) OR
        LOWER(${clientesEmpresa.razonSocial}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search}) OR
        LOWER(CONCAT(${personasResponsable.nombre}, ' ', ${personasResponsable.apellido})) LIKE LOWER(${search})
      )`
          );
        }
        if (filter?.hasResponsable !== void 0) {
          if (filter.hasResponsable) {
            conditions.push(sql5`EXISTS (
        SELECT 1 FROM proceso_responsables pr
        WHERE pr.proceso_id = ${procesos.id} AND pr.activo = 1
      )`);
          } else {
            conditions.push(sql5`NOT EXISTS (
        SELECT 1 FROM proceso_responsables pr
        WHERE pr.proceso_id = ${procesos.id} AND pr.activo = 1
      )`);
          }
        }
        const joinConditions = and7(
          eq12(responsableJoin.procesoId, procesos.id),
          eq12(responsableJoin.activo, true)
        );
        const baseJoins = (qb) => qb.leftJoin(clientes, eq12(procesos.clienteId, clientes.id)).leftJoin(clientesNatural, eq12(clientes.id, clientesNatural.clienteId)).leftJoin(personasCliente, eq12(clientesNatural.personaId, personasCliente.id)).leftJoin(deptosCliente, eq12(personasCliente.departamentoId, deptosCliente.id)).leftJoin(municipiosCliente, eq12(personasCliente.municipioId, municipiosCliente.id)).leftJoin(clientesEmpresa, eq12(clientes.id, clientesEmpresa.clienteId)).leftJoin(repLegal, eq12(clientesEmpresa.representanteLegalId, repLegal.id)).leftJoin(personasRepLegal, eq12(repLegal.personaId, personasRepLegal.id)).leftJoin(estadosProceso, eq12(procesos.estadoId, estadosProceso.id)).leftJoin(tiposProceso, eq12(procesos.tipoProcesoId, tiposProceso.id)).leftJoin(responsableJoin, joinConditions).leftJoin(responsableLawyer, eq12(responsableJoin.lawyerId, responsableLawyer.id)).leftJoin(personasResponsable, eq12(responsableLawyer.personaId, personasResponsable.id));
        const [{ count: count4 }] = await baseJoins(
          this.db.select({ count: sql5`COUNT(*)` }).from(procesos)
        ).where(and7(...conditions));
        const results = await baseJoins(
          this.db.select({
            id: procesos.id,
            state: procesos.state,
            fechaCreacion: procesos.fechaCreacion,
            clienteId: procesos.clienteId,
            tipoProcesoId: procesos.tipoProcesoId,
            radicado: procesos.radicado,
            juzgado: procesos.juzgado,
            estadoId: procesos.estadoId,
            descripcionEstado: procesos.descripcionEstado,
            clienteNombre: sql5`COALESCE(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido}), ${clientesEmpresa.razonSocial}, 'Sin cliente')`,
            clienteUserId: clientes.userId,
            tipoCliente: clientes.tipo,
            clienteDocumento: personasCliente.documento,
            clienteTelefono: personasCliente.telefono,
            clienteDepartamentoId: deptosCliente.id,
            clienteDepartamentoNombre: deptosCliente.nombre,
            clienteMunicipioId: municipiosCliente.id,
            clienteMunicipioNombre: municipiosCliente.nombre,
            repLegalId: repLegal.id,
            repLegalCargo: repLegal.cargo,
            repLegalEmail: repLegal.email,
            repLegalNombre: personasRepLegal.nombre,
            repLegalApellido: personasRepLegal.apellido,
            repLegalDocumento: personasRepLegal.documento,
            repLegalTelefono: personasRepLegal.telefono,
            tipoProcesoNombre: tiposProceso.nombre,
            estadoIdRel: estadosProceso.id,
            estadoCodigo: estadosProceso.codigo,
            estadoNombre: estadosProceso.nombre,
            estadoColor: estadosProceso.color,
            responsableLawyerData: responsableLawyer,
            responsablePersonaId: personasResponsable.id,
            responsablePersonaNombre: personasResponsable.nombre,
            responsablePersonaApellido: personasResponsable.apellido,
            responsablePersonaTelefono: personasResponsable.telefono,
            responsablePersonaDocumento: personasResponsable.documento,
            responsablePersonaDireccion: personasResponsable.direccion,
            responsablePersonaTipoDocumentoId: personasResponsable.tipoDocumentoId,
            responsablePersonaDepartamentoId: personasResponsable.departamentoId,
            responsablePersonaMunicipioId: personasResponsable.municipioId,
            responsableFechaInicio: responsableJoin.fechaInicio,
            responsableRazon: responsableJoin.razon,
            responsableAsignadoPorNombre: responsableJoin.asignadoPorNombre
          }).from(procesos)
        ).where(and7(...conditions)).orderBy(desc3(procesos.fechaCreacion)).limit(limit).offset(offset);
        const data = results.map((p) => ({
          id: p.id,
          state: p.state,
          fechaCreacion: p.fechaCreacion,
          clienteId: p.clienteId,
          tipoProcesoId: p.tipoProcesoId,
          radicado: p.radicado,
          juzgado: p.juzgado,
          estadoId: p.estadoId,
          descripcionEstado: p.descripcionEstado,
          clienteNombre: p.clienteNombre || "Sin cliente",
          clienteUserId: p.clienteUserId || void 0,
          tipoCliente: p.tipoCliente ?? null,
          clienteDocumento: p.clienteDocumento ?? null,
          clienteTelefono: p.clienteTelefono ?? null,
          clienteDepartamento: p.clienteDepartamentoId ? {
            id: p.clienteDepartamentoId,
            nombre: p.clienteDepartamentoNombre ?? ""
          } : null,
          clienteMunicipio: p.clienteMunicipioId ? {
            id: p.clienteMunicipioId,
            nombre: p.clienteMunicipioNombre ?? ""
          } : null,
          representanteLegal: p.repLegalId ? {
            id: p.repLegalId,
            cargo: p.repLegalCargo ?? "",
            email: p.repLegalEmail ?? "",
            nombre: p.repLegalNombre ?? "",
            apellido: p.repLegalApellido ?? "",
            documento: p.repLegalDocumento ?? null,
            telefono: p.repLegalTelefono ?? null
          } : null,
          estado: p.estadoIdRel ? {
            id: p.estadoIdRel,
            codigo: p.estadoCodigo || "",
            nombre: p.estadoNombre || "",
            color: p.estadoColor || ""
          } : null,
          responsable: p.responsableLawyerData ? {
            id: p.responsableLawyerData.id,
            fechaAsignacion: p.responsableFechaInicio ?? null,
            razon: p.responsableRazon ?? null,
            asignadoPorNombre: p.responsableAsignadoPorNombre ?? null,
            lawyer: {
              ...p.responsableLawyerData,
              persona: p.responsablePersonaId ? {
                id: p.responsablePersonaId,
                nombre: p.responsablePersonaNombre ?? "",
                apellido: p.responsablePersonaApellido ?? "",
                telefono: p.responsablePersonaTelefono ?? null,
                documento: p.responsablePersonaDocumento ?? null,
                direccion: p.responsablePersonaDireccion ?? null,
                tipoDocumentoId: p.responsablePersonaTipoDocumentoId ?? 0,
                departamentoId: p.responsablePersonaDepartamentoId ?? null,
                municipioId: p.responsablePersonaMunicipioId ?? null
              } : null
            }
          } : null
        }));
        return { data, total: Number(count4) };
      }
      async getProcesosCount(lawyerId, filter) {
        const lawyerProcesoIds = await this.db.select({ procesoId: procesoLawyers.procesoId }).from(procesoLawyers).where(eq12(procesoLawyers.lawyerId, lawyerId));
        const responsableProcesoIds = await this.db.select({ procesoId: procesoResponsables.procesoId }).from(procesoResponsables).where(and7(
          eq12(procesoResponsables.lawyerId, lawyerId),
          eq12(procesoResponsables.activo, true)
        ));
        const procesoIds = [.../* @__PURE__ */ new Set([
          ...lawyerProcesoIds.map((p) => p.procesoId),
          ...responsableProcesoIds.map((p) => p.procesoId)
        ])];
        if (procesoIds.length === 0) {
          return 0;
        }
        const personasCliente = alias(personas, "personasCliente");
        const conditions = [inArray3(procesos.id, procesoIds), eq12(procesos.state, true)];
        if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
          conditions.push(eq12(estadosProceso.codigo, filter.estadoCodigo));
        }
        if (filter?.search) {
          const search = `%${filter.search}%`;
          conditions.push(
            sql5`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido})) LIKE LOWER(${search}) OR
        LOWER(${clientesEmpresa.razonSocial}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search})
      )`
          );
        }
        const result = await this.db.select({ count: sql5`count(*)` }).from(procesos).leftJoin(clientes, eq12(procesos.clienteId, clientes.id)).leftJoin(clientesNatural, eq12(clientes.id, clientesNatural.clienteId)).leftJoin(personasCliente, eq12(clientesNatural.personaId, personasCliente.id)).leftJoin(clientesEmpresa, eq12(clientes.id, clientesEmpresa.clienteId)).leftJoin(estadosProceso, eq12(procesos.estadoId, estadosProceso.id)).leftJoin(tiposProceso, eq12(procesos.tipoProcesoId, tiposProceso.id)).where(and7(...conditions));
        return result[0]?.count || 0;
      }
      async getProcesosByCliente(clienteId, limit = 10, offset = 0, filter) {
        const responsableLawyer = alias(lawyerProfiles, "responsableLawyer");
        const responsableJoin = alias(procesoResponsables, "responsableJoin");
        const personasResponsable = alias(personas, "personasResponsable");
        const etapaActualJoin = alias(etapasPorTipoProceso, "etapaActualJoin");
        const joinConditions = and7(
          eq12(responsableJoin.procesoId, procesos.id),
          eq12(responsableJoin.activo, true)
        );
        const conditions = [eq12(procesos.clienteId, clienteId), eq12(procesos.state, true)];
        if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
          conditions.push(eq12(estadosProceso.codigo, filter.estadoCodigo));
        }
        if (filter?.search) {
          const search = `%${filter.search}%`;
          conditions.push(
            sql5`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search})
      )`
          );
        }
        const [{ count: count4 }] = await this.db.select({ count: sql5`COUNT(*)` }).from(procesos).leftJoin(estadosProceso, eq12(procesos.estadoId, estadosProceso.id)).leftJoin(tiposProceso, eq12(procesos.tipoProcesoId, tiposProceso.id)).where(and7(...conditions));
        const results = await this.db.select({
          id: procesos.id,
          state: procesos.state,
          fechaCreacion: procesos.fechaCreacion,
          clienteId: procesos.clienteId,
          tipoProcesoId: procesos.tipoProcesoId,
          radicado: procesos.radicado,
          juzgado: procesos.juzgado,
          estadoId: procesos.estadoId,
          descripcionEstado: procesos.descripcionEstado,
          legalStage: procesos.legalStage,
          tipoProcesoNombre: tiposProceso.nombre,
          estadoIdRel: estadosProceso.id,
          estadoCodigo: estadosProceso.codigo,
          estadoNombre: estadosProceso.nombre,
          estadoColor: estadosProceso.color,
          responsableLawyerData: responsableLawyer,
          responsablePersonaId: personasResponsable.id,
          responsablePersonaNombre: personasResponsable.nombre,
          responsablePersonaApellido: personasResponsable.apellido,
          responsableFechaInicio: responsableJoin.fechaInicio,
          responsableRazon: responsableJoin.razon,
          responsableAsignadoPorNombre: responsableJoin.asignadoPorNombre,
          etapaCodigo: etapaActualJoin.codigo,
          etapaNombre: etapaActualJoin.nombre,
          etapaColor: etapaActualJoin.color,
          etapaOrden: etapaActualJoin.orden
        }).from(procesos).leftJoin(estadosProceso, eq12(procesos.estadoId, estadosProceso.id)).leftJoin(tiposProceso, eq12(procesos.tipoProcesoId, tiposProceso.id)).leftJoin(responsableJoin, joinConditions).leftJoin(responsableLawyer, eq12(responsableJoin.lawyerId, responsableLawyer.id)).leftJoin(personasResponsable, eq12(responsableLawyer.personaId, personasResponsable.id)).leftJoin(etapaActualJoin, and7(
          sql5`${etapaActualJoin.codigo} = ${procesos.legalStage}`,
          isNull2(etapaActualJoin.tipoProcesoId)
        )).where(and7(...conditions)).orderBy(desc3(procesos.fechaCreacion)).limit(limit).offset(offset);
        const data = results.map((p) => ({
          id: p.id,
          state: p.state,
          fechaCreacion: p.fechaCreacion,
          clienteId: p.clienteId,
          tipoProcesoId: p.tipoProcesoId,
          radicado: p.radicado,
          juzgado: p.juzgado,
          estadoId: p.estadoId,
          descripcionEstado: p.descripcionEstado,
          legalStage: p.legalStage ?? null,
          clienteNombre: "Sin cliente",
          tipoProceso: p.tipoProcesoNombre ? { nombre: p.tipoProcesoNombre } : null,
          estado: p.estadoIdRel ? {
            id: p.estadoIdRel,
            codigo: p.estadoCodigo || "",
            nombre: p.estadoNombre || "",
            color: p.estadoColor || ""
          } : null,
          responsable: p.responsableLawyerData ? {
            id: p.responsableLawyerData.id,
            fechaAsignacion: p.responsableFechaInicio ?? null,
            razon: p.responsableRazon ?? null,
            asignadoPorNombre: p.responsableAsignadoPorNombre ?? null,
            lawyer: {
              ...p.responsableLawyerData,
              persona: p.responsablePersonaId ? {
                id: p.responsablePersonaId,
                nombre: p.responsablePersonaNombre ?? "",
                apellido: p.responsablePersonaApellido ?? ""
              } : null
            }
          } : null,
          etapaActual: p.etapaCodigo ? {
            codigo: p.etapaCodigo,
            nombre: p.etapaNombre,
            color: p.etapaColor,
            orden: p.etapaOrden
          } : null
        }));
        return { data, total: Number(count4) };
      }
      async getProceso(id) {
        const rawProceso = await this.db.query.procesos.findFirst({
          where: and7(eq12(procesos.id, id), eq12(procesos.state, true)),
          with: {
            cliente: { with: { natural: { with: { persona: true } }, empresa: true } },
            estado: true,
            tipoProceso: true
          }
        });
        if (!rawProceso) return void 0;
        const responsableMeta = await this.getActiveResponsable(id);
        return {
          id: rawProceso.id,
          state: rawProceso.state,
          fechaCreacion: rawProceso.fechaCreacion,
          clienteId: rawProceso.clienteId,
          tipoProcesoId: rawProceso.tipoProcesoId,
          radicado: rawProceso.radicado,
          juzgado: rawProceso.juzgado,
          estadoId: rawProceso.estadoId,
          descripcionEstado: rawProceso.descripcionEstado,
          responsable: responsableMeta ? {
            id: responsableMeta.lawyer?.id ?? null,
            fechaAsignacion: responsableMeta.fechaInicio ?? null,
            razon: responsableMeta.razon ?? null,
            asignadoPorNombre: responsableMeta.asignadoPorNombre ?? null,
            lawyer: responsableMeta.lawyer ?? null
          } : null,
          clienteNombre: this.getClienteNombre(rawProceso.cliente),
          clienteUserId: rawProceso.cliente?.userId ?? void 0,
          communityPostId: rawProceso.communityPostId ?? null,
          legalStage: rawProceso.legalStage ?? null,
          fechaVencimientoEtapa: rawProceso.fechaVencimientoEtapa ?? null,
          estado: rawProceso.estado ? {
            id: rawProceso.estado.id,
            codigo: rawProceso.estado.codigo,
            nombre: rawProceso.estado.nombre,
            color: rawProceso.estado.color
          } : null
        };
      }
      async createProceso(insertProceso) {
        const id = randomUUID3();
        const fechaCreacion = insertProceso.fechaCreacion ? new Date(insertProceso.fechaCreacion) : /* @__PURE__ */ new Date();
        const { fechaCreacion: _fechaCreacion, ...procesoWithoutFecha } = insertProceso;
        const newProceso = {
          ...procesoWithoutFecha,
          id,
          fechaCreacion,
          tipoProcesoId: insertProceso.tipoProcesoId ?? null,
          state: insertProceso.state ?? true,
          clienteNombre: "",
          descripcionEstado: insertProceso.descripcionEstado ?? "",
          estado: null
        };
        await this.db.insert(procesos).values(newProceso);
        return newProceso;
      }
      /** Vincula un proceso existente con un post de comunidad (bidireccional). */
      async setCommunityPostId(procesoId, communityPostId) {
        await this.db.update(procesos).set({ communityPostId }).where(eq12(procesos.id, procesoId));
      }
      // Obtener todos los procesos donde un abogado es responsable activo
      async getActiveProcesosByResponsable(lawyerId) {
        const rows = await this.db.select({ id: procesos.id, radicado: procesos.radicado }).from(procesoResponsables).innerJoin(procesos, eq12(procesoResponsables.procesoId, procesos.id)).where(and7(
          eq12(procesoResponsables.lawyerId, lawyerId),
          eq12(procesoResponsables.activo, true),
          eq12(procesos.state, true)
        ));
        return rows;
      }
      async setResponsable(procesoId, responsableId, options = {}) {
        await this.db.update(procesoResponsables).set({ activo: false, fechaFin: /* @__PURE__ */ new Date() }).where(and7(
          eq12(procesoResponsables.procesoId, procesoId),
          eq12(procesoResponsables.activo, true)
        ));
        if (responsableId) {
          await this.db.insert(procesoResponsables).values({
            id: randomUUID3(),
            procesoId,
            lawyerId: responsableId,
            asignadoPor: null,
            // FK removed - use asignadoPorNombre instead
            asignadoPorNombre: options.asignadoPorNombre ?? null,
            fechaInicio: /* @__PURE__ */ new Date(),
            razon: options.razon ?? null,
            activo: true
          });
        }
        return this.getProceso(procesoId);
      }
      async updateProceso(id, updates) {
        const processedUpdates = {
          ...updates,
          state: updates.state ?? true,
          ...updates.fechaCreacion ? { fechaCreacion: new Date(updates.fechaCreacion) } : {}
        };
        await this.db.update(procesos).set(processedUpdates).where(eq12(procesos.id, id));
        return this.getProceso(id);
      }
      async deleteProceso(id) {
        await this.db.update(procesos).set({ state: false }).where(eq12(procesos.id, id));
      }
      // Get lawyers assigned to a proceso
      async getProcesoLawyers(procesoId) {
        return this.db.select().from(procesoLawyers).where(eq12(procesoLawyers.procesoId, procesoId));
      }
      // Assign a lawyer to a proceso
      async addLawyerToProceso(procesoId, lawyerId, options = {}) {
        const id = randomUUID3();
        await this.db.insert(procesoLawyers).values({
          id,
          procesoId,
          lawyerId,
          rol: options.rol ?? "responsable",
          tipoAsignacionId: options.tipoAsignacionId ?? null,
          razonAsignacion: options.razonAsignacion ?? null,
          asignadoPor: options.asignadoPor ?? null,
          fechaFin: options.fechaFin ?? null,
          status: options.status ?? "activo"
        });
      }
      // Remove a lawyer from a proceso
      async removeLawyerFromProceso(procesoId, lawyerId) {
        await this.db.delete(procesoLawyers).where(and7(
          eq12(procesoLawyers.procesoId, procesoId),
          eq12(procesoLawyers.lawyerId, lawyerId)
        ));
      }
      /**
       * Deactivate a lawyer from multiple procesos (set status = "inactivo").
       * Used when a lawyer leaves a firm.
       */
      async removeAbogadoFromProcesos(lawyerId, procesoIds) {
        if (procesoIds.length === 0) return;
        for (const procesoId of procesoIds) {
          await this.db.update(procesoLawyers).set({ status: "inactivo", fechaFin: /* @__PURE__ */ new Date() }).where(and7(
            eq12(procesoLawyers.lawyerId, lawyerId),
            eq12(procesoLawyers.procesoId, procesoId),
            eq12(procesoLawyers.status, "activo")
          ));
        }
      }
      /**
       * Deactivate a lawyer as responsable in multiple procesos.
       * Used when a lawyer leaves a firm.
       */
      async desactivarResponsable(lawyerId, procesoIds) {
        if (procesoIds.length === 0) return;
        for (const procesoId of procesoIds) {
          await this.db.update(procesoResponsables).set({ activo: false }).where(and7(
            eq12(procesoResponsables.lawyerId, lawyerId),
            eq12(procesoResponsables.procesoId, procesoId),
            eq12(procesoResponsables.activo, true)
          ));
        }
      }
      async getProcesosByClienteAndLawyer(lawyerId, clienteId, limit = 10, offset = 0, filter) {
        const lawyerProcesoIds = await this.db.select({ procesoId: procesoLawyers.procesoId }).from(procesoLawyers).where(eq12(procesoLawyers.lawyerId, lawyerId));
        const responsableProcesoIds = await this.db.select({ procesoId: procesoResponsables.procesoId }).from(procesoResponsables).where(and7(
          eq12(procesoResponsables.lawyerId, lawyerId),
          eq12(procesoResponsables.activo, true)
        ));
        const procesoIds = [.../* @__PURE__ */ new Set([
          ...lawyerProcesoIds.map((p) => p.procesoId),
          ...responsableProcesoIds.map((p) => p.procesoId)
        ])];
        if (procesoIds.length === 0) {
          return { data: [], total: 0 };
        }
        const personasCliente = alias(personas, "personasCliente");
        const conditions = [
          inArray3(procesos.id, procesoIds),
          eq12(procesos.clienteId, clienteId),
          eq12(procesos.state, true)
        ];
        if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
          conditions.push(eq12(estadosProceso.codigo, filter.estadoCodigo));
        }
        if (filter?.search) {
          const search = `%${filter.search}%`;
          conditions.push(
            sql5`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido})) LIKE LOWER(${search}) OR
        LOWER(${clientesEmpresa.razonSocial}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search})
      )`
          );
        }
        const [{ count: count4 }] = await this.db.select({ count: sql5`COUNT(*)` }).from(procesos).leftJoin(clientes, eq12(procesos.clienteId, clientes.id)).leftJoin(clientesNatural, eq12(clientes.id, clientesNatural.clienteId)).leftJoin(personasCliente, eq12(clientesNatural.personaId, personasCliente.id)).leftJoin(clientesEmpresa, eq12(clientes.id, clientesEmpresa.clienteId)).leftJoin(estadosProceso, eq12(procesos.estadoId, estadosProceso.id)).leftJoin(tiposProceso, eq12(procesos.tipoProcesoId, tiposProceso.id)).where(and7(...conditions));
        const results = await this.db.select({
          id: procesos.id,
          state: procesos.state,
          fechaCreacion: procesos.fechaCreacion,
          clienteId: procesos.clienteId,
          tipoProcesoId: procesos.tipoProcesoId,
          radicado: procesos.radicado,
          juzgado: procesos.juzgado,
          estadoId: procesos.estadoId,
          descripcionEstado: procesos.descripcionEstado,
          clienteNombre: sql5`COALESCE(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido}), ${clientesEmpresa.razonSocial}, 'Sin cliente')`,
          tipoProcesoNombre: tiposProceso.nombre,
          estadoIdRel: estadosProceso.id,
          estadoCodigo: estadosProceso.codigo,
          estadoNombre: estadosProceso.nombre,
          estadoColor: estadosProceso.color
        }).from(procesos).leftJoin(clientes, eq12(procesos.clienteId, clientes.id)).leftJoin(clientesNatural, eq12(clientes.id, clientesNatural.clienteId)).leftJoin(personasCliente, eq12(clientesNatural.personaId, personasCliente.id)).leftJoin(clientesEmpresa, eq12(clientes.id, clientesEmpresa.clienteId)).leftJoin(estadosProceso, eq12(procesos.estadoId, estadosProceso.id)).leftJoin(tiposProceso, eq12(procesos.tipoProcesoId, tiposProceso.id)).where(and7(...conditions)).orderBy(desc3(procesos.fechaCreacion)).limit(limit).offset(offset);
        const data = results.map((p) => ({
          id: p.id,
          state: p.state,
          fechaCreacion: p.fechaCreacion,
          clienteId: p.clienteId,
          tipoProcesoId: p.tipoProcesoId,
          radicado: p.radicado,
          juzgado: p.juzgado,
          estadoId: p.estadoId,
          descripcionEstado: p.descripcionEstado,
          clienteNombre: p.clienteNombre || "Sin cliente",
          estado: p.estadoIdRel ? {
            id: p.estadoIdRel,
            codigo: p.estadoCodigo || "",
            nombre: p.estadoNombre || "",
            color: p.estadoColor || ""
          } : null
        }));
        return { data, total: Number(count4) };
      }
      async getProcesoByAbogadoIdAndProcesoId(lawyerId, procesoId) {
        const [lawyerProceso, responsableProceso] = await Promise.all([
          this.db.select({ procesoId: procesoLawyers.procesoId }).from(procesoLawyers).where(and7(
            eq12(procesoLawyers.lawyerId, lawyerId),
            eq12(procesoLawyers.procesoId, procesoId)
          )).limit(1),
          this.db.select({ procesoId: procesoResponsables.procesoId }).from(procesoResponsables).where(and7(
            eq12(procesoResponsables.procesoId, procesoId),
            eq12(procesoResponsables.lawyerId, lawyerId),
            eq12(procesoResponsables.activo, true)
          )).limit(1)
        ]);
        if (lawyerProceso.length === 0 && responsableProceso.length === 0) return void 0;
        const rawProceso = await this.db.query.procesos.findFirst({
          where: eq12(procesos.id, procesoId),
          with: {
            cliente: { with: { natural: { with: { persona: true } }, empresa: true } },
            tipoProceso: true,
            estado: true,
            lawyers: {
              with: {
                lawyer: {
                  with: {
                    persona: {
                      columns: {
                        nombre: true,
                        apellido: true
                      }
                    }
                  }
                },
                tipoAsignacion: true,
                asignadoPorUser: {
                  columns: {
                    email: true,
                    name: true
                  }
                }
              }
            }
          }
        });
        if (!rawProceso) return void 0;
        const responsableMeta = await this.getActiveResponsable(procesoId);
        return {
          id: rawProceso.id,
          state: rawProceso.state,
          fechaCreacion: rawProceso.fechaCreacion,
          clienteId: rawProceso.clienteId,
          tipoProcesoId: rawProceso.tipoProcesoId,
          radicado: rawProceso.radicado,
          juzgado: rawProceso.juzgado,
          estadoId: rawProceso.estadoId,
          descripcionEstado: rawProceso.descripcionEstado,
          responsable: responsableMeta ? {
            id: responsableMeta.lawyer?.id ?? null,
            fechaAsignacion: responsableMeta.fechaInicio ?? null,
            razon: responsableMeta.razon ?? null,
            asignadoPorNombre: responsableMeta.asignadoPorNombre ?? null,
            lawyer: responsableMeta.lawyer ?? null
          } : null,
          clienteNombre: this.getClienteNombre(rawProceso.cliente),
          clienteUserId: rawProceso.cliente?.userId ?? void 0,
          communityPostId: rawProceso.communityPostId ?? null,
          cliente: rawProceso.cliente,
          tipoProceso: rawProceso.tipoProceso ?? null,
          estado: rawProceso.estado ?? null,
          lawyers: rawProceso.lawyers.map((l) => ({
            id: l.id,
            procesoId: l.procesoId,
            lawyerId: l.lawyerId,
            tipoAsignacionId: l.tipoAsignacionId ?? null,
            rol: l.rol,
            razonAsignacion: l.razonAsignacion ?? null,
            fechaAsignacion: l.fechaAsignacion,
            fechaFin: l.fechaFin ?? null,
            asignadoPor: l.asignadoPor ?? null,
            status: l.status,
            lawyer: l.lawyer,
            tipoAsignacion: l.tipoAsignacion ?? null,
            asignadoPorUser: l.asignadoPorUser ?? null
          }))
        };
      }
      getClienteNombre(cliente) {
        if (!cliente) return "Sin cliente";
        if (cliente.natural?.persona) {
          return `${cliente.natural.persona.nombre} ${cliente.natural.persona.apellido}`.trim();
        }
        if (cliente.empresa?.razonSocial) return cliente.empresa.razonSocial;
        return "Sin cliente";
      }
      // Helper privado reutilizable
      async getResponsablesMap(procesoIds) {
        const map = /* @__PURE__ */ new Map();
        if (procesoIds.length === 0) return map;
        const personasResponsable = alias(personas, "personasResponsable");
        const rows = await this.db.select({
          procesoId: procesoResponsables.procesoId,
          lawyer: lawyerProfiles,
          personaId: personasResponsable.id,
          personaNombre: personasResponsable.nombre,
          personaApellido: personasResponsable.apellido,
          fechaInicio: procesoResponsables.fechaInicio,
          razon: procesoResponsables.razon,
          asignadoPorNombre: procesoResponsables.asignadoPorNombre
        }).from(procesoResponsables).innerJoin(lawyerProfiles, eq12(procesoResponsables.lawyerId, lawyerProfiles.id)).leftJoin(personasResponsable, eq12(lawyerProfiles.personaId, personasResponsable.id)).where(and7(
          inArray3(procesoResponsables.procesoId, procesoIds),
          eq12(procesoResponsables.activo, true)
        ));
        for (const r of rows) {
          map.set(r.procesoId, {
            lawyer: {
              ...r.lawyer,
              persona: r.personaId ? {
                id: r.personaId,
                nombre: r.personaNombre ?? "",
                apellido: r.personaApellido ?? ""
              } : null
            },
            fechaInicio: r.fechaInicio,
            razon: r.razon,
            asignadoPorNombre: r.asignadoPorNombre
          });
        }
        return map;
      }
      // Helper para mapear resultado a DTO
      mapToProcesoDTO(p, responsablesMap) {
        const responsableMeta = responsablesMap.get(p.id);
        return {
          id: p.id,
          state: p.state,
          fechaCreacion: p.fechaCreacion,
          clienteId: p.clienteId,
          tipoProcesoId: p.tipoProcesoId,
          radicado: p.radicado,
          juzgado: p.juzgado,
          estadoId: p.estadoId,
          descripcionEstado: p.descripcionEstado,
          clienteNombre: p.clienteNombre || "Sin cliente",
          clienteUserId: p.clienteUserId || void 0,
          estado: p.estadoIdRel ? {
            id: p.estadoIdRel,
            codigo: p.estadoCodigo || "",
            nombre: p.estadoNombre || "",
            color: p.estadoColor || ""
          } : null,
          responsable: responsableMeta ? {
            id: responsableMeta.lawyer?.id ?? null,
            fechaAsignacion: responsableMeta.fechaInicio ?? null,
            razon: responsableMeta.razon ?? null,
            asignadoPorNombre: responsableMeta.asignadoPorNombre ?? null,
            lawyer: responsableMeta.lawyer ? {
              id: responsableMeta.lawyer.id,
              persona: responsableMeta.lawyer.persona ? {
                id: responsableMeta.lawyer.persona.id ?? null,
                nombre: responsableMeta.lawyer.persona.nombre,
                apellido: responsableMeta.lawyer.persona.apellido
              } : null
            } : null
          } : null
        };
      }
      async getProcesosByFirma(firmId, limit = 10, offset = 0, filter) {
        const ownedRows = await this.db.select({ procesoId: procesoOwnership.procesoId }).from(procesoOwnership).where(and7(
          eq12(procesoOwnership.ownerType, "bufete"),
          eq12(procesoOwnership.ownerId, firmId),
          eq12(procesoOwnership.activoUnique, 1)
        ));
        const procesoIds = [...new Set(ownedRows.map((r) => r.procesoId))];
        if (procesoIds.length === 0) return { data: [], total: 0 };
        const responsableLawyer = alias(lawyerProfiles, "responsableLawyer");
        const responsableJoin = alias(procesoResponsables, "responsableJoin");
        const personasResponsable = alias(personas, "personasResponsable");
        const personasCliente = alias(personas, "personasCliente");
        const deptosCliente = alias(departamentos, "deptosCliente");
        const municipiosCliente = alias(municipios, "municipiosCliente");
        const repLegal = alias(representantesLegales, "repLegal");
        const personasRepLegal = alias(personas, "personasRepLegal");
        const conditions = [inArray3(procesos.id, procesoIds), eq12(procesos.state, true)];
        if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
          conditions.push(eq12(estadosProceso.codigo, filter.estadoCodigo));
        }
        if (filter?.search) {
          const search = `%${filter.search}%`;
          conditions.push(
            sql5`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido})) LIKE LOWER(${search}) OR
        LOWER(${clientesEmpresa.razonSocial}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search}) OR
        LOWER(CONCAT(${personasResponsable.nombre}, ' ', ${personasResponsable.apellido})) LIKE LOWER(${search})
      )`
          );
        }
        if (filter?.hasResponsable !== void 0) {
          if (filter.hasResponsable) {
            conditions.push(sql5`EXISTS (
        SELECT 1 FROM proceso_responsables pr
        WHERE pr.proceso_id = ${procesos.id} AND pr.activo = 1
      )`);
          } else {
            conditions.push(sql5`NOT EXISTS (
        SELECT 1 FROM proceso_responsables pr
        WHERE pr.proceso_id = ${procesos.id} AND pr.activo = 1
      )`);
          }
        }
        const joinConditions = and7(
          eq12(responsableJoin.procesoId, procesos.id),
          eq12(responsableJoin.activo, true)
        );
        const [{ count: count4 }] = await this.db.select({ count: sql5`COUNT(*)` }).from(procesos).leftJoin(clientes, eq12(procesos.clienteId, clientes.id)).leftJoin(clientesNatural, eq12(clientes.id, clientesNatural.clienteId)).leftJoin(personasCliente, eq12(clientesNatural.personaId, personasCliente.id)).leftJoin(deptosCliente, eq12(personasCliente.departamentoId, deptosCliente.id)).leftJoin(municipiosCliente, eq12(personasCliente.municipioId, municipiosCliente.id)).leftJoin(clientesEmpresa, eq12(clientes.id, clientesEmpresa.clienteId)).leftJoin(repLegal, eq12(clientesEmpresa.representanteLegalId, repLegal.id)).leftJoin(personasRepLegal, eq12(repLegal.personaId, personasRepLegal.id)).leftJoin(estadosProceso, eq12(procesos.estadoId, estadosProceso.id)).leftJoin(tiposProceso, eq12(procesos.tipoProcesoId, tiposProceso.id)).leftJoin(responsableJoin, joinConditions).leftJoin(responsableLawyer, eq12(responsableJoin.lawyerId, responsableLawyer.id)).leftJoin(personasResponsable, eq12(responsableLawyer.personaId, personasResponsable.id)).where(and7(...conditions));
        const results = await this.db.select({
          id: procesos.id,
          state: procesos.state,
          fechaCreacion: procesos.fechaCreacion,
          clienteId: procesos.clienteId,
          tipoProcesoId: procesos.tipoProcesoId,
          radicado: procesos.radicado,
          juzgado: procesos.juzgado,
          estadoId: procesos.estadoId,
          descripcionEstado: procesos.descripcionEstado,
          clienteNombre: sql5`COALESCE(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido}), ${clientesEmpresa.razonSocial}, 'Sin cliente')`,
          clienteUserId: clientes.userId,
          tipoCliente: clientes.tipo,
          clienteDocumento: personasCliente.documento,
          clienteTelefono: personasCliente.telefono,
          clienteDepartamentoId: deptosCliente.id,
          clienteDepartamentoNombre: deptosCliente.nombre,
          clienteMunicipioId: municipiosCliente.id,
          clienteMunicipioNombre: municipiosCliente.nombre,
          repLegalId: repLegal.id,
          repLegalCargo: repLegal.cargo,
          repLegalEmail: repLegal.email,
          repLegalNombre: personasRepLegal.nombre,
          repLegalApellido: personasRepLegal.apellido,
          repLegalDocumento: personasRepLegal.documento,
          repLegalTelefono: personasRepLegal.telefono,
          tipoProcesoNombre: tiposProceso.nombre,
          estadoIdRel: estadosProceso.id,
          estadoCodigo: estadosProceso.codigo,
          estadoNombre: estadosProceso.nombre,
          estadoColor: estadosProceso.color,
          responsableLawyerData: responsableLawyer,
          responsablePersonaId: personasResponsable.id,
          responsablePersonaNombre: personasResponsable.nombre,
          responsablePersonaApellido: personasResponsable.apellido,
          responsablePersonaTelefono: personasResponsable.telefono,
          responsablePersonaDocumento: personasResponsable.documento,
          responsablePersonaDireccion: personasResponsable.direccion,
          responsablePersonaTipoDocumentoId: personasResponsable.tipoDocumentoId,
          responsablePersonaDepartamentoId: personasResponsable.departamentoId,
          responsablePersonaMunicipioId: personasResponsable.municipioId,
          responsableFechaInicio: responsableJoin.fechaInicio,
          responsableRazon: responsableJoin.razon,
          responsableAsignadoPorNombre: responsableJoin.asignadoPorNombre
        }).from(procesos).leftJoin(clientes, eq12(procesos.clienteId, clientes.id)).leftJoin(clientesNatural, eq12(clientes.id, clientesNatural.clienteId)).leftJoin(personasCliente, eq12(clientesNatural.personaId, personasCliente.id)).leftJoin(deptosCliente, eq12(personasCliente.departamentoId, deptosCliente.id)).leftJoin(municipiosCliente, eq12(personasCliente.municipioId, municipiosCliente.id)).leftJoin(clientesEmpresa, eq12(clientes.id, clientesEmpresa.clienteId)).leftJoin(repLegal, eq12(clientesEmpresa.representanteLegalId, repLegal.id)).leftJoin(personasRepLegal, eq12(repLegal.personaId, personasRepLegal.id)).leftJoin(estadosProceso, eq12(procesos.estadoId, estadosProceso.id)).leftJoin(tiposProceso, eq12(procesos.tipoProcesoId, tiposProceso.id)).leftJoin(responsableJoin, joinConditions).leftJoin(responsableLawyer, eq12(responsableJoin.lawyerId, responsableLawyer.id)).leftJoin(personasResponsable, eq12(responsableLawyer.personaId, personasResponsable.id)).where(and7(...conditions)).orderBy(desc3(procesos.fechaCreacion)).limit(limit).offset(offset);
        const data = results.map((p) => ({
          id: p.id,
          state: p.state,
          fechaCreacion: p.fechaCreacion,
          clienteId: p.clienteId,
          tipoProcesoId: p.tipoProcesoId,
          radicado: p.radicado,
          juzgado: p.juzgado,
          estadoId: p.estadoId,
          descripcionEstado: p.descripcionEstado,
          clienteNombre: p.clienteNombre || "Sin cliente",
          clienteUserId: p.clienteUserId || void 0,
          tipoCliente: p.tipoCliente ?? null,
          clienteDocumento: p.clienteDocumento ?? null,
          clienteTelefono: p.clienteTelefono ?? null,
          clienteDepartamento: p.clienteDepartamentoId ? {
            id: p.clienteDepartamentoId,
            nombre: p.clienteDepartamentoNombre ?? ""
          } : null,
          clienteMunicipio: p.clienteMunicipioId ? {
            id: p.clienteMunicipioId,
            nombre: p.clienteMunicipioNombre ?? ""
          } : null,
          representanteLegal: p.repLegalId ? {
            id: p.repLegalId,
            cargo: p.repLegalCargo ?? "",
            email: p.repLegalEmail ?? "",
            nombre: p.repLegalNombre ?? "",
            apellido: p.repLegalApellido ?? "",
            documento: p.repLegalDocumento ?? null,
            telefono: p.repLegalTelefono ?? null
          } : null,
          estado: p.estadoIdRel ? {
            id: p.estadoIdRel,
            codigo: p.estadoCodigo || "",
            nombre: p.estadoNombre || "",
            color: p.estadoColor || ""
          } : null,
          responsable: p.responsableLawyerData ? {
            id: p.responsableLawyerData.id,
            fechaAsignacion: p.responsableFechaInicio ?? null,
            razon: p.responsableRazon ?? null,
            asignadoPorNombre: p.responsableAsignadoPorNombre ?? null,
            lawyer: {
              ...p.responsableLawyerData,
              persona: p.responsablePersonaId ? {
                id: p.responsablePersonaId,
                nombre: p.responsablePersonaNombre ?? "",
                apellido: p.responsablePersonaApellido ?? "",
                telefono: p.responsablePersonaTelefono ?? null,
                documento: p.responsablePersonaDocumento ?? null,
                direccion: p.responsablePersonaDireccion ?? null,
                tipoDocumentoId: p.responsablePersonaTipoDocumentoId ?? 0,
                departamentoId: p.responsablePersonaDepartamentoId ?? null,
                municipioId: p.responsablePersonaMunicipioId ?? null
              } : null
            }
          } : null
        }));
        return { data, total: Number(count4) };
      }
      async getProcesosByClienteAndFirma(firmId, clienteId, limit = 10, offset = 0, filter) {
        const ownedRows = await this.db.select({ procesoId: procesoOwnership.procesoId }).from(procesoOwnership).where(and7(
          eq12(procesoOwnership.ownerType, "bufete"),
          eq12(procesoOwnership.ownerId, firmId),
          eq12(procesoOwnership.activoUnique, 1)
        ));
        const procesoIds = [...new Set(ownedRows.map((r) => r.procesoId))];
        if (procesoIds.length === 0) return { data: [], total: 0 };
        const conditions = [
          inArray3(procesos.id, procesoIds),
          eq12(procesos.clienteId, clienteId),
          eq12(procesos.state, true)
        ];
        if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
          conditions.push(eq12(estadosProceso.codigo, filter.estadoCodigo));
        }
        if (filter?.search) {
          const search = `%${filter.search}%`;
          conditions.push(
            sql5`(
        LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
        LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
        LOWER(${tiposProceso.nombre}) LIKE LOWER(${search})
      )`
          );
        }
        const personasCliente = alias(personas, "personasCliente");
        const [{ count: count4 }] = await this.db.select({ count: sql5`COUNT(*)` }).from(procesos).leftJoin(clientes, eq12(procesos.clienteId, clientes.id)).leftJoin(clientesNatural, eq12(clientes.id, clientesNatural.clienteId)).leftJoin(personasCliente, eq12(clientesNatural.personaId, personasCliente.id)).leftJoin(clientesEmpresa, eq12(clientes.id, clientesEmpresa.clienteId)).leftJoin(estadosProceso, eq12(procesos.estadoId, estadosProceso.id)).leftJoin(tiposProceso, eq12(procesos.tipoProcesoId, tiposProceso.id)).where(and7(...conditions));
        const results = await this.db.select({
          id: procesos.id,
          state: procesos.state,
          fechaCreacion: procesos.fechaCreacion,
          clienteId: procesos.clienteId,
          tipoProcesoId: procesos.tipoProcesoId,
          radicado: procesos.radicado,
          juzgado: procesos.juzgado,
          estadoId: procesos.estadoId,
          descripcionEstado: procesos.descripcionEstado,
          clienteNombre: sql5`COALESCE(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido}), ${clientesEmpresa.razonSocial}, 'Sin cliente')`,
          clienteUserId: clientes.userId,
          estadoIdRel: estadosProceso.id,
          estadoCodigo: estadosProceso.codigo,
          estadoNombre: estadosProceso.nombre,
          estadoColor: estadosProceso.color
        }).from(procesos).leftJoin(clientes, eq12(procesos.clienteId, clientes.id)).leftJoin(clientesNatural, eq12(clientes.id, clientesNatural.clienteId)).leftJoin(personasCliente, eq12(clientesNatural.personaId, personasCliente.id)).leftJoin(clientesEmpresa, eq12(clientes.id, clientesEmpresa.clienteId)).leftJoin(estadosProceso, eq12(procesos.estadoId, estadosProceso.id)).leftJoin(tiposProceso, eq12(procesos.tipoProcesoId, tiposProceso.id)).where(and7(...conditions)).orderBy(desc3(procesos.fechaCreacion)).limit(limit).offset(offset);
        const responsablesMap = await this.getResponsablesMap(results.map((p) => p.id));
        return {
          data: results.map((p) => this.mapToProcesoDTO(p, responsablesMap)),
          total: Number(count4)
        };
      }
      async getProcesoByFirmaIdAndProcesoId(firmId, procesoId) {
        const ownedRow = await this.db.select({ procesoId: procesoOwnership.procesoId }).from(procesoOwnership).where(and7(
          eq12(procesoOwnership.ownerType, "bufete"),
          eq12(procesoOwnership.ownerId, firmId),
          eq12(procesoOwnership.procesoId, procesoId),
          eq12(procesoOwnership.activoUnique, 1)
        )).limit(1).then((r) => r[0] ?? null);
        if (!ownedRow) return void 0;
        const rawProceso = await this.db.query.procesos.findFirst({
          where: eq12(procesos.id, procesoId),
          with: {
            cliente: { with: { natural: { with: { persona: true } }, empresa: true } },
            tipoProceso: true,
            estado: true,
            lawyers: {
              with: {
                lawyer: true,
                tipoAsignacion: true,
                asignadoPorUser: {
                  columns: {
                    id: true,
                    email: true,
                    name: true
                  }
                }
              }
            }
          }
        });
        if (!rawProceso) return void 0;
        const responsableMeta = await this.getActiveResponsable(procesoId);
        return {
          id: rawProceso.id,
          state: rawProceso.state,
          fechaCreacion: rawProceso.fechaCreacion,
          clienteId: rawProceso.clienteId,
          tipoProcesoId: rawProceso.tipoProcesoId,
          radicado: rawProceso.radicado,
          juzgado: rawProceso.juzgado,
          estadoId: rawProceso.estadoId,
          descripcionEstado: rawProceso.descripcionEstado,
          responsable: responsableMeta ? {
            id: responsableMeta.lawyer?.id ?? null,
            fechaAsignacion: responsableMeta.fechaInicio ?? null,
            razon: responsableMeta.razon ?? null,
            asignadoPorNombre: responsableMeta.asignadoPorNombre ?? null,
            lawyer: responsableMeta.lawyer
          } : null,
          clienteNombre: this.getClienteNombre(rawProceso.cliente),
          clienteUserId: rawProceso.cliente?.userId ?? void 0,
          communityPostId: rawProceso.communityPostId ?? null,
          cliente: rawProceso.cliente,
          tipoProceso: rawProceso.tipoProceso ?? null,
          estado: rawProceso.estado ?? null,
          lawyers: rawProceso.lawyers.map((l) => ({
            id: l.id,
            procesoId: l.procesoId,
            lawyerId: l.lawyerId,
            tipoAsignacionId: l.tipoAsignacionId ?? null,
            rol: l.rol,
            razonAsignacion: l.razonAsignacion ?? null,
            fechaAsignacion: l.fechaAsignacion,
            fechaFin: l.fechaFin ?? null,
            asignadoPor: l.asignadoPor ?? null,
            status: l.status,
            lawyer: l.lawyer,
            tipoAsignacion: l.tipoAsignacion ?? null,
            asignadoPorUser: l.asignadoPorUser ?? null
          }))
        };
      }
      async getProcesoByClienteIdAndProcesoId(clienteId, procesoId) {
        const procesoCliente = await this.db.select({ id: procesos.id }).from(procesos).where(
          and7(
            eq12(procesos.id, procesoId),
            eq12(procesos.clienteId, clienteId)
          )
        ).limit(1);
        if (procesoCliente.length === 0) return void 0;
        const rawProceso = await this.db.query.procesos.findFirst({
          where: eq12(procesos.id, procesoId),
          with: {
            cliente: { with: { natural: { with: { persona: true } }, empresa: true } },
            tipoProceso: true,
            estado: true,
            lawyers: {
              with: {
                lawyer: {
                  with: {
                    persona: {
                      columns: {
                        nombre: true,
                        apellido: true,
                        telefono: true
                      }
                    }
                  }
                },
                tipoAsignacion: true,
                asignadoPorUser: {
                  columns: {
                    email: true,
                    name: true
                  }
                }
              }
            }
          }
        });
        if (!rawProceso) return void 0;
        const responsableMeta = await this.getActiveResponsable(procesoId);
        const lawyersResolved = await Promise.all(
          rawProceso.lawyers.map(async (l) => {
            if (l.lawyer !== null) return { ...l, firm: null };
            const firm = await this.db.select({ id: firmProfiles.id, name: firmProfiles.name, phone: firmProfiles.phone, userId: firmProfiles.userId }).from(firmProfiles).where(eq12(firmProfiles.id, l.lawyerId)).limit(1);
            return { ...l, firm: firm[0] ?? null };
          })
        );
        return {
          id: rawProceso.id,
          state: rawProceso.state,
          fechaCreacion: rawProceso.fechaCreacion,
          clienteId: rawProceso.clienteId,
          tipoProcesoId: rawProceso.tipoProcesoId,
          radicado: rawProceso.radicado,
          juzgado: rawProceso.juzgado,
          estadoId: rawProceso.estadoId,
          descripcionEstado: rawProceso.descripcionEstado,
          clienteNombre: this.getClienteNombre(rawProceso.cliente),
          cliente: rawProceso.cliente ?? null,
          tipoProceso: rawProceso.tipoProceso ?? null,
          estado: rawProceso.estado ?? null,
          lawyers: lawyersResolved.map((l) => ({
            id: l.id,
            procesoId: l.procesoId,
            lawyerId: l.lawyerId,
            rol: l.rol,
            status: l.status,
            lawyer: l.lawyer,
            firm: l.firm
          })),
          responsable: responsableMeta ? {
            id: responsableMeta.lawyer?.id ?? null,
            fechaAsignacion: responsableMeta.fechaInicio ?? null,
            razon: responsableMeta.razon ?? null,
            asignadoPorNombre: responsableMeta.asignadoPorNombre ?? null,
            lawyer: responsableMeta.lawyer ?? null
          } : null
        };
      }
      // ── Legal Stage ────────────────────────────────────────────────────────────
      /** Actualiza la etapa procesal del proceso y calcula la fecha de vencimiento */
      async updateLegalStage(procesoId, legalStage, fechaVencimientoEtapa) {
        await this.db.update(procesos).set({
          legalStage,
          fechaVencimientoEtapa,
          etapaActualizadaEn: /* @__PURE__ */ new Date()
        }).where(eq12(procesos.id, procesoId));
      }
      /** Procesos filtrados por etapa procesal */
      async getProcesosByEtapa(lawyerProfileId, legalStage) {
        return this.db.select({
          id: procesos.id,
          radicado: procesos.radicado,
          legalStage: procesos.legalStage
        }).from(procesos).where(
          and7(
            eq12(procesos.state, true),
            eq12(procesos.legalStage, legalStage)
          )
        );
      }
      /** Obtener procesos por array de IDs (usado en listados por rol con ownership). */
      async getProcesosByIds(ids, filter, limit, offset) {
        if (ids.length === 0) return [];
        const responsableLawyer = alias(lawyerProfiles, "responsableLawyer");
        const responsableJoin = alias(procesoResponsables, "responsableJoin");
        const personasResponsable = alias(personas, "personasResponsable");
        const personasCliente = alias(personas, "personasCliente");
        const deptosCliente = alias(departamentos, "deptosCliente");
        const municipiosCliente = alias(municipios, "municipiosCliente");
        const repLegal = alias(representantesLegales, "repLegal");
        const personasRepLegal = alias(personas, "personasRepLegal");
        const conditions = [inArray3(procesos.id, ids), eq12(procesos.state, true)];
        if (filter?.estadoCodigo && filter.estadoCodigo !== "todos") {
          conditions.push(eq12(estadosProceso.codigo, filter.estadoCodigo));
        }
        if (filter?.clienteId) {
          conditions.push(eq12(procesos.clienteId, filter.clienteId));
        }
        if (filter?.search) {
          const search = `%${filter.search}%`;
          conditions.push(
            sql5`(
          LOWER(${procesos.radicado}) LIKE LOWER(${search}) OR
          LOWER(${procesos.juzgado}) LIKE LOWER(${search}) OR
          LOWER(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido})) LIKE LOWER(${search}) OR
          LOWER(${clientesEmpresa.razonSocial}) LIKE LOWER(${search}) OR
          LOWER(${tiposProceso.nombre}) LIKE LOWER(${search}) OR
          LOWER(CONCAT(${personasResponsable.nombre}, ' ', ${personasResponsable.apellido})) LIKE LOWER(${search})
        )`
          );
        }
        if (filter?.hasResponsable !== void 0) {
          if (filter.hasResponsable) {
            conditions.push(sql5`EXISTS (
          SELECT 1 FROM proceso_responsables pr
          WHERE pr.proceso_id = ${procesos.id} AND pr.activo = 1
        )`);
          } else {
            conditions.push(sql5`NOT EXISTS (
          SELECT 1 FROM proceso_responsables pr
          WHERE pr.proceso_id = ${procesos.id} AND pr.activo = 1
        )`);
          }
        }
        const joinConditions = and7(
          eq12(responsableJoin.procesoId, procesos.id),
          eq12(responsableJoin.activo, true)
        );
        let query = this.db.select({
          id: procesos.id,
          state: procesos.state,
          fechaCreacion: procesos.fechaCreacion,
          clienteId: procesos.clienteId,
          tipoProcesoId: procesos.tipoProcesoId,
          radicado: procesos.radicado,
          juzgado: procesos.juzgado,
          estadoId: procesos.estadoId,
          descripcionEstado: procesos.descripcionEstado,
          clienteNombre: sql5`COALESCE(CONCAT(${personasCliente.nombre}, ' ', ${personasCliente.apellido}), ${clientesEmpresa.razonSocial}, 'Sin cliente')`,
          clienteUserId: clientes.userId,
          tipoCliente: clientes.tipo,
          clienteDocumento: personasCliente.documento,
          clienteTelefono: personasCliente.telefono,
          clienteDepartamentoId: deptosCliente.id,
          clienteDepartamentoNombre: deptosCliente.nombre,
          clienteMunicipioId: municipiosCliente.id,
          clienteMunicipioNombre: municipiosCliente.nombre,
          repLegalId: repLegal.id,
          repLegalCargo: repLegal.cargo,
          repLegalEmail: repLegal.email,
          repLegalNombre: personasRepLegal.nombre,
          repLegalApellido: personasRepLegal.apellido,
          repLegalDocumento: personasRepLegal.documento,
          repLegalTelefono: personasRepLegal.telefono,
          tipoProcesoNombre: tiposProceso.nombre,
          estadoIdRel: estadosProceso.id,
          estadoCodigo: estadosProceso.codigo,
          estadoNombre: estadosProceso.nombre,
          estadoColor: estadosProceso.color,
          responsableLawyerData: responsableLawyer,
          responsablePersonaId: personasResponsable.id,
          responsablePersonaNombre: personasResponsable.nombre,
          responsablePersonaApellido: personasResponsable.apellido,
          responsablePersonaTelefono: personasResponsable.telefono,
          responsablePersonaDocumento: personasResponsable.documento,
          responsablePersonaDireccion: personasResponsable.direccion,
          responsablePersonaTipoDocumentoId: personasResponsable.tipoDocumentoId,
          responsablePersonaDepartamentoId: personasResponsable.departamentoId,
          responsablePersonaMunicipioId: personasResponsable.municipioId,
          responsableFechaInicio: responsableJoin.fechaInicio,
          responsableRazon: responsableJoin.razon,
          responsableAsignadoPorNombre: responsableJoin.asignadoPorNombre
        }).from(procesos).leftJoin(clientes, eq12(procesos.clienteId, clientes.id)).leftJoin(clientesNatural, eq12(clientes.id, clientesNatural.clienteId)).leftJoin(personasCliente, eq12(clientesNatural.personaId, personasCliente.id)).leftJoin(deptosCliente, eq12(personasCliente.departamentoId, deptosCliente.id)).leftJoin(municipiosCliente, eq12(personasCliente.municipioId, municipiosCliente.id)).leftJoin(clientesEmpresa, eq12(clientes.id, clientesEmpresa.clienteId)).leftJoin(repLegal, eq12(clientesEmpresa.representanteLegalId, repLegal.id)).leftJoin(personasRepLegal, eq12(repLegal.personaId, personasRepLegal.id)).leftJoin(estadosProceso, eq12(procesos.estadoId, estadosProceso.id)).leftJoin(tiposProceso, eq12(procesos.tipoProcesoId, tiposProceso.id)).leftJoin(responsableJoin, joinConditions).leftJoin(responsableLawyer, eq12(responsableJoin.lawyerId, responsableLawyer.id)).leftJoin(personasResponsable, eq12(responsableLawyer.personaId, personasResponsable.id)).where(and7(...conditions)).orderBy(desc3(procesos.fechaCreacion));
        if (typeof limit === "number") {
          query = query.limit(limit);
        }
        if (typeof offset === "number" && offset > 0) {
          query = query.offset(offset);
        }
        const results = await query;
        return results.map((p) => ({
          id: p.id,
          state: p.state,
          fechaCreacion: p.fechaCreacion,
          clienteId: p.clienteId,
          tipoProcesoId: p.tipoProcesoId,
          radicado: p.radicado,
          juzgado: p.juzgado,
          estadoId: p.estadoId,
          descripcionEstado: p.descripcionEstado,
          clienteNombre: p.clienteNombre || "Sin cliente",
          clienteUserId: p.clienteUserId || void 0,
          tipoCliente: p.tipoCliente ?? null,
          clienteDocumento: p.clienteDocumento ?? null,
          clienteTelefono: p.clienteTelefono ?? null,
          clienteDepartamento: p.clienteDepartamentoId ? {
            id: p.clienteDepartamentoId,
            nombre: p.clienteDepartamentoNombre ?? ""
          } : null,
          clienteMunicipio: p.clienteMunicipioId ? {
            id: p.clienteMunicipioId,
            nombre: p.clienteMunicipioNombre ?? ""
          } : null,
          representanteLegal: p.repLegalId ? {
            id: p.repLegalId,
            cargo: p.repLegalCargo ?? "",
            email: p.repLegalEmail ?? "",
            nombre: p.repLegalNombre ?? "",
            apellido: p.repLegalApellido ?? "",
            documento: p.repLegalDocumento ?? null,
            telefono: p.repLegalTelefono ?? null
          } : null,
          estado: p.estadoIdRel ? {
            id: p.estadoIdRel,
            codigo: p.estadoCodigo || "",
            nombre: p.estadoNombre || "",
            color: p.estadoColor || ""
          } : null,
          responsable: p.responsableLawyerData ? {
            id: p.responsableLawyerData.id,
            fechaAsignacion: p.responsableFechaInicio ?? null,
            razon: p.responsableRazon ?? null,
            asignadoPorNombre: p.responsableAsignadoPorNombre ?? null,
            lawyer: {
              ...p.responsableLawyerData,
              persona: p.responsablePersonaId ? {
                id: p.responsablePersonaId,
                nombre: p.responsablePersonaNombre ?? "",
                apellido: p.responsablePersonaApellido ?? "",
                telefono: p.responsablePersonaTelefono ?? null,
                documento: p.responsablePersonaDocumento ?? null,
                direccion: p.responsablePersonaDireccion ?? null,
                tipoDocumentoId: p.responsablePersonaTipoDocumentoId ?? 0,
                departamentoId: p.responsablePersonaDepartamentoId ?? null,
                municipioId: p.responsablePersonaMunicipioId ?? null
              } : null
            }
          } : null
        }));
      }
      /** IDs de procesos donde el abogado tiene asignación o responsabilidad activa. */
      async getProcesoIdsByAbogadoAssignment(lawyerId) {
        const [assignmentRows, responsableRows] = await Promise.all([
          this.db.select({ procesoId: procesoLawyers.procesoId }).from(procesoLawyers).where(and7(
            eq12(procesoLawyers.lawyerId, lawyerId),
            eq12(procesoLawyers.status, "activo")
          )),
          this.db.select({ procesoId: procesoResponsables.procesoId }).from(procesoResponsables).where(and7(
            eq12(procesoResponsables.lawyerId, lawyerId),
            eq12(procesoResponsables.activo, true)
          ))
        ]);
        return [.../* @__PURE__ */ new Set([
          ...assignmentRows.map((r) => r.procesoId),
          ...responsableRows.map((r) => r.procesoId)
        ])];
      }
    };
  }
});

// server/storage/storeage/models/documento-storage.ts
import { randomUUID as randomUUID4 } from "crypto";
import { eq as eq13, and as and8, isNull as isNull3 } from "drizzle-orm";
var DocumentoStorage;
var init_documento_storage = __esm({
  "server/storage/storeage/models/documento-storage.ts"() {
    "use strict";
    init_schema();
    DocumentoStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getDocumentos(procesoId, stage) {
        let result;
        if (stage === void 0) {
          result = await this.db.select().from(documentos).where(eq13(documentos.procesoId, procesoId));
        } else if (stage === "__general__") {
          result = await this.db.select().from(documentos).where(and8(eq13(documentos.procesoId, procesoId), isNull3(documentos.legalStage)));
        } else {
          result = await this.db.select().from(documentos).where(and8(eq13(documentos.procesoId, procesoId), eq13(documentos.legalStage, stage)));
        }
        return result.map((doc) => ({
          ...doc,
          tipoDocumento: doc.tipoDocumento
        }));
      }
      async getDocumento(id) {
        const results = await this.db.select().from(documentos).where(eq13(documentos.id, id)).limit(1);
        if (results[0]) {
          return {
            ...results[0],
            tipoDocumento: results[0].tipoDocumento
          };
        }
        return void 0;
      }
      async createDocumento(insertDocumento) {
        const id = randomUUID4();
        const fechaSubida = insertDocumento.fechaSubida ? new Date(insertDocumento.fechaSubida) : /* @__PURE__ */ new Date();
        const newDocumento = {
          ...insertDocumento,
          id,
          tamano: insertDocumento.tamano ?? 0,
          descripcion: insertDocumento.descripcion ?? "",
          fechaSubida,
          state: insertDocumento.state ?? true,
          legalStage: insertDocumento.legalStage ?? null,
          tipoDocumento: insertDocumento.tipoDocumento ?? "PROCESAL"
        };
        await this.db.insert(documentos).values(newDocumento);
        return newDocumento;
      }
      async updateDocumento(id, updates) {
        await this.db.update(documentos).set(updates).where(eq13(documentos.id, id));
        return this.getDocumento(id);
      }
      async deleteDocumento(id) {
        await this.db.delete(documentos).where(eq13(documentos.id, id));
      }
      async getDocumentosByTipoDocumento(procesoId, tipoDocumento) {
        const docs = await this.getDocumentos(procesoId);
        return docs.filter((d) => d.tipoDocumento === tipoDocumento);
      }
    };
  }
});

// server/storage/storeage/models/notificacion-storage.ts
import { desc as desc4, and as and9, eq as eq14 } from "drizzle-orm";
var NotificacionStorage;
var init_notificacion_storage = __esm({
  "server/storage/storeage/models/notificacion-storage.ts"() {
    "use strict";
    init_schema();
    NotificacionStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ============================
      // Crear Notificación
      // ============================
      async createNotificacion(data) {
        const newNotificacion = {
          ...data,
          leidoCliente: data.leidoCliente ?? false,
          leidoLawyer: data.leidoLawyer ?? false,
          leidoFirma: data.leidoFirma ?? false,
          createdAt: /* @__PURE__ */ new Date()
        };
        await this.db.insert(notificaciones).values(newNotificacion);
        const rows = await this.db.select().from(notificaciones).where(eq14(notificaciones.procesoId, data.procesoId)).orderBy(desc4(notificaciones.createdAt)).limit(1);
        return rows[0] ?? newNotificacion;
      }
      // ============================
      // Obtener notificaciones por cliente
      // ============================
      async getNotificacionesByClienteId(clienteId) {
        return this.db.select().from(notificaciones).where(eq14(notificaciones.clienteId, clienteId)).orderBy(desc4(notificaciones.createdAt));
      }
      // ============================
      // Obtener notificaciones por abogado
      // ============================
      async getNotificacionesByLawyerId(lawyerId) {
        return this.db.select().from(notificaciones).where(eq14(notificaciones.lawyerId, lawyerId)).orderBy(desc4(notificaciones.createdAt));
      }
      // ============================
      // Obtener notificaciones por firma
      // ============================
      async getNotificacionesByFirmId(firmId) {
        return this.db.select().from(notificaciones).where(eq14(notificaciones.firmId, firmId)).orderBy(desc4(notificaciones.createdAt));
      }
      // ============================
      // Contar no leídas por cliente
      // ============================
      async countNoLeidasByClienteId(clienteId) {
        const result = await this.db.select().from(notificaciones).where(and9(
          eq14(notificaciones.clienteId, clienteId),
          eq14(notificaciones.leidoCliente, false)
        ));
        return result.length;
      }
      // ============================
      // Contar no leídas por abogado
      // ============================
      async countNoLeidasByLawyerId(lawyerId) {
        const result = await this.db.select().from(notificaciones).where(and9(
          eq14(notificaciones.lawyerId, lawyerId),
          eq14(notificaciones.leidoLawyer, false)
        ));
        return result.length;
      }
      // ============================
      // Contar no leídas por firma
      // ============================
      async countNoLeidasByFirmId(firmId) {
        const result = await this.db.select().from(notificaciones).where(and9(
          eq14(notificaciones.firmId, firmId),
          eq14(notificaciones.leidoFirma, false)
        ));
        return result.length;
      }
      // ============================
      // Marcar como leída por cliente
      // ============================
      async marcarComoLeidaByClienteId(id, clienteId) {
        await this.db.update(notificaciones).set({ leidoCliente: true }).where(and9(eq14(notificaciones.id, id), eq14(notificaciones.clienteId, clienteId)));
      }
      // ============================
      // Marcar como leída por abogado
      // ============================
      async marcarComoLeidaByLawyerId(id, lawyerId) {
        await this.db.update(notificaciones).set({ leidoLawyer: true }).where(and9(eq14(notificaciones.id, id), eq14(notificaciones.lawyerId, lawyerId)));
      }
      // ============================
      // Marcar como leída por firma
      // ============================
      async marcarComoLeidaByFirmaId(id, firmaId) {
        await this.db.update(notificaciones).set({ leidoFirma: true }).where(and9(eq14(notificaciones.id, id), eq14(notificaciones.firmId, firmaId)));
      }
      // ============================
      // Marcar todas como leídas por cliente
      // ============================
      async marcarTodasComoLeidasByClienteId(clienteId) {
        await this.db.update(notificaciones).set({ leidoCliente: true }).where(eq14(notificaciones.clienteId, clienteId));
      }
      // ============================
      // Marcar todas como leídas por abogado
      // ============================
      async marcarTodasComoLeidasByLawyerId(lawyerId) {
        await this.db.update(notificaciones).set({ leidoLawyer: true }).where(eq14(notificaciones.lawyerId, lawyerId));
      }
      // ============================
      // Marcar todas como leídas por firma
      // ============================
      async marcarTodasComoLeidasByFirmId(firmId) {
        await this.db.update(notificaciones).set({ leidoFirma: true }).where(eq14(notificaciones.firmId, firmId));
      }
      // ============================
      // Eliminar
      // ============================
      async deleteNotificacion(id) {
        await this.db.delete(notificaciones).where(eq14(notificaciones.id, id));
      }
    };
  }
});

// server/storage/storeage/models/abogado-storage.ts
import { and as and10, eq as eq15, like as like3 } from "drizzle-orm";
var AbogadoStorage;
var init_abogado_storage = __esm({
  "server/storage/storeage/models/abogado-storage.ts"() {
    "use strict";
    init_schema();
    init_identity_uniqueness();
    AbogadoStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getAllLawyer() {
        return this.db.select().from(lawyerProfiles);
      }
      async getLawyer(id) {
        const rows = await this.db.select({
          id: lawyerProfiles.id,
          userId: lawyerProfiles.userId,
          firmId: lawyerProfiles.firmId,
          personaId: lawyerProfiles.personaId,
          specialization: lawyerProfiles.specialization,
          licenseNumber: lawyerProfiles.licenseNumber,
          isIndependent: lawyerProfiles.isIndependent,
          professionalVerificationStatus: lawyerProfiles.professionalVerificationStatus,
          professionalReviewedAt: lawyerProfiles.professionalReviewedAt,
          professionalReviewedBy: lawyerProfiles.professionalReviewedBy,
          professionalReviewNotes: lawyerProfiles.professionalReviewNotes,
          createdAt: lawyerProfiles.createdAt,
          updatedAt: lawyerProfiles.updatedAt,
          user: { id: users.id, email: users.email, name: users.name },
          firm: { id: firmProfiles.id, name: firmProfiles.name },
          persona: {
            id: personas.id,
            nombre: personas.nombre,
            apellido: personas.apellido,
            telefono: personas.telefono,
            documento: personas.documento,
            tipoDocumentoId: personas.tipoDocumentoId,
            direccion: personas.direccion,
            departamentoId: personas.departamentoId,
            municipioId: personas.municipioId
          }
        }).from(lawyerProfiles).innerJoin(users, eq15(lawyerProfiles.userId, users.id)).innerJoin(personas, eq15(lawyerProfiles.personaId, personas.id)).leftJoin(firmProfiles, eq15(lawyerProfiles.firmId, firmProfiles.id)).where(eq15(lawyerProfiles.id, id)).limit(1);
        if (!rows[0]) return void 0;
        const row = rows[0];
        return {
          ...row,
          user: row.user?.id ? row.user : null,
          firm: row.firm?.id ? row.firm : null,
          persona: row.persona?.id ? row.persona : null
        };
      }
      async getLawyerByEmail(email) {
        const userResult = await this.db.select().from(users).where(eq15(users.email, email)).limit(1);
        if (!userResult[0]) return void 0;
        return this.getLawyerByUserId(userResult[0].id);
      }
      async getLawyerByUserId(userId2) {
        const result = await this.db.select().from(lawyerProfiles).where(eq15(lawyerProfiles.userId, userId2)).limit(1);
        return result[0];
      }
      /** Same as getLawyer but filters by userId instead of profile id */
      async getLawyerByUserIdFull(userId2) {
        const rows = await this.db.select({
          id: lawyerProfiles.id,
          userId: lawyerProfiles.userId,
          firmId: lawyerProfiles.firmId,
          personaId: lawyerProfiles.personaId,
          specialization: lawyerProfiles.specialization,
          licenseNumber: lawyerProfiles.licenseNumber,
          isIndependent: lawyerProfiles.isIndependent,
          professionalVerificationStatus: lawyerProfiles.professionalVerificationStatus,
          professionalReviewedAt: lawyerProfiles.professionalReviewedAt,
          professionalReviewedBy: lawyerProfiles.professionalReviewedBy,
          professionalReviewNotes: lawyerProfiles.professionalReviewNotes,
          createdAt: lawyerProfiles.createdAt,
          updatedAt: lawyerProfiles.updatedAt,
          user: { id: users.id, email: users.email, name: users.name },
          firm: { id: firmProfiles.id, name: firmProfiles.name },
          persona: {
            id: personas.id,
            nombre: personas.nombre,
            apellido: personas.apellido,
            telefono: personas.telefono,
            documento: personas.documento,
            tipoDocumentoId: personas.tipoDocumentoId,
            direccion: personas.direccion,
            departamentoId: personas.departamentoId,
            municipioId: personas.municipioId
          }
        }).from(lawyerProfiles).innerJoin(users, eq15(lawyerProfiles.userId, users.id)).innerJoin(personas, eq15(lawyerProfiles.personaId, personas.id)).leftJoin(firmProfiles, eq15(lawyerProfiles.firmId, firmProfiles.id)).where(eq15(lawyerProfiles.userId, userId2)).limit(1);
        if (!rows[0]) return void 0;
        const row = rows[0];
        return {
          ...row,
          user: row.user?.id ? row.user : null,
          firm: row.firm?.id ? row.firm : null,
          persona: row.persona?.id ? row.persona : null
        };
      }
      async getAllLawyers(limit, offset, filter) {
        const conditions = [];
        const searchNombre = filter?.nombre ?? filter?.firstName;
        if (searchNombre) {
          conditions.push(like3(personas.nombre, `%${searchNombre}%`));
        }
        return this.db.select({
          id: lawyerProfiles.id,
          userId: lawyerProfiles.userId,
          firmId: lawyerProfiles.firmId,
          personaId: lawyerProfiles.personaId,
          specialization: lawyerProfiles.specialization,
          licenseNumber: lawyerProfiles.licenseNumber,
          isIndependent: lawyerProfiles.isIndependent,
          professionalVerificationStatus: lawyerProfiles.professionalVerificationStatus,
          professionalReviewedAt: lawyerProfiles.professionalReviewedAt,
          professionalReviewedBy: lawyerProfiles.professionalReviewedBy,
          professionalReviewNotes: lawyerProfiles.professionalReviewNotes,
          createdAt: lawyerProfiles.createdAt,
          updatedAt: lawyerProfiles.updatedAt
        }).from(lawyerProfiles).innerJoin(personas, eq15(lawyerProfiles.personaId, personas.id)).where(conditions.length ? and10(...conditions) : void 0).limit(limit).offset(offset);
      }
      async getLawyersByFirm(firmId) {
        return this.db.select().from(lawyerProfiles).where(eq15(lawyerProfiles.firmId, firmId));
      }
      async createLawyer(lawyer) {
        const licenseNumber = await assertLicenseNumberUnique(this.db, lawyer.licenseNumber);
        const payload = { ...lawyer, licenseNumber };
        await this.db.insert(lawyerProfiles).values(payload);
        return payload;
      }
      async updateLawyer(id, updates) {
        const { persona: personaUpdates, ...lawyerUpdates } = updates;
        const safeLawyerUpdates = { ...lawyerUpdates };
        if (lawyerUpdates.licenseNumber !== void 0) {
          safeLawyerUpdates.licenseNumber = await assertLicenseNumberUnique(this.db, lawyerUpdates.licenseNumber, id);
        }
        if (Object.keys(safeLawyerUpdates).length > 0) {
          await this.db.update(lawyerProfiles).set({ ...safeLawyerUpdates, updatedAt: /* @__PURE__ */ new Date() }).where(eq15(lawyerProfiles.id, id));
        }
        if (personaUpdates) {
          const lawyer = await this.db.select({ personaId: lawyerProfiles.personaId, userId: lawyerProfiles.userId }).from(lawyerProfiles).where(eq15(lawyerProfiles.id, id)).limit(1);
          if (lawyer[0]?.personaId) {
            const safePersonaUpdates = {
              ...personaUpdates,
              ...personaUpdates.nombre !== void 0 && { nombre: normalizeLooseText(personaUpdates.nombre) },
              ...personaUpdates.apellido !== void 0 && { apellido: normalizeLooseText(personaUpdates.apellido) },
              ...personaUpdates.telefono !== void 0 && { telefono: normalizeLooseText(personaUpdates.telefono) },
              ...personaUpdates.documento !== void 0 && { documento: await assertDocumentoUnique(this.db, personaUpdates.documento, lawyer[0].personaId) },
              ...personaUpdates.direccion !== void 0 && { direccion: normalizeOptionalIdentity(personaUpdates.direccion) }
            };
            await this.db.update(personas).set(safePersonaUpdates).where(eq15(personas.id, lawyer[0].personaId));
          }
          if (lawyer[0]?.userId && (personaUpdates.nombre !== void 0 || personaUpdates.apellido !== void 0)) {
            const currentPersona = await this.db.select({ nombre: personas.nombre, apellido: personas.apellido }).from(personas).where(eq15(personas.id, lawyer[0].personaId)).limit(1);
            if (currentPersona[0]) {
              const fullName = [currentPersona[0].nombre, currentPersona[0].apellido].filter(Boolean).join(" ").trim();
              if (fullName) {
                await this.db.update(users).set({ name: fullName }).where(eq15(users.id, lawyer[0].userId));
              }
            }
          }
        }
        const result = await this.db.select().from(lawyerProfiles).where(eq15(lawyerProfiles.id, id)).limit(1);
        return result[0];
      }
      async deleteLawyer(id) {
        await this.db.delete(lawyerProfiles).where(eq15(lawyerProfiles.id, id));
      }
      async updateFirmId(lawyerId, firmId) {
        await this.db.update(lawyerProfiles).set({ firmId }).where(eq15(lawyerProfiles.id, lawyerId));
      }
    };
  }
});

// server/storage/storeage/models/lawyer-clients-storage.ts
import { randomUUID as randomUUID5 } from "crypto";
import { eq as eq16, and as and11, desc as desc5 } from "drizzle-orm";
var LawyerClientsStorage;
var init_lawyer_clients_storage = __esm({
  "server/storage/storeage/models/lawyer-clients-storage.ts"() {
    "use strict";
    init_schema();
    LawyerClientsStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getLawyerClients(lawyerId) {
        const data = await this.db.select().from(lawyerClients).where(eq16(lawyerClients.lawyerId, lawyerId)).orderBy(desc5(lawyerClients.createdAt));
        return data;
      }
      async getClientLawyers(clientId) {
        const data = await this.db.select().from(lawyerClients).where(eq16(lawyerClients.clientId, clientId)).orderBy(desc5(lawyerClients.createdAt));
        return data;
      }
      async getLawyerClientById(id) {
        const result = await this.db.select().from(lawyerClients).where(eq16(lawyerClients.id, id)).limit(1).then((rows) => rows[0]);
        return result;
      }
      async getActiveLawyerClient(lawyerId, clientId) {
        const result = await this.db.select().from(lawyerClients).where(
          and11(
            eq16(lawyerClients.lawyerId, lawyerId),
            eq16(lawyerClients.clientId, clientId),
            eq16(lawyerClients.status, "active")
          )
        ).limit(1).then((rows) => rows[0]);
        return result;
      }
      async createLawyerClient(data) {
        const id = randomUUID5();
        const { id: _ignored, ...dataWithoutId } = data;
        const newLawyerClient = {
          id,
          ...dataWithoutId,
          status: data.status ?? "active",
          relationshipStartedAt: data.relationshipStartedAt ?? /* @__PURE__ */ new Date(),
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        await this.db.insert(lawyerClients).values(newLawyerClient);
        const created = await this.db.select().from(lawyerClients).where(eq16(lawyerClients.id, id)).limit(1).then((rows) => rows[0]);
        if (!created) {
          throw new Error("No se pudo crear la relaci\xF3n lawyer-client");
        }
        return created;
      }
      async updateLawyerClient(id, updates) {
        const dbUpdates = { ...updates };
        if (updates.relationshipStartedAt !== void 0) {
          dbUpdates.relationshipStartedAt = new Date(updates.relationshipStartedAt);
        }
        if (updates.relationshipEndedAt !== void 0) {
          dbUpdates.relationshipEndedAt = updates.relationshipEndedAt ? new Date(updates.relationshipEndedAt) : null;
        }
        dbUpdates.updatedAt = /* @__PURE__ */ new Date();
        await this.db.update(lawyerClients).set(dbUpdates).where(eq16(lawyerClients.id, id));
        return this.getLawyerClientById(id);
      }
      async terminateRelationship(id) {
        return this.updateLawyerClient(id, {
          status: "terminated",
          relationshipEndedAt: /* @__PURE__ */ new Date()
        });
      }
      async deleteLawyerClient(id) {
        await this.db.delete(lawyerClients).where(eq16(lawyerClients.id, id));
      }
      async getActiveClientsByLawyer(lawyerId) {
        const data = await this.db.select().from(lawyerClients).where(
          and11(
            eq16(lawyerClients.lawyerId, lawyerId),
            eq16(lawyerClients.status, "active")
          )
        ).orderBy(desc5(lawyerClients.relationshipStartedAt));
        return data;
      }
    };
  }
});

// server/storage/storeage/models/tipos-documento-storage.ts
import { eq as eq17 } from "drizzle-orm";
var TiposDocumentoStorage;
var init_tipos_documento_storage = __esm({
  "server/storage/storeage/models/tipos-documento-storage.ts"() {
    "use strict";
    init_schema();
    TiposDocumentoStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getAll() {
        const data = await this.db.select().from(tiposDocumento).where(eq17(tiposDocumento.state, true));
        return data;
      }
      async getById(id) {
        const result = await this.db.select().from(tiposDocumento).where(eq17(tiposDocumento.id, id)).limit(1).then((rows) => rows[0]);
        return result;
      }
    };
  }
});

// server/storage/storeage/models/departamento-storage.ts
import { eq as eq18 } from "drizzle-orm";
var DepartamentoStorage;
var init_departamento_storage = __esm({
  "server/storage/storeage/models/departamento-storage.ts"() {
    "use strict";
    init_schema();
    DepartamentoStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async findAll() {
        return this.db.select().from(departamentos).where(eq18(departamentos.state, 1));
      }
      async findById(id) {
        const result = await this.db.select().from(departamentos).where(eq18(departamentos.id, id));
        return result[0];
      }
      async findByCodigo(codigo) {
        const result = await this.db.select().from(departamentos).where(eq18(departamentos.codigo, codigo));
        return result[0];
      }
      async create(data) {
        await this.db.insert(departamentos).values(data);
        return data;
      }
      async update(id, data) {
        await this.db.update(departamentos).set(data).where(eq18(departamentos.id, id));
        return this.findById(id);
      }
      async delete(id) {
        await this.db.update(departamentos).set({ state: 0 }).where(eq18(departamentos.id, id));
        return true;
      }
    };
  }
});

// server/storage/storeage/models/municipio-storage.ts
import { eq as eq19, and as and12, like as like4, sql as sql6 } from "drizzle-orm";
var MunicipioStorage;
var init_municipio_storage = __esm({
  "server/storage/storeage/models/municipio-storage.ts"() {
    "use strict";
    init_schema();
    init_schema();
    MunicipioStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async findAll() {
        return this.db.select().from(municipios).where(eq19(municipios.state, 1));
      }
      async findByDepartamento(departamentoId) {
        return this.db.select().from(municipios).where(and12(eq19(municipios.departamentoId, departamentoId), eq19(municipios.state, 1)));
      }
      async findByDepartamentoPaginated(departamentoId, page = 1, pageSize = 10, search) {
        const pageNum = Math.max(1, page);
        const pageSizeNum = Math.min(100, Math.max(1, pageSize));
        const conditions = [eq19(municipios.departamentoId, departamentoId), eq19(municipios.state, 1)];
        if (search && search.trim()) {
          conditions.push(like4(municipios.nombre, `%${search.trim()}%`));
        }
        const countResult = await this.db.select({
          count: sql6`count(*)`
        }).from(municipios).where(and12(...conditions));
        const total = Number(countResult[0]?.count || 0);
        const data = await this.db.select().from(municipios).where(and12(...conditions)).limit(pageSizeNum).offset((pageNum - 1) * pageSizeNum);
        const hasMore = pageNum * pageSizeNum < total;
        return { data, total, hasMore };
      }
      async searchMunicipios(departamentoId, search, page = 1, pageSize = 10) {
        return this.findByDepartamentoPaginated(departamentoId, page, pageSize, search);
      }
      /** Search municipios across all departamentos (for community city picker). */
      async searchAll(search = "", limit = 20, offset = 0) {
        const conditions = [eq19(municipios.state, 1)];
        if (search.trim()) {
          conditions.push(like4(municipios.nombre, `%${search.trim()}%`));
        }
        const countResult = await this.db.select({ count: sql6`count(*)` }).from(municipios).where(and12(...conditions));
        const total = Number(countResult[0]?.count ?? 0);
        const rows = await this.db.select({
          id: municipios.id,
          nombre: municipios.nombre,
          departamentoNombre: departamentos.nombre
        }).from(municipios).leftJoin(departamentos, eq19(municipios.departamentoId, departamentos.id)).where(and12(...conditions)).orderBy(municipios.nombre).limit(limit).offset(offset);
        return {
          data: rows.map((r) => ({
            id: r.id,
            nombre: r.nombre,
            departamentoNombre: r.departamentoNombre ?? ""
          })),
          total,
          hasMore: offset + limit < total
        };
      }
      async findById(id) {
        const result = await this.db.select().from(municipios).where(eq19(municipios.id, id));
        return result[0];
      }
      async findByCodigo(departamentoId, codigo) {
        const result = await this.db.select().from(municipios).where(and12(eq19(municipios.departamentoId, departamentoId), eq19(municipios.codigo, codigo)));
        return result[0];
      }
      async create(data) {
        await this.db.insert(municipios).values(data);
        return data;
      }
      async update(id, data) {
        await this.db.update(municipios).set(data).where(eq19(municipios.id, id));
        return this.findById(id);
      }
      async delete(id) {
        await this.db.update(municipios).set({ state: 0 }).where(eq19(municipios.id, id));
        return true;
      }
    };
  }
});

// server/storage/storeage/models/lawyer-firma-history-storage.ts
import { eq as eq20, and as and13, desc as desc6, sql as sql7 } from "drizzle-orm";
var LawyerFirmaHistoryStorage;
var init_lawyer_firma_history_storage = __esm({
  "server/storage/storeage/models/lawyer-firma-history-storage.ts"() {
    "use strict";
    init_schema();
    LawyerFirmaHistoryStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ============================
      // Obtener por ID
      // ============================
      async getById(id) {
        const result = await this.db.select().from(lawyerFirmaHistory).where(eq20(lawyerFirmaHistory.id, id)).limit(1);
        return result[0];
      }
      // ============================
      // Obtener historial por lawyerId
      // ============================
      async getByLawyerId(lawyerId) {
        return await this.db.select().from(lawyerFirmaHistory).where(eq20(lawyerFirmaHistory.lawyerId, lawyerId)).orderBy(desc6(lawyerFirmaHistory.fechaIngreso));
      }
      // ============================
      // Obtener historial por firmaId
      // ============================
      async getByFirmaId(firmaId) {
        return await this.db.select().from(lawyerFirmaHistory).where(eq20(lawyerFirmaHistory.firmaId, firmaId)).orderBy(desc6(lawyerFirmaHistory.fechaIngreso));
      }
      // ============================
      // Obtener registro activo por lawyerId
      // ============================
      async getActiveByLawyerId(lawyerId) {
        const result = await this.db.select().from(lawyerFirmaHistory).where(
          and13(
            eq20(lawyerFirmaHistory.lawyerId, lawyerId),
            eq20(lawyerFirmaHistory.estado, "activo")
          )
        ).limit(1);
        return result[0];
      }
      // ============================
      // Obtener miembros activos de una firma
      // ============================
      async getActiveMembersByFirmaId(firmaId, search) {
        const conditions = [
          eq20(lawyerFirmaHistory.firmaId, firmaId),
          eq20(lawyerFirmaHistory.estado, "activo")
        ];
        if (search) {
          const q = `%${search}%`;
          conditions.push(sql7`(LOWER(${personas.nombre}) LIKE LOWER(${q}) OR LOWER(${personas.apellido}) LIKE LOWER(${q}) OR LOWER(${users.email}) LIKE LOWER(${q}))`);
        }
        const results = await this.db.select({
          id: lawyerFirmaHistory.id,
          lawyerId: lawyerFirmaHistory.lawyerId,
          firmaId: lawyerFirmaHistory.firmaId,
          fechaIngreso: lawyerFirmaHistory.fechaIngreso,
          fechaSalida: lawyerFirmaHistory.fechaSalida,
          motivoSalida: lawyerFirmaHistory.motivoSalida,
          estado: lawyerFirmaHistory.estado,
          createdBy: lawyerFirmaHistory.createdBy,
          notas: lawyerFirmaHistory.notas,
          createdAt: lawyerFirmaHistory.createdAt,
          lawyerProfileId: lawyerProfiles.id,
          persona: personas,
          specialization: lawyerProfiles.specialization,
          licenseNumber: lawyerProfiles.licenseNumber,
          isIndependent: lawyerProfiles.isIndependent,
          firmId: lawyerProfiles.firmId,
          userId: lawyerProfiles.userId,
          userEmail: users.email,
          userName: users.name
        }).from(lawyerFirmaHistory).innerJoin(lawyerProfiles, eq20(lawyerFirmaHistory.lawyerId, lawyerProfiles.id)).leftJoin(personas, eq20(lawyerProfiles.personaId, personas.id)).innerJoin(users, eq20(lawyerProfiles.userId, users.id)).where(and13(...conditions)).orderBy(desc6(lawyerFirmaHistory.fechaIngreso));
        return results.map((r) => ({
          id: r.id,
          lawyerId: r.lawyerId,
          firmaId: r.firmaId,
          fechaIngreso: r.fechaIngreso,
          fechaSalida: r.fechaSalida ?? null,
          motivoSalida: r.motivoSalida ?? null,
          estado: r.estado,
          createdBy: r.createdBy ?? null,
          notas: r.notas ?? null,
          createdAt: r.createdAt,
          lawyer: {
            id: r.lawyerProfileId,
            userId: r.userId,
            firmId: r.firmId,
            persona: r.persona,
            specialization: r.specialization ?? null,
            licenseNumber: r.licenseNumber ?? null,
            isIndependent: r.isIndependent,
            createdAt: r.createdAt,
            updatedAt: r.createdAt,
            user: {
              id: r.userId,
              email: r.userEmail,
              name: r.userName ?? null,
              role: r.userRole ?? null
            }
          }
        }));
      }
      // ============================
      // Obtener todos los miembros (cualquier estado) de una firma con detalles
      // ============================
      async getAllMembersByFirmaId(firmaId) {
        const results = await this.db.select({
          id: lawyerFirmaHistory.id,
          lawyerId: lawyerFirmaHistory.lawyerId,
          firmaId: lawyerFirmaHistory.firmaId,
          fechaIngreso: lawyerFirmaHistory.fechaIngreso,
          fechaSalida: lawyerFirmaHistory.fechaSalida,
          motivoSalida: lawyerFirmaHistory.motivoSalida,
          estado: lawyerFirmaHistory.estado,
          notas: lawyerFirmaHistory.notas,
          createdAt: lawyerFirmaHistory.createdAt,
          lawyerProfileId: lawyerProfiles.id,
          persona: personas,
          specialization: lawyerProfiles.specialization,
          licenseNumber: lawyerProfiles.licenseNumber,
          userId: lawyerProfiles.userId,
          userEmail: users.email
        }).from(lawyerFirmaHistory).innerJoin(lawyerProfiles, eq20(lawyerFirmaHistory.lawyerId, lawyerProfiles.id)).leftJoin(personas, eq20(lawyerProfiles.personaId, personas.id)).innerJoin(users, eq20(lawyerProfiles.userId, users.id)).where(eq20(lawyerFirmaHistory.firmaId, firmaId)).orderBy(desc6(lawyerFirmaHistory.fechaIngreso));
        return results.map((r) => ({
          id: r.id,
          lawyerId: r.lawyerId,
          lawyerProfileId: r.lawyerProfileId,
          firmaId: r.firmaId,
          fechaIngreso: r.fechaIngreso,
          fechaSalida: r.fechaSalida ?? null,
          motivoSalida: r.motivoSalida ?? null,
          estado: r.estado,
          notas: r.notas ?? null,
          createdAt: r.createdAt,
          nombre: `${r.persona?.nombre ?? ""} ${r.persona?.apellido ?? ""}`.trim(),
          specialization: r.specialization ?? null,
          licenseNumber: r.licenseNumber ?? null,
          userEmail: r.userEmail
        }));
      }
      // ============================
      // Crear registro de historial
      // ============================
      async create(data) {
        const newRecord = {
          ...data,
          id: data.id || crypto.randomUUID(),
          fechaIngreso: data.fechaIngreso || /* @__PURE__ */ new Date(),
          estado: data.estado || "activo",
          createdAt: /* @__PURE__ */ new Date()
        };
        await this.db.insert(lawyerFirmaHistory).values(newRecord);
        const created = await this.getById(newRecord.id);
        if (!created) {
          throw new Error("No se pudo crear el historial de firma");
        }
        return created;
      }
      // ============================
      // Actualizar registro
      // ============================
      async update(id, updates) {
        await this.db.update(lawyerFirmaHistory).set({
          ...updates
        }).where(eq20(lawyerFirmaHistory.id, id));
        return this.getById(id);
      }
      // ============================
      // Retirar abogado de la firma
      // ============================
      async retireLawyer(id, motivoSalida, notas) {
        return await this.update(id, {
          fechaSalida: /* @__PURE__ */ new Date(),
          motivoSalida,
          estado: "retirado",
          notas
        });
      }
      // ============================
      // Suspender abogado en la firma
      // ============================
      async suspendLawyer(id, notas) {
        return await this.update(id, {
          estado: "suspendido",
          notas
        });
      }
      // ============================
      // Reactivar abogado en la firma
      // ============================
      async reactivateLawyer(id, notas) {
        return await this.update(id, {
          estado: "activo",
          notas
        });
      }
      // ============================
      // Transferir abogado a otra firma
      // ============================
      async transferLawyer(id, nuevaFirmaId, createdBy, notas) {
        await this.update(id, {
          fechaSalida: /* @__PURE__ */ new Date(),
          estado: "transferido",
          notas
        });
        const lawyerRecord = await this.getById(id);
        if (!lawyerRecord) {
          throw new Error("No se encontr\xF3 el registro de historial");
        }
        return await this.create({
          lawyerId: lawyerRecord.lawyerId,
          firmaId: nuevaFirmaId,
          createdBy,
          estado: "activo",
          notas: `Transferido desde firma anterior. ${notas || ""}`
        });
      }
      // ============================
      // Asignar rol de firma a un abogado activo
      // ============================
      async setFirmRol(lawyerId, firmaId, firmRolId) {
        await this.db.update(lawyerFirmaHistory).set({ firmRolId }).where(
          and13(
            eq20(lawyerFirmaHistory.lawyerId, lawyerId),
            eq20(lawyerFirmaHistory.firmaId, firmaId),
            eq20(lawyerFirmaHistory.estado, "activo")
          )
        );
        return this.getActiveByLawyerId(lawyerId);
      }
      // ============================
      // Eliminar registro
      // ============================
      async delete(id) {
        await this.db.delete(lawyerFirmaHistory).where(eq20(lawyerFirmaHistory.id, id));
      }
      // ============================
      // Obtener historial completo de un abogado con detalles de firma
      // ============================
      async getLawyerHistoryWithFirms(lawyerId) {
        return await this.db.select().from(lawyerFirmaHistory).where(eq20(lawyerFirmaHistory.lawyerId, lawyerId)).orderBy(desc6(lawyerFirmaHistory.fechaIngreso));
      }
      // ============================
      // Contar miembros activos de una firma
      // ============================
      async countActiveMembers(firmaId) {
        const result = await this.db.select({ count: lawyerFirmaHistory.id }).from(lawyerFirmaHistory).where(
          and13(
            eq20(lawyerFirmaHistory.firmaId, firmaId),
            eq20(lawyerFirmaHistory.estado, "activo")
          )
        );
        return result.length;
      }
    };
  }
});

// server/storage/storeage/models/firm-invitation-storage.ts
import { and as and14, desc as desc7, eq as eq21, isNull as isNull4, ne as ne2, or as or3, sql as sql8 } from "drizzle-orm";
import { randomUUID as randomUUID6 } from "crypto";
var FirmInvitationStorage;
var init_firm_invitation_storage = __esm({
  "server/storage/storeage/models/firm-invitation-storage.ts"() {
    "use strict";
    init_schema();
    FirmInvitationStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async create(data) {
        const id = randomUUID6();
        const expiresAt = /* @__PURE__ */ new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await this.db.insert(firmInvitations).values({
          ...data,
          id,
          expiresAt
        });
        return this.getById(id);
      }
      async getById(id) {
        return this.db.query.firmInvitations.findFirst({
          where: eq21(firmInvitations.id, id),
          with: {
            firm: true,
            lawyer: true,
            invitadoPorUser: {
              columns: { id: true, email: true, name: true }
            }
          }
        });
      }
      // Invitaciones pendientes recibidas por un abogado
      async getPendingByLawyerId(lawyerId) {
        return this.db.query.firmInvitations.findMany({
          where: and14(
            eq21(firmInvitations.lawyerId, lawyerId),
            eq21(firmInvitations.status, "pendiente")
          ),
          with: {
            firm: true,
            invitadoPorUser: {
              columns: { id: true, email: true, name: true }
            }
          },
          orderBy: desc7(firmInvitations.createdAt)
        });
      }
      // Invitaciones enviadas por una firma
      async getByFirmId(firmId) {
        return this.db.query.firmInvitations.findMany({
          where: eq21(firmInvitations.firmId, firmId),
          with: {
            lawyer: {
              with: {
                persona: {
                  with: {
                    departamento: { columns: { id: true, nombre: true, codigo: true } },
                    municipio: { columns: { id: true, nombre: true, codigo: true } }
                  },
                  columns: {
                    id: true,
                    nombre: true,
                    apellido: true,
                    direccion: true,
                    departamentoId: true,
                    municipioId: true,
                    telefono: true,
                    documento: true
                  }
                }
              }
            },
            invitadoPorUser: {
              columns: { id: true, email: true, name: true }
            }
          },
          orderBy: desc7(firmInvitations.createdAt)
        });
      }
      // Verificar si ya existe invitación pendiente
      async getExistingPending(firmId, lawyerId) {
        return this.db.query.firmInvitations.findFirst({
          where: and14(
            eq21(firmInvitations.firmId, firmId),
            eq21(firmInvitations.lawyerId, lawyerId),
            eq21(firmInvitations.status, "pendiente")
          )
        });
      }
      async accept(id) {
        await this.db.update(firmInvitations).set({
          status: "aceptada",
          respondedAt: /* @__PURE__ */ new Date()
        }).where(eq21(firmInvitations.id, id));
        return this.getById(id);
      }
      async reject(id, motivoRechazo) {
        await this.db.update(firmInvitations).set({
          status: "rechazada",
          motivoRechazo: motivoRechazo ?? null,
          respondedAt: /* @__PURE__ */ new Date()
        }).where(eq21(firmInvitations.id, id));
        return this.getById(id);
      }
      async cancel(id) {
        await this.db.update(firmInvitations).set({
          status: "cancelada"
        }).where(eq21(firmInvitations.id, id));
      }
      async countPending(lawyerId) {
        const result = await this.db.select({ count: sql8`COUNT(*)` }).from(firmInvitations).where(
          and14(
            eq21(firmInvitations.lawyerId, lawyerId),
            eq21(firmInvitations.status, "pendiente")
          )
        );
        return Number(result[0]?.count ?? 0);
      }
      async searchAvailableLawyers(search, firmId) {
        const searchTerm = `%${search}%`;
        return this.db.select({
          id: lawyerProfiles.id,
          userId: lawyerProfiles.userId,
          firmId: lawyerProfiles.firmId,
          personaId: lawyerProfiles.personaId,
          licenseNumber: lawyerProfiles.licenseNumber,
          specialization: lawyerProfiles.specialization,
          isIndependent: lawyerProfiles.isIndependent,
          createdAt: lawyerProfiles.createdAt,
          updatedAt: lawyerProfiles.updatedAt,
          persona: personas,
          email: users.email
        }).from(lawyerProfiles).leftJoin(personas, eq21(lawyerProfiles.personaId, personas.id)).leftJoin(users, eq21(lawyerProfiles.userId, users.id)).where(
          and14(
            or3(
              isNull4(lawyerProfiles.firmId),
              ne2(lawyerProfiles.firmId, firmId)
            ),
            or3(
              sql8`LOWER(${personas.nombre}) LIKE LOWER(${searchTerm})`,
              sql8`LOWER(${personas.apellido}) LIKE LOWER(${searchTerm})`,
              sql8`LOWER(${lawyerProfiles.licenseNumber}) LIKE LOWER(${searchTerm})`,
              sql8`LOWER(${lawyerProfiles.specialization}) LIKE LOWER(${searchTerm})`,
              sql8`LOWER(${users.email}) LIKE LOWER(${searchTerm})`
            )
          )
        ).limit(10);
      }
    };
  }
});

// server/storage/storeage/models/chat-storage.ts
import { eq as eq22, and as and15, desc as desc8, sql as sql9, inArray as inArray5, gt } from "drizzle-orm";
var ChatStorage;
var init_chat_storage = __esm({
  "server/storage/storeage/models/chat-storage.ts"() {
    "use strict";
    init_schema();
    init_user_schema();
    ChatStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ----------------------------------------------------------------
      // Conversations
      // ----------------------------------------------------------------
      async createConversation(data) {
        const conversationData = {
          ...data,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        await this.db.insert(conversations).values(conversationData);
        const result = await this.db.query.conversations.findFirst({
          where: eq22(conversations.id, data.id)
        });
        return result;
      }
      async getConversation(id) {
        return this.db.query.conversations.findFirst({
          where: eq22(conversations.id, id)
        });
      }
      /** Returns all conversations a user participates in, newest-updated first (paginated) */
      async getConversationsForUser(userId2, limit = 20, offset = 0, type) {
        const participations = await this.db.select({ conversationId: conversationParticipants.conversationId }).from(conversationParticipants).where(eq22(conversationParticipants.userId, userId2));
        if (participations.length === 0) return [];
        const convIds = participations.map((p) => p.conversationId);
        const convs = await this.db.select().from(conversations).where(
          and15(
            inArray5(conversations.id, convIds),
            type ? eq22(conversations.type, type) : void 0
          )
        ).orderBy(desc8(conversations.updatedAt)).limit(limit).offset(offset);
        const dtos = await Promise.all(
          convs.map(async (conv) => {
            const parts = await this.db.select({
              userId: conversationParticipants.userId,
              lastReadAt: conversationParticipants.lastReadAt,
              name: users.name,
              email: users.email
            }).from(conversationParticipants).leftJoin(users, eq22(conversationParticipants.userId, users.id)).where(eq22(conversationParticipants.conversationId, conv.id));
            const lastMsg = await this.db.select({
              id: messages.id,
              conversationId: messages.conversationId,
              senderId: messages.senderId,
              content: messages.content,
              type: messages.type,
              isDeleted: messages.isDeleted,
              createdAt: messages.createdAt,
              fileName: messages.fileName,
              fileSize: messages.fileSize,
              fileMime: messages.fileMime,
              fileHash: messages.fileHash
            }).from(messages).where(
              and15(
                eq22(messages.conversationId, conv.id),
                eq22(messages.isDeleted, false)
              )
            ).orderBy(desc8(messages.createdAt)).limit(1);
            const myParticipation = parts.find((p) => p.userId === userId2);
            let unreadCount = 0;
            if (myParticipation) {
              const unreadResult = await this.db.select({ count: sql9`count(*)` }).from(messages).where(
                and15(
                  eq22(messages.conversationId, conv.id),
                  eq22(messages.isDeleted, false),
                  myParticipation.lastReadAt ? gt(messages.createdAt, myParticipation.lastReadAt) : sql9`1=1`
                )
              );
              unreadCount = Number(unreadResult[0]?.count ?? 0);
            }
            const rawLast = lastMsg[0];
            const lastMessage = rawLast ? {
              id: rawLast.id,
              conversationId: rawLast.conversationId,
              senderId: rawLast.senderId,
              content: rawLast.content ?? null,
              type: rawLast.type,
              isDeleted: rawLast.isDeleted,
              createdAt: rawLast.createdAt,
              fileName: rawLast.fileName ?? null,
              fileSize: rawLast.fileSize ?? null,
              fileMime: rawLast.fileMime ?? null,
              fileHash: rawLast.fileHash ?? null
            } : null;
            return {
              ...conv,
              participants: parts.map((p) => ({
                userId: p.userId,
                name: p.name ?? "",
                email: p.email ?? "",
                lastReadAt: p.lastReadAt
              })),
              lastMessage,
              unreadCount
            };
          })
        );
        return dtos;
      }
      async getConversationsCount(userId2, type) {
        if (!type) {
          const participations = await this.db.select({ count: sql9`count(*)` }).from(conversationParticipants).where(eq22(conversationParticipants.userId, userId2));
          return Number(participations[0]?.count ?? 0);
        }
        const rows = await this.db.select({ count: sql9`count(*)` }).from(conversationParticipants).innerJoin(conversations, eq22(conversationParticipants.conversationId, conversations.id)).where(
          and15(
            eq22(conversationParticipants.userId, userId2),
            eq22(conversations.type, type)
          )
        );
        return Number(rows[0]?.count ?? 0);
      }
      /** Total de mensajes no leídos del usuario en todas sus conversaciones. */
      async getTotalUnreadCount(userId2) {
        const result = await this.db.select({ count: sql9`count(*)` }).from(messages).innerJoin(
          conversationParticipants,
          and15(
            eq22(conversationParticipants.conversationId, messages.conversationId),
            eq22(conversationParticipants.userId, userId2)
          )
        ).where(
          and15(
            eq22(messages.isDeleted, false),
            sql9`(${conversationParticipants.lastReadAt} IS NULL OR ${messages.createdAt} > ${conversationParticipants.lastReadAt})`
          )
        );
        return Number(result[0]?.count ?? 0);
      }
      /**
       * Finds a community conversation between two users that was started
       * from a specific post. Returns undefined if none exists.
       * Used by start-chat to enforce the one-conversation-per-(userA,userB,post) rule.
       */
      async findConversationByPost(userIdA, userIdB, sourcePostId) {
        const rows = await this.db.select({ conversationId: conversationParticipants.conversationId }).from(conversationParticipants).innerJoin(
          conversations,
          eq22(conversationParticipants.conversationId, conversations.id)
        ).where(
          and15(
            eq22(conversationParticipants.userId, userIdA),
            eq22(conversations.type, "community"),
            eq22(conversations.sourcePostId, sourcePostId)
          )
        );
        for (const { conversationId } of rows) {
          const other = await this.db.select({ id: conversationParticipants.id }).from(conversationParticipants).where(
            and15(
              eq22(conversationParticipants.conversationId, conversationId),
              eq22(conversationParticipants.userId, userIdB)
            )
          ).limit(1);
          if (other.length > 0) {
            return this.getConversation(conversationId);
          }
        }
        return void 0;
      }
      async findTwoPartyConversation(userIdA, userIdB, type) {
        const result = await this.db.select({ conversationId: conversationParticipants.conversationId }).from(conversationParticipants).innerJoin(conversations, eq22(conversationParticipants.conversationId, conversations.id)).where(
          and15(
            eq22(conversationParticipants.userId, userIdA),
            eq22(conversations.type, type)
          )
        );
        for (const { conversationId } of result) {
          const other = await this.db.select().from(conversationParticipants).where(
            and15(
              eq22(conversationParticipants.conversationId, conversationId),
              eq22(conversationParticipants.userId, userIdB)
            )
          ).limit(1);
          if (other.length > 0) {
            const total = await this.db.select({ count: sql9`count(*)` }).from(conversationParticipants).where(eq22(conversationParticipants.conversationId, conversationId));
            if (Number(total[0]?.count) === 2) {
              return this.getConversation(conversationId);
            }
          }
        }
        return void 0;
      }
      // ----------------------------------------------------------------
      // Participants
      // ----------------------------------------------------------------
      async addParticipant(data) {
        await this.db.insert(conversationParticipants).values(data);
        const result = await this.db.query.conversationParticipants.findFirst({
          where: eq22(conversationParticipants.id, data.id)
        });
        return result;
      }
      async isParticipant(conversationId, userId2) {
        const result = await this.db.select({ id: conversationParticipants.id }).from(conversationParticipants).where(
          and15(
            eq22(conversationParticipants.conversationId, conversationId),
            eq22(conversationParticipants.userId, userId2)
          )
        ).limit(1);
        return result.length > 0;
      }
      async getParticipantUserIds(conversationId) {
        const rows = await this.db.select({ userId: conversationParticipants.userId }).from(conversationParticipants).where(eq22(conversationParticipants.conversationId, conversationId));
        return rows.map((r) => r.userId);
      }
      async markRead(conversationId, userId2) {
        await this.db.update(conversationParticipants).set({ lastReadAt: /* @__PURE__ */ new Date() }).where(
          and15(
            eq22(conversationParticipants.conversationId, conversationId),
            eq22(conversationParticipants.userId, userId2)
          )
        );
      }
      // ----------------------------------------------------------------
      // Messages
      // ----------------------------------------------------------------
      async createMessage(data) {
        const messageData = {
          ...data,
          type: data.type ?? "text",
          createdAt: /* @__PURE__ */ new Date()
        };
        await this.db.insert(messages).values(messageData);
        await this.db.update(conversations).set({ updatedAt: /* @__PURE__ */ new Date() }).where(eq22(conversations.id, data.conversationId));
        return this.getMessageWithSender(data.id);
      }
      async getMessageWithSender(messageId) {
        const rows = await this.db.select({
          id: messages.id,
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          content: messages.content,
          type: messages.type,
          isDeleted: messages.isDeleted,
          createdAt: messages.createdAt,
          fileName: messages.fileName,
          fileSize: messages.fileSize,
          fileMime: messages.fileMime,
          fileHash: messages.fileHash,
          senderName: users.name,
          senderEmail: users.email
        }).from(messages).leftJoin(users, eq22(messages.senderId, users.id)).where(eq22(messages.id, messageId)).limit(1);
        const row = rows[0];
        return {
          id: row.id,
          conversationId: row.conversationId,
          senderId: row.senderId,
          content: row.content ?? null,
          type: row.type,
          isDeleted: row.isDeleted,
          createdAt: row.createdAt,
          fileName: row.fileName ?? null,
          fileSize: row.fileSize ?? null,
          fileMime: row.fileMime ?? null,
          fileHash: row.fileHash ?? null,
          sender: {
            id: row.senderId,
            name: row.senderName ?? "",
            email: row.senderEmail ?? ""
          }
        };
      }
      /**
       * Returns the raw message row including fileKey — for internal use only
       * (download endpoint). Never expose this to the frontend directly.
       */
      async getRawMessage(messageId) {
        const rows = await this.db.select({
          id: messages.id,
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          content: messages.content,
          type: messages.type,
          isDeleted: messages.isDeleted,
          createdAt: messages.createdAt,
          fileKey: messages.fileKey,
          fileName: messages.fileName,
          fileSize: messages.fileSize,
          fileMime: messages.fileMime,
          fileHash: messages.fileHash
        }).from(messages).where(eq22(messages.id, messageId)).limit(1);
        if (!rows[0]) return void 0;
        const r = rows[0];
        return {
          id: r.id,
          conversationId: r.conversationId,
          senderId: r.senderId,
          content: r.content ?? null,
          type: r.type,
          isDeleted: r.isDeleted,
          createdAt: r.createdAt,
          fileKey: r.fileKey ?? null,
          fileName: r.fileName ?? null,
          fileSize: r.fileSize ?? null,
          fileMime: r.fileMime ?? null,
          fileHash: r.fileHash ?? null
        };
      }
      async getMessages(conversationId, limit = 50, offset = 0) {
        const rows = await this.db.select({
          id: messages.id,
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          content: messages.content,
          type: messages.type,
          isDeleted: messages.isDeleted,
          createdAt: messages.createdAt,
          fileName: messages.fileName,
          fileSize: messages.fileSize,
          fileMime: messages.fileMime,
          fileHash: messages.fileHash,
          senderName: users.name,
          senderEmail: users.email
        }).from(messages).leftJoin(users, eq22(messages.senderId, users.id)).where(
          and15(
            eq22(messages.conversationId, conversationId),
            eq22(messages.isDeleted, false)
          )
        ).orderBy(desc8(messages.createdAt)).limit(limit).offset(offset);
        return rows.map((row) => ({
          id: row.id,
          conversationId: row.conversationId,
          senderId: row.senderId,
          content: row.content ?? null,
          type: row.type,
          isDeleted: row.isDeleted,
          createdAt: row.createdAt,
          fileName: row.fileName ?? null,
          fileSize: row.fileSize ?? null,
          fileMime: row.fileMime ?? null,
          fileHash: row.fileHash ?? null,
          sender: {
            id: row.senderId,
            name: row.senderName ?? "",
            email: row.senderEmail ?? ""
          }
        }));
      }
      async softDeleteMessage(messageId, userId2) {
        const msg = await this.db.query.messages.findFirst({
          where: eq22(messages.id, messageId)
        });
        if (!msg || msg.senderId !== userId2) return false;
        await this.db.update(messages).set({ isDeleted: true }).where(eq22(messages.id, messageId));
        return true;
      }
    };
  }
});

// server/storage/storeage/models/session-storage.ts
import { eq as eq23, and as and16, lt, isNull as isNull5 } from "drizzle-orm";
var SessionStorage;
var init_session_storage = __esm({
  "server/storage/storeage/models/session-storage.ts"() {
    "use strict";
    init_schema();
    SessionStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      /** Create a new session on login */
      async create(data) {
        await this.db.insert(sessions).values(data);
      }
      /** Find session by JTI — used in authenticate middleware */
      async findById(jti) {
        return this.db.query.sessions.findFirst({
          where: eq23(sessions.id, jti)
        });
      }
      /** Check if a session is valid (exists, not expired, not revoked) */
      async isValid(jti) {
        const session = await this.findById(jti);
        if (!session) return false;
        if (session.revokedAt !== null) return false;
        if (session.expiresAt < /* @__PURE__ */ new Date()) return false;
        return true;
      }
      /** Revoke a single session (logout) */
      async revoke(jti) {
        await this.db.update(sessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq23(sessions.id, jti));
      }
      /** Revoke all active sessions for a user (e.g. password change, account compromise) */
      async revokeAllForUser(userId2) {
        await this.db.update(sessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(
          and16(
            eq23(sessions.userId, userId2),
            // Only revoke non-already-revoked sessions
            isNull5(sessions.revokedAt)
          )
        );
      }
      /** Revoke all active sessions for one recognized device */
      async revokeAllForDevice(userId2, deviceId) {
        await this.db.update(sessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(
          and16(
            eq23(sessions.userId, userId2),
            eq23(sessions.deviceId, deviceId),
            isNull5(sessions.revokedAt)
          )
        );
      }
      /** Find session by refresh token */
      async findByRefreshToken(refreshToken) {
        return this.db.query.sessions.findFirst({
          where: eq23(sessions.refreshToken, refreshToken)
        });
      }
      /**
       * Rotate refresh token: revoke old session and create a new one.
       * Call this on every successful token refresh to prevent replay attacks.
       */
      async rotate(oldJti, newJti, newRefreshToken, newExpiresAt, newRefreshExpiresAt) {
        await this.db.update(sessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq23(sessions.id, oldJti));
        const old = await this.findById(oldJti);
        await this.db.insert(sessions).values({
          id: newJti,
          userId: old.userId,
          expiresAt: newExpiresAt,
          refreshToken: newRefreshToken,
          refreshExpiresAt: newRefreshExpiresAt,
          ipAddress: old?.ipAddress ?? null,
          userAgent: old?.userAgent ?? null,
          deviceId: old?.deviceId ?? null
        });
      }
      /** Delete expired sessions (run periodically to keep table clean) */
      async deleteExpired() {
        await this.db.delete(sessions).where(lt(sessions.expiresAt, /* @__PURE__ */ new Date()));
      }
    };
  }
});

// server/storage/storeage/models/user-device-storage.ts
import { and as and17, desc as desc9, eq as eq24, isNull as isNull6, sql as sql10 } from "drizzle-orm";
import { randomUUID as randomUUID7 } from "crypto";
var UserDeviceStorage;
var init_user_device_storage = __esm({
  "server/storage/storeage/models/user-device-storage.ts"() {
    "use strict";
    init_schema();
    UserDeviceStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getByIdForUser(userId2, id) {
        return this.db.query.userDevices.findFirst({
          where: and17(eq24(userDevices.userId, userId2), eq24(userDevices.id, id))
        });
      }
      async getByDeviceId(userId2, deviceId) {
        return this.db.query.userDevices.findFirst({
          where: and17(eq24(userDevices.userId, userId2), eq24(userDevices.deviceId, deviceId))
        });
      }
      async upsertSeen(input) {
        const now = /* @__PURE__ */ new Date();
        const existing = await this.getByDeviceId(input.userId, input.deviceId);
        if (existing) {
          await this.db.update(userDevices).set({
            deviceName: input.deviceName ?? existing.deviceName ?? null,
            platform: input.platform ?? existing.platform ?? null,
            userAgent: input.userAgent ?? existing.userAgent ?? null,
            lastIp: input.lastIp ?? existing.lastIp ?? null,
            lastSeenAt: now,
            trustedAt: existing.trustedAt ?? now,
            revokedAt: null,
            updatedAt: now
          }).where(eq24(userDevices.id, existing.id));
          const device2 = await this.getByIdForUser(input.userId, existing.id);
          return { device: device2, isNewDevice: false };
        }
        const id = randomUUID7();
        await this.db.insert(userDevices).values({
          id,
          userId: input.userId,
          deviceId: input.deviceId,
          deviceName: input.deviceName ?? null,
          platform: input.platform ?? null,
          userAgent: input.userAgent ?? null,
          lastIp: input.lastIp ?? null,
          firstSeenAt: now,
          lastSeenAt: now,
          trustedAt: now,
          createdAt: now,
          updatedAt: now
        });
        const device = await this.getByIdForUser(input.userId, id);
        return { device, isNewDevice: true };
      }
      async listForUser(userId2, currentDeviceRowId) {
        const [devices, activeSessions] = await Promise.all([
          this.db.select().from(userDevices).where(eq24(userDevices.userId, userId2)).orderBy(desc9(userDevices.lastSeenAt)),
          this.db.select({
            deviceId: sessions.deviceId,
            count: sql10`count(*)`
          }).from(sessions).where(and17(eq24(sessions.userId, userId2), isNull6(sessions.revokedAt))).groupBy(sessions.deviceId)
        ]);
        const counts = /* @__PURE__ */ new Map();
        for (const row of activeSessions) {
          if (row.deviceId) counts.set(row.deviceId, Number(row.count) || 0);
        }
        return devices.map((device) => {
          const activeSessionCount = counts.get(device.deviceId) ?? 0;
          return {
            ...device,
            activeSessionCount,
            hasActiveSessions: activeSessionCount > 0,
            isCurrentDevice: currentDeviceRowId === device.id
          };
        });
      }
      async revokeById(userId2, id) {
        const device = await this.getByIdForUser(userId2, id);
        if (!device) return void 0;
        const now = /* @__PURE__ */ new Date();
        await this.db.update(userDevices).set({
          revokedAt: now,
          updatedAt: now
        }).where(eq24(userDevices.id, id));
        await this.db.update(sessions).set({ revokedAt: now }).where(
          and17(
            eq24(sessions.userId, userId2),
            eq24(sessions.deviceId, device.deviceId),
            isNull6(sessions.revokedAt)
          )
        );
        return this.getByIdForUser(userId2, id);
      }
    };
  }
});

// server/storage/storeage/models/user-two-factor-storage.ts
import { eq as eq25 } from "drizzle-orm";
var UserTwoFactorStorage;
var init_user_two_factor_storage = __esm({
  "server/storage/storeage/models/user-two-factor-storage.ts"() {
    "use strict";
    init_schema();
    UserTwoFactorStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getByUserId(userId2) {
        return this.db.query.userTwoFactor.findFirst({
          where: eq25(userTwoFactor.userId, userId2)
        });
      }
      async upsertSecret(userId2, secret) {
        const existing = await this.getByUserId(userId2);
        const now = /* @__PURE__ */ new Date();
        if (existing) {
          await this.db.update(userTwoFactor).set({
            secret,
            enabledAt: null,
            recoveryCodes: null,
            updatedAt: now
          }).where(eq25(userTwoFactor.userId, userId2));
        } else {
          await this.db.insert(userTwoFactor).values({
            userId: userId2,
            secret,
            enabledAt: null,
            recoveryCodes: null,
            createdAt: now,
            updatedAt: now
          });
        }
        return this.getByUserId(userId2);
      }
      async enable(userId2, secret, recoveryCodes) {
        const existing = await this.getByUserId(userId2);
        const now = /* @__PURE__ */ new Date();
        const recoveryCodesJson = JSON.stringify(recoveryCodes);
        if (existing) {
          await this.db.update(userTwoFactor).set({
            secret,
            recoveryCodes: recoveryCodesJson,
            enabledAt: now,
            updatedAt: now
          }).where(eq25(userTwoFactor.userId, userId2));
        } else {
          await this.db.insert(userTwoFactor).values({
            userId: userId2,
            secret,
            recoveryCodes: recoveryCodesJson,
            enabledAt: now,
            createdAt: now,
            updatedAt: now
          });
        }
        return this.getByUserId(userId2);
      }
      async updateRecoveryCodes(userId2, recoveryCodes) {
        await this.db.update(userTwoFactor).set({
          recoveryCodes: JSON.stringify(recoveryCodes),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq25(userTwoFactor.userId, userId2));
        return this.getByUserId(userId2);
      }
      async disable(userId2) {
        await this.db.delete(userTwoFactor).where(eq25(userTwoFactor.userId, userId2));
      }
    };
  }
});

// server/storage/storeage/models/auth-challenge-storage.ts
import { and as and18, eq as eq26, gt as gt2, isNull as isNull7, lt as lt2 } from "drizzle-orm";
var AuthChallengeStorage;
var init_auth_challenge_storage = __esm({
  "server/storage/storeage/models/auth-challenge-storage.ts"() {
    "use strict";
    init_schema();
    AuthChallengeStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async create(data) {
        await this.db.insert(authChallenges).values(data);
      }
      async getValidById(id) {
        return this.db.query.authChallenges.findFirst({
          where: and18(
            eq26(authChallenges.id, id),
            isNull7(authChallenges.completedAt),
            gt2(authChallenges.expiresAt, /* @__PURE__ */ new Date())
          )
        });
      }
      async complete(id) {
        await this.db.update(authChallenges).set({ completedAt: /* @__PURE__ */ new Date() }).where(eq26(authChallenges.id, id));
      }
      async deleteExpired() {
        await this.db.delete(authChallenges).where(
          and18(
            lt2(authChallenges.expiresAt, /* @__PURE__ */ new Date()),
            isNull7(authChallenges.completedAt)
          )
        );
      }
    };
  }
});

// server/storage/storeage/models/tarea-storage.ts
import { eq as eq27, and as and19, desc as desc10, sql as sql11, inArray as inArray6, count } from "drizzle-orm";
import { randomUUID as randomUUID8 } from "crypto";
function toDTO(t) {
  const now = /* @__PURE__ */ new Date();
  const vencida = t.estado !== "completada" && t.estado !== "cancelada" && t.fechaLimite !== null && t.fechaLimite < now;
  return {
    id: t.id,
    procesoId: t.procesoId,
    legalStage: t.legalStage ?? null,
    requerida: t.requerida === 1,
    titulo: t.titulo,
    descripcion: t.descripcion ?? null,
    estado: t.estado,
    prioridad: t.prioridad,
    fechaLimite: t.fechaLimite ?? null,
    fechaCompletada: t.fechaCompletada ?? null,
    asignado: t.asignadoA ? { id: t.asignadoA, nombre: t.asignadoANombre ?? "" } : null,
    creadoPor: { id: t.creadoPor, nombre: t.creadoPorNombre ?? "" },
    orden: t.orden,
    vencida,
    tiempoEstimado: t.tiempoEstimado != null ? parseFloat(String(t.tiempoEstimado)) : null,
    tiempoUnidad: t.tiempoUnidad,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  };
}
var TareaStorage;
var init_tarea_storage = __esm({
  "server/storage/storeage/models/tarea-storage.ts"() {
    "use strict";
    init_schema();
    TareaStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ── Create ─────────────────────────────────────────────────────────────────
      async create(data) {
        const id = randomUUID8();
        const row = {
          ...data,
          id,
          estado: data.estado ?? "pendiente",
          prioridad: data.prioridad ?? "media",
          orden: data.orden ?? 0,
          state: true
        };
        await this.db.insert(tareas).values(row);
        const created = await this.findById(id);
        return created;
      }
      // ── Enrich helpers ─────────────────────────────────────────────────────────
      /** Batch-fetches subtarea/observacion/archivo counts for a list of DTOs (3 queries total). */
      async enrichWithCounts(dtos) {
        if (dtos.length === 0) return dtos;
        const ids = dtos.map((d) => d.id);
        const [subRows, obsRows, arcRows] = await Promise.all([
          this.db.select({ tareaId: tareaSubtareas.tareaId, total: count(), completadas: sql11`SUM(CASE WHEN ${tareaSubtareas.estado} = 'completada' THEN 1 ELSE 0 END)` }).from(tareaSubtareas).where(inArray6(tareaSubtareas.tareaId, ids)).groupBy(tareaSubtareas.tareaId),
          this.db.select({ tareaId: tareaObservaciones.tareaId, total: count() }).from(tareaObservaciones).where(inArray6(tareaObservaciones.tareaId, ids)).groupBy(tareaObservaciones.tareaId),
          this.db.select({ tareaId: tareaArchivos.tareaId, total: count() }).from(tareaArchivos).where(inArray6(tareaArchivos.tareaId, ids)).groupBy(tareaArchivos.tareaId)
        ]);
        const subMap = new Map(subRows.map((r) => [r.tareaId, { total: Number(r.total), completadas: Number(r.completadas ?? 0) }]));
        const obsMap = new Map(obsRows.map((r) => [r.tareaId, Number(r.total)]));
        const arcMap = new Map(arcRows.map((r) => [r.tareaId, Number(r.total)]));
        return dtos.map((d) => ({
          ...d,
          subtareasTotal: subMap.get(d.id)?.total ?? 0,
          subtareasCompletadas: subMap.get(d.id)?.completadas ?? 0,
          observacionesTotal: obsMap.get(d.id) ?? 0,
          archivosTotal: arcMap.get(d.id) ?? 0
        }));
      }
      // ── Find ───────────────────────────────────────────────────────────────────
      async findById(id) {
        const row = await this.db.query.tareas.findFirst({
          where: eq27(tareas.id, id)
        });
        if (!row) return void 0;
        const [enriched] = await this.enrichWithCounts([toDTO(row)]);
        return enriched;
      }
      async findRawById(id) {
        return this.db.query.tareas.findFirst({ where: eq27(tareas.id, id) });
      }
      async findByProceso(procesoId, stage) {
        const conditions = [eq27(tareas.procesoId, procesoId), eq27(tareas.state, true)];
        if (stage !== void 0) {
          conditions.push(eq27(tareas.legalStage, stage));
        }
        const rows = await this.db.select().from(tareas).where(and19(...conditions)).orderBy(desc10(tareas.orden), desc10(tareas.createdAt));
        return this.enrichWithCounts(rows.map(toDTO));
      }
      /** Tareas de un abogado en todos sus procesos, agrupadas por estado */
      async findByLawyer(lawyerProfileId) {
        const rows = await this.db.select().from(tareas).where(
          and19(
            eq27(tareas.asignadoA, lawyerProfileId),
            eq27(tareas.state, true)
          )
        ).orderBy(tareas.fechaLimite, desc10(tareas.createdAt));
        const dtos = await this.enrichWithCounts(rows.map(toDTO));
        const pendientes = [];
        const en_progreso = [];
        const vencidas = [];
        const completadas = [];
        for (const t of dtos) {
          if (t.estado === "completada" || t.estado === "cancelada") {
            completadas.push(t);
          } else if (t.vencida) {
            vencidas.push(t);
          } else if (t.estado === "en_progreso") {
            en_progreso.push(t);
          } else {
            pendientes.push(t);
          }
        }
        return { pendientes, en_progreso, vencidas, completadas };
      }
      // ── Update ─────────────────────────────────────────────────────────────────
      async update(id, data) {
        await this.db.update(tareas).set(data).where(eq27(tareas.id, id));
        return this.findById(id);
      }
      async updateEstado(id, estado, fechaCompletada) {
        await this.db.update(tareas).set({
          estado,
          ...fechaCompletada !== void 0 ? { fechaCompletada } : {}
        }).where(eq27(tareas.id, id));
        return this.findById(id);
      }
      // ── Stats ──────────────────────────────────────────────────────────────────
      async countByLawyer(lawyerProfileId) {
        const rows = await this.db.select({
          total: sql11`COUNT(*)`,
          pendientes: sql11`SUM(CASE WHEN ${tareas.estado} = 'pendiente' THEN 1 ELSE 0 END)`,
          en_progreso: sql11`SUM(CASE WHEN ${tareas.estado} = 'en_progreso' THEN 1 ELSE 0 END)`,
          completadas: sql11`SUM(CASE WHEN ${tareas.estado} = 'completada' THEN 1 ELSE 0 END)`
        }).from(tareas).where(and19(eq27(tareas.asignadoA, lawyerProfileId), eq27(tareas.state, true)));
        return {
          total: Number(rows[0]?.total ?? 0),
          pendientes: Number(rows[0]?.pendientes ?? 0),
          en_progreso: Number(rows[0]?.en_progreso ?? 0),
          completadas: Number(rows[0]?.completadas ?? 0)
        };
      }
      /** Conteos por proceso — una sola query para múltiples IDs */
      async countByProcesoIds(procesoIds) {
        const map = /* @__PURE__ */ new Map();
        if (procesoIds.length === 0) return map;
        const rows = await this.db.select({
          procesoId: tareas.procesoId,
          total: sql11`COUNT(*)`,
          pendientes: sql11`SUM(CASE WHEN ${tareas.estado} = 'pendiente' THEN 1 ELSE 0 END)`,
          en_progreso: sql11`SUM(CASE WHEN ${tareas.estado} = 'en_progreso' THEN 1 ELSE 0 END)`,
          completadas: sql11`SUM(CASE WHEN ${tareas.estado} = 'completada' THEN 1 ELSE 0 END)`
        }).from(tareas).where(and19(inArray6(tareas.procesoId, procesoIds), eq27(tareas.state, true))).groupBy(tareas.procesoId);
        for (const row of rows) {
          map.set(row.procesoId, {
            total: Number(row.total),
            pendientes: Number(row.pendientes ?? 0),
            en_progreso: Number(row.en_progreso ?? 0),
            completadas: Number(row.completadas ?? 0)
          });
        }
        return map;
      }
      // ── Gate: tareas requeridas pendientes en una etapa ───────────────────────
      async getRequiredPendingByStage(procesoId, legalStage) {
        return this.db.select().from(tareas).where(
          and19(
            eq27(tareas.procesoId, procesoId),
            eq27(tareas.legalStage, legalStage),
            eq27(tareas.requerida, 1),
            inArray6(tareas.estado, ["pendiente", "en_progreso"])
          )
        );
      }
      // ── Get raw by id ──────────────────────────────────────────────────────────
      async getById(id) {
        const [row] = await this.db.select().from(tareas).where(eq27(tareas.id, id));
        return row ?? null;
      }
      // ── Delete (soft) ──────────────────────────────────────────────────────────
      async softDelete(id) {
        await this.db.update(tareas).set({ state: false }).where(eq27(tareas.id, id));
      }
    };
  }
});

// server/storage/storeage/models/persona-storage.ts
import { eq as eq28 } from "drizzle-orm";
import { randomUUID as randomUUID9 } from "crypto";
var PersonaStorage;
var init_persona_storage = __esm({
  "server/storage/storeage/models/persona-storage.ts"() {
    "use strict";
    init_schema();
    init_identity_uniqueness();
    PersonaStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async createPersona(data, tx) {
        const db2 = tx ?? this.db;
        const id = randomUUID9();
        const documento = await assertDocumentoUnique(db2, data.documento);
        await db2.insert(personas).values({
          ...data,
          id,
          documento,
          nombre: normalizeLooseText(data.nombre),
          apellido: normalizeLooseText(data.apellido),
          telefono: normalizeLooseText(data.telefono)
        });
        const result = await db2.select().from(personas).where(eq28(personas.id, id)).limit(1);
        if (!result[0]) throw new Error("No se pudo crear la persona");
        return result[0];
      }
      async getPersona(id) {
        const result = await this.db.select().from(personas).where(eq28(personas.id, id)).limit(1);
        return result[0];
      }
      async updatePersona(id, updates, tx) {
        const db2 = tx ?? this.db;
        const safeUpdates = { ...updates };
        if (updates.documento !== void 0) {
          safeUpdates.documento = await assertDocumentoUnique(db2, updates.documento, id);
        }
        if (updates.nombre !== void 0) {
          safeUpdates.nombre = normalizeLooseText(updates.nombre);
        }
        if (updates.apellido !== void 0) {
          safeUpdates.apellido = normalizeLooseText(updates.apellido);
        }
        if (updates.telefono !== void 0) {
          safeUpdates.telefono = normalizeLooseText(updates.telefono);
        }
        await db2.update(personas).set(safeUpdates).where(eq28(personas.id, id));
        return this.getPersona(id);
      }
      async deletePersona(id) {
        await this.db.delete(personas).where(eq28(personas.id, id));
      }
    };
  }
});

// server/storage/storeage/models/representante-legal-storage.ts
import { eq as eq29 } from "drizzle-orm";
import { randomUUID as randomUUID10 } from "crypto";
var RepresentanteLegalStorage;
var init_representante_legal_storage = __esm({
  "server/storage/storeage/models/representante-legal-storage.ts"() {
    "use strict";
    init_schema();
    RepresentanteLegalStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async createRepresentante(data, tx) {
        const db2 = tx ?? this.db;
        const id = randomUUID10();
        await db2.insert(representantesLegales).values({ ...data, id });
        return { id, ...data, persona: null };
      }
      async getRepresentante(id) {
        const result = await this.db.select({
          id: representantesLegales.id,
          personaId: representantesLegales.personaId,
          cargo: representantesLegales.cargo,
          email: representantesLegales.email,
          persona: {
            id: personas.id,
            nombre: personas.nombre,
            apellido: personas.apellido,
            telefono: personas.telefono,
            documento: personas.documento,
            tipoDocumentoId: personas.tipoDocumentoId,
            direccion: personas.direccion,
            departamentoId: personas.departamentoId,
            municipioId: personas.municipioId
          }
        }).from(representantesLegales).leftJoin(personas, eq29(representantesLegales.personaId, personas.id)).where(eq29(representantesLegales.id, id)).limit(1);
        if (!result[0]) return void 0;
        return {
          ...result[0],
          persona: result[0].persona?.id ? result[0].persona : null
        };
      }
      async getRepresentantesByPersona(personaId) {
        return this.db.select().from(representantesLegales).where(eq29(representantesLegales.personaId, personaId));
      }
      async updateRepresentante(id, updates, tx) {
        const db2 = tx ?? this.db;
        await db2.update(representantesLegales).set(updates).where(eq29(representantesLegales.id, id));
        return this.getRepresentante(id);
      }
      async deleteRepresentante(id) {
        await this.db.delete(representantesLegales).where(eq29(representantesLegales.id, id));
      }
    };
  }
});

// server/storage/storeage/models/community-storage.ts
import { randomUUID as randomUUID11 } from "crypto";
import { eq as eq30, and as and20, desc as desc11, sql as sql12, inArray as inArray7, isNull as isNull8 } from "drizzle-orm";
var CommunityStorage;
var init_community_storage = __esm({
  "server/storage/storeage/models/community-storage.ts"() {
    "use strict";
    init_schema();
    init_user_schema();
    init_rol_schema();
    init_lawyer_profile_schema();
    init_firm_profile_schema();
    init_proceso_schema();
    init_rating_schema();
    CommunityStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ── helpers ──────────────────────────────────────────────────────────────
      async enrichPost(row, userId2) {
        const [likeCountRow, likedRow, bookmarkedRow, postTagRows] = await Promise.all([
          this.db.select({ c: sql12`COUNT(*)` }).from(postLikes).where(eq30(postLikes.postId, row.id)),
          userId2 ? this.db.select().from(postLikes).where(and20(eq30(postLikes.postId, row.id), eq30(postLikes.userId, userId2))).limit(1) : Promise.resolve([]),
          userId2 ? this.db.select().from(postBookmarks).where(and20(eq30(postBookmarks.postId, row.id), eq30(postBookmarks.userId, userId2))).limit(1) : Promise.resolve([]),
          this.db.select({ id: tags.id, name: tags.name, slug: tags.slug }).from(postTags).innerJoin(tags, eq30(tags.id, postTags.tagId)).where(eq30(postTags.postId, row.id))
        ]);
        return {
          id: row.id,
          userId: row.userId,
          title: row.title,
          content: row.content,
          visibility: row.visibility,
          caseType: row.caseType ?? null,
          isUrgent: row.isUrgent ?? 0,
          city: row.city ?? null,
          viewCount: row.viewCount ?? 0,
          status: row.status ?? "open",
          disabled: row.disabled ?? false,
          takenByLawyerId: row.takenByLawyerId ?? null,
          takenByUserId: row.takenByUserId ?? null,
          takenAt: row.takenAt ?? null,
          takenExpiresAt: row.takenExpiresAt ?? null,
          clientAccepted: row.clientAccepted ?? null,
          procesoId: row.procesoId ?? null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          author: row.visibility === "anonymous" ? null : {
            id: row.userId,
            name: row.authorName ?? "",
            email: row.authorEmail ?? "",
            rol: row.authorRole ?? "",
            isProfessionallyVerified: Boolean(row.authorProfessionallyVerified)
          },
          commentCount: Number(row.commentCount ?? 0),
          likeCount: Number(likeCountRow[0]?.c ?? 0),
          isLiked: likedRow.length > 0,
          isBookmarked: bookmarkedRow.length > 0,
          tags: postTagRows,
          takenByName: row.takenByName ?? null,
          takenByProfessionallyVerified: Boolean(row.takenByProfessionallyVerified)
        };
      }
      // ── Posts ─────────────────────────────────────────────────────────────────
      async createPost(data) {
        const id = randomUUID11();
        await this.db.insert(posts).values({ id, ...data });
        const result = await this.db.select().from(posts).where(eq30(posts.id, id)).limit(1);
        return result[0];
      }
      async getPost(id) {
        const result = await this.db.select().from(posts).where(and20(eq30(posts.id, id), eq30(posts.disabled, false))).limit(1);
        return result[0];
      }
      async getPosts(limit = 20, offset = 0, filter = {}, userId2) {
        let query = this.db.select({
          id: posts.id,
          userId: posts.userId,
          title: posts.title,
          content: posts.content,
          visibility: posts.visibility,
          caseType: posts.caseType,
          isUrgent: posts.isUrgent,
          city: posts.city,
          viewCount: posts.viewCount,
          status: posts.status,
          disabled: posts.disabled,
          takenByLawyerId: posts.takenByLawyerId,
          takenByUserId: posts.takenByUserId,
          takenAt: posts.takenAt,
          takenExpiresAt: posts.takenExpiresAt,
          clientAccepted: posts.clientAccepted,
          procesoId: posts.procesoId,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          authorName: users.name,
          authorEmail: users.email,
          authorRole: roles.nombre,
          authorProfessionallyVerified: sql12`(
          SELECT CASE
            WHEN EXISTS (
              SELECT 1 FROM lawyer_profiles lp2
              WHERE lp2.user_id = ${posts.userId}
                AND lp2.professional_verification_status = 'verificado'
            ) THEN 1 ELSE 0 END
        )`,
          commentCount: sql12`(SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id})`,
          takenByProfessionallyVerified: sql12`(
          SELECT CASE
            WHEN EXISTS (
              SELECT 1 FROM lawyer_profiles lp3
              WHERE lp3.user_id = ${posts.takenByUserId}
                AND lp3.professional_verification_status = 'verificado'
            ) THEN 1 ELSE 0 END
        )`
        }).from(posts).leftJoin(users, eq30(posts.userId, users.id)).leftJoin(roles, eq30(users.rolId, roles.id));
        let tagId = null;
        if (filter.tagSlug) {
          const tagRow = await this.db.select().from(tags).where(eq30(tags.slug, filter.tagSlug)).limit(1);
          tagId = tagRow[0]?.id ?? null;
        }
        const conditions = [];
        if (!filter.includeDisabled) conditions.push(eq30(posts.disabled, false));
        if (filter.authorId) conditions.push(eq30(posts.userId, filter.authorId));
        if (filter.unlinkedOnly) conditions.push(isNull8(posts.procesoId));
        if (filter.clientAccepted) conditions.push(eq30(posts.clientAccepted, 1));
        if (conditions.length > 0) {
          query = query.where(conditions.length === 1 ? conditions[0] : and20(...conditions));
        }
        const rows = await (filter.sort === "popular" ? query.orderBy(desc11(posts.viewCount)) : filter.sort === "liked" ? query.orderBy(desc11(sql12`(SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = ${posts.id})`)) : query.orderBy(desc11(posts.createdAt))).limit(limit).offset(offset);
        let filtered = rows;
        if (filter.search) {
          const q = filter.search.toLowerCase();
          filtered = filtered.filter(
            (r) => r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q)
          );
        }
        if (filter.city) {
          const c = filter.city.toLowerCase();
          filtered = filtered.filter((r) => (r.city ?? "").toLowerCase() === c);
        }
        if (tagId) {
          const taggedPostIds = await this.db.select({ postId: postTags.postId }).from(postTags).where(eq30(postTags.tagId, tagId));
          const ids = new Set(taggedPostIds.map((r) => r.postId));
          filtered = filtered.filter((r) => ids.has(r.id));
        }
        if (filter.ids && filter.ids.length > 0) {
          const allowed = new Set(filter.ids);
          filtered = filtered.filter((r) => allowed.has(r.id));
        }
        return Promise.all(filtered.map((row) => this.enrichPost(row, userId2)));
      }
      async getPostDTO(id, userId2) {
        const rows = await this.db.select({
          id: posts.id,
          userId: posts.userId,
          title: posts.title,
          content: posts.content,
          visibility: posts.visibility,
          caseType: posts.caseType,
          isUrgent: posts.isUrgent,
          city: posts.city,
          viewCount: posts.viewCount,
          status: posts.status,
          disabled: posts.disabled,
          takenByLawyerId: posts.takenByLawyerId,
          takenByUserId: posts.takenByUserId,
          takenAt: posts.takenAt,
          takenExpiresAt: posts.takenExpiresAt,
          clientAccepted: posts.clientAccepted,
          procesoId: posts.procesoId,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          authorName: users.name,
          authorEmail: users.email,
          authorRole: roles.nombre,
          authorProfessionallyVerified: sql12`(
          SELECT CASE
            WHEN EXISTS (
              SELECT 1 FROM lawyer_profiles lp2
              WHERE lp2.user_id = ${posts.userId}
                AND lp2.professional_verification_status = 'verificado'
            ) THEN 1 ELSE 0 END
        )`,
          takenByName: sql12`(SELECT name FROM users WHERE id = ${posts.takenByUserId})`,
          takenByProfessionallyVerified: sql12`(
          SELECT CASE
            WHEN EXISTS (
              SELECT 1 FROM lawyer_profiles lp3
              WHERE lp3.user_id = ${posts.takenByUserId}
                AND lp3.professional_verification_status = 'verificado'
            ) THEN 1 ELSE 0 END
        )`,
          commentCount: sql12`(SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id})`
        }).from(posts).leftJoin(users, eq30(posts.userId, users.id)).leftJoin(roles, eq30(users.rolId, roles.id)).where(and20(eq30(posts.id, id), eq30(posts.disabled, false))).limit(1);
        const row = rows[0];
        if (!row) return void 0;
        return this.enrichPost(row, userId2);
      }
      async updatePost(id, data) {
        await this.db.update(posts).set(data).where(eq30(posts.id, id));
      }
      async deletePost(id) {
        await this.db.delete(posts).where(eq30(posts.id, id));
      }
      /** Link a community post to a proceso (bidirectional). */
      async setPostProceso(postId, procesoId) {
        await this.db.update(posts).set({ procesoId }).where(eq30(posts.id, postId));
      }
      /** Atomically claim a post. Returns false if already taken or not found. */
      async takePost(postId, lawyerProfileId, lawyerUserId) {
        const open = await this.db.select({ id: posts.id }).from(posts).where(and20(eq30(posts.id, postId), eq30(posts.status, "open"), eq30(posts.disabled, false))).limit(1);
        if (open.length === 0) return false;
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1e3);
        await this.db.update(posts).set({
          status: "in_progress",
          takenByLawyerId: lawyerProfileId,
          takenByUserId: lawyerUserId,
          takenAt: /* @__PURE__ */ new Date(),
          takenExpiresAt: expiresAt,
          clientAccepted: null
        }).where(and20(eq30(posts.id, postId), eq30(posts.status, "open"), eq30(posts.disabled, false)));
        return true;
      }
      async setPostDisabled(postId, disabled) {
        await this.db.update(posts).set({ disabled }).where(eq30(posts.id, postId));
      }
      /** Client rejects the lawyer — post goes back to open. */
      async rejectTake(postId, clientUserId) {
        const row = await this.db.select({ id: posts.id, takenByUserId: posts.takenByUserId }).from(posts).where(and20(
          eq30(posts.id, postId),
          eq30(posts.userId, clientUserId),
          eq30(posts.status, "in_progress")
        )).limit(1);
        if (row.length === 0) return false;
        await this.db.update(posts).set({
          status: "open",
          takenByLawyerId: null,
          takenByUserId: null,
          takenAt: null,
          takenExpiresAt: null,
          clientAccepted: 0
        }).where(eq30(posts.id, postId));
        return true;
      }
      /** Client accepts — marks clientAccepted=1 (post stays in_progress). */
      async acceptTake(postId, clientUserId) {
        const row = await this.db.select({ id: posts.id }).from(posts).where(and20(
          eq30(posts.id, postId),
          eq30(posts.userId, clientUserId),
          eq30(posts.status, "in_progress")
        )).limit(1);
        if (row.length === 0) return false;
        await this.db.update(posts).set({ clientAccepted: 1 }).where(eq30(posts.id, postId));
        return true;
      }
      /**
       * Reset all in_progress posts whose 48h window expired without client response.
       * Returns expired post data for notification purposes.
       */
      async expireStale() {
        const expired = await this.db.select({
          id: posts.id,
          title: posts.title,
          userId: posts.userId,
          takenByUserId: posts.takenByUserId
        }).from(posts).where(and20(
          eq30(posts.status, "in_progress"),
          sql12`${posts.clientAccepted} IS NULL`,
          sql12`${posts.takenExpiresAt} < NOW()`
        ));
        if (expired.length === 0) return [];
        const ids = expired.map((r) => r.id);
        await this.db.update(posts).set({
          status: "open",
          takenByLawyerId: null,
          takenByUserId: null,
          takenAt: null,
          takenExpiresAt: null,
          clientAccepted: null
        }).where(inArray7(posts.id, ids));
        return expired;
      }
      /** Let the post author mark their own case as closed/resolved. */
      async closePost(postId, userId2) {
        await this.db.update(posts).set({ status: "closed" }).where(and20(eq30(posts.id, postId), eq30(posts.userId, userId2)));
      }
      async incrementViewCount(id) {
        await this.db.update(posts).set({ viewCount: sql12`view_count + 1` }).where(eq30(posts.id, id));
      }
      /** Returns true if this is the first time this user views the post (view was recorded). */
      async recordUserView(postId, userId2) {
        const existing = await this.db.select().from(postViews).where(and20(eq30(postViews.postId, postId), eq30(postViews.userId, userId2))).limit(1);
        if (existing.length > 0) return false;
        await this.db.insert(postViews).values({ postId, userId: userId2 });
        await this.db.update(posts).set({ viewCount: sql12`view_count + 1` }).where(eq30(posts.id, postId));
        return true;
      }
      // ── Comments ──────────────────────────────────────────────────────────────
      async createComment(data) {
        const id = randomUUID11();
        await this.db.insert(comments).values({ id, ...data });
        const result = await this.db.select().from(comments).where(eq30(comments.id, id)).limit(1);
        return result[0];
      }
      async getComment(id) {
        const result = await this.db.select().from(comments).where(eq30(comments.id, id)).limit(1);
        return result[0];
      }
      async updateComment(id, content) {
        await this.db.update(comments).set({ content }).where(eq30(comments.id, id));
      }
      async deleteComment(id) {
        await this.db.delete(comments).where(eq30(comments.id, id));
      }
      async getCommentsByPost(postId) {
        const rows = await this.db.select({
          id: comments.id,
          postId: comments.postId,
          userId: comments.userId,
          content: comments.content,
          parentId: comments.parentId,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          authorName: users.name,
          authorEmail: users.email,
          authorRole: roles.nombre,
          authorProfessionallyVerified: sql12`(
          SELECT CASE
            WHEN EXISTS (
              SELECT 1 FROM lawyer_profiles lp2
              WHERE lp2.user_id = ${comments.userId}
                AND lp2.professional_verification_status = 'verificado'
            ) THEN 1 ELSE 0 END
        )`
        }).from(comments).leftJoin(users, eq30(comments.userId, users.id)).leftJoin(roles, eq30(users.rolId, roles.id)).where(eq30(comments.postId, postId)).orderBy(comments.createdAt);
        const all = rows.map((row) => ({
          id: row.id,
          postId: row.postId,
          userId: row.userId,
          content: row.content,
          parentId: row.parentId ?? null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          author: {
            id: row.userId,
            name: row.authorName ?? "",
            email: row.authorEmail ?? "",
            rol: row.authorRole ?? "",
            isProfessionallyVerified: Boolean(row.authorProfessionallyVerified)
          },
          replies: []
        }));
        const map = new Map(all.map((c) => [c.id, c]));
        const roots = [];
        for (const c of all) {
          if (c.parentId && map.has(c.parentId)) {
            map.get(c.parentId).replies.push(c);
          } else {
            roots.push(c);
          }
        }
        return roots;
      }
      // ── Likes ─────────────────────────────────────────────────────────────────
      async togglePostLike(postId, userId2) {
        const existing = await this.db.select().from(postLikes).where(and20(eq30(postLikes.postId, postId), eq30(postLikes.userId, userId2))).limit(1);
        if (existing.length > 0) {
          await this.db.delete(postLikes).where(and20(eq30(postLikes.postId, postId), eq30(postLikes.userId, userId2)));
        } else {
          await this.db.insert(postLikes).values({ id: randomUUID11(), postId, userId: userId2 });
        }
        const countRow = await this.db.select({ c: sql12`COUNT(*)` }).from(postLikes).where(eq30(postLikes.postId, postId));
        return { liked: existing.length === 0, likeCount: Number(countRow[0]?.c ?? 0) };
      }
      // ── Bookmarks ─────────────────────────────────────────────────────────────
      async toggleBookmark(postId, userId2) {
        const existing = await this.db.select().from(postBookmarks).where(and20(eq30(postBookmarks.postId, postId), eq30(postBookmarks.userId, userId2))).limit(1);
        if (existing.length > 0) {
          await this.db.delete(postBookmarks).where(and20(eq30(postBookmarks.postId, postId), eq30(postBookmarks.userId, userId2)));
          return { bookmarked: false };
        }
        await this.db.insert(postBookmarks).values({ id: randomUUID11(), postId, userId: userId2 });
        return { bookmarked: true };
      }
      async getBookmarkedPosts(userId2) {
        const bookmarkRows = await this.db.select({ postId: postBookmarks.postId }).from(postBookmarks).where(eq30(postBookmarks.userId, userId2)).orderBy(desc11(postBookmarks.createdAt));
        if (bookmarkRows.length === 0) return [];
        const ids = bookmarkRows.map((r) => r.postId);
        const rows = await this.db.select({
          id: posts.id,
          userId: posts.userId,
          title: posts.title,
          content: posts.content,
          visibility: posts.visibility,
          caseType: posts.caseType,
          isUrgent: posts.isUrgent,
          city: posts.city,
          viewCount: posts.viewCount,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          authorName: users.name,
          authorEmail: users.email,
          commentCount: sql12`(SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id})`
        }).from(posts).leftJoin(users, eq30(posts.userId, users.id)).where(inArray7(posts.id, ids));
        return Promise.all(rows.map((row) => this.enrichPost(row, userId2)));
      }
      // ── Tags ──────────────────────────────────────────────────────────────────
      async getAllTags() {
        return this.db.select().from(tags).orderBy(tags.name);
      }
      async setPostTags(postId, tagIds) {
        await this.db.delete(postTags).where(eq30(postTags.postId, postId));
        if (tagIds.length > 0) {
          await this.db.insert(postTags).values(tagIds.map((tagId) => ({ postId, tagId })));
        }
      }
      // ── Reports ───────────────────────────────────────────────────────────────
      async createReport(data) {
        await this.db.insert(postReports).values({ id: randomUUID11(), ...data });
      }
      // ── User Profile ──────────────────────────────────────────────────────────
      async getUserProfile(userId2, viewerUserId) {
        const userRows = await this.db.select({ id: users.id, name: users.name, email: users.email, rolId: users.rolId, rolNombre: roles.nombre }).from(users).leftJoin(roles, eq30(users.rolId, roles.id)).where(eq30(users.id, userId2)).limit(1);
        const userRow = userRows[0];
        if (!userRow) return null;
        const rolNombre = userRow.rolNombre ?? "cliente";
        let lawyerInfo = null;
        let firmInfo = null;
        if (rolNombre === "abogado") {
          const lawyerRows = await this.db.select({
            specialization: lawyerProfiles.specialization,
            licenseNumber: lawyerProfiles.licenseNumber,
            firmName: firmProfiles.name,
            professionalVerificationStatus: lawyerProfiles.professionalVerificationStatus
          }).from(lawyerProfiles).leftJoin(firmProfiles, eq30(lawyerProfiles.firmId, firmProfiles.id)).where(eq30(lawyerProfiles.userId, userId2)).limit(1);
          if (lawyerRows[0]) {
            lawyerInfo = {
              specialization: lawyerRows[0].specialization ?? null,
              licenseNumber: lawyerRows[0].licenseNumber ?? null,
              firmName: lawyerRows[0].firmName ?? null,
              professionalVerificationStatus: lawyerRows[0].professionalVerificationStatus ?? "pendiente"
            };
          }
        } else if (rolNombre === "bufete") {
          const firmRows = await this.db.select({ nit: firmProfiles.nit, address: firmProfiles.address, phone: firmProfiles.phone }).from(firmProfiles).where(eq30(firmProfiles.userId, userId2)).limit(1);
          if (firmRows[0]) {
            firmInfo = { nit: firmRows[0].nit, address: firmRows[0].address ?? null, phone: firmRows[0].phone ?? null };
          }
        }
        const userPosts = await this.db.select({
          id: posts.id,
          userId: posts.userId,
          title: posts.title,
          content: posts.content,
          visibility: posts.visibility,
          caseType: posts.caseType,
          isUrgent: posts.isUrgent,
          city: posts.city,
          viewCount: posts.viewCount,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          authorName: users.name,
          authorEmail: users.email,
          status: posts.status,
          disabled: posts.disabled,
          takenByLawyerId: posts.takenByLawyerId,
          takenByUserId: posts.takenByUserId,
          takenAt: posts.takenAt,
          takenExpiresAt: posts.takenExpiresAt,
          clientAccepted: posts.clientAccepted,
          procesoId: posts.procesoId,
          takenByName: sql12`(SELECT name FROM users WHERE id = ${posts.takenByUserId})`,
          takenByProfessionallyVerified: sql12`(
          SELECT CASE
            WHEN EXISTS (
              SELECT 1 FROM lawyer_profiles lp3
              WHERE lp3.user_id = ${posts.takenByUserId}
                AND lp3.professional_verification_status = 'verificado'
            ) THEN 1 ELSE 0 END
        )`,
          commentCount: sql12`(SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id})`
        }).from(posts).leftJoin(users, eq30(posts.userId, users.id)).where(and20(eq30(posts.userId, userId2), eq30(posts.disabled, false))).orderBy(desc11(posts.createdAt)).limit(50);
        const userPostDTOs = await Promise.all(userPosts.map((row) => this.enrichPost(row, viewerUserId)));
        return {
          user: { id: userRow.id, name: userRow.name ?? "", email: userRow.email },
          role: rolNombre,
          lawyerInfo,
          firmInfo,
          posts: userPostDTOs
        };
      }
      // ── Community stats for a lawyer ─────────────────────────────────────────
      async getLawyerCommunityStats(lawyerUserId) {
        const takenRow = await this.db.select({ c: sql12`COUNT(*)` }).from(posts).where(eq30(posts.takenByUserId, lawyerUserId));
        const casesTaken = Number(takenRow[0]?.c ?? 0);
        const linkedRow = await this.db.select({ c: sql12`COUNT(*)` }).from(procesos).innerJoin(
          posts,
          and20(
            eq30(posts.procesoId, procesos.id),
            eq30(posts.takenByUserId, lawyerUserId)
          )
        ).where(sql12`${procesos.communityPostId} IS NOT NULL`);
        const processesLinked = Number(linkedRow[0]?.c ?? 0);
        const ratingRows = await this.db.select({
          avg: sql12`AVG(${ratings.score})`,
          count: sql12`COUNT(*)`
        }).from(ratings).where(and20(eq30(ratings.targetUserId, lawyerUserId), eq30(ratings.targetType, "lawyer")));
        const avgRating = Math.round(Number(ratingRows[0]?.avg ?? 0) * 10) / 10;
        const ratingCount = Number(ratingRows[0]?.count ?? 0);
        const conversionRate = casesTaken > 0 ? Math.round(processesLinked / casesTaken * 100) : 0;
        const badges = [];
        if (processesLinked >= 1) badges.push("primer_caso");
        if (processesLinked >= 5) badges.push("comprometido");
        if (conversionRate >= 80 && casesTaken >= 3) badges.push("alta_conversion");
        if (avgRating >= 4.5 && ratingCount >= 3) badges.push("valorado");
        return { casesTaken, processesLinked, conversionRate, avgRating, ratingCount, badges };
      }
    };
  }
});

// server/storage/storeage/models/rating-storage.ts
import { randomUUID as randomUUID12 } from "crypto";
import { and as and21, avg, count as count2, eq as eq31, sql as sql13 } from "drizzle-orm";
var RatingStorage;
var init_rating_storage = __esm({
  "server/storage/storeage/models/rating-storage.ts"() {
    "use strict";
    init_schema();
    init_user_schema();
    init_cliente_schema();
    init_lawyer_profile_schema();
    init_firm_profile_schema();
    init_proceso_schema();
    init_proceso_lawyer_schema();
    init_estado_proceso_schema();
    RatingStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async createRating(data) {
        const id = randomUUID12();
        await this.db.insert(ratings).values({ id, ...data });
        const result = await this.db.select().from(ratings).where(eq31(ratings.id, id)).limit(1);
        return result[0];
      }
      async getRating(fromUserId, targetUserId, targetType) {
        const result = await this.db.select().from(ratings).where(
          and21(
            eq31(ratings.fromUserId, fromUserId),
            eq31(ratings.targetUserId, targetUserId),
            eq31(ratings.targetType, targetType)
          )
        ).limit(1);
        return result[0];
      }
      async getRatings(targetUserId, targetType) {
        const rows = await this.db.select({
          id: ratings.id,
          fromUserId: ratings.fromUserId,
          targetUserId: ratings.targetUserId,
          targetType: ratings.targetType,
          score: ratings.score,
          comment: ratings.comment,
          procesoId: ratings.procesoId,
          createdAt: ratings.createdAt,
          fromName: users.name
        }).from(ratings).leftJoin(users, eq31(ratings.fromUserId, users.id)).where(
          and21(
            eq31(ratings.targetUserId, targetUserId),
            eq31(ratings.targetType, targetType)
          )
        ).orderBy(sql13`${ratings.createdAt} DESC`);
        return rows.map((r) => ({
          id: r.id,
          fromUserId: r.fromUserId,
          targetUserId: r.targetUserId,
          targetType: r.targetType,
          score: r.score,
          comment: r.comment ?? null,
          procesoId: r.procesoId,
          createdAt: r.createdAt,
          fromUser: { id: r.fromUserId, name: r.fromName ?? "Usuario" }
        }));
      }
      async getRatingSummary(targetUserId, targetType) {
        const result = await this.db.select({
          avg: avg(ratings.score),
          count: count2()
        }).from(ratings).where(
          and21(
            eq31(ratings.targetUserId, targetUserId),
            eq31(ratings.targetType, targetType)
          )
        );
        return {
          avg: Number(result[0]?.avg ?? 0),
          count: Number(result[0]?.count ?? 0)
        };
      }
      /**
       * Checks whether a client (identified by their userId) is allowed to rate
       * a target. The rule: client must have at least one completed proceso
       * involving the target lawyer/firm.
       *
       * "Finalizado" is identified by estado_proceso.codigo = 'finalizado'.
       */
      /** Returns the first completed procesoId linking fromUser to the target, or null */
      async findQualifyingProceso(fromUserId, targetUserId, targetType) {
        if (targetType === "lawyer") {
          const rows2 = await this.db.select({ id: procesos.id }).from(procesos).innerJoin(clientes, eq31(procesos.clienteId, clientes.id)).innerJoin(procesoLawyers, eq31(procesoLawyers.procesoId, procesos.id)).innerJoin(lawyerProfiles, eq31(procesoLawyers.lawyerId, lawyerProfiles.id)).innerJoin(estadosProceso, eq31(procesos.estadoId, estadosProceso.id)).where(and21(
            eq31(clientes.userId, fromUserId),
            eq31(lawyerProfiles.userId, targetUserId),
            eq31(estadosProceso.codigo, "finalizado")
          )).limit(1);
          return rows2[0]?.id ?? null;
        }
        const rows = await this.db.select({ id: procesos.id }).from(procesos).innerJoin(clientes, eq31(procesos.clienteId, clientes.id)).innerJoin(procesoLawyers, eq31(procesoLawyers.procesoId, procesos.id)).innerJoin(lawyerProfiles, eq31(procesoLawyers.lawyerId, lawyerProfiles.id)).innerJoin(firmProfiles, eq31(lawyerProfiles.firmId, firmProfiles.id)).innerJoin(estadosProceso, eq31(procesos.estadoId, estadosProceso.id)).where(and21(
          eq31(clientes.userId, fromUserId),
          eq31(firmProfiles.userId, targetUserId),
          eq31(estadosProceso.codigo, "finalizado")
        )).limit(1);
        return rows[0]?.id ?? null;
      }
      async canClientRate(fromUserId, targetUserId, targetType) {
        const procesoId = await this.findQualifyingProceso(fromUserId, targetUserId, targetType);
        return procesoId !== null;
      }
    };
  }
});

// server/storage/storeage/models/client-request-storage.ts
import { randomUUID as randomUUID13 } from "crypto";
import { eq as eq32, and as and22, desc as desc12, lt as lt3, sql as sql14 } from "drizzle-orm";
var ClientRequestStorage;
var init_client_request_storage = __esm({
  "server/storage/storeage/models/client-request-storage.ts"() {
    "use strict";
    init_schema();
    ClientRequestStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async createRequest(fromUserId, toUserId, expiresAt) {
        const id = randomUUID13();
        await this.db.insert(clientRequests).values({
          id,
          fromUserId,
          toUserId,
          status: "pending",
          expiresAt
        });
        const row = await this.db.select().from(clientRequests).where(eq32(clientRequests.id, id)).limit(1);
        return row[0];
      }
      async getRequestById(id) {
        const rows = await this.db.select().from(clientRequests).where(eq32(clientRequests.id, id)).limit(1);
        return rows[0];
      }
      /** Latest request between this pair regardless of status */
      async getLatestRequest(fromUserId, toUserId) {
        const rows = await this.db.select().from(clientRequests).where(and22(eq32(clientRequests.fromUserId, fromUserId), eq32(clientRequests.toUserId, toUserId))).orderBy(desc12(clientRequests.createdAt)).limit(1);
        return rows[0];
      }
      async getPendingRequest(fromUserId, toUserId) {
        const rows = await this.db.select().from(clientRequests).where(and22(
          eq32(clientRequests.fromUserId, fromUserId),
          eq32(clientRequests.toUserId, toUserId),
          eq32(clientRequests.status, "pending")
        )).limit(1);
        return rows[0];
      }
      /** All pending requests received by a user (for the client's notifications view) */
      async getPendingRequestsForUser(toUserId) {
        const rows = await this.db.select({
          id: clientRequests.id,
          fromUserId: clientRequests.fromUserId,
          toUserId: clientRequests.toUserId,
          status: clientRequests.status,
          createdAt: clientRequests.createdAt,
          expiresAt: clientRequests.expiresAt,
          respondedAt: clientRequests.respondedAt,
          senderName: users.name,
          senderRole: roles.nombre
        }).from(clientRequests).innerJoin(users, eq32(users.id, clientRequests.fromUserId)).leftJoin(roles, eq32(roles.id, users.rolId)).where(and22(
          eq32(clientRequests.toUserId, toUserId),
          eq32(clientRequests.status, "pending")
        )).orderBy(desc12(clientRequests.createdAt));
        return rows;
      }
      async respondToRequest(id, status) {
        await this.db.update(clientRequests).set({ status, respondedAt: /* @__PURE__ */ new Date() }).where(eq32(clientRequests.id, id));
      }
      /** Bulk-expire all pending requests whose expires_at has passed */
      async expirePendingRequests() {
        await this.db.update(clientRequests).set({ status: "expired", respondedAt: /* @__PURE__ */ new Date() }).where(and22(
          eq32(clientRequests.status, "pending"),
          lt3(clientRequests.expiresAt, sql14`NOW()`)
        ));
      }
    };
  }
});

// server/lib/timeout.ts
function withTimeout(promise, ms, label) {
  const timeout = new Promise(
    (_, reject) => setTimeout(
      () => reject(new Error(`[timeout] ${label} exceeded ${ms}ms`)),
      ms
    )
  );
  return Promise.race([promise, timeout]);
}
var init_timeout = __esm({
  "server/lib/timeout.ts"() {
    "use strict";
  }
});

// server/services/email.service.ts
import nodemailer from "nodemailer";
function passwordResetHtml(code) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recuperar contrase\xF1a</title>
  <style>
    body { margin: 0; padding: 0; background: #F4F6F8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .wrapper { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #0F2640; padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: -0.3px; }
    .header p  { color: rgba(255,255,255,0.55); margin: 4px 0 0; font-size: 13px; }
    .body { padding: 36px 40px; }
    .body p  { color: #4A5568; font-size: 14px; line-height: 1.7; margin: 0 0 20px; }
    .code-box {
      background: #F0F7FF; border: 1.5px dashed #2196A6;
      border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;
    }
    .code-box .label { font-size: 11px; color: #6B7B8D; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .code-box .code  { font-size: 38px; font-weight: 700; color: #0F2640; letter-spacing: 10px; }
    .expiry { font-size: 12px; color: #9AAABB; text-align: center; margin-top: -8px; margin-bottom: 24px; }
    .footer { background: #F4F6F8; padding: 20px 40px; text-align: center; }
    .footer p { color: #9AAABB; font-size: 11px; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${APP_NAME}</h1>
      <p>Recuperaci\xF3n de contrase\xF1a</p>
    </div>
    <div class="body">
      <p>Hemos recibido una solicitud para restablecer la contrase\xF1a de tu cuenta. Usa el siguiente c\xF3digo de verificaci\xF3n:</p>
      <div class="code-box">
        <div class="label">C\xF3digo de verificaci\xF3n</div>
        <div class="code">${code}</div>
      </div>
      <p class="expiry">\u23F1 Este c\xF3digo expira en <strong>5 minutos</strong> y es de un solo uso.</p>
      <p>Si no solicitaste este cambio, ignora este correo. Tu contrase\xF1a actual permanecer\xE1 sin cambios.</p>
    </div>
    <div class="footer">
      <p>\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${APP_NAME} \xB7 Este es un mensaje autom\xE1tico, no respondas a este correo.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
function emailVerificationHtml(code) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verifica tu correo</title>
  <style>
    body { margin: 0; padding: 0; background: #F4F6F8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .wrapper { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #0F2640; padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: -0.3px; }
    .header p  { color: rgba(255,255,255,0.55); margin: 4px 0 0; font-size: 13px; }
    .body { padding: 36px 40px; }
    .body p  { color: #4A5568; font-size: 14px; line-height: 1.7; margin: 0 0 20px; }
    .code-box {
      background: #F0F7FF; border: 1.5px dashed #2196A6;
      border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;
    }
    .code-box .label { font-size: 11px; color: #6B7B8D; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .code-box .code  { font-size: 38px; font-weight: 700; color: #0F2640; letter-spacing: 10px; }
    .expiry { font-size: 12px; color: #9AAABB; text-align: center; margin-top: -8px; margin-bottom: 24px; }
    .footer { background: #F4F6F8; padding: 20px 40px; text-align: center; }
    .footer p { color: #9AAABB; font-size: 11px; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${APP_NAME}</h1>
      <p>Verificaci\xF3n de correo electr\xF3nico</p>
    </div>
    <div class="body">
      <p>Gracias por registrarte. Usa el siguiente c\xF3digo OTP para verificar tu correo y activar tu acceso.</p>
      <div class="code-box">
        <div class="label">C\xF3digo de verificaci\xF3n</div>
        <div class="code">${code}</div>
      </div>
      <p class="expiry">\u23F1 Este c\xF3digo expira en <strong>5 minutos</strong> y es de un solo uso.</p>
      <p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
    </div>
    <div class="footer">
      <p>\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${APP_NAME} \xB7 Este es un mensaje autom\xE1tico, no respondas a este correo.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
function notificationEmailHtml(title, body, actionUrl, actionLabel) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #F4F6F8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #0F2640; padding: 32px 40px; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: -0.3px; }
    .header p  { color: rgba(255,255,255,0.68); margin: 6px 0 0; font-size: 13px; }
    .body { padding: 36px 40px; }
    .card { background: #F8FBFD; border: 1px solid #DCEAF0; border-radius: 14px; padding: 20px; }
    .card h2 { margin: 0 0 12px; font-size: 18px; color: #0F2640; }
    .card p { margin: 0; font-size: 14px; line-height: 1.7; color: #4A5568; white-space: pre-line; }
    .cta-wrap { margin-top: 20px; }
    .cta {
      display: inline-block; background: #0F2640; color: #fff !important; text-decoration: none;
      padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 600;
    }
    .footer { background: #F4F6F8; padding: 20px 40px; text-align: center; }
    .footer p { color: #9AAABB; font-size: 11px; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${APP_NAME}</h1>
      <p>Notificaci\xF3n de tu cuenta</p>
    </div>
    <div class="body">
      <div class="card">
        <h2>${title}</h2>
        <p>${body}</p>
        ${actionUrl ? `<div class="cta-wrap"><a class="cta" href="${actionUrl}">${actionLabel ?? "Ver detalle"}</a></div>` : ""}
      </div>
    </div>
    <div class="footer">
      <p>\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${APP_NAME} \xB7 Este es un mensaje autom\xE1tico, no respondas a este correo.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
async function sendPasswordResetOtp(toEmail, code) {
  await withTimeout(
    transporter.sendMail({
      from: FROM,
      to: toEmail,
      subject: `${code} es tu c\xF3digo de recuperaci\xF3n \u2014 ${APP_NAME}`,
      html: passwordResetHtml(code),
      text: `Tu c\xF3digo de recuperaci\xF3n de contrase\xF1a es: ${code}
Expira en 5 minutos.

Si no solicitaste este cambio, ignora este mensaje.`
    }),
    1e4,
    // 10s timeout for email delivery
    "email.sendPasswordResetOtp"
  );
}
async function sendEmailVerificationOtp(toEmail, code) {
  await withTimeout(
    transporter.sendMail({
      from: FROM,
      to: toEmail,
      subject: `${code} es tu c\xF3digo de verificaci\xF3n \u2014 ${APP_NAME}`,
      html: emailVerificationHtml(code),
      text: `Tu c\xF3digo de verificaci\xF3n de correo es: ${code}
Expira en 5 minutos.

Si no creaste esta cuenta, ignora este mensaje.`
    }),
    1e4,
    "email.sendEmailVerificationOtp"
  );
}
async function sendNotificationEmail(toEmail, title, body, options) {
  await withTimeout(
    transporter.sendMail({
      from: FROM,
      to: toEmail,
      subject: `${title} \u2014 ${APP_NAME}`,
      html: notificationEmailHtml(title, body, options?.actionUrl, options?.actionLabel),
      text: `${title}

${body}${options?.actionUrl ? `

Ver detalle: ${options.actionUrl}` : ""}

Este es un mensaje autom\xE1tico de ${APP_NAME}.`
    }),
    1e4,
    "email.sendNotificationEmail"
  );
}
async function sendSupportReplyEmail(toEmail, subject, body) {
  await withTimeout(
    transporter.sendMail({
      from: FROM,
      to: toEmail,
      subject: `${subject} \u2014 ${APP_NAME}`,
      html: notificationEmailHtml(subject, body),
      text: `${subject}

${body}

Este es un mensaje de soporte de ${APP_NAME}.`
    }),
    1e4,
    "email.sendSupportReplyEmail"
  );
}
function queueNotificationEmail(toEmail, title, body, options) {
  if (!toEmail) return;
  sendNotificationEmail(toEmail, title, body, options).catch((err) => {
    console.error("[email] notification send error:", err);
  });
}
var transporter, FROM, APP_NAME;
var init_email_service = __esm({
  "server/services/email.service.ts"() {
    "use strict";
    init_timeout();
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    FROM = process.env.SMTP_FROM || `"ProcesoClaro" <${process.env.SMTP_USER}>`;
    APP_NAME = "ProcesoClaro";
  }
});

// server/storage/storeage/models/app-notification-storage.ts
import { randomUUID as randomUUID14 } from "crypto";
import { eq as eq33, and as and23, isNull as isNull9, desc as desc13, count as count3 } from "drizzle-orm";
function joinAppUrl(path4) {
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) return void 0;
  const base = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
  const nextPath = path4.startsWith("/") ? path4 : `/${path4}`;
  return `${base}${nextPath}`;
}
function buildNotificationLink(data) {
  if (!data) return {};
  if (typeof data.route === "string" && data.route) {
    return { actionUrl: joinAppUrl(data.route), actionLabel: "Abrir soporte" };
  }
  if (typeof data.postId === "string" && data.postId) {
    return { actionUrl: joinAppUrl(`/community/${data.postId}`), actionLabel: "Ver publicaci\xF3n" };
  }
  if (typeof data.procesoId === "string" && data.procesoId) {
    return { actionUrl: joinAppUrl(`/case/${data.procesoId}`), actionLabel: "Ver proceso" };
  }
  return {};
}
var AppNotificationStorage;
var init_app_notification_storage = __esm({
  "server/storage/storeage/models/app-notification-storage.ts"() {
    "use strict";
    init_schema();
    init_email_service();
    AppNotificationStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async createNotification(userId2, type, title, body, data) {
        const id = randomUUID14();
        await this.db.insert(appNotifications).values({ id, userId: userId2, type, title, body, data: data ?? null });
        const rows = await this.db.select().from(appNotifications).where(eq33(appNotifications.id, id)).limit(1);
        const userRows = await this.db.select({ email: users.email }).from(users).where(eq33(users.id, userId2)).limit(1);
        queueNotificationEmail(userRows[0]?.email, title, body, buildNotificationLink(data));
        return rows[0];
      }
      async getForUser(userId2, limit = 50) {
        const rows = await this.db.select().from(appNotifications).where(eq33(appNotifications.userId, userId2)).orderBy(desc13(appNotifications.createdAt)).limit(limit);
        return rows;
      }
      async getUnreadCount(userId2) {
        const rows = await this.db.select({ n: count3() }).from(appNotifications).where(and23(eq33(appNotifications.userId, userId2), isNull9(appNotifications.readAt)));
        return rows[0]?.n ?? 0;
      }
      async markRead(id, userId2) {
        await this.db.update(appNotifications).set({ readAt: /* @__PURE__ */ new Date() }).where(and23(eq33(appNotifications.id, id), eq33(appNotifications.userId, userId2)));
      }
      async markAllRead(userId2) {
        await this.db.update(appNotifications).set({ readAt: /* @__PURE__ */ new Date() }).where(and23(eq33(appNotifications.userId, userId2), isNull9(appNotifications.readAt)));
      }
    };
  }
});

// server/storage/storeage/models/firm-clients-storage.ts
import { randomUUID as randomUUID15 } from "crypto";
import { eq as eq34, and as and24, desc as desc14 } from "drizzle-orm";
var FirmClientsStorage;
var init_firm_clients_storage = __esm({
  "server/storage/storeage/models/firm-clients-storage.ts"() {
    "use strict";
    init_schema();
    FirmClientsStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getActiveFirmClient(firmId, clientId) {
        const rows = await this.db.select().from(firmClients).where(and24(eq34(firmClients.firmId, firmId), eq34(firmClients.clientId, clientId), eq34(firmClients.status, "active"))).limit(1);
        return rows[0];
      }
      /** Returns all active clientIds linked to a firm via firm_clients */
      async getActiveClientIdsByFirm(firmId) {
        const rows = await this.db.select({ clientId: firmClients.clientId }).from(firmClients).where(and24(eq34(firmClients.firmId, firmId), eq34(firmClients.status, "active"))).orderBy(desc14(firmClients.createdAt));
        return rows.map((r) => r.clientId);
      }
      async createFirmClient(firmId, clientId) {
        const existing = await this.db.select().from(firmClients).where(and24(eq34(firmClients.firmId, firmId), eq34(firmClients.clientId, clientId))).limit(1);
        if (existing[0]) {
          await this.db.update(firmClients).set({ status: "active" }).where(eq34(firmClients.id, existing[0].id));
          const rows2 = await this.db.select().from(firmClients).where(eq34(firmClients.id, existing[0].id)).limit(1);
          return rows2[0];
        }
        const id = randomUUID15();
        await this.db.insert(firmClients).values({ id, firmId, clientId, status: "active" });
        const rows = await this.db.select().from(firmClients).where(eq34(firmClients.id, id)).limit(1);
        return rows[0];
      }
      /** Soft-delete: sets status = "inactive" */
      async deactivate(firmId, clientId) {
        await this.db.update(firmClients).set({ status: "inactive" }).where(and24(eq34(firmClients.firmId, firmId), eq34(firmClients.clientId, clientId)));
      }
    };
  }
});

// server/storage/storeage/models/otp-storage.ts
import crypto2 from "crypto";
import { and as and25, eq as eq35, lt as lt4 } from "drizzle-orm";
var OTP_EXPIRES_MINUTES, MAX_ATTEMPTS, OtpStorage;
var init_otp_storage = __esm({
  "server/storage/storeage/models/otp-storage.ts"() {
    "use strict";
    init_schema();
    OTP_EXPIRES_MINUTES = 5;
    MAX_ATTEMPTS = 3;
    OtpStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async createOtpForTable(table, userId2) {
        await this.db.update(table).set({ isUsed: true }).where(and25(eq35(table.userId, userId2), eq35(table.isUsed, false)));
        const code = String(Math.floor(1e5 + Math.random() * 9e5));
        const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1e3);
        await this.db.insert(table).values({
          id: crypto2.randomUUID(),
          userId: userId2,
          code,
          expiresAt,
          isUsed: false,
          attempts: 0
        });
        return code;
      }
      async verifyOtpForTable(table, userId2, code) {
        const rows = await this.db.select().from(table).where(
          and25(
            eq35(table.userId, userId2),
            eq35(table.isUsed, false)
          )
        ).orderBy(table.createdAt).limit(1);
        const otp = rows[rows.length - 1] ?? rows[0];
        if (!otp) return "invalid";
        if (otp.isUsed) return "used";
        if (otp.attempts >= MAX_ATTEMPTS) return "too_many_attempts";
        if (/* @__PURE__ */ new Date() > otp.expiresAt) return "expired";
        const otpBuf = Buffer.from(otp.code);
        const inputBuf = Buffer.from(code.padEnd(otp.code.length, "\0").slice(0, otp.code.length));
        const matches = otpBuf.length === inputBuf.length && crypto2.timingSafeEqual(otpBuf, inputBuf);
        if (!matches) {
          await this.db.update(table).set({ attempts: otp.attempts + 1 }).where(eq35(table.id, otp.id));
          return "invalid";
        }
        return "valid";
      }
      async markUsedForTable(table, userId2) {
        await this.db.update(table).set({ isUsed: true }).where(and25(eq35(table.userId, userId2), eq35(table.isUsed, false)));
      }
      async createOtp(userId2) {
        return this.createOtpForTable(passwordResetOtps, userId2);
      }
      async createEmailVerificationOtp(userId2) {
        return this.createOtpForTable(emailVerificationOtps, userId2);
      }
      async verifyOtp(userId2, code) {
        return this.verifyOtpForTable(passwordResetOtps, userId2, code);
      }
      async verifyEmailVerificationOtp(userId2, code) {
        return this.verifyOtpForTable(emailVerificationOtps, userId2, code);
      }
      async markUsed(userId2) {
        await this.markUsedForTable(passwordResetOtps, userId2);
      }
      async markEmailVerificationUsed(userId2) {
        await this.markUsedForTable(emailVerificationOtps, userId2);
      }
      /** Delete all expired OTPs (for cleanup cron) */
      async deleteExpired() {
        await this.db.delete(passwordResetOtps).where(lt4(passwordResetOtps.expiresAt, /* @__PURE__ */ new Date()));
        await this.db.delete(emailVerificationOtps).where(lt4(emailVerificationOtps.expiresAt, /* @__PURE__ */ new Date()));
      }
    };
  }
});

// server/storage/storeage/models/security-events-storage.ts
import { eq as eq36, desc as desc15 } from "drizzle-orm";
var SecurityEventsStorage;
var init_security_events_storage = __esm({
  "server/storage/storeage/models/security-events-storage.ts"() {
    "use strict";
    init_security_audit_schema();
    SecurityEventsStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async create(data) {
        await this.db.insert(securityEvents).values(data);
      }
      async getByEmail(email, limit = 50) {
        return this.db.select().from(securityEvents).where(eq36(securityEvents.email, email)).orderBy(desc15(securityEvents.createdAt)).limit(limit);
      }
      async getByIp(ip, limit = 50) {
        return this.db.select().from(securityEvents).where(eq36(securityEvents.ip, ip)).orderBy(desc15(securityEvents.createdAt)).limit(limit);
      }
    };
  }
});

// server/storage/storeage/models/matching-storage.ts
import { randomUUID as randomUUID16 } from "crypto";
import { eq as eq37, and as and26, desc as desc16, sql as sql15 } from "drizzle-orm";
var CASE_KEYWORDS, RELATED_KEYWORDS, MAX_MATCHES, MatchingStorage;
var init_matching_storage = __esm({
  "server/storage/storeage/models/matching-storage.ts"() {
    "use strict";
    init_community_match_schema();
    CASE_KEYWORDS = {
      civil: ["civil", "familia"],
      penal: ["penal", "criminal", "delito"],
      laboral: ["laboral", "trabajo", "empleo"],
      familiar: ["familia", "familiar", "divorcio", "sucesiones"],
      mercantil: ["mercantil", "comercial", "empresa", "societario"],
      administrativo: ["administrativo", "publico", "estado", "contratacion"],
      tributario: ["tributario", "fiscal", "impuesto", "aduanas"],
      inmobiliario: ["inmobiliario", "propiedad", "bienes", "arrendamiento"]
    };
    RELATED_KEYWORDS = {
      civil: ["laboral", "sucesiones", "notarial", "arrendamiento", "contratos"],
      penal: ["militar", "adolescentes", "criminolog"],
      laboral: ["civil", "seguridad social", "migratorio", "pension"],
      familiar: ["civil", "sucesiones", "notarial", "adopcion", "custodia"],
      mercantil: ["tributario", "administrativo", "civil", "contrat", "societario"],
      administrativo: ["tributario", "constitucional", "laboral", "ambiental"],
      tributario: ["mercantil", "administrativo", "contab", "aduanas"],
      inmobiliario: ["civil", "notarial", "agrario", "urbanismo", "construccion"]
    };
    MAX_MATCHES = 50;
    MatchingStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ── Match CRUD ────────────────────────────────────────────────────────
      /** Insert match row (ignores duplicates via IGNORE). */
      async createMatch(postId, lawyerId, score) {
        const id = randomUUID16();
        try {
          await this.db.insert(communityPostMatches).values({ id, postId, lawyerId, score });
          const rows = await this.db.select().from(communityPostMatches).where(eq37(communityPostMatches.id, id)).limit(1);
          return rows[0] ?? null;
        } catch {
          return null;
        }
      }
      async matchExists(postId, lawyerId) {
        const rows = await this.db.select({ id: communityPostMatches.id }).from(communityPostMatches).where(and26(eq37(communityPostMatches.postId, postId), eq37(communityPostMatches.lawyerId, lawyerId))).limit(1);
        return rows.length > 0;
      }
      async markNotified(postId, lawyerId) {
        await this.db.update(communityPostMatches).set({ notified: 1 }).where(and26(eq37(communityPostMatches.postId, postId), eq37(communityPostMatches.lawyerId, lawyerId)));
      }
      async markSeen(postId, lawyerId) {
        await this.db.update(communityPostMatches).set({ seen: 1 }).where(and26(eq37(communityPostMatches.postId, postId), eq37(communityPostMatches.lawyerId, lawyerId)));
      }
      async getMatchesByPost(postId) {
        return this.db.select().from(communityPostMatches).where(eq37(communityPostMatches.postId, postId)).orderBy(desc16(communityPostMatches.score));
      }
      /** Returns post IDs matched to this lawyer, ordered by score + urgency.
       *  Joined with posts table to get isUrgent / createdAt for sorting. */
      async getMatchedPostIds(lawyerId, limit = 60, offset = 0) {
        const rows = await this.db.execute(sql15`
      SELECT
        m.post_id  AS postId,
        m.score    AS score,
        p.is_urgent AS isUrgent,
        p.created_at AS createdAt
      FROM community_post_matches m
      INNER JOIN posts p ON p.id = m.post_id
      WHERE m.lawyer_id = ${lawyerId}
        AND p.status = 'open'
      ORDER BY p.is_urgent DESC, m.score DESC, p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
        return rows[0] ?? [];
      }
      async countMatchedPosts(lawyerId) {
        const rows = await this.db.select({ n: sql15`COUNT(*)` }).from(communityPostMatches).where(eq37(communityPostMatches.lawyerId, lawyerId));
        return Number(rows[0]?.n ?? 0);
      }
      /** Returns userId (users.id) of all lawyers matched to this post.
       *  Used to notify them when the case is taken by another lawyer. */
      async getMatchedLawyerUserIds(postId) {
        const rows = await this.db.execute(sql15`
      SELECT lp.user_id AS userId
      FROM community_post_matches m
      INNER JOIN lawyer_profiles lp ON lp.id = m.lawyer_id
      WHERE m.post_id = ${postId}
    `);
        return (rows[0] ?? []).map((r) => r.userId);
      }
      // ── Lawyer discovery ──────────────────────────────────────────────────
      /**
       * Find lawyers relevant for a given post.
       * Score 0–100 stored in community_post_matches.score.
       *
       * Formula:
       *   baseScore  = matchScore(0-1) × 96 + qualityActivityBoost(0-2) + freshnessBoost(0-3)
       *   finalScore = baseScore + explorationBoost(0-2, only if baseScore ≥ 60)
       *
       * specialtyScore:        exact=1.0 · related=0.6 · none→excluded
       * cityScore:             sameCity=1.0 · noCityOnPost=0.4 · diffCity=0.3
       * qualityActivityBoost:  comments that received replies (quality signal)
       * freshnessBoost:        post age <1h→+3 · <24h→+1 · older→0
       * explorationBoost:      random 0-2 ONLY if baseScore≥60 (no bad lawyers boosted)
       */
      async findCandidates(caseType, city, postId, postCreatedAt = /* @__PURE__ */ new Date()) {
        const result = await this.db.execute(sql15`
      SELECT
        lp.id            AS lawyerId,
        lp.user_id       AS userId,
        lp.specialization,
        m.nombre         AS cityName,
        COALESCE(act.usefulComments, 0) AS usefulComments,
        COALESCE(w.activeCases,      0) AS activeCases
      FROM lawyer_profiles lp
      INNER JOIN users    u   ON u.id = lp.user_id AND u.is_active = 1
      INNER JOIN personas p   ON p.id = lp.persona_id
      LEFT  JOIN municipios m ON m.id = p.municipio_id
      LEFT  JOIN (
        -- Quality activity: comments that received at least one reply in the last 30 days
        -- A reply means the community found value in the lawyer's response
        SELECT c.user_id, COUNT(DISTINCT c.id) AS usefulComments
        FROM comments c
        WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND EXISTS (
            SELECT 1 FROM comments r WHERE r.parent_id = c.id
          )
        GROUP BY c.user_id
      ) act ON act.user_id = lp.user_id
      LEFT  JOIN (
        -- Active workload: penalise overloaded lawyers so they get fewer new leads
        SELECT pl.lawyer_id, COUNT(*) AS activeCases
        FROM proceso_lawyers pl
        INNER JOIN procesos        proc ON proc.id  = pl.proceso_id
        INNER JOIN estados_proceso ep   ON ep.id    = proc.estado_id
        WHERE pl.status = 'activo'
          AND ep.codigo != 'finalizado'
        GROUP BY pl.lawyer_id
      ) w ON w.lawyer_id = lp.id
      LEFT  JOIN (
        -- Conversion track record: accepted cases that ended up as linked procesos
        SELECT
          taken_by_user_id,
          SUM(CASE WHEN proceso_id IS NOT NULL THEN 1 ELSE 0 END) AS processesLinked
        FROM posts
        WHERE taken_by_user_id IS NOT NULL AND client_accepted = 1
        GROUP BY taken_by_user_id
      ) cv ON cv.taken_by_user_id = lp.user_id
    `);
        const rows = result[0] ?? [];
        const postAgeMs = Date.now() - postCreatedAt.getTime();
        const freshnessBoost = postAgeMs < 36e5 ? 3 : postAgeMs < 864e5 ? 1 : 0;
        const keywords = caseType ? CASE_KEYWORDS[caseType] ?? [] : [];
        const relatedKeywords = caseType ? RELATED_KEYWORDS[caseType] ?? [] : [];
        const postCityNorm = city?.toLowerCase().trim() ?? null;
        const candidates = [];
        for (const row of rows) {
          const spec = row.specialization?.toLowerCase().trim() ?? "";
          const isExact = keywords.length > 0 && keywords.some((kw) => spec.includes(kw));
          const isRelated = relatedKeywords.length > 0 && relatedKeywords.some((kw) => spec.includes(kw));
          if (!isExact && !isRelated && caseType !== null) continue;
          const specialtyScore = isExact ? 1 : isRelated ? 0.6 : 1;
          const lawyerCity = row.cityName?.toLowerCase().trim() ?? null;
          const cityScore = !postCityNorm ? 0.4 : lawyerCity === postCityNorm ? 1 : 0.3;
          const matchScore = specialtyScore * 0.7 + cityScore * 0.3;
          const useful = Number(row.usefulComments);
          const qualityActivityBoost = useful >= 10 ? 2 : useful >= 3 ? 1 : 0;
          const activeCases = Number(row.activeCases ?? 0);
          const availabilityPenalty = Math.min(activeCases / 20, 1);
          const processesLinked = Number(row.processesLinked ?? 0);
          const conversionBoost = processesLinked >= 7 ? 3 : processesLinked >= 3 ? 2 : processesLinked >= 1 ? 1 : 0;
          const rawBase = matchScore * 96 + qualityActivityBoost + freshnessBoost + conversionBoost;
          const baseScore = Math.round(rawBase * (1 - availabilityPenalty * 0.3));
          const explorationBoost = baseScore >= 60 ? Math.random() * 2 : 0;
          const score = Math.min(100, Math.round(baseScore + explorationBoost));
          candidates.push({
            lawyerId: row.lawyerId,
            userId: row.userId,
            cityName: row.cityName ?? null,
            score
          });
        }
        return candidates.sort((a, b) => b.score - a.score).slice(0, MAX_MATCHES);
      }
    };
  }
});

// server/storage/storeage/models/recommendation-storage.ts
import { sql as sql16 } from "drizzle-orm";
var CASE_KEYWORDS2, RecommendationStorage;
var init_recommendation_storage = __esm({
  "server/storage/storeage/models/recommendation-storage.ts"() {
    "use strict";
    CASE_KEYWORDS2 = {
      civil: ["civil", "familia"],
      penal: ["penal", "criminal", "delito"],
      laboral: ["laboral", "trabajo", "empleo"],
      familiar: ["familia", "familiar", "divorcio", "sucesiones"],
      mercantil: ["mercantil", "comercial", "empresa", "societario"],
      administrativo: ["administrativo", "publico", "estado", "contratacion"],
      tributario: ["tributario", "fiscal", "impuesto", "aduanas"],
      inmobiliario: ["inmobiliario", "propiedad", "bienes", "arrendamiento"]
    };
    RecommendationStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      /**
       * Returns up to `limit` lawyers sorted by composite score.
       * Only returns lawyers with at least a specialization match OR an existing rating.
       */
      async getRecommendedLawyers(caseType, city, limit = 8) {
        const rows = await this.db.execute(sql16`
      SELECT
        lp.id              AS lawyerProfileId,
        lp.user_id         AS userId,
        lp.specialization,
        lp.professional_verification_status AS professionalVerificationStatus,
        TRIM(CONCAT(
          COALESCE(p.nombre,   ''),
          ' ',
          COALESCE(p.apellido, '')
        ))                 AS fullName,
        m.nombre           AS cityName,
        COALESCE(r.avgScore,    0) AS avgRating,
        COALESCE(r.ratingCount, 0) AS ratingCount,
        COALESCE(w.activeCases, 0) AS activeCases
      FROM lawyer_profiles lp
      INNER JOIN users    u ON u.id = lp.user_id AND u.is_active = 1
      INNER JOIN personas p ON p.id = lp.persona_id
      LEFT  JOIN municipios m ON m.id = p.municipio_id
      LEFT  JOIN (
        SELECT
          target_user_id,
          AVG(score)  AS avgScore,
          COUNT(*)    AS ratingCount
        FROM ratings
        WHERE target_type = 'lawyer'
        GROUP BY target_user_id
      ) r ON r.target_user_id = lp.user_id
      LEFT  JOIN (
        SELECT
          pl.lawyer_id,
          COUNT(*) AS activeCases
        FROM proceso_lawyers pl
        INNER JOIN procesos       proc ON proc.id       = pl.proceso_id
        INNER JOIN estados_proceso ep  ON ep.id         = proc.estado_id
        WHERE pl.status = 'activo'
          AND ep.codigo != 'finalizado'
        GROUP BY pl.lawyer_id
      ) w ON w.lawyer_id = lp.id
      LEFT  JOIN (
        -- Conversion signal: cases the lawyer took from the community
        -- that were accepted by the client AND ended up linked to a proceso
        SELECT
          taken_by_user_id,
          COUNT(*)                                                         AS casesTaken,
          SUM(CASE WHEN proceso_id IS NOT NULL THEN 1 ELSE 0 END)         AS processesLinked
        FROM posts
        WHERE taken_by_user_id IS NOT NULL
          AND client_accepted = 1
        GROUP BY taken_by_user_id
      ) conv ON conv.taken_by_user_id = lp.user_id
      WHERE lp.professional_verification_status = 'verificado'
    `);
        const lawyers = rows[0] ?? [];
        const keywords = caseType ? CASE_KEYWORDS2[caseType] ?? [] : [];
        const cityNorm = city?.toLowerCase().trim() ?? null;
        const scored = [];
        const GLOBAL_AVG_RATING = 4;
        const BAYESIAN_MIN_VOTES = 10;
        for (const row of lawyers) {
          const spec = row.specialization?.toLowerCase().trim() ?? "";
          const specMatch = keywords.length > 0 && keywords.some((kw) => spec.includes(kw));
          const cityMatch = !!(cityNorm && row.cityName?.toLowerCase().trim() === cityNorm);
          const rawRating = Number(row.avgRating);
          const ratingCount = Number(row.ratingCount);
          const activeCases = Number(row.activeCases);
          const casesTaken = Number(row.casesTaken ?? 0);
          const processesLinked = Number(row.processesLinked ?? 0);
          if (!specMatch && ratingCount === 0 && processesLinked === 0) continue;
          const matchScore = (specMatch ? 0.7 : 0) + (cityMatch ? 0.3 : 0);
          const adjustedRating = (rawRating * ratingCount + GLOBAL_AVG_RATING * BAYESIAN_MIN_VOTES) / (ratingCount + BAYESIAN_MIN_VOTES);
          const ratingScore = adjustedRating / 5;
          const volumeScore = Math.min(ratingCount / 50, 1);
          const availabilityScore = Math.max(0, 1 - activeCases / 15);
          const conversionRate = casesTaken > 0 ? Math.min(processesLinked / casesTaken, 1) : 0;
          const volumeNudge = processesLinked > 0 ? Math.log(processesLinked + 1) / Math.log(11) : 0;
          const conversionScore = conversionRate * 0.7 + volumeNudge * 0.3;
          const finalScore = Math.round(
            matchScore * 38 + ratingScore * 25 + volumeScore * 8 + availabilityScore * 14 + conversionScore * 15
          );
          scored.push({
            lawyerProfileId: row.lawyerProfileId,
            userId: row.userId,
            name: row.fullName || "Abogado",
            specialization: row.specialization ?? null,
            isVerified: row.professionalVerificationStatus === "verificado",
            rating: { avg: rawRating, count: ratingCount },
            activeCases,
            finalScore
          });
        }
        const MIN_PRIMARY = 3;
        if (scored.length < MIN_PRIMARY) {
          const primaryIds = new Set(scored.map((s) => s.lawyerProfileId));
          const fallback = [];
          for (const row of lawyers) {
            if (primaryIds.has(row.lawyerProfileId)) continue;
            const activeCases = Number(row.activeCases);
            const rawRating = Number(row.avgRating);
            const ratingCount = Number(row.ratingCount);
            const availabilityScore = Math.max(0, 1 - activeCases / 15);
            const adjustedRating = (rawRating * ratingCount + GLOBAL_AVG_RATING * BAYESIAN_MIN_VOTES) / (ratingCount + BAYESIAN_MIN_VOTES);
            const ratingScore = adjustedRating / 5;
            const volumeScore = Math.min(ratingCount / 50, 1);
            const fallbackScore = Math.round(
              ratingScore * 25 + volumeScore * 8 + availabilityScore * 14
            );
            fallback.push({
              lawyerProfileId: row.lawyerProfileId,
              userId: row.userId,
              name: row.fullName || "Abogado",
              specialization: row.specialization ?? null,
              isVerified: row.professionalVerificationStatus === "verificado",
              rating: { avg: rawRating, count: ratingCount },
              activeCases,
              finalScore: fallbackScore,
              isFallback: true
            });
          }
          fallback.sort((a, b) => b.finalScore - a.finalScore);
          scored.push(...fallback.slice(0, limit - scored.length));
        }
        return scored.sort((a, b) => b.finalScore - a.finalScore || b.rating.avg - a.rating.avg).slice(0, limit);
      }
    };
  }
});

// server/storage/storeage/models/legal-stage-storage.ts
import { eq as eq38, and as and27, asc, isNull as isNull10, or as or4 } from "drizzle-orm";
var LegalStageStorage;
var init_legal_stage_storage = __esm({
  "server/storage/storeage/models/legal-stage-storage.ts"() {
    "use strict";
    init_schema();
    LegalStageStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ── Consultas ──────────────────────────────────────────────────────────────
      /**
       * Etapas disponibles para un tipo de proceso.
       * Devuelve las específicas del tipo + las genéricas (tipo_proceso_id = NULL),
       * priorizando las específicas cuando hay el mismo código.
       */
      async getByTipoProceso(tipoProcesoId) {
        const rows = await this.db.select().from(etapasPorTipoProceso).where(
          and27(
            eq38(etapasPorTipoProceso.activo, 1),
            tipoProcesoId ? or4(
              eq38(etapasPorTipoProceso.tipoProcesoId, tipoProcesoId),
              isNull10(etapasPorTipoProceso.tipoProcesoId)
            ) : isNull10(etapasPorTipoProceso.tipoProcesoId)
          )
        ).orderBy(asc(etapasPorTipoProceso.orden));
        if (!tipoProcesoId) return rows;
        const seen = /* @__PURE__ */ new Map();
        for (const row of rows) {
          const existing = seen.get(row.codigo);
          if (!existing || row.tipoProcesoId !== null) {
            seen.set(row.codigo, row);
          }
        }
        return Array.from(seen.values()).sort((a, b) => a.orden - b.orden);
      }
      /** Etapa por código dentro de un tipo de proceso */
      async getByCodigoYTipo(codigo, tipoProcesoId) {
        const etapas = await this.getByTipoProceso(tipoProcesoId);
        return etapas.find((e) => e.codigo === codigo);
      }
      /** Siguiente etapa en el flujo (por orden) */
      async getNextEtapa(currentCodigo, tipoProcesoId) {
        const etapas = await this.getByTipoProceso(tipoProcesoId);
        const currentIndex = etapas.findIndex((e) => e.codigo === currentCodigo);
        if (currentIndex === -1 || currentIndex === etapas.length - 1) return void 0;
        return etapas[currentIndex + 1];
      }
      /**
       * Construye el DTO completo de etapas para la vista del stepper.
       * Marca cuáles están completadas, cuál es la actual y cuántos días restan.
       */
      async buildStagesResponse(tipoProcesoId, currentStage, fechaVencimiento) {
        const etapas = await this.getByTipoProceso(tipoProcesoId);
        const currentIndex = currentStage ? etapas.findIndex((e) => e.codigo === currentStage) : -1;
        const now = /* @__PURE__ */ new Date();
        const diasRestantes = fechaVencimiento ? Math.ceil((fechaVencimiento.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)) : null;
        const mapped = etapas.map((e, i) => {
          const esActual = i === currentIndex || currentIndex === -1 && i === 0;
          return {
            id: e.id,
            codigo: e.codigo,
            nombre: e.nombre,
            descripcion: e.descripcion ?? null,
            orden: e.orden,
            diasLegales: e.diasLegales,
            color: e.color,
            completada: currentIndex >= 0 && i < currentIndex,
            esActual,
            fechaVencimiento: esActual ? fechaVencimiento : null,
            diasRestantes: esActual ? diasRestantes : null
          };
        });
        const etapaActual = mapped.find((e) => e.esActual) ?? null;
        const currentActualIndex = mapped.findIndex((e) => e.esActual);
        const siguienteEtapa = currentActualIndex >= 0 && currentActualIndex < mapped.length - 1 ? mapped[currentActualIndex + 1] : null;
        return { etapas: mapped, etapaActual, siguienteEtapa };
      }
      /** Valida que la transición sea hacia adelante (no retroceder) */
      async isValidTransition(fromCodigo, toCodigo, tipoProcesoId) {
        if (fromCodigo === "JUDGMENT" && toCodigo === "APPEAL") return true;
        const etapas = await this.getByTipoProceso(tipoProcesoId);
        const fromIndex = etapas.findIndex((e) => e.codigo === fromCodigo);
        const toIndex = etapas.findIndex((e) => e.codigo === toCodigo);
        if (fromIndex === -1 || toIndex === -1) return false;
        return toIndex > fromIndex;
      }
      // ── Mutaciones ─────────────────────────────────────────────────────────────
      async create(data) {
        const result = await this.db.insert(etapasPorTipoProceso).values({ ...data, activo: 1 });
        const id = result[0]?.insertId;
        const row = await this.db.query.etapasPorTipoProceso.findFirst({
          where: eq38(etapasPorTipoProceso.id, id)
        });
        return row;
      }
      async update(id, data) {
        await this.db.update(etapasPorTipoProceso).set(data).where(eq38(etapasPorTipoProceso.id, id));
      }
    };
  }
});

// server/storage/storeage/models/calendar-storage.ts
import { eq as eq39, and as and28, gte as gte2, lte, sql as sql17 } from "drizzle-orm";
import { randomUUID as randomUUID17 } from "crypto";
function urgencyColor(diasRestantes, baseColor) {
  if (diasRestantes < 0) return "#EF4444";
  if (diasRestantes <= 1) return "#EF4444";
  if (diasRestantes <= 3) return "#F97316";
  return baseColor;
}
function diffDays(from, to) {
  return Math.ceil((to.getTime() - from.getTime()) / (1e3 * 60 * 60 * 24));
}
var COLOR_BY_TYPE, STAGE_LABELS, CalendarStorage;
var init_calendar_storage = __esm({
  "server/storage/storeage/models/calendar-storage.ts"() {
    "use strict";
    init_schema();
    COLOR_BY_TYPE = {
      audiencia: "#F97316",
      reunion_cliente: "#3B82F6",
      diligencia: "#8B5CF6",
      vencimiento: "#EF4444",
      tarea: "#F59E0B",
      otro: "#6B7280"
    };
    STAGE_LABELS = {
      PREPROCESS: "Etapa preprocesal",
      FILED: "Demanda presentada",
      ADMITTED: "Demanda admitida",
      NOTIFIED: "Demandado notificado",
      ANSWERED: "Contestaci\xF3n de demanda",
      EVIDENCE: "Etapa probatoria",
      HEARING: "Audiencias",
      CLOSING_ARGUMENTS: "Alegatos finales",
      JUDGMENT: "Sentencia",
      APPEAL: "Apelaci\xF3n",
      ENFORCEMENT: "Ejecuci\xF3n de sentencia"
    };
    CalendarStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ── Agregador principal ────────────────────────────────────────────────────
      /**
       * Devuelve todos los eventos del abogado en el rango [from, to]:
       * 1. Eventos manuales (calendar_events) con proceso + cliente via JOIN
       * 2. Tareas con fechaLimite — enriquecidas con radicado + cliente
       * 3. Etapas con fecha_vencimiento_etapa — enriquecidas con radicado + cliente
       */
      async getCalendarEvents(lawyerProfileId, from, to) {
        const now = /* @__PURE__ */ new Date();
        const results = [];
        const manuales = await this.db.select({
          event: calendarEvents,
          radicado: procesos.radicado,
          clienteNombre: users.name
        }).from(calendarEvents).leftJoin(procesos, eq39(calendarEvents.procesoId, procesos.id)).leftJoin(clientes, eq39(procesos.clienteId, clientes.id)).leftJoin(users, eq39(clientes.userId, users.id)).where(
          and28(
            eq39(calendarEvents.lawyerId, lawyerProfileId),
            eq39(calendarEvents.state, 1),
            gte2(calendarEvents.fechaInicio, from),
            lte(calendarEvents.fechaInicio, to)
          )
        );
        for (const row of manuales) {
          const e = row.event;
          const dias = diffDays(now, e.fechaInicio);
          const color = urgencyColor(dias, COLOR_BY_TYPE[e.tipo] ?? COLOR_BY_TYPE.otro);
          results.push({
            id: e.id,
            titulo: e.titulo,
            descripcion: e.descripcion ?? null,
            tipo: e.tipo,
            source: "manual",
            fechaInicio: e.fechaInicio,
            fechaFin: e.fechaFin ?? null,
            color,
            diasRestantes: dias,
            proceso: e.procesoId ? { id: e.procesoId, radicado: row.radicado ?? "", cliente: row.clienteNombre ?? "" } : null,
            recordatorioMinutos: e.recordatorioMinutos
          });
        }
        const tareaRows = await this.db.select({
          id: tareas.id,
          titulo: tareas.titulo,
          descripcion: tareas.descripcion,
          fechaLimite: tareas.fechaLimite,
          procesoId: tareas.procesoId,
          radicado: procesos.radicado,
          clienteNombre: users.name
        }).from(tareas).leftJoin(procesos, eq39(tareas.procesoId, procesos.id)).leftJoin(clientes, eq39(procesos.clienteId, clientes.id)).leftJoin(users, eq39(clientes.userId, users.id)).where(
          and28(
            eq39(tareas.asignadoA, lawyerProfileId),
            eq39(tareas.state, true),
            gte2(tareas.fechaLimite, from),
            lte(tareas.fechaLimite, to)
          )
        );
        for (const t of tareaRows) {
          if (!t.fechaLimite) continue;
          const dias = diffDays(now, t.fechaLimite);
          const color = urgencyColor(dias, COLOR_BY_TYPE.tarea);
          results.push({
            id: `tarea-${t.id}`,
            titulo: t.titulo,
            descripcion: t.descripcion ?? null,
            tipo: "tarea",
            source: "tarea",
            fechaInicio: t.fechaLimite,
            fechaFin: null,
            color,
            diasRestantes: dias,
            proceso: t.procesoId ? { id: t.procesoId, radicado: t.radicado ?? "", cliente: t.clienteNombre ?? "" } : null
          });
        }
        const procesoRows = await this.db.select({
          id: procesos.id,
          radicado: procesos.radicado,
          legalStage: procesos.legalStage,
          fechaVencimientoEtapa: procesos.fechaVencimientoEtapa,
          clienteNombre: users.name
        }).from(procesos).leftJoin(clientes, eq39(procesos.clienteId, clientes.id)).leftJoin(users, eq39(clientes.userId, users.id)).where(
          and28(
            eq39(procesos.state, true),
            gte2(procesos.fechaVencimientoEtapa, from),
            lte(procesos.fechaVencimientoEtapa, to)
          )
        );
        for (const p of procesoRows) {
          if (!p.fechaVencimientoEtapa) continue;
          const dias = diffDays(now, p.fechaVencimientoEtapa);
          const color = urgencyColor(dias, COLOR_BY_TYPE.vencimiento);
          const stageLabel = p.legalStage ? STAGE_LABELS[p.legalStage] ?? p.legalStage : "Sin especificar";
          results.push({
            id: `etapa-${p.id}`,
            titulo: `Vencimiento: ${stageLabel}`,
            descripcion: null,
            tipo: "vencimiento",
            source: "etapa",
            fechaInicio: p.fechaVencimientoEtapa,
            fechaFin: null,
            color,
            diasRestantes: dias,
            proceso: { id: p.id, radicado: p.radicado ?? "", cliente: p.clienteNombre ?? "" }
          });
        }
        return results.sort(
          (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
        );
      }
      // ── Recordatorios pendientes (usado por el cron) ───────────────────────────
      async getPendingReminders() {
        const now = /* @__PURE__ */ new Date();
        return this.db.select().from(calendarEvents).where(
          and28(
            eq39(calendarEvents.notificado, 0),
            eq39(calendarEvents.state, 1),
            sql17`DATE_SUB(${calendarEvents.fechaInicio}, INTERVAL ${calendarEvents.recordatorioMinutos} MINUTE) <= ${now}`,
            gte2(calendarEvents.fechaInicio, now)
          )
        );
      }
      async markNotificado(id) {
        await this.db.update(calendarEvents).set({ notificado: 1 }).where(eq39(calendarEvents.id, id));
      }
      // ── CRUD ──────────────────────────────────────────────────────────────────
      async create(lawyerProfileId, data) {
        const id = randomUUID17();
        const row = {
          id,
          lawyerId: lawyerProfileId,
          procesoId: data.procesoId ?? null,
          titulo: data.titulo,
          descripcion: data.descripcion ?? null,
          tipo: data.tipo,
          fechaInicio: new Date(data.fechaInicio),
          fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
          recordatorioMinutos: data.recordatorioMinutos ?? 1440,
          notificado: 0,
          state: 1
        };
        await this.db.insert(calendarEvents).values(row);
        return await this.findById(id);
      }
      async findById(id) {
        return this.db.query.calendarEvents.findFirst({
          where: eq39(calendarEvents.id, id)
        });
      }
      async update(id, data) {
        const updates = {};
        if (data.titulo !== void 0) updates.titulo = data.titulo;
        if (data.descripcion !== void 0) updates.descripcion = data.descripcion ?? null;
        if (data.tipo !== void 0) updates.tipo = data.tipo;
        if (data.fechaInicio !== void 0) updates.fechaInicio = new Date(data.fechaInicio);
        if (data.fechaFin !== void 0) updates.fechaFin = data.fechaFin ? new Date(data.fechaFin) : null;
        if (data.recordatorioMinutos !== void 0) {
          updates.recordatorioMinutos = data.recordatorioMinutos;
          updates.notificado = 0;
        }
        await this.db.update(calendarEvents).set(updates).where(eq39(calendarEvents.id, id));
        return this.findById(id);
      }
      async softDelete(id) {
        await this.db.update(calendarEvents).set({ state: 0 }).where(eq39(calendarEvents.id, id));
      }
    };
  }
});

// server/storage/storeage/models/stage-task-template-storage.ts
import { eq as eq40, and as and29, or as or5, isNull as isNull11, asc as asc2 } from "drizzle-orm";
function toDTO2(r) {
  return {
    id: r.id,
    tipoProcesoId: r.tipoProcesoId ?? null,
    legalStageCode: r.legalStageCode,
    titulo: r.titulo,
    descripcion: r.descripcion ?? null,
    prioridad: r.prioridad,
    requerida: r.requerida === 1,
    orden: r.orden,
    activo: r.activo === 1
  };
}
var StageTaskTemplateStorage;
var init_stage_task_template_storage = __esm({
  "server/storage/storeage/models/stage-task-template-storage.ts"() {
    "use strict";
    init_schema();
    StageTaskTemplateStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getByStage(legalStageCode, tipoProcesoId) {
        const rows = await this.db.select().from(etapasTareasPlantilla).where(
          and29(
            eq40(etapasTareasPlantilla.legalStageCode, legalStageCode),
            eq40(etapasTareasPlantilla.activo, 1),
            tipoProcesoId != null ? or5(
              eq40(etapasTareasPlantilla.tipoProcesoId, tipoProcesoId),
              isNull11(etapasTareasPlantilla.tipoProcesoId)
            ) : isNull11(etapasTareasPlantilla.tipoProcesoId)
          )
        ).orderBy(asc2(etapasTareasPlantilla.orden));
        if (tipoProcesoId == null) return rows.map(toDTO2);
        const seen = /* @__PURE__ */ new Map();
        for (const row of rows) {
          const key = row.titulo.trim().toLowerCase();
          const existing = seen.get(key);
          if (!existing || row.tipoProcesoId !== null) seen.set(key, row);
        }
        return Array.from(seen.values()).sort((a, b) => a.orden - b.orden).map(toDTO2);
      }
      async list(tipoProcesoId, legalStageCode) {
        const conditions = [];
        if (tipoProcesoId != null) {
          conditions.push(
            or5(
              eq40(etapasTareasPlantilla.tipoProcesoId, tipoProcesoId),
              isNull11(etapasTareasPlantilla.tipoProcesoId)
            )
          );
        }
        if (legalStageCode) {
          conditions.push(eq40(etapasTareasPlantilla.legalStageCode, legalStageCode));
        }
        const rows = await this.db.select().from(etapasTareasPlantilla).where(conditions.length > 0 ? and29(...conditions) : void 0).orderBy(asc2(etapasTareasPlantilla.orden));
        return rows.map(toDTO2);
      }
      async create(data) {
        const result = await this.db.insert(etapasTareasPlantilla).values({
          tipoProcesoId: data.tipoProcesoId ?? null,
          legalStageCode: data.legalStageCode,
          titulo: data.titulo,
          descripcion: data.descripcion ?? null,
          prioridad: data.prioridad ?? "media",
          requerida: data.requerida ? 1 : 0,
          orden: data.orden ?? 0,
          activo: 1
        });
        const insertId = Number(result.insertId ?? result[0]?.insertId);
        const [row] = await this.db.select().from(etapasTareasPlantilla).where(eq40(etapasTareasPlantilla.id, insertId));
        return toDTO2(row);
      }
      async update(id, data) {
        await this.db.update(etapasTareasPlantilla).set({
          ...data.titulo !== void 0 && { titulo: data.titulo },
          ...data.descripcion !== void 0 && { descripcion: data.descripcion },
          ...data.prioridad !== void 0 && { prioridad: data.prioridad },
          ...data.requerida !== void 0 && { requerida: data.requerida ? 1 : 0 },
          ...data.orden !== void 0 && { orden: data.orden },
          ...data.activo !== void 0 && { activo: data.activo ? 1 : 0 }
        }).where(eq40(etapasTareasPlantilla.id, id));
        const [row] = await this.db.select().from(etapasTareasPlantilla).where(eq40(etapasTareasPlantilla.id, id));
        return row ? toDTO2(row) : null;
      }
      async delete(id) {
        await this.db.update(etapasTareasPlantilla).set({ activo: 0 }).where(eq40(etapasTareasPlantilla.id, id));
      }
      async getById(id) {
        const [row] = await this.db.select().from(etapasTareasPlantilla).where(eq40(etapasTareasPlantilla.id, id));
        return row ? toDTO2(row) : null;
      }
    };
  }
});

// server/storage/storeage/models/stage-event-storage.ts
import { eq as eq41, and as and30, asc as asc3, count as drizzleCount } from "drizzle-orm";
import { randomUUID as randomUUID18 } from "crypto";
function toDTO3(r) {
  return {
    id: r.id,
    procesoId: r.procesoId,
    legalStageCode: r.legalStageCode,
    tipo: r.tipo,
    descripcion: r.descripcion,
    metadatos: r.metadatos,
    creadoPor: r.creadoPor ?? null,
    createdAt: r.createdAt
  };
}
var StageEventStorage;
var init_stage_event_storage = __esm({
  "server/storage/storeage/models/stage-event-storage.ts"() {
    "use strict";
    init_schema();
    StageEventStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async insert(data) {
        const id = randomUUID18();
        await this.db.insert(etapaEventos).values({
          id,
          procesoId: data.procesoId,
          legalStageCode: data.legalStageCode,
          tipo: data.tipo,
          descripcion: data.descripcion,
          metadatos: data.metadatos ?? null,
          creadoPor: data.creadoPor ?? null
        });
        const [row] = await this.db.select().from(etapaEventos).where(eq41(etapaEventos.id, id));
        return toDTO3(row);
      }
      async getByStage(procesoId, legalStageCode, limit = 50, offset = 0) {
        const where = and30(
          eq41(etapaEventos.procesoId, procesoId),
          eq41(etapaEventos.legalStageCode, legalStageCode)
        );
        const [rows, [{ total }]] = await Promise.all([
          this.db.select().from(etapaEventos).where(where).orderBy(asc3(etapaEventos.createdAt)).limit(limit).offset(offset),
          this.db.select({ total: drizzleCount() }).from(etapaEventos).where(where)
        ]);
        return { data: rows.map(toDTO3), total: Number(total) };
      }
      async getByProceso(procesoId, limit = 50, offset = 0) {
        const where = eq41(etapaEventos.procesoId, procesoId);
        const [rows, [{ total }]] = await Promise.all([
          this.db.select().from(etapaEventos).where(where).orderBy(asc3(etapaEventos.createdAt)).limit(limit).offset(offset),
          this.db.select({ total: drizzleCount() }).from(etapaEventos).where(where)
        ]);
        return { data: rows.map(toDTO3), total: Number(total) };
      }
    };
  }
});

// server/storage/storeage/models/proceso-etapa-historial-storage.ts
import { randomUUID as randomUUID19 } from "crypto";
import { eq as eq42, and as and31, desc as desc17, asc as asc4 } from "drizzle-orm";
var ProcesoEtapaHistorialStorage;
var init_proceso_etapa_historial_storage = __esm({
  "server/storage/storeage/models/proceso-etapa-historial-storage.ts"() {
    "use strict";
    init_schema();
    ProcesoEtapaHistorialStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async createHistorial(insertData) {
        const id = randomUUID19();
        const newRecord = {
          ...insertData,
          id,
          fecha: insertData.fecha || /* @__PURE__ */ new Date(),
          observacion: insertData.observacion || null,
          usuarioId: insertData.usuarioId || null,
          createdAt: /* @__PURE__ */ new Date()
        };
        await this.db.insert(procesoEtapaHistorial).values(newRecord);
        return newRecord;
      }
      async getHistorialByProceso(procesoId) {
        return this.db.select().from(procesoEtapaHistorial).where(eq42(procesoEtapaHistorial.procesoId, procesoId)).orderBy(asc4(procesoEtapaHistorial.fecha), asc4(procesoEtapaHistorial.createdAt));
      }
      async getHistorialByProcesoYEtapa(procesoId, etapa) {
        return this.db.select().from(procesoEtapaHistorial).where(and31(
          eq42(procesoEtapaHistorial.procesoId, procesoId),
          eq42(procesoEtapaHistorial.etapa, etapa)
        )).orderBy(desc17(procesoEtapaHistorial.fecha), desc17(procesoEtapaHistorial.createdAt));
      }
      async getUltimoEstadoPorEtapa(procesoId) {
        const historial = await this.db.select().from(procesoEtapaHistorial).where(eq42(procesoEtapaHistorial.procesoId, procesoId)).orderBy(desc17(procesoEtapaHistorial.fecha), desc17(procesoEtapaHistorial.createdAt));
        const ultimoPorEtapa = {};
        for (const registro of historial) {
          if (!ultimoPorEtapa[registro.etapa]) {
            ultimoPorEtapa[registro.etapa] = registro;
          }
        }
        return ultimoPorEtapa;
      }
      async getUltimoEstado(procesoId, etapa) {
        const historial = await this.getHistorialByProcesoYEtapa(procesoId, etapa);
        return historial[0] || null;
      }
      async validarEstado(estado) {
        return ETAPA_ESTADOS.includes(estado);
      }
    };
  }
});

// server/storage/storeage/models/tarea-extension-storage.ts
import { eq as eq43, asc as asc5, desc as desc18 } from "drizzle-orm";
import { randomUUID as randomUUID20 } from "crypto";
var TareaExtensionStorage;
var init_tarea_extension_storage = __esm({
  "server/storage/storeage/models/tarea-extension-storage.ts"() {
    "use strict";
    init_schema();
    TareaExtensionStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      // ── Observaciones ─────────────────────────────────────────────────────────
      async addObservacion(tareaId, autorId, autorNombre, contenido) {
        const id = randomUUID20();
        await this.db.insert(tareaObservaciones).values({
          id,
          tareaId,
          autorId,
          autorNombre,
          contenido
        });
        return {
          id,
          tareaId,
          autor: { id: autorId, nombre: autorNombre },
          contenido,
          createdAt: /* @__PURE__ */ new Date()
        };
      }
      async getObservaciones(tareaId) {
        const rows = await this.db.select().from(tareaObservaciones).where(eq43(tareaObservaciones.tareaId, tareaId)).orderBy(desc18(tareaObservaciones.createdAt));
        return rows.map((r) => ({
          id: r.id,
          tareaId: r.tareaId,
          autor: { id: r.autorId, nombre: r.autorNombre ?? "" },
          contenido: r.contenido,
          createdAt: r.createdAt
        }));
      }
      // ── Subtareas ──────────────────────────────────────────────────────────────
      async addSubtarea(tareaId, dto, creadoPorId, creadoPorNombre) {
        const id = randomUUID20();
        const existing = await this.db.select({ id: tareaSubtareas.id }).from(tareaSubtareas).where(eq43(tareaSubtareas.tareaId, tareaId));
        await this.db.insert(tareaSubtareas).values({
          id,
          tareaId,
          titulo: dto.titulo,
          descripcion: dto.descripcion ?? null,
          estado: "pendiente",
          tiempoEstimado: dto.tiempoEstimado != null ? String(dto.tiempoEstimado) : null,
          tiempoUnidad: dto.tiempoUnidad ?? null,
          creadoPorId,
          creadoPorNombre,
          orden: existing.length
        });
        return {
          id,
          tareaId,
          titulo: dto.titulo,
          descripcion: dto.descripcion ?? null,
          estado: "pendiente",
          tiempoEstimado: dto.tiempoEstimado ?? null,
          tiempoUnidad: dto.tiempoUnidad ?? null,
          completadaEn: null,
          creadoPor: { id: creadoPorId, nombre: creadoPorNombre },
          orden: existing.length,
          createdAt: /* @__PURE__ */ new Date()
        };
      }
      async getSubtareas(tareaId) {
        const rows = await this.db.select().from(tareaSubtareas).where(eq43(tareaSubtareas.tareaId, tareaId)).orderBy(asc5(tareaSubtareas.orden), asc5(tareaSubtareas.createdAt));
        return rows.map((r) => ({
          id: r.id,
          tareaId: r.tareaId,
          titulo: r.titulo,
          descripcion: r.descripcion ?? null,
          estado: r.estado,
          tiempoEstimado: r.tiempoEstimado != null ? parseFloat(String(r.tiempoEstimado)) : null,
          tiempoUnidad: r.tiempoUnidad,
          completadaEn: r.completadaEn ?? null,
          creadoPor: { id: r.creadoPorId, nombre: r.creadoPorNombre ?? "" },
          orden: r.orden,
          createdAt: r.createdAt
        }));
      }
      async updateSubtarea(subtareaId, dto, usuarioId) {
        const updates = {};
        if (dto.titulo !== void 0) updates.titulo = dto.titulo;
        if (dto.descripcion !== void 0) updates.descripcion = dto.descripcion ?? null;
        if (dto.tiempoUnidad !== void 0) updates.tiempoUnidad = dto.tiempoUnidad ?? null;
        if (dto.tiempoEstimado !== void 0) {
          updates.tiempoEstimado = dto.tiempoEstimado != null ? String(dto.tiempoEstimado) : null;
        }
        if (dto.estado !== void 0) {
          updates.estado = dto.estado;
          updates.completadaEn = dto.estado === "completada" ? /* @__PURE__ */ new Date() : null;
          if (dto.estado === "completada") {
            updates.completadaPorId = usuarioId;
          }
        }
        if (Object.keys(updates).length > 0) {
          await this.db.update(tareaSubtareas).set(updates).where(eq43(tareaSubtareas.id, subtareaId));
        }
        const row = await this.db.query.tareaSubtareas.findFirst({
          where: eq43(tareaSubtareas.id, subtareaId)
        });
        if (!row) return null;
        return {
          id: row.id,
          tareaId: row.tareaId,
          titulo: row.titulo,
          descripcion: row.descripcion ?? null,
          estado: row.estado,
          tiempoEstimado: row.tiempoEstimado != null ? parseFloat(String(row.tiempoEstimado)) : null,
          tiempoUnidad: row.tiempoUnidad,
          completadaEn: row.completadaEn ?? null,
          creadoPor: { id: row.creadoPorId, nombre: row.creadoPorNombre ?? "" },
          orden: row.orden,
          createdAt: row.createdAt
        };
      }
      async deleteSubtarea(subtareaId) {
        await this.db.delete(tareaSubtareas).where(eq43(tareaSubtareas.id, subtareaId));
      }
      async countSubtareas(tareaId) {
        const rows = await this.db.select({ estado: tareaSubtareas.estado }).from(tareaSubtareas).where(eq43(tareaSubtareas.tareaId, tareaId));
        return {
          total: rows.length,
          completadas: rows.filter((r) => r.estado === "completada").length
        };
      }
      // ── Historial ──────────────────────────────────────────────────────────────
      async addHistorial(tareaId, usuarioId, usuarioNombre, accion, detalle) {
        await this.db.insert(tareaHistorial).values({
          id: randomUUID20(),
          tareaId,
          usuarioId,
          usuarioNombre,
          accion,
          detalle: detalle ?? null
        });
      }
      async getHistorial(tareaId) {
        const rows = await this.db.select().from(tareaHistorial).where(eq43(tareaHistorial.tareaId, tareaId)).orderBy(desc18(tareaHistorial.createdAt));
        return rows.map((r) => ({
          id: r.id,
          tareaId: r.tareaId,
          usuario: { id: r.usuarioId, nombre: r.usuarioNombre ?? "" },
          accion: r.accion,
          detalle: r.detalle ?? null,
          createdAt: r.createdAt
        }));
      }
      // ── Archivos ───────────────────────────────────────────────────────────────
      async addArchivo(tareaId, nombre, url2, mimeType, tamano, subidoPorId) {
        const id = randomUUID20();
        await this.db.insert(tareaArchivos).values({ id, tareaId, nombre, url: url2, mimeType, tamano, subidoPorId });
        return {
          id,
          tareaId,
          nombre,
          url: url2,
          mimeType,
          tamano,
          esImagen: mimeType.startsWith("image/"),
          subidoPorId,
          createdAt: /* @__PURE__ */ new Date()
        };
      }
      async getArchivos(tareaId) {
        const rows = await this.db.select().from(tareaArchivos).where(eq43(tareaArchivos.tareaId, tareaId)).orderBy(desc18(tareaArchivos.createdAt));
        return rows.map((r) => ({
          id: r.id,
          tareaId: r.tareaId,
          nombre: r.nombre,
          url: r.url,
          mimeType: r.mimeType,
          tamano: r.tamano,
          esImagen: r.mimeType.startsWith("image/"),
          subidoPorId: r.subidoPorId,
          createdAt: r.createdAt
        }));
      }
      async deleteArchivo(archivoId) {
        await this.db.delete(tareaArchivos).where(eq43(tareaArchivos.id, archivoId));
      }
      async findArchivo(archivoId) {
        const row = await this.db.query.tareaArchivos.findFirst({
          where: eq43(tareaArchivos.id, archivoId)
        });
        if (!row) return null;
        return {
          id: row.id,
          tareaId: row.tareaId,
          nombre: row.nombre,
          url: row.url,
          mimeType: row.mimeType,
          tamano: row.tamano,
          esImagen: row.mimeType.startsWith("image/"),
          subidoPorId: row.subidoPorId,
          createdAt: row.createdAt
        };
      }
    };
  }
});

// server/storage/storeage/models/proceso-ownership-storage.ts
import { eq as eq44, and as and32, desc as desc19, isNull as isNull12, inArray as inArray9 } from "drizzle-orm";
import { randomUUID as randomUUID21 } from "crypto";
var ProcesoOwnershipStorage;
var init_proceso_ownership_storage = __esm({
  "server/storage/storeage/models/proceso-ownership-storage.ts"() {
    "use strict";
    init_schema();
    ProcesoOwnershipStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      /** Ownership activo de un proceso (activo_unique = 1). */
      async getActive(procesoId) {
        const row = await this.db.select().from(procesoOwnership).where(and32(
          eq44(procesoOwnership.procesoId, procesoId),
          eq44(procesoOwnership.activoUnique, 1)
        )).limit(1).then((r) => r[0] ?? null);
        return row ? this.toDTO(row) : null;
      }
      /** Fetch active ownership for multiple procesosIds in a single query. */
      async getActiveBatch(procesoIds) {
        if (procesoIds.length === 0) return /* @__PURE__ */ new Map();
        const rows = await this.db.select().from(procesoOwnership).where(and32(
          inArray9(procesoOwnership.procesoId, procesoIds),
          eq44(procesoOwnership.activoUnique, 1)
        ));
        const map = /* @__PURE__ */ new Map();
        for (const row of rows) {
          map.set(row.procesoId, this.toDTO(row));
        }
        return map;
      }
      /** Historial completo de ownership de un proceso (más reciente primero). */
      async getHistory(procesoId) {
        const rows = await this.db.select().from(procesoOwnership).where(eq44(procesoOwnership.procesoId, procesoId)).orderBy(desc19(procesoOwnership.fechaInicio));
        return rows.map((r) => this.toDTO(r));
      }
      /**
       * Transferir ownership de un proceso.
       * Cierra el registro activo y abre uno nuevo.
       */
      async transfer(procesoId, dto, creadoPor) {
        const id = randomUUID21();
        await this.db.transaction(async (tx) => {
          await tx.update(procesoOwnership).set({ fechaFin: /* @__PURE__ */ new Date(), activoUnique: null }).where(and32(
            eq44(procesoOwnership.procesoId, procesoId),
            eq44(procesoOwnership.activoUnique, 1)
          ));
          await tx.insert(procesoOwnership).values({
            id,
            procesoId,
            ownerType: dto.ownerType,
            ownerId: dto.ownerId ?? null,
            activoUnique: 1,
            creadoPor,
            razon: dto.razon ?? null
          });
        });
        return {
          id,
          procesoId,
          ownerType: dto.ownerType,
          ownerId: dto.ownerId ?? null,
          fechaInicio: /* @__PURE__ */ new Date(),
          fechaFin: null,
          activo: true,
          creadoPor,
          razon: dto.razon ?? null
        };
      }
      /**
       * Crear ownership inicial (para proceso recién creado).
       * Solo usar si no existe ningún ownership para el proceso.
       */
      async create(procesoId, ownerType, ownerId, creadoPor, razon) {
        const id = randomUUID21();
        await this.db.insert(procesoOwnership).values({
          id,
          procesoId,
          ownerType,
          ownerId: ownerId ?? null,
          activoUnique: 1,
          creadoPor,
          razon: razon ?? null
        });
        return {
          id,
          procesoId,
          ownerType,
          ownerId: ownerId ?? null,
          fechaInicio: /* @__PURE__ */ new Date(),
          fechaFin: null,
          activo: true,
          creadoPor,
          razon: razon ?? null
        };
      }
      /**
       * Todos los procesoIds donde owner_type + owner_id tienen ownership activo.
       */
      async getProcesoIdsByOwner(ownerType, ownerId) {
        const rows = await this.db.select({ procesoId: procesoOwnership.procesoId }).from(procesoOwnership).where(and32(
          eq44(procesoOwnership.ownerType, ownerType),
          ownerId !== null ? eq44(procesoOwnership.ownerId, ownerId) : isNull12(procesoOwnership.ownerId),
          eq44(procesoOwnership.activoUnique, 1)
        ));
        return rows.map((r) => r.procesoId);
      }
      /** Procesos del bufete sin asignación activa (para el banner de reasignación) */
      async getPendingReassignmentIds(bufeteId) {
        const ownedIds = await this.getProcesoIdsByOwner("bufete", bufeteId);
        if (ownedIds.length === 0) return [];
        const assigned = await this.db.selectDistinct({ procesoId: procesoLawyers.procesoId }).from(procesoLawyers).where(and32(
          inArray9(procesoLawyers.procesoId, ownedIds),
          eq44(procesoLawyers.status, "activo")
        ));
        const assignedSet = new Set(assigned.map((r) => r.procesoId));
        return ownedIds.filter((id) => !assignedSet.has(id));
      }
      toDTO(row) {
        return {
          id: row.id,
          procesoId: row.procesoId,
          ownerType: row.ownerType,
          ownerId: row.ownerId ?? null,
          fechaInicio: row.fechaInicio,
          fechaFin: row.fechaFin ?? null,
          activo: row.activoUnique === 1,
          creadoPor: row.creadoPor,
          razon: row.razon ?? null
        };
      }
    };
  }
});

// server/storage/storeage/models/proceso-sharing-storage.ts
import { eq as eq45, and as and33, desc as desc20 } from "drizzle-orm";
import { randomUUID as randomUUID22 } from "crypto";
var ProcesoSharingStorage;
var init_proceso_sharing_storage = __esm({
  "server/storage/storeage/models/proceso-sharing-storage.ts"() {
    "use strict";
    init_schema();
    ProcesoSharingStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      /** Sharing activo de un proceso (todos los receptores). */
      async getActive(procesoId) {
        const rows = await this.db.select().from(procesoSharing).where(and33(
          eq45(procesoSharing.procesoId, procesoId),
          eq45(procesoSharing.activoUnique, 1)
        ));
        return rows.map((r) => this.toDTO(r));
      }
      /** Historial completo de sharing de un proceso. */
      async getHistory(procesoId) {
        const rows = await this.db.select().from(procesoSharing).where(eq45(procesoSharing.procesoId, procesoId)).orderBy(desc20(procesoSharing.fechaInicio));
        return rows.map((r) => this.toDTO(r));
      }
      /** Sharing activo para una entidad específica (para assertProcesoAccess). */
      async findActive(procesoId, sharedWithType, sharedWithId) {
        const row = await this.db.select().from(procesoSharing).where(and33(
          eq45(procesoSharing.procesoId, procesoId),
          eq45(procesoSharing.sharedWithType, sharedWithType),
          eq45(procesoSharing.sharedWithId, sharedWithId),
          eq45(procesoSharing.activoUnique, 1)
        )).limit(1).then((r) => r[0] ?? null);
        return row ? this.toDTO(row) : null;
      }
      /**
       * Crear o actualizar sharing.
       * Si existe sharing activo para el mismo proceso+tipo+receptor → cierra y crea nuevo.
       */
      async upsert(procesoId, dto, creadoPor) {
        const allowed = PERMISSION_CEILING[dto.sharedWithType];
        if (!allowed.includes(dto.permission)) {
          throw new Error(
            `Permiso '${dto.permission}' no permitido para '${dto.sharedWithType}'. M\xE1ximo: ${allowed.join(", ")}`
          );
        }
        const id = randomUUID22();
        await this.db.transaction(async (tx) => {
          await tx.update(procesoSharing).set({ fechaFin: /* @__PURE__ */ new Date(), activoUnique: null }).where(and33(
            eq45(procesoSharing.procesoId, procesoId),
            eq45(procesoSharing.sharedWithType, dto.sharedWithType),
            eq45(procesoSharing.sharedWithId, dto.sharedWithId),
            eq45(procesoSharing.activoUnique, 1)
          ));
          await tx.insert(procesoSharing).values({
            id,
            procesoId,
            sharedWithType: dto.sharedWithType,
            sharedWithId: dto.sharedWithId,
            permission: dto.permission,
            activoUnique: 1,
            creadoPor,
            razon: dto.razon ?? null
          });
        });
        return {
          id,
          procesoId,
          sharedWithType: dto.sharedWithType,
          sharedWithId: dto.sharedWithId,
          permission: dto.permission,
          fechaInicio: /* @__PURE__ */ new Date(),
          fechaFin: null,
          activo: true,
          creadoPor,
          razon: dto.razon ?? null
        };
      }
      /** Revocar sharing por ID del registro. */
      async revoke(shareId, procesoId) {
        await this.db.update(procesoSharing).set({ fechaFin: /* @__PURE__ */ new Date(), activoUnique: null }).where(and33(
          eq45(procesoSharing.id, shareId),
          eq45(procesoSharing.procesoId, procesoId),
          eq45(procesoSharing.activoUnique, 1)
        ));
      }
      /**
       * Revocar todos los sharings activos de un proceso con una entidad.
       * Usado en el flujo de salida del bufete.
       */
      async revokeAllForEntity(sharedWithType, sharedWithId, procesoIds) {
        if (procesoIds.length === 0) return;
        for (const procesoId of procesoIds) {
          await this.db.update(procesoSharing).set({ fechaFin: /* @__PURE__ */ new Date(), activoUnique: null }).where(and33(
            eq45(procesoSharing.procesoId, procesoId),
            eq45(procesoSharing.sharedWithType, sharedWithType),
            eq45(procesoSharing.sharedWithId, sharedWithId),
            eq45(procesoSharing.activoUnique, 1)
          ));
        }
      }
      /** ProcesoIds con sharing activo para una entidad. */
      async getProcesoIdsBySharedWith(sharedWithType, sharedWithId) {
        const rows = await this.db.select({ procesoId: procesoSharing.procesoId }).from(procesoSharing).where(and33(
          eq45(procesoSharing.sharedWithType, sharedWithType),
          eq45(procesoSharing.sharedWithId, sharedWithId),
          eq45(procesoSharing.activoUnique, 1)
        ));
        return rows.map((r) => r.procesoId);
      }
      toDTO(row) {
        return {
          id: row.id,
          procesoId: row.procesoId,
          sharedWithType: row.sharedWithType,
          sharedWithId: row.sharedWithId,
          permission: row.permission,
          fechaInicio: row.fechaInicio,
          fechaFin: row.fechaFin ?? null,
          activo: row.activoUnique === 1,
          creadoPor: row.creadoPor,
          razon: row.razon ?? null
        };
      }
    };
  }
});

// server/storage/storeage/models/cliente-ownership-storage.ts
import { eq as eq46, and as and34, desc as desc21 } from "drizzle-orm";
import { randomUUID as randomUUID23 } from "crypto";
var ClienteOwnershipStorage;
var init_cliente_ownership_storage = __esm({
  "server/storage/storeage/models/cliente-ownership-storage.ts"() {
    "use strict";
    init_schema();
    ClienteOwnershipStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      /** Ownership activo de un cliente (activo_unique = 1). */
      async getActive(clienteId) {
        const row = await this.db.select().from(clienteOwnership).where(and34(
          eq46(clienteOwnership.clienteId, clienteId),
          eq46(clienteOwnership.activoUnique, 1)
        )).limit(1).then((r) => r[0] ?? null);
        return row ? this.toDTO(row) : null;
      }
      /** Historial completo de ownership de un cliente (más reciente primero). */
      async getHistory(clienteId) {
        const rows = await this.db.select().from(clienteOwnership).where(eq46(clienteOwnership.clienteId, clienteId)).orderBy(desc21(clienteOwnership.fechaInicio));
        return rows.map((r) => this.toDTO(r));
      }
      /** Crear ownership inicial (para cliente recién creado). */
      async create(clienteId, ownerType, ownerId, creadoPor, razon) {
        const id = randomUUID23();
        await this.db.insert(clienteOwnership).values({
          id,
          clienteId,
          ownerType,
          ownerId,
          activoUnique: 1,
          creadoPor,
          razon: razon ?? null
        });
        return {
          id,
          clienteId,
          ownerType,
          ownerId,
          fechaInicio: /* @__PURE__ */ new Date(),
          fechaFin: null,
          activo: true,
          creadoPor,
          razon: razon ?? null
        };
      }
      /** IDs de clientes donde owner_type + owner_id tienen ownership activo. */
      async getClienteIdsByOwner(ownerType, ownerId) {
        const rows = await this.db.select({ clienteId: clienteOwnership.clienteId }).from(clienteOwnership).where(and34(
          eq46(clienteOwnership.ownerType, ownerType),
          eq46(clienteOwnership.ownerId, ownerId),
          eq46(clienteOwnership.activoUnique, 1)
        ));
        return rows.map((r) => r.clienteId);
      }
      toDTO(row) {
        return {
          id: row.id,
          clienteId: row.clienteId,
          ownerType: row.ownerType,
          ownerId: row.ownerId,
          fechaInicio: row.fechaInicio,
          fechaFin: row.fechaFin ?? null,
          activo: row.activoUnique === 1,
          creadoPor: row.creadoPor,
          razon: row.razon ?? null
        };
      }
    };
  }
});

// server/storage/storeage/models/firm-settings-storage.ts
import { eq as eq47 } from "drizzle-orm";
import { randomUUID as randomUUID24 } from "crypto";
var DEFAULTS, FirmSettingsStorage;
var init_firm_settings_storage = __esm({
  "server/storage/storeage/models/firm-settings-storage.ts"() {
    "use strict";
    init_schema();
    DEFAULTS = {
      allowPrivateClientes: false,
      allowPrivateProcesos: false,
      defaultClienteEsCompartido: true,
      defaultProcesoEsCompartido: true,
      notifMensajes: true,
      notifVencimientos: true,
      notifCambiosProcesos: true,
      notifEquipoInvitaciones: true,
      notifAlertasPlan: true,
      notifResumenSemanal: false
    };
    FirmSettingsStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      /** Obtiene settings del bufete. Si no existen, devuelve los defaults sin persistir. */
      async get(firmId) {
        const row = await this.db.select().from(firmSettings).where(eq47(firmSettings.firmId, firmId)).limit(1).then((r) => r[0] ?? null);
        if (!row) return { firmId, ...DEFAULTS };
        return this.toDTO(row);
      }
      /** Crea o actualiza los settings de un bufete. */
      async upsert(firmId, updates) {
        const existing = await this.db.select().from(firmSettings).where(eq47(firmSettings.firmId, firmId)).limit(1).then((r) => r[0] ?? null);
        if (existing) {
          await this.db.update(firmSettings).set(updates).where(eq47(firmSettings.firmId, firmId));
          return this.toDTO({ ...existing, ...updates });
        }
        const id = randomUUID24();
        const newRow = { id, firmId, ...DEFAULTS, ...updates };
        await this.db.insert(firmSettings).values(newRow);
        return this.toDTO(newRow);
      }
      toDTO(row) {
        return {
          firmId: row.firmId,
          allowPrivateClientes: row.allowPrivateClientes,
          allowPrivateProcesos: row.allowPrivateProcesos,
          defaultClienteEsCompartido: row.defaultClienteEsCompartido,
          defaultProcesoEsCompartido: row.defaultProcesoEsCompartido,
          notifMensajes: row.notifMensajes,
          notifVencimientos: row.notifVencimientos,
          notifCambiosProcesos: row.notifCambiosProcesos,
          notifEquipoInvitaciones: row.notifEquipoInvitaciones,
          notifAlertasPlan: row.notifAlertasPlan,
          notifResumenSemanal: row.notifResumenSemanal
        };
      }
    };
  }
});

// server/storage/storeage/models/feature-storage.ts
import { eq as eq48, and as and35 } from "drizzle-orm";
var FeatureStorage;
var init_feature_storage = __esm({
  "server/storage/storeage/models/feature-storage.ts"() {
    "use strict";
    init_schema();
    FeatureStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getAll() {
        return this.db.select().from(features).where(eq48(features.state, true));
      }
      async getByPlan(planId) {
        const rows = await this.db.select({
          code: planFeatures.featureCode,
          nombre: features.nombre,
          value: planFeatures.value
        }).from(planFeatures).innerJoin(features, eq48(planFeatures.featureCode, features.code)).where(and35(eq48(planFeatures.planId, planId), eq48(features.state, true)));
        return rows;
      }
      async hasFeature(planId, featureCode) {
        const row = await this.db.select().from(planFeatures).where(and35(eq48(planFeatures.planId, planId), eq48(planFeatures.featureCode, featureCode))).limit(1).then((r) => r[0] ?? null);
        if (!row) return { has: false, value: "false" };
        return { has: row.value !== "false" && row.value !== "0", value: row.value };
      }
      async upsertFeature(planId, featureCode, value) {
        const existing = await this.db.select().from(planFeatures).where(and35(eq48(planFeatures.planId, planId), eq48(planFeatures.featureCode, featureCode))).limit(1).then((r) => r[0] ?? null);
        if (existing) {
          await this.db.update(planFeatures).set({ value }).where(and35(eq48(planFeatures.planId, planId), eq48(planFeatures.featureCode, featureCode)));
        } else {
          await this.db.insert(planFeatures).values({ planId, featureCode, value });
        }
      }
    };
  }
});

// server/storage/storeage/models/suscripcion-storage.ts
import { eq as eq49, and as and36 } from "drizzle-orm";
import { randomUUID as randomUUID25 } from "crypto";
var SuscripcionStorage;
var init_suscripcion_storage = __esm({
  "server/storage/storeage/models/suscripcion-storage.ts"() {
    "use strict";
    init_schema();
    SuscripcionStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getActive(userId2) {
        const row = await this.db.select().from(suscripciones).where(and36(eq49(suscripciones.userId, userId2), eq49(suscripciones.estado, "activa"))).limit(1).then((r) => r[0] ?? null);
        return row;
      }
      async getById(id) {
        return this.db.select().from(suscripciones).where(eq49(suscripciones.id, id)).limit(1).then((r) => r[0] ?? null);
      }
      async getByUserId(userId2) {
        return this.db.select().from(suscripciones).where(eq49(suscripciones.userId, userId2));
      }
      async create(data) {
        const id = randomUUID25();
        await this.db.insert(suscripciones).values({ ...data, id });
        return await this.getById(id);
      }
      async updateEstado(id, estado, fechaCancelacion) {
        const updates = { estado };
        if (fechaCancelacion) updates.fechaCancelacion = fechaCancelacion;
        await this.db.update(suscripciones).set(updates).where(eq49(suscripciones.id, id));
      }
      async cancelAutoRenovacion(id) {
        await this.db.update(suscripciones).set({ autoRenovacion: false, fechaCancelacion: /* @__PURE__ */ new Date() }).where(eq49(suscripciones.id, id));
      }
      /** Suscripciones activas cuyo vencimiento es en <= diasAntes días (para cron) */
      async getProximasAVencer(diasAntes) {
        const limite = /* @__PURE__ */ new Date();
        limite.setDate(limite.getDate() + diasAntes);
        const ahora = /* @__PURE__ */ new Date();
        const { sql: sql29 } = await import("drizzle-orm");
        return this.db.select().from(suscripciones).where(
          and36(
            eq49(suscripciones.estado, "activa"),
            sql29`${suscripciones.fechaVencimiento} BETWEEN ${ahora} AND ${limite}`
          )
        );
      }
      /** Suscripciones activas que ya vencieron (para degradar a gratis) */
      async getVencidas() {
        const ahora = /* @__PURE__ */ new Date();
        const { sql: sql29 } = await import("drizzle-orm");
        return this.db.select().from(suscripciones).where(
          and36(
            eq49(suscripciones.estado, "activa"),
            sql29`${suscripciones.fechaVencimiento} < ${ahora}`
          )
        );
      }
    };
  }
});

// server/storage/storeage/models/pago-storage.ts
import { eq as eq50 } from "drizzle-orm";
import { randomUUID as randomUUID26 } from "crypto";
var PagoStorage;
var init_pago_storage = __esm({
  "server/storage/storeage/models/pago-storage.ts"() {
    "use strict";
    init_schema();
    PagoStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async create(data) {
        const id = randomUUID26();
        await this.db.insert(pagos).values({ ...data, id });
        return await this.getById(id);
      }
      async getById(id) {
        return this.db.select().from(pagos).where(eq50(pagos.id, id)).limit(1).then((r) => r[0] ?? null);
      }
      async getByReference(reference) {
        return this.db.select().from(pagos).where(eq50(pagos.wompiReference, reference)).limit(1).then((r) => r[0] ?? null);
      }
      async updateEstado(id, estado, wompiTransactionId, metodoPago) {
        const updates = { estado };
        if (wompiTransactionId) updates.wompiTransactionId = wompiTransactionId;
        if (metodoPago) updates.metodoPago = metodoPago;
        await this.db.update(pagos).set(updates).where(eq50(pagos.id, id));
      }
    };
  }
});

// server/storage/storeage/models/usage-tracking-storage.ts
import { eq as eq51, sql as sql18 } from "drizzle-orm";
import { randomUUID as randomUUID27 } from "crypto";
var CAMPO, UsageTrackingStorage;
var init_usage_tracking_storage = __esm({
  "server/storage/storeage/models/usage-tracking-storage.ts"() {
    "use strict";
    init_schema();
    CAMPO = {
      procesos: "procesosUsados",
      clientes: "clientesUsados",
      storage: "storageUsadoMb"
    };
    UsageTrackingStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getByUserId(userId2) {
        return this.db.select().from(usageTracking).where(eq51(usageTracking.userId, userId2)).limit(1).then((r) => r[0] ?? null);
      }
      async initForUser(userId2, suscripcionId) {
        const existing = await this.getByUserId(userId2);
        if (existing) {
          await this.db.update(usageTracking).set({ suscripcionId }).where(eq51(usageTracking.userId, userId2));
          return;
        }
        await this.db.insert(usageTracking).values({
          id: randomUUID27(),
          userId: userId2,
          suscripcionId,
          procesosUsados: 0,
          clientesUsados: 0,
          storageUsadoMb: 0
        });
      }
      async increment(userId2, tipo, cantidad = 1) {
        const col = CAMPO[tipo];
        await this.db.update(usageTracking).set({ [col]: sql18`${usageTracking[col]} + ${cantidad}` }).where(eq51(usageTracking.userId, userId2));
      }
      async decrement(userId2, tipo, cantidad = 1) {
        const col = CAMPO[tipo];
        await this.db.update(usageTracking).set({ [col]: sql18`GREATEST(0, ${usageTracking[col]} - ${cantidad})` }).where(eq51(usageTracking.userId, userId2));
      }
      async reset(userId2) {
        await this.db.update(usageTracking).set({ procesosUsados: 0, clientesUsados: 0, storageUsadoMb: 0 }).where(eq51(usageTracking.userId, userId2));
      }
    };
  }
});

// server/storage/storeage/models/admin-profile.storage.ts
import { eq as eq52 } from "drizzle-orm";
var AdminProfileStorage;
var init_admin_profile_storage = __esm({
  "server/storage/storeage/models/admin-profile.storage.ts"() {
    "use strict";
    init_schema();
    AdminProfileStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getAdminProfileById(id) {
        const result = await this.db.select().from(adminProfiles).where(eq52(adminProfiles.id, id)).limit(1);
        return result[0];
      }
      async getAdminProfileByUserId(userId2) {
        const result = await this.db.select().from(adminProfiles).where(eq52(adminProfiles.userId, userId2)).limit(1);
        return result[0];
      }
      async createAdminProfile(data) {
        const newProfile = {
          ...data,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        await this.db.insert(adminProfiles).values(newProfile);
        const created = await this.getAdminProfileByUserId(data.userId);
        if (!created) {
          throw new Error("No se pudo crear el perfil de administrador");
        }
        return created;
      }
      async updateAdminProfile(id, updates) {
        const { createdAt, ...safeUpdates } = updates;
        await this.db.update(adminProfiles).set({
          ...safeUpdates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq52(adminProfiles.id, id));
        return this.getAdminProfileById(id);
      }
    };
  }
});

// server/admin/storage/admin-stats.storage.ts
import { sql as sql19, inArray as inArray10, eq as eq53, and as and37, gte as gte3 } from "drizzle-orm";
var USER_ROLES, AdminStatsStorage;
var init_admin_stats_storage = __esm({
  "server/admin/storage/admin-stats.storage.ts"() {
    "use strict";
    init_schema();
    USER_ROLES = ["abogado", "bufete", "cliente"];
    AdminStatsStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async getStats() {
        const now = /* @__PURE__ */ new Date();
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        const userRoleRows = await this.db.select({ id: roles.id }).from(roles).where(inArray10(roles.nombre, [...USER_ROLES]));
        const userRoleIds = userRoleRows.map((r) => r.id);
        const [
          usuariosResult,
          suscripcionesResult,
          ingresosResult,
          procesosResult,
          nuevosResult
        ] = await Promise.all([
          // Total usuarios finales
          userRoleIds.length > 0 ? this.db.select({ total: sql19`COUNT(*)` }).from(users).where(inArray10(users.rolId, userRoleIds)) : Promise.resolve([{ total: 0 }]),
          // Suscripciones activas
          this.db.select({ total: sql19`COUNT(*)` }).from(suscripciones).where(eq53(suscripciones.estado, "activa")),
          // Ingresos estimados COP (normalizados a mensual)
          this.db.select({
            total: sql19`
            SUM(
              CASE ${suscripciones.ciclo}
                WHEN 'mensual' THEN CAST(${planes.precioMensualCop} AS DECIMAL(14,2))
                WHEN 'anual'   THEN CAST(${planes.precioAnualCop}   AS DECIMAL(14,2)) / 12
                ELSE 0
              END
            )
          `
          }).from(suscripciones).innerJoin(planes, eq53(planes.id, suscripciones.planId)).where(eq53(suscripciones.estado, "activa")),
          // Total procesos activos
          this.db.select({ total: sql19`COUNT(*)` }).from(procesos).where(eq53(procesos.state, true)),
          // Nuevos usuarios este mes (solo roles finales)
          userRoleIds.length > 0 ? this.db.select({ total: sql19`COUNT(*)` }).from(users).where(
            and37(
              inArray10(users.rolId, userRoleIds),
              gte3(users.createdAt, startOfMonth)
            )
          ) : Promise.resolve([{ total: 0 }])
        ]);
        return {
          totalUsuarios: Number(usuariosResult[0]?.total ?? 0),
          suscripcionesActivas: Number(suscripcionesResult[0]?.total ?? 0),
          ingresosEstimadosCop: Number(ingresosResult[0]?.total ?? 0),
          totalProcesos: Number(procesosResult[0]?.total ?? 0),
          nuevosEsteMes: Number(nuevosResult[0]?.total ?? 0)
        };
      }
    };
  }
});

// server/admin/storage/admin-audit.storage.ts
import { sql as sql20, eq as eq54, and as and38, desc as desc22 } from "drizzle-orm";
var AdminAuditStorage;
var init_admin_audit_storage = __esm({
  "server/admin/storage/admin-audit.storage.ts"() {
    "use strict";
    init_schema();
    AdminAuditStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async log(entry) {
        await this.db.insert(adminAuditLog).values({
          adminId: entry.adminId,
          accion: entry.accion,
          targetId: entry.targetId ?? null,
          detalle: entry.detalle ?? null
        });
      }
      async getLog(params) {
        const page = Math.max(params.page ?? 1, 1);
        const limit = Math.min(params.limit ?? 20, 100);
        const offset = (page - 1) * limit;
        const conditions = [];
        if (params.adminId) conditions.push(eq54(adminAuditLog.adminId, params.adminId));
        if (params.accion) conditions.push(eq54(adminAuditLog.accion, params.accion));
        const where = conditions.length > 0 ? and38(...conditions) : void 0;
        const [countRow] = await this.db.select({ total: sql20`COUNT(*)` }).from(adminAuditLog).where(where);
        const rows = await this.db.select().from(adminAuditLog).where(where).orderBy(desc22(adminAuditLog.createdAt)).limit(limit).offset(offset);
        return {
          data: rows,
          meta: { total: Number(countRow?.total ?? 0), page, limit }
        };
      }
    };
  }
});

// server/admin/storage/admin-users.storage.ts
import { sql as sql21, eq as eq55, and as and39, or as or6, like as like6, desc as desc23 } from "drizzle-orm";
var AdminUsersStorage;
var init_admin_users_storage = __esm({
  "server/admin/storage/admin-users.storage.ts"() {
    "use strict";
    init_schema();
    AdminUsersStorage = class {
      constructor(db2) {
        this.db = db2;
      }
      async list(params) {
        const page = Math.max(params.page ?? 1, 1);
        const limit = Math.min(params.limit ?? 20, 100);
        const offset = (page - 1) * limit;
        let rolIdFiltro;
        if (params.tipo) {
          const [roleRow] = await this.db.select({ id: roles.id }).from(roles).where(eq55(roles.nombre, params.tipo)).limit(1);
          rolIdFiltro = roleRow?.id;
        }
        const conditions = [];
        if (rolIdFiltro !== void 0) conditions.push(eq55(users.rolId, rolIdFiltro));
        if (params.estado === "activo") conditions.push(eq55(users.isActive, true));
        if (params.estado === "suspendido") conditions.push(eq55(users.isActive, false));
        if (params.search) {
          const pattern = `%${params.search}%`;
          conditions.push(
            or6(
              like6(users.name, pattern),
              like6(users.email, pattern)
            )
          );
        }
        const where = conditions.length > 0 ? and39(...conditions) : void 0;
        const [countRow] = await this.db.select({ total: sql21`COUNT(*)` }).from(users).where(where);
        const rows = await this.db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          isActive: users.isActive,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          rolNombre: roles.nombre,
          planNombre: sql21`(
          SELECT p.nombre FROM suscripciones s
          JOIN planes p ON p.id = s.plan_id
          WHERE s.user_id = ${users.id} AND s.estado = 'activa'
          LIMIT 1
        )`
        }).from(users).leftJoin(roles, eq55(roles.id, users.rolId)).where(where).orderBy(desc23(users.createdAt)).limit(limit).offset(offset);
        return {
          data: rows.map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            isActive: r.isActive ?? false,
            emailVerified: r.emailVerified ?? false,
            createdAt: r.createdAt?.toISOString() ?? "",
            rol: { nombre: r.rolNombre ?? "" },
            plan: r.planNombre ? { nombre: r.planNombre } : null
          })),
          meta: { total: Number(countRow?.total ?? 0), page, limit }
        };
      }
      async getById(id) {
        const [row] = await this.db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          isActive: users.isActive,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          rolNombre: roles.nombre,
          firmId: firmProfiles.id,
          firmNombre: firmProfiles.name,
          lawyerProfileId: lawyerProfiles.id,
          licenseNumber: lawyerProfiles.licenseNumber,
          lawyerVerificationStatus: lawyerProfiles.professionalVerificationStatus,
          lawyerReviewedAt: lawyerProfiles.professionalReviewedAt,
          lawyerReviewedBy: lawyerProfiles.professionalReviewedBy,
          lawyerReviewNotes: lawyerProfiles.professionalReviewNotes
        }).from(users).leftJoin(roles, eq55(roles.id, users.rolId)).leftJoin(lawyerProfiles, eq55(lawyerProfiles.userId, users.id)).leftJoin(firmProfiles, eq55(firmProfiles.id, lawyerProfiles.firmId)).where(eq55(users.id, id)).limit(1);
        if (!row) return null;
        const firma = row.firmId && row.firmNombre ? { id: row.firmId, nombre: row.firmNombre } : null;
        const susRows = await this.db.select({
          id: suscripciones.id,
          planNombre: planes.nombre,
          ciclo: suscripciones.ciclo,
          estado: suscripciones.estado,
          fechaInicio: suscripciones.fechaInicio,
          fechaVencimiento: suscripciones.fechaVencimiento
        }).from(suscripciones).leftJoin(planes, eq55(planes.id, suscripciones.planId)).where(eq55(suscripciones.userId, id)).orderBy(desc23(suscripciones.fechaInicio));
        const historial = susRows.map((s) => ({
          id: s.id,
          planNombre: s.planNombre ?? "",
          ciclo: s.ciclo,
          estado: s.estado,
          fechaInicio: s.fechaInicio instanceof Date ? s.fechaInicio.toISOString() : String(s.fechaInicio),
          fechaFin: s.fechaVencimiento instanceof Date ? s.fechaVencimiento.toISOString() : String(s.fechaVencimiento)
        }));
        const suscripcionActiva = historial.find((s) => s.estado === "activa") ?? null;
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          isActive: row.isActive ?? false,
          emailVerified: row.emailVerified ?? false,
          createdAt: row.createdAt?.toISOString() ?? "",
          rol: { nombre: row.rolNombre ?? "" },
          plan: suscripcionActiva ? { nombre: suscripcionActiva.planNombre } : null,
          firma,
          suscripcionActiva,
          historialSuscripciones: historial,
          lawyerVerification: row.lawyerProfileId ? {
            profileId: row.lawyerProfileId,
            licenseNumber: row.licenseNumber ?? null,
            status: row.lawyerVerificationStatus ?? "pendiente",
            reviewedAt: row.lawyerReviewedAt instanceof Date ? row.lawyerReviewedAt.toISOString() : null,
            reviewedBy: row.lawyerReviewedBy ?? null,
            reviewNotes: row.lawyerReviewNotes ?? null
          } : null
        };
      }
      async listLawyerVerifications(status = "pendiente") {
        const rows = await this.db.select({
          profileId: lawyerProfiles.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          licenseNumber: lawyerProfiles.licenseNumber,
          specialization: lawyerProfiles.specialization,
          createdAt: lawyerProfiles.createdAt,
          status: lawyerProfiles.professionalVerificationStatus,
          emailVerified: users.emailVerified
        }).from(lawyerProfiles).innerJoin(users, eq55(users.id, lawyerProfiles.userId)).where(eq55(lawyerProfiles.professionalVerificationStatus, status)).orderBy(desc23(lawyerProfiles.createdAt));
        return rows.map((row) => ({
          ...row,
          createdAt: row.createdAt?.toISOString() ?? "",
          status: row.status ?? "pendiente",
          emailVerified: row.emailVerified ?? false
        }));
      }
      async updateLawyerVerification(lawyerProfileId, payload) {
        await this.db.update(lawyerProfiles).set({
          professionalVerificationStatus: payload.status,
          professionalReviewedAt: /* @__PURE__ */ new Date(),
          professionalReviewedBy: payload.reviewedBy,
          professionalReviewNotes: payload.reviewNotes ?? null,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq55(lawyerProfiles.id, lawyerProfileId));
      }
      async updateEstado(id, isActive) {
        await this.db.update(users).set({ isActive, updatedAt: /* @__PURE__ */ new Date() }).where(eq55(users.id, id));
      }
      async updatePlan(id, planId) {
        await this.db.update(suscripciones).set({ planId }).where(
          and39(
            eq55(suscripciones.userId, id),
            eq55(suscripciones.estado, "activa")
          )
        );
      }
    };
  }
});

// server/storage/storeage/database-storage.ts
import mysql2 from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
var DatabaseStorage, storage;
var init_database_storage = __esm({
  "server/storage/storeage/database-storage.ts"() {
    "use strict";
    init_firm_dashboard_storage();
    init_schema();
    init_actualizacion_storage();
    init_estadoProceso_storage();
    init_firma_storage();
    init_permisos_storage();
    init_plan_storage();
    init_rol_storage();
    init_tipoProceso_storage();
    init_user_storage();
    init_cliente_storage();
    init_proceso_storage();
    init_documento_storage();
    init_notificacion_storage();
    init_abogado_storage();
    init_lawyer_clients_storage();
    init_tipos_documento_storage();
    init_departamento_storage();
    init_municipio_storage();
    init_lawyer_firma_history_storage();
    init_firm_invitation_storage();
    init_chat_storage();
    init_session_storage();
    init_user_device_storage();
    init_user_two_factor_storage();
    init_auth_challenge_storage();
    init_tarea_storage();
    init_persona_storage();
    init_representante_legal_storage();
    init_community_storage();
    init_rating_storage();
    init_client_request_storage();
    init_app_notification_storage();
    init_firm_clients_storage();
    init_otp_storage();
    init_security_events_storage();
    init_matching_storage();
    init_recommendation_storage();
    init_legal_stage_storage();
    init_calendar_storage();
    init_stage_task_template_storage();
    init_stage_event_storage();
    init_proceso_etapa_historial_storage();
    init_tarea_extension_storage();
    init_proceso_ownership_storage();
    init_proceso_sharing_storage();
    init_cliente_ownership_storage();
    init_firm_settings_storage();
    init_feature_storage();
    init_suscripcion_storage();
    init_pago_storage();
    init_usage_tracking_storage();
    init_admin_profile_storage();
    init_admin_stats_storage();
    init_admin_audit_storage();
    init_admin_users_storage();
    DatabaseStorage = class {
      constructor(databaseUrl) {
        const dbUrl = databaseUrl || process.env.DATABASE_URL;
        if (!dbUrl) throw new Error("DATABASE_URL is not set");
        const connection2 = mysql2.createPool({ uri: dbUrl });
        this.db = drizzle(connection2, {
          schema: schema_exports,
          mode: "default"
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
        this.userDevices = new UserDeviceStorage(this.db);
        this.userTwoFactor = new UserTwoFactorStorage(this.db);
        this.authChallenges = new AuthChallengeStorage(this.db);
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
        this.stageTemplates = new StageTaskTemplateStorage(this.db);
        this.stageEvents = new StageEventStorage(this.db);
        this.procesoEtapaHistorial = new ProcesoEtapaHistorialStorage(this.db);
        this.tareaExtensions = new TareaExtensionStorage(this.db);
        this.procesoOwnership = new ProcesoOwnershipStorage(this.db);
        this.procesoSharing = new ProcesoSharingStorage(this.db);
        this.clienteOwnership = new ClienteOwnershipStorage(this.db);
        this.firmSettings = new FirmSettingsStorage(this.db);
        this.featureStorage = new FeatureStorage(this.db);
        this.suscripciones = new SuscripcionStorage(this.db);
        this.pagosStorage = new PagoStorage(this.db);
        this.usageTracking = new UsageTrackingStorage(this.db);
        this.adminProfiles = new AdminProfileStorage(this.db);
        this.adminStats = new AdminStatsStorage(this.db);
        this.adminAudit = new AdminAuditStorage(this.db);
        this.adminUsers = new AdminUsersStorage(this.db);
        setInterval(() => this.sessions.deleteExpired(), 60 * 60 * 1e3);
        setInterval(() => this.otps.deleteExpired(), 60 * 60 * 1e3);
        setInterval(() => this.authChallenges.deleteExpired(), 60 * 60 * 1e3);
      }
      // Backwards-compatibility facade used by older routes while the storage
      // layer is progressively split into specialized modules.
      async getProcesosByIds(ids, filter, limit, offset) {
        return this.procesos.getProcesosByIds(ids, filter, limit, offset);
      }
      async removeAbogadoFromProcesos(lawyerId, procesoIds) {
        return this.procesos.removeAbogadoFromProcesos(lawyerId, procesoIds);
      }
      async desactivarResponsable(lawyerId, procesoIds) {
        return this.procesos.desactivarResponsable(lawyerId, procesoIds);
      }
      async getProcesoIdsByAbogadoAssignment(lawyerId) {
        return this.procesos.getProcesoIdsByAbogadoAssignment(lawyerId);
      }
      async getAbogadoByIdUser(userId2) {
        return this.abogados.getLawyerByUserId(userId2);
      }
      async getAbogadoUpdate(id, update) {
        return this.abogados.updateLawyer(id, update);
      }
      async getAbogadoByCorreo(correo) {
        const user = await this.users.getUserByEmail(correo);
        if (!user) return void 0;
        const lawyer = await this.abogados.getLawyerByUserId(user.id);
        if (!lawyer) return void 0;
        return {
          id: user.id,
          nombre: `${lawyer.firstName} ${lawyer.lastName}`,
          correo: user.email,
          despacho: "",
          telefono: lawyer.phone || "",
          rolId: 1,
          activo: user.isActive,
          fechaRegistro: lawyer.createdAt,
          state: true
        };
      }
      async createAbogado(data) {
        const lawyer = await this.abogados.createLawyer({
          id: data.id,
          userId: data.id,
          firstName: data.nombre?.split(" ")[0] || "",
          lastName: data.nombre?.split(" ").slice(1).join(" ") || "",
          licenseNumber: data.licenseNumber || "",
          isIndependent: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
        return lawyer;
      }
      async getLawyerProfileById(id) {
        return this.abogados.getLawyer(id);
      }
      async getAllLawyers(limit, offset, filter) {
        return this.abogados.getAllLawyers(limit, offset, filter);
      }
      async getLisRol() {
        return this.roles.getRoles();
      }
      async getRol(id) {
        return this.roles.getRol(id);
      }
      async getRolByNombre(nombre) {
        return this.roles.getRolByNombre(nombre);
      }
      async createRol(data) {
        return this.roles.createRol(data);
      }
      async deleteRol(id) {
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
      async getCliente(id) {
        return this.clientes.getCliente(id);
      }
      async getClientesCount(abogadoId) {
        return this.clientes.getClientesCount(abogadoId);
      }
      async getClienteByDocument(documento) {
        return this.clientes.getClienteByDocument(documento);
      }
      async createCliente(data) {
        return this.clientes.createCliente(data);
      }
      async getPlan(id) {
        return this.planes.getPlan(id);
      }
      async createPlan(data) {
        return this.planes.createPlan(data);
      }
      // User methods (delegate to users storage)
      async getUserByEmail(email) {
        return this.users.getUserByEmail(email);
      }
      async getUserById(id) {
        return this.users.getUserById(id);
      }
      async createUser(user) {
        return this.users.createUser(user);
      }
      async getEstadosProceso() {
        return this.estadosProceso.getEstadosProceso();
      }
      async getProceso(id) {
        return this.procesos.getProceso(id);
      }
      async setCommunityPostId(procesoId, communityPostId) {
        return this.procesos.setCommunityPostId(procesoId, communityPostId);
      }
      async getProcesoByFirmaIdAndProcesoId(firmaId, procesoId) {
        return this.procesos.getProcesoByFirmaIdAndProcesoId(firmaId, procesoId);
      }
      async getProcesosByClienteId(clienteId, limit, offset, filter) {
        return this.procesos.getProcesosByCliente(clienteId, limit, offset, filter);
      }
      async getProcesosByClienteAndLawyer(abogadoId, clienteId, limit, offset, filter) {
        return this.procesos.getProcesosByClienteAndLawyer(abogadoId, clienteId, limit, offset, filter);
      }
      async getProcesoByAbogadoId(abogadoId, limit, offset, filter) {
        return this.procesos.getProcesos(abogadoId, limit, offset, filter);
      }
      async getProceoByAbogadoIdAndProcesoId(abogadoId, procesoId) {
        return this.procesos.getProcesoByAbogadoIdAndProcesoId(abogadoId, procesoId);
      }
      async getProcesoByClienteIdAndProcesoId(clienteId, procesoId) {
        return this.procesos.getProcesoByClienteIdAndProcesoId(clienteId, procesoId);
      }
      async getProcesCount(abogadoId, filter) {
        return this.procesos.getProcesosCount(abogadoId, filter);
      }
      async createProceso(data) {
        return this.procesos.createProceso(data);
      }
      async createDocumento(data) {
        return this.documentos.createDocumento(data);
      }
      async getDocumento(id) {
        return this.documentos.getDocumento(id);
      }
      async updateProceso(id, updates) {
        return this.procesos.updateProceso(id, updates);
      }
      async getTiposProceso() {
        return this.tiposProceso.getTiposProceso();
      }
      async deleteProceso(id) {
        return this.procesos.deleteProceso(id);
      }
      async createTipoProceso(data) {
        return this.tiposProceso.createTipoProceso(data);
      }
      async createNotificacion(data) {
        return this.notificaciones.createNotificacion(data);
      }
      async updateTipoProceso(id, updates) {
        return this.tiposProceso.updateTipoProceso(id, updates);
      }
      async deleteTipoProceso(id) {
        return this.tiposProceso.deleteTipoProceso(id);
      }
      async createActualizacion(data) {
        return this.actualizaciones.createActualizacion(data);
      }
      async getActualizaciones(procesoId, limit, offset, filter) {
        return this.actualizaciones.getActualizaciones(procesoId, limit, offset);
      }
      async getActualizacion(id) {
        return this.actualizaciones.getActualizacion(id);
      }
      async deleteActualizacion(id) {
        return this.actualizaciones.deleteActualizacion(id);
      }
      async getDocumentos(idProceso, stage) {
        return this.documentos.getDocumentos(idProceso, stage);
      }
      async deleteDocumento(id) {
        return this.documentos.deleteDocumento(id);
      }
      async getPermisosByRol(idRol) {
        return this.permisos.getPermisosByRol(idRol);
      }
      async createEstado(data) {
        return this.estadosProceso.createEstado?.(data);
      }
      async getNotificacionesByClienteId(clienteId) {
        return this.notificaciones.getNotificacionesByClienteId(clienteId);
      }
      async getNotificacionesCountByClienteId(clienteId) {
        return this.notificaciones.countNoLeidasByClienteId(clienteId);
      }
      async markNotificacionLeidaCliente(id, clienteId) {
        return this.notificaciones.marcarComoLeidaByClienteId(id, clienteId);
      }
      async markTodasLeidasCliente(clienteId) {
        return this.notificaciones.marcarTodasComoLeidasByClienteId(clienteId);
      }
      async getNotificacionesByAbogadoId(abogadoId) {
        return this.notificaciones.getNotificacionesByLawyerId(abogadoId);
      }
      async getNotificacionesCountByAbogadoId(abogadoId) {
        return this.notificaciones.countNoLeidasByLawyerId(abogadoId);
      }
      async markNotificacionLeidaAbogado(id, lawyerId) {
        return this.notificaciones.marcarComoLeidaByLawyerId(id, lawyerId);
      }
      async markTodasLeidasAbogado(abogadoId) {
        return this.notificaciones.marcarTodasComoLeidasByLawyerId(abogadoId);
      }
      async getNotificacionesByFirmaId(firmaId) {
        return this.notificaciones.getNotificacionesByFirmId(firmaId);
      }
      async getNotificacionesCountByFirmaId(firmaId) {
        return this.notificaciones.countNoLeidasByFirmId(firmaId);
      }
      async markNotificacionLeidaFirma(id, firmaId) {
        return this.notificaciones.marcarComoLeidaByFirmaId(id, firmaId);
      }
      async markTodasLeidasFirma(firmaId) {
        return this.notificaciones.marcarTodasComoLeidasByFirmId(firmaId);
      }
      async getFirmProfileByUserId(userId2) {
        return this.firmProfiles.getFirmProfileByUserId(userId2);
      }
      async updateFirmProfile(id, updates) {
        return this.firmProfiles.updateFirmProfile(id, updates);
      }
      async getAdminProfileByUserId(userId2) {
        return this.adminProfiles.getAdminProfileByUserId(userId2);
      }
      async createAdminProfile(data) {
        return this.adminProfiles.createAdminProfile(data);
      }
      async addLawyerToProceso(procesoId, lawyerId, options = {}) {
        return this.procesos.addLawyerToProceso(procesoId, lawyerId, options);
      }
      async getProcesoLawyers(procesoId) {
        return this.procesos.getProcesoLawyers(procesoId);
      }
      async removeLawyerFromProceso(procesoId, lawyerId) {
        return this.procesos.removeLawyerFromProceso(procesoId, lawyerId);
      }
      async getProcesosByClienteAndFirma(clienteId, firmaId, limit, offset, filter) {
        return this.procesos.getProcesosByClienteAndFirma(clienteId, firmaId, limit, offset, filter);
      }
      async getProcesosByFirma(idProfile, limit, offset, filter) {
        return this.procesos.getProcesosByFirma(idProfile, limit, offset, filter);
      }
      async setResponsable(procesoId, responsableId, options) {
        return this.procesos.setResponsable(procesoId, responsableId, options);
      }
      // Create lawyer with user (SaaS model)
      async createLawyerWithUser(userData, lawyerData, personaData) {
        return await this.db.transaction(async (tx) => {
          const user = await this.users.createUser(userData, tx);
          const persona = await this.personas.createPersona(personaData, tx);
          const lawyer = await this.abogados.createLawyer({
            ...lawyerData,
            userId: user.id,
            personaId: persona.id
          });
          return lawyer;
        });
      }
      // Create firm with user (SaaS model)
      async createFirmWithUser(userData, firmData, repData) {
        return await this.db.transaction(async (tx) => {
          const user = await this.users.createUser(userData, tx);
          let representanteLegalId = null;
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
            representanteLegalId
          });
          return firm;
        });
      }
      async getUserProfile(userId2, rolNombre) {
        switch (rolNombre) {
          case "admin":
          case "admin_super":
          case "admin_soporte":
          case "admin_finanzas":
            return this.adminProfiles.getAdminProfileByUserId(userId2);
          case "abogado": {
            const bare = await this.abogados.getLawyerByUserId(userId2);
            if (!bare) return null;
            return this.abogados.getLawyer(bare.id);
          }
          case "cliente":
            return this.clientes.getClienteByUser(userId2);
          case "bufete": {
            const firm = await this.firmProfiles.getFirmProfileByUserId(userId2);
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
    };
    storage = new DatabaseStorage();
  }
});

// server/auth.ts
var auth_exports = {};
__export(auth_exports, {
  AUTH_COOKIE_NAME: () => AUTH_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME: () => AUTH_REFRESH_COOKIE_NAME,
  REFRESH_MAX_AGE: () => REFRESH_MAX_AGE,
  authenticate: () => authenticate,
  authenticateOptional: () => authenticateOptional,
  createAuthResponse: () => createAuthResponse,
  decodeToken: () => decodeToken,
  extractToken: () => extractToken,
  generateRefreshToken: () => generateRefreshToken,
  generateToken: () => generateToken,
  getClearCookieOptions: () => getClearCookieOptions,
  getCookieOptions: () => getCookieOptions,
  getRefreshCookieOptions: () => getRefreshCookieOptions,
  hashPassword: () => hashPassword,
  requirePermission: () => requirePermission,
  requireRole: () => requireRole,
  verifyPassword: () => verifyPassword,
  verifyToken: () => verifyToken
});
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID as randomUUID29 } from "crypto";
function getCookieOptions(isProduction2) {
  return {
    httpOnly: true,
    secure: isProduction2,
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/"
  };
}
function getClearCookieOptions(isProduction2) {
  return {
    httpOnly: true,
    secure: isProduction2,
    sameSite: "strict",
    path: "/"
  };
}
function getRefreshCookieOptions(isProduction2) {
  return {
    httpOnly: true,
    secure: isProduction2,
    sameSite: "strict",
    maxAge: REFRESH_MAX_AGE,
    path: "/"
  };
}
function generateRefreshToken() {
  return randomUUID29().replace(/-/g, "") + randomUUID29().replace(/-/g, "");
}
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
function generateToken(payload) {
  const jti = randomUUID29();
  const token = jwt.sign({ ...payload, jti }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, jti };
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  if (req.body?.token) {
    return req.body.token;
  }
  return req.cookies?.[COOKIE_NAME] ?? null;
}
async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Token inv\xE1lido o expirado" });
  }
  const sessionValid = await storage.sessions.isValid(payload.jti);
  if (!sessionValid) {
    return res.status(401).json({ error: "Sesi\xF3n inv\xE1lida o cerrada" });
  }
  req.user = payload;
  next();
}
async function authenticateOptional(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const sessionValid = await storage.sessions.isValid(payload.jti);
      if (sessionValid) req.user = payload;
    }
  }
  next();
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        error: "No tiene permisos para este recurso",
        required: allowedRoles
      });
    }
    next();
  };
}
function requirePermission(...requiredPermissions) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    try {
      const rolId = req.user.firmRolId ?? req.user.rol.id;
      const userPermissions = await storage.getPermisosByRol(rolId);
      const hasAllPermissions = requiredPermissions.every(
        (p) => userPermissions.includes(p)
      );
      if (!hasAllPermissions) {
        return res.status(403).json({
          error: "Permisos insuficientes",
          required: requiredPermissions
        });
      }
      req.permissions = userPermissions;
      next();
    } catch (err) {
      next(err);
    }
  };
}
function createAuthResponse(user, rol, res, profile, firmRolId) {
  const payloadBase = {
    id: user.id,
    email: user.email,
    rol,
    idProfile: profile?.id,
    UserName: user.name,
    ...firmRolId != null && { firmRolId }
  };
  const { token, jti } = generateToken(payloadBase);
  const payload = { ...payloadBase, jti };
  if (res) {
    const isProduction2 = process.env.NODE_ENV === "production";
    res.cookie(COOKIE_NAME, token, getCookieOptions(isProduction2));
  }
  return { token, jti, user: payload, profile };
}
var JWT_SECRET, JWT_EXPIRES_IN, COOKIE_NAME, AUTH_COOKIE_NAME, COOKIE_MAX_AGE, REFRESH_COOKIE_NAME, AUTH_REFRESH_COOKIE_NAME, REFRESH_MAX_AGE, SALT_ROUNDS;
var init_auth = __esm({
  "server/auth.ts"() {
    "use strict";
    init_database_storage();
    JWT_SECRET = (() => {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error("JWT_SECRET environment variable must be set");
      }
      return secret;
    })();
    JWT_EXPIRES_IN = "15m";
    COOKIE_NAME = "procesoclaro_token";
    AUTH_COOKIE_NAME = COOKIE_NAME;
    COOKIE_MAX_AGE = 15 * 60 * 1e3;
    REFRESH_COOKIE_NAME = "procesoclaro_refresh";
    AUTH_REFRESH_COOKIE_NAME = REFRESH_COOKIE_NAME;
    REFRESH_MAX_AGE = 14 * 24 * 60 * 60 * 1e3;
    SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? "12", 10);
  }
});

// server/services/s3-storage.ts
var s3_storage_exports = {};
__export(s3_storage_exports, {
  deleteDocumentFromS3: () => deleteDocumentFromS3,
  generateS3Key: () => generateS3Key,
  getBucketName: () => getBucketName,
  getPresignedDownloadUrl: () => getPresignedDownloadUrl,
  getS3Client: () => getS3Client,
  uploadBuffer: () => uploadBuffer,
  uploadDocumentToS3: () => uploadDocumentToS3,
  uploadFileToS3: () => uploadFileToS3
});
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID as randomUUID33 } from "crypto";
import fs from "fs";
import path from "path";
function validateFileSize(buffer) {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
}
function generateS3Key(clienteId, procesoId, filename) {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueFilename = `${randomUUID33()}-${sanitizedFilename}`;
  return `${clienteId}/${procesoId}/${uniqueFilename}`;
}
async function uploadDocumentToS3(buffer, clienteId, procesoId, filename, contentType) {
  validateFileSize(buffer);
  const key = generateS3Key(clienteId, procesoId, filename);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ServerSideEncryption: "AES256"
    // Force encryption
  });
  await s3Client.send(command);
  return key;
}
async function uploadFileToS3(localFilePath, bufeteId, clienteId, procesoId) {
  const buffer = fs.readFileSync(localFilePath);
  const filename = path.basename(localFilePath);
  const contentType = getContentType(filename);
  return uploadDocumentToS3(
    buffer,
    clienteId,
    procesoId,
    filename,
    contentType
  );
}
async function deleteDocumentFromS3(key) {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key
  });
  await s3Client.send(command);
}
async function uploadBuffer(key, buffer, contentType) {
  validateFileSize(buffer);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ServerSideEncryption: "AES256"
  });
  await s3Client.send(command);
}
async function getPresignedDownloadUrl(key, filename, expiresIn = DEFAULT_EXPIRATION) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}
function getS3Client() {
  return s3Client;
}
function getBucketName() {
  return bucketName;
}
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".txt": "text/plain"
  };
  if (!contentTypes[ext]) {
    throw new Error("File type not allowed");
  }
  return contentTypes[ext];
}
var awsRegion, awsBucketName, s3Config, bucketName, MAX_FILE_SIZE, s3Client, DEFAULT_EXPIRATION;
var init_s3_storage = __esm({
  "server/services/s3-storage.ts"() {
    "use strict";
    awsRegion = process.env.AWS_REGION;
    awsBucketName = process.env.AWS_BUCKET_NAME;
    if (!awsRegion) {
      throw new Error("AWS_REGION is not defined in environment variables");
    }
    if (!awsBucketName) {
      throw new Error("AWS_BUCKET_NAME is not defined in environment variables");
    }
    s3Config = {
      region: awsRegion
    };
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      s3Config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
    } else if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_SECRET_ACCESS_KEY) {
      console.log("Using IAM role for AWS credentials (production)");
    }
    bucketName = awsBucketName;
    MAX_FILE_SIZE = 15 * 1024 * 1024;
    s3Client = new S3Client(s3Config);
    DEFAULT_EXPIRATION = 300;
  }
});

// server/index.ts
import "dotenv/config";

// server/lib/env.ts
import { z } from "zod";
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().optional(),
  BCRYPT_SALT_ROUNDS: z.string().default("12"),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  APP_URL: z.string().url().optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  RUN_STARTUP_SEEDS: z.enum(["true", "false"]).optional(),
  RECAPTCHA_SECRET_KEY: z.string().optional(),
  NODEMAILER_HOST: z.string().optional(),
  NODEMAILER_USER: z.string().optional(),
  NODEMAILER_PASS: z.string().optional()
});
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("\u274C Invalid environment variables:");
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}
var env = parsed.data;

// server/index.ts
import express from "express";
import multer4 from "multer";
import cookieParser2 from "cookie-parser";
import helmet from "helmet";

// server/routes.ts
import { createServer } from "http";
import cookieParser from "cookie-parser";

// server/services/login-security.service.ts
import { randomUUID as randomUUID28 } from "crypto";

// server/lib/redis.ts
import Redis from "ioredis";
var InMemoryRedis = class {
  constructor() {
    this.store = /* @__PURE__ */ new Map();
  }
  expired(key) {
    const entry = this.store.get(key);
    if (!entry) return true;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return true;
    }
    return false;
  }
  async get(key) {
    if (this.expired(key)) return null;
    return this.store.get(key)?.value ?? null;
  }
  async set(key, value, ...args) {
    let expiresAt = 0;
    const str2 = String(value);
    for (let i = 0; i < args.length - 1; i++) {
      if (String(args[i]).toUpperCase() === "EX") expiresAt = Date.now() + Number(args[i + 1]) * 1e3;
      if (String(args[i]).toUpperCase() === "PX") expiresAt = Date.now() + Number(args[i + 1]);
    }
    this.store.set(key, { value: str2, expiresAt });
    return "OK";
  }
  async incr(key) {
    if (this.expired(key)) {
      this.store.set(key, { value: "1", expiresAt: 0 });
      return 1;
    }
    const current = parseInt(this.store.get(key).value, 10);
    const next = current + 1;
    this.store.get(key).value = String(next);
    return next;
  }
  async expire(key, seconds) {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1e3;
    return 1;
  }
  async ttl(key) {
    if (this.expired(key)) return -2;
    const entry = this.store.get(key);
    if (!entry || entry.expiresAt === 0) return -1;
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1e3));
  }
  async del(...keys) {
    let count4 = 0;
    for (const key of keys) {
      if (this.store.has(key)) {
        this.store.delete(key);
        count4++;
      }
    }
    return count4;
  }
  async sadd(key, ...members) {
    const entry = this.store.get(key);
    const set = entry ? new Set(JSON.parse(entry.value)) : /* @__PURE__ */ new Set();
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) {
        set.add(m);
        added++;
      }
    }
    this.store.set(key, { value: JSON.stringify([...set]), expiresAt: entry?.expiresAt ?? 0 });
    return added;
  }
  async scard(key) {
    if (this.expired(key)) return 0;
    const entry = this.store.get(key);
    if (!entry) return 0;
    return JSON.parse(entry.value).length;
  }
};
var _client = new InMemoryRedis();
var url = process.env.REDIS_URL;
var isProduction = process.env.NODE_ENV === "production";
if (!url && isProduction) {
  console.error("[redis] REDIS_URL is required in production. Set the REDIS_URL environment variable.");
  process.exit(1);
}
if (url) {
  const candidate = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: () => null
    // sin reintentos automáticos
  });
  candidate.on("error", () => {
  });
  candidate.connect().then(() => {
    _client = candidate;
    console.log("[redis] Connected");
  }).catch(() => {
    if (isProduction) {
      console.error("[redis] Failed to connect in production. Exiting.");
      process.exit(1);
    }
    console.warn("[redis] No disponible \u2014 usando in-memory fallback (single instance only)");
    candidate.disconnect();
  });
}
function getClient() {
  return _client;
}
var redis = {
  get: (key) => getClient().get(key),
  set: (key, value, ...args) => getClient().set(key, value, ...args),
  incr: (key) => getClient().incr(key),
  expire: (key, seconds) => getClient().expire(key, seconds),
  ttl: (key) => getClient().ttl(key),
  del: (...keys) => getClient().del(...keys),
  sadd: (key, ...members) => getClient().sadd(key, ...members),
  scard: (key) => getClient().scard(key)
};

// server/services/login-security.service.ts
init_database_storage();
var COMBO_LEVELS = [
  { threshold: 5, blockSec: 15 * 60 },
  // 15 min
  { threshold: 10, blockSec: 60 * 60 },
  // 1 h
  { threshold: 20, blockSec: 24 * 60 * 60 }
  // 24 h
];
var USER_LEVELS = [
  { threshold: 10, blockSec: 60 * 60 },
  // 1 h
  { threshold: 20, blockSec: 24 * 60 * 60 }
  // 24 h
];
var COUNTER_TTL = 15 * 60;
var SUSPICIOUS_EMAIL_THRESHOLD = 10;
var SUSPICIOUS_IP_TTL = 60 * 60;
var k = {
  comboBan: (ip, email) => `login:ban:combo:${ip}:${email}`,
  comboFail: (ip, email) => `login:fail:combo:${ip}:${email}`,
  userBan: (email) => `login:ban:user:${email}`,
  userFail: (email) => `login:fail:user:${email}`,
  ipEmails: (ip) => `login:ip:emails:${ip}`
};
function resolveBlock(count4, levels) {
  let blockSec = 0;
  for (const lvl of levels) {
    if (count4 >= lvl.threshold) blockSec = lvl.blockSec;
  }
  return blockSec;
}
async function checkLoginAllowed(ip, email) {
  const comboBan = await redis.get(k.comboBan(ip, email));
  if (comboBan) {
    const ttl = await redis.ttl(k.comboBan(ip, email));
    return { blocked: true, retryAfterSec: ttl > 0 ? ttl : 60, reason: "combo" };
  }
  const userBan = await redis.get(k.userBan(email));
  if (userBan) {
    const ttl = await redis.ttl(k.userBan(email));
    return { blocked: true, retryAfterSec: ttl > 0 ? ttl : 60, reason: "user" };
  }
  const ipEmailCount = await redis.scard(k.ipEmails(ip));
  if (ipEmailCount >= SUSPICIOUS_EMAIL_THRESHOLD) {
    return { blocked: true, retryAfterSec: SUSPICIOUS_IP_TTL, reason: "suspicious_ip" };
  }
  return { blocked: false };
}
async function recordFailure(ip, email) {
  await redis.sadd(k.ipEmails(ip), email);
  await redis.expire(k.ipEmails(ip), SUSPICIOUS_IP_TTL);
  const comboCount = await redis.incr(k.comboFail(ip, email));
  if (comboCount === 1) await redis.expire(k.comboFail(ip, email), COUNTER_TTL);
  const userCount = await redis.incr(k.userFail(email));
  if (userCount === 1) await redis.expire(k.userFail(email), COUNTER_TTL);
  const comboBlock = resolveBlock(comboCount, COMBO_LEVELS);
  if (comboBlock > 0) {
    const existingTTL = await redis.ttl(k.comboBan(ip, email));
    if (existingTTL < comboBlock) {
      await redis.set(k.comboBan(ip, email), "1", "EX", comboBlock);
    }
  }
  const userBlock = resolveBlock(userCount, USER_LEVELS);
  if (userBlock > 0) {
    const existingTTL = await redis.ttl(k.userBan(email));
    if (existingTTL < userBlock) {
      await redis.set(k.userBan(email), "1", "EX", userBlock);
    }
    return userBlock;
  }
  return comboBlock;
}
async function recordSuccess(ip, email) {
  await redis.del(k.comboFail(ip, email), k.comboBan(ip, email));
}
async function auditLog(params) {
  try {
    await storage.securityEvents.create({
      id: randomUUID28(),
      email: params.email,
      ip: params.ip,
      userAgent: params.userAgent ?? null,
      eventType: params.eventType,
      success: params.success,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null
    });
  } catch (err) {
    console.error("[security-audit] Failed to write event:", err);
  }
}
var RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;
var RECAPTCHA_VERIFY = "https://www.google.com/recaptcha/api/siteverify";
var RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE ?? "0.5");
async function validateRecaptcha(token) {
  if (!RECAPTCHA_SECRET) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({
      secret: RECAPTCHA_SECRET,
      response: token
    });
    const res = await fetch(RECAPTCHA_VERIFY, { method: "POST", body });
    const data = await res.json();
    if (!data.success) {
      console.warn("[recaptcha] Validation failed:", data["error-codes"]);
      return false;
    }
    if (data.score < RECAPTCHA_MIN_SCORE) {
      console.warn("[recaptcha] Score too low:", data.score);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[recaptcha] Error:", err);
    return true;
  }
}

// server/middleware/rate-limit.ts
async function checkLoginBlocked(req, res, next) {
  try {
    const email = (req.body?.correo ?? req.body?.email ?? "").toString().toLowerCase().trim();
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    if (!email) {
      next();
      return;
    }
    const result = await checkLoginAllowed(ip, email);
    if (result.blocked) {
      res.setHeader("Retry-After", String(result.retryAfterSec));
      res.status(429).json({
        error: "Demasiados intentos fallidos. Intenta de nuevo m\xE1s tarde.",
        retryAfter: result.retryAfterSec,
        blockedBy: result.reason
      });
      return;
    }
    next();
  } catch (err) {
    console.error("[rate-limit] checkLoginBlocked error:", err);
    next();
  }
}
var loginRateLimiter = checkLoginBlocked;
var store = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of store) {
    if (now > rec.resetAt) store.delete(key);
  }
}, 10 * 60 * 1e3);
function rateLimit(options = {}) {
  const windowMs = options.windowMs ?? 6e4;
  const maxReqs = options.maxRequests ?? 100;
  const message = options.message ?? "Demasiadas solicitudes. Intenta de nuevo m\xE1s tarde.";
  return (req, res, next) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const rec = store.get(key);
    if (!rec || now > rec.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (rec.count >= maxReqs) {
      const retryAfter = Math.ceil((rec.resetAt - now) / 1e3);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: message, retryAfter });
      return;
    }
    rec.count++;
    next();
  };
}
var apiRateLimiter = rateLimit({
  windowMs: 6e4,
  maxRequests: 100
});
var registerRateLimiter = rateLimit({
  windowMs: 15 * 6e4,
  maxRequests: 3,
  message: "Demasiadas solicitudes de registro. Intenta de nuevo en 15 minutos."
});

// server/routes/health.ts
import { Router } from "express";

// server/db.ts
init_schema();
import { drizzle as drizzle2 } from "drizzle-orm/mysql2";
import mysql from "mysql2";
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
var connection = mysql.createPool({
  uri: process.env.DATABASE_URL
});
var db = drizzle2(connection, {
  schema: schema_exports,
  mode: "default"
});

// server/routes/health.ts
import { sql as sql22 } from "drizzle-orm";
var router = Router();
router.get("/health", async (_req, res) => {
  const checks = {};
  try {
    await db.execute(sql22`SELECT 1`);
    checks.db = "ok";
  } catch {
    checks.db = "error";
  }
  try {
    await redis.set("health:ping", "1", "EX", 5);
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }
  const allOk = Object.values(checks).every((v) => v === "ok");
  const status = allOk ? 200 : 503;
  res.status(status).json({
    status: allOk ? "ok" : "degraded",
    checks,
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var health_default = router;

// server/routes/auth.ts
init_database_storage();
init_auth();
import { Router as Router2 } from "express";
import { randomUUID as randomUUID30 } from "crypto";
import { z as z3 } from "zod";

// server/middleware/validation.ts
import { z as z2 } from "zod";
var emailSchema = z2.string().email("Correo electr\xF3nico inv\xE1lido");
var passwordSchema = z2.string().min(6, "La contrase\xF1a debe tener al menos 6 caracteres");
var uuidSchema = z2.string().uuid("ID inv\xE1lido");
var paginationSchema = z2.object({
  limit: z2.coerce.number().int().positive().max(100).default(50),
  offset: z2.coerce.number().int().min(0).default(0)
});
var abogadoLoginSchema = z2.object({
  correo: emailSchema,
  password: z2.string().min(1, "La contrase\xF1a es requerida")
});
var clienteLoginSchema = z2.object({
  documento: z2.string().min(1, "El documento es requerido"),
  password: z2.string().min(1, "La contrase\xF1a es requerida")
});
var abogadoRegisterSchema = z2.object({
  nombre: z2.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  correo: emailSchema,
  password: passwordSchema,
  despacho: z2.string().min(2, "El despacho es requerido"),
  telefono: z2.string().optional()
});
var clienteRegisterSchema = z2.object({
  nombre: z2.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  correo: emailSchema.optional(),
  documento: z2.string().min(5, "El documento debe tener al menos 5 caracteres"),
  password: passwordSchema,
  telefono: z2.string().optional(),
  abogadoId: uuidSchema
});
var updateClienteSchema = z2.object({
  nombre: z2.string().min(2).optional(),
  correo: emailSchema.optional(),
  telefono: z2.string().optional(),
  password: passwordSchema.optional(),
  activo: z2.boolean().optional()
});
var createProcesoSchema = z2.object({
  tipoProcesoId: z2.number().int().positive().optional(),
  radicado: z2.string().min(3, "El radicado debe tener al menos 3 caracteres"),
  juzgado: z2.string().min(2, "El juzgado es requerido"),
  estadoId: z2.number().int().positive("Estado requerido"),
  descripcion: z2.string().optional(),
  clienteId: uuidSchema
});
var updateProcesoSchema = z2.object({
  tipoProcesoId: z2.number().int().positive().optional(),
  radicado: z2.string().min(3).optional(),
  juzgado: z2.string().min(2).optional(),
  estadoId: z2.number().int().positive().optional(),
  descripcion: z2.string().optional()
});
var procesoFilterSchema = z2.object({
  estadoCodigo: z2.string().optional(),
  search: z2.string().optional(),
  limit: z2.coerce.number().int().positive().max(100).default(50),
  offset: z2.coerce.number().int().min(0).default(0)
});
function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const data = req[source];
      schema.parse(data);
      next();
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message
        }));
        res.status(400).json({
          error: "Validation failed",
          details: errors
        });
        return;
      }
      next(error);
    }
  };
}
var validateAbogadoLogin = validate(abogadoLoginSchema);
var validateClienteLogin = validate(clienteLoginSchema);
var validateAbogadoRegister = validate(abogadoRegisterSchema);
var validateClienteRegister = validate(clienteRegisterSchema);
var validateUpdateCliente = validate(updateClienteSchema);
var validateCreateProceso = validate(createProcesoSchema);
var validateUpdateProceso = validate(updateProcesoSchema);
var validateProcesoFilter = validate(procesoFilterSchema, "query");
var validatePagination = validate(paginationSchema, "query");
var validateUuid = validate(uuidSchema, "params");

// server/services/subscription.service.ts
init_database_storage();
var SubscriptionService = class {
  // ── Plan activo ───────────────────────────────────────────────────────────
  async getActivePlan(userId2) {
    const suscripcion = await storage.suscripciones.getActive(userId2);
    if (!suscripcion) return null;
    const plan = await storage.planes.getPlan(suscripcion.planId);
    return plan ?? null;
  }
  // ── Verificar límite de recursos ──────────────────────────────────────────
  async checkLimit(userId2, tipo, mbExtra) {
    const plan = await this.getActivePlan(userId2);
    const usage = await storage.usageTracking.getByUserId(userId2);
    const maxProcesos = plan?.maxProcesos ?? 5;
    const maxClientes = plan?.maxClientes ?? 10;
    const maxStorage = (plan?.maxStorageGb ?? 0) * 1024;
    const actual = usage ? tipo === "procesos" ? usage.procesosUsados : tipo === "clientes" ? usage.clientesUsados : usage.storageUsadoMb : 0;
    const maximo = tipo === "procesos" ? maxProcesos : tipo === "clientes" ? maxClientes : maxStorage;
    if (maximo === -1) {
      return { permitido: true, actual, maximo: -1, porcentaje: 0 };
    }
    const efectivo = tipo === "storage" ? actual + (mbExtra ?? 0) : actual + 1;
    const permitido = maximo === 0 ? false : efectivo <= maximo;
    const porcentaje = maximo === 0 ? 100 : Math.min(100, Math.round(actual / maximo * 100));
    return { permitido, actual, maximo, porcentaje };
  }
  // ── Verificar feature ─────────────────────────────────────────────────────
  async hasFeature(userId2, featureCode) {
    const suscripcion = await storage.suscripciones.getActive(userId2);
    if (!suscripcion) return false;
    const { has } = await storage.featureStorage.hasFeature(suscripcion.planId, featureCode);
    return has;
  }
  async getFeatureValue(userId2, featureCode) {
    const suscripcion = await storage.suscripciones.getActive(userId2);
    if (!suscripcion) return null;
    const { has, value } = await storage.featureStorage.hasFeature(suscripcion.planId, featureCode);
    return has ? value : null;
  }
  // ── Actualizar uso ────────────────────────────────────────────────────────
  async incrementUsage(userId2, tipo, cantidad = 1) {
    await storage.usageTracking.increment(userId2, tipo, cantidad);
  }
  async decrementUsage(userId2, tipo, cantidad = 1) {
    await storage.usageTracking.decrement(userId2, tipo, cantidad);
  }
  // ── Activar suscripción (llamado desde webhook Wompi) ─────────────────────
  async activateSuscripcion(userId2, planId, ciclo, extraUsers, pagoId) {
    const existing = await storage.suscripciones.getActive(userId2);
    if (existing) {
      await storage.suscripciones.updateEstado(existing.id, "cancelada", /* @__PURE__ */ new Date());
    }
    const fechaInicio = /* @__PURE__ */ new Date();
    const fechaVencimiento = new Date(fechaInicio);
    if (ciclo === "mensual") {
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);
    } else {
      fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);
    }
    const nueva = await storage.suscripciones.create({
      userId: userId2,
      planId,
      ciclo,
      estado: "activa",
      fechaInicio,
      fechaVencimiento,
      autoRenovacion: true,
      extraUsers
    });
    await storage.usageTracking.initForUser(userId2, nueva.id);
  }
  // ── Activar plan gratis (al registrarse) ──────────────────────────────────
  async activatePlanGratis(userId2, tipo = "abogado") {
    const existing = await storage.suscripciones.getActive(userId2);
    if (existing) return;
    const planId = tipo === "bufete" ? "plan-bufete-gratis" : "plan-abogado-gratis";
    const fechaInicio = /* @__PURE__ */ new Date();
    const fechaVencimiento = /* @__PURE__ */ new Date("2099-12-31T23:59:59");
    const nueva = await storage.suscripciones.create({
      userId: userId2,
      planId,
      ciclo: "mensual",
      estado: "activa",
      fechaInicio,
      fechaVencimiento,
      autoRenovacion: false,
      extraUsers: 0
    });
    await storage.usageTracking.initForUser(userId2, nueva.id);
  }
};
var subscriptionService = new SubscriptionService();

// server/routes/auth.ts
init_email_service();
init_email_service();

// server/services/two-factor.service.ts
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
var APP_NAME2 = "ProcesoClaro";
var TOTP_STEP_SECONDS = 30;
var TOTP_DIGITS = 6;
var BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function bufferToBase32(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = value << 8 | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[value >>> bits - 5 & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[value << 5 - bits & 31];
  }
  return output;
}
function base32ToBuffer(value) {
  const normalized = value.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let current = 0;
  const bytes = [];
  for (const char of normalized) {
    const index7 = BASE32_ALPHABET.indexOf(char);
    if (index7 === -1) continue;
    current = current << 5 | index7;
    bits += 5;
    if (bits >= 8) {
      bytes.push(current >>> bits - 8 & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
function hotp(secret, counter) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 4294967296), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", base32ToBuffer(secret)).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binaryCode = (hmac[offset] & 127) << 24 | (hmac[offset + 1] & 255) << 16 | (hmac[offset + 2] & 255) << 8 | hmac[offset + 3] & 255;
  return String(binaryCode % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}
function generateTwoFactorSecret() {
  return bufferToBase32(randomBytes(20));
}
function generateOtpAuthUrl(email, secret) {
  const label = encodeURIComponent(`${APP_NAME2}:${email}`);
  const issuer = encodeURIComponent(APP_NAME2);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}
function verifyTotpCode(secret, code, window = 1) {
  const normalizedCode = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalizedCode)) return false;
  const currentCounter = Math.floor(Date.now() / 1e3 / TOTP_STEP_SECONDS);
  for (let offset = -window; offset <= window; offset += 1) {
    if (hotp(secret, currentCounter + offset) === normalizedCode) {
      return true;
    }
  }
  return false;
}
function normalizeRecoveryCode(code) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function hashRecoveryCode(code) {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}
function verifyRecoveryCode(code, hashes) {
  const hashed = Buffer.from(hashRecoveryCode(code), "hex");
  let matched = false;
  const remaining = hashes.filter((item) => {
    const current = Buffer.from(item, "hex");
    const equal = current.length === hashed.length && timingSafeEqual(current, hashed);
    if (equal) matched = true;
    return !equal;
  });
  return { valid: matched, remaining };
}
function generateRecoveryCodes(count4 = 8) {
  return Array.from({ length: count4 }, () => {
    const raw = randomBytes(4).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  });
}
function hashRecoveryCodes(codes) {
  return codes.map(hashRecoveryCode);
}

// server/routes/auth.ts
init_user_schema();
var lawyerRegisterSchema = z3.object({
  email: z3.string().email("Correo electr\xF3nico inv\xE1lido"),
  password: z3.string().min(8, "La contrase\xF1a debe tener al menos 8 caracteres"),
  firstName: z3.string().min(1, "El nombre es requerido"),
  lastName: z3.string().min(1, "El apellido es requerido"),
  phone: z3.string().min(1, "El tel\xE9fono es requerido"),
  documento: z3.string().min(1, "El documento de identidad es requerido"),
  tipoDocumentoId: z3.number().int().positive("El tipo de documento es requerido"),
  direccion: z3.string().optional(),
  departamentoId: z3.string().optional(),
  municipioId: z3.string().optional(),
  licenseNumber: z3.string().min(1, "El n\xFAmero de licencia es requerido"),
  specialty: z3.string().optional(),
  isIndependent: z3.boolean().default(true),
  firmId: z3.string().uuid().optional()
});
var firmRegisterSchema = z3.object({
  email: z3.string().email("Correo electr\xF3nico inv\xE1lido"),
  password: z3.string().min(8, "La contrase\xF1a debe tener al menos 8 caracteres"),
  name: z3.string().min(1, "El nombre de la firma es requerido"),
  nit: z3.string().min(1, "El NIT es requerido"),
  address: z3.string().optional(),
  phone: z3.string().optional(),
  // representante legal (opcional)
  repNombre: z3.string().optional(),
  repApellido: z3.string().optional(),
  repDocumento: z3.string().optional(),
  repTipoDocumentoId: z3.number().int().positive().optional(),
  repCargo: z3.string().optional(),
  repEmail: z3.string().email().optional().or(z3.literal("")),
  repTelefono: z3.string().optional(),
  repDireccion: z3.string().optional(),
  repDepartamentoId: z3.string().optional(),
  repMunicipioId: z3.string().optional()
});
var router2 = Router2();
var loginSchema = z3.object({
  correo: z3.string().min(1, "El correo es requerido"),
  password: z3.string().min(1, "La contrase\xF1a es requerida")
});
var emailVerificationRequestSchema = z3.object({
  email: z3.string().email("Correo electr\xF3nico inv\xE1lido")
});
var emailVerificationVerifySchema = z3.object({
  email: z3.string().email("Correo electr\xF3nico inv\xE1lido"),
  code: z3.string().length(6, "El c\xF3digo debe tener 6 d\xEDgitos")
});
var twoFactorCodeSchema = z3.object({
  code: z3.string().min(6, "Ingresa el c\xF3digo de autenticaci\xF3n")
});
var verifyTwoFactorLoginSchema = z3.object({
  challengeId: z3.string().uuid("Challenge inv\xE1lido"),
  code: z3.string().min(6, "Ingresa el c\xF3digo de autenticaci\xF3n")
});
var disableTwoFactorSchema = z3.object({
  currentPassword: z3.string().min(1, "La contrase\xF1a actual es obligatoria")
});
var deviceRevokeParamsSchema = z3.object({
  id: z3.string().uuid("Dispositivo inv\xE1lido")
});
var DEVICE_ID_HEADER = "x-device-id";
var DEVICE_NAME_HEADER = "x-device-name";
var DEVICE_PLATFORM_HEADER = "x-device-platform";
function readHeader(req, header) {
  const raw = req.headers[header];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return typeof raw === "string" ? raw : null;
}
function cleanHeaderValue(value, maxLength) {
  const normalized = value?.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}
function defaultDeviceName(platform) {
  if (platform === "web") return "Navegador web";
  if (platform === "ios") return "Dispositivo iOS";
  if (platform === "android") return "Dispositivo Android";
  return "Dispositivo";
}
function buildFallbackDeviceId(req, platform, userAgent) {
  const raw = `${req.ip ?? "unknown"}|${platform ?? "unknown"}|${userAgent ?? "unknown"}`;
  return `legacy_${Buffer.from(raw).toString("base64url").slice(0, 160)}`;
}
function getDeviceContext(req) {
  const userAgent = cleanHeaderValue(readHeader(req, "user-agent"), 500);
  const platform = cleanHeaderValue(readHeader(req, DEVICE_PLATFORM_HEADER), 30) ?? "unknown";
  const deviceName = cleanHeaderValue(readHeader(req, DEVICE_NAME_HEADER), 120) ?? defaultDeviceName(platform);
  const deviceId = cleanHeaderValue(readHeader(req, DEVICE_ID_HEADER), 191) ?? buildFallbackDeviceId(req, platform, userAgent);
  return {
    deviceId,
    deviceName,
    platform,
    userAgent
  };
}
function parseRecoveryCodeHashes(raw) {
  if (!raw) return [];
  try {
    const parsed2 = JSON.parse(raw);
    return Array.isArray(parsed2) ? parsed2.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
async function buildUserLoginContext(userId2) {
  const user = await storage.getUserById(userId2);
  if (!user) throw new Error("Usuario no encontrado");
  const role = await storage.getRol(user.rolId ?? 0);
  if (!role) throw new Error("El usuario no tiene rol asignado");
  const rawProfile = await storage.getUserProfile(user.id, role.nombre);
  if (!rawProfile) throw new Error("El usuario no tiene perfil asignado");
  let firmRolId = null;
  if (role.nombre === "abogado" && rawProfile?.id) {
    const activeHistory = await storage.lawyerFirmaHistory.getActiveByLawyerId(rawProfile.id);
    if (activeHistory?.firmRolId) firmRolId = activeHistory.firmRolId;
  }
  return {
    user,
    role,
    profile: rawProfile,
    firmRolId
  };
}
async function finalizeLogin(req, res, userId2) {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const { deviceId, deviceName, platform, userAgent } = getDeviceContext(req);
  const { user, role, profile, firmRolId } = await buildUserLoginContext(userId2);
  const deviceResult = await storage.userDevices.upsertSeen({
    userId: user.id,
    deviceId,
    deviceName,
    platform,
    userAgent,
    lastIp: ip
  });
  const authResponse = createAuthResponse(
    { id: user.id, email: user.email, name: user.name },
    role,
    res,
    profile,
    firmRolId
  );
  const refreshToken = generateRefreshToken();
  const isProduction2 = process.env.NODE_ENV === "production";
  await storage.sessions.create({
    id: authResponse.jti,
    userId: user.id,
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1e3),
    refreshToken,
    refreshExpiresAt: new Date(Date.now() + REFRESH_MAX_AGE),
    ipAddress: ip,
    userAgent,
    deviceId: deviceResult.device.deviceId
  });
  recordSuccess(ip, user.email).catch(() => {
  });
  auditLog({ email: user.email, ip, userAgent, eventType: "login_success", success: true }).catch(() => {
  });
  if (deviceResult.isNewDevice) {
    queueNotificationEmail(
      user.email,
      "Nuevo inicio de sesi\xF3n detectado",
      [
        "Detectamos un inicio de sesi\xF3n desde un dispositivo no reconocido.",
        "",
        `Dispositivo: ${deviceResult.device.deviceName ?? "Dispositivo nuevo"}`,
        `Plataforma: ${deviceResult.device.platform ?? "No identificada"}`,
        `IP aproximada: ${ip}`,
        `Fecha: ${(/* @__PURE__ */ new Date()).toLocaleString("es-CO")}`,
        "",
        "Si fuiste t\xFA, no necesitas hacer nada. Si no reconoces esta actividad, cambia tu contrase\xF1a y revoca los dispositivos activos."
      ].join("\n")
    );
  }
  res.cookie(AUTH_REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(isProduction2));
  const effectiveRolId = firmRolId ?? role.id;
  const permisos3 = await storage.getPermisosByRol(effectiveRolId);
  return { ...authResponse, refreshToken, permisos: permisos3, newDeviceDetected: deviceResult.isNewDevice };
}
async function queueEmailVerification(email, userId2) {
  const code = await storage.otps.createEmailVerificationOtp(userId2);
  sendEmailVerificationOtp(email, code).catch((err) => {
    console.error("[email-verification] email send error:", err);
  });
}
router2.post("/login", loginRateLimiter, async (req, res, next) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const { deviceId, deviceName, platform, userAgent } = getDeviceContext(req);
  try {
    const parsed2 = loginSchema.safeParse(req.body);
    if (!parsed2.success) {
      return res.status(400).json({ error: parsed2.error.errors[0].message });
    }
    const { correo, password } = parsed2.data;
    const email = correo.toLowerCase().trim();
    const recaptchaToken = req.body?.recaptchaToken;
    const captchaOk = await validateRecaptcha(recaptchaToken);
    if (!captchaOk) {
      return res.status(400).json({ error: "Verificaci\xF3n de seguridad fallida. Intenta de nuevo." });
    }
    const user = await storage.getUserByEmail(email);
    const isValidPassword = user ? await verifyPassword(password, user.passwordHash || "") : false;
    if (!user || !isValidPassword) {
      recordFailure(ip, email).catch(() => {
      });
      auditLog({ email, ip, userAgent, eventType: "login_fail", success: false }).catch(() => {
      });
      return res.status(401).json({ error: "Credenciales inv\xE1lidas" });
    }
    if (!user.emailVerified) {
      return res.status(403).json({
        error: "Debes verificar tu correo electr\xF3nico antes de ingresar.",
        code: "EMAIL_NOT_VERIFIED",
        requiresEmailVerification: true
      });
    }
    const twoFactor = await storage.userTwoFactor.getByUserId(user.id);
    if (twoFactor?.enabledAt) {
      const challengeId = randomUUID30();
      await storage.authChallenges.create({
        id: challengeId,
        userId: user.id,
        challengeType: "two_factor_login",
        deviceId,
        ipAddress: ip,
        userAgent,
        expiresAt: new Date(Date.now() + 10 * 60 * 1e3),
        createdAt: /* @__PURE__ */ new Date()
      });
      return res.json({
        requiresTwoFactor: true,
        challengeId
      });
    }
    return res.json(await finalizeLogin(req, res, user.id));
  } catch (err) {
    next(err);
  }
});
router2.post(
  "/register/lawyer",
  registerRateLimiter,
  validate(lawyerRegisterSchema),
  async (req, res, next) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        documento,
        tipoDocumentoId,
        direccion,
        departamentoId,
        municipioId,
        specialty,
        licenseNumber,
        isIndependent,
        firmId
      } = req.body;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: "No fue posible completar el registro. Verifica los datos ingresados."
        });
      }
      const hashedPassword = await hashPassword(password);
      const lawyer = await storage.createLawyerWithUser(
        {
          id: crypto.randomUUID(),
          email,
          passwordHash: hashedPassword,
          rolId: EnumRol.ABOGADO.id,
          name: `${firstName} ${lastName}`,
          emailVerified: false
        },
        {
          id: crypto.randomUUID(),
          specialization: specialty ?? null,
          licenseNumber,
          isIndependent: isIndependent ?? true,
          firmId: firmId || null,
          professionalVerificationStatus: "pendiente"
        },
        {
          nombre: firstName,
          apellido: lastName,
          telefono: phone,
          documento,
          tipoDocumentoId,
          direccion: direccion ?? null,
          departamentoId: departamentoId ?? null,
          municipioId: municipioId ?? null
        }
      );
      await subscriptionService.activatePlanGratis(lawyer.userId, "abogado");
      await queueEmailVerification(email, lawyer.userId);
      return res.status(201).json({
        message: "Abogado creado exitosamente. Verifica tu correo para activar el acceso.",
        requiresEmailVerification: true,
        email,
        professionalVerificationStatus: "pendiente",
        data: lawyer
      });
    } catch (error) {
      next(error);
    }
  }
);
router2.post(
  "/register/firm",
  registerRateLimiter,
  validate(firmRegisterSchema),
  async (req, res, next) => {
    try {
      const {
        email,
        password,
        name,
        nit,
        address,
        phone,
        repNombre,
        repApellido,
        repDocumento,
        repTipoDocumentoId,
        repCargo,
        repEmail,
        repTelefono,
        repDireccion,
        repDepartamentoId,
        repMunicipioId
      } = req.body;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          message: "No fue posible completar el registro. Verifica los datos ingresados."
        });
      }
      const hashedPassword = await hashPassword(password);
      const repData = repNombre && repDocumento ? {
        persona: {
          nombre: repNombre,
          apellido: repApellido || "",
          telefono: repTelefono || "",
          documento: repDocumento,
          tipoDocumentoId: repTipoDocumentoId || 1,
          direccion: repDireccion || null,
          departamentoId: repDepartamentoId || null,
          municipioId: repMunicipioId || null
        },
        rep: {
          cargo: repCargo || "Representante Legal",
          email: repEmail || email
        }
      } : void 0;
      const firm = await storage.createFirmWithUser(
        {
          id: crypto.randomUUID(),
          email,
          passwordHash: hashedPassword,
          rolId: 5,
          name,
          emailVerified: false
        },
        {
          id: crypto.randomUUID(),
          name,
          nit,
          address,
          phone
        },
        repData
      );
      await subscriptionService.activatePlanGratis(firm.userId, "bufete");
      await queueEmailVerification(email, firm.userId);
      return res.status(201).json({
        message: "Firma creada exitosamente. Verifica tu correo para activar el acceso.",
        requiresEmailVerification: true,
        email,
        data: firm
      });
    } catch (error) {
      next(error);
    }
  }
);
router2.get("/auth/verify", async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        error: "No se proporcion\xF3 token",
        authenticated: false
      });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: "Token inv\xE1lido o expirado",
        authenticated: false
      });
    }
    const user = await storage.getUserById(payload.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Usuario no encontrado o inactivo",
        authenticated: false
      });
    }
    const permisos3 = await storage.getPermisosByRol(payload.rol.id);
    const profile = await storage.getUserProfile(
      user.id,
      payload.rol.nombre
    );
    res.json({
      authenticated: true,
      user,
      profile,
      type: payload.rol.nombre,
      permisos: permisos3
    });
  } catch (err) {
    next(err);
  }
});
router2.get("/auth/token", async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "No token", authenticated: false });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Token invalido", authenticated: false });
    }
    const sessionValid = await storage.sessions.isValid(payload.jti);
    if (!sessionValid) {
      return res.status(401).json({ error: "Sesion revocada", authenticated: false });
    }
    res.json({ token, authenticated: true });
  } catch (err) {
    next(err);
  }
});
router2.post("/auth/refresh", async (req, res, next) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const deviceContext = getDeviceContext(req);
  try {
    const refreshToken = req.cookies?.[AUTH_REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: "Sin refresh token" });
    }
    const session = await storage.sessions.findByRefreshToken(refreshToken);
    if (!session || session.revokedAt !== null || !session.refreshExpiresAt || session.refreshExpiresAt < /* @__PURE__ */ new Date()) {
      return res.status(401).json({ error: "Refresh token inv\xE1lido o expirado" });
    }
    const user = await storage.getUserById(session.userId);
    if (!user) return res.status(401).json({ error: "Usuario no encontrado" });
    const role = await storage.getRol(user.rolId ?? 0);
    if (!role) return res.status(401).json({ error: "Rol no encontrado" });
    const rawProfile = await storage.getUserProfile(user.id, role.nombre);
    let firmRolId = null;
    if (role.nombre === "abogado" && rawProfile?.id) {
      const activeHistory = await storage.lawyerFirmaHistory.getActiveByLawyerId(rawProfile.id);
      if (activeHistory?.firmRolId) {
        firmRolId = activeHistory.firmRolId;
      }
    }
    const authResponse = createAuthResponse(
      { id: user.id, email: user.email, name: user.name },
      role,
      res,
      rawProfile ?? void 0,
      firmRolId
    );
    const newRefreshToken = generateRefreshToken();
    const isProduction2 = process.env.NODE_ENV === "production";
    await storage.sessions.rotate(
      session.id,
      authResponse.jti,
      newRefreshToken,
      new Date(Date.now() + 2 * 60 * 60 * 1e3),
      new Date(Date.now() + REFRESH_MAX_AGE)
    );
    if (session.deviceId) {
      await storage.userDevices.upsertSeen({
        userId: session.userId,
        deviceId: session.deviceId,
        deviceName: deviceContext.deviceName,
        platform: deviceContext.platform,
        userAgent: deviceContext.userAgent,
        lastIp: ip
      });
    }
    res.cookie(AUTH_REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions(isProduction2));
    const effectiveRolId = firmRolId ?? role.id;
    const permisos3 = await storage.getPermisosByRol(effectiveRolId);
    return res.json({ ...authResponse, refreshToken: newRefreshToken, permisos: permisos3 });
  } catch (err) {
    next(err);
  }
});
router2.get("/auth/2fa/status", authenticate, async (req, res, next) => {
  try {
    const authUser = req.user;
    const twoFactor = await storage.userTwoFactor.getByUserId(authUser.id);
    const recoveryCodes = parseRecoveryCodeHashes(twoFactor?.recoveryCodes);
    res.json({
      enabled: !!twoFactor?.enabledAt,
      setupPending: !!twoFactor && !twoFactor.enabledAt,
      recoveryCodesRemaining: recoveryCodes.length
    });
  } catch (err) {
    next(err);
  }
});
router2.post("/auth/2fa/setup", authenticate, async (req, res, next) => {
  try {
    const authUser = req.user;
    const user = await storage.getUserById(authUser.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    const secret = generateTwoFactorSecret();
    await storage.userTwoFactor.upsertSecret(authUser.id, secret);
    res.json({
      secret,
      otpAuthUrl: generateOtpAuthUrl(user.email, secret),
      manualEntryKey: secret
    });
  } catch (err) {
    next(err);
  }
});
router2.post("/auth/2fa/verify-setup", authenticate, async (req, res, next) => {
  try {
    const authUser = req.user;
    const { code } = twoFactorCodeSchema.parse(req.body);
    const twoFactor = await storage.userTwoFactor.getByUserId(authUser.id);
    if (!twoFactor) {
      return res.status(400).json({ error: "No hay una configuraci\xF3n de 2FA pendiente." });
    }
    if (!verifyTotpCode(twoFactor.secret, code)) {
      return res.status(400).json({ error: "El c\xF3digo de verificaci\xF3n es inv\xE1lido." });
    }
    const recoveryCodes = generateRecoveryCodes();
    await storage.userTwoFactor.enable(authUser.id, twoFactor.secret, hashRecoveryCodes(recoveryCodes));
    res.json({
      message: "Autenticaci\xF3n en dos pasos activada.",
      recoveryCodes
    });
  } catch (err) {
    next(err);
  }
});
router2.post("/auth/2fa/disable", authenticate, async (req, res, next) => {
  try {
    const authUser = req.user;
    const { currentPassword } = disableTwoFactorSchema.parse(req.body);
    const user = await storage.getUserById(authUser.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
    const valid = await verifyPassword(currentPassword, user.passwordHash || "");
    if (!valid) {
      return res.status(401).json({ error: "La contrase\xF1a actual es incorrecta." });
    }
    await storage.userTwoFactor.disable(authUser.id);
    res.json({ message: "Autenticaci\xF3n en dos pasos desactivada." });
  } catch (err) {
    next(err);
  }
});
router2.post("/auth/2fa/verify-login", async (req, res, next) => {
  try {
    const { challengeId, code } = verifyTwoFactorLoginSchema.parse(req.body);
    const challenge = await storage.authChallenges.getValidById(challengeId);
    if (!challenge || challenge.challengeType !== "two_factor_login") {
      return res.status(400).json({ error: "El desaf\xEDo de autenticaci\xF3n es inv\xE1lido o expir\xF3." });
    }
    const twoFactor = await storage.userTwoFactor.getByUserId(challenge.userId);
    if (!twoFactor?.enabledAt) {
      return res.status(400).json({ error: "La autenticaci\xF3n en dos pasos no est\xE1 activa para esta cuenta." });
    }
    let validated = verifyTotpCode(twoFactor.secret, code);
    if (!validated) {
      const recoveryHashes = parseRecoveryCodeHashes(twoFactor.recoveryCodes);
      const recoveryResult = verifyRecoveryCode(code, recoveryHashes);
      if (recoveryResult.valid) {
        validated = true;
        await storage.userTwoFactor.updateRecoveryCodes(challenge.userId, recoveryResult.remaining);
      }
    }
    if (!validated) {
      return res.status(400).json({ error: "El c\xF3digo de autenticaci\xF3n es inv\xE1lido." });
    }
    await storage.authChallenges.complete(challenge.id);
    return res.json(await finalizeLogin(req, res, challenge.userId));
  } catch (err) {
    next(err);
  }
});
router2.get("/auth/devices", authenticate, async (req, res, next) => {
  try {
    const authUser = req.user;
    const currentSession = await storage.sessions.findById(authUser.jti);
    const currentDevice = currentSession?.deviceId ? await storage.userDevices.getByDeviceId(authUser.id, currentSession.deviceId) : void 0;
    const devices = await storage.userDevices.listForUser(authUser.id, currentDevice?.id ?? null);
    res.json(devices);
  } catch (err) {
    next(err);
  }
});
router2.post("/auth/devices/:id/revoke", authenticate, async (req, res, next) => {
  try {
    const params = deviceRevokeParamsSchema.parse(req.params);
    const authUser = req.user;
    const currentSession = await storage.sessions.findById(authUser.jti);
    const currentDevice = currentSession?.deviceId ? await storage.userDevices.getByDeviceId(authUser.id, currentSession.deviceId) : void 0;
    const revoked = await storage.userDevices.revokeById(authUser.id, params.id);
    if (!revoked) {
      return res.status(404).json({ error: "Dispositivo no encontrado" });
    }
    res.json({
      message: "Dispositivo revocado correctamente",
      currentDeviceRevoked: currentDevice?.id === revoked.id
    });
  } catch (err) {
    next(err);
  }
});
router2.post("/auth/logout", async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const payload = verifyToken(token);
      if (payload?.jti) {
        await storage.sessions.revoke(payload.jti);
      }
    }
    const isProduction2 = process.env.NODE_ENV === "production";
    res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions(isProduction2));
    res.clearCookie(AUTH_REFRESH_COOKIE_NAME, getClearCookieOptions(isProduction2));
    res.json({ message: "Sesi\xF3n cerrada correctamente" });
  } catch (err) {
    next(err);
  }
});
router2.put("/auth/change-password", authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Se requieren la contrase\xF1a actual y la nueva." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "La nueva contrase\xF1a debe tener al menos 8 caracteres." });
    }
    const authUser = req.user;
    const user = await storage.getUserById(authUser.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
    const valid = await verifyPassword(currentPassword, user.passwordHash || "");
    if (!valid) return res.status(401).json({ error: "La contrase\xF1a actual es incorrecta." });
    await storage.users.updateUser(authUser.id, { passwordHash: await hashPassword(newPassword) });
    await storage.sessions.revokeAllForUser(authUser.id);
    res.json({ message: "Contrase\xF1a actualizada correctamente." });
  } catch (err) {
    next(err);
  }
});
router2.post("/auth/request-email-verification", registerRateLimiter, async (req, res, next) => {
  try {
    const { email } = emailVerificationRequestSchema.parse(req.body);
    const user = await storage.getUserByEmail(email.toLowerCase().trim());
    if (user && user.isActive && !user.emailVerified) {
      await queueEmailVerification(user.email, user.id);
    }
    return res.json({
      message: "Si el correo existe y a\xFAn no est\xE1 verificado, recibir\xE1s un c\xF3digo en breve."
    });
  } catch (err) {
    next(err);
  }
});
router2.post("/auth/verify-email", registerRateLimiter, async (req, res, next) => {
  try {
    const { email, code } = emailVerificationVerifySchema.parse(req.body);
    const user = await storage.getUserByEmail(email.toLowerCase().trim());
    const GENERIC_ERROR = "C\xF3digo inv\xE1lido o expirado.";
    if (!user || !user.isActive) {
      return res.status(400).json({ error: GENERIC_ERROR });
    }
    if (user.emailVerified) {
      return res.json({ message: "El correo ya estaba verificado." });
    }
    const result = await storage.otps.verifyEmailVerificationOtp(user.id, code);
    if (result === "too_many_attempts") {
      return res.status(429).json({ error: "Demasiados intentos fallidos. Solicita un nuevo c\xF3digo." });
    }
    if (result !== "valid") {
      return res.status(400).json({ error: GENERIC_ERROR });
    }
    await storage.otps.markEmailVerificationUsed(user.id);
    await storage.users.updateUser(user.id, { emailVerified: true });
    return res.json({ message: "Correo verificado correctamente." });
  } catch (err) {
    next(err);
  }
});
router2.get("/permisos", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const permisos3 = await storage.getPermisosByRol(user.rol.id);
    res.json({ permisos: permisos3 });
  } catch (err) {
    next(err);
  }
});
var auth_default = router2;

// server/routes/clientes.ts
init_auth();
init_database_storage();
import { Router as Router3 } from "express";
import { z as z4 } from "zod";

// server/services/lawyer-profile.service.ts
import { eq as eq56 } from "drizzle-orm";
init_lawyer_profile_schema();
init_user_schema();
init_auth();
init_database_storage();
import { randomUUID as randomUUID31 } from "node:crypto";
var LawyerProfileService = class {
  async getAll() {
    return db.select().from(lawyerProfiles);
  }
  async getById(id) {
    const result = await db.select().from(lawyerProfiles).where(eq56(lawyerProfiles.id, id));
    return result[0];
  }
  async getByEmail(email) {
    const userResult = await db.select().from(users).where(eq56(users.email, email));
    if (!userResult[0]) return null;
    const result = await db.select().from(lawyerProfiles).where(eq56(lawyerProfiles.userId, userResult[0].id));
    return result[0];
  }
  async getByUserId(userId2) {
    const result = await db.select().from(lawyerProfiles).where(eq56(lawyerProfiles.userId, userId2));
    return result[0];
  }
  async create(data) {
    await db.insert(lawyerProfiles).values(data);
    return data;
  }
  async update(id, data) {
    const { createdAt, ...updateData } = data;
    await db.update(lawyerProfiles).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq56(lawyerProfiles.id, id));
    return this.getById(id);
  }
  async delete(id) {
    await db.delete(lawyerProfiles).where(eq56(lawyerProfiles.id, id));
  }
  async createAbogado(insertCliente, password, lawyerId) {
    const hashedPassword = await hashPassword(password);
    const cliente = await storage.createLawyerWithUser(
      {
        id: randomUUID31(),
        email: insertCliente.correo,
        passwordHash: hashedPassword,
        rolId: 4
      },
      {
        ...insertCliente.profile
      }
    );
    return cliente;
  }
};
var lawyerProfileService = new LawyerProfileService();

// server/services/cliente.service.ts
init_schema();
import { eq as eq57, or as or7, like as like7 } from "drizzle-orm";
import { randomUUID as randomUUID32 } from "crypto";
init_auth();
init_database_storage();

// server/services/ownership-policy.service.ts
init_database_storage();
var OwnershipPolicyService = class {
  /**
   * Determina el owner de un PROCESO recién creado.
   *
   * Reglas (en orden de prioridad):
   * 1. Si el actor es bufete → siempre ownerType=bufete, esPrivado=false
   * 2. Si el actor es abogado SIN firma → ownerType=abogado, esPrivado=false
   * 3. Si el actor es abogado CON firma:
   *    a. Bufete NO permite privados → ownerType=bufete, esPrivado=false
   *    b. Bufete SÍ permite privados:
   *       - esPrivadoSolicitado=true → ownerType=abogado, esPrivado=true
   *       - esPrivadoSolicitado=false → usa defaultProcesoEsCompartido del bufete
   */
  async resolveForProceso(ctx) {
    if (ctx.rolNombre === "bufete") {
      return { ownerType: "bufete", ownerId: ctx.actorId, esPrivado: false };
    }
    if (ctx.rolNombre !== "abogado") {
      throw new Error(`Rol '${ctx.rolNombre}' no puede crear este recurso`);
    }
    const firmId = await this.getFirmId(ctx.actorId);
    if (!firmId) {
      return { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: false };
    }
    const settings = await storage.firmSettings.get(firmId);
    if (!settings.allowPrivateProcesos) {
      return { ownerType: "bufete", ownerId: firmId, esPrivado: false };
    }
    const esPrivado = ctx.esPrivadoSolicitado ? true : !settings.defaultProcesoEsCompartido;
    return esPrivado ? { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: true } : { ownerType: "bufete", ownerId: firmId, esPrivado: false };
  }
  /**
   * Determina el owner de un CLIENTE recién creado.
   * Misma lógica que proceso pero con allowPrivateClientes y defaultClienteEsCompartido.
   */
  async resolveForCliente(ctx) {
    if (ctx.rolNombre === "bufete") {
      return { ownerType: "bufete", ownerId: ctx.actorId, esPrivado: false };
    }
    if (ctx.rolNombre !== "abogado") {
      throw new Error(`Rol '${ctx.rolNombre}' no puede crear este recurso`);
    }
    const firmId = await this.getFirmId(ctx.actorId);
    if (!firmId) {
      return { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: false };
    }
    const settings = await storage.firmSettings.get(firmId);
    if (!settings.allowPrivateClientes) {
      return { ownerType: "bufete", ownerId: firmId, esPrivado: false };
    }
    const esPrivado = ctx.esPrivadoSolicitado ? true : !settings.defaultClienteEsCompartido;
    return esPrivado ? { ownerType: "abogado", ownerId: ctx.actorId, esPrivado: true } : { ownerType: "bufete", ownerId: firmId, esPrivado: false };
  }
  /**
   * Valida que el proceso tenga el mismo tipo de ownership que su cliente.
   * Lanza Error si hay inconsistencia.
   */
  async validateConsistenciaClienteProceso(clienteId, procesoEsPrivado) {
    const ownership = await storage.clienteOwnership.getActive(clienteId);
    if (!ownership) return;
    if (ownership.ownerType === "abogado") {
      const firmId = await this.getFirmId(ownership.ownerId);
      if (!firmId) return;
    }
    const clienteEsPrivado = ownership.ownerType === "abogado";
    if (clienteEsPrivado && !procesoEsPrivado) {
      throw new Error(
        "No se puede crear un proceso del bufete para un cliente privado. El proceso debe ser tambi\xE9n privado."
      );
    }
    if (!clienteEsPrivado && procesoEsPrivado) {
      throw new Error(
        "No se puede crear un proceso privado para un cliente del bufete. El proceso debe pertenecer al bufete."
      );
    }
  }
  /** Obtiene el firmId del abogado usando getLawyer por ID de perfil. */
  async getFirmId(lawyerId) {
    const profile = await storage.lawyerProfiles.getLawyer(lawyerId);
    return profile?.firmId ?? null;
  }
};
var ownershipPolicyService = new OwnershipPolicyService();

// server/services/cliente.service.ts
var ClientesService = class {
  // ----------------------------------------------------------------
  // LIST — lawyer
  // ----------------------------------------------------------------
  async getClientes(lawyerId, limit, offset, filter) {
    const procesoClienteIds = await storage.clientes.getClienteIdsByProcesoResponsable(lawyerId);
    const list = await storage.clientes.getClientes(lawyerId, limit, offset, filter, procesoClienteIds);
    return this._enrichWithProcesosStats(list);
  }
  async getClientesCount(lawyerId, filter) {
    const procesoClienteIds = await storage.clientes.getClienteIdsByProcesoResponsable(lawyerId);
    return storage.clientes.getClientesCount(lawyerId, procesoClienteIds);
  }
  // ----------------------------------------------------------------
  // LIST — firma
  // ----------------------------------------------------------------
  async getClientesByFirm(firmId, limit, offset, filter) {
    const clientIds = await storage.clienteOwnership.getClienteIdsByOwner("bufete", firmId);
    if (clientIds.length === 0) return [];
    const results = [];
    for (const id of clientIds.slice(offset, offset + limit)) {
      const c = await storage.clientes.getCliente(id);
      if (c) results.push(c);
    }
    return this._enrichWithProcesosStats(results);
  }
  // ----------------------------------------------------------------
  // SINGLE
  // ----------------------------------------------------------------
  async getCliente(id) {
    return storage.clientes.getCliente(id);
  }
  async getClienteByDocument(documento) {
    return storage.clientes.getClienteByDocument(documento);
  }
  // ----------------------------------------------------------------
  // CREATE — natural person
  // ----------------------------------------------------------------
  async createCliente(insertCliente, password, email, lawyerId, firmId, options) {
    const hashedPassword = await hashPassword(password);
    const displayName = insertCliente.tipo === "natural" ? `${insertCliente.nombre} ${insertCliente.apellido}` : insertCliente.razonSocial;
    const cliente = await db.transaction(async (tx) => {
      const user = await storage.users.createUser({
        id: randomUUID32(),
        email,
        passwordHash: hashedPassword,
        rolId: 4,
        name: displayName
      }, tx);
      return storage.clientes.createCliente({ ...insertCliente, userId: user.id }, tx);
    });
    const actorId = options?.actorId ?? lawyerId ?? firmId ?? "";
    const rolNombre = options?.rolNombre ?? (firmId ? "bufete" : "abogado");
    const createdBy = options?.userId ?? actorId;
    const ownershipDecision = await ownershipPolicyService.resolveForCliente({
      actorId,
      rolNombre,
      esPrivadoSolicitado: options?.esPrivadoSolicitado ?? false
    });
    await storage.clienteOwnership.create(
      cliente.id,
      ownershipDecision.ownerType,
      ownershipDecision.ownerId,
      createdBy,
      `Creado por ${rolNombre}${ownershipDecision.esPrivado ? " (privado)" : ""}`
    );
    await storage.clientes.updateCliente(cliente.id, {
      esPrivado: ownershipDecision.esPrivado,
      createdBy: actorId
    });
    if (ownershipDecision.ownerType === "bufete") {
      await storage.firmClients.createFirmClient(ownershipDecision.ownerId, cliente.id);
      if (rolNombre === "abogado" && actorId) {
        await storage.lawyerClients.createLawyerClient({
          id: randomUUID32(),
          lawyerId: actorId,
          clientId: cliente.id,
          status: "active"
        });
      }
    } else if (ownershipDecision.ownerType === "abogado") {
      await storage.lawyerClients.createLawyerClient({
        id: randomUUID32(),
        lawyerId: ownershipDecision.ownerId,
        clientId: cliente.id,
        status: "active"
      });
    }
    return cliente;
  }
  // ----------------------------------------------------------------
  // UPDATE
  // ----------------------------------------------------------------
  async updateCliente(id, updates) {
    return storage.clientes.updateCliente(id, updates);
  }
  // ----------------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------------
  async deleteCliente(id) {
    await storage.clientes.deleteCliente(id);
  }
  // ----------------------------------------------------------------
  // PRIVATE
  // ----------------------------------------------------------------
  async _enrichWithProcesosStats(list) {
    if (list.length === 0) return [];
    const statsMap = await storage.clientes.getProcesosStatsByClientes(list.map((c) => c.id));
    return list.map((c) => ({
      ...c,
      procesosStats: statsMap.get(c.id) ?? { total: 0, porEstado: [] }
    }));
  }
  _applyFilters(conditions, filter) {
    if (filter?.search) {
      const s = `${filter.search}%`;
      conditions.push(or7(
        like7(personas.nombre, s),
        like7(personas.documento, s),
        like7(clientesEmpresa.razonSocial, s)
      ));
    }
    if (filter?.activo !== void 0) {
      conditions.push(eq57(clientes.activo, filter.activo));
    }
  }
};
var clientesService = new ClientesService();

// server/services/notificacion.service.ts
init_database_storage();

// server/websocket/ws-server.ts
import { WebSocketServer, WebSocket } from "ws";
import jwt2 from "jsonwebtoken";

// server/services/chat.service.ts
init_database_storage();
init_s3_storage();
import { randomUUID as randomUUID34 } from "crypto";
import { and as and41, asc as asc6, eq as eq58, inArray as inArray11, sql as sql23 } from "drizzle-orm";
init_schema();
var ChatService = class {
  async resolveSupportAgentUserId(requesterId) {
    const db2 = storage.db;
    const rows = await db2.select({ id: users.id }).from(users).innerJoin(roles, eq58(users.rolId, roles.id)).where(
      and41(
        eq58(users.isActive, true),
        inArray11(roles.nombre, ["admin_soporte", "admin_super", "admin_finanzas"])
      )
    ).orderBy(
      sql23`CASE ${roles.nombre}
          WHEN 'admin_soporte' THEN 0
          WHEN 'admin_super' THEN 1
          WHEN 'admin_finanzas' THEN 2
          ELSE 9
        END`,
      asc6(users.createdAt)
    );
    const supportAgent = rows.find((row) => row.id !== requesterId) ?? rows[0];
    if (!supportAgent) {
      throw new Error("NO_SUPPORT_ADMIN");
    }
    return supportAgent.id;
  }
  async assertConversationAccess(user, conversationId) {
    const conversation = await storage.chat.getConversation(conversationId);
    if (!conversation) throw new Error("NotFound");
    const isMember = await storage.chat.isParticipant(conversationId, user.id);
    if (!isMember) throw new Error("Forbidden");
    if (conversation.type === "admin_support" || user.rol?.nombre === "cliente") {
      return { id: conversation.id, type: conversation.type };
    }
    const hasChat = await subscriptionService.hasFeature(user.id, "chat");
    if (!hasChat) throw new Error("FeatureUnavailable");
    return { id: conversation.id, type: conversation.type };
  }
  /**
   * Get or create a direct (1-to-1) conversation between two users.
   * userIdA must already be validated as the authenticated caller.
   */
  async getOrCreateConversation(userIdA, userIdB, type) {
    const existing = await storage.chat.findTwoPartyConversation(userIdA, userIdB, type);
    if (existing) {
      const dtos2 = await storage.chat.getConversationsForUser(userIdA);
      return dtos2.find((c) => c.id === existing.id);
    }
    const convId = randomUUID34();
    await storage.chat.createConversation({
      id: convId,
      type,
      name: type === "admin_support" ? "Soporte ProcesoClaro" : null
    });
    await storage.chat.addParticipant({
      id: randomUUID34(),
      conversationId: convId,
      userId: userIdA
    });
    await storage.chat.addParticipant({
      id: randomUUID34(),
      conversationId: convId,
      userId: userIdB
    });
    const dtos = await storage.chat.getConversationsForUser(userIdA);
    return dtos.find((c) => c.id === convId);
  }
  async getOrCreateSupportConversationForUser(userId2) {
    const supportAgentId = await this.resolveSupportAgentUserId(userId2);
    return this.getOrCreateConversation(userId2, supportAgentId, "admin_support");
  }
  async getOrCreateSupportConversationForAdmin(adminUserId, targetUserId) {
    return this.getOrCreateConversation(adminUserId, targetUserId, "admin_support");
  }
  async getConversations(userId2, limit = 20, offset = 0, type) {
    const conversations2 = await storage.chat.getConversationsForUser(userId2, limit, offset, type);
    const total = await storage.chat.getConversationsCount(userId2, type);
    return { conversations: conversations2, total };
  }
  async getUnreadCount(userId2) {
    return storage.chat.getTotalUnreadCount(userId2);
  }
  async getMessages(conversationId, userId2, limit = 50, offset = 0) {
    const isMember = await storage.chat.isParticipant(conversationId, userId2);
    if (!isMember) throw new Error("Forbidden");
    const msgs = await storage.chat.getMessages(conversationId, limit, offset);
    return msgs;
  }
  async sendMessage(conversationId, senderId, content) {
    const isMember = await storage.chat.isParticipant(conversationId, senderId);
    if (!isMember) throw new Error("Forbidden");
    return storage.chat.createMessage({
      id: randomUUID34(),
      conversationId,
      senderId,
      content,
      type: "text"
    });
  }
  async markRead(conversationId, userId2) {
    await storage.chat.markRead(conversationId, userId2);
  }
  /**
   * Get or create a community conversation between two users for a specific post.
   * Enforces one conversation per (userA, userB, postId).
   */
  async getOrCreateCommunityConversation(initiatorId, authorId, sourcePostId) {
    const existing = await storage.chat.findConversationByPost(initiatorId, authorId, sourcePostId);
    if (existing) return { id: existing.id };
    const convId = randomUUID34();
    await storage.chat.createConversation({ id: convId, type: "community", sourcePostId });
    await storage.chat.addParticipant({ id: randomUUID34(), conversationId: convId, userId: initiatorId });
    await storage.chat.addParticipant({ id: randomUUID34(), conversationId: convId, userId: authorId });
    return { id: convId };
  }
  async getParticipantUserIds(conversationId) {
    return storage.chat.getParticipantUserIds(conversationId);
  }
  async deleteMessage(messageId, userId2) {
    return storage.chat.softDeleteMessage(messageId, userId2);
  }
  /**
   * Insert a file message after the file has already been uploaded to S3.
   * The caller is responsible for the S3 upload; this method only writes to DB.
   * fileKey is stored in DB but NEVER returned to the frontend.
   */
  async sendFileMessage(params) {
    const isMember = await storage.chat.isParticipant(params.conversationId, params.senderId);
    if (!isMember) throw new Error("Forbidden");
    return storage.chat.createMessage({
      id: randomUUID34(),
      conversationId: params.conversationId,
      senderId: params.senderId,
      content: null,
      type: "file",
      fileKey: params.fileKey,
      fileName: params.fileName,
      fileSize: params.fileSize,
      fileMime: params.fileMime,
      fileHash: params.fileHash
    });
  }
  /**
   * Generate a short-lived signed URL (60 s) for a file message.
   * Validates that the requesting user is a participant before issuing the URL.
   */
  async getDownloadUrl(messageId, userId2) {
    const msg = await storage.chat.getRawMessage(messageId);
    if (!msg || msg.type !== "file" || !msg.fileKey) {
      throw new Error("NotFound");
    }
    const isMember = await storage.chat.isParticipant(msg.conversationId, userId2);
    if (!isMember) throw new Error("Forbidden");
    return getPresignedDownloadUrl(msg.fileKey, msg.fileName ?? "archivo", 60);
  }
};
var chatService = new ChatService();

// server/websocket/ws-server.ts
var CONFIG = {
  JWT_SECRET: (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET environment variable must be set");
    return secret;
  })(),
  // Heartbeat
  PING_INTERVAL: 3e4,
  // Server sends ping every 30s
  PING_TIMEOUT: 1e4,
  // Client must respond within 10s
  // Rate limiting
  RATE_LIMIT_MESSAGES: 2,
  // Max messages per second (reduced from 5 to prevent DoS)
  RATE_LIMIT_WINDOW: 1e3,
  // Window in ms
  // Payload limits
  MAX_MESSAGE_LENGTH: 2e3,
  MAX_PAYLOAD_SIZE: 10 * 1024,
  // 10KB max
  // Cleanup
  CLEANUP_INTERVAL: 6e4,
  // Clean dead sockets every 60s
  MAX_IDLE_TIME: 3e5
  // 5 minutes max idle
};
var wsServerInitialized = false;
var userSockets = /* @__PURE__ */ new Map();
var rateLimits = /* @__PURE__ */ new Map();
var cleanupInterval = null;
function log(level, message, meta) {
  const timestamp54 = (/* @__PURE__ */ new Date()).toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[WebSocket][${timestamp54}][${level}] ${message}${metaStr}`);
}
function send(socket, payload) {
  if (socket.ws.readyState === WebSocket.OPEN) {
    try {
      socket.ws.send(JSON.stringify(payload));
    } catch (err) {
      log("ERROR", "Failed to send message", { error: err.message, userId: socket.userId });
    }
  }
}
function removeSocket(userId2, ws) {
  const list = userSockets.get(userId2);
  if (!list) return;
  const filtered = list.filter((s) => s.ws !== ws);
  if (filtered.length === 0) {
    userSockets.delete(userId2);
    log("INFO", "User disconnected - no more sockets", { userId: userId2 });
  } else {
    userSockets.set(userId2, filtered);
    log("INFO", "Socket removed - remaining sockets", {
      userId: userId2,
      remaining: filtered.length
    });
  }
}
function cleanupDeadSockets() {
  const now = Date.now();
  let cleaned = 0;
  for (const [userId2, sockets] of userSockets.entries()) {
    const aliveSockets = sockets.filter((socket) => {
      if (!socket.isAlive || now - socket.lastActivity > CONFIG.MAX_IDLE_TIME) {
        try {
          socket.ws.terminate();
          cleaned++;
        } catch {
        }
        return false;
      }
      return true;
    });
    if (aliveSockets.length === 0) {
      userSockets.delete(userId2);
    } else if (aliveSockets.length !== sockets.length) {
      userSockets.set(userId2, aliveSockets);
    }
  }
  if (cleaned > 0) {
    log("INFO", "Cleaned dead sockets", { count: cleaned });
  }
}
function broadcastToConversation(conversationId, payload, excludeUserId) {
  let sentCount = 0;
  for (const [userId2, sockets] of userSockets.entries()) {
    if (userId2 === excludeUserId) continue;
    for (const socket of sockets) {
      if (socket.rooms.has(conversationId) && socket.isAlive) {
        send(socket, payload);
        sentCount++;
      }
    }
  }
  return sentCount;
}
function checkRateLimit(userId2) {
  const now = Date.now();
  const entry = rateLimits.get(userId2);
  if (!entry) {
    rateLimits.set(userId2, {
      count: 1,
      windowStart: now,
      blockedUntil: 0
    });
    return true;
  }
  if (entry.blockedUntil > now) {
    return false;
  }
  if (now - entry.windowStart > CONFIG.RATE_LIMIT_WINDOW) {
    rateLimits.set(userId2, {
      count: 1,
      windowStart: now,
      blockedUntil: 0
    });
    return true;
  }
  entry.count++;
  if (entry.count > CONFIG.RATE_LIMIT_MESSAGES) {
    entry.blockedUntil = now + CONFIG.RATE_LIMIT_WINDOW * 2;
    log("WARN", "Rate limit exceeded", { userId: userId2, count: entry.count });
    return false;
  }
  return true;
}
function extractUserId(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && typeof authHeader === "string") {
    try {
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      const payload = jwt2.verify(token, CONFIG.JWT_SECRET);
      if (payload.userId || payload.id) {
        return payload.userId ?? payload.id ?? null;
      }
    } catch {
    }
  }
  try {
    const url2 = new URL(req.url ?? "", "ws://localhost");
    const token = url2.searchParams.get("token");
    if (!token) return null;
    const payload = jwt2.verify(token, CONFIG.JWT_SECRET);
    return payload.userId ?? payload.id ?? null;
  } catch {
    return null;
  }
}
function validateIncomingEvent(event) {
  if (!event || typeof event !== "object") {
    return { valid: false, error: "Event must be an object" };
  }
  const e = event;
  if (!e.type || typeof e.type !== "string") {
    return { valid: false, error: "Event must have a type string" };
  }
  switch (e.type) {
    case "ping":
      return { valid: true };
    case "join":
      if (!e.conversationId || typeof e.conversationId !== "string") {
        return { valid: false, error: "join requires conversationId string" };
      }
      return { valid: true };
    case "send_message":
      if (!e.conversationId || typeof e.conversationId !== "string") {
        return { valid: false, error: "send_message requires conversationId string" };
      }
      if (!e.content || typeof e.content !== "string") {
        return { valid: false, error: "send_message requires content string" };
      }
      if (e.content.length > CONFIG.MAX_MESSAGE_LENGTH) {
        return { valid: false, error: `Message too long (max ${CONFIG.MAX_MESSAGE_LENGTH})` };
      }
      return { valid: true };
    case "mark_read":
      if (!e.conversationId || typeof e.conversationId !== "string") {
        return { valid: false, error: "mark_read requires conversationId string" };
      }
      return { valid: true };
    default:
      return { valid: false, error: `Unknown event type: ${e.type}` };
  }
}
function startHeartbeat(wss) {
  setInterval(() => {
    for (const [, sockets] of userSockets.entries()) {
      for (const socket of sockets) {
        if (!socket.isAlive) {
          socket.ws.terminate();
          continue;
        }
        socket.isAlive = false;
        try {
          socket.ws.ping();
        } catch {
        }
      }
    }
  }, CONFIG.PING_INTERVAL);
}
function setupWebSocketServer(httpServer) {
  if (wsServerInitialized) {
    log("WARN", "WebSocket server already initialized, skipping");
    return null;
  }
  wsServerInitialized = true;
  log("INFO", "Initializing production WebSocket server", {
    path: "/ws/chat",
    pingInterval: CONFIG.PING_INTERVAL,
    rateLimit: CONFIG.RATE_LIMIT_MESSAGES,
    maxMessageLength: CONFIG.MAX_MESSAGE_LENGTH
  });
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/chat" });
  wss.on("error", (error) => {
    log("ERROR", "WebSocket server error", { error: error.message });
  });
  cleanupInterval = setInterval(cleanupDeadSockets, CONFIG.CLEANUP_INTERVAL);
  startHeartbeat(wss);
  wss.on("connection", (ws, req) => {
    const clientIp = req.socket.remoteAddress ?? "unknown";
    log("INFO", "New connection attempt", { ip: clientIp });
    const userId2 = extractUserId(req);
    if (!userId2) {
      log("WARN", "Unauthorized connection attempt", { ip: clientIp });
      ws.close(4001, "Unauthorized");
      return;
    }
    const socket = {
      ws,
      userId: userId2,
      rooms: /* @__PURE__ */ new Set(),
      lastActivity: Date.now(),
      isAlive: true,
      messageCount: 0,
      windowStart: Date.now()
    };
    const existing = userSockets.get(userId2) ?? [];
    existing.push(socket);
    userSockets.set(userId2, existing);
    log("INFO", "User connected", {
      userId: userId2,
      totalSockets: existing.length
    });
    ws.on("pong", () => {
      socket.isAlive = true;
      socket.lastActivity = Date.now();
    });
    ws.on("message", async (raw) => {
      if (raw.length > CONFIG.MAX_PAYLOAD_SIZE) {
        send(socket, {
          type: "error",
          data: { message: "Payload too large" }
        });
        log("WARN", "Payload too large", {
          userId: userId2,
          size: raw.length,
          max: CONFIG.MAX_PAYLOAD_SIZE
        });
        return;
      }
      let event;
      try {
        event = JSON.parse(raw.toString());
      } catch {
        send(socket, {
          type: "error",
          data: { message: "Invalid JSON format" }
        });
        return;
      }
      const validation = validateIncomingEvent(event);
      if (!validation.valid) {
        send(socket, {
          type: "error",
          data: { message: validation.error ?? "Invalid event" }
        });
        log("WARN", "Invalid event", { userId: userId2, event, error: validation.error });
        return;
      }
      const typedEvent = event;
      socket.lastActivity = Date.now();
      try {
        switch (typedEvent.type) {
          case "ping": {
            send(socket, { type: "pong" });
            break;
          }
          case "join": {
            if (!typedEvent.conversationId) break;
            const participantIds = await chatService.getParticipantUserIds(typedEvent.conversationId);
            if (!participantIds.includes(userId2)) {
              send(socket, {
                type: "error",
                data: { message: "No tienes acceso a esta conversaci\xF3n" }
              });
              log("WARN", "Unauthorized join attempt", {
                userId: userId2,
                conversationId: typedEvent.conversationId
              });
              break;
            }
            socket.rooms.add(typedEvent.conversationId);
            log("INFO", "User joined room", {
              userId: userId2,
              conversationId: typedEvent.conversationId
            });
            break;
          }
          case "send_message": {
            const { conversationId, content } = typedEvent;
            if (!conversationId || !content?.trim()) {
              send(socket, {
                type: "error",
                data: { message: "Datos incompletos" }
              });
              break;
            }
            if (!checkRateLimit(userId2)) {
              send(socket, {
                type: "error",
                data: { message: "Rate limit exceeded. Try again later." }
              });
              log("WARN", "Rate limit triggered", { userId: userId2 });
              break;
            }
            const message = await chatService.sendMessage(
              conversationId,
              userId2,
              content.trim()
            );
            send(socket, { type: "new_message", data: message });
            const broadcastCount = broadcastToConversation(
              conversationId,
              { type: "new_message", data: message },
              userId2
            );
            const participantIds = await chatService.getParticipantUserIds(conversationId);
            const notificationPayload = {
              type: "notification",
              data: {
                conversationId,
                senderName: message.sender.name,
                preview: content.trim().slice(0, 60)
              }
            };
            for (const pid of participantIds) {
              if (pid === userId2) continue;
              const recipientSockets = userSockets.get(pid) ?? [];
              for (const sock of recipientSockets) {
                if (!sock.rooms.has(conversationId) && sock.isAlive) {
                  send(sock, notificationPayload);
                }
              }
            }
            log("INFO", "Message sent", {
              userId: userId2,
              conversationId,
              broadcastCount
            });
            break;
          }
          case "mark_read": {
            if (!typedEvent.conversationId) break;
            await chatService.markRead(typedEvent.conversationId, userId2);
            const readAt = (/* @__PURE__ */ new Date()).toISOString();
            broadcastToConversation(typedEvent.conversationId, {
              type: "read_receipt",
              data: {
                conversationId: typedEvent.conversationId,
                userId: userId2,
                readAt
              }
            }, userId2);
            log("INFO", "Messages marked as read", {
              userId: userId2,
              conversationId: typedEvent.conversationId
            });
            break;
          }
          default:
            send(socket, {
              type: "error",
              data: { message: "Unknown event type" }
            });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Internal error";
        send(socket, {
          type: "error",
          data: { message }
        });
        log("ERROR", "Error processing event", {
          userId: userId2,
          eventType: typedEvent.type,
          error: message
        });
      }
    });
    ws.on("close", () => {
      removeSocket(userId2, ws);
      log("INFO", "Connection closed", { userId: userId2 });
    });
    ws.on("error", (err) => {
      log("ERROR", "Socket error", {
        userId: userId2,
        error: err.message
      });
      removeSocket(userId2, ws);
    });
  });
  log("INFO", "WebSocket server ready");
  return wss;
}
function broadcastToRoom(conversationId, payload) {
  broadcastToConversation(conversationId, payload);
}
function broadcastToUser(userId2, payload) {
  const sockets = userSockets.get(userId2) ?? [];
  for (const socket of sockets) {
    if (socket.isAlive) send(socket, payload);
  }
}
process.on("exit", () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  for (const [, sockets] of userSockets.entries()) {
    for (const socket of sockets) {
      socket.ws.close();
    }
  }
});

// server/services/notificacion.service.ts
init_email_service();
function joinAppUrl2(path4) {
  const appUrl = process.env.APP_URL?.trim();
  if (!appUrl) return void 0;
  const base = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
  const nextPath = path4.startsWith("/") ? path4 : `/${path4}`;
  return `${base}${nextPath}`;
}
var NotificacionesService = class {
  async createNotificacion(data) {
    return storage.notificaciones.createNotificacion(data);
  }
  // ── Targeted helpers ──────────────────────────────────────────────────────
  /** Notify a single lawyer */
  async notifyLawyer(lawyerId, procesoId, titulo, mensaje, tipo) {
    try {
      await storage.notificaciones.createNotificacion({
        procesoId,
        lawyerId,
        titulo,
        mensaje,
        tipo
      });
      const lawyer = await storage.lawyerProfiles.getLawyer(lawyerId);
      if (lawyer?.userId) {
        broadcastToUser(lawyer.userId, { type: "new_notification", data: { titulo, mensaje, tipo } });
      }
      queueNotificationEmail(lawyer?.user?.email, titulo, mensaje, {
        actionUrl: joinAppUrl2(`/case/${procesoId}`),
        actionLabel: "Ver proceso"
      });
    } catch (err) {
      console.error("[notificaciones] notifyLawyer error:", err);
    }
  }
  /** Notify a client */
  async notifyCliente(clienteId, procesoId, titulo, mensaje, tipo) {
    try {
      await storage.notificaciones.createNotificacion({
        procesoId,
        clienteId,
        titulo,
        mensaje,
        tipo
      });
      const cliente = await storage.getCliente(clienteId);
      if (cliente?.userId) {
        broadcastToUser(cliente.userId, { type: "new_notification", data: { titulo, mensaje, tipo } });
      }
      queueNotificationEmail(cliente?.user?.email, titulo, mensaje, {
        actionUrl: joinAppUrl2(`/portal/case?id=${encodeURIComponent(procesoId)}`),
        actionLabel: "Ver proceso"
      });
    } catch (err) {
      console.error("[notificaciones] notifyCliente error:", err);
    }
  }
  /** Notify a firm */
  async notifyFirm(firmId, procesoId, titulo, mensaje, tipo) {
    try {
      await storage.notificaciones.createNotificacion({
        procesoId,
        firmId,
        titulo,
        mensaje,
        tipo
      });
      const firm = await storage.firmProfiles.getFirmProfileById(firmId);
      if (firm?.userId) {
        broadcastToUser(firm.userId, { type: "new_notification", data: { titulo, mensaje, tipo } });
      }
      const firmUser = firm?.userId ? await storage.users.getUserById(firm.userId) : void 0;
      queueNotificationEmail(firmUser?.email, titulo, mensaje, {
        actionUrl: joinAppUrl2(`/case/${procesoId}`),
        actionLabel: "Ver proceso"
      });
    } catch (err) {
      console.error("[notificaciones] notifyFirm error:", err);
    }
  }
  // ── Domain events ─────────────────────────────────────────────────────────
  /** Called when a new tarea is created — notifies the assigned lawyer and/or the firm. */
  async onTareaCreada(opts) {
    if (opts.lawlerId) {
      await this.notifyLawyer(
        opts.lawlerId,
        opts.procesoId,
        "Nueva tarea creada en proceso",
        `se cre\xF3 la tarea: "${opts.tareaTitle}" en el proceso: "${opts.procoNombre}" por ${opts.creadoPorNombre ?? "Alguien"}`,
        "nueva_tarea"
      );
    }
    if (opts.firmId) {
      await this.notifyFirm(
        opts.firmId,
        opts.procesoId,
        "Nueva tarea creada",
        `se cre\xF3 la tarea: "${opts.tareaTitle}" en el proceso: "${opts.procoNombre}" por ${opts.creadoPorNombre ?? "Alguien"}`,
        "nueva_tarea"
      );
    }
  }
  /** Called when a tarea is marked completada — notifies creator and the firm. */
  async onTareaCompletada(opts) {
    await this.notifyLawyer(
      opts.creadoPorId,
      opts.procesoId,
      "Tarea completada",
      `${opts.responsableNombre ?? "Un abogado"} complet\xF3 la tarea: "${opts.tareaTitle}"`,
      "tarea_completada"
    );
    if (opts.firmId) {
      await this.notifyFirm(
        opts.firmId,
        opts.procesoId,
        "Tarea completada",
        `${opts.responsableNombre ?? "Un abogado"} complet\xF3 la tarea: "${opts.tareaTitle}"`,
        "tarea_completada"
      );
    }
  }
  /** Called when an actualizacion is added — notifies the process client. */
  async onActualizacionCreada(opts) {
    await this.notifyCliente(
      opts.clienteId,
      opts.procesoId,
      "Nueva actualizaci\xF3n en tu proceso",
      `Se agreg\xF3 la actualizaci\xF3n: "${opts.titulo}"`,
      "nueva_actualizacion"
    );
  }
  /** Called when a document is uploaded — notifies the process client. */
  async onDocumentoSubido(opts) {
    await this.notifyCliente(
      opts.clienteId,
      opts.procesoId,
      "Nuevo documento disponible",
      `Se subi\xF3 el documento: "${opts.documentoNombre}" a tu proceso`,
      "nuevo_documento"
    );
  }
};
var notificacionesService = new NotificacionesService();

// server/services/proceso.service.ts
init_database_storage();
var ProcesosService = class {
  async getProcesos(lawyerId, limit = 10, offset = 0, filter) {
    return storage.procesos.getProcesos(lawyerId, limit, offset, filter);
  }
  async getProcesosCount(lawyerId, filter) {
    return storage.procesos.getProcesosCount(lawyerId, filter);
  }
  async getProcesosByCliente(clienteId, limit = 10, offset = 0, filter) {
    return storage.procesos.getProcesosByCliente(clienteId, limit, offset, filter);
  }
  async getProceso(id) {
    return storage.procesos.getProceso(id);
  }
  async createProceso(insertProceso) {
    const { lawyerId, ...procesoData } = insertProceso;
    const newProceso = await storage.procesos.createProceso(procesoData);
    if (lawyerId) {
      await storage.procesos.addLawyerToProceso(newProceso.id, lawyerId, { rol: "principal" });
    }
    return newProceso;
  }
  async updateProceso(id, updates) {
    const currentProceso = await storage.procesos.getProceso(id);
    const updatedProceso = await storage.procesos.updateProceso(id, updates);
    if (updates.estadoId && currentProceso && currentProceso.estado?.id !== updates.estadoId) {
      try {
        const newEstado = await storage.estadosProceso.getEstadoProceso(updates.estadoId);
        const oldEstado = currentProceso.estado;
        const tipoProcesoNombre = currentProceso.tipoProceso?.nombre ?? "Proceso";
        if (newEstado) {
          const lawyers = await storage.procesos.getProcesoLawyers(id);
          await Promise.all(
            lawyers.map(
              (lawyer) => notificacionesService.notifyLawyer(
                lawyer.lawyerId,
                id,
                `Cambio de estado: ${tipoProcesoNombre}`,
                `El estado del proceso ha cambiado de "${oldEstado?.nombre ?? "Desconocido"}" a "${newEstado.nombre}"`,
                "estado_cambio"
              )
            )
          );
        }
      } catch (e) {
        console.error("Error creating notification:", e);
      }
    }
    return updatedProceso;
  }
  async deleteProceso(id) {
    return storage.procesos.deleteProceso(id);
  }
  // ── Actualizaciones ──────────────────────────────────────────────────────────
  async getActualizaciones(procesoId, limit = 10, offset = 0) {
    return storage.actualizaciones.getActualizaciones(procesoId, limit, offset);
  }
  async createActualizacion(insertActualizacion) {
    const actualizacion = await storage.actualizaciones.createActualizacion(insertActualizacion);
    try {
      const proceso = await storage.procesos.getProceso(insertActualizacion.procesoId);
      if (!proceso) return actualizacion;
      const procesoId = insertActualizacion.procesoId;
      const titulo = `Nueva actualizaci\xF3n en tu proceso`;
      const mensaje = insertActualizacion.titulo;
      const tipo = "actualizacion";
      if (proceso.clienteId) {
        await notificacionesService.notifyCliente(proceso.clienteId, procesoId, titulo, mensaje, tipo);
      }
      const lawyers = await storage.procesos.getProcesoLawyers(procesoId);
      const firmIds = /* @__PURE__ */ new Set();
      const notifiedLawyerIds = /* @__PURE__ */ new Set();
      for (const lawyer of lawyers) {
        await notificacionesService.notifyLawyer(lawyer.lawyerId, procesoId, titulo, mensaje, tipo);
        notifiedLawyerIds.add(lawyer.lawyerId);
        const profile = await storage.lawyerProfiles.getLawyer(lawyer.lawyerId);
        if (profile?.firmId) firmIds.add(profile.firmId);
      }
      if (proceso.responsable?.id && !notifiedLawyerIds.has(proceso.responsable.id)) {
        await notificacionesService.notifyLawyer(proceso.responsable.id, procesoId, titulo, mensaje, tipo);
        const profile = await storage.lawyerProfiles.getLawyer(proceso.responsable.id);
        if (profile?.firmId) firmIds.add(profile.firmId);
      }
      for (const firmId of firmIds) {
        await notificacionesService.notifyFirm(firmId, procesoId, titulo, mensaje, tipo);
      }
    } catch (e) {
      console.error("Error creating notification for actualizacion:", e);
    }
    return actualizacion;
  }
  async deleteActualizacion(id) {
    return storage.actualizaciones.deleteActualizacion(id);
  }
  // ── Documentos ───────────────────────────────────────────────────────────────
  async getDocumentos(procesoId) {
    return storage.documentos.getDocumentos(procesoId);
  }
  async getDocumento(id) {
    return storage.documentos.getDocumento(id);
  }
  async createDocumento(insertDocumento) {
    const documento = await storage.documentos.createDocumento(insertDocumento);
    try {
      const proceso = await storage.procesos.getProceso(insertDocumento.procesoId);
      if (!proceso) return documento;
      const procesoId = insertDocumento.procesoId;
      const titulo = `Nuevo documento en tu proceso`;
      const mensaje = `Se subi\xF3 el documento: ${insertDocumento.descripcion || "documento"}`;
      const tipo = "nuevo_documento";
      if (proceso.clienteId) {
        await notificacionesService.notifyCliente(proceso.clienteId, procesoId, titulo, mensaje, tipo);
      }
      const lawyers = await storage.procesos.getProcesoLawyers(procesoId);
      const firmIds = /* @__PURE__ */ new Set();
      const notifiedLawyerIds = /* @__PURE__ */ new Set();
      for (const lawyer of lawyers) {
        await notificacionesService.notifyLawyer(lawyer.lawyerId, procesoId, titulo, mensaje, tipo);
        notifiedLawyerIds.add(lawyer.lawyerId);
        const profile = await storage.lawyerProfiles.getLawyer(lawyer.lawyerId);
        if (profile?.firmId) firmIds.add(profile.firmId);
      }
      if (proceso.responsable?.id && !notifiedLawyerIds.has(proceso.responsable.id)) {
        await notificacionesService.notifyLawyer(proceso.responsable.id, procesoId, titulo, mensaje, tipo);
        const profile = await storage.lawyerProfiles.getLawyer(proceso.responsable.id);
        if (profile?.firmId) firmIds.add(profile.firmId);
      }
      for (const firmId of firmIds) {
        await notificacionesService.notifyFirm(firmId, procesoId, titulo, mensaje, tipo);
      }
    } catch (e) {
      console.error("Error creating notification for documento:", e);
    }
    return documento;
  }
  async deleteDocumento(id) {
    return storage.documentos.deleteDocumento(id);
  }
  // ── Tipos de Proceso ─────────────────────────────────────────────────────────
  async getTiposProceso() {
    return storage.tiposProceso.getTiposProceso();
  }
  async createTipoProceso(tipo) {
    return storage.tiposProceso.createTipoProceso(tipo);
  }
  async updateTipoProceso(id, updates) {
    return storage.tiposProceso.updateTipoProceso(id, updates);
  }
  async deleteTipoProceso(id) {
    return storage.tiposProceso.deleteTipoProceso(id);
  }
  // ── Estados de Proceso ───────────────────────────────────────────────────────
  async getEstadosProceso() {
    return storage.estadosProceso.getEstadosProceso();
  }
  async createEstado(estado) {
    return storage.estadosProceso.createEstadoProceso(estado);
  }
};
var procesosService = new ProcesosService();

// server/services/auth.service.ts
import { eq as eq59 } from "drizzle-orm";
init_schema();
var permisosCache2 = /* @__PURE__ */ new Map();
var AuthService = class {
  async getRoles() {
    return db.query.roles.findMany();
  }
  async getRol(id) {
    return db.query.roles.findFirst({ where: eq59(roles.id, id) });
  }
  async getRolByNombre(nombre) {
    return db.query.roles.findFirst({ where: eq59(roles.nombre, nombre) });
  }
  async createRol(rol) {
    await db.insert(roles).values(rol);
    const created = await db.query.roles.findFirst({
      where: eq59(roles.nombre, rol.nombre)
    });
    if (!created) throw new Error("Failed to create role");
    return created;
  }
  async deleteRol(id) {
    await db.transaction(async (tx) => {
      await tx.delete(rolesPermisos).where(eq59(rolesPermisos.rolId, id));
      await tx.delete(roles).where(eq59(roles.id, id));
    });
  }
  async getPermisos() {
    const permisosRaw = await db.query.permisos.findMany();
    return permisosRaw.map((p) => ({
      ...p,
      modulo: p.codigo.split(".")[0]
    }));
  }
  async getModulos() {
    try {
      return await db.select().from(modulos).execute();
    } catch (e) {
      console.warn("modulos table not found:", e);
      return [];
    }
  }
  async getPermisosByRol(rolId) {
    const cacheKey = `rol_${rolId}`;
    if (permisosCache2.has(cacheKey)) {
      return permisosCache2.get(cacheKey);
    }
    const result = await db.query.rolesPermisos.findMany({
      where: eq59(rolesPermisos.rolId, rolId),
      with: { permiso: true }
    });
    const permisosList = result.filter((rp) => rp.permiso.activo).map((rp) => rp.permiso.codigo);
    permisosCache2.set(cacheKey, permisosList);
    return permisosList;
  }
};
var authService = new AuthService();

// server/routes/clientes.ts
init_email_service();
var registerClienteNaturalSchema = z4.object({
  correo: z4.string().email("Correo inv\xE1lido"),
  password: z4.string().min(8, "Contrase\xF1a m\xEDnimo 8 caracteres"),
  nombre: z4.string().min(1, "El nombre es requerido").max(100),
  apellido: z4.string().min(1, "El apellido es requerido").max(100),
  documento: z4.string().min(1, "El documento es requerido").max(50),
  tipoDocumentoId: z4.number().int().positive().optional(),
  telefono: z4.string().max(30).optional(),
  direccion: z4.string().max(255).optional(),
  departamentoId: z4.string().optional(),
  municipioId: z4.string().optional(),
  abogadoId: z4.string().uuid().optional()
});
var registerEmpresaSchema = z4.object({
  correo: z4.string().email("Correo inv\xE1lido"),
  password: z4.string().min(8, "Contrase\xF1a m\xEDnimo 8 caracteres"),
  razonSocial: z4.string().min(1, "La raz\xF3n social es requerida").max(200),
  nit: z4.string().min(1, "El NIT es requerido").max(50),
  sector: z4.string().max(100).optional(),
  abogadoId: z4.string().uuid().optional(),
  // representante legal
  repNombre: z4.string().max(100).optional(),
  repApellido: z4.string().max(100).optional(),
  repDocumento: z4.string().max(50).optional(),
  repTipoDocumentoId: z4.number().int().positive().optional(),
  repCargo: z4.string().max(100).optional(),
  repEmail: z4.string().email().optional().or(z4.literal("")),
  repTelefono: z4.string().max(30).optional()
});
var router3 = Router3();
async function queueEmailVerification2(email, userId2) {
  const code = await storage.otps.createEmailVerificationOtp(userId2);
  sendEmailVerificationOtp(email, code).catch((err) => {
    console.error("[email-verification] email send error:", err);
  });
}
router3.get("/clientes", authenticate, requirePermission("clientes.ver"), async (req, res, next) => {
  try {
    const user = req.user;
    const { limit, offset, search } = req.query;
    const idProfile = user?.idProfile;
    if (!idProfile || typeof idProfile !== "string") {
      return res.status(400).json({ error: "Perfil de usuario no encontrado" });
    }
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const filter = { search };
    const result = user?.rol?.nombre === "bufete" ? await clientesService.getClientesByFirm(idProfile, limitNum, offsetNum, filter) : await clientesService.getClientes(idProfile, limitNum, offsetNum, filter);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
router3.get("/clientes/:id", authenticate, requirePermission("clientes.ver"), async (req, res, next) => {
  try {
    const user = req.user;
    const clienteId = req.params.id;
    const rol = user?.rol?.nombre;
    const idProfile = user?.idProfile;
    if (rol === "abogado") {
      const relations41 = await storage.lawyerClients.getClientLawyers(clienteId);
      const hasAccess = relations41.some((r) => r.lawyerId === idProfile);
      if (!hasAccess) return res.status(403).json({ error: "No tienes acceso a este cliente" });
    } else if (rol === "bufete") {
      const firmClientIds = await storage.firmClients.getActiveClientIdsByFirm(idProfile);
      if (!firmClientIds.includes(clienteId)) return res.status(403).json({ error: "No tienes acceso a este cliente" });
    } else if (rol === "cliente") {
      const propioCliente = await storage.clientes.getClienteByUser(user.id);
      if (!propioCliente || propioCliente.id !== clienteId) return res.status(403).json({ error: "No tienes acceso a este cliente" });
    }
    const cliente = await clientesService.getCliente(clienteId);
    if (!cliente) return res.status(404).json({ error: "Cliente not found" });
    res.json(cliente);
  } catch (err) {
    next(err);
  }
});
router3.post("/clientes", authenticate, requirePermission("clientes.crear"), async (req, res, next) => {
  try {
    const user = req.user;
    const {
      password,
      correo,
      tipo = "natural",
      repNombre,
      repApellido,
      repDocumento,
      repTipoDocumentoId,
      repCargo,
      repEmail,
      repTelefono,
      repDireccion,
      repDepartamentoId,
      repMunicipioId,
      ...rest
    } = req.body;
    const isFirm = user?.rol?.nombre === "bufete";
    const lawyerId = isFirm ? void 0 : user.idProfile;
    const firmId = isFirm ? user.idProfile : void 0;
    let representanteLegalId;
    if (tipo === "empresa" && repNombre && repDocumento) {
      const persona = await storage.personas.createPersona({
        nombre: repNombre,
        apellido: repApellido || "",
        telefono: repTelefono || "",
        documento: repDocumento,
        tipoDocumentoId: repTipoDocumentoId || 1,
        direccion: repDireccion || null,
        departamentoId: repDepartamentoId || null,
        municipioId: repMunicipioId || null
      });
      const rep = await storage.representantesLegales.createRepresentante({
        personaId: persona.id,
        cargo: repCargo || "Representante Legal",
        email: repEmail || correo || ""
      });
      representanteLegalId = rep.id;
    }
    const limitCheck = await subscriptionService.checkLimit(user.id, "clientes");
    if (!limitCheck.permitido) {
      return res.status(402).json({
        error: "LIMIT_REACHED",
        tipo: "clientes",
        actual: limitCheck.actual,
        maximo: limitCheck.maximo,
        mensaje: "Has alcanzado el l\xEDmite de clientes de tu plan. Actualiza para continuar."
      });
    }
    const newCliente = await clientesService.createCliente(
      {
        ...rest,
        // Security: hardcoded fields must come AFTER ...rest so they cannot be overridden
        tipo,
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        activo: true,
        fechaCreacion: /* @__PURE__ */ new Date(),
        ...tipo === "empresa" && representanteLegalId ? { representanteLegalId } : {}
      },
      password,
      correo ?? `${rest.documento ?? rest.nit}@temp.com`,
      lawyerId,
      firmId,
      {
        rolNombre: user?.rol?.nombre,
        actorId: user?.idProfile,
        esPrivadoSolicitado: req.body.esPrivado === true,
        userId: user?.id
      }
    );
    await subscriptionService.incrementUsage(user.id, "clientes");
    res.status(201).json(newCliente);
  } catch (err) {
    next(err);
  }
});
router3.get("/cliente/me", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const cliente = await storage.clientes.getClienteByUser(user.id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
    if (cliente.tipo === "empresa" && cliente.empresa?.representanteLegalId) {
      const rep = await storage.representantesLegales.getRepresentante(cliente.empresa.representanteLegalId);
      const clienteConRep = {
        ...cliente,
        empresa: { ...cliente.empresa, representanteLegal: rep ?? null }
      };
      return res.json(clienteConRep);
    }
    res.json(cliente);
  } catch (err) {
    next(err);
  }
});
router3.put("/cliente/me", authenticate, async (req, res, next) => {
  try {
    const { hashPassword: hashPassword2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
    const authUser = req.user;
    const cliente = await storage.clientes.getClienteByUser(authUser.id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
    const { correo, password, currentPassword, repNombre, repApellido, repTelefono, repDocumento, repTipoDocumentoId, repCargo, repEmail, repDireccion, repDepartamentoId, repMunicipioId, ...rest } = req.body;
    if (correo || password) {
      const userUpdates = {};
      let passwordChanged = false;
      if (correo) userUpdates.email = correo;
      if (password) {
        if (!currentPassword) {
          return res.status(400).json({ error: "Debes ingresar tu contrase\xF1a actual para cambiarla." });
        }
        const { verifyPassword: verifyPassword2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
        const user = await storage.getUserById(authUser.id);
        const valid = await verifyPassword2(currentPassword, user?.passwordHash || "");
        if (!valid) {
          return res.status(401).json({ error: "La contrase\xF1a actual es incorrecta." });
        }
        userUpdates.passwordHash = await hashPassword2(password);
        passwordChanged = true;
      }
      await storage.users.updateUser(authUser.id, userUpdates);
      if (passwordChanged) {
        await storage.sessions.revokeAllForUser(authUser.id);
      }
    }
    if (cliente.tipo === "empresa") {
      if (cliente.empresa?.representanteLegalId) {
        const repId = cliente.empresa.representanteLegalId;
        const repUpdates = {};
        if (repCargo !== void 0) repUpdates.cargo = repCargo;
        if (repEmail !== void 0) repUpdates.email = repEmail;
        if (Object.keys(repUpdates).length > 0) {
          await storage.representantesLegales.updateRepresentante(repId, repUpdates);
        }
        const rep = await storage.representantesLegales.getRepresentante(repId);
        if (rep?.personaId) {
          const personaUpdates = {};
          if (repNombre !== void 0) personaUpdates.nombre = repNombre;
          if (repApellido !== void 0) personaUpdates.apellido = repApellido;
          if (repTelefono !== void 0) personaUpdates.telefono = repTelefono;
          if (repDocumento !== void 0) personaUpdates.documento = repDocumento;
          if (repTipoDocumentoId !== void 0) personaUpdates.tipoDocumentoId = repTipoDocumentoId;
          if (repDireccion !== void 0) personaUpdates.direccion = repDireccion;
          if (repDepartamentoId !== void 0) personaUpdates.departamentoId = repDepartamentoId;
          if (repMunicipioId !== void 0) personaUpdates.municipioId = repMunicipioId;
          if (Object.keys(personaUpdates).length > 0) {
            await storage.personas.updatePersona(rep.personaId, personaUpdates);
          }
        }
      } else if (repNombre && repDocumento) {
        const persona = await storage.personas.createPersona({
          nombre: repNombre,
          apellido: repApellido || "",
          telefono: repTelefono || "",
          documento: repDocumento,
          tipoDocumentoId: repTipoDocumentoId || 1,
          direccion: repDireccion || null,
          departamentoId: repDepartamentoId || null,
          municipioId: repMunicipioId || null
        });
        const rep = await storage.representantesLegales.createRepresentante({
          personaId: persona.id,
          cargo: repCargo || "Representante Legal",
          email: repEmail || correo || ""
        });
        rest.representanteLegalId = rep.id;
      }
    }
    const updated = await storage.clientes.updateCliente(cliente.id, rest);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
router3.put("/clientes/:id", authenticate, requirePermission("clientes.editar"), async (req, res, next) => {
  try {
    const user = req.user;
    const id = req.params.id;
    const {
      correo,
      password,
      repNombre,
      repApellido,
      repDocumento,
      repTipoDocumentoId,
      repCargo,
      repEmail,
      repTelefono,
      repDireccion,
      repDepartamentoId,
      repMunicipioId,
      // Campos permitidos explícitamente (evita mass assignment)
      nombre,
      apellido,
      telefono,
      direccion,
      departamentoId,
      municipioId,
      documento,
      tipoDocumentoId,
      razonSocial,
      nit,
      sector
    } = req.body;
    const allowedUpdates = {};
    if (nombre !== void 0) allowedUpdates.nombre = nombre;
    if (apellido !== void 0) allowedUpdates.apellido = apellido;
    if (telefono !== void 0) allowedUpdates.telefono = telefono;
    if (direccion !== void 0) allowedUpdates.direccion = direccion;
    if (departamentoId !== void 0) allowedUpdates.departamentoId = departamentoId;
    if (municipioId !== void 0) allowedUpdates.municipioId = municipioId;
    if (documento !== void 0) allowedUpdates.documento = documento;
    if (tipoDocumentoId !== void 0) allowedUpdates.tipoDocumentoId = tipoDocumentoId;
    if (razonSocial !== void 0) allowedUpdates.razonSocial = razonSocial;
    if (nit !== void 0) allowedUpdates.nit = nit;
    if (sector !== void 0) allowedUpdates.sector = sector;
    const cliente = await storage.clientes.getCliente(id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
    const idProfile = user?.idProfile;
    const rol = user?.rol?.nombre;
    if (rol === "abogado") {
      const relations41 = await storage.lawyerClients.getClientLawyers(id);
      const hasAccess = relations41.some((r) => r.lawyerId === idProfile);
      if (!hasAccess) return res.status(403).json({ error: "No tienes acceso a este cliente" });
    } else if (rol === "bufete") {
      const firmClientIds = await storage.firmClients.getActiveClientIdsByFirm(idProfile);
      if (!firmClientIds.includes(id)) return res.status(403).json({ error: "No tienes acceso a este cliente" });
    }
    if (correo || password) {
      const { hashPassword: hashPassword2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
      const userUpdates = {};
      let passwordChanged = false;
      if (correo) userUpdates.email = correo;
      if (password) {
        userUpdates.passwordHash = await hashPassword2(password);
        passwordChanged = true;
      }
      await storage.users.updateUser(cliente.userId, userUpdates);
      if (passwordChanged) {
        await storage.sessions.revokeAllForUser(cliente.userId);
      }
    }
    if (cliente.tipo === "empresa") {
      if (cliente.empresa?.representanteLegalId) {
        const repId = cliente.empresa.representanteLegalId;
        const repUpdates = {};
        if (repCargo !== void 0) repUpdates.cargo = repCargo;
        if (repEmail !== void 0) repUpdates.email = repEmail;
        if (Object.keys(repUpdates).length > 0) {
          await storage.representantesLegales.updateRepresentante(repId, repUpdates);
        }
        const rep = await storage.representantesLegales.getRepresentante(repId);
        if (rep?.personaId) {
          const personaUpdates = {};
          if (repNombre !== void 0) personaUpdates.nombre = repNombre;
          if (repApellido !== void 0) personaUpdates.apellido = repApellido;
          if (repTelefono !== void 0) personaUpdates.telefono = repTelefono;
          if (repDocumento !== void 0) personaUpdates.documento = repDocumento;
          if (repTipoDocumentoId !== void 0) personaUpdates.tipoDocumentoId = repTipoDocumentoId;
          if (repDireccion !== void 0) personaUpdates.direccion = repDireccion;
          if (repDepartamentoId !== void 0) personaUpdates.departamentoId = repDepartamentoId;
          if (repMunicipioId !== void 0) personaUpdates.municipioId = repMunicipioId;
          if (Object.keys(personaUpdates).length > 0) {
            await storage.personas.updatePersona(rep.personaId, personaUpdates);
          }
        }
      } else if (repNombre && repDocumento) {
        const persona = await storage.personas.createPersona({
          nombre: repNombre,
          apellido: repApellido || "",
          telefono: repTelefono || "",
          documento: repDocumento,
          tipoDocumentoId: repTipoDocumentoId || 1,
          direccion: repDireccion || null,
          departamentoId: repDepartamentoId || null,
          municipioId: repMunicipioId || null
        });
        const rep = await storage.representantesLegales.createRepresentante({
          personaId: persona.id,
          cargo: repCargo || "Representante Legal",
          email: repEmail || correo || ""
        });
        allowedUpdates.representanteLegalId = rep.id;
      }
    }
    const updated = await storage.clientes.updateCliente(id, allowedUpdates);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
router3.post("/register/cliente", registerRateLimiter, validate(registerClienteNaturalSchema), async (req, res, next) => {
  try {
    const {
      nombre,
      apellido,
      telefono,
      correo,
      documento,
      tipoDocumentoId,
      direccion,
      password,
      abogadoId,
      departamentoId,
      municipioId
    } = req.body;
    const existing = await storage.getUserByEmail(correo);
    if (existing) return res.status(400).json({ message: "No fue posible completar el registro. Verifica los datos ingresados." });
    const cliente = await clientesService.createCliente(
      {
        tipo: "natural",
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        activo: true,
        fechaCreacion: /* @__PURE__ */ new Date(),
        nombre,
        apellido,
        telefono: telefono || "",
        documento,
        tipoDocumentoId: tipoDocumentoId || 1,
        direccion: direccion || null,
        departamentoId: departamentoId || null,
        municipioId: municipioId || null
      },
      password,
      correo,
      abogadoId
    );
    await storage.users.updateUser(cliente.userId, { emailVerified: false });
    await queueEmailVerification2(correo, cliente.userId);
    res.status(201).json({
      message: "Cliente creado exitosamente. Verifica tu correo para activar el acceso.",
      requiresEmailVerification: true,
      email: correo,
      data: cliente
    });
  } catch (error) {
    next(error);
  }
});
router3.post("/register/empresa", registerRateLimiter, validate(registerEmpresaSchema), async (req, res, next) => {
  try {
    const {
      razonSocial,
      nit,
      sector,
      correo,
      password,
      abogadoId,
      // representante legal
      repNombre,
      repApellido,
      repDocumento,
      repTipoDocumentoId,
      repCargo,
      repEmail,
      repTelefono
    } = req.body;
    const existing = await storage.getUserByEmail(correo);
    if (existing) return res.status(400).json({ message: "No fue posible completar el registro. Verifica los datos ingresados." });
    let representanteLegalId;
    if (repNombre && repDocumento) {
      const persona = await storage.personas.createPersona({
        nombre: repNombre,
        apellido: repApellido,
        telefono: repTelefono || "",
        documento: repDocumento,
        tipoDocumentoId: repTipoDocumentoId || 1
      });
      const rep = await storage.representantesLegales.createRepresentante({
        personaId: persona.id,
        cargo: repCargo || "Representante Legal",
        email: repEmail || correo
      });
      representanteLegalId = rep.id;
    }
    const cliente = await clientesService.createCliente(
      {
        tipo: "empresa",
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        activo: true,
        fechaCreacion: /* @__PURE__ */ new Date(),
        razonSocial,
        nit,
        sector: sector || null,
        representanteLegalId: representanteLegalId || null
      },
      password,
      correo,
      abogadoId
    );
    await storage.users.updateUser(cliente.userId, { emailVerified: false });
    await queueEmailVerification2(correo, cliente.userId);
    res.status(201).json({
      message: "Empresa registrada exitosamente. Verifica tu correo para activar el acceso.",
      requiresEmailVerification: true,
      email: correo,
      data: cliente
    });
  } catch (error) {
    next(error);
  }
});
router3.post("/register/client", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const { correo, password, tipo = "natural", ...rest } = req.body;
    if (!correo || !password) {
      return res.status(400).json({ message: "Correo y password son obligatorios" });
    }
    const isFirm = user?.rol?.nombre === "bufete";
    const lawyerId = isFirm ? void 0 : user.idProfile;
    const firmId = isFirm ? user.idProfile : void 0;
    const cliente = await clientesService.createCliente(
      {
        tipo,
        id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        activo: true,
        fechaCreacion: /* @__PURE__ */ new Date(),
        tipoDocumentoId: rest.tipoDocumentoId || 1,
        departamentoId: rest.departamentoId || null,
        municipioId: rest.municipioId || null,
        ...rest
      },
      password,
      correo,
      lawyerId,
      firmId
    );
    res.status(201).json({ message: "Cliente registrado exitosamente", data: cliente });
  } catch (error) {
    next(error);
  }
});
var clientes_default = router3;

// server/routes/procesos.ts
init_auth();
init_database_storage();
init_tipo_asignacion_schema();
import { Router as Router4 } from "express";
import { randomUUID as randomUUID35 } from "crypto";

// server/services/tarea.service.ts
init_database_storage();
init_http_exception();
var TaskSubtasksPendingError = class extends Error {
  constructor(tareaTitulo, subtareasPendientes) {
    super("No se puede completar la tarea mientras existan subtareas pendientes");
    this.tareaTitulo = tareaTitulo;
    this.subtareasPendientes = subtareasPendientes;
    this.status = 422;
    this.code = "SUBTASKS_PENDING";
    this.name = "TaskSubtasksPendingError";
  }
};
var ALLOWED_TRANSITIONS = {
  pendiente: ["en_progreso", "completada", "cancelada"],
  en_progreso: ["pendiente", "completada", "cancelada"],
  completada: ["en_progreso", "cancelada"],
  cancelada: []
};
async function resolveCaller(userId2) {
  const lawyerProfile = await storage.abogados.getLawyerByUserId(userId2);
  if (lawyerProfile) {
    const lawyer = await storage.abogados.getLawyer(lawyerProfile.id);
    const nombre = lawyer?.persona ? `${lawyer.persona.nombre ?? ""} ${lawyer.persona.apellido ?? ""}`.trim() : "";
    return { id: lawyerProfile.id, nombre, type: "lawyer" };
  }
  const firm = await storage.firmProfiles.getFirmProfileByUserId(userId2);
  if (firm) {
    return { id: firm.id, nombre: firm.name, type: "firm" };
  }
  throw HttpException.notFound("Perfil no encontrado");
}
async function resolveProfileName(profileId) {
  const lawyer = await storage.abogados.getLawyer(profileId);
  if (lawyer) {
    return lawyer.persona ? `${lawyer.persona.nombre ?? ""} ${lawyer.persona.apellido ?? ""}`.trim() : null;
  }
  const firm = await storage.firmProfiles.getFirmProfileById(profileId);
  return firm?.name ?? null;
}
async function assertProcesoAccess(procesoId, caller) {
  const members = await storage.procesos.getProcesoLawyers(procesoId);
  const memberIds = new Set(members.map((l) => l.lawyerId));
  if (caller.type === "lawyer") {
    if (memberIds.has(caller.id)) return;
    const resp = await isResponsable(procesoId, caller.id);
    if (!resp) throw HttpException.forbidden("No tienes acceso a este proceso");
    return;
  }
  if (memberIds.has(caller.id)) return;
  const firmLawyers = await storage.abogados.getLawyersByFirm(caller.id);
  const hasMember = firmLawyers.some((l) => memberIds.has(l.id));
  if (!hasMember) {
    throw HttpException.forbidden("No tienes acceso a este proceso");
  }
}
async function isResponsable(procesoId, profileId) {
  const proceso = await storage.procesos.getProceso(procesoId);
  return proceso?.responsable?.id === profileId;
}
var TareaService = class {
  // ── Create ─────────────────────────────────────────────────────────────────
  async createTarea(procesoId, dto, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const proceso = await storage.procesos.getProceso(procesoId);
    if (!proceso) throw HttpException.notFound("Proceso no encontrado");
    await assertProcesoAccess(procesoId, caller);
    let asignadoANombre = null;
    if (dto.asignadoA) {
      const lawyers = await storage.procesos.getProcesoLawyers(procesoId);
      const isMember = lawyers.some((l) => l.lawyerId === dto.asignadoA);
      if (!isMember) {
        throw HttpException.badRequest("El perfil asignado no pertenece a este proceso");
      }
      if (dto.asignadoA !== caller.id) {
        const canAssign = await isResponsable(procesoId, caller.id);
        if (!canAssign) {
          throw HttpException.forbidden("Solo el responsable puede asignar tareas a otros");
        }
      }
      asignadoANombre = await resolveProfileName(dto.asignadoA);
    }
    const tarea = await storage.tareas.create({
      procesoId,
      titulo: dto.titulo,
      descripcion: dto.descripcion ?? null,
      prioridad: dto.prioridad ?? "media",
      fechaLimite: dto.fechaLimite ? new Date(dto.fechaLimite) : null,
      asignadoA: dto.asignadoA ?? null,
      asignadoANombre,
      creadoPor: caller.id,
      creadoPorNombre: caller.nombre,
      legalStage: dto.legalStage ?? null,
      requerida: dto.requerida ? 1 : 0
    });
    storage.tareaExtensions.addHistorial(tarea.id, caller.id, caller.nombre ?? "", "creada").catch(() => {
    });
    (async () => {
      const lawlerId = proceso.responsable?.id ?? (caller.type === "lawyer" ? caller.id : null);
      let firmId = null;
      if (lawlerId) {
        const lawyer = await storage.abogados.getLawyer(lawlerId);
        firmId = lawyer?.firmId ?? null;
      }
      await notificacionesService.onTareaCreada({
        procesoId,
        procoNombre: proceso.radicado,
        tareaTitle: dto.titulo,
        lawlerId,
        creadoPorNombre: caller.nombre,
        firmId
      });
    })().catch(() => {
    });
    return tarea;
  }
  // ── List by proceso ────────────────────────────────────────────────────────
  async getTareasByProceso(procesoId, callerUserId, stage) {
    const caller = await resolveCaller(callerUserId);
    await assertProcesoAccess(procesoId, caller);
    const tareas2 = await storage.tareas.findByProceso(procesoId, stage);
    const active = tareas2.filter((t) => t.estado !== "cancelada");
    const completadas = active.filter((t) => t.estado === "completada").length;
    const total = active.length;
    return {
      tareas: tareas2,
      progreso: {
        total,
        completadas,
        porcentaje: total === 0 ? 0 : Math.round(completadas / total * 100)
      }
    };
  }
  // ── My tasks ───────────────────────────────────────────────────────────────
  async getMisTareas(callerUserId) {
    const caller = await resolveCaller(callerUserId);
    return storage.tareas.findByLawyer(caller.id);
  }
  // ── Update ─────────────────────────────────────────────────────────────────
  async updateTarea(tareaId, dto, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    if (tarea.estado === "completada") {
      throw HttpException.unprocessable("Una tarea completada no puede modificarse");
    }
    if (tarea.estado === "cancelada") {
      throw HttpException.unprocessable("Una tarea cancelada no puede modificarse");
    }
    if (tarea.fechaLimite && new Date(tarea.fechaLimite) < /* @__PURE__ */ new Date()) {
      throw HttpException.unprocessable("La fecha l\xEDmite de la tarea ya venci\xF3, no se puede modificar");
    }
    await assertProcesoAccess(tarea.procesoId, caller);
    if (caller.type === "lawyer" && tarea.creadoPor !== caller.id) {
      throw HttpException.forbidden("Solo puedes modificar las tareas que creaste");
    }
    let asignadoANombre = tarea.asignadoANombre;
    if (dto.asignadoA !== void 0) {
      if (dto.asignadoA && dto.asignadoA !== caller.id) {
        const canAssign = await isResponsable(tarea.procesoId, caller.id);
        if (!canAssign) {
          throw HttpException.forbidden("Solo el responsable puede reasignar tareas a otros");
        }
      }
      asignadoANombre = dto.asignadoA ? await resolveProfileName(dto.asignadoA) : null;
    }
    const updated = await storage.tareas.update(tareaId, {
      ...dto.titulo !== void 0 && { titulo: dto.titulo },
      ...dto.descripcion !== void 0 && { descripcion: dto.descripcion },
      ...dto.prioridad !== void 0 && { prioridad: dto.prioridad },
      ...dto.fechaLimite !== void 0 && { fechaLimite: dto.fechaLimite ? new Date(dto.fechaLimite) : null },
      ...dto.asignadoA !== void 0 && { asignadoA: dto.asignadoA, asignadoANombre },
      ...dto.tiempoEstimado !== void 0 && { tiempoEstimado: dto.tiempoEstimado != null ? String(dto.tiempoEstimado) : null },
      ...dto.tiempoUnidad !== void 0 && { tiempoUnidad: dto.tiempoUnidad ?? null }
    });
    storage.tareaExtensions.addHistorial(tareaId, caller.id, caller.nombre ?? "", "actualizada").catch(() => {
    });
    return updated;
  }
  // ── Change estado ──────────────────────────────────────────────────────────
  async cambiarEstado(tareaId, dto, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    await assertProcesoAccess(tarea.procesoId, caller);
    if (caller.type === "lawyer" && tarea.creadoPor !== caller.id) {
      if (dto.estado === "en_progreso" || tarea.asignadoA === caller.id) {
      } else {
        const resp = await isResponsable(tarea.procesoId, caller.id);
        if (!resp) {
          throw HttpException.forbidden("Solo puedes cambiar el estado de las tareas que creaste");
        }
        if (dto.estado !== "completada") {
          throw HttpException.forbidden("El responsable solo puede marcar tareas como completadas");
        }
      }
    }
    const current = tarea.estado;
    const allowed = ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(dto.estado)) {
      throw HttpException.unprocessable(
        `No se puede cambiar de '${current}' a '${dto.estado}'`
      );
    }
    if (dto.estado === "completada" && tarea.asignadoA !== null) {
      if (caller.id !== tarea.asignadoA) {
        throw HttpException.unprocessable(
          `No se puede completar la tarea ya que no esta asignada a usted, la tarea pertenece a ${tarea.asignadoANombre}`
        );
      }
    }
    if (dto.estado === "completada") {
      const subtareas = await storage.tareaExtensions.getSubtareas(tareaId);
      const subtareasPendientes = subtareas.filter((sub) => sub.estado !== "completada");
      if (subtareasPendientes.length > 0) {
        throw new TaskSubtasksPendingError(
          tarea.titulo,
          subtareasPendientes.map((sub) => ({
            id: sub.id,
            titulo: sub.titulo,
            estado: sub.estado
          }))
        );
      }
    }
    const fechaCompletada = dto.estado === "completada" ? /* @__PURE__ */ new Date() : null;
    await storage.tareas.updateEstado(tareaId, dto.estado, fechaCompletada);
    storage.tareaExtensions.addHistorial(
      tareaId,
      caller.id,
      caller.nombre ?? "",
      "estado_cambiado",
      `De '${current}' a '${dto.estado}'`
    ).catch(() => {
    });
    if (dto.estado === "en_progreso") {
      await storage.tareas.update(tareaId, {
        asignadoA: caller.id,
        asignadoANombre: caller.nombre
      });
    }
    if (dto.estado === "completada") {
      try {
        const actualizacion = {
          procesoId: tarea.procesoId,
          titulo: tarea.titulo,
          fecha: /* @__PURE__ */ new Date(),
          descripcion: tarea.descripcion ?? "",
          tipoId: 3,
          tipo: "tarea"
        };
        await storage.createActualizacion(actualizacion);
      } catch (err) {
        console.error("Error creating actualizacion for task completion:", err);
      }
      if (tarea.legalStage) {
        try {
          await storage.stageEvents.insert({
            procesoId: tarea.procesoId,
            legalStageCode: tarea.legalStage,
            tipo: "tarea_completada",
            descripcion: `Tarea completada: ${tarea.titulo}`,
            metadatos: { tareaId: tarea.id, titulo: tarea.titulo },
            creadoPor: caller.id
          });
        } catch (err) {
          console.error("Error creating stage event for task completion:", err);
        }
      }
      (async () => {
        const responsableLawyer = caller.type === "lawyer" ? await storage.abogados.getLawyer(caller.id) : null;
        const firmId = responsableLawyer?.firmId ?? null;
        const proceso = await storage.procesos.getProceso(tarea.procesoId);
        await Promise.all([
          notificacionesService.onTareaCompletada({
            procesoId: tarea.procesoId,
            tareaTitle: tarea.titulo,
            creadoPorId: tarea.creadoPor,
            responsableNombre: caller.nombre,
            firmId
          }),
          proceso?.clienteId ? notificacionesService.notifyCliente(
            proceso.clienteId,
            tarea.procesoId,
            "Nuevo avance en tu proceso",
            `Se agrego el nuevo avance:"${tarea.titulo}" a tu proceso`,
            "Avance completado"
          ) : Promise.resolve()
        ]);
      })().catch(() => {
      });
    }
    return await storage.tareas.findById(tareaId);
  }
  // ── Completar (shorthand) ──────────────────────────────────────────────────
  async completarTarea(tareaId, callerUserId) {
    return this.cambiarEstado(tareaId, { estado: "completada" }, callerUserId);
  }
  // ── Count by lawyer ────────────────────────────────────────────────────────
  async countByLawyer(lawyerId) {
    return storage.tareas.countByLawyer(lawyerId);
  }
  // ── Observaciones ──────────────────────────────────────────────────────────
  async getObservaciones(tareaId, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    await assertProcesoAccess(tarea.procesoId, caller);
    return storage.tareaExtensions.getObservaciones(tareaId);
  }
  async addObservacion(tareaId, dto, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    await assertProcesoAccess(tarea.procesoId, caller);
    if (tarea.estado !== "en_progreso") {
      throw HttpException.unprocessable("Solo se pueden agregar observaciones a tareas en progreso");
    }
    const obs = await storage.tareaExtensions.addObservacion(tareaId, caller.id, caller.nombre ?? "", dto.contenido);
    storage.tareaExtensions.addHistorial(tareaId, caller.id, caller.nombre ?? "", "observacion_agregada").catch(() => {
    });
    return obs;
  }
  // ── Subtareas ──────────────────────────────────────────────────────────────
  async getSubtareas(tareaId, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    await assertProcesoAccess(tarea.procesoId, caller);
    return storage.tareaExtensions.getSubtareas(tareaId);
  }
  async addSubtarea(tareaId, dto, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    if (tarea.estado === "completada") throw HttpException.unprocessable("No se pueden agregar subtareas a una tarea completada");
    if (tarea.estado === "cancelada") throw HttpException.unprocessable("No se pueden agregar subtareas a una tarea cancelada");
    await assertProcesoAccess(tarea.procesoId, caller);
    const sub = await storage.tareaExtensions.addSubtarea(tareaId, dto, caller.id, caller.nombre ?? "");
    storage.tareaExtensions.addHistorial(tareaId, caller.id, caller.nombre ?? "", "subtarea_agregada", dto.titulo).catch(() => {
    });
    return sub;
  }
  async updateSubtarea(tareaId, subtareaId, dto, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    await assertProcesoAccess(tarea.procesoId, caller);
    const updated = await storage.tareaExtensions.updateSubtarea(subtareaId, dto, caller.id);
    if (!updated) throw HttpException.notFound("Subtarea no encontrada");
    if (dto.estado === "completada") {
      storage.tareaExtensions.addHistorial(tareaId, caller.id, caller.nombre ?? "", "subtarea_completada", updated.titulo).catch(() => {
      });
    }
    return updated;
  }
  async deleteSubtarea(tareaId, subtareaId, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    await assertProcesoAccess(tarea.procesoId, caller);
    await storage.tareaExtensions.deleteSubtarea(subtareaId);
  }
  // ── Historial ──────────────────────────────────────────────────────────────
  async getHistorial(tareaId, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    await assertProcesoAccess(tarea.procesoId, caller);
    return storage.tareaExtensions.getHistorial(tareaId);
  }
  // ── Archivos ───────────────────────────────────────────────────────────────
  async getArchivos(tareaId, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    await assertProcesoAccess(tarea.procesoId, caller);
    return storage.tareaExtensions.getArchivos(tareaId);
  }
  async addArchivo(tareaId, nombre, url2, mimeType, tamano, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    if (tarea.estado === "completada") throw HttpException.unprocessable("No se pueden agregar archivos a una tarea completada");
    if (tarea.estado === "cancelada") throw HttpException.unprocessable("No se pueden agregar archivos a una tarea cancelada");
    await assertProcesoAccess(tarea.procesoId, caller);
    const archivo = await storage.tareaExtensions.addArchivo(tareaId, nombre, url2, mimeType, tamano, caller.id);
    storage.tareaExtensions.addHistorial(tareaId, caller.id, caller.nombre ?? "", "archivo_adjuntado", nombre).catch(() => {
    });
    return archivo;
  }
  async deleteArchivo(tareaId, archivoId, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    await assertProcesoAccess(tarea.procesoId, caller);
    const archivo = await storage.tareaExtensions.findArchivo(archivoId);
    if (!archivo) throw HttpException.notFound("Archivo no encontrado");
    await storage.tareaExtensions.deleteArchivo(archivoId);
    return archivo.url;
  }
  // ── Delete ─────────────────────────────────────────────────────────────────
  async deleteTarea(tareaId, callerUserId) {
    const caller = await resolveCaller(callerUserId);
    const tarea = await storage.tareas.findRawById(tareaId);
    if (!tarea) throw HttpException.notFound("Tarea no encontrada");
    if (tarea.creadoPor !== caller.id) {
      throw HttpException.forbidden("Solo el creador puede eliminar la tarea");
    }
    if (tarea.estado === "en_progreso") {
      throw HttpException.badRequest("No se puede eliminar una tarea que ya est\xE1 en progreso");
    }
    await storage.tareas.softDelete(tareaId);
  }
};
var tareaService = new TareaService();

// server/routes/procesos.ts
var PERMISSION_RANK = {
  ver: 1,
  comentar: 2,
  editar: 3
};
var router4 = Router4();
async function assertProcesoAccess2(req, res, procesoId) {
  const user = req.user;
  const rol = user.rol.nombre;
  const idProfile = user.idProfile;
  if (!idProfile) {
    res.status(400).json({ error: "idProfile requerido" });
    return null;
  }
  const proceso = await storage.getProceso(procesoId);
  if (!proceso) {
    res.status(404).json({ error: "Proceso no encontrado" });
    return null;
  }
  let bestRole = null;
  let bestPermission = null;
  const updateBest = (role, permission) => {
    if (bestPermission === null || PERMISSION_RANK[permission] > PERMISSION_RANK[bestPermission]) {
      bestRole = role;
      bestPermission = permission;
    }
  };
  const ownership = await storage.procesoOwnership.getActive(procesoId);
  if (ownership) {
    if (ownership.ownerType === "sin_owner") {
      res.status(403).json({ error: "Proceso pendiente de revisi\xF3n administrativa" });
      return null;
    }
    if (rol === "abogado" && ownership.ownerType === "abogado" && ownership.ownerId === idProfile) {
      updateBest("owner", "editar");
    }
    if (rol === "bufete" && ownership.ownerType === "bufete" && ownership.ownerId === idProfile) {
      updateBest("owner", "editar");
    }
  }
  if (rol === "cliente" && proceso.clienteId === idProfile) {
    updateBest("shared", "ver");
  }
  if (rol === "bufete" || rol === "corporacion" || rol === "cliente") {
    const sharedWithType = rol;
    const sharing = await storage.procesoSharing.findActive(procesoId, sharedWithType, idProfile);
    if (sharing) {
      updateBest("shared", sharing.permission);
    }
  }
  if (rol === "abogado" && bestRole === null) {
    const assigned = await storage.getProceoByAbogadoIdAndProcesoId(idProfile, procesoId);
    if (assigned && ownership) {
      if (ownership.ownerType === "bufete") {
        const lawyer = await storage.abogados.getLawyer(idProfile);
        if (lawyer?.firmId === ownership.ownerId) {
          updateBest("assigned", "editar");
        }
      }
      if (ownership.ownerType === "abogado" && ownership.ownerId !== idProfile) {
        updateBest("assigned", "editar");
      }
    }
  }
  if (bestRole === null || bestPermission === null) {
    res.status(403).json({ error: "Sin acceso a este proceso" });
    return null;
  }
  return { proceso, role: bestRole, permission: bestPermission };
}
async function withTareas(result) {
  if (result.data.length === 0) return result;
  try {
    const ids = result.data.map((p) => p.id);
    const map = await storage.tareas.countByProcesoIds(ids);
    result.data = result.data.map((p) => ({
      ...p,
      tareasConteo: map.get(p.id) ?? { total: 0, pendientes: 0, en_progreso: 0, completadas: 0 }
    }));
  } catch (e) {
    console.error("[procesos] Error al enriquecer con tareas:", e);
  }
  return result;
}
router4.get("/procesos", authenticate, requirePermission("procesos.ver"), async (req, res, next) => {
  try {
    const user = req.user;
    const idProfile = user.idProfile;
    const rol = user.rol.nombre;
    const { limit, offset, estadoCodigo, search, hasResponsable, clienteId } = req.query;
    const limitNum = Math.min(Math.max(limit ? parseInt(limit, 10) : 10, 1), 100);
    const offsetNum = Math.max(offset ? parseInt(offset, 10) : 0, 0);
    const filter = {
      estadoCodigo,
      search,
      hasResponsable: hasResponsable !== void 0 ? hasResponsable === "true" : void 0,
      clienteId
    };
    if (!idProfile) return res.status(400).json({ error: "idProfile requerido" });
    let procesos2;
    let totalCount = 0;
    switch (rol) {
      case "abogado": {
        const ownedIds = await storage.procesoOwnership.getProcesoIdsByOwner("abogado", idProfile);
        const lawyer = await storage.abogados.getLawyer(idProfile);
        const assignedProcesoIds = await storage.getProcesoIdsByAbogadoAssignment(idProfile);
        const validAssignedIds = [];
        const ownershipMap = await storage.procesoOwnership.getActiveBatch(assignedProcesoIds);
        for (const pid of assignedProcesoIds) {
          const ow = ownershipMap.get(pid);
          if (!ow) continue;
          if (ow.ownerType === "abogado" && ow.ownerId !== idProfile) validAssignedIds.push(pid);
          if (ow.ownerType === "bufete" && lawyer?.firmId === ow.ownerId) validAssignedIds.push(pid);
        }
        const allIds = [.../* @__PURE__ */ new Set([...ownedIds, ...validAssignedIds])];
        const filteredProcesos = await storage.getProcesosByIds(allIds, filter);
        totalCount = filteredProcesos.length;
        procesos2 = filteredProcesos.slice(offsetNum, offsetNum + limitNum);
        break;
      }
      case "bufete": {
        const ownedIds = await storage.procesoOwnership.getProcesoIdsByOwner("bufete", idProfile);
        const sharedIds = await storage.procesoSharing.getProcesoIdsBySharedWith("bufete", idProfile);
        const allIds = [.../* @__PURE__ */ new Set([...ownedIds, ...sharedIds])];
        const filteredProcesos = await storage.getProcesosByIds(allIds, filter);
        totalCount = filteredProcesos.length;
        procesos2 = filteredProcesos.slice(offsetNum, offsetNum + limitNum);
        break;
      }
      case "corporacion": {
        const sharedIds = await storage.procesoSharing.getProcesoIdsBySharedWith("corporacion", idProfile);
        const filteredProcesos = await storage.getProcesosByIds(sharedIds, filter);
        totalCount = filteredProcesos.length;
        procesos2 = filteredProcesos.slice(offsetNum, offsetNum + limitNum);
        break;
      }
      case "cliente": {
        const result2 = await storage.getProcesosByClienteId(idProfile, limitNum, offsetNum, filter);
        procesos2 = result2.data;
        totalCount = result2.total;
        break;
      }
      default:
        return res.status(403).json({ error: "Rol no autorizado" });
    }
    const result = { data: procesos2, total: totalCount };
    return res.json(await withTareas(result));
  } catch (err) {
    next(err);
  }
});
router4.get("/procesos/count", authenticate, requirePermission("procesos.ver"), async (req, res, next) => {
  try {
    const user = req.user;
    const lawyerId = user.lawyerProfileId;
    const { estadoCodigo } = req.query;
    const filter = estadoCodigo ? { estadoCodigo } : void 0;
    const count4 = await storage.getProcesCount(lawyerId, filter);
    res.json({ count: count4 });
  } catch (err) {
    next(err);
  }
});
router4.get("/proceso", authenticate, requirePermission("procesos.ver"), async (req, res, next) => {
  try {
    const { idProces } = req.query;
    if (!idProces || typeof idProces !== "string") {
      return res.status(400).json({ error: "idProces is required" });
    }
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "No se proporcion\xF3 token", authenticated: false });
    }
    const { rol, idProfile } = verifyToken(token);
    if (!idProfile) {
      return res.status(400).json({ error: "idProfile is required" });
    }
    let proceso;
    switch (rol.nombre) {
      case "abogado":
        proceso = await storage.getProceoByAbogadoIdAndProcesoId(idProfile, idProces);
        break;
      case "bufete":
      case "corporacion":
        proceso = await storage.getProcesoByFirmaIdAndProcesoId(idProfile, idProces);
        break;
      case "cliente":
        proceso = await storage.getProcesoByClienteIdAndProcesoId(idProfile, idProces);
        if (proceso && proceso.clienteId !== idProfile) {
          return res.status(403).json({ error: "No tienes acceso a este proceso" });
        }
        break;
      default:
        return res.status(403).json({ error: "Rol no autorizado" });
    }
    if (!proceso) {
      return res.status(404).json({ error: "Proceso not found" });
    }
    res.json(proceso);
  } catch (err) {
    next(err);
  }
});
router4.post("/procesos", authenticate, requirePermission("procesos.crear"), async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "No se proporcion\xF3 token", authenticated: false });
    }
    const tokenPayload = verifyToken(token);
    if (!tokenPayload) {
      return res.status(401).json({ error: "Token inv\xE1lido", authenticated: false });
    }
    const { rol, idProfile, id: userId2, UserName } = tokenPayload;
    if (!rol) return res.status(400).json({ error: "rol is required" });
    if (!idProfile || typeof idProfile !== "string") return res.status(400).json({ error: "idProfile is required" });
    const limitCheck = await subscriptionService.checkLimit(userId2, "procesos");
    if (!limitCheck.permitido) {
      return res.status(402).json({
        error: "LIMIT_REACHED",
        tipo: "procesos",
        actual: limitCheck.actual,
        maximo: limitCheck.maximo,
        mensaje: "Has alcanzado el l\xEDmite de procesos de tu plan. Actualiza para continuar."
      });
    }
    const newProceso = await storage.createProceso(req.body);
    if (!newProceso) {
      return res.status(500).json({ error: "Error al crear el proceso" });
    }
    const esPrivadoSolicitado = req.body.esPrivado === true;
    let ownershipDecision;
    try {
      ownershipDecision = await ownershipPolicyService.resolveForProceso({
        actorId: idProfile,
        rolNombre: rol.nombre,
        esPrivadoSolicitado
      });
    } catch (policyErr) {
      await storage.deleteProceso(newProceso.id).catch(() => {
      });
      return res.status(403).json({ error: policyErr.message });
    }
    try {
      await ownershipPolicyService.validateConsistenciaClienteProceso(
        req.body.clienteId,
        ownershipDecision.esPrivado
      );
    } catch (err) {
      await storage.deleteProceso(newProceso.id).catch(() => {
      });
      return res.status(400).json({ error: err.message });
    }
    await storage.procesoOwnership.create(
      newProceso.id,
      ownershipDecision.ownerType,
      ownershipDecision.ownerId,
      userId2,
      `Creado por ${rol.nombre}${ownershipDecision.esPrivado ? " (privado)" : ""}`
    );
    await storage.updateProceso(newProceso.id, {
      esPrivado: ownershipDecision.esPrivado,
      createdBy: idProfile
    });
    switch (rol.nombre) {
      case "abogado":
        await storage.addLawyerToProceso(newProceso.id, idProfile, {
          rol: "principal",
          tipoAsignacionId: TIPO_ASIGNACION_IDS.NUEVA_ASIGNACION,
          razonAsignacion: "Abogado creador del proceso",
          asignadoPor: userId2
        });
        await storage.setResponsable(newProceso.id, idProfile, {
          asignadoPorNombre: UserName ?? null,
          razon: "Responsable inicial (abogado creador)"
        });
        break;
      case "bufete":
        if (!req.body.lawyerId) return res.status(400).json({ error: "lawyerId is required para bufete" });
        await storage.addLawyerToProceso(newProceso.id, req.body.lawyerId, {
          rol: "principal",
          tipoAsignacionId: TIPO_ASIGNACION_IDS.NUEVA_ASIGNACION,
          razonAsignacion: `Asignado por bufete ${UserName}`,
          asignadoPor: userId2
        });
        await storage.setResponsable(newProceso.id, req.body.lawyerId, {
          asignadoPorNombre: UserName ?? null,
          razon: `Responsable inicial asignado por bufete ${UserName}`
        });
        await notificacionesService.notifyLawyer(
          req.body.lawyerId,
          newProceso.id,
          "Nuevo proceso asignado",
          `${UserName ?? "El bufete"} te asign\xF3 como responsable del proceso ${newProceso.radicado ?? newProceso.id}.`,
          "responsable_asignado"
        );
        break;
      case "corporacion":
        if (!req.body.lawyerId) return res.status(400).json({ error: "lawyerId is required para corporacion" });
        await storage.addLawyerToProceso(newProceso.id, req.body.lawyerId, {
          rol: "externo",
          tipoAsignacionId: TIPO_ASIGNACION_IDS.SOLICITUD_CLIENTE,
          razonAsignacion: `Contratado por corporaci\xF3n ${UserName}`,
          asignadoPor: userId2
        });
        await storage.setResponsable(newProceso.id, req.body.lawyerId, {
          asignadoPorNombre: UserName ?? null,
          razon: `Responsable inicial asignado por corporaci\xF3n ${UserName}`
        });
        break;
      case "cliente":
        await storage.deleteProceso(newProceso.id);
        return res.status(403).json({ error: "Los clientes no pueden crear procesos" });
      default:
        await storage.deleteProceso(newProceso.id);
        return res.status(403).json({ error: "Rol no autorizado para crear procesos" });
    }
    const communityPostId = req.body.communityPostId;
    if (communityPostId) {
      await storage.community.setPostProceso(communityPostId, newProceso.id).catch(() => {
      });
    }
    await subscriptionService.incrementUsage(userId2, "procesos");
    res.status(201).json(newProceso);
  } catch (err) {
    next(err);
  }
});
router4.put("/procesos/:id", authenticate, requirePermission("procesos.editar"), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });
    const access = await assertProcesoAccess2(req, res, id);
    if (!access) return;
    const { proceso, role, permission } = access;
    if (permission !== "editar") return res.status(403).json({ error: "Permisos insuficientes" });
    const { estadoId, descripcionEstado, radicado, juzgado, tipoProcesoId } = req.body;
    const allowed = {};
    if (estadoId !== void 0) allowed.estadoId = estadoId;
    if (descripcionEstado !== void 0) allowed.descripcionEstado = descripcionEstado;
    if (radicado !== void 0) allowed.radicado = radicado;
    if (juzgado !== void 0) allowed.juzgado = juzgado;
    if (tipoProcesoId !== void 0) allowed.tipoProcesoId = tipoProcesoId;
    const updatedProceso = await procesosService.updateProceso(id, allowed);
    if (!updatedProceso) return res.status(404).json({ error: "Proceso not found" });
    res.json(updatedProceso);
  } catch (err) {
    next(err);
  }
});
router4.delete("/procesos/:id", authenticate, requirePermission("procesos.eliminar"), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });
    const access = await assertProcesoAccess2(req, res, id);
    if (!access) return;
    const { role } = access;
    if (role !== "owner") return res.status(403).json({ error: "Solo el propietario puede eliminar el proceso" });
    await procesosService.deleteProceso(id);
    const user = req.user;
    await subscriptionService.decrementUsage(user.id, "procesos");
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
router4.put("/procesos/:id/responsable", authenticate, requirePermission("procesos.editar"), async (req, res, next) => {
  try {
    const user = req.user;
    if (user.rol.nombre !== "bufete") {
      return res.status(403).json({ error: "Solo el bufete puede asignar el responsable del proceso" });
    }
    const { responsableId, razon } = req.body;
    if (!responsableId || typeof responsableId !== "string") {
      return res.status(400).json({ error: "responsableId es requerido" });
    }
    const { id } = req.params;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });
    const access = await assertProcesoAccess2(req, res, id);
    if (!access) return;
    if (access.role !== "owner") return res.status(403).json({ error: "Solo el propietario puede cambiar el responsable" });
    const proceso = await storage.setResponsable(id, responsableId, {
      asignadoPorNombre: user.UserName ?? null,
      razon: razon ?? null
    });
    if (!proceso) {
      return res.status(404).json({ error: "Proceso no encontrado" });
    }
    await notificacionesService.notifyLawyer(
      responsableId,
      id,
      "Te asignaron como responsable",
      `${user.UserName ?? "El bufete"} te asign\xF3 como responsable del proceso ${proceso.radicado ?? id}.`,
      "responsable_asignado"
    );
    res.json(proceso);
  } catch (err) {
    next(err);
  }
});
router4.get("/procesos/:id/lawyers", authenticate, requirePermission("procesos.ver"), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });
    const access = await assertProcesoAccess2(req, res, id);
    if (!access) return;
    const lawyers = await storage.getProcesoLawyers(id);
    res.json(lawyers);
  } catch (err) {
    next(err);
  }
});
router4.post("/procesos/:id/lawyers", authenticate, requirePermission("procesos.editar"), async (req, res, next) => {
  try {
    const user = req.user;
    const { lawyerId, rol, tipoAsignacionId, razonAsignacion } = req.body;
    if (!lawyerId) return res.status(400).json({ error: "lawyerId es requerido" });
    const { id } = req.params;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });
    const access = await assertProcesoAccess2(req, res, id);
    if (!access) return;
    if (access.role !== "owner") return res.status(403).json({ error: "Solo el propietario puede a\xF1adir abogados al proceso" });
    await storage.addLawyerToProceso(id, lawyerId, {
      rol: rol ?? "responsable",
      tipoAsignacionId: tipoAsignacionId ?? null,
      razonAsignacion: razonAsignacion ?? null,
      asignadoPor: user.id
    });
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});
router4.delete("/procesos/:id/lawyers/:lawyerId", authenticate, requirePermission("procesos.editar"), async (req, res, next) => {
  try {
    const { id, lawyerId } = req.params;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });
    if (!lawyerId || typeof lawyerId !== "string") return res.status(400).json({ error: "lawyerId is required" });
    const access = await assertProcesoAccess2(req, res, id);
    if (!access) return;
    if (access.role !== "owner") return res.status(403).json({ error: "Solo el propietario puede eliminar abogados del proceso" });
    await storage.removeLawyerFromProceso(id, lawyerId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
router4.patch("/procesos/:id/link-post", authenticate, requirePermission("procesos.editar"), async (req, res, next) => {
  try {
    const id = req.params.id;
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ error: "postId es requerido" });
    const proceso = await storage.getProceso(id);
    if (!proceso) return res.status(404).json({ error: "Proceso no encontrado" });
    if (proceso.communityPostId) return res.status(409).json({ error: "El proceso ya est\xE1 vinculado a un post" });
    await Promise.all([
      storage.setCommunityPostId(id, postId),
      storage.community.setPostProceso(postId, id)
    ]);
    res.json({ success: true, procesoId: id, postId });
  } catch (err) {
    next(err);
  }
});
router4.get("/tipos-proceso", authenticate, requirePermission("procesos.ver"), async (req, res, next) => {
  try {
    const tipos = await procesosService.getTiposProceso();
    res.json(tipos);
  } catch (err) {
    next(err);
  }
});
router4.post("/tipos-proceso", authenticate, requirePermission("procesos.crear"), async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }
    const nuevo = await procesosService.createTipoProceso({ nombre, descripcion });
    res.json(nuevo);
  } catch (err) {
    next(err);
  }
});
router4.put("/tipos-proceso/:id", authenticate, requirePermission("procesos.editar"), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? parseInt(req.params.id[0]) : parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inv\xE1lido" });
    }
    const { nombre, descripcion, activo } = req.body;
    const actualizado = await procesosService.updateTipoProceso(id, { nombre, descripcion, activo });
    if (!actualizado) {
      return res.status(404).json({ error: "Tipo de proceso no encontrado" });
    }
    res.json(actualizado);
  } catch (err) {
    next(err);
  }
});
router4.delete("/tipos-proceso/:id", authenticate, requirePermission("procesos.eliminar"), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? parseInt(req.params.id[0]) : parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inv\xE1lido" });
    }
    await procesosService.deleteTipoProceso(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
router4.get("/actualizaciones", authenticate, requirePermission("actualizaciones.ver"), async (req, res, next) => {
  try {
    const { procesoId, limit, offset } = req.query;
    if (!procesoId || typeof procesoId !== "string") {
      return res.status(400).json({ error: "procesoId is required" });
    }
    const access = await assertProcesoAccess2(req, res, procesoId);
    if (!access) return;
    const { proceso } = access;
    const limitNum = Math.min(Math.max(limit ? parseInt(limit, 10) : 10, 1), 100);
    const offsetNum = Math.max(offset ? parseInt(offset, 10) : 0, 0);
    const actualizaciones2 = await procesosService.getActualizaciones(procesoId, limitNum, offsetNum);
    res.json(actualizaciones2);
  } catch (err) {
    next(err);
  }
});
router4.post("/actualizaciones", authenticate, requirePermission("actualizaciones.crear"), async (req, res, next) => {
  try {
    const { procesoId } = req.body;
    if (!procesoId || typeof procesoId !== "string") {
      return res.status(400).json({ error: "procesoId is required" });
    }
    const access = await assertProcesoAccess2(req, res, procesoId);
    if (!access) return;
    const newActualizacion = await procesosService.createActualizacion(req.body);
    res.status(201).json(newActualizacion);
  } catch (err) {
    next(err);
  }
});
router4.delete("/actualizaciones/:id", authenticate, requirePermission("actualizaciones.eliminar"), async (req, res, next) => {
  try {
    const actualizacion = await storage.getActualizacion(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (!actualizacion) return res.status(404).json({ error: "Actualizaci\xF3n no encontrada" });
    const access = await assertProcesoAccess2(req, res, actualizacion.procesoId);
    if (!access) return;
    await procesosService.deleteActualizacion(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
router4.get("/estado", authenticate, async (req, res, next) => {
  try {
    const estados = await procesosService.getEstadosProceso();
    res.json(estados);
  } catch (err) {
    next(err);
  }
});
router4.get("/dashboard", authenticate, requirePermission("dashboard.ver"), async (req, res, next) => {
  try {
    const user = req.user;
    const abogadoId = user.idProfile;
    if (!abogadoId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const [
      totalClientes,
      totalProcesos,
      procesosActivos,
      procesosEnTramite,
      procesosFinalizados,
      tareaStats,
      allProcesos
    ] = await Promise.all([
      clientesService.getClientesCount(abogadoId),
      procesosService.getProcesosCount(abogadoId),
      procesosService.getProcesosCount(abogadoId, { estadoCodigo: "activo" }),
      procesosService.getProcesosCount(abogadoId, { estadoCodigo: "en_tramite" }),
      procesosService.getProcesosCount(abogadoId, { estadoCodigo: "finalizado" }),
      tareaService.countByLawyer(abogadoId),
      procesosService.getProcesos(abogadoId, 1e3, 0, void 0)
    ]);
    const procesosRecientes = allProcesos.data.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()).slice(0, 5).map((p) => ({
      id: p.id,
      clienteId: p.clienteId,
      tipoProceso: p.tipoProceso,
      radicado: p.radicado,
      estado: p.estado?.nombre || "Sin estado",
      estadoColor: p.estado?.color || "#999",
      fechaCreacion: p.fechaCreacion
    }));
    res.json({
      totalClientes,
      totalProcesos,
      procesosActivos: procesosActivos + procesosEnTramite,
      procesosFinalizados,
      totalTareas: tareaStats.total,
      tareasPendientes: tareaStats.pendientes,
      tareasEnProgreso: tareaStats.en_progreso,
      tareasCompletadas: tareaStats.completadas,
      procesosRecientes
    });
  } catch (err) {
    next(err);
  }
});
router4.get("/legal-stages", authenticate, async (req, res, next) => {
  try {
    const tipoProcesoId = req.query.tipoProceso ? Number(req.query.tipoProceso) : null;
    const procesoId = typeof req.query.procesoId === "string" ? req.query.procesoId : void 0;
    let currentStage = null;
    let fechaVencimiento = null;
    if (procesoId) {
      const proceso = await storage.getProceso(procesoId);
      if (proceso) {
        try {
          const ultimosEstados = await storage.procesoEtapaHistorial.getUltimoEstadoPorEtapa(procesoId);
          const etapasValidas = await storage.legalStages.getByTipoProceso(proceso.tipoProcesoId ?? null);
          const codigosValidos = new Set(etapasValidas.map((e) => e.codigo));
          const estadosFinales = ["COMPLETADA", "CANCELADA", "SUSPENDIDA"];
          let etapaMasReciente = null;
          let fechaMasReciente = null;
          for (const [etapa, registro] of Object.entries(ultimosEstados)) {
            if (codigosValidos.has(etapa) && !estadosFinales.includes(registro.estado)) {
              const fechaRegistro = new Date(registro.fecha);
              if (!fechaMasReciente || fechaRegistro > fechaMasReciente) {
                fechaMasReciente = fechaRegistro;
                etapaMasReciente = etapa;
              }
            }
          }
          currentStage = etapaMasReciente ?? proceso.legalStage ?? null;
        } catch {
          currentStage = proceso.legalStage ?? null;
        }
        fechaVencimiento = proceso.fechaVencimientoEtapa ?? null;
      }
    }
    const response = await storage.legalStages.buildStagesResponse(
      tipoProcesoId,
      currentStage,
      fechaVencimiento
    );
    res.json(response);
  } catch (err) {
    next(err);
  }
});
router4.patch("/procesos/:id/legal-stage", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const rol = user.rol.nombre;
    const idProfile = user.idProfile;
    const procesoId = String(req.params.id);
    if (rol === "cliente") {
      res.status(403).json({ error: "Los clientes no pueden cambiar la etapa procesal" });
      return;
    }
    const access = await assertProcesoAccess2(req, res, procesoId);
    if (!access) return;
    const { proceso } = access;
    const { legalStage, fechaVencimientoEtapa: fechaManual } = req.body;
    if (!legalStage) {
      res.status(400).json({ error: "legalStage es requerido" });
      return;
    }
    const oldStage = proceso.legalStage ?? null;
    if (oldStage) {
      const valid = await storage.legalStages.isValidTransition(
        oldStage,
        legalStage,
        proceso.tipoProcesoId ?? null
      );
      if (!valid) {
        res.status(422).json({
          error: "Transici\xF3n de etapa inv\xE1lida. No se puede retroceder a una etapa anterior."
        });
        return;
      }
    }
    let fechaVencimiento = fechaManual ? new Date(fechaManual) : null;
    if (!fechaVencimiento) {
      const etapa = await storage.legalStages.getByCodigoYTipo(
        legalStage,
        proceso.tipoProcesoId ?? null
      );
      if (etapa && etapa.diasLegales > 0) {
        const fecha = /* @__PURE__ */ new Date();
        fecha.setDate(fecha.getDate() + etapa.diasLegales);
        fechaVencimiento = fecha;
      }
    }
    await storage.procesos.updateLegalStage(procesoId, legalStage, fechaVencimiento);
    try {
      if (oldStage && oldStage !== legalStage) {
        await storage.procesoEtapaHistorial.createHistorial({
          id: randomUUID35(),
          procesoId,
          etapa: oldStage,
          estado: "COMPLETADA",
          fecha: /* @__PURE__ */ new Date(),
          observacion: `Etapa cerrada al avanzar a ${legalStage}`,
          usuarioId: idProfile || null
        });
      }
      await storage.procesoEtapaHistorial.createHistorial({
        id: randomUUID35(),
        procesoId,
        etapa: legalStage,
        estado: "INICIADA",
        fecha: /* @__PURE__ */ new Date(),
        observacion: fechaVencimiento ? `Avanzada con fecha de vencimiento: ${fechaVencimiento.toLocaleDateString("es-ES")}` : "Avanzada a nueva etapa",
        usuarioId: idProfile || null
      });
    } catch (error) {
      console.error("Error registering etapa historial:", error);
    }
    const descripcionAct = fechaVencimiento ? `Vencimiento: ${fechaVencimiento.toLocaleDateString("es-CO")}` : "Sin fecha de vencimiento";
    await procesosService.createActualizacion({
      procesoId,
      titulo: `Etapa avanzada: ${legalStage}`,
      descripcion: descripcionAct,
      tipo: "automatico",
      tipoId: 1,
      documentoId: null
    });
    if (oldStage) {
      await storage.stageEvents.insert({
        procesoId,
        legalStageCode: oldStage,
        tipo: "etapa_completada",
        descripcion: `Etapa completada: ${oldStage}`
      });
    }
    await storage.stageEvents.insert({
      procesoId,
      legalStageCode: legalStage,
      tipo: "etapa_iniciada",
      descripcion: "Etapa iniciada"
    });
    const tipoProcesoId = proceso.tipoProcesoId ?? null;
    const plantillas = await storage.stageTemplates.getByStage(legalStage, tipoProcesoId);
    for (const p of plantillas) {
      await storage.tareas.create({
        procesoId,
        legalStage: p.legalStageCode,
        requerida: p.requerida ? 1 : 0,
        titulo: p.titulo,
        descripcion: p.descripcion ?? null,
        prioridad: p.prioridad,
        creadoPor: idProfile ?? procesoId,
        creadoPorNombre: "Sistema",
        orden: p.orden,
        estado: "pendiente"
      });
    }
    if (legalStage === "HEARING" && rol === "abogado" && idProfile) {
      await storage.calendar.create(idProfile, {
        procesoId,
        titulo: `Audiencia \u2014 ${proceso.radicado ?? procesoId}`,
        tipo: "audiencia",
        fechaInicio: fechaVencimiento ?? /* @__PURE__ */ new Date(),
        recordatorioMinutos: 1440
      });
    }
    if (legalStage === "JUDGMENT" && proceso.clienteId) {
      const cliente = await storage.clientes.getCliente(proceso.clienteId);
      if (cliente?.userId) {
        await storage.appNotifications.createNotification(
          cliente.userId,
          "proceso_judgment",
          "Sentencia en tu proceso",
          `El proceso ${proceso.radicado ?? ""} ha llegado a la etapa de Sentencia.`,
          { procesoId }
        );
      }
    }
    const updated = await storage.getProceso(procesoId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
var procesos_default = router4;

// server/routes/documentos.ts
init_auth();
init_database_storage();
import { Router as Router5 } from "express";
import multer from "multer";
init_user_schema();
var router5 = Router5();
var ALLOWED_MIMES = /* @__PURE__ */ new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);
var DOC_MAX_SIZE = 20 * 1024 * 1024;
function detectMimeFromBuffer(buf) {
  if (buf.length < 4) return null;
  if (buf[0] === 37 && buf[1] === 80 && buf[2] === 68 && buf[3] === 70) return "application/pdf";
  if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) return "image/jpeg";
  if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) return "image/png";
  if (buf[0] === 80 && buf[1] === 75 && buf[2] === 3 && buf[3] === 4) return "application/zip";
  return null;
}
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DOC_MAX_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("INVALID_TYPE"));
    }
  }
});
async function assertProcesoDocumentoAccess(payload, procesoId, res) {
  const proceso = await storage.getProceso(procesoId);
  if (!proceso) {
    res.status(404).json({ error: "Proceso no encontrado" });
    return false;
  }
  const rol = payload.rol?.nombre;
  const actorId = payload.idProfile;
  if (rol === EnumRol.CLIENTE.nombre) {
    if (proceso.clienteId !== actorId) {
      res.status(403).json({ error: "No tienes acceso a este documento" });
      return false;
    }
    return true;
  }
  if (rol === EnumRol.ABOGADO.nombre) {
    const ownership = await storage.procesoOwnership.getActive(procesoId);
    if (ownership?.ownerType === "abogado" && ownership.ownerId === actorId) {
      return true;
    }
    const procesoLawyers2 = await storage.getProcesoLawyers(procesoId);
    if (procesoLawyers2.some((pl) => pl.lawyerId === actorId)) {
      return true;
    }
    if (proceso.responsable?.id === actorId) {
      return true;
    }
    res.status(403).json({ error: "No tienes acceso a este documento" });
    return false;
  }
  if (rol === EnumRol.BUFETE.nombre) {
    const ownership = await storage.procesoOwnership.getActive(procesoId);
    if (ownership?.ownerType === "bufete" && ownership.ownerId === actorId) {
      return true;
    }
    res.status(403).json({ error: "No tienes acceso a este documento" });
    return false;
  }
  res.status(403).json({ error: "No tienes acceso a este documento" });
  return false;
}
router5.get("/documentos", authenticate, requirePermission("documentos.ver"), async (req, res, next) => {
  try {
    const { procesoId, tipoDocumento } = req.query;
    if (!procesoId || typeof procesoId !== "string") {
      return res.status(400).json({ error: "procesoId is required" });
    }
    const payload = req.user;
    const allowed = await assertProcesoDocumentoAccess(payload, procesoId, res);
    if (!allowed) return;
    const stage = req.query.stage;
    let documentos2 = await storage.getDocumentos(procesoId, stage);
    if (tipoDocumento && typeof tipoDocumento === "string") {
      documentos2 = documentos2.filter((doc) => doc.tipoDocumento === tipoDocumento);
    }
    res.json(documentos2);
  } catch (err) {
    next(err);
  }
});
router5.get("/documentos/:id", authenticate, requirePermission("documentos.ver"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const documento = await storage.getDocumento(id.toString());
    if (!documento) {
      return res.status(404).json({ error: "Documento not found" });
    }
    if (documento.procesoId) {
      const payload = req.user;
      const allowed = await assertProcesoDocumentoAccess(payload, documento.procesoId, res);
      if (!allowed) return;
    }
    res.json(documento);
  } catch (err) {
    next(err);
  }
});
router5.get("/documentos/:id/download", async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "No se proporcion\xF3 token de autenticaci\xF3n" });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Token inv\xE1lido o expirado" });
    }
    const sessionValid = await storage.sessions.isValid(payload.jti);
    if (!sessionValid) {
      return res.status(401).json({ error: "Sesi\xF3n inv\xE1lida o cerrada" });
    }
    const userPermissions = await storage.getPermisosByRol(payload.rol.id);
    if (!userPermissions.includes("documentos.ver")) {
      return res.status(403).json({ error: "No tiene permiso para descargar documentos" });
    }
    const { id } = req.params;
    const documento = await storage.getDocumento(id.toString());
    if (!documento) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }
    if (documento.procesoId) {
      const allowed = await assertProcesoDocumentoAccess(payload, documento.procesoId, res);
      if (!allowed) return;
    }
    const fileUri = documento.url;
    if (fileUri && fileUri.includes("/") && !fileUri.startsWith("/") && !fileUri.includes(":\\")) {
      const { getPresignedDownloadUrl: getPresignedDownloadUrl2 } = await Promise.resolve().then(() => (init_s3_storage(), s3_storage_exports));
      const presignedUrl = await getPresignedDownloadUrl2(fileUri, documento.nombre, 300);
      return res.redirect(presignedUrl);
    }
    const fs3 = await import("fs");
    if (fileUri && fs3.existsSync(fileUri)) {
      res.setHeader("Content-Disposition", `attachment; filename="${documento.nombre}"`);
      res.setHeader("Content-Type", documento.tipo || "application/octet-stream");
      const fileBuffer = fs3.readFileSync(fileUri);
      return res.send(fileBuffer);
    }
    return res.status(404).json({ error: "Archivo no encontrado" });
  } catch (err) {
    next(err);
  }
});
router5.post(
  "/documentos",
  authenticate,
  requirePermission("documentos.subir"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const file = req.file;
      const { procesoId, nombre, tipo, tipoDocumento, tamano, descripcion, legalStage } = req.body;
      if (!file && !nombre) {
        return res.status(400).json({ error: "No se proporcion\xF3 archivo" });
      }
      let url2 = "";
      if (file) {
        const uid = req.user?.id;
        const fileSizeMb = file.size / (1024 * 1024);
        const storageCheck = await subscriptionService.checkLimit(uid, "storage", fileSizeMb);
        if (!storageCheck.permitido) {
          return res.status(402).json({
            error: "Has alcanzado el l\xEDmite de almacenamiento de tu plan. Actualiza para continuar.",
            usado: storageCheck.actual,
            maximo: storageCheck.maximo
          });
        }
        const detectedMime = detectMimeFromBuffer(file.buffer);
        if (detectedMime !== null) {
          const isZipBased = file.mimetype.includes("wordprocessingml") || file.mimetype.includes("spreadsheetml");
          const mimeOk = detectedMime === file.mimetype || isZipBased && detectedMime === "application/zip";
          if (!mimeOk) {
            return res.status(400).json({ error: "El contenido del archivo no coincide con su tipo declarado" });
          }
        }
        const proceso = await storage.getProceso(procesoId);
        if (!proceso) return res.status(404).json({ error: "Proceso no encontrado" });
        const cliente = await storage.getCliente(proceso.clienteId);
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
        const clienteId = cliente.id;
        const { uploadDocumentToS3: uploadDocumentToS32 } = await Promise.resolve().then(() => (init_s3_storage(), s3_storage_exports));
        const s3Key = await uploadDocumentToS32(
          file.buffer,
          clienteId,
          procesoId,
          nombre || file.originalname,
          file.mimetype
        );
        url2 = s3Key;
        await subscriptionService.incrementUsage(uid, "storage", Math.ceil(fileSizeMb * 10) / 10).catch(() => {
        });
      }
      const docData = {
        procesoId,
        nombre: nombre || file?.originalname || "Documento sin nombre",
        url: url2,
        tipo: file?.mimetype || tipo,
        tipoDocumento: tipoDocumento || "PROCESAL",
        tamano: file?.size || tamano,
        descripcion: descripcion || null,
        legalStage: legalStage && legalStage !== "__general__" ? legalStage : null
      };
      const newDocumento = await storage.createDocumento(docData);
      try {
        const proc = await storage.getProceso(procesoId);
        if (proc?.clienteId) {
          notificacionesService.onDocumentoSubido({
            procesoId,
            clienteId: proc.clienteId,
            documentoNombre: docData.nombre
          }).catch(() => {
          });
        }
      } catch {
      }
      if (legalStage && legalStage !== "__general__") {
        storage.stageEvents.insert({
          procesoId,
          legalStageCode: legalStage,
          tipo: "documento_subido",
          descripcion: `Documento subido: ${newDocumento.nombre}`,
          metadatos: { documentoId: newDocumento.id, nombre: newDocumento.nombre },
          creadoPor: req.user?.idProfile ?? null
        }).catch((err) => {
          console.error("Error creating stage event for document upload:", err);
        });
      }
      res.status(201).json(newDocumento);
    } catch (err) {
      next(err);
    }
  }
);
router5.delete("/documentos/:id", authenticate, requirePermission("documentos.eliminar"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const documento = await storage.getDocumento(id.toString());
    if (documento && documento.url && documento.url.includes("/") && !documento.url.startsWith("/") && !documento.url.includes(":\\")) {
      const { deleteDocumentFromS3: deleteDocumentFromS32 } = await Promise.resolve().then(() => (init_s3_storage(), s3_storage_exports));
      await deleteDocumentFromS32(documento.url);
    }
    await storage.deleteDocumento(id.toString());
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
router5.get("/uploads/:filename", authenticate, async (req, res, next) => {
  try {
    const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const pathModule = await import("path");
    const uploadsDir = pathModule.resolve(process.cwd(), "uploads");
    const filePath = pathModule.resolve(uploadsDir, filename);
    if (!filePath.startsWith(uploadsDir + pathModule.sep) && filePath !== uploadsDir) {
      return res.status(400).json({ error: "Nombre de archivo inv\xE1lido" });
    }
    if (!/^[\w\-. ]+$/.test(filename)) {
      return res.status(400).json({ error: "Nombre de archivo inv\xE1lido" });
    }
    const fs3 = await import("fs");
    if (!fs3.existsSync(filePath)) {
      return res.status(404).json({ error: "Archivo no encontrado" });
    }
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});
var documentos_default = router5;

// server/routes/roles.ts
init_auth();
init_database_storage();
import { Router as Router6 } from "express";
var router6 = Router6();
router6.get("/roles", authenticate, requirePermission("configuracion.ver"), async (req, res, next) => {
  try {
    const rolesList = await storage.getLisRol();
    res.json(rolesList);
  } catch (err) {
    next(err);
  }
});
router6.get("/roles/:id", authenticate, requirePermission("configuracion.ver"), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id.toString());
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inv\xE1lido" });
    }
    const rol = await storage.getRol(id);
    if (!rol) {
      return res.status(404).json({ error: "Rol no encontrado" });
    }
    const permisos3 = await storage.getPermisosByRol(id);
    res.json({ rol, permisos: permisos3 });
  } catch (err) {
    next(err);
  }
});
router6.post("/roles", authenticate, requirePermission("configuracion.editar"), async (req, res, next) => {
  try {
    const { z: z22 } = await import("zod");
    const createRolSchema2 = z22.object({
      nombre: z22.string().min(1).max(100),
      descripcion: z22.string().max(500).optional()
    });
    const parsed2 = createRolSchema2.safeParse(req.body);
    if (!parsed2.success) {
      return res.status(400).json({ error: parsed2.error.errors[0].message });
    }
    const { nombre, descripcion } = parsed2.data;
    const existing = await storage.getRolByNombre(nombre);
    if (existing) {
      return res.status(400).json({ error: "Ya existe un rol con este nombre" });
    }
    const created = await storage.createRol({ nombre, descripcion });
    res.status(201).json(created);
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Datos inv\xE1lidos", details: err.errors });
    }
    next(err);
  }
});
router6.delete("/roles/:id", authenticate, requirePermission("configuracion.editar"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const rolId = parseInt(Array.isArray(id) ? id[0] : id);
    if (isNaN(rolId)) {
      return res.status(400).json({ error: "ID de rol inv\xE1lido" });
    }
    await storage.deleteRol(rolId);
    res.json({ message: "Rol eliminado correctamente" });
  } catch (err) {
    next(err);
  }
});
router6.get("/roles/:id/permisos", authenticate, requirePermission("configuracion.ver"), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id.toString());
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inv\xE1lido" });
    }
    const permisos3 = await storage.getPermisosByRol(id);
    res.json(permisos3);
  } catch (err) {
    next(err);
  }
});
router6.get("/permisos/all", authenticate, requirePermission("configuracion.ver"), async (req, res, next) => {
  try {
    const permisos3 = await storage.getPermisos();
    res.json(permisos3);
  } catch (err) {
    next(err);
  }
});
router6.get("/admin/planes", authenticate, requirePermission("configuracion.ver"), async (req, res, next) => {
  try {
    const planes2 = await storage.getPlanes();
    res.json(planes2);
  } catch (err) {
    next(err);
  }
});
router6.get("/modulos", authenticate, requirePermission("configuracion.ver"), async (req, res, next) => {
  try {
    const modulos2 = await storage.getModulos();
    res.json(modulos2);
  } catch (err) {
    next(err);
  }
});
router6.get("/lawyers", authenticate, requirePermission("usuarios.ver"), async (req, res, next) => {
  try {
    const { limit, offset, search } = req.query;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const filter = search;
    const lawyers = await storage.getAllLawyers(limitNum, offsetNum, filter);
    res.json(lawyers);
  } catch (err) {
    next(err);
  }
});
var roles_default = router6;

// server/routes/notificaciones.ts
init_auth();
init_database_storage();
import { Router as Router7 } from "express";
var router7 = Router7();
router7.get("/notificaciones/cliente/:clienteId", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const cliente = await storage.clientes.getClienteByUser(user.id);
    if (!cliente || cliente.id !== req.params.clienteId) {
      return res.status(403).json({ error: "No tienes acceso a estas notificaciones" });
    }
    const notificaciones2 = await storage.getNotificacionesByClienteId(req.params.clienteId);
    res.json(notificaciones2);
  } catch (err) {
    next(err);
  }
});
router7.get("/notificaciones/cliente/:clienteId/count", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const cliente = await storage.clientes.getClienteByUser(user.id);
    if (!cliente || cliente.id !== req.params.clienteId) {
      return res.status(403).json({ error: "No tienes acceso a estas notificaciones" });
    }
    const count4 = await storage.getNotificacionesCountByClienteId(req.params.clienteId);
    res.json({ count: count4 });
  } catch (err) {
    next(err);
  }
});
router7.put("/notificaciones/:id/leer-cliente", authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: "ID inv\xE1lido" });
    const user = req.user;
    const cliente = await storage.clientes.getClienteByUser(user.id);
    if (!cliente) return res.status(403).json({ error: "No tienes acceso a estas notificaciones" });
    await storage.markNotificacionLeidaCliente(id, cliente.id);
    res.json({ message: "Notificaci\xF3n marcada como le\xEDda" });
  } catch (err) {
    next(err);
  }
});
router7.put("/notificaciones/cliente/:clienteId/leer-todas", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const cliente = await storage.clientes.getClienteByUser(user.id);
    if (!cliente || cliente.id !== req.params.clienteId) {
      return res.status(403).json({ error: "No tienes acceso a estas notificaciones" });
    }
    await storage.markTodasLeidasCliente(req.params.clienteId);
    res.json({ message: "Todas las notificaciones marcadas como le\xEDdas" });
  } catch (err) {
    next(err);
  }
});
router7.get("/notificaciones/abogado/:abogadoId", authenticate, requirePermission("notificaciones.ver"), async (req, res, next) => {
  try {
    const user = req.user;
    if (user.idProfile !== req.params.abogadoId) {
      return res.status(403).json({ error: "No tienes acceso a estas notificaciones" });
    }
    const notificaciones2 = await storage.getNotificacionesByAbogadoId(req.params.abogadoId);
    res.json(notificaciones2);
  } catch (err) {
    next(err);
  }
});
router7.get("/notificaciones/abogado/:abogadoId/count", authenticate, requirePermission("notificaciones.ver"), async (req, res, next) => {
  try {
    const user = req.user;
    if (user.idProfile !== req.params.abogadoId) {
      return res.status(403).json({ error: "No tienes acceso a estas notificaciones" });
    }
    const count4 = await storage.getNotificacionesCountByAbogadoId(req.params.abogadoId);
    res.json({ count: count4 });
  } catch (err) {
    next(err);
  }
});
router7.put("/notificaciones/:id/leer-abogado", authenticate, requirePermission("notificaciones.ver"), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: "ID invalido" });
    const lawyerId = req.user?.idProfile;
    if (!lawyerId) return res.status(403).json({ error: "No tienes acceso" });
    await storage.markNotificacionLeidaAbogado(id, lawyerId);
    res.json({ message: "Notificaci\xF3n marcada como le\xEDda" });
  } catch (err) {
    next(err);
  }
});
router7.put("/notificaciones/abogado/:abogadoId/leer-todas", authenticate, requirePermission("notificaciones.ver"), async (req, res, next) => {
  try {
    const user = req.user;
    if (user.idProfile !== req.params.abogadoId) {
      return res.status(403).json({ error: "No tienes acceso a estas notificaciones" });
    }
    await storage.markTodasLeidasAbogado(req.params.abogadoId);
    res.json({ message: "Todas las notificaciones marcadas como le\xEDdas" });
  } catch (err) {
    next(err);
  }
});
router7.get("/notificaciones/firma/:firmaId", authenticate, requirePermission("notificaciones.ver"), async (req, res, next) => {
  try {
    const user = req.user;
    if (user.idProfile !== req.params.firmaId) {
      return res.status(403).json({ error: "No tienes acceso a estas notificaciones" });
    }
    const notificaciones2 = await storage.getNotificacionesByFirmaId(req.params.firmaId);
    res.json(notificaciones2);
  } catch (err) {
    next(err);
  }
});
router7.get("/notificaciones/firma/:firmaId/count", authenticate, requirePermission("notificaciones.ver"), async (req, res, next) => {
  try {
    const user = req.user;
    if (user.idProfile !== req.params.firmaId) {
      return res.status(403).json({ error: "No tienes acceso a estas notificaciones" });
    }
    const count4 = await storage.getNotificacionesCountByFirmaId(req.params.firmaId);
    res.json({ count: count4 });
  } catch (err) {
    next(err);
  }
});
router7.put("/notificaciones/:id/leer-firma", authenticate, requirePermission("notificaciones.ver"), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) return res.status(400).json({ error: "ID invalido" });
    const firmaId = req.user?.idProfile;
    if (!firmaId) return res.status(403).json({ error: "Sin acceso" });
    await storage.markNotificacionLeidaFirma(id, firmaId);
    res.json({ message: "Notificaci\xF3n marcada como le\xEDda" });
  } catch (err) {
    next(err);
  }
});
router7.put("/notificaciones/firma/:firmaId/leer-todas", authenticate, requirePermission("notificaciones.ver"), async (req, res, next) => {
  try {
    const user = req.user;
    if (user.idProfile !== req.params.firmaId) {
      return res.status(403).json({ error: "No tienes acceso a estas notificaciones" });
    }
    await storage.markTodasLeidasFirma(req.params.firmaId);
    res.json({ message: "Todas las notificaciones marcadas como le\xEDdas" });
  } catch (err) {
    next(err);
  }
});
var notificaciones_default = router7;

// server/routes/firm-profile.ts
init_auth();
init_database_storage();
import { Router as Router8 } from "express";
import { z as z5 } from "zod";
var router8 = Router8();
var updateFirmProfileSchema = z5.object({
  name: z5.string().optional(),
  nit: z5.string().optional(),
  address: z5.string().optional(),
  phone: z5.string().optional(),
  // Representante legal
  repNombre: z5.string().optional(),
  repApellido: z5.string().optional(),
  repCargo: z5.string().optional(),
  repEmail: z5.string().email().optional(),
  repTelefono: z5.string().optional(),
  repDocumento: z5.string().optional()
});
router8.get("/firm-profile", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const dbUser = await storage.getUserById(user.id);
    if (!dbUser || dbUser.rol.nombre !== "bufete") {
      return res.status(403).json({ error: "Acceso denegado. Solo para bufetes." });
    }
    const profile = await storage.getFirmProfileByUserId(user.id);
    if (!profile) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
});
router8.put("/firm-profile", authenticate, async (req, res, next) => {
  try {
    const parsed2 = updateFirmProfileSchema.safeParse(req.body);
    if (!parsed2.success) {
      return res.status(400).json({ error: parsed2.error.errors[0].message });
    }
    const user = req.user;
    const dbUser = await storage.getUserById(user.id);
    if (!dbUser || dbUser.rol.nombre !== "bufete") {
      return res.status(403).json({ error: "Acceso denegado. Solo para bufetes." });
    }
    const profile = await storage.getFirmProfileByUserId(user.id);
    if (!profile) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }
    const { repNombre, repApellido, repCargo, repEmail, repTelefono, repDocumento, ...firmUpdates } = parsed2.data;
    await storage.updateFirmProfile(profile.id, firmUpdates);
    if (firmUpdates.name) {
      await storage.users.updateUser(user.id, { name: firmUpdates.name });
    }
    const hasRepData = repNombre || repApellido || repCargo || repEmail;
    if (hasRepData) {
      if (profile.representanteLegalId) {
        const rep = await storage.representantesLegales.getRepresentante(profile.representanteLegalId);
        if (rep) {
          if (rep.personaId) {
            await storage.personas.updatePersona(rep.personaId, {
              ...repNombre && { nombre: repNombre },
              ...repApellido && { apellido: repApellido },
              ...repTelefono && { telefono: repTelefono },
              ...repDocumento && { documento: repDocumento }
            });
          }
          await storage.representantesLegales.updateRepresentante(profile.representanteLegalId, {
            ...repCargo && { cargo: repCargo },
            ...repEmail && { email: repEmail }
          });
        }
      } else {
        const persona = await storage.personas.createPersona({
          nombre: repNombre || "",
          apellido: repApellido || "",
          telefono: repTelefono || "",
          documento: repDocumento || "",
          tipoDocumentoId: 1
        });
        const rep = await storage.representantesLegales.createRepresentante({
          personaId: persona.id,
          cargo: repCargo || "Representante Legal",
          email: repEmail || ""
        });
        await storage.updateFirmProfile(profile.id, { representanteLegalId: rep.id });
      }
    }
    const updated = await storage.getFirmProfileByUserId(user.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
var firm_profile_default = router8;

// server/routes/lawyer-profile.ts
init_auth();
init_database_storage();
import { Router as Router9 } from "express";
import { z as z6 } from "zod";
var router9 = Router9();
function toResponse(full) {
  return {
    id: full.id,
    userId: full.userId,
    firmId: full.firmId ?? null,
    personaId: full.personaId,
    specialization: full.specialization ?? null,
    licenseNumber: full.licenseNumber ?? null,
    isIndependent: full.isIndependent,
    createdAt: full.createdAt,
    updatedAt: full.updatedAt,
    // flattened persona fields
    firstName: full.persona?.nombre ?? null,
    lastName: full.persona?.apellido ?? null,
    phone: full.persona?.telefono ?? null,
    address: full.persona?.direccion ?? null,
    departamentoId: full.persona?.departamentoId ?? null,
    municipioId: full.persona?.municipioId ?? null,
    documento: full.persona?.documento ?? null,
    tipoDocumentoId: full.persona?.tipoDocumentoId ?? null,
    // relations
    user: full.user ?? null,
    firm: full.firm ?? null
  };
}
var updateLawyerProfileSchema = z6.object({
  firstName: z6.string().optional(),
  lastName: z6.string().optional(),
  phone: z6.string().optional(),
  address: z6.string().optional(),
  specialization: z6.string().optional(),
  licenseNumber: z6.string().optional(),
  departamentoId: z6.string().optional(),
  municipioId: z6.string().optional()
});
router9.get("/lawyer-profile/:lawyerId/profile", authenticate, async (req, res, next) => {
  try {
    const { lawyerId } = req.params;
    if (!lawyerId || Array.isArray(lawyerId)) {
      return res.status(400).json({ error: "ID de abogado inv\xE1lido" });
    }
    const full = await storage.abogados.getLawyer(lawyerId);
    if (!full) return res.status(404).json({ error: "Perfil no encontrado" });
    res.json(toResponse(full));
  } catch (err) {
    next(err);
  }
});
router9.get("/lawyer-profile", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const dbUser = await storage.getUserById(user.id);
    if (!dbUser || dbUser.rol.nombre !== "abogado" && dbUser.rol.nombre !== "lawyer") {
      return res.status(403).json({ error: "Acceso denegado. Solo para abogados." });
    }
    const full = await storage.abogados.getLawyerByUserIdFull(user.id);
    if (!full) return res.status(404).json({ error: "Perfil no encontrado" });
    res.json(toResponse(full));
  } catch (err) {
    next(err);
  }
});
router9.put("/lawyer-profile", authenticate, async (req, res, next) => {
  try {
    const parsed2 = updateLawyerProfileSchema.safeParse(req.body);
    if (!parsed2.success) {
      return res.status(400).json({ error: parsed2.error.errors[0].message });
    }
    const user = req.user;
    const dbUser = await storage.getUserById(user.id);
    if (!dbUser || dbUser.rol.nombre !== "abogado" && dbUser.rol.nombre !== "lawyer") {
      return res.status(403).json({ error: "Acceso denegado. Solo para abogados." });
    }
    const profile = await storage.getAbogadoByIdUser(user.id);
    if (!profile) return res.status(404).json({ error: "Perfil no encontrado" });
    const { firstName, lastName, phone, address, departamentoId, municipioId, specialization, licenseNumber } = parsed2.data;
    await storage.abogados.updateLawyer(profile.id, {
      specialization,
      licenseNumber,
      persona: {
        ...firstName !== void 0 && { nombre: firstName },
        ...lastName !== void 0 && { apellido: lastName },
        ...phone !== void 0 && { telefono: phone },
        ...address !== void 0 && { direccion: address },
        ...departamentoId !== void 0 && { departamentoId },
        ...municipioId !== void 0 && { municipioId }
      }
    });
    const full = await storage.abogados.getLawyerByUserIdFull(user.id);
    res.json(full ? toResponse(full) : {});
  } catch (err) {
    next(err);
  }
});
router9.get("/abogado/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inv\xE1lido" });
    }
    const profile = await storage.abogados.getLawyer(id);
    if (!profile) return res.status(404).json({ error: "Abogado no encontrado" });
    res.json(toResponse(profile));
  } catch (err) {
    next(err);
  }
});
var lawyer_profile_default = router9;

// server/routes/tipos-documento.ts
init_database_storage();
import { Router as Router10 } from "express";
var router10 = Router10();
router10.get("/tipos-documento", async (req, res, next) => {
  try {
    const tiposDocumento2 = await storage.tiposDocumento.getAll();
    res.json(tiposDocumento2);
  } catch (err) {
    next(err);
  }
});
var tipos_documento_default = router10;

// server/routes/ubicacion.ts
init_database_storage();
import { Router as Router11 } from "express";
var router11 = Router11();
router11.get("/departamentos", async (req, res) => {
  try {
    const departamentos2 = await storage.departamentos.findAll();
    res.json(departamentos2);
  } catch (error) {
    console.error("Error fetching departamentos:", error);
    res.status(500).json({ error: "Error al obtener departamentos" });
  }
});
router11.get("/departamentos/:id", async (req, res) => {
  try {
    const departamento = await storage.departamentos.findById(req.params.id);
    if (!departamento) {
      return res.status(404).json({ error: "Departamento no encontrado" });
    }
    res.json(departamento);
  } catch (error) {
    console.error("Error fetching departamento:", error);
    res.status(500).json({ error: "Error al obtener departamento" });
  }
});
router11.get("/municipios", async (req, res) => {
  try {
    const { departamentoId, page = "1", pageSize = "10", search } = req.query;
    if (!departamentoId) {
      return res.status(400).json({ error: "Se requiere departamentoId" });
    }
    const result = await storage.municipios.findByDepartamentoPaginated(
      departamentoId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
      search
    );
    res.json(result);
  } catch (error) {
    console.error("Error fetching municipios:", error);
    res.status(500).json({ error: "Error al obtener municipios" });
  }
});
router11.get("/municipios/search", async (req, res) => {
  try {
    const q = req.query.q ?? "";
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const result = await storage.municipios.searchAll(q, limit, offset);
    res.json(result);
  } catch (error) {
    console.error("Error searching municipios:", error);
    res.status(500).json({ error: "Error al buscar municipios" });
  }
});
router11.get("/municipios/:id", async (req, res) => {
  try {
    const municipio = await storage.municipios.findById(req.params.id);
    if (!municipio) {
      return res.status(404).json({ error: "Municipio no encontrado" });
    }
    res.json(municipio);
  } catch (error) {
    console.error("Error fetching municipio:", error);
    res.status(500).json({ error: "Error al obtener municipio" });
  }
});
var ubicacion_default = router11;

// server/routes/lawyer-firma-history.ts
init_auth();
init_database_storage();
import { Router as Router12 } from "express";
import { z as z7 } from "zod";
var router12 = Router12();
var createHistorySchema = z7.object({
  lawyerId: z7.string().min(1, "El ID del abogado es requerido"),
  firmaId: z7.string().min(1, "El ID de la firma es requerido"),
  fechaIngreso: z7.date().optional(),
  notas: z7.string().optional()
});
var updateHistorySchema = z7.object({
  fechaSalida: z7.date().optional().nullable(),
  motivoSalida: z7.string().optional(),
  estado: z7.enum(["activo", "retirado", "suspendido", "transferido"]).optional(),
  notas: z7.string().optional()
});
var transferLawyerSchema = z7.object({
  nuevaFirmaId: z7.string().min(1, "El ID de la nueva firma es requerido"),
  notas: z7.string().optional()
});
router12.get("/lawyer-firma-history", authenticate, async (req, res, next) => {
  try {
    const { lawyerId, firmaId, estado } = req.query;
    let records = [];
    if (lawyerId && typeof lawyerId === "string") {
      records = await storage.lawyerFirmaHistory.getByLawyerId(lawyerId);
    } else if (firmaId && typeof firmaId === "string") {
      records = await storage.lawyerFirmaHistory.getByFirmaId(firmaId);
    } else {
      records = [];
    }
    if (estado && typeof estado === "string") {
      records = records.filter((r) => r.estado === estado);
    }
    res.json(records);
  } catch (err) {
    next(err);
  }
});
router12.get("/lawyer-firma-history/active/:lawyerId", authenticate, async (req, res, next) => {
  try {
    const { lawyerId } = req.params;
    if (!lawyerId || Array.isArray(lawyerId)) {
      return res.status(400).json({ error: "ID de abogado inv\xE1lido" });
    }
    const record = await storage.lawyerFirmaHistory.getActiveByLawyerId(lawyerId);
    if (!record) {
      return res.status(404).json({ error: "No se encontr\xF3 registro activo para este abogado" });
    }
    res.json(record);
  } catch (err) {
    next(err);
  }
});
router12.get("/lawyer-firma-history/members", authenticate, async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "No se proporcion\xF3 token" });
    }
    const { idProfile } = verifyToken(token);
    if (!idProfile || Array.isArray(idProfile)) {
      return res.status(400).json({ error: "ID de firma inv\xE1lido" });
    }
    const search = typeof req.query.q === "string" ? req.query.q : void 0;
    const members = await storage.lawyerFirmaHistory.getActiveMembersByFirmaId(idProfile, search);
    res.json(members);
  } catch (err) {
    next(err);
  }
});
router12.get("/lawyer-firma-history/count/:firmaId", authenticate, async (req, res, next) => {
  try {
    const { firmaId } = req.params;
    if (!firmaId || Array.isArray(firmaId)) {
      return res.status(400).json({ error: "ID de firma inv\xE1lido" });
    }
    const count4 = await storage.lawyerFirmaHistory.countActiveMembers(firmaId);
    res.json({ count: count4 });
  } catch (err) {
    next(err);
  }
});
router12.get("/lawyer-firma-history/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inv\xE1lido" });
    }
    const record = await storage.lawyerFirmaHistory.getById(id);
    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    res.json(record);
  } catch (err) {
    next(err);
  }
});
router12.post("/lawyer-firma-history", authenticate, async (req, res, next) => {
  try {
    const parsed2 = createHistorySchema.safeParse(req.body);
    if (!parsed2.success) {
      return res.status(400).json({
        error: parsed2.error.errors[0].message
      });
    }
    const user = req.user;
    const existingActive = await storage.lawyerFirmaHistory.getActiveByLawyerId(parsed2.data.lawyerId);
    if (existingActive) {
      return res.status(400).json({
        error: "El abogado ya tiene una membres\xEDa activa en otra firma"
      });
    }
    const record = await storage.lawyerFirmaHistory.create({
      ...parsed2.data,
      createdBy: user.id
    });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});
router12.put("/lawyer-firma-history/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inv\xE1lido" });
    }
    const parsed2 = updateHistorySchema.safeParse(req.body);
    if (!parsed2.success) {
      return res.status(400).json({
        error: parsed2.error.errors[0].message
      });
    }
    const record = await storage.lawyerFirmaHistory.update(id, parsed2.data);
    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    res.json(record);
  } catch (err) {
    next(err);
  }
});
router12.post("/lawyer-firma-history/:id/retire", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inv\xE1lido" });
    }
    const { motivoSalida, notas } = req.body;
    if (!motivoSalida) {
      return res.status(400).json({ error: "El motivo de salida es requerido" });
    }
    const historyRecord = await storage.lawyerFirmaHistory.getById(id);
    if (!historyRecord) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    const record = await storage.lawyerFirmaHistory.retireLawyer(id, motivoSalida, notas);
    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    const lawyerId = historyRecord.lawyerId;
    const bufeteId = historyRecord.firmaId;
    const abogadoProcesoIds = await storage.procesoOwnership.getProcesoIdsByOwner("abogado", lawyerId);
    await storage.procesoSharing.revokeAllForEntity("bufete", bufeteId, abogadoProcesoIds);
    const bufeteProcesoIds = await storage.procesoOwnership.getProcesoIdsByOwner("bufete", bufeteId);
    await storage.removeAbogadoFromProcesos(lawyerId, bufeteProcesoIds);
    await storage.desactivarResponsable(lawyerId, bufeteProcesoIds);
    const bufeteClientIds = await storage.firmClients.getActiveClientIdsByFirm(bufeteId);
    const abogadoActiveClients = await storage.lawyerClients.getActiveClientsByLawyer(lawyerId);
    const abogadoClientIds = abogadoActiveClients.map((lc) => lc.clientId);
    const clientsToDeactivate = abogadoClientIds.filter((clientId) => bufeteClientIds.includes(clientId));
    for (const clientId of clientsToDeactivate) {
      const relation = abogadoActiveClients.find((lc) => lc.clientId === clientId);
      if (relation) {
        await storage.lawyerClients.terminateRelationship(relation.id);
      }
    }
    res.json(record);
  } catch (err) {
    next(err);
  }
});
router12.delete("/lawyer-firma/leave", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    if (user.rol?.nombre !== "abogado") {
      return res.status(403).json({ error: "Solo el abogado puede usar este endpoint" });
    }
    const lawyer = await storage.abogados.getLawyer(user.idProfile);
    if (!lawyer?.firmId) {
      return res.status(400).json({ error: "El abogado no pertenece a ning\xFAn bufete" });
    }
    const lawyerId = user.idProfile;
    const bufeteId = lawyer.firmId;
    const abogadoProcesoIds = await storage.procesoOwnership.getProcesoIdsByOwner("abogado", lawyerId);
    await storage.procesoSharing.revokeAllForEntity("bufete", bufeteId, abogadoProcesoIds);
    const bufeteProcesoIds = await storage.procesoOwnership.getProcesoIdsByOwner("bufete", bufeteId);
    await storage.removeAbogadoFromProcesos(lawyerId, bufeteProcesoIds);
    await storage.desactivarResponsable(lawyerId, bufeteProcesoIds);
    const bufeteClientIds = await storage.firmClients.getActiveClientIdsByFirm(bufeteId);
    const abogadoActiveClients = await storage.lawyerClients.getActiveClientsByLawyer(lawyerId);
    const abogadoClientIds = abogadoActiveClients.map((lc) => lc.clientId);
    const clientsToDeactivate = abogadoClientIds.filter((clientId) => bufeteClientIds.includes(clientId));
    for (const clientId of clientsToDeactivate) {
      const relation = abogadoActiveClients.find((lc) => lc.clientId === clientId);
      if (relation) {
        await storage.lawyerClients.terminateRelationship(relation.id);
      }
    }
    const activeHistory = await storage.lawyerFirmaHistory.getActiveByLawyerId(lawyerId);
    if (activeHistory) {
      await storage.lawyerFirmaHistory.retireLawyer(activeHistory.id, "Salida voluntaria del abogado");
    }
    await storage.abogados.updateFirmId(lawyerId, null);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
router12.post("/lawyer-firma-history/:id/suspend", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inv\xE1lido" });
    }
    const { notas } = req.body;
    const record = await storage.lawyerFirmaHistory.suspendLawyer(id, notas);
    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    res.json(record);
  } catch (err) {
    next(err);
  }
});
router12.post("/lawyer-firma-history/:id/reactivate", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inv\xE1lido" });
    }
    const { notas } = req.body;
    const record = await storage.lawyerFirmaHistory.reactivateLawyer(id, notas);
    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    res.json(record);
  } catch (err) {
    next(err);
  }
});
router12.post("/lawyer-firma-history/:id/transfer", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inv\xE1lido" });
    }
    const parsed2 = transferLawyerSchema.safeParse(req.body);
    if (!parsed2.success) {
      return res.status(400).json({
        error: parsed2.error.errors[0].message
      });
    }
    const user = req.user;
    const record = await storage.lawyerFirmaHistory.transferLawyer(
      id,
      parsed2.data.nuevaFirmaId,
      user.id,
      parsed2.data.notas
    );
    if (!record) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }
    res.json(record);
  } catch (err) {
    next(err);
  }
});
router12.delete("/lawyer-firma-history/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID inv\xE1lido" });
    }
    await storage.lawyerFirmaHistory.delete(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
var lawyer_firma_history_default = router12;

// server/routes/dashboard.ts
init_auth();
init_database_storage();
init_auth();
import { Router as Router13 } from "express";
var router13 = Router13();
router13.get("/firm/dashboard", authenticate, requirePermission("dashboard.ver"), async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "No se proporcion\xF3 token" });
    }
    const { idProfile } = verifyToken(token);
    if (!idProfile) {
      return res.status(400).json({ error: "idProfile is required" });
    }
    const stats = await storage.FirmDashboardStorage.getStats(idProfile);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});
var dashboard_default = router13;

// server/routes/firm-invitations.ts
init_auth();
init_database_storage();
import { Router as Router14 } from "express";
import { z as z8 } from "zod";
var router14 = Router14();
var createInvitationSchema = z8.object({
  lawyerId: z8.string().min(1, "El ID del abogado es requerido"),
  mensaje: z8.string().optional(),
  expiryDays: z8.number().int().min(1).max(90).optional()
});
router14.get("/firm/invitations", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const { status } = req.query;
    if (!user.idProfile) {
      return res.status(403).json({ error: "No tienes una firma asociada" });
    }
    if (user.rol.nombre === "abogado" || user.rol.nombre === "cliente") {
      return res.status(403).json({ error: "No tienes permiso para realizar esta acci\xF3n" });
    }
    const allInvitations = await storage.firmInvitation.getByFirmId(user.idProfile);
    const now = /* @__PURE__ */ new Date();
    let invitations = allInvitations.filter((inv) => !inv.expiresAt || new Date(inv.expiresAt) > now);
    if (status && typeof status === "string") {
      invitations = invitations.filter((inv) => inv.status === status);
    }
    res.json(invitations);
  } catch (err) {
    next(err);
  }
});
router14.get("/firm/invitations/search-lawyers", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const { search } = req.query;
    if (!user.idProfile) {
      return res.status(403).json({ error: "No tienes una firma asociada" });
    }
    if (user.rol.nombre === "abogado" || user.rol.nombre === "cliente") {
      return res.status(403).json({ error: "No tienes permiso para realizar esta acci\xF3n" });
    }
    if (!search || typeof search !== "string") {
      return res.status(400).json({ error: "Par\xE1metro de b\xFAsqueda requerido" });
    }
    const lawyers = await storage.firmInvitation.searchAvailableLawyers(search, user.firmId);
    res.json(lawyers);
  } catch (err) {
    next(err);
  }
});
router14.post("/firm/invitations", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const data = createInvitationSchema.parse(req.body);
    if (!user.idProfile) {
      return res.status(403).json({ error: "No tienes una firma asociada" });
    }
    if (user.rol.nombre === "abogado" || user.rol.nombre === "cliente") {
      return res.status(403).json({ error: "No tienes permiso para realizar esta acci\xF3n" });
    }
    const existing = await storage.firmInvitation.getExistingPending(user.idProfile, data.lawyerId);
    if (existing) {
      return res.status(400).json({
        error: "Ya existe una invitaci\xF3n pendiente para este abogado en esta firma"
      });
    }
    const days = Math.min(Math.max(data.expiryDays ?? 7, 1), 90);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1e3);
    const invitation = await storage.firmInvitation.create({
      firmId: user.idProfile,
      lawyerId: data.lawyerId,
      invitadoPor: user.id,
      mensaje: data.mensaje ?? null,
      expiresAt
    });
    try {
      const lawyerProfile = await storage.lawyerProfiles.getLawyer(data.lawyerId);
      const firm = await storage.firmProfiles.getFirmProfileById(user.idProfile);
      if (lawyerProfile?.userId) {
        broadcastToUser(lawyerProfile.userId, {
          type: "new_invitation",
          data: { invitationId: invitation.id, firmName: firm?.name ?? void 0, action: "created" }
        });
      }
    } catch {
    }
    res.status(201).json(invitation);
  } catch (err) {
    if (err instanceof z8.ZodError) {
      return res.status(400).json({
        error: "Datos inv\xE1lidos",
        details: err.errors
      });
    }
    next(err);
  }
});
router14.post("/firm/invitations/:id/cancel", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user.idProfile) {
      return res.status(403).json({ error: "No tienes una firma asociada" });
    }
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID de invitaci\xF3n inv\xE1lido" });
    }
    const invitation = await storage.firmInvitation.getById(id);
    if (!invitation) {
      return res.status(404).json({ error: "Invitaci\xF3n no encontrada" });
    }
    if (invitation.firmId !== user.idProfile) {
      return res.status(403).json({ error: "No tienes permiso para cancelar esta invitaci\xF3n" });
    }
    await storage.firmInvitation.cancel(id);
    res.json({ message: "Invitaci\xF3n cancelada correctamente" });
  } catch (err) {
    next(err);
  }
});
router14.get("/lawyer/invitations", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const { status } = req.query;
    if (user.rol.id !== 2) {
      return res.status(403).json({ error: "Solo los abogados pueden acceder a estas invitaciones" });
    }
    const lawyerProfile = await storage.lawyerProfiles.getLawyerByUserId(user.id);
    if (!lawyerProfile) {
      return res.status(404).json({ error: "Perfil de abogado no encontrado" });
    }
    const allInvitations = await storage.firmInvitation.getPendingByLawyerId(lawyerProfile.id);
    let invitations = allInvitations;
    if (status && typeof status === "string") {
      invitations = allInvitations.filter((inv) => inv.status === status);
    }
    res.json(invitations);
  } catch (err) {
    next(err);
  }
});
router14.post("/lawyer/invitations/:id/accept", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID de invitaci\xF3n inv\xE1lido" });
    }
    if (user.rol.id !== 2) {
      return res.status(403).json({ error: "Solo los abogados pueden aceptar invitaciones" });
    }
    const invitation = await storage.firmInvitation.getById(id);
    if (!invitation) {
      return res.status(404).json({ error: "Invitaci\xF3n no encontrada" });
    }
    const lawyerProfile = await storage.lawyerProfiles.getLawyerByUserId(user.id);
    if (!lawyerProfile || lawyerProfile.id !== invitation.lawyerId) {
      return res.status(403).json({ error: "No tienes permiso para aceptar esta invitaci\xF3n" });
    }
    if (invitation.status !== "pendiente") {
      return res.status(400).json({ error: "Esta invitaci\xF3n ya ha sido procesada" });
    }
    if (invitation.expiresAt && /* @__PURE__ */ new Date() > invitation.expiresAt) {
      return res.status(400).json({ error: "Esta invitaci\xF3n ha expirado. Solicita una nueva." });
    }
    await storage.firmInvitation.accept(id);
    const activeHistory = await storage.lawyerFirmaHistory.getActiveByLawyerId(lawyerProfile.id);
    if (activeHistory) {
      await storage.lawyerFirmaHistory.retireLawyer(
        activeHistory.id,
        "Transferido a otra firma"
      );
    }
    await storage.lawyerFirmaHistory.create({
      lawyerId: lawyerProfile.id,
      firmaId: invitation.firmId,
      createdBy: user.id,
      notas: `Ingres\xF3 por invitaci\xF3n ${id}`,
      estado: "activo"
    });
    await storage.lawyerProfiles.updateFirmId(lawyerProfile.id, invitation.firmId);
    try {
      const firm = await storage.firmProfiles.getFirmProfileById(invitation.firmId);
      if (firm?.userId) {
        broadcastToUser(firm.userId, {
          type: "new_invitation",
          data: { invitationId: id, action: "accepted" }
        });
      }
    } catch {
    }
    const procesoIds = await storage.procesoOwnership.getProcesoIdsByOwner("abogado", lawyerProfile.id);
    const procesoList = await storage.getProcesosByIds(procesoIds, {});
    res.json({
      message: "Invitaci\xF3n aceptada correctamente",
      requiresProcessDecision: procesoList.length > 0,
      procesos: procesoList
    });
  } catch (err) {
    next(err);
  }
});
router14.post("/lawyer/invitations/:id/reject", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { motivoRechazo } = req.body;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "ID de invitaci\xF3n inv\xE1lido" });
    }
    if (user.rol.id !== 2) {
      return res.status(403).json({ error: "Solo los abogados pueden rechazar invitaciones" });
    }
    const invitation = await storage.firmInvitation.getById(id);
    if (!invitation) {
      return res.status(404).json({ error: "Invitaci\xF3n no encontrada" });
    }
    const lawyerProfile = await storage.lawyerProfiles.getLawyerByUserId(user.id);
    if (!lawyerProfile || lawyerProfile.id !== invitation.lawyerId) {
      return res.status(403).json({ error: "No tienes permiso para rechazar esta invitaci\xF3n" });
    }
    if (invitation.status !== "pendiente") {
      return res.status(400).json({ error: "Esta invitaci\xF3n ya ha sido procesada" });
    }
    await storage.firmInvitation.reject(id, motivoRechazo);
    try {
      const firm = await storage.firmProfiles.getFirmProfileById(invitation.firmId);
      if (firm?.userId) {
        broadcastToUser(firm.userId, {
          type: "new_invitation",
          data: { invitationId: id, action: "rejected" }
        });
      }
    } catch {
    }
    res.json({ message: "Invitaci\xF3n rechazada correctamente" });
  } catch (err) {
    next(err);
  }
});
router14.get("/firm/members/history", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user.idProfile) {
      return res.status(403).json({ error: "No tienes una firma asociada" });
    }
    if (user.rol.nombre === "abogado" || user.rol.nombre === "cliente") {
      return res.status(403).json({ error: "No tienes permiso para realizar esta acci\xF3n" });
    }
    const history = await storage.lawyerFirmaHistory.getAllMembersByFirmaId(user.idProfile);
    res.json(history);
  } catch (err) {
    next(err);
  }
});
router14.post("/firm/members/:lawyerId/remove", authenticate, async (req, res, next) => {
  try {
    const { lawyerId } = req.params;
    const user = req.user;
    if (!user.idProfile) {
      return res.status(403).json({ error: "No tienes una firma asociada" });
    }
    if (user.rol.nombre === "abogado" || user.rol.nombre === "cliente") {
      return res.status(403).json({ error: "No tienes permiso para realizar esta acci\xF3n" });
    }
    const lawyerProfile = await storage.lawyerProfiles.getLawyer(lawyerId);
    if (!lawyerProfile) {
      return res.status(404).json({ error: "Abogado no encontrado" });
    }
    if (lawyerProfile.firmId !== user.idProfile) {
      return res.status(403).json({ error: "Este abogado no pertenece a tu bufete" });
    }
    const activeHistory = await storage.lawyerFirmaHistory.getActiveByLawyerId(lawyerId);
    if (activeHistory) {
      await storage.lawyerFirmaHistory.retireLawyer(activeHistory.id, "Retirado por la firma");
    }
    await storage.lawyerProfiles.updateFirmId(lawyerId, null);
    const procesosAfectados = await storage.procesos.getActiveProcesosByResponsable(lawyerId);
    const firmUser = await storage.firmProfiles.getFirmProfileById(user.idProfile);
    for (const proceso of procesosAfectados) {
      await storage.procesos.setResponsable(proceso.id, null, {
        razon: "Responsable retirado del bufete"
      });
      if (firmUser?.userId) {
        await storage.appNotifications.createNotification(
          firmUser.userId,
          "proceso_sin_responsable",
          "Proceso sin responsable",
          `El proceso ${proceso.radicado} se qued\xF3 sin responsable. El abogado fue retirado del bufete. Asigna uno inmediatamente.`,
          { procesoId: proceso.id, radicado: proceso.radicado }
        );
        broadcastToUser(firmUser.userId, {
          type: "proceso_sin_responsable",
          data: {
            procesoId: proceso.id,
            radicado: proceso.radicado,
            message: `El proceso ${proceso.radicado} se qued\xF3 sin responsable`
          }
        });
      }
    }
    try {
      if (lawyerProfile.userId) {
        broadcastToUser(lawyerProfile.userId, {
          type: "firm_member_removed",
          data: { lawyerId, action: "removed" }
        });
      }
    } catch {
    }
    res.json({
      message: "Abogado retirado del bufete correctamente",
      procesosDesasignados: procesosAfectados.length
    });
  } catch (err) {
    next(err);
  }
});
var firm_invitations_default = router14;

// server/routes/firm-roles.ts
init_auth();
init_database_storage();
init_user_schema();
import { Router as Router15 } from "express";
import { z as z9 } from "zod";

// server/middleware/require-feature.ts
function requireFeature(featureCode) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user?.id) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }
      if (user.rol?.nombre === "cliente") {
        next();
        return;
      }
      const has = await subscriptionService.hasFeature(user.id, featureCode);
      if (!has) {
        res.status(402).json({
          error: "FEATURE_NOT_AVAILABLE",
          feature: featureCode,
          mensaje: "Esta funcionalidad no est\xE1 disponible en tu plan actual. Actualiza para acceder."
        });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// server/routes/firm-roles.ts
var router15 = Router15();
function requireBufete(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "No autenticado" });
  if (req.user.rol.id !== EnumRol.BUFETE.id) {
    return res.status(403).json({ error: "Solo los bufetes pueden acceder a este recurso" });
  }
  next();
}
var guardBufete = [authenticate, requireBufete, requireFeature("roles_custom")];
function getFirmId(req, res) {
  const firmId = req.user?.idProfile;
  if (!firmId) {
    res.status(404).json({ error: "Perfil de bufete no encontrado" });
    return null;
  }
  return firmId;
}
router15.get("/firm/roles", ...guardBufete, async (req, res, next) => {
  try {
    const firmId = getFirmId(req, res);
    if (!firmId) return;
    const roles2 = await storage.roles.getFirmRoles(firmId);
    res.json(roles2);
  } catch (err) {
    next(err);
  }
});
var createRolSchema = z9.object({
  nombre: z9.string().min(2).max(50),
  descripcion: z9.string().max(255).optional()
});
router15.post("/firm/roles", ...guardBufete, async (req, res, next) => {
  try {
    const parsed2 = createRolSchema.safeParse(req.body);
    if (!parsed2.success) {
      return res.status(400).json({ error: parsed2.error.errors[0].message });
    }
    const firmId = getFirmId(req, res);
    if (!firmId) return;
    const newRol = await storage.roles.createRol({
      nombre: parsed2.data.nombre,
      descripcion: parsed2.data.descripcion ?? null,
      firmId
    });
    res.status(201).json(newRol);
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY" || err?.message?.includes("Duplicate entry")) {
      return res.status(400).json({ error: "Ya existe un rol con ese nombre en tu bufete" });
    }
    next(err);
  }
});
router15.delete("/firm/roles/:rolId", ...guardBufete, async (req, res, next) => {
  try {
    const rolId = parseInt(req.params.rolId, 10);
    if (isNaN(rolId)) return res.status(400).json({ error: "ID de rol inv\xE1lido" });
    const firmId = getFirmId(req, res);
    if (!firmId) return;
    const rol = await storage.roles.getRol(rolId);
    if (!rol || rol.firmId !== firmId) {
      return res.status(404).json({ error: "Rol no encontrado en tu bufete" });
    }
    const inUse = await storage.roles.hasFirmRolAssigned(rolId);
    if (inUse) {
      return res.status(409).json({
        error: "No se puede eliminar: hay abogados asignados a este rol. Reas\xEDgnalos primero."
      });
    }
    await storage.roles.deleteRol(rolId);
    res.json({ message: "Rol eliminado correctamente" });
  } catch (err) {
    next(err);
  }
});
router15.get("/firm/roles/:rolId/permisos", ...guardBufete, async (req, res, next) => {
  try {
    const rolId = parseInt(req.params.rolId, 10);
    if (isNaN(rolId)) return res.status(400).json({ error: "ID de rol inv\xE1lido" });
    const firmId = getFirmId(req, res);
    if (!firmId) return;
    const rol = await storage.roles.getRol(rolId);
    if (!rol || rol.firmId !== firmId) {
      return res.status(404).json({ error: "Rol no encontrado en tu bufete" });
    }
    const permisos3 = await storage.getPermisosByRol(rolId);
    res.json(permisos3);
  } catch (err) {
    next(err);
  }
});
var setPermisosSchema = z9.object({
  permisosIds: z9.array(z9.number().int().positive())
});
router15.put("/firm/roles/:rolId/permisos", ...guardBufete, async (req, res, next) => {
  try {
    const rolId = parseInt(req.params.rolId, 10);
    if (isNaN(rolId)) return res.status(400).json({ error: "ID de rol inv\xE1lido" });
    const parsed2 = setPermisosSchema.safeParse(req.body);
    if (!parsed2.success) {
      return res.status(400).json({ error: parsed2.error.errors[0].message });
    }
    const firmId = getFirmId(req, res);
    if (!firmId) return;
    const rol = await storage.roles.getRol(rolId);
    if (!rol || rol.firmId !== firmId) {
      return res.status(404).json({ error: "Rol no encontrado en tu bufete" });
    }
    const allPermisos = await storage.getPermisos();
    const validIds = new Set(allPermisos.map((p) => p.id));
    const invalidIds = parsed2.data.permisosIds.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `IDs de permiso inv\xE1lidos: ${invalidIds.join(", ")}` });
    }
    await storage.permisos.assignPermisosToRol(rolId, parsed2.data.permisosIds);
    const updatedPermisos = allPermisos.filter((p) => parsed2.data.permisosIds.includes(p.id));
    res.json({ message: "Permisos actualizados", permisos: updatedPermisos });
  } catch (err) {
    next(err);
  }
});
router15.get("/firm/lawyers/:lawyerId/firm-role", ...guardBufete, async (req, res, next) => {
  try {
    const { lawyerId } = req.params;
    const firmId = getFirmId(req, res);
    if (!firmId) return;
    const active = await storage.lawyerFirmaHistory.getActiveByLawyerId(lawyerId);
    if (!active || active.firmaId !== firmId) {
      return res.status(404).json({ error: "El abogado no es miembro activo de tu bufete" });
    }
    res.json({ firmRolId: active.firmRolId ?? null });
  } catch (err) {
    next(err);
  }
});
var assignRolSchema = z9.object({
  firmRolId: z9.number().int().positive().nullable()
});
router15.put("/firm/lawyers/:lawyerId/firm-role", ...guardBufete, async (req, res, next) => {
  try {
    const { lawyerId } = req.params;
    const parsed2 = assignRolSchema.safeParse(req.body);
    if (!parsed2.success) {
      return res.status(400).json({ error: parsed2.error.errors[0].message });
    }
    const firmId = getFirmId(req, res);
    if (!firmId) return;
    if (parsed2.data.firmRolId !== null) {
      const rol = await storage.roles.getRol(parsed2.data.firmRolId);
      if (!rol || rol.firmId !== firmId) {
        return res.status(400).json({ error: "El rol no pertenece a tu bufete" });
      }
    }
    const updated = await storage.lawyerFirmaHistory.setFirmRol(
      lawyerId,
      firmId,
      parsed2.data.firmRolId
    );
    if (!updated) {
      return res.status(404).json({ error: "El abogado no es miembro activo de tu bufete" });
    }
    const lawyerProfile = await storage.lawyerProfiles.getLawyer(lawyerId);
    if (lawyerProfile?.userId) {
      await storage.sessions.revokeAllForUser(lawyerProfile.userId);
    }
    res.json({ message: "Rol asignado correctamente", history: updated });
  } catch (err) {
    next(err);
  }
});
var firm_roles_default = router15;

// server/routes/chat.ts
init_auth();
import path2 from "path";
import crypto3 from "crypto";
import { Router as Router16 } from "express";
import multer2 from "multer";
init_s3_storage();

// server/admin/middleware/require-admin.ts
var ADMIN_ROLES = ["admin_super", "admin_soporte", "admin_finanzas"];
function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user?.id) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  if (!ADMIN_ROLES.includes(user.rol?.nombre)) {
    res.status(403).json({ error: "Acceso denegado: se requiere rol de administrador" });
    return;
  }
  next();
}
function requireAdminRole(...roles2) {
  return (req, res, next) => {
    const user = req.user;
    if (!roles2.includes(user?.rol?.nombre)) {
      res.status(403).json({
        error: `Acceso denegado: se requiere ${roles2.join(" o ")}`
      });
      return;
    }
    next();
  };
}

// server/routes/chat.ts
var router16 = Router16();
var upload2 = multer2({
  storage: multer2.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
var ALLOWED_MIMES2 = /* @__PURE__ */ new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);
function detectMimeFromBuffer2(buf) {
  if (buf.length < 4) return null;
  if (buf[0] === 37 && buf[1] === 80 && buf[2] === 68 && buf[3] === 70) return "application/pdf";
  if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) return "image/jpeg";
  if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) return "image/png";
  if (buf[0] === 80 && buf[1] === 75 && buf[2] === 3 && buf[3] === 4) {
    return "application/zip";
  }
  return null;
}
var IMAGE_MAX = 5 * 1024 * 1024;
var DOC_MAX = 10 * 1024 * 1024;
async function ensureConversationAccess(req, res, conversationId) {
  try {
    const user = req.user;
    await chatService.assertConversationAccess(user, conversationId);
    return true;
  } catch (err) {
    const msg = err.message;
    if (msg === "Forbidden") {
      return res.status(403).json({ error: "No autorizado" });
    }
    if (msg === "FeatureUnavailable") {
      return res.status(402).json({
        error: "FEATURE_NOT_AVAILABLE",
        feature: "chat",
        mensaje: "Esta funcionalidad no est\xE1 disponible en tu plan actual. Actualiza para acceder."
      });
    }
    if (msg === "NotFound") {
      return res.status(404).json({ error: "CONVERSATION_NOT_FOUND" });
    }
    throw err;
  }
}
router16.get(
  "/chat/unread-count",
  authenticate,
  async (req, res, next) => {
    try {
      const userId2 = req.user?.id;
      const count4 = await chatService.getUnreadCount(userId2);
      res.json({ count: count4 });
    } catch (err) {
      next(err);
    }
  }
);
router16.get(
  "/chat/conversations",
  authenticate,
  requireFeature("chat"),
  async (req, res, next) => {
    try {
      const userId2 = req.user?.id;
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
      const offset = Math.max(parseInt(req.query.offset) || 0, 0);
      const result = await chatService.getConversations(userId2, limit, offset);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
router16.post(
  "/chat/conversations",
  authenticate,
  requireFeature("chat"),
  async (req, res, next) => {
    try {
      const userId2 = req.user?.id;
      const { targetUserId, type } = req.body;
      if (!targetUserId || !type) {
        return res.status(400).json({ error: "targetUserId y type son requeridos" });
      }
      if (type === "admin_support") {
        return res.status(403).json({ error: "Usa el endpoint dedicado de soporte" });
      }
      const conversation = await chatService.getOrCreateConversation(userId2, targetUserId, type);
      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  }
);
router16.post(
  "/chat/support-conversation",
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.user;
      const targetUserId = typeof req.body?.targetUserId === "string" ? req.body.targetUserId : void 0;
      if (targetUserId && !ADMIN_ROLES.includes(user.rol?.nombre ?? "")) {
        return res.status(403).json({ error: "No autorizado" });
      }
      const conversation = targetUserId ? await chatService.getOrCreateSupportConversationForAdmin(user.id, targetUserId) : await chatService.getOrCreateSupportConversationForUser(user.id);
      res.status(201).json(conversation);
    } catch (err) {
      if (err.message === "NO_SUPPORT_ADMIN") {
        return res.status(503).json({ error: "SUPPORT_NOT_AVAILABLE" });
      }
      next(err);
    }
  }
);
router16.get(
  "/chat/conversations/:id/messages",
  authenticate,
  async (req, res, next) => {
    try {
      const userId2 = req.user?.id;
      const id = req.params.id;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
      const access = await ensureConversationAccess(req, res, id);
      if (access !== true) return access;
      const msgs = await chatService.getMessages(id, userId2, limit, offset);
      res.json(msgs);
    } catch (err) {
      if (err.message === "Forbidden") {
        return res.status(403).json({ error: "No autorizado" });
      }
      next(err);
    }
  }
);
router16.post(
  "/chat/conversations/:id/messages",
  authenticate,
  async (req, res, next) => {
    try {
      const userId2 = req.user?.id;
      const id = req.params.id;
      const { content } = req.body;
      const access = await ensureConversationAccess(req, res, id);
      if (access !== true) return access;
      if (!content?.trim()) {
        return res.status(400).json({ error: "El contenido no puede estar vac\xEDo" });
      }
      const message = await chatService.sendMessage(id, userId2, content.trim());
      res.status(201).json(message);
    } catch (err) {
      if (err.message === "Forbidden") {
        return res.status(403).json({ error: "No autorizado" });
      }
      next(err);
    }
  }
);
router16.post(
  "/chat/conversations/:conversationId/upload",
  upload2.single("file"),
  authenticate,
  async (req, res, next) => {
    try {
      const userId2 = req.user?.id;
      const conversationId = req.params.conversationId;
      const procesoId = typeof req.body.procesoId === "string" ? req.body.procesoId : null;
      const tempId = typeof req.body.tempId === "string" ? req.body.tempId : null;
      if (!req.file) {
        return res.status(400).json({ error: "FILE_MISSING" });
      }
      const access = await ensureConversationAccess(req, res, conversationId);
      if (access !== true) return access;
      const isMember = await chatService.getParticipantUserIds(conversationId).then((ids) => ids.includes(userId2));
      if (!isMember) {
        return res.status(403).json({ error: "NOT_PARTICIPANT" });
      }
      const mime = req.file.mimetype;
      if (!ALLOWED_MIMES2.has(mime)) {
        return res.status(400).json({ error: "INVALID_TYPE" });
      }
      const detectedMime = detectMimeFromBuffer2(req.file.buffer);
      const isZipBased = mime.includes("wordprocessingml") || mime.includes("spreadsheetml");
      if (detectedMime === null || detectedMime !== mime && !(isZipBased && detectedMime === "application/zip")) {
        return res.status(400).json({ error: "INVALID_TYPE" });
      }
      const isImage = mime.startsWith("image/");
      const maxBytes = isImage ? IMAGE_MAX : DOC_MAX;
      if (req.file.size > maxBytes) {
        return res.status(400).json({ error: "FILE_TOO_LARGE" });
      }
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear().toString();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const uuid = crypto3.randomUUID();
      const ext = path2.extname(req.file.originalname).toLowerCase() || "";
      const s3Key = procesoId ? `procesos/${procesoId}/chat/${year}/${month}/${uuid}${ext}` : `chat/${conversationId}/${year}/${month}/${uuid}${ext}`;
      const fileHash = crypto3.createHash("sha256").update(req.file.buffer).digest("hex");
      await uploadBuffer(s3Key, req.file.buffer, mime);
      const message = await chatService.sendFileMessage({
        conversationId,
        senderId: userId2,
        fileKey: s3Key,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileMime: mime,
        fileHash
      });
      broadcastToRoom(conversationId, {
        type: "new_message",
        data: { ...message, tempId: tempId ?? void 0 }
      });
      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  }
);
router16.get(
  "/chat/messages/:messageId/download",
  authenticate,
  async (req, res, next) => {
    try {
      const userId2 = req.user?.id;
      const messageId = req.params.messageId;
      const url2 = await chatService.getDownloadUrl(messageId, userId2);
      res.json({ url: url2 });
    } catch (err) {
      const msg = err.message;
      if (msg === "Forbidden") return res.status(403).json({ error: "NOT_PARTICIPANT" });
      if (msg === "NotFound") return res.status(404).json({ error: "MESSAGE_NOT_FOUND" });
      next(err);
    }
  }
);
router16.post(
  "/chat/conversations/:id/read",
  authenticate,
  async (req, res, next) => {
    try {
      const userId2 = req.user?.id;
      const id = req.params.id;
      const access = await ensureConversationAccess(req, res, id);
      if (access !== true) return access;
      await chatService.markRead(id, userId2);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);
router16.delete(
  "/chat/messages/:messageId",
  authenticate,
  async (req, res, next) => {
    try {
      const userId2 = req.user?.id;
      const messageId = req.params.messageId;
      const deleted = await chatService.deleteMessage(messageId, userId2);
      if (!deleted) {
        return res.status(403).json({ error: "No autorizado o mensaje no encontrado" });
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);
var chat_default = router16;

// server/routes/tareas.ts
init_auth();
import { Router as Router17 } from "express";
import { z as z10 } from "zod";
import multer3 from "multer";
init_database_storage();
var router17 = Router17();
var tiempoUnidadEnum = z10.enum(["minutos", "horas", "dias", "semanas"]).nullable().optional();
var ALLOWED_MIMES3 = /* @__PURE__ */ new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);
var tareaUpload = multer3({
  storage: multer3.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    cb(null, ALLOWED_MIMES3.has(file.mimetype));
  }
});
var createTareaSchema = z10.object({
  titulo: z10.string().min(1, "El t\xEDtulo es requerido").max(255),
  descripcion: z10.string().nullable().optional(),
  prioridad: z10.enum(["baja", "media", "alta", "urgente"]).optional(),
  fechaLimite: z10.string().nullable().optional(),
  asignadoA: z10.string().uuid("ID de abogado inv\xE1lido").nullable().optional(),
  legalStage: z10.string().max(50).nullable().optional(),
  requerida: z10.boolean().optional(),
  tiempoEstimado: z10.number().nullable().optional(),
  tiempoUnidad: tiempoUnidadEnum
});
var updateTareaSchema = z10.object({
  titulo: z10.string().min(1).max(255).optional(),
  descripcion: z10.string().nullable().optional(),
  prioridad: z10.enum(["baja", "media", "alta", "urgente"]).optional(),
  fechaLimite: z10.string().nullable().optional(),
  asignadoA: z10.string().uuid("ID de abogado inv\xE1lido").nullable().optional(),
  legalStage: z10.string().max(50).nullable().optional(),
  requerida: z10.boolean().optional(),
  tiempoEstimado: z10.number().nullable().optional(),
  tiempoUnidad: tiempoUnidadEnum
});
var addObservacionSchema = z10.object({
  contenido: z10.string().min(1, "El contenido es requerido")
});
var createSubtareaSchema = z10.object({
  titulo: z10.string().min(1).max(255),
  descripcion: z10.string().nullable().optional(),
  tiempoEstimado: z10.number().nullable().optional(),
  tiempoUnidad: tiempoUnidadEnum
});
var updateSubtareaSchema = z10.object({
  titulo: z10.string().min(1).max(255).optional(),
  descripcion: z10.string().nullable().optional(),
  estado: z10.enum(["pendiente", "completada"]).optional(),
  tiempoEstimado: z10.number().nullable().optional(),
  tiempoUnidad: tiempoUnidadEnum
});
var cambiarEstadoSchema = z10.object({
  estado: z10.enum(["pendiente", "en_progreso", "completada", "cancelada"])
});
function userId(req) {
  return req.user.id;
}
router17.post(
  "/procesos/:procesoId/tareas",
  authenticate,
  validate(createTareaSchema),
  async (req, res, next) => {
    try {
      const procesoId = req.params.procesoId;
      if (!procesoId || typeof procesoId !== "string") {
        return res.status(400).json({ error: "procesoId is required" });
      }
      const user = req.user;
      const rol = user.rol.nombre;
      const idProfile = user.idProfile;
      if (!idProfile) return res.status(400).json({ error: "idProfile requerido" });
      let proceso = null;
      if (rol === "abogado") proceso = await storage.getProceoByAbogadoIdAndProcesoId(idProfile, procesoId);
      else if (rol === "bufete" || rol === "corporacion") proceso = await storage.getProcesoByFirmaIdAndProcesoId(idProfile, procesoId);
      if (!proceso) return res.status(403).json({ error: "Sin acceso al proceso" });
      const tarea = await tareaService.createTarea(procesoId, req.body, userId(req));
      res.status(201).json(tarea);
    } catch (err) {
      next(err);
    }
  }
);
router17.get(
  "/procesos/:procesoId/tareas",
  authenticate,
  async (req, res, next) => {
    try {
      const procesoId = req.params.procesoId;
      if (!procesoId || typeof procesoId !== "string") {
        return res.status(400).json({ error: "procesoId is required" });
      }
      const user = req.user;
      const rol = user.rol.nombre;
      const idProfile = user.idProfile;
      if (!idProfile) return res.status(400).json({ error: "idProfile requerido" });
      let proceso = null;
      if (rol === "abogado") proceso = await storage.getProceoByAbogadoIdAndProcesoId(idProfile, procesoId);
      else if (rol === "bufete" || rol === "corporacion") proceso = await storage.getProcesoByFirmaIdAndProcesoId(idProfile, procesoId);
      else if (rol === "cliente") proceso = await storage.getProcesoByClienteIdAndProcesoId(idProfile, procesoId);
      if (!proceso) return res.status(403).json({ error: "Sin acceso al proceso" });
      const stage = req.query.stage;
      const result = await tareaService.getTareasByProceso(procesoId, userId(req), stage);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
router17.get(
  "/tareas/mis-tareas",
  authenticate,
  async (req, res, next) => {
    try {
      const result = await tareaService.getMisTareas(userId(req));
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
router17.get(
  "/tareas/:id",
  authenticate,
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      const tarea = await storage.tareas.findById(tareaId);
      if (!tarea) return res.status(404).json({ error: "Tarea no encontrada" });
      res.json(tarea);
    } catch (err) {
      next(err);
    }
  }
);
router17.patch(
  "/tareas/:id",
  authenticate,
  validate(updateTareaSchema),
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      if (!tareaId || typeof tareaId !== "string") {
        return res.status(400).json({ error: "tareaId is required" });
      }
      const tarea = await tareaService.updateTarea(tareaId, req.body, userId(req));
      res.json(tarea);
    } catch (err) {
      next(err);
    }
  }
);
router17.patch(
  "/tareas/:id/estado",
  authenticate,
  validate(cambiarEstadoSchema),
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      if (!tareaId || typeof tareaId !== "string") {
        return res.status(400).json({ error: "tareaId is required" });
      }
      const tarea = await tareaService.cambiarEstado(tareaId, req.body, userId(req));
      res.json(tarea);
    } catch (err) {
      if (err?.code === "SUBTASKS_PENDING") {
        return res.status(422).json({
          error: "SUBTASKS_PENDING",
          message: err.message,
          tareaTitulo: err.tareaTitulo,
          subtareasPendientes: err.subtareasPendientes ?? []
        });
      }
      next(err);
    }
  }
);
router17.patch(
  "/tareas/:id/completar",
  authenticate,
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      if (!tareaId || typeof tareaId !== "string") {
        return res.status(400).json({ error: "tareaId is required" });
      }
      const tarea = await tareaService.completarTarea(tareaId, userId(req));
      res.json(tarea);
    } catch (err) {
      if (err?.code === "SUBTASKS_PENDING") {
        return res.status(422).json({
          error: "SUBTASKS_PENDING",
          message: err.message,
          tareaTitulo: err.tareaTitulo,
          subtareasPendientes: err.subtareasPendientes ?? []
        });
      }
      next(err);
    }
  }
);
router17.delete(
  "/tareas/:id",
  authenticate,
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      if (!tareaId || typeof tareaId !== "string") {
        return res.status(400).json({ error: "tareaId is required" });
      }
      await tareaService.deleteTarea(tareaId, userId(req));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
router17.get(
  "/tareas/:id/observaciones",
  authenticate,
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      const result = await tareaService.getObservaciones(tareaId, userId(req));
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
router17.post(
  "/tareas/:id/observaciones",
  authenticate,
  validate(addObservacionSchema),
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      const result = await tareaService.addObservacion(tareaId, req.body, userId(req));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);
router17.get(
  "/tareas/:id/subtareas",
  authenticate,
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      const result = await tareaService.getSubtareas(tareaId, userId(req));
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
router17.post(
  "/tareas/:id/subtareas",
  authenticate,
  validate(createSubtareaSchema),
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      const result = await tareaService.addSubtarea(tareaId, req.body, userId(req));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);
router17.patch(
  "/tareas/:id/subtareas/:subId",
  authenticate,
  validate(updateSubtareaSchema),
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      const subId = req.params.subId;
      const result = await tareaService.updateSubtarea(tareaId, subId, req.body, userId(req));
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
router17.delete(
  "/tareas/:id/subtareas/:subId",
  authenticate,
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      const subId = req.params.subId;
      await tareaService.deleteSubtarea(tareaId, subId, userId(req));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
router17.get(
  "/tareas/:id/historial",
  authenticate,
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      const result = await tareaService.getHistorial(tareaId, userId(req));
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
router17.get(
  "/tareas/:id/archivos",
  authenticate,
  async (req, res, next) => {
    try {
      const result = await tareaService.getArchivos(req.params.id, userId(req));
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
router17.post(
  "/tareas/:id/archivos",
  authenticate,
  tareaUpload.single("file"),
  async (req, res, next) => {
    try {
      const tareaId = req.params.id;
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No se proporcion\xF3 archivo" });
      const uid = req.user?.id;
      const fileSizeMb = file.size / (1024 * 1024);
      const storageCheck = await subscriptionService.checkLimit(uid, "storage", fileSizeMb);
      if (!storageCheck.permitido) {
        return res.status(402).json({
          error: "Has alcanzado el l\xEDmite de almacenamiento de tu plan. Actualiza para continuar.",
          usado: storageCheck.actual,
          maximo: storageCheck.maximo
        });
      }
      const tarea = await storage.tareas.findRawById(tareaId);
      if (!tarea) return res.status(404).json({ error: "Tarea no encontrada" });
      const proceso = await storage.getProceso(tarea.procesoId);
      if (!proceso) return res.status(404).json({ error: "Proceso no encontrado" });
      const cliente = await storage.getCliente(proceso.clienteId);
      if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
      const { uploadDocumentToS3: uploadDocumentToS32 } = await Promise.resolve().then(() => (init_s3_storage(), s3_storage_exports));
      const s3Key = await uploadDocumentToS32(
        file.buffer,
        cliente.id,
        tarea.procesoId,
        file.originalname,
        file.mimetype
      );
      const result = await tareaService.addArchivo(
        tareaId,
        file.originalname,
        s3Key,
        file.mimetype,
        file.size,
        userId(req)
      );
      await subscriptionService.incrementUsage(uid, "storage", Math.ceil(fileSizeMb * 10) / 10).catch(() => {
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);
router17.get(
  "/tareas/:id/archivos/:archivoId/download",
  authenticate,
  async (req, res, next) => {
    try {
      const archivos = await tareaService.getArchivos(req.params.id, userId(req));
      const archivo = archivos.find((a) => a.id === req.params.archivoId);
      if (!archivo) return res.status(404).json({ error: "Archivo no encontrado" });
      const { getPresignedDownloadUrl: getPresignedDownloadUrl2 } = await Promise.resolve().then(() => (init_s3_storage(), s3_storage_exports));
      const presignedUrl = await getPresignedDownloadUrl2(archivo.url, archivo.nombre, 300);
      res.redirect(presignedUrl);
    } catch (err) {
      next(err);
    }
  }
);
router17.delete(
  "/tareas/:id/archivos/:archivoId",
  authenticate,
  async (req, res, next) => {
    try {
      const s3Key = await tareaService.deleteArchivo(
        req.params.id,
        req.params.archivoId,
        userId(req)
      );
      Promise.resolve().then(() => (init_s3_storage(), s3_storage_exports)).then(({ deleteDocumentFromS3: deleteDocumentFromS32 }) => deleteDocumentFromS32(s3Key)).catch(() => {
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
var tareas_default = router17;

// server/routes/community.ts
init_auth();
import { Router as Router18 } from "express";
import { z as z11 } from "zod";

// server/services/community.service.ts
init_database_storage();
import { randomUUID as randomUUID36 } from "crypto";

// server/services/matching.service.ts
init_database_storage();
var NOTIFY_LIMIT_PER_HOUR = 10;
var notifyCount = /* @__PURE__ */ new Map();
function canNotify(lawyerUserId) {
  const now = Date.now();
  const bucket = notifyCount.get(lawyerUserId);
  if (!bucket || now - bucket.windowStart > 36e5) {
    notifyCount.set(lawyerUserId, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= NOTIFY_LIMIT_PER_HOUR) return false;
  bucket.count++;
  return true;
}
var MatchingService = class {
  /**
   * Main entry point. Called async after post creation (fire-and-forget).
   * Finds relevant lawyers, creates match records, sends notifications.
   */
  async matchLawyersToPost(post) {
    try {
      const candidates = await storage.matching.findCandidates(
        post.caseType,
        post.city,
        post.id,
        post.createdAt ? new Date(post.createdAt) : /* @__PURE__ */ new Date()
      );
      if (candidates.length === 0) return;
      const results = await Promise.allSettled(
        candidates.map((candidate) => this.processCandidate(post, candidate))
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        console.error(`[Matching] ${failed.length} processCandidate failures:`, failed);
      }
    } catch (err) {
      console.error("[MatchingService] matchLawyersToPost error:", err);
    }
  }
  async processCandidate(post, candidate) {
    const match = await storage.matching.createMatch(post.id, candidate.lawyerId, candidate.score);
    if (!match) return;
    if (!canNotify(candidate.userId)) {
      await storage.matching.markNotified(post.id, candidate.lawyerId);
      return;
    }
    const urgencyPrefix = post.isUrgent === 1 ? "\u26A1 URGENTE \xB7 " : "";
    const caseLabel = post.caseType ? `(${post.caseType.charAt(0).toUpperCase() + post.caseType.slice(1)}) ` : "";
    await storage.appNotifications.createNotification(
      candidate.userId,
      "case_match",
      `${urgencyPrefix}Nuevo caso para ti`,
      `${caseLabel}${post.title}`,
      {
        postId: post.id,
        caseType: post.caseType,
        isUrgent: post.isUrgent,
        city: post.city,
        score: candidate.score
      }
    ).catch(() => {
    });
    broadcastToUser(candidate.userId, {
      type: "new_notification",
      data: { titulo: urgencyPrefix + "Nuevo caso para ti", mensaje: `${caseLabel}${post.title}`, tipo: "case_match" }
    });
    broadcastToUser(candidate.userId, {
      type: "new_case_match",
      data: {
        postId: post.id,
        title: post.title,
        caseType: post.caseType,
        isUrgent: post.isUrgent,
        city: post.city,
        score: candidate.score
      }
    });
    await storage.matching.markNotified(post.id, candidate.lawyerId).catch(() => {
    });
  }
  /**
   * Returns the personalised feed for a lawyer.
   * Sections: urgent (isUrgent=1), recommended (score≥6), recent (rest).
   */
  async getLawyerFeed(lawyerId, lawyerUserId, limit = 60, offset = 0) {
    const rows = await storage.matching.getMatchedPostIds(lawyerId, limit, offset);
    if (rows.length === 0) {
      return { urgent: [], recommended: [], recent: [] };
    }
    const postIds = rows.map((r) => r.postId);
    const dtos = await storage.community.getPosts(
      postIds.length,
      0,
      { ids: postIds },
      lawyerUserId
    );
    const meta = new Map(rows.map((r) => [r.postId, r]));
    const sorted = [...dtos].sort((a, b) => {
      const ma = meta.get(a.id);
      const mb = meta.get(b.id);
      if (mb.isUrgent !== ma.isUrgent) return mb.isUrgent - ma.isUrgent;
      if (mb.score !== ma.score) return mb.score - ma.score;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const nonUrgentScores = rows.filter((r) => r.isUrgent !== 1).map((r) => r.score).sort((a, b) => b - a);
    const p80Index = Math.floor(nonUrgentScores.length * 0.2);
    const dynamicThreshold = Math.max(50, nonUrgentScores[p80Index] ?? 70);
    const urgent = [];
    const recommended = [];
    const recent = [];
    for (const dto of sorted) {
      const m = meta.get(dto.id);
      if (!m) continue;
      if (m.isUrgent === 1) {
        urgent.push(dto);
      } else if (m.score >= dynamicThreshold) {
        recommended.push(dto);
      } else {
        recent.push(dto);
      }
    }
    return { urgent, recommended, recent };
  }
  /** Mark post as seen in lawyer's feed. */
  async markSeen(postId, lawyerId) {
    await storage.matching.markSeen(postId, lawyerId).catch(() => {
    });
  }
};
var matchingService = new MatchingService();

// server/services/community.service.ts
function notify(userId2, titulo, mensaje, tipo) {
  broadcastToUser(userId2, { type: "new_notification", data: { titulo, mensaje, tipo } });
}
var CommunityService = class {
  // ── Posts ─────────────────────────────────────────────────────────────────
  async createPost(userId2, data) {
    const post = await storage.community.createPost({
      userId: userId2,
      title: data.title,
      content: data.content,
      visibility: data.visibility,
      caseType: data.caseType ?? null,
      isUrgent: data.isUrgent ? 1 : 0,
      city: data.city ?? null
    });
    if (data.tagIds && data.tagIds.length > 0) {
      await storage.community.setPostTags(post.id, data.tagIds);
    }
    matchingService.matchLawyersToPost(post).catch(() => {
    });
    return await storage.community.getPostDTO(post.id, userId2);
  }
  async getPosts(limit = 20, offset = 0, filter = {}, userId2) {
    return storage.community.getPosts(limit, offset, filter, userId2);
  }
  async getPost(id, userId2) {
    return storage.community.getPostDTO(id, userId2);
  }
  async updatePost(postId, userId2, data) {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    if (post.userId !== userId2) throw Object.assign(new Error("Sin permiso"), { status: 403 });
    await storage.community.updatePost(postId, {
      title: data.title,
      content: data.content,
      caseType: data.caseType,
      isUrgent: data.isUrgent !== void 0 ? data.isUrgent ? 1 : 0 : void 0,
      city: data.city
    });
    if (data.tagIds !== void 0) {
      await storage.community.setPostTags(postId, data.tagIds);
    }
    return await storage.community.getPostDTO(postId, userId2);
  }
  async deletePost(postId, userId2) {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    if (post.userId !== userId2) throw Object.assign(new Error("Sin permiso"), { status: 403 });
    await storage.community.deletePost(postId);
  }
  async incrementView(postId, userId2) {
    const post = await storage.community.getPost(postId);
    if (!post) return;
    if (userId2 && post.userId === userId2) return;
    if (userId2) {
      await storage.community.recordUserView(postId, userId2);
    } else {
      await storage.community.incrementViewCount(postId);
    }
  }
  // ── Comments ──────────────────────────────────────────────────────────────
  async addComment(postId, userId2, content, parentId) {
    const post = await storage.community.getPost(postId);
    if (!post) throw new Error("Post no encontrado");
    if (parentId) {
      const parent = await storage.community.getComment(parentId);
      if (!parent || parent.postId !== postId) throw new Error("Comentario padre inv\xE1lido");
    }
    const comment = await storage.community.createComment({ postId, userId: userId2, content, parentId });
    if (post.userId !== userId2) {
      const commenter = await storage.users.getUserById(userId2);
      const commenterName = commenter?.name ?? "Alguien";
      const titulo = "Nuevo comentario";
      const mensaje = `${commenterName} coment\xF3 tu publicaci\xF3n "${post.title}"`;
      await storage.appNotifications.createNotification(
        post.userId,
        "new_comment",
        titulo,
        mensaje,
        { postId, commentId: comment.id, commenterName }
      ).catch(() => {
      });
      notify(post.userId, titulo, mensaje, "new_comment");
    }
    if (parentId) {
      const parent = await storage.community.getComment(parentId);
      if (parent && parent.userId !== userId2 && parent.userId !== post.userId) {
        const commenter = await storage.users.getUserById(userId2);
        const commenterName = commenter?.name ?? "Alguien";
        const titulo = "Nueva respuesta";
        const mensaje = `${commenterName} respondi\xF3 tu comentario`;
        await storage.appNotifications.createNotification(
          parent.userId,
          "new_reply",
          titulo,
          mensaje,
          { postId, commentId: comment.id, commenterName }
        ).catch(() => {
        });
        notify(parent.userId, titulo, mensaje, "new_reply");
      }
    }
    return comment;
  }
  async getComments(postId) {
    const post = await storage.community.getPost(postId);
    if (!post) throw new Error("Post no encontrado");
    return storage.community.getCommentsByPost(postId);
  }
  async updateComment(commentId, userId2, content) {
    const comment = await storage.community.getComment(commentId);
    if (!comment) throw Object.assign(new Error("Comentario no encontrado"), { status: 404 });
    if (comment.userId !== userId2) throw Object.assign(new Error("Sin permiso"), { status: 403 });
    await storage.community.updateComment(commentId, content);
  }
  async deleteComment(commentId, userId2) {
    const comment = await storage.community.getComment(commentId);
    if (!comment) throw Object.assign(new Error("Comentario no encontrado"), { status: 404 });
    if (comment.userId !== userId2) throw Object.assign(new Error("Sin permiso"), { status: 403 });
    await storage.community.deleteComment(commentId);
  }
  // ── Likes ─────────────────────────────────────────────────────────────────
  async toggleLike(postId, userId2) {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    const result = await storage.community.togglePostLike(postId, userId2);
    if (result.liked && post.userId !== userId2) {
      const liker = await storage.users.getUserById(userId2);
      const likerName = liker?.name ?? "Alguien";
      const titulo = "Le gust\xF3 tu publicaci\xF3n";
      const mensaje = `A ${likerName} le gust\xF3 tu publicaci\xF3n "${post.title}"`;
      await storage.appNotifications.createNotification(
        post.userId,
        "post_liked",
        titulo,
        mensaje,
        { postId, likerName }
      ).catch(() => {
      });
      notify(post.userId, titulo, mensaje, "post_liked");
    }
    return result;
  }
  // ── Bookmarks ─────────────────────────────────────────────────────────────
  async toggleBookmark(postId, userId2) {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    return storage.community.toggleBookmark(postId, userId2);
  }
  async getBookmarks(userId2) {
    return storage.community.getBookmarkedPosts(userId2);
  }
  // ── Tags ──────────────────────────────────────────────────────────────────
  async getTags() {
    return storage.community.getAllTags();
  }
  // ── Reports ───────────────────────────────────────────────────────────────
  async reportPost(postId, reporterUserId, reason, detail) {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    await storage.community.createReport({ reporterUserId, postId, reason, detail });
  }
  async reportComment(commentId, reporterUserId, reason, detail) {
    const comment = await storage.community.getComment(commentId);
    if (!comment) throw Object.assign(new Error("Comentario no encontrado"), { status: 404 });
    await storage.community.createReport({ reporterUserId, commentId, reason, detail });
  }
  // ── Chat integration ──────────────────────────────────────────────────────
  async startChat(postId, initiatorUserId) {
    const post = await storage.community.getPost(postId);
    if (!post) throw new Error("Post no encontrado");
    if (post.userId === initiatorUserId) throw new Error("No puedes iniciar un chat contigo mismo");
    const result = await chatService.getOrCreateCommunityConversation(initiatorUserId, post.userId, postId);
    return { conversationId: result.id };
  }
  // ── Profile ───────────────────────────────────────────────────────────────
  async getUserProfile(userId2, viewerUserId) {
    return storage.community.getUserProfile(userId2, viewerUserId);
  }
  // ── Case take ─────────────────────────────────────────────────────────────
  /**
   * Lawyer claims an open post.
   * - Updates post status to "in_progress"
   * - Notifies the post author (client) in real-time
   * - Notifies all other matched lawyers that the case is gone
   */
  async takePost(postId, lawyerId, lawyerUserId, lawyerName) {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    if (post.status !== "open") throw Object.assign(new Error("Este caso ya fue tomado"), { status: 409 });
    const taken = await storage.community.takePost(postId, lawyerId, lawyerUserId);
    if (!taken) throw Object.assign(new Error("Este caso ya fue tomado"), { status: 409 });
    const clientTitulo = "\xA1Un abogado tom\xF3 tu caso!";
    const clientMensaje = `${lawyerName} ha aceptado revisar tu caso "${post.title}"`;
    await storage.appNotifications.createNotification(
      post.userId,
      "case_taken",
      clientTitulo,
      clientMensaje,
      { postId, lawyerId, lawyerName }
    ).catch(() => {
    });
    notify(post.userId, clientTitulo, clientMensaje, "case_taken");
    storage.matching.getMatchedLawyerUserIds(postId).then(async (userIds) => {
      for (const uid of userIds) {
        if (uid === lawyerUserId) continue;
        const titulo = "Caso ya tomado";
        const mensaje = `El caso "${post.title}" fue tomado por otro abogado`;
        await storage.appNotifications.createNotification(
          uid,
          "case_taken",
          titulo,
          mensaje,
          { postId }
        ).catch(() => {
        });
        notify(uid, titulo, mensaje, "case_taken");
      }
    }).catch(() => {
    });
    return await storage.community.getPostDTO(postId, lawyerUserId);
  }
  /** Client rejects the lawyer who took their post → post reopens. */
  async rejectTake(postId, clientUserId) {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    if (post.userId !== clientUserId) throw Object.assign(new Error("Sin permiso"), { status: 403 });
    const lawyerUserId = post.takenByUserId;
    const ok = await storage.community.rejectTake(postId, clientUserId);
    if (!ok) throw Object.assign(new Error("No hay representaci\xF3n pendiente"), { status: 409 });
    if (lawyerUserId) {
      const titulo = "Representaci\xF3n rechazada";
      const mensaje = `El cliente rechaz\xF3 tu solicitud para el caso "${post.title}"`;
      await storage.appNotifications.createNotification(
        lawyerUserId,
        "case_rejected",
        titulo,
        mensaje,
        { postId }
      ).catch(() => {
      });
      notify(lawyerUserId, titulo, mensaje, "case_rejected");
    }
    matchingService.matchLawyersToPost(post).catch(() => {
    });
    return await storage.community.getPostDTO(postId, clientUserId);
  }
  /** Client accepts the lawyer → confirms representation and links them as lawyer-client. */
  async acceptTake(postId, clientUserId) {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    if (post.userId !== clientUserId) throw Object.assign(new Error("Sin permiso"), { status: 403 });
    const ok = await storage.community.acceptTake(postId, clientUserId);
    if (!ok) throw Object.assign(new Error("No hay representaci\xF3n pendiente"), { status: 409 });
    if (post.takenByUserId) {
      const [lawyerProfile, clientRecord] = await Promise.all([
        storage.abogados.getLawyerByUserId(post.takenByUserId),
        storage.clientes.getClienteByUser(clientUserId)
      ]);
      if (lawyerProfile && clientRecord) {
        const exists = await storage.lawyerClients.getActiveLawyerClient(lawyerProfile.id, clientRecord.id);
        if (!exists) {
          await storage.lawyerClients.createLawyerClient({
            id: randomUUID36(),
            lawyerId: lawyerProfile.id,
            clientId: clientRecord.id,
            createdBy: post.takenByUserId
          });
        }
      }
      const titulo = "\xA1Representaci\xF3n aceptada!";
      const mensaje = `El cliente acept\xF3 tu representaci\xF3n en "${post.title}"`;
      await storage.appNotifications.createNotification(
        post.takenByUserId,
        "case_accepted",
        titulo,
        mensaje,
        { postId }
      ).catch(() => {
      });
      notify(post.takenByUserId, titulo, mensaje, "case_accepted");
    }
    return await storage.community.getPostDTO(postId, clientUserId);
  }
  /**
   * Expire stale in_progress posts (48h timeout, no client response).
   * Call this lazily from any route — it's a no-op when nothing is stale.
   */
  async runExpiry() {
    const expired = await storage.community.expireStale();
    for (const p of expired) {
      const clientTitulo = "Tu caso est\xE1 disponible nuevamente";
      const clientMensaje = `El abogado no respondi\xF3 a tiempo. Tu caso "${p.title}" est\xE1 abierto de nuevo.`;
      await storage.appNotifications.createNotification(
        p.userId,
        "case_expired",
        clientTitulo,
        clientMensaje,
        { postId: p.id }
      ).catch(() => {
      });
      notify(p.userId, clientTitulo, clientMensaje, "case_expired");
      if (p.takenByUserId) {
        const lawyerTitulo = "Reserva de caso expirada";
        const lawyerMensaje = `Tu reserva para el caso "${p.title}" expir\xF3 sin respuesta del cliente.`;
        await storage.appNotifications.createNotification(
          p.takenByUserId,
          "case_expired",
          lawyerTitulo,
          lawyerMensaje,
          { postId: p.id }
        ).catch(() => {
        });
        notify(p.takenByUserId, lawyerTitulo, lawyerMensaje, "case_expired");
      }
    }
  }
  /** Post author marks their own case as resolved. */
  async closePost(postId, userId2) {
    const post = await storage.community.getPost(postId);
    if (!post) throw Object.assign(new Error("Post no encontrado"), { status: 404 });
    if (post.userId !== userId2) throw Object.assign(new Error("Sin permiso"), { status: 403 });
    await storage.community.closePost(postId, userId2);
    return await storage.community.getPostDTO(postId, userId2);
  }
};
var communityService = new CommunityService();

// server/routes/community.ts
init_database_storage();
var writeLimiter = rateLimit({
  windowMs: 6e4,
  maxRequests: 10,
  message: "Demasiadas solicitudes. Intenta de nuevo en un minuto."
});
var str = (v) => (Array.isArray(v) ? v[0] : v) ?? "";
var router18 = Router18();
var createPostSchema = z11.object({
  title: z11.string().min(3).max(255),
  content: z11.string().min(1).max(5e4),
  visibility: z11.enum(["public", "anonymous"]).optional().default("public"),
  tagIds: z11.array(z11.string()).max(10).optional().default([]),
  caseType: z11.string().max(50).nullable().optional(),
  isUrgent: z11.boolean().optional().default(false),
  city: z11.string().max(100).nullable().optional()
});
var updatePostSchema = z11.object({
  title: z11.string().min(3).max(255).optional(),
  content: z11.string().min(1).max(5e4).optional(),
  tagIds: z11.array(z11.string()).max(10).optional(),
  caseType: z11.string().max(50).nullable().optional(),
  isUrgent: z11.boolean().optional(),
  city: z11.string().max(100).nullable().optional()
});
var createCommentSchema = z11.object({
  content: z11.string().min(1).max(5e3),
  parentId: z11.string().nullable().optional()
});
var reportSchema = z11.object({
  reason: z11.string().min(1).max(50),
  detail: z11.string().max(500).optional()
});
router18.get("/tags", async (_req, res, next) => {
  try {
    res.json(await communityService.getTags());
  } catch (e) {
    next(e);
  }
});
router18.get("/posts", authenticateOptional, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const filter = {
      search: req.query.search,
      tagSlug: req.query.tag,
      sort: req.query.sort,
      city: req.query.city,
      authorId: req.query.authorId,
      unlinkedOnly: req.query.unlinkedOnly === "true",
      clientAccepted: req.query.clientAccepted === "true"
    };
    const userId2 = req.user?.id;
    res.json(await communityService.getPosts(limit, offset, filter, userId2));
  } catch (e) {
    next(e);
  }
});
router18.get("/posts/:id", authenticateOptional, async (req, res, next) => {
  try {
    const userId2 = req.user?.id;
    communityService.incrementView(str(req.params.id), userId2).catch(() => {
    });
    const post = await communityService.getPost(str(req.params.id), userId2);
    if (!post) return res.status(404).json({ error: "Post no encontrado" });
    res.json(post);
  } catch (e) {
    next(e);
  }
});
router18.post("/posts", authenticate, requireFeature("comunidad"), writeLimiter, async (req, res, next) => {
  try {
    const parsed2 = createPostSchema.safeParse(req.body);
    if (!parsed2.success) return res.status(400).json({ error: parsed2.error.errors[0].message });
    res.status(201).json(await communityService.createPost(req.user.id, parsed2.data));
  } catch (e) {
    next(e);
  }
});
router18.put("/posts/:id", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    const parsed2 = updatePostSchema.safeParse(req.body);
    if (!parsed2.success) return res.status(400).json({ error: parsed2.error.errors[0].message });
    res.json(await communityService.updatePost(str(req.params.id), req.user.id, parsed2.data));
  } catch (e) {
    next(e);
  }
});
router18.delete("/posts/:id", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    await communityService.deletePost(str(req.params.id), req.user.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
router18.get("/posts/:id/comments", async (req, res, next) => {
  try {
    res.json(await communityService.getComments(str(req.params.id)));
  } catch (e) {
    if (e?.message === "Post no encontrado") return res.status(404).json({ error: e.message });
    next(e);
  }
});
router18.post("/posts/:id/comments", authenticate, requireFeature("comunidad"), writeLimiter, async (req, res, next) => {
  try {
    const parsed2 = createCommentSchema.safeParse(req.body);
    if (!parsed2.success) return res.status(400).json({ error: parsed2.error.errors[0].message });
    const comment = await communityService.addComment(str(req.params.id), req.user.id, parsed2.data.content, parsed2.data.parentId);
    res.status(201).json(comment);
  } catch (e) {
    if (e?.message === "Post no encontrado") return res.status(404).json({ error: e.message });
    if (e?.message === "Comentario padre inv\xE1lido") return res.status(400).json({ error: e.message });
    next(e);
  }
});
var updateCommentSchema = z11.object({
  content: z11.string().min(1).max(5e3)
});
router18.put("/comments/:id", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    const parsed2 = updateCommentSchema.safeParse(req.body);
    if (!parsed2.success) return res.status(400).json({ error: parsed2.error.errors[0].message });
    await communityService.updateComment(str(req.params.id), req.user.id, parsed2.data.content);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
router18.delete("/comments/:id", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    await communityService.deleteComment(str(req.params.id), req.user.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
router18.post("/posts/:id/like", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    res.json(await communityService.toggleLike(str(req.params.id), req.user.id));
  } catch (e) {
    next(e);
  }
});
router18.post("/posts/:id/bookmark", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    res.json(await communityService.toggleBookmark(str(req.params.id), req.user.id));
  } catch (e) {
    next(e);
  }
});
router18.get("/bookmarks", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    res.json(await communityService.getBookmarks(req.user.id));
  } catch (e) {
    next(e);
  }
});
router18.post("/posts/:id/report", authenticate, requireFeature("comunidad"), writeLimiter, async (req, res, next) => {
  try {
    const parsed2 = reportSchema.safeParse(req.body);
    if (!parsed2.success) return res.status(400).json({ error: parsed2.error.errors[0].message });
    await communityService.reportPost(str(req.params.id), req.user.id, parsed2.data.reason, parsed2.data.detail);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
router18.post("/comments/:id/report", authenticate, requireFeature("comunidad"), writeLimiter, async (req, res, next) => {
  try {
    const parsed2 = reportSchema.safeParse(req.body);
    if (!parsed2.success) return res.status(400).json({ error: parsed2.error.errors[0].message });
    await communityService.reportComment(str(req.params.id), req.user.id, parsed2.data.reason, parsed2.data.detail);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
router18.post("/posts/:id/start-chat", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    res.json(await communityService.startChat(str(req.params.id), req.user.id));
  } catch (e) {
    if (e?.message === "Post no encontrado" || e?.message === "No puedes iniciar un chat contigo mismo") {
      return res.status(400).json({ error: e.message });
    }
    next(e);
  }
});
router18.get("/community/recommended-lawyers", authenticateOptional, async (req, res, next) => {
  try {
    const postId = str(req.query.postId);
    if (!postId) return res.status(400).json({ error: "postId requerido" });
    const post = await storage.community.getPost(postId);
    if (!post) return res.status(404).json({ error: "Post no encontrado" });
    if (post.status !== "open") return res.json([]);
    const lawyers = await storage.recommendations.getRecommendedLawyers(
      post.caseType,
      post.city,
      8
    );
    const enriched = await Promise.all(
      lawyers.map(async (l) => {
        const stats = await storage.community.getLawyerCommunityStats(l.userId).catch(() => null);
        return { ...l, badges: stats?.badges ?? [] };
      })
    );
    res.json(enriched);
  } catch (e) {
    next(e);
  }
});
router18.get("/community/lawyer-feed", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    const userId2 = req.user.id;
    const lawyerProfile = await storage.abogados.getLawyerByUserId(userId2);
    if (!lawyerProfile) {
      return res.status(403).json({ error: "Solo abogados pueden acceder a este feed" });
    }
    const limit = Math.min(parseInt(str(req.query.limit)) || 60, 200);
    const offset = parseInt(str(req.query.offset)) || 0;
    communityService.runExpiry().catch(() => {
    });
    const feed = await matchingService.getLawyerFeed(lawyerProfile.id, userId2, limit, offset);
    res.json(feed);
  } catch (e) {
    next(e);
  }
});
router18.post("/posts/:id/seen", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    const userId2 = req.user.id;
    const lawyerProfile = await storage.abogados.getLawyerByUserId(userId2);
    if (!lawyerProfile) return res.json({ ok: true });
    await matchingService.markSeen(str(req.params.id), lawyerProfile.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
router18.post("/posts/:id/take", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    const userId2 = req.user.id;
    const lawyerProfile = await storage.abogados.getLawyerByUserId(userId2);
    if (!lawyerProfile) {
      return res.status(403).json({ error: "Solo abogados pueden tomar casos" });
    }
    if (lawyerProfile.professionalVerificationStatus !== "verificado") {
      return res.status(403).json({
        error: "Debes tener tu tarjeta profesional verificada para tomar casos de comunidad.",
        code: "LAWYER_PROFESSIONAL_VERIFICATION_REQUIRED"
      });
    }
    const user = await storage.users.getUserById(userId2);
    const lawyerName = user?.name ?? "Abogado";
    const post = await communityService.takePost(str(req.params.id), lawyerProfile.id, userId2, lawyerName);
    res.json(post);
  } catch (e) {
    if (e?.status === 409) return res.status(409).json({ error: e.message });
    if (e?.status === 404) return res.status(404).json({ error: e.message });
    next(e);
  }
});
router18.post("/posts/:id/accept-take", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    communityService.runExpiry().catch(() => {
    });
    const post = await communityService.acceptTake(str(req.params.id), req.user.id);
    res.json(post);
  } catch (e) {
    if (e?.status === 409) return res.status(409).json({ error: e.message });
    if (e?.status === 403) return res.status(403).json({ error: e.message });
    if (e?.status === 404) return res.status(404).json({ error: e.message });
    next(e);
  }
});
router18.post("/posts/:id/reject-take", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    communityService.runExpiry().catch(() => {
    });
    const post = await communityService.rejectTake(str(req.params.id), req.user.id);
    res.json(post);
  } catch (e) {
    if (e?.status === 409) return res.status(409).json({ error: e.message });
    if (e?.status === 403) return res.status(403).json({ error: e.message });
    if (e?.status === 404) return res.status(404).json({ error: e.message });
    next(e);
  }
});
router18.post("/posts/:id/close", authenticate, requireFeature("comunidad"), async (req, res, next) => {
  try {
    const post = await communityService.closePost(str(req.params.id), req.user.id);
    res.json(post);
  } catch (e) {
    if (e?.status === 403) return res.status(403).json({ error: e.message });
    if (e?.status === 404) return res.status(404).json({ error: e.message });
    next(e);
  }
});
router18.get("/community/users/:userId/profile", authenticateOptional, async (req, res, next) => {
  try {
    const viewerUserId = req.user?.id;
    const profile = await communityService.getUserProfile(str(req.params.userId), viewerUserId);
    if (!profile) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(profile);
  } catch (e) {
    next(e);
  }
});
router18.get("/community/lawyer-stats/:userId", authenticateOptional, async (req, res, next) => {
  try {
    const userId2 = str(req.params.userId);
    const stats = await storage.community.getLawyerCommunityStats(userId2);
    res.json(stats);
  } catch (e) {
    next(e);
  }
});
var community_default = router18;

// server/routes/ratings.ts
init_auth();
import { Router as Router19 } from "express";
import { z as z12 } from "zod";

// server/services/rating.service.ts
init_database_storage();
var ratingService = {
  async getProfile(targetUserId) {
    return storage.community.getUserProfile(targetUserId);
  },
  async getRatings(targetUserId, targetType) {
    return storage.ratings.getRatings(targetUserId, targetType);
  },
  async getRatingSummary(targetUserId, targetType) {
    return storage.ratings.getRatingSummary(targetUserId, targetType);
  },
  async canRate(fromUserId, targetUserId, targetType) {
    if (fromUserId === targetUserId) return false;
    return storage.ratings.canClientRate(fromUserId, targetUserId, targetType);
  },
  async hasRated(fromUserId, targetUserId, targetType) {
    const existing = await storage.ratings.getRating(fromUserId, targetUserId, targetType);
    return !!existing;
  },
  async createRating(fromUserId, targetUserId, targetType, score, comment) {
    if (score < 1 || score > 5) throw new Error("La calificaci\xF3n debe estar entre 1 y 5");
    if (fromUserId === targetUserId) throw new Error("No puedes calificarte a ti mismo");
    const procesoId = await storage.ratings.findQualifyingProceso(fromUserId, targetUserId, targetType);
    if (!procesoId) throw new Error("Solo puedes calificar si tienes un proceso finalizado con este usuario");
    const existing = await storage.ratings.getRating(fromUserId, targetUserId, targetType);
    if (existing) throw new Error("Ya has calificado a este usuario");
    return storage.ratings.createRating({ fromUserId, targetUserId, targetType, score, comment, procesoId });
  }
};

// server/routes/ratings.ts
var router19 = Router19();
var TARGET_TYPES = ["lawyer", "firm"];
var createRatingSchema = z12.object({
  targetUserId: z12.string().uuid(),
  targetType: z12.enum(["lawyer", "firm"]),
  score: z12.number().int().min(1).max(5),
  comment: z12.string().max(1e3).nullable().optional()
});
router19.get(
  "/community/users/:userId/profile",
  async (req, res, next) => {
    try {
      const profile = await ratingService.getProfile(req.params.userId);
      if (!profile) return res.status(404).json({ error: "Usuario no encontrado" });
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }
);
router19.get(
  "/ratings/:targetType/:targetUserId",
  async (req, res, next) => {
    try {
      const { targetType, targetUserId } = req.params;
      if (!TARGET_TYPES.includes(targetType)) {
        return res.status(400).json({ error: "targetType inv\xE1lido" });
      }
      const list = await ratingService.getRatings(targetUserId, targetType);
      res.json(list);
    } catch (err) {
      next(err);
    }
  }
);
router19.get(
  "/ratings/:targetType/:targetUserId/summary",
  async (req, res, next) => {
    try {
      const { targetType, targetUserId } = req.params;
      if (!TARGET_TYPES.includes(targetType)) {
        return res.status(400).json({ error: "targetType inv\xE1lido" });
      }
      const summary = await ratingService.getRatingSummary(targetUserId, targetType);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  }
);
router19.get(
  "/ratings/:targetType/:targetUserId/can-rate",
  authenticate,
  async (req, res, next) => {
    try {
      const { targetType, targetUserId } = req.params;
      if (!TARGET_TYPES.includes(targetType)) {
        return res.status(400).json({ error: "targetType inv\xE1lido" });
      }
      const type = targetType;
      const [canRate, hasRated] = await Promise.all([
        ratingService.canRate(req.user.id, targetUserId, type),
        ratingService.hasRated(req.user.id, targetUserId, type)
      ]);
      res.json({ canRate, hasRated });
    } catch (err) {
      next(err);
    }
  }
);
router19.post(
  "/ratings",
  authenticate,
  async (req, res, next) => {
    try {
      const parsed2 = createRatingSchema.safeParse(req.body);
      if (!parsed2.success) {
        return res.status(400).json({ error: parsed2.error.errors[0].message });
      }
      const { targetUserId, targetType, score, comment } = parsed2.data;
      const rating = await ratingService.createRating(
        req.user.id,
        targetUserId,
        targetType,
        score,
        comment ?? null
      );
      res.status(201).json(rating);
    } catch (err) {
      const clientErrors = [
        "La calificaci\xF3n debe estar entre 1 y 5",
        "No puedes calificarte a ti mismo",
        "Solo puedes calificar si tienes un proceso finalizado con este usuario",
        "Ya has calificado a este usuario"
      ];
      if (clientErrors.includes(err?.message)) {
        return res.status(400).json({ error: err.message });
      }
      if (err?.code === "ER_DUP_ENTRY" || err?.message?.includes("Duplicate entry")) {
        return res.status(400).json({ error: "Ya has calificado a este usuario" });
      }
      next(err);
    }
  }
);
var ratings_default = router19;

// server/routes/client-requests.ts
init_auth();
import { Router as Router20 } from "express";

// server/services/client-request.service.ts
init_user_schema();
init_database_storage();
function addBusinessDays(from, days) {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}
async function checkIsAlreadyClient(fromUserId, toUserId, role) {
  const client = await storage.clientes.getClienteByUser(toUserId);
  if (!client) return false;
  if (role === EnumRol.ABOGADO.nombre) {
    const lawyer = await storage.abogados.getLawyerByUserId(fromUserId);
    if (!lawyer) return false;
    const rel = await storage.lawyerClients.getActiveLawyerClient(lawyer.id, client.id);
    return !!rel;
  }
  if (role === EnumRol.BUFETE.nombre) {
    const firm = await storage.firmProfiles.getFirmProfileByUserId(fromUserId);
    if (!firm) return false;
    const rel = await storage.firmClients.getActiveFirmClient(firm.id, client.id);
    return !!rel;
  }
  return false;
}
async function getSenderDisplayName(userId2, role) {
  if (role === EnumRol.ABOGADO.nombre) {
    const lawyer = await storage.abogados.getLawyerByUserId(userId2);
    if (lawyer) return `${lawyer.persona?.nombre} ${lawyer.persona?.apellido}`.trim();
  }
  if (role === EnumRol.BUFETE.nombre) {
    const firm = await storage.firmProfiles.getFirmProfileByUserId(userId2);
    if (firm) return firm.name;
  }
  const user = await storage.users.getUserById(userId2);
  return user?.name ?? "Usuario";
}
var clientRequestService = {
  async sendRequest(fromUserId, toUserId) {
    const fromUser = await storage.users.getUserById(fromUserId);
    if (!fromUser || fromUser.rol.nombre !== EnumRol.ABOGADO.nombre && fromUser.rol !== EnumRol.BUFETE.nombre) {
      throw Object.assign(new Error("Solo abogados y bufetes pueden enviar solicitudes"), { status: 403 });
    }
    const toUser = await storage.users.getUserById(toUserId);
    if (!toUser || toUser.rol.nombre !== EnumRol.CLIENTE.nombre) {
      throw Object.assign(new Error("Solo puedes enviar solicitudes a clientes"), { status: 400 });
    }
    await storage.clientRequests.expirePendingRequests();
    const isClient = await checkIsAlreadyClient(fromUserId, toUserId, fromUser.rol.nombre);
    if (isClient) {
      throw Object.assign(new Error("Este usuario ya es tu cliente"), { status: 409 });
    }
    const pending = await storage.clientRequests.getPendingRequest(fromUserId, toUserId);
    if (pending) {
      throw Object.assign(new Error("Ya tienes una solicitud pendiente con este cliente"), { status: 409 });
    }
    const expiresAt = addBusinessDays(/* @__PURE__ */ new Date(), 3);
    const req = await storage.clientRequests.createRequest(fromUserId, toUserId, expiresAt);
    const senderName = await getSenderDisplayName(fromUserId, fromUser.rol.nombre);
    const roleLabel = fromUser.rol.nombre === EnumRol.ABOGADO.nombre ? EnumRol.ABOGADO.nombre : EnumRol.BUFETE.nombre;
    await storage.appNotifications.createNotification(
      toUserId,
      "client_request",
      "Solicitud de cliente",
      `${roleLabel} ${senderName} quiere agregar\u0442\u0435 como su cliente. \xBFDeseas aceptar?`,
      { requestId: req.id, fromUserId, fromName: senderName, fromRole: fromUser.rol.nombre }
    );
    return req;
  },
  async getStatus(fromUserId, toUserId) {
    const fromUser = await storage.users.getUserById(fromUserId);
    if (!fromUser) throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
    await storage.clientRequests.expirePendingRequests();
    const isClient = await checkIsAlreadyClient(fromUserId, toUserId, fromUser.rol.nombre);
    if (isClient) return { isClient: true, canSend: false, request: null };
    const latest = await storage.clientRequests.getLatestRequest(fromUserId, toUserId);
    if (!latest) return { isClient: false, canSend: true, request: null };
    if (latest.status === "accepted") return { isClient: true, canSend: false, request: latest };
    if (latest.status === "pending") return { isClient: false, canSend: false, request: latest };
    return { isClient: false, canSend: true, request: latest };
  },
  async getPendingForClient(toUserId) {
    await storage.clientRequests.expirePendingRequests();
    return storage.clientRequests.getPendingRequestsForUser(toUserId);
  },
  async respondToRequest(requestId, clientUserId, accept) {
    const req = await storage.clientRequests.getRequestById(requestId);
    if (!req || req.toUserId !== clientUserId) {
      throw Object.assign(new Error("Solicitud no encontrada"), { status: 404 });
    }
    if (req.status !== "pending") {
      throw Object.assign(new Error("Esta solicitud ya fue respondida"), { status: 409 });
    }
    if (/* @__PURE__ */ new Date() > new Date(req.expiresAt)) {
      await storage.clientRequests.respondToRequest(requestId, "expired");
      throw Object.assign(new Error("La solicitud ha expirado"), { status: 410 });
    }
    const newStatus = accept ? "accepted" : "rejected";
    await storage.clientRequests.respondToRequest(requestId, newStatus);
    if (accept) {
      const fromUser = await storage.users.getUserById(req.fromUserId);
      const client = await storage.clientes.getClienteByUser(clientUserId);
      if (fromUser && client) {
        if (fromUser.rol.nombre === EnumRol.ABOGADO.nombre) {
          const lawyer = await storage.abogados.getLawyerByUserId(req.fromUserId);
          if (lawyer) {
            const exists = await storage.lawyerClients.getActiveLawyerClient(lawyer.id, client.id);
            if (!exists) {
              const { randomUUID: randomUUID41 } = await import("crypto");
              await storage.lawyerClients.createLawyerClient({
                id: randomUUID41(),
                lawyerId: lawyer.id,
                clientId: client.id,
                createdBy: req.fromUserId
              });
            }
          }
        } else if (fromUser.rol.nombre === EnumRol.BUFETE.nombre) {
          const firm = await storage.firmProfiles.getFirmProfileByUserId(req.fromUserId);
          if (firm) {
            const exists = await storage.firmClients.getActiveFirmClient(firm.id, client.id);
            if (!exists) {
              await storage.firmClients.createFirmClient(firm.id, client.id);
            }
          }
        }
      }
    }
    const clientUser = await storage.users.getUserById(clientUserId);
    const clientName = clientUser?.name ?? "El cliente";
    await storage.appNotifications.createNotification(
      req.fromUserId,
      accept ? "request_accepted" : "request_rejected",
      accept ? "Solicitud aceptada" : "Solicitud rechazada",
      accept ? `${clientName} acept\xF3 tu solicitud y ahora es tu cliente.` : `${clientName} rechaz\xF3 tu solicitud de cliente.`,
      { clientUserId, clientName }
    );
    return { status: newStatus };
  }
};

// server/routes/client-requests.ts
init_database_storage();
var router20 = Router20();
var requestLimiter = rateLimit({
  windowMs: 6e4,
  maxRequests: 5,
  message: "Demasiadas solicitudes de cliente. Intenta de nuevo en un minuto."
});
router20.post("/client-requests", authenticate, requestLimiter, async (req, res) => {
  try {
    const fromUserId = req.user.id;
    const { toUserId } = req.body;
    if (!toUserId) return res.status(400).json({ error: "toUserId es requerido" });
    const result = await clientRequestService.sendRequest(fromUserId, toUserId);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Error interno" });
  }
});
router20.get("/client-requests/status/:toUserId", authenticate, async (req, res) => {
  try {
    const fromUserId = req.user.id;
    const { toUserId } = req.params;
    const result = await clientRequestService.getStatus(fromUserId, toUserId);
    res.json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Error interno" });
  }
});
router20.get("/client-requests/pending", authenticate, async (req, res) => {
  try {
    const userId2 = req.user.id;
    const requests = await clientRequestService.getPendingForClient(userId2);
    res.json(requests);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Error interno" });
  }
});
router20.patch("/client-requests/:id/respond", authenticate, async (req, res) => {
  try {
    const clientUserId = req.user.id;
    const { id } = req.params;
    const { accept } = req.body;
    if (typeof accept !== "boolean") {
      return res.status(400).json({ error: "'accept' debe ser true o false" });
    }
    const result = await clientRequestService.respondToRequest(id, clientUserId, accept);
    res.json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Error interno" });
  }
});
router20.get("/app-notifications", authenticate, async (req, res) => {
  try {
    const userId2 = req.user.id;
    const notifications = await storage.appNotifications.getForUser(userId2);
    res.json(notifications);
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});
router20.get("/app-notifications/unread-count", authenticate, async (req, res) => {
  try {
    const userId2 = req.user.id;
    const count4 = await storage.appNotifications.getUnreadCount(userId2);
    res.json({ count: count4 });
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});
router20.patch("/app-notifications/:id/read", authenticate, async (req, res) => {
  try {
    const userId2 = req.user.id;
    await storage.appNotifications.markRead(req.params.id, userId2);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});
router20.patch("/app-notifications/read-all", authenticate, async (req, res) => {
  try {
    const userId2 = req.user.id;
    await storage.appNotifications.markAllRead(userId2);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Error interno" });
  }
});
var client_requests_default = router20;

// server/routes/password-reset.ts
init_database_storage();
init_auth();
init_email_service();
import { Router as Router21 } from "express";
import jwt3 from "jsonwebtoken";
import { z as z13 } from "zod";
var router21 = Router21();
var JWT_SECRET2 = process.env.JWT_SECRET;
var RESET_TOKEN_EXPIRES = "15m";
var RESET_TOKEN_TYPE = "password_reset";
function issueResetToken(userId2) {
  return jwt3.sign({ sub: userId2, type: RESET_TOKEN_TYPE }, JWT_SECRET2, {
    expiresIn: RESET_TOKEN_EXPIRES
  });
}
function verifyResetToken(token) {
  try {
    const payload = jwt3.verify(token, JWT_SECRET2);
    if (payload?.type !== RESET_TOKEN_TYPE) return null;
    return payload;
  } catch {
    return null;
  }
}
var requestSchema = z13.object({
  email: z13.string().email()
});
var verifySchema = z13.object({
  email: z13.string().email(),
  code: z13.string().length(6)
});
var resetSchema = z13.object({
  resetToken: z13.string().min(1),
  newPassword: z13.string().min(8, "La contrase\xF1a debe tener al menos 8 caracteres")
});
var resetRateLimit = rateLimit({
  windowMs: 15 * 6e4,
  maxRequests: 5,
  message: "Demasiados intentos. Espera 15 minutos antes de volver a intentarlo."
});
router21.post(
  "/auth/request-password-reset",
  resetRateLimit,
  async (req, res, next) => {
    try {
      const parsed2 = requestSchema.safeParse(req.body);
      if (!parsed2.success) {
        return res.status(400).json({ error: parsed2.error.errors[0].message });
      }
      const { email } = parsed2.data;
      const user = await storage.getUserByEmail(email);
      if (user && user.isActive) {
        const code = await storage.otps.createOtp(user.id);
        sendPasswordResetOtp(email, code).catch(
          (err) => console.error("[password-reset] email send error:", err)
        );
      }
      return res.json({
        message: "Si el correo est\xE1 registrado, recibir\xE1s un c\xF3digo de verificaci\xF3n en breve."
      });
    } catch (err) {
      next(err);
    }
  }
);
router21.post(
  "/auth/verify-otp",
  resetRateLimit,
  async (req, res, next) => {
    try {
      const parsed2 = verifySchema.safeParse(req.body);
      if (!parsed2.success) {
        return res.status(400).json({ error: parsed2.error.errors[0].message });
      }
      const { email, code } = parsed2.data;
      const GENERIC_ERROR = "C\xF3digo inv\xE1lido o expirado.";
      const user = await storage.getUserByEmail(email);
      if (!user || !user.isActive) {
        return res.status(400).json({ error: GENERIC_ERROR });
      }
      const result = await storage.otps.verifyOtp(user.id, code);
      if (result === "too_many_attempts") {
        return res.status(429).json({ error: "Demasiados intentos fallidos. Solicita un nuevo c\xF3digo." });
      }
      if (result !== "valid") {
        return res.status(400).json({ error: GENERIC_ERROR });
      }
      const resetToken = issueResetToken(user.id);
      return res.json({ resetToken });
    } catch (err) {
      next(err);
    }
  }
);
router21.post(
  "/auth/reset-password",
  resetRateLimit,
  async (req, res, next) => {
    try {
      const parsed2 = resetSchema.safeParse(req.body);
      if (!parsed2.success) {
        return res.status(400).json({ error: parsed2.error.errors[0].message });
      }
      const { resetToken, newPassword } = parsed2.data;
      const payload = verifyResetToken(resetToken);
      if (!payload) {
        return res.status(400).json({ error: "El enlace de restablecimiento es inv\xE1lido o ha expirado." });
      }
      const userId2 = payload.sub;
      await storage.otps.markUsed(userId2);
      const passwordHash = await hashPassword(newPassword);
      await storage.users.updateUser(userId2, { passwordHash });
      await storage.sessions.revokeAllForUser(userId2);
      return res.json({ message: "Contrase\xF1a actualizada correctamente." });
    } catch (err) {
      next(err);
    }
  }
);
var password_reset_default = router21;

// server/routes/firm-clients.ts
init_auth();
init_database_storage();
import { Router as Router22 } from "express";
var router22 = Router22();
router22.get("/firm/clients", authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (user?.rol?.nombre !== "bufete") {
      return res.status(403).json({ error: "Solo los bufetes pueden acceder a esta ruta" });
    }
    const firmId = user.idProfile;
    const { limit, offset, search } = req.query;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const clients = await clientesService.getClientesByFirm(
      firmId,
      limitNum,
      offsetNum,
      { search }
    );
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});
router22.patch("/firm/clients/:clientId/remove", authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (user?.rol?.nombre !== "bufete") {
      return res.status(403).json({ error: "Solo los bufetes pueden realizar esta acci\xF3n" });
    }
    const firmId = user.idProfile;
    const { clientId } = req.params;
    const existing = await storage.firmClients.getActiveFirmClient(firmId, clientId);
    if (!existing) {
      return res.status(404).json({ error: "Relaci\xF3n cliente-bufete no encontrada" });
    }
    await storage.firmClients.deactivate(firmId, clientId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message ?? "Error interno" });
  }
});
var firm_clients_default = router22;

// server/routes/calendar.ts
init_auth();
import { Router as Router23 } from "express";
init_database_storage();
var router23 = Router23();
function getLawyerProfile(req, res) {
  const user = req.user;
  if (user.rol.nombre !== "abogado") {
    res.status(403).json({ error: "Solo los abogados tienen calendario" });
    return null;
  }
  if (!user.idProfile) {
    res.status(400).json({ error: "Perfil de abogado no encontrado" });
    return null;
  }
  return user.idProfile;
}
router23.get("/calendar", authenticate, requireFeature("calendario"), async (req, res, next) => {
  try {
    const lawyerId = getLawyerProfile(req, res);
    if (!lawyerId) return;
    const now = /* @__PURE__ */ new Date();
    const from = req.query.from ? new Date(req.query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = req.query.to ? new Date(req.query.to) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      res.status(400).json({ error: "Fechas inv\xE1lidas. Usa formato ISO 8601." });
      return;
    }
    const events = await storage.calendar.getCalendarEvents(lawyerId, from, to);
    res.json(events);
  } catch (err) {
    next(err);
  }
});
router23.post("/calendar", authenticate, requireFeature("calendario"), async (req, res, next) => {
  try {
    const lawyerId = getLawyerProfile(req, res);
    if (!lawyerId) return;
    const body = req.body;
    if (!body.titulo || !body.tipo || !body.fechaInicio) {
      res.status(400).json({ error: "titulo, tipo y fechaInicio son requeridos" });
      return;
    }
    const evento = await storage.calendar.create(lawyerId, body);
    res.status(201).json(evento);
  } catch (err) {
    next(err);
  }
});
router23.put("/calendar/:id", authenticate, requireFeature("calendario"), async (req, res, next) => {
  try {
    const lawyerId = getLawyerProfile(req, res);
    if (!lawyerId) return;
    const eventoId = String(req.params.id);
    const existing = await storage.calendar.findById(eventoId);
    if (!existing) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    if (existing.lawyerId !== lawyerId) {
      res.status(403).json({ error: "No tienes acceso a este evento" });
      return;
    }
    const body = req.body;
    const updated = await storage.calendar.update(eventoId, body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
router23.delete("/calendar/:id", authenticate, requireFeature("calendario"), async (req, res, next) => {
  try {
    const lawyerId = getLawyerProfile(req, res);
    if (!lawyerId) return;
    const eventoId = String(req.params.id);
    const existing = await storage.calendar.findById(eventoId);
    if (!existing) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    if (existing.lawyerId !== lawyerId) {
      res.status(403).json({ error: "No tienes acceso a este evento" });
      return;
    }
    await storage.calendar.softDelete(eventoId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
var calendar_default = router23;

// server/routes/stage-task-templates.ts
init_auth();
init_database_storage();
init_legal_stage_schema();
import { Router as Router24 } from "express";
var router24 = Router24();
router24.get(
  "/legal-stage-templates",
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.user;
      if (user.rol.nombre === "cliente") {
        res.status(403).json({ error: "Sin permiso" });
        return;
      }
      const tipoProcesoId = req.query.tipoProcesoId ? Number(req.query.tipoProcesoId) : void 0;
      const stageCode = req.query.stageCode;
      const templates = await storage.stageTemplates.list(tipoProcesoId, stageCode);
      res.json(templates);
    } catch (err) {
      next(err);
    }
  }
);
router24.post(
  "/legal-stage-templates",
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.user;
      if (user.rol.nombre === "cliente") {
        res.status(403).json({ error: "Sin permiso" });
        return;
      }
      const { tipoProcesoId, legalStageCode, titulo, descripcion, prioridad, requerida, orden } = req.body;
      if (!legalStageCode || !titulo) {
        res.status(400).json({ error: "legalStageCode y titulo son requeridos" });
        return;
      }
      if (!LEGAL_STAGE_CODES.includes(legalStageCode)) {
        res.status(400).json({ error: `legalStageCode inv\xE1lido: ${legalStageCode}` });
        return;
      }
      const template = await storage.stageTemplates.create({
        tipoProcesoId: tipoProcesoId ?? null,
        legalStageCode,
        titulo,
        descripcion: descripcion ?? null,
        prioridad: prioridad ?? "media",
        requerida: !!requerida,
        orden: orden ?? 0
      });
      res.status(201).json(template);
    } catch (err) {
      next(err);
    }
  }
);
router24.patch(
  "/legal-stage-templates/:id",
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.user;
      if (user.rol.nombre === "cliente") {
        res.status(403).json({ error: "Sin permiso" });
        return;
      }
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inv\xE1lido" });
        return;
      }
      const updated = await storage.stageTemplates.update(id, req.body);
      if (!updated) {
        res.status(404).json({ error: "Plantilla no encontrada" });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);
router24.delete(
  "/legal-stage-templates/:id",
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.user;
      if (user.rol.nombre === "cliente") {
        res.status(403).json({ error: "Sin permiso" });
        return;
      }
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "ID inv\xE1lido" });
        return;
      }
      await storage.stageTemplates.delete(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
var stage_task_templates_default = router24;

// server/routes/stage-events.ts
init_auth();
init_database_storage();
import { Router as Router25 } from "express";
var router25 = Router25();
router25.get(
  "/procesos/:procesoId/stage-events",
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.user;
      const rol = user.rol.nombre;
      const idProfile = user.idProfile;
      const procesoId = req.params.procesoId;
      const stage = req.query.stage;
      const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);
      const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
      if (!idProfile) {
        res.status(400).json({ error: "idProfile requerido" });
        return;
      }
      let proceso = null;
      switch (rol) {
        case "abogado":
          proceso = await storage.getProceoByAbogadoIdAndProcesoId(idProfile, procesoId);
          break;
        case "bufete":
        case "corporacion":
          proceso = await storage.getProcesoByFirmaIdAndProcesoId(idProfile, procesoId);
          break;
        case "cliente":
          proceso = await storage.getProcesoByClienteIdAndProcesoId(idProfile, procesoId);
          if (proceso && proceso.clienteId !== idProfile) proceso = null;
          break;
        default:
          res.status(403).json({ error: "Rol no autorizado" });
          return;
      }
      if (!proceso) {
        res.status(404).json({ error: "Proceso no encontrado o sin acceso" });
        return;
      }
      const result = stage ? await storage.stageEvents.getByStage(procesoId, stage, limit, offset) : await storage.stageEvents.getByProceso(procesoId, limit, offset);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
router25.post(
  "/procesos/:procesoId/stage-events",
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.user;
      const procesoId = req.params.procesoId;
      const { legalStageCode, descripcion } = req.body;
      if (!legalStageCode || !descripcion?.trim()) {
        res.status(400).json({ error: "legalStageCode y descripcion son requeridos" });
        return;
      }
      const event = await storage.stageEvents.insert({
        procesoId,
        legalStageCode,
        tipo: "nota",
        descripcion: descripcion.trim(),
        creadoPor: user.idProfile ?? null
      });
      res.status(201).json(event);
    } catch (err) {
      next(err);
    }
  }
);
var stage_events_default = router25;

// server/routes/proceso-etapa-historial.ts
init_auth();
init_database_storage();
import { Router as Router26 } from "express";
import { randomUUID as randomUUID37 } from "crypto";
var router26 = Router26();
router26.post("/procesos/:procesoId/etapas", authenticate, requirePermission("procesos.editar"), async (req, res, next) => {
  try {
    const { procesoId } = req.params;
    const procesoIdStr = Array.isArray(procesoId) ? procesoId[0] : procesoId;
    const { etapa, estado, observacion } = req.body;
    const user = req.user;
    const usuarioId = user.id;
    if (!etapa || !estado) {
      return res.status(400).json({ error: "etapa y estado son requeridos" });
    }
    const estadoValido = await storage.procesoEtapaHistorial.validarEstado(estado);
    if (!estadoValido) {
      return res.status(400).json({ error: "estado no v\xE1lido" });
    }
    const proceso = await storage.procesos.getProceso(procesoIdStr);
    if (!proceso) {
      return res.status(404).json({ error: "Proceso no encontrado" });
    }
    const etapaValida = await storage.legalStages.getByCodigoYTipo(
      etapa,
      proceso.tipoProcesoId ?? null
    );
    if (!etapaValida) {
      return res.status(400).json({ error: "etapa no v\xE1lida para este tipo de proceso" });
    }
    const historial = await storage.procesoEtapaHistorial.createHistorial({
      id: randomUUID37(),
      procesoId: procesoIdStr,
      etapa,
      estado,
      fecha: /* @__PURE__ */ new Date(),
      observacion: observacion || null,
      usuarioId: usuarioId || null
    });
    await updateEtapaActualFromHistorial(procesoIdStr);
    res.status(201).json(historial);
  } catch (err) {
    next(err);
  }
});
router26.get("/procesos/:procesoId/etapas", authenticate, requirePermission("procesos.ver"), async (req, res, next) => {
  try {
    const { procesoId } = req.params;
    const procesoIdStr = Array.isArray(procesoId) ? procesoId[0] : procesoId;
    const proceso = await storage.procesos.getProceso(procesoIdStr);
    if (!proceso) {
      return res.status(404).json({ error: "Proceso no encontrado" });
    }
    const historial = await storage.procesoEtapaHistorial.getHistorialByProceso(procesoIdStr);
    res.json(historial);
  } catch (err) {
    next(err);
  }
});
router26.get("/procesos/:procesoId/etapas/ultimos-estados", authenticate, requirePermission("procesos.ver"), async (req, res, next) => {
  try {
    const { procesoId } = req.params;
    const procesoIdStr = Array.isArray(procesoId) ? procesoId[0] : procesoId;
    const proceso = await storage.procesos.getProceso(procesoIdStr);
    if (!proceso) {
      return res.status(404).json({ error: "Proceso no encontrado" });
    }
    const ultimosEstados = await storage.procesoEtapaHistorial.getUltimoEstadoPorEtapa(procesoIdStr);
    res.json(ultimosEstados);
  } catch (err) {
    next(err);
  }
});
async function updateEtapaActualFromHistorial(procesoId) {
  const procesoIdStr = Array.isArray(procesoId) ? procesoId[0] : procesoId;
  try {
    const ultimosEstados = await storage.procesoEtapaHistorial.getUltimoEstadoPorEtapa(procesoIdStr);
    let etapaActual = null;
    let fechaMasReciente = null;
    for (const [etapa, registro] of Object.entries(ultimosEstados)) {
      const estadosFinales = ["COMPLETADA", "CANCELADA", "SUSPENDIDA"];
      if (!estadosFinales.includes(registro.estado)) {
        const fechaRegistro = new Date(registro.fecha);
        if (!fechaMasReciente || fechaRegistro > fechaMasReciente) {
          fechaMasReciente = fechaRegistro;
          etapaActual = etapa;
        }
      }
    }
    if (etapaActual) {
      await storage.procesos.updateLegalStage(procesoIdStr, etapaActual, null);
    }
  } catch (error) {
    console.error("Error updating etapa actual from historial:", error);
  }
}
var proceso_etapa_historial_default = router26;

// server/routes/proceso-ownership.ts
init_auth();
init_database_storage();
import { Router as Router27 } from "express";
import { z as z14 } from "zod";
var router27 = Router27();
function getUserId(req) {
  return req.user.id ?? "";
}
var transferSchema = z14.object({
  ownerType: z14.enum(["abogado", "bufete"]),
  ownerId: z14.string().uuid().nullable(),
  razon: z14.string().max(500).optional()
});
var shareSchema = z14.object({
  sharedWithType: z14.enum(["bufete", "corporacion", "cliente"]),
  sharedWithId: z14.string().uuid(),
  permission: z14.enum(["ver", "comentar", "editar"]),
  razon: z14.string().max(500).optional()
});
router27.post(
  "/procesos/:id/ownership/transfer",
  authenticate,
  async (req, res, next) => {
    try {
      const parsed2 = transferSchema.safeParse(req.body);
      if (!parsed2.success) return res.status(400).json({ error: parsed2.error.flatten() });
      const procesoId = req.params.id;
      const creadoPor = getUserId(req);
      const result = await storage.procesoOwnership.transfer(procesoId, parsed2.data, creadoPor);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
router27.get(
  "/procesos/:id/ownership/history",
  authenticate,
  async (req, res, next) => {
    try {
      const history = await storage.procesoOwnership.getHistory(req.params.id);
      res.json(history);
    } catch (err) {
      next(err);
    }
  }
);
router27.post(
  "/procesos/:id/sharing",
  authenticate,
  async (req, res, next) => {
    try {
      const parsed2 = shareSchema.safeParse(req.body);
      if (!parsed2.success) return res.status(400).json({ error: parsed2.error.flatten() });
      const procesoId = req.params.id;
      const creadoPor = getUserId(req);
      const result = await storage.procesoSharing.upsert(procesoId, parsed2.data, creadoPor);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
router27.delete(
  "/procesos/:id/sharing/:shareId",
  authenticate,
  async (req, res, next) => {
    try {
      await storage.procesoSharing.revoke(req.params.shareId, req.params.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
router27.get(
  "/procesos/:id/sharing",
  authenticate,
  async (req, res, next) => {
    try {
      const sharing = await storage.procesoSharing.getActive(req.params.id);
      res.json(sharing);
    } catch (err) {
      next(err);
    }
  }
);
var batchDecisionSchema = z14.object({
  bufeteId: z14.string().uuid(),
  decisions: z14.array(z14.object({
    procesoId: z14.string().uuid(),
    action: z14.enum(["privado", "compartir", "transferir"]),
    permission: z14.enum(["ver", "comentar", "editar"]).optional()
  }))
});
router27.post(
  "/procesos/batch-decisions",
  authenticate,
  async (req, res, next) => {
    try {
      const parsed2 = batchDecisionSchema.safeParse(req.body);
      if (!parsed2.success) return res.status(400).json({ error: parsed2.error.flatten() });
      const user = req.user;
      if (user.rol?.nombre !== "abogado") {
        return res.status(403).json({ error: "Solo el abogado puede ejecutar batch-decisions" });
      }
      const { bufeteId, decisions } = parsed2.data;
      const userId2 = user.id ?? user.userId ?? "";
      const results = { transferidos: 0, compartidos: 0, privados: 0, errores: [] };
      for (const d of decisions) {
        try {
          const ownership = await storage.procesoOwnership.getActive(d.procesoId);
          if (!ownership || ownership.ownerType !== "abogado" || ownership.ownerId !== user.idProfile) {
            results.errores.push(`${d.procesoId}: sin ownership`);
            continue;
          }
          if (d.action === "transferir") {
            await storage.procesoOwnership.transfer(
              d.procesoId,
              { ownerType: "bufete", ownerId: bufeteId, razon: "Transferido al unirse al bufete" },
              userId2
            );
            results.transferidos++;
          } else if (d.action === "compartir") {
            await storage.procesoSharing.upsert(
              d.procesoId,
              { sharedWithType: "bufete", sharedWithId: bufeteId, permission: d.permission ?? "ver", razon: "Compartido al unirse al bufete" },
              userId2
            );
            results.compartidos++;
          } else {
            results.privados++;
          }
        } catch (e) {
          results.errores.push(`${d.procesoId}: ${e.message}`);
        }
      }
      res.json(results);
    } catch (err) {
      next(err);
    }
  }
);
router27.get(
  "/firm/:firmId/pending-reassignments",
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.user;
      const rol = user.rol?.nombre ?? "";
      if (rol !== "bufete" && rol !== "corporacion") {
        return res.status(403).json({ error: "Acceso denegado" });
      }
      if (req.params.firmId !== user.idProfile) {
        return res.status(403).json({ error: "Solo puedes consultar tu propio bufete" });
      }
      const ids = await storage.procesoOwnership.getPendingReassignmentIds(req.params.firmId);
      const procesos2 = await storage.getProcesosByIds(ids, {});
      res.json(procesos2);
    } catch (err) {
      next(err);
    }
  }
);
var proceso_ownership_default = router27;

// server/routes/firm-settings.ts
init_auth();
init_database_storage();
import { Router as Router28 } from "express";
import { z as z15 } from "zod";
var router28 = Router28();
var updateFirmSettingsSchema = z15.object({
  allowPrivateClientes: z15.boolean().optional(),
  allowPrivateProcesos: z15.boolean().optional(),
  defaultClienteEsCompartido: z15.boolean().optional(),
  defaultProcesoEsCompartido: z15.boolean().optional(),
  notifMensajes: z15.boolean().optional(),
  notifVencimientos: z15.boolean().optional(),
  notifCambiosProcesos: z15.boolean().optional(),
  notifEquipoInvitaciones: z15.boolean().optional(),
  notifAlertasPlan: z15.boolean().optional(),
  notifResumenSemanal: z15.boolean().optional()
});
router28.get(
  "/firm/settings",
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.user;
      if (user?.rol?.nombre !== "bufete") {
        return res.status(403).json({
          error: "Solo los bufetes pueden acceder a esta configuraci\xF3n"
        });
      }
      const settings = await storage.firmSettings.get(user.idProfile);
      res.json(settings);
    } catch (err) {
      next(err);
    }
  }
);
router28.patch(
  "/firm/settings",
  authenticate,
  validate(updateFirmSettingsSchema),
  async (req, res, next) => {
    try {
      const user = req.user;
      if (user?.rol?.nombre !== "bufete") {
        return res.status(403).json({
          error: "Solo los bufetes pueden modificar esta configuraci\xF3n"
        });
      }
      const requested = req.body;
      const needsBasicPrivacy = requested.allowPrivateClientes !== void 0 || requested.defaultClienteEsCompartido !== void 0;
      const needsAdvancedPrivacy = requested.allowPrivateProcesos !== void 0 || requested.defaultProcesoEsCompartido !== void 0;
      if (needsBasicPrivacy) {
        const hasBasicPrivacy = await subscriptionService.hasFeature(user.id, "privacidad_basica");
        if (!hasBasicPrivacy) {
          return res.status(402).json({
            error: "FEATURE_NOT_AVAILABLE",
            feature: "privacidad_basica",
            mensaje: "Tu plan actual no incluye configuraciones de clientes privados."
          });
        }
      }
      if (needsAdvancedPrivacy) {
        const hasAdvancedPrivacy = await subscriptionService.hasFeature(user.id, "privacidad_avanzada");
        if (!hasAdvancedPrivacy) {
          return res.status(402).json({
            error: "FEATURE_NOT_AVAILABLE",
            feature: "privacidad_avanzada",
            mensaje: "Tu plan actual no incluye configuraciones de procesos privados."
          });
        }
      }
      const updated = await storage.firmSettings.upsert(user.idProfile, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);
router28.get(
  "/firm/settings/my-firm",
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.user;
      if (user?.rol?.nombre !== "abogado") {
        return res.status(403).json({
          error: "Solo los abogados pueden usar este endpoint"
        });
      }
      const lawyer = await storage.lawyerProfiles.getLawyer(user.idProfile);
      if (!lawyer?.firmId) {
        return res.json(null);
      }
      const settings = await storage.firmSettings.get(lawyer.firmId);
      res.json(settings);
    } catch (err) {
      next(err);
    }
  }
);
var firm_settings_default = router28;

// server/routes/suscripciones.ts
init_auth();
init_database_storage();
import { Router as Router29 } from "express";
import { randomUUID as randomUUID38 } from "crypto";
var router29 = Router29();
var WOMPI_BASE = process.env.WOMPI_BASE_URL ?? "https://sandbox.wompi.co/v1";
router29.get("/planes", async (req, res, next) => {
  try {
    const tipo = req.query.tipo;
    const list = await storage.planes.getPlanesPublicos(tipo);
    res.json(list);
  } catch (err) {
    next(err);
  }
});
router29.get("/suscripciones/me", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const suscripcion = await storage.suscripciones.getActive(user.id);
    if (!suscripcion) {
      res.status(404).json({ error: "Sin suscripci\xF3n activa" });
      return;
    }
    const plan = await storage.planes.getPlanesPublicos().then((list) => list.find((p) => p.id === suscripcion.planId));
    const usage = await storage.usageTracking.getByUserId(user.id);
    res.json({
      suscripcion,
      plan: plan ?? null,
      uso: usage ? {
        procesosUsados: usage.procesosUsados,
        procesosMax: plan?.maxProcesos ?? 5,
        clientesUsados: usage.clientesUsados,
        clientesMax: plan?.maxClientes ?? 10,
        storageUsadoMb: usage.storageUsadoMb,
        storageMaxMb: (plan?.maxStorageGb ?? 0) * 1024
      } : null
    });
  } catch (err) {
    next(err);
  }
});
router29.post("/suscripciones/checkout", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const { planId, ciclo, extraUsers = 0, currency = "COP" } = req.body;
    if (!planId || !ciclo) {
      res.status(400).json({ error: "planId y ciclo son requeridos" });
      return;
    }
    const plan = await storage.planes.getPlan(planId);
    if (!plan || !plan.state) {
      res.status(404).json({ error: "Plan no encontrado" });
      return;
    }
    const precioBase = ciclo === "mensual" ? { cop: parseFloat(plan.precioMensualCop), usd: parseFloat(plan.precioMensualUsd) } : { cop: parseFloat(plan.precioAnualCop), usd: parseFloat(plan.precioAnualUsd) };
    const extra = Math.max(0, extraUsers - plan.includedUsers);
    const precioExtraCop = parseFloat(plan.precioUsuarioExtraCop ?? "0");
    const precioExtraUsd = parseFloat(plan.precioUsuarioExtraUsd ?? "0");
    let montoCop;
    let montoUsd;
    if (ciclo === "mensual") {
      montoCop = precioBase.cop + extra * precioExtraCop;
      montoUsd = precioBase.usd + extra * precioExtraUsd;
    } else {
      montoCop = precioBase.cop + extra * precioExtraCop * 10;
      montoUsd = precioBase.usd + extra * precioExtraUsd * 10;
    }
    if (montoCop === 0 && montoUsd === 0) {
      await subscriptionService.activatePlanGratis(user.id);
      res.json({ activated: true, payment_url: null });
      return;
    }
    const wompiReference = randomUUID38();
    const suscripcionTemp = await storage.suscripciones.getActive(user.id);
    const suscripcionId = suscripcionTemp?.id ?? randomUUID38();
    const pago = await storage.pagosStorage.create({
      suscripcionId,
      userId: user.id,
      amountCop: currency === "COP" ? montoCop.toFixed(2) : null,
      amountUsd: currency === "USD" ? montoUsd.toFixed(2) : null,
      currency,
      estado: "pendiente",
      wompiReference,
      concepto: `Suscripci\xF3n ${plan.nombre} - ${ciclo}`
    });
    const amountInCents = currency === "COP" ? Math.round(montoCop * 100) : Math.round(montoUsd * 100);
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);
    const wompiRes = await fetch(`${WOMPI_BASE}/payment_links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.WOMPI_PRIVATE_KEY}`
      },
      body: JSON.stringify({
        name: `Suscripci\xF3n ${plan.nombre}`,
        description: `${ciclo === "mensual" ? "Mensual" : "Anual"} \u2014 ${plan.nombre}`,
        single_use: true,
        collect_shipping: false,
        amount_in_cents: amountInCents,
        currency,
        redirect_url: process.env.WOMPI_REDIRECT_URL ?? "exp://localhost:8081/--/checkout/result",
        expires_at: expiresAt.toISOString(),
        reference: wompiReference
      })
    });
    if (!wompiRes.ok) {
      const err = await wompiRes.json();
      console.error("[checkout] Error Wompi:", err);
      res.status(502).json({ error: "Error al crear el link de pago. Intenta de nuevo." });
      return;
    }
    const wompiData = await wompiRes.json();
    res.json({
      payment_url: wompiData.data.payment_link,
      reference: wompiReference,
      pagoId: pago.id,
      monto: currency === "COP" ? montoCop : montoUsd,
      currency,
      planNombre: plan.nombre
    });
  } catch (err) {
    next(err);
  }
});
router29.post("/suscripciones/cancelar", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const suscripcion = await storage.suscripciones.getActive(user.id);
    if (!suscripcion) {
      res.status(404).json({ error: "Sin suscripci\xF3n activa" });
      return;
    }
    if (suscripcion.planId === "plan-abogado-gratis") {
      res.status(400).json({ error: "No puedes cancelar el plan gratuito" });
      return;
    }
    await storage.suscripciones.cancelAutoRenovacion(suscripcion.id);
    res.json({
      mensaje: "Renovaci\xF3n cancelada. Tu plan sigue activo hasta el vencimiento.",
      fechaVencimiento: suscripcion.fechaVencimiento
    });
  } catch (err) {
    next(err);
  }
});
router29.get("/pagos/:pagoId/estado", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const { pagoId } = req.params;
    const pago = await storage.pagosStorage.getById(pagoId);
    if (!pago || pago.userId !== user.id) {
      res.status(404).json({ error: "Pago no encontrado" });
      return;
    }
    res.json({
      estado: pago.estado,
      wompiTransactionId: pago.wompiTransactionId,
      metodoPago: pago.metodoPago
    });
  } catch (err) {
    next(err);
  }
});
var suscripciones_default = router29;

// server/routes/webhooks.ts
init_database_storage();
import { Router as Router30 } from "express";
import { createHash as createHash2 } from "crypto";
var router30 = Router30();
function verifyWompiSignature(event, integritySecret) {
  try {
    const { checksum, properties } = event.signature ?? {};
    if (!checksum || !Array.isArray(properties)) return false;
    const data = event.data ?? {};
    const toHash = properties.map((prop) => {
      const value = prop.split(".").reduce((obj, key) => obj?.[key], data);
      return value ?? "";
    }).join("") + integritySecret;
    const expected = createHash2("sha256").update(toHash).digest("hex");
    return expected === checksum;
  } catch {
    return false;
  }
}
router30.post("/webhooks/wompi", async (req, res, next) => {
  try {
    const integritySecret = process.env.WOMPI_EVENTS_SECRET;
    if (!integritySecret) {
      console.error("[webhook:wompi] WOMPI_EVENTS_SECRET no configurado");
      res.status(500).json({ error: "Configuraci\xF3n incompleta" });
      return;
    }
    const event = req.body;
    if (!verifyWompiSignature(event, integritySecret)) {
      console.warn("[webhook:wompi] Firma inv\xE1lida \u2014 posible intento de fraude");
      res.status(401).json({ error: "Firma inv\xE1lida" });
      return;
    }
    if (event.event !== "transaction.updated") {
      res.status(200).json({ received: true });
      return;
    }
    const tx = event.data?.transaction;
    if (!tx) {
      res.status(400).json({ error: "Datos de transacci\xF3n faltantes" });
      return;
    }
    const { id: wompiTxId, status, reference, payment_method_type } = tx;
    const pago = await storage.pagosStorage.getByReference(reference);
    if (!pago) {
      console.warn(`[webhook:wompi] Pago con referencia ${reference} no encontrado`);
      res.status(200).json({ received: true });
      return;
    }
    const metodoPagoMap = {
      CARD: "card",
      PSE: "pse",
      NEQUI: "nequi",
      BANCOLOMBIA_TRANSFER: "bancolombia_transfer"
    };
    const metodoPago = metodoPagoMap[payment_method_type] ?? "otro";
    if (status === "APPROVED") {
      await storage.pagosStorage.updateEstado(pago.id, "aprobado", wompiTxId, metodoPago);
      const suscripciones2 = await storage.suscripciones.getByUserId(pago.userId);
      const ultima = suscripciones2.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const planId = ultima?.planId ?? "plan-abogado-esencial";
      const ciclo = ultima?.ciclo ?? "mensual";
      const extraUsers = ultima?.extraUsers ?? 0;
      await subscriptionService.activateSuscripcion(pago.userId, planId, ciclo, extraUsers, pago.id);
      await storage.appNotifications.createNotification(
        pago.userId,
        "subscription_activated",
        "\xA1Suscripci\xF3n activada!",
        "Tu plan ha sido activado exitosamente.",
        { pagoId: pago.id }
      );
      console.log(`[webhook:wompi] Suscripci\xF3n activada para usuario ${pago.userId}`);
    } else if (status === "DECLINED" || status === "ERROR" || status === "VOIDED") {
      await storage.pagosStorage.updateEstado(pago.id, "rechazado", wompiTxId, metodoPago);
      console.log(`[webhook:wompi] Pago rechazado para usuario ${pago.userId}: ${status}`);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[webhook:wompi] Error:", err);
    res.status(200).json({ received: true });
  }
});
var webhooks_default = router30;

// server/routes/public-support.ts
init_schema();
init_database_storage();
import { randomUUID as randomUUID39 } from "crypto";
import { Router as Router31 } from "express";
import { eq as eq60, inArray as inArray12 } from "drizzle-orm";
var router31 = Router31();
router31.post("/public/support-request", async (req, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const source = req.body?.source === "login" ? "login" : req.body?.source === "landing" ? "landing" : null;
    if (!name || !email || !message || !source) {
      return res.status(400).json({
        error: "name, email, message y source son requeridos"
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Email inv\xE1lido" });
    }
    const db2 = storage.db;
    const existingUser = await db2.query.users.findFirst({
      where: eq60(users.email, email)
    });
    await db2.insert(publicSupportRequests).values({
      id: randomUUID39(),
      name,
      email,
      message,
      source,
      userId: existingUser?.id ?? null
    });
    const adminRoles = await db2.select({ id: roles.id }).from(roles).where(inArray12(roles.nombre, ["admin_super", "admin_soporte"]));
    const adminRoleIds = adminRoles.map((role) => role.id);
    if (adminRoleIds.length > 0) {
      const adminUsers = await db2.select({ id: users.id }).from(users).where(inArray12(users.rolId, adminRoleIds));
      await Promise.all(
        adminUsers.map(
          (admin) => storage.appNotifications.createNotification(
            admin.id,
            "support_public_request",
            "Nueva consulta p\xFAblica",
            `${name} dej\xF3 una consulta desde ${source === "login" ? "login" : "landing"}.`,
            { route: "/(admin-tabs)/soporte", source, email }
          )
        )
      );
    }
    res.status(201).json({
      success: true,
      message: "Tu solicitud fue enviada. Nuestro equipo te contactar\xE1 pronto."
    });
  } catch (err) {
    next(err);
  }
});
var public_support_default = router31;

// server/admin/routes/index.ts
import { Router as Router40 } from "express";

// server/admin/routes/admin-stats.routes.ts
init_auth();
import { Router as Router32 } from "express";

// server/admin/services/admin-stats.service.ts
init_database_storage();
var adminStatsService = {
  async getStats() {
    return storage.adminStats.getStats();
  }
};

// server/admin/controllers/admin-stats.controller.ts
async function getStats(req, res, next) {
  try {
    const stats = await adminStatsService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

// server/admin/routes/admin-stats.routes.ts
var router32 = Router32();
router32.use(authenticate, requireAdmin);
router32.get("/", getStats);
var admin_stats_routes_default = router32;

// server/admin/routes/admin-users.routes.ts
init_auth();
import { Router as Router33 } from "express";

// server/admin/controllers/admin-users.controller.ts
import { z as z16 } from "zod";

// server/admin/services/admin-users.service.ts
init_database_storage();
init_email_service();
function buildEditableProfile(user, profile) {
  const roleName = user?.rol?.nombre;
  const common = {
    name: user?.name ?? "",
    email: user?.email ?? ""
  };
  if (!roleName) return { roleType: "desconocido", common };
  if (roleName === "abogado" && profile) {
    return {
      roleType: "abogado",
      common,
      lawyer: {
        firstName: profile.persona?.nombre ?? "",
        lastName: profile.persona?.apellido ?? "",
        phone: profile.persona?.telefono ?? "",
        document: profile.persona?.documento ?? "",
        address: profile.persona?.direccion ?? "",
        specialization: profile.specialization ?? "",
        licenseNumber: profile.licenseNumber ?? ""
      }
    };
  }
  if (roleName === "bufete" && profile) {
    return {
      roleType: "bufete",
      common: {
        name: profile.name ?? common.name,
        email: common.email
      },
      firm: {
        name: profile.name ?? "",
        nit: profile.nit ?? "",
        address: profile.address ?? "",
        phone: profile.phone ?? ""
      }
    };
  }
  if (roleName === "cliente" && profile) {
    if (profile.tipo === "natural") {
      return {
        roleType: "cliente_natural",
        common,
        clientNatural: {
          firstName: profile.natural?.persona?.nombre ?? "",
          lastName: profile.natural?.persona?.apellido ?? "",
          phone: profile.natural?.persona?.telefono ?? "",
          document: profile.natural?.persona?.documento ?? "",
          address: profile.natural?.persona?.direccion ?? ""
        }
      };
    }
    return {
      roleType: "cliente_empresa",
      common: {
        name: profile.empresa?.razonSocial ?? common.name,
        email: common.email
      },
      clientEmpresa: {
        companyName: profile.empresa?.razonSocial ?? "",
        nit: profile.empresa?.nit ?? "",
        sector: profile.empresa?.sector ?? ""
      }
    };
  }
  if (roleName.startsWith("admin_") && profile) {
    return {
      roleType: "admin",
      common,
      admin: {
        displayName: profile.displayName ?? common.name,
        adminType: profile.adminType ?? ""
      }
    };
  }
  return { roleType: roleName, common };
}
var adminUsersService = {
  async list(params) {
    return storage.adminUsers.list(params);
  },
  async getById(id) {
    const detail = await storage.adminUsers.getById(id);
    if (!detail) return null;
    const user = await storage.getUserById(id);
    const profile = user?.rol?.nombre ? await storage.getUserProfile(id, user.rol.nombre) : null;
    const twoFactor = await storage.userTwoFactor.getByUserId(id);
    const recoveryCodesRemaining = twoFactor?.recoveryCodes ? (() => {
      try {
        const parsed2 = JSON.parse(twoFactor.recoveryCodes);
        return Array.isArray(parsed2) ? parsed2.length : 0;
      } catch {
        return 0;
      }
    })() : 0;
    return {
      ...detail,
      editableProfile: buildEditableProfile(user, profile),
      twoFactor: {
        enabled: !!twoFactor?.enabledAt,
        enabledAt: twoFactor?.enabledAt?.toISOString?.() ?? null,
        recoveryCodesRemaining
      }
    };
  },
  async updateEstado(id, isActive) {
    return storage.adminUsers.updateEstado(id, isActive);
  },
  async updatePlan(id, planId) {
    return storage.adminUsers.updatePlan(id, planId);
  },
  async updateProfile(id, payload) {
    const user = await storage.getUserById(id);
    if (!user) throw new Error("Usuario no encontrado");
    const roleName = user.rol?.nombre ?? "";
    if (payload.email && payload.email !== user.email) {
      const existing = await storage.getUserByEmail(payload.email);
      if (existing && existing.id !== id) {
        throw new Error("El correo ya esta en uso por otro usuario");
      }
    }
    const commonUpdates = {};
    if (payload.email !== void 0) commonUpdates.email = payload.email.trim().toLowerCase();
    if (payload.name !== void 0) commonUpdates.name = payload.name.trim();
    if (Object.keys(commonUpdates).length > 0) {
      await storage.users.updateUser(id, commonUpdates);
    }
    if (roleName === "abogado") {
      const lawyer = await storage.lawyerProfiles.getLawyerByUserId(id);
      if (!lawyer) throw new Error("Perfil de abogado no encontrado");
      await storage.lawyerProfiles.updateLawyer(lawyer.id, {
        specialization: payload.lawyer?.specialization,
        licenseNumber: payload.lawyer?.licenseNumber,
        persona: {
          nombre: payload.lawyer?.firstName,
          apellido: payload.lawyer?.lastName,
          telefono: payload.lawyer?.phone,
          documento: payload.lawyer?.document,
          direccion: payload.lawyer?.address
        }
      });
      return;
    }
    if (roleName === "bufete") {
      const firm = await storage.firmProfiles.getFirmProfileByUserId(id);
      if (!firm) throw new Error("Perfil de bufete no encontrado");
      await storage.updateFirmProfile(firm.id, {
        name: payload.firm?.name,
        nit: payload.firm?.nit,
        address: payload.firm?.address,
        phone: payload.firm?.phone
      });
      if (payload.firm?.name && payload.name === void 0) {
        await storage.users.updateUser(id, { name: payload.firm.name.trim() });
      }
      return;
    }
    if (roleName === "cliente") {
      const cliente = await storage.clientes.getClienteByUser(id);
      if (!cliente) throw new Error("Perfil de cliente no encontrado");
      if (cliente.tipo === "natural") {
        await storage.clientes.updateCliente(cliente.id, {
          nombre: payload.clientNatural?.firstName,
          apellido: payload.clientNatural?.lastName,
          telefono: payload.clientNatural?.phone,
          documento: payload.clientNatural?.document,
          direccion: payload.clientNatural?.address
        });
        if ((payload.clientNatural?.firstName || payload.clientNatural?.lastName) && payload.name === void 0) {
          const fullName = [payload.clientNatural?.firstName, payload.clientNatural?.lastName].filter(Boolean).join(" ").trim();
          if (fullName) await storage.users.updateUser(id, { name: fullName });
        }
      } else {
        await storage.clientes.updateCliente(cliente.id, {
          razonSocial: payload.clientEmpresa?.companyName,
          nit: payload.clientEmpresa?.nit,
          sector: payload.clientEmpresa?.sector
        });
        if (payload.clientEmpresa?.companyName && payload.name === void 0) {
          await storage.users.updateUser(id, { name: payload.clientEmpresa.companyName.trim() });
        }
      }
      return;
    }
    if (roleName.startsWith("admin_")) {
      const adminProfile = await storage.adminProfiles.getAdminProfileByUserId(id);
      if (adminProfile) {
        await storage.adminProfiles.updateAdminProfile(adminProfile.id, {
          displayName: payload.admin?.displayName,
          adminType: payload.admin?.adminType
        });
      }
      if (payload.admin?.displayName && payload.name === void 0) {
        await storage.users.updateUser(id, { name: payload.admin.displayName.trim() });
      }
    }
  },
  async revokeSessions(id) {
    await storage.sessions.revokeAllForUser(id);
  },
  async resetTwoFactor(id, reason) {
    const user = await storage.getUserById(id);
    if (!user) throw new Error("Usuario no encontrado");
    await storage.userTwoFactor.disable(id);
    await storage.sessions.revokeAllForUser(id);
    queueNotificationEmail(
      user.email,
      "Autenticaci\xF3n en dos pasos restablecida",
      [
        "Un administrador restableci\xF3 la autenticaci\xF3n en dos pasos de tu cuenta.",
        "",
        `Motivo registrado: ${reason}`,
        "",
        "Por seguridad, todas tus sesiones activas fueron cerradas.",
        "Cuando vuelvas a ingresar deber\xE1s configurar nuevamente la autenticaci\xF3n en dos pasos."
      ].join("\n")
    );
  },
  async listLawyerVerifications(status) {
    return storage.adminUsers.listLawyerVerifications(status);
  },
  async updateLawyerVerification(lawyerProfileId, payload) {
    return storage.adminUsers.updateLawyerVerification(lawyerProfileId, payload);
  }
};

// server/admin/services/audit.service.ts
init_database_storage();
var auditService = {
  /**
   * Registra una acción crítica. Best-effort: si falla, no revierte la acción principal.
   * Llamar desde el controller DESPUÉS de que la acción fue exitosa.
   */
  async log(entry) {
    try {
      await storage.adminAudit.log(entry);
    } catch (err) {
      console.error("[audit] Error al registrar acci\xF3n:", entry.accion, err);
    }
  },
  async getLog(params) {
    return storage.adminAudit.getLog(params);
  }
};

// server/admin/controllers/admin-users.controller.ts
import jwt4 from "jsonwebtoken";
var ADMIN_RESET_TOKEN_EXPIRES = "15m";
var RESET_TOKEN_TYPE2 = "password_reset";
var listSchema = z16.object({
  page: z16.coerce.number().int().positive().default(1),
  limit: z16.coerce.number().int().positive().max(100).default(20),
  tipo: z16.enum(["abogado", "bufete", "cliente"]).optional(),
  estado: z16.enum(["activo", "suspendido"]).optional(),
  search: z16.string().max(100).optional()
});
var updateEstadoSchema = z16.object({
  activo: z16.boolean()
});
var updatePlanSchema = z16.object({
  planId: z16.string().min(1)
});
var updateProfileSchema = z16.object({
  name: z16.string().max(120).optional(),
  email: z16.string().email().optional(),
  lawyer: z16.object({
    firstName: z16.string().max(100).optional(),
    lastName: z16.string().max(100).optional(),
    phone: z16.string().max(50).optional(),
    document: z16.string().max(50).optional(),
    address: z16.string().max(255).optional(),
    specialization: z16.string().max(255).optional(),
    licenseNumber: z16.string().max(50).optional()
  }).optional(),
  firm: z16.object({
    name: z16.string().max(255).optional(),
    nit: z16.string().max(50).optional(),
    address: z16.string().max(255).optional(),
    phone: z16.string().max(50).optional()
  }).optional(),
  clientNatural: z16.object({
    firstName: z16.string().max(100).optional(),
    lastName: z16.string().max(100).optional(),
    phone: z16.string().max(50).optional(),
    document: z16.string().max(50).optional(),
    address: z16.string().max(255).optional()
  }).optional(),
  clientEmpresa: z16.object({
    companyName: z16.string().max(255).optional(),
    nit: z16.string().max(50).optional(),
    sector: z16.string().max(100).optional()
  }).optional(),
  admin: z16.object({
    displayName: z16.string().max(120).optional(),
    adminType: z16.string().max(50).optional()
  }).optional()
});
var lawyerVerificationListSchema = z16.object({
  status: z16.enum(["pendiente", "verificado", "rechazado"]).default("pendiente")
});
var updateLawyerVerificationSchema = z16.object({
  status: z16.enum(["verificado", "rechazado"]),
  reviewNotes: z16.string().max(1e3).optional()
});
var resetTwoFactorSchema = z16.object({
  reason: z16.string().trim().min(10, "El motivo debe tener al menos 10 caracteres").max(500)
});
function getAdminId(req) {
  const user = req.user;
  if (!user?.id) throw new Error("Unauthorized: no user on request");
  return user.id;
}
async function listUsers(req, res, next) {
  try {
    const params = listSchema.parse(req.query);
    const result = await adminUsersService.list(params);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}
async function getUserById(req, res, next) {
  try {
    const user = await adminUsersService.getById(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
async function updateEstado(req, res, next) {
  try {
    const { activo } = updateEstadoSchema.parse(req.body);
    const userId2 = req.params.id;
    await adminUsersService.updateEstado(userId2, activo);
    await auditService.log({
      adminId: getAdminId(req),
      accion: activo ? "usuario.activar" : "usuario.suspender",
      targetId: userId2,
      detalle: JSON.stringify({ activo })
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
async function updatePlan(req, res, next) {
  try {
    const { planId } = updatePlanSchema.parse(req.body);
    const userId2 = req.params.id;
    await adminUsersService.updatePlan(userId2, planId);
    await auditService.log({
      adminId: getAdminId(req),
      accion: "usuario.cambiar_plan",
      targetId: userId2,
      detalle: JSON.stringify({ planId })
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
async function updateProfile(req, res, next) {
  try {
    const payload = updateProfileSchema.parse(req.body);
    const userId2 = req.params.id;
    await adminUsersService.updateProfile(userId2, payload);
    await auditService.log({
      adminId: getAdminId(req),
      accion: "usuario.actualizar_perfil",
      targetId: userId2,
      detalle: JSON.stringify(payload)
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
async function resetPassword(req, res, next) {
  try {
    const userId2 = req.params.id;
    const user = await adminUsersService.getById(userId2);
    if (!user) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is not configured");
    }
    const token = jwt4.sign(
      { sub: userId2, type: RESET_TOKEN_TYPE2 },
      secret,
      { expiresIn: ADMIN_RESET_TOKEN_EXPIRES }
    );
    await auditService.log({
      adminId: getAdminId(req),
      accion: "usuario.reset_password",
      targetId: userId2,
      detalle: JSON.stringify({ email: user.email })
    });
    res.json({ success: true, data: { token, expiresIn: ADMIN_RESET_TOKEN_EXPIRES } });
  } catch (err) {
    next(err);
  }
}
async function revokeSessions(req, res, next) {
  try {
    const userId2 = req.params.id;
    const user = await adminUsersService.getById(userId2);
    if (!user) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    await adminUsersService.revokeSessions(userId2);
    await auditService.log({
      adminId: getAdminId(req),
      accion: "usuario.revocar_sesiones",
      targetId: userId2,
      detalle: JSON.stringify({ email: user.email })
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
async function resetTwoFactor(req, res, next) {
  try {
    const userId2 = req.params.id;
    const { reason } = resetTwoFactorSchema.parse(req.body);
    const user = await adminUsersService.getById(userId2);
    if (!user) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    await adminUsersService.resetTwoFactor(userId2, reason);
    await auditService.log({
      adminId: getAdminId(req),
      accion: "usuario.reset_2fa",
      targetId: userId2,
      detalle: JSON.stringify({ email: user.email, reason })
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
async function listLawyerVerifications(req, res, next) {
  try {
    const { status } = lawyerVerificationListSchema.parse(req.query);
    const data = await adminUsersService.listLawyerVerifications(status);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
async function updateLawyerVerification(req, res, next) {
  try {
    const { status, reviewNotes } = updateLawyerVerificationSchema.parse(req.body);
    const lawyerProfileId = req.params.id;
    const adminId = getAdminId(req);
    await adminUsersService.updateLawyerVerification(lawyerProfileId, {
      status,
      reviewNotes,
      reviewedBy: adminId
    });
    await auditService.log({
      adminId,
      accion: `abogado.verificacion_${status}`,
      targetId: lawyerProfileId,
      detalle: JSON.stringify({ status, reviewNotes: reviewNotes ?? null })
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// server/admin/routes/admin-users.routes.ts
var router33 = Router33();
router33.use(authenticate, requireAdmin);
router33.get("/", listUsers);
router33.get("/lawyer-verifications", listLawyerVerifications);
router33.get("/:id", getUserById);
router33.patch(
  "/:id/estado",
  requireAdminRole("admin_super", "admin_soporte"),
  updateEstado
);
router33.patch(
  "/:id/plan",
  requireAdminRole("admin_super"),
  updatePlan
);
router33.patch(
  "/:id/profile",
  requireAdminRole("admin_super", "admin_soporte"),
  updateProfile
);
router33.post(
  "/:id/reset-password",
  requireAdminRole("admin_super"),
  resetPassword
);
router33.post(
  "/:id/revoke-sessions",
  requireAdminRole("admin_super", "admin_soporte"),
  revokeSessions
);
router33.post(
  "/:id/reset-2fa",
  requireAdminRole("admin_super", "admin_soporte"),
  resetTwoFactor
);
router33.patch(
  "/lawyer-verifications/:id",
  requireAdminRole("admin_super", "admin_soporte"),
  updateLawyerVerification
);
var admin_users_routes_default = router33;

// server/admin/routes/admin-plans.routes.ts
init_auth();
import { Router as Router34 } from "express";
import { randomUUID as randomUUID40 } from "crypto";
import { z as z17 } from "zod";
import { eq as eq61, sql as sql24, desc as desc24, and as and42 } from "drizzle-orm";
init_database_storage();
init_schema();
var router34 = Router34();
router34.use(authenticate, requireAdmin);
var planSchema = z17.object({
  nombre: z17.string().min(1),
  tipo: z17.enum(["abogado", "bufete"]),
  precioMensualCop: z17.coerce.string(),
  precioAnualCop: z17.coerce.string(),
  precioMensualUsd: z17.coerce.string(),
  precioAnualUsd: z17.coerce.string(),
  maxProcesos: z17.coerce.number().int(),
  maxClientes: z17.coerce.number().int(),
  maxStorageGb: z17.coerce.number().int(),
  includedUsers: z17.coerce.number().int(),
  maxUsers: z17.coerce.number().int(),
  precioUsuarioExtraCop: z17.coerce.string().nullable().optional(),
  precioUsuarioExtraUsd: z17.coerce.string().nullable().optional(),
  state: z17.boolean().optional()
});
router34.get("/", requireAdminRole("admin_super", "admin_finanzas"), async (req, res, next) => {
  try {
    const db2 = storage.db;
    const tipo = typeof req.query.tipo === "string" ? req.query.tipo : void 0;
    const estado = typeof req.query.estado === "string" ? req.query.estado : "todos";
    const conditions = [];
    if (tipo === "abogado" || tipo === "bufete") conditions.push(eq61(planes.tipo, tipo));
    if (estado === "activo") conditions.push(eq61(planes.state, true));
    if (estado === "inactivo") conditions.push(eq61(planes.state, false));
    const rows = await db2.select({
      ...planes,
      suscriptores: sql24`(
          SELECT COUNT(*)
          FROM suscripciones s
          WHERE s.plan_id = ${planes.id} AND s.estado = 'activa'
        )`
    }).from(planes).where(conditions.length ? and42(...conditions) : void 0).orderBy(desc24(planes.state), planes.tipo, planes.nombre);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});
router34.post("/", requireAdminRole("admin_super", "admin_finanzas"), async (req, res, next) => {
  try {
    const parsed2 = planSchema.parse(req.body);
    const created = await storage.planes.createPlan({
      id: randomUUID40(),
      ...parsed2,
      precioUsuarioExtraCop: parsed2.precioUsuarioExtraCop ?? null,
      precioUsuarioExtraUsd: parsed2.precioUsuarioExtraUsd ?? null,
      state: parsed2.state ?? true
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});
router34.put("/:id", requireAdminRole("admin_super", "admin_finanzas"), async (req, res, next) => {
  try {
    const parsed2 = planSchema.partial().parse(req.body);
    const updated = await storage.planes.updatePlan(req.params.id, parsed2);
    if (!updated) return res.status(404).json({ error: "Plan no encontrado" });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
router34.delete("/:id", requireAdminRole("admin_super"), async (req, res, next) => {
  try {
    const updated = await storage.planes.updatePlan(req.params.id, { state: false });
    if (!updated) return res.status(404).json({ error: "Plan no encontrado" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
var admin_plans_routes_default = router34;

// server/admin/routes/admin-billing.routes.ts
init_auth();
import { Router as Router35 } from "express";
import { z as z18 } from "zod";
import { sql as sql25, desc as desc25, and as and43, eq as eq62, or as or8, like as like8 } from "drizzle-orm";
init_database_storage();
init_schema();
var router35 = Router35();
router35.use(authenticate, requireAdmin);
router35.get("/summary", requireAdminRole("admin_super", "admin_finanzas"), async (_req, res, next) => {
  try {
    const db2 = storage.db;
    const [subs, pay, monthlyRevenue] = await Promise.all([
      db2.select({
        activas: sql25`SUM(CASE WHEN ${suscripciones.estado} = 'activa' THEN 1 ELSE 0 END)`,
        canceladas: sql25`SUM(CASE WHEN ${suscripciones.estado} = 'cancelada' THEN 1 ELSE 0 END)`,
        vencidas: sql25`SUM(CASE WHEN ${suscripciones.estado} = 'vencida' THEN 1 ELSE 0 END)`
      }).from(suscripciones),
      db2.select({
        pendientes: sql25`SUM(CASE WHEN ${pagos.estado} = 'pendiente' THEN 1 ELSE 0 END)`,
        aprobados: sql25`SUM(CASE WHEN ${pagos.estado} = 'aprobado' THEN 1 ELSE 0 END)`,
        rechazados: sql25`SUM(CASE WHEN ${pagos.estado} = 'rechazado' THEN 1 ELSE 0 END)`
      }).from(pagos),
      db2.select({
        totalCop: sql25`COALESCE(SUM(CASE WHEN ${pagos.estado} = 'aprobado' AND ${pagos.currency} = 'COP' THEN ${pagos.amountCop} ELSE 0 END), 0)`
      }).from(pagos)
    ]);
    res.json({
      success: true,
      data: {
        suscripciones: {
          activas: Number(subs[0]?.activas ?? 0),
          canceladas: Number(subs[0]?.canceladas ?? 0),
          vencidas: Number(subs[0]?.vencidas ?? 0)
        },
        pagos: {
          pendientes: Number(pay[0]?.pendientes ?? 0),
          aprobados: Number(pay[0]?.aprobados ?? 0),
          rechazados: Number(pay[0]?.rechazados ?? 0)
        },
        ingresosCopAprobados: Number(monthlyRevenue[0]?.totalCop ?? 0)
      }
    });
  } catch (err) {
    next(err);
  }
});
router35.get("/subscriptions", requireAdminRole("admin_super", "admin_finanzas"), async (req, res, next) => {
  try {
    const db2 = storage.db;
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = (page - 1) * limit;
    const estado = typeof req.query.estado === "string" ? req.query.estado : void 0;
    const search = typeof req.query.search === "string" ? `%${req.query.search}%` : void 0;
    const conditions = [];
    if (estado) conditions.push(eq62(suscripciones.estado, estado));
    if (search) conditions.push(or8(like8(users.email, search), like8(users.name, search)));
    const where = conditions.length ? and43(...conditions) : void 0;
    const [rows, countRows] = await Promise.all([
      db2.select({
        id: suscripciones.id,
        userId: suscripciones.userId,
        planId: suscripciones.planId,
        estado: suscripciones.estado,
        ciclo: suscripciones.ciclo,
        fechaInicio: suscripciones.fechaInicio,
        fechaVencimiento: suscripciones.fechaVencimiento,
        autoRenovacion: suscripciones.autoRenovacion,
        extraUsers: suscripciones.extraUsers,
        userName: users.name,
        email: users.email,
        planNombre: planes.nombre,
        planTipo: planes.tipo
      }).from(suscripciones).innerJoin(users, eq62(users.id, suscripciones.userId)).innerJoin(planes, eq62(planes.id, suscripciones.planId)).where(where).orderBy(desc25(suscripciones.fechaInicio)).limit(limit).offset(offset),
      db2.select({ total: sql25`COUNT(*)` }).from(suscripciones).innerJoin(users, eq62(users.id, suscripciones.userId)).where(where)
    ]);
    res.json({
      success: true,
      data: rows,
      meta: { total: Number(countRows[0]?.total ?? 0), page, limit }
    });
  } catch (err) {
    next(err);
  }
});
router35.get("/payments", requireAdminRole("admin_super", "admin_finanzas"), async (req, res, next) => {
  try {
    const db2 = storage.db;
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = (page - 1) * limit;
    const estado = typeof req.query.estado === "string" ? req.query.estado : void 0;
    const search = typeof req.query.search === "string" ? `%${req.query.search}%` : void 0;
    const conditions = [];
    if (estado) conditions.push(eq62(pagos.estado, estado));
    if (search) conditions.push(or8(like8(users.email, search), like8(users.name, search), like8(pagos.wompiReference, search)));
    const where = conditions.length ? and43(...conditions) : void 0;
    const [rows, countRows] = await Promise.all([
      db2.select({
        id: pagos.id,
        estado: pagos.estado,
        currency: pagos.currency,
        amountCop: pagos.amountCop,
        amountUsd: pagos.amountUsd,
        metodoPago: pagos.metodoPago,
        wompiReference: pagos.wompiReference,
        concepto: pagos.concepto,
        createdAt: pagos.createdAt,
        email: users.email,
        userName: users.name,
        planNombre: planes.nombre
      }).from(pagos).innerJoin(users, eq62(users.id, pagos.userId)).leftJoin(suscripciones, eq62(suscripciones.id, pagos.suscripcionId)).leftJoin(planes, eq62(planes.id, suscripciones.planId)).where(where).orderBy(desc25(pagos.createdAt)).limit(limit).offset(offset),
      db2.select({ total: sql25`COUNT(*)` }).from(pagos).innerJoin(users, eq62(users.id, pagos.userId)).where(where)
    ]);
    res.json({
      success: true,
      data: rows,
      meta: { total: Number(countRows[0]?.total ?? 0), page, limit }
    });
  } catch (err) {
    next(err);
  }
});
var updateSubscriptionSchema = z18.object({
  estado: z18.enum(["activa", "cancelada", "vencida", "en_prueba"]).optional(),
  autoRenovacion: z18.boolean().optional()
});
router35.patch("/subscriptions/:id", requireAdminRole("admin_super", "admin_finanzas"), async (req, res, next) => {
  try {
    const parsed2 = updateSubscriptionSchema.parse(req.body);
    await storage.db.update(suscripciones).set(parsed2).where(eq62(suscripciones.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
var admin_billing_routes_default = router35;

// server/admin/routes/admin-processes.routes.ts
init_auth();
import { Router as Router36 } from "express";
import { z as z19 } from "zod";
import { sql as sql26, desc as desc26, like as like9, or as or9, eq as eq63 } from "drizzle-orm";
init_database_storage();
init_schema();
var router36 = Router36();
router36.use(authenticate, requireAdmin);
router36.get("/summary", requireAdminRole("admin_super"), async (_req, res, next) => {
  try {
    const db2 = storage.db;
    const [totals, tipos] = await Promise.all([
      db2.select({
        total: sql26`COUNT(*)`,
        activos: sql26`SUM(CASE WHEN ${procesos.state} = 1 THEN 1 ELSE 0 END)`,
        archivados: sql26`SUM(CASE WHEN ${procesos.state} = 0 THEN 1 ELSE 0 END)`
      }).from(procesos),
      db2.select({
        nombre: tiposProceso.nombre,
        total: sql26`COUNT(*)`
      }).from(procesos).leftJoin(tiposProceso, eq63(tiposProceso.id, procesos.tipoProcesoId)).groupBy(tiposProceso.nombre).orderBy(desc26(sql26`COUNT(*)`)).limit(6)
    ]);
    res.json({
      success: true,
      data: {
        total: Number(totals[0]?.total ?? 0),
        activos: Number(totals[0]?.activos ?? 0),
        archivados: Number(totals[0]?.archivados ?? 0),
        porTipo: tipos
      }
    });
  } catch (err) {
    next(err);
  }
});
router36.get("/records", requireAdminRole("admin_super"), async (req, res, next) => {
  try {
    const db2 = storage.db;
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === "string" ? `%${req.query.search}%` : void 0;
    const where = search ? or9(
      like9(procesos.radicado, search),
      like9(procesos.juzgado, search),
      like9(tiposProceso.nombre, search),
      like9(personas.nombre, search),
      like9(personas.apellido, search),
      like9(clientesEmpresa.razonSocial, search)
    ) : void 0;
    const rows = await db2.select({
      id: procesos.id,
      radicado: procesos.radicado,
      juzgado: procesos.juzgado,
      state: procesos.state,
      fechaCreacion: procesos.fechaCreacion,
      tipoProceso: tiposProceso.nombre,
      estado: estadosProceso.nombre,
      clienteNombre: sql26`COALESCE(CONCAT(${personas.nombre}, ' ', ${personas.apellido}), ${clientesEmpresa.razonSocial}, 'Sin cliente')`
    }).from(procesos).leftJoin(tiposProceso, eq63(tiposProceso.id, procesos.tipoProcesoId)).leftJoin(estadosProceso, eq63(estadosProceso.id, procesos.estadoId)).leftJoin(clientes, eq63(clientes.id, procesos.clienteId)).leftJoin(clientesNatural, eq63(clientesNatural.clienteId, clientes.id)).leftJoin(personas, eq63(personas.id, clientesNatural.personaId)).leftJoin(clientesEmpresa, eq63(clientesEmpresa.clienteId, clientes.id)).where(where).orderBy(desc26(procesos.fechaCreacion)).limit(limit).offset(offset);
    const countRows = await db2.select({ total: sql26`COUNT(*)` }).from(procesos).leftJoin(tiposProceso, eq63(tiposProceso.id, procesos.tipoProcesoId)).leftJoin(clientes, eq63(clientes.id, procesos.clienteId)).leftJoin(clientesNatural, eq63(clientesNatural.clienteId, clientes.id)).leftJoin(personas, eq63(personas.id, clientesNatural.personaId)).leftJoin(clientesEmpresa, eq63(clientesEmpresa.clienteId, clientes.id)).where(where);
    res.json({
      success: true,
      data: rows,
      meta: { total: Number(countRows[0]?.total ?? 0), page, limit }
    });
  } catch (err) {
    next(err);
  }
});
router36.patch("/records/:id/state", requireAdminRole("admin_super"), async (req, res, next) => {
  try {
    const { state } = z19.object({ state: z19.boolean() }).parse(req.body);
    const updated = await storage.updateProceso(req.params.id, { state });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
router36.get("/types", requireAdminRole("admin_super"), async (_req, res, next) => {
  try {
    const tipos = await storage.tiposProceso.getTiposProceso();
    res.json({ success: true, data: tipos });
  } catch (err) {
    next(err);
  }
});
router36.post("/types", requireAdminRole("admin_super"), async (req, res, next) => {
  try {
    const parsed2 = z19.object({ nombre: z19.string().min(1), descripcion: z19.string().optional() }).parse(req.body);
    const created = await storage.tiposProceso.createTipoProceso(parsed2);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});
router36.put("/types/:id", requireAdminRole("admin_super"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed2 = z19.object({
      nombre: z19.string().min(1).optional(),
      descripcion: z19.string().nullable().optional(),
      activo: z19.boolean().optional()
    }).parse(req.body);
    const updated = await storage.tiposProceso.updateTipoProceso(id, parsed2);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
router36.delete("/types/:id", requireAdminRole("admin_super"), async (req, res, next) => {
  try {
    await storage.tiposProceso.deleteTipoProceso(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
var admin_processes_routes_default = router36;

// server/admin/routes/admin-community.routes.ts
init_auth();
import { Router as Router37 } from "express";
import { z as z20 } from "zod";
import { sql as sql27, desc as desc27, like as like10, or as or10, eq as eq64, and as and44 } from "drizzle-orm";
init_database_storage();
init_schema();
var router37 = Router37();
router37.use(authenticate, requireAdmin);
router37.get("/overview", requireAdminRole("admin_super", "admin_soporte"), async (_req, res, next) => {
  try {
    const db2 = storage.db;
    const [postTotals, reportTotals] = await Promise.all([
      db2.select({
        total: sql27`COUNT(*)`,
        open: sql27`SUM(CASE WHEN ${posts.status} = 'open' THEN 1 ELSE 0 END)`,
        inProgress: sql27`SUM(CASE WHEN ${posts.status} = 'in_progress' THEN 1 ELSE 0 END)`,
        closed: sql27`SUM(CASE WHEN ${posts.status} = 'closed' THEN 1 ELSE 0 END)`,
        disabled: sql27`SUM(CASE WHEN ${posts.disabled} = 1 THEN 1 ELSE 0 END)`
      }).from(posts),
      db2.select({ total: sql27`COUNT(*)` }).from(postReports)
    ]);
    res.json({
      success: true,
      data: {
        posts: {
          total: Number(postTotals[0]?.total ?? 0),
          open: Number(postTotals[0]?.open ?? 0),
          inProgress: Number(postTotals[0]?.inProgress ?? 0),
          closed: Number(postTotals[0]?.closed ?? 0),
          disabled: Number(postTotals[0]?.disabled ?? 0)
        },
        reports: Number(reportTotals[0]?.total ?? 0)
      }
    });
  } catch (err) {
    next(err);
  }
});
router37.get("/posts", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const db2 = storage.db;
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = (page - 1) * limit;
    const status = typeof req.query.status === "string" ? req.query.status : void 0;
    const disabled = typeof req.query.disabled === "string" ? req.query.disabled : void 0;
    const search = typeof req.query.search === "string" ? `%${req.query.search}%` : void 0;
    const conditions = [];
    if (status) conditions.push(eq64(posts.status, status));
    if (disabled === "true") conditions.push(eq64(posts.disabled, true));
    if (disabled === "false") conditions.push(eq64(posts.disabled, false));
    if (search) conditions.push(or10(like10(posts.title, search), like10(posts.content, search), like10(users.name, search)));
    const where = conditions.length ? and44(...conditions) : void 0;
    const [rows, countRows] = await Promise.all([
      db2.select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        disabled: posts.disabled,
        visibility: posts.visibility,
        city: posts.city,
        createdAt: posts.createdAt,
        authorName: users.name,
        reportCount: sql27`(
          SELECT COUNT(*)
          FROM post_reports pr
          WHERE pr.post_id = ${posts.id}
        )`
      }).from(posts).leftJoin(users, eq64(users.id, posts.userId)).where(where).orderBy(desc27(posts.createdAt)).limit(limit).offset(offset),
      db2.select({ total: sql27`COUNT(*)` }).from(posts).leftJoin(users, eq64(users.id, posts.userId)).where(where)
    ]);
    res.json({ success: true, data: rows, meta: { total: Number(countRows[0]?.total ?? 0), page, limit } });
  } catch (err) {
    next(err);
  }
});
router37.get("/reports", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const db2 = storage.db;
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const rows = await db2.select({
      id: postReports.id,
      postId: postReports.postId,
      commentId: postReports.commentId,
      reason: postReports.reason,
      detail: postReports.detail,
      createdAt: postReports.createdAt,
      reporterEmail: users.email,
      reporterName: users.name
    }).from(postReports).leftJoin(users, eq64(users.id, postReports.reporterUserId)).orderBy(desc27(postReports.createdAt)).limit(limit);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});
router37.patch("/posts/:id/status", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const { status } = z20.object({ status: z20.enum(["open", "in_progress", "closed"]) }).parse(req.body);
    await storage.db.update(posts).set({ status }).where(eq64(posts.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
router37.patch("/posts/:id/disabled", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const { disabled } = z20.object({ disabled: z20.boolean() }).parse(req.body);
    await storage.community.setPostDisabled(req.params.id, disabled);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
var admin_community_routes_default = router37;

// server/admin/routes/admin-support.routes.ts
init_auth();
import { Router as Router38 } from "express";
import { desc as desc28, sql as sql28, like as like11, or as or11, eq as eq65, and as and45 } from "drizzle-orm";
init_database_storage();
init_schema();
init_email_service();
var router38 = Router38();
router38.use(authenticate, requireAdmin);
router38.get("/overview", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const db2 = storage.db;
    const adminId = req.user?.id;
    const [events, usersSummary, audit, supportConversations, publicRequestSummary] = await Promise.all([
      db2.select({
        total: sql28`COUNT(*)`,
        loginFail: sql28`SUM(CASE WHEN ${securityEvents.eventType} = 'login_fail' THEN 1 ELSE 0 END)`,
        blocked: sql28`SUM(CASE WHEN ${securityEvents.eventType} IN ('login_blocked', 'login_blocked_user') THEN 1 ELSE 0 END)`
      }).from(securityEvents),
      db2.select({
        activos: sql28`SUM(CASE WHEN ${users.isActive} = 1 THEN 1 ELSE 0 END)`,
        suspendidos: sql28`SUM(CASE WHEN ${users.isActive} = 0 THEN 1 ELSE 0 END)`
      }).from(users),
      storage.adminAudit.getLog({ page: 1, limit: 10 }),
      chatService.getConversations(adminId, 5, 0, "admin_support"),
      db2.select({
        total: sql28`COUNT(*)`,
        pending: sql28`SUM(CASE WHEN ${publicSupportRequests.status} IN ('new', 'in_progress') THEN 1 ELSE 0 END)`
      }).from(publicSupportRequests)
    ]);
    res.json({
      success: true,
      data: {
        security: {
          total: Number(events[0]?.total ?? 0),
          loginFail: Number(events[0]?.loginFail ?? 0),
          blocked: Number(events[0]?.blocked ?? 0)
        },
        users: {
          activos: Number(usersSummary[0]?.activos ?? 0),
          suspendidos: Number(usersSummary[0]?.suspendidos ?? 0)
        },
        support: {
          total: supportConversations.total,
          open: supportConversations.conversations.filter((conversation) => conversation.unreadCount > 0).length,
          publicRequests: Number(publicRequestSummary[0]?.total ?? 0),
          publicPending: Number(publicRequestSummary[0]?.pending ?? 0)
        },
        audit: audit.data
      }
    });
  } catch (err) {
    next(err);
  }
});
router38.get("/security-events", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const db2 = storage.db;
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === "string" ? `%${req.query.search}%` : void 0;
    const where = search ? or11(like11(securityEvents.email, search), like11(securityEvents.ip, search)) : void 0;
    const [rows, countRows] = await Promise.all([
      db2.select().from(securityEvents).where(where).orderBy(desc28(securityEvents.createdAt)).limit(limit).offset(offset),
      db2.select({ total: sql28`COUNT(*)` }).from(securityEvents).where(where)
    ]);
    res.json({ success: true, data: rows, meta: { total: Number(countRows[0]?.total ?? 0), page, limit } });
  } catch (err) {
    next(err);
  }
});
router38.get("/audit-log", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const data = await storage.adminAudit.getLog({ page, limit });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});
router38.get("/conversations", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const adminId = req.user?.id;
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const result = await chatService.getConversations(adminId, limit, offset, "admin_support");
    const data = search ? result.conversations.filter(
      (conversation) => (conversation.name ?? "").toLowerCase().includes(search) || conversation.participants.some(
        (participant) => participant.userId !== adminId && `${participant.name} ${participant.email}`.toLowerCase().includes(search)
      )
    ) : result.conversations;
    res.json({ success: true, data, meta: { total: search ? data.length : result.total, limit, offset } });
  } catch (err) {
    next(err);
  }
});
router38.get("/public-requests", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const db2 = storage.db;
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const searchTerm = search ? `%${search}%` : void 0;
    const filters = and45(
      status ? eq65(publicSupportRequests.status, status) : void 0,
      searchTerm ? or11(
        like11(publicSupportRequests.name, searchTerm),
        like11(publicSupportRequests.email, searchTerm),
        like11(publicSupportRequests.message, searchTerm)
      ) : void 0
    );
    const [rows, totalRows] = await Promise.all([
      db2.select().from(publicSupportRequests).where(filters).orderBy(desc28(publicSupportRequests.createdAt)).limit(limit).offset(offset),
      db2.select({ total: sql28`COUNT(*)` }).from(publicSupportRequests).where(filters)
    ]);
    res.json({
      success: true,
      data: rows,
      meta: {
        total: Number(totalRows[0]?.total ?? 0),
        limit,
        offset
      }
    });
  } catch (err) {
    next(err);
  }
});
router38.patch("/public-requests/:id", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const db2 = storage.db;
    const adminId = req.user?.id;
    const id = req.params.id;
    const status = typeof req.body?.status === "string" ? req.body.status : "";
    if (!["new", "in_progress", "resolved", "spam"].includes(status)) {
      return res.status(400).json({ error: "status inv\xE1lido" });
    }
    await db2.update(publicSupportRequests).set({
      status,
      assignedAdminId: adminId,
      resolvedAt: status === "resolved" ? /* @__PURE__ */ new Date() : null
    }).where(eq65(publicSupportRequests.id, id));
    await auditService.log({
      adminId,
      accion: "public_support_request_updated",
      targetId: id,
      detalle: `Estado actualizado a ${status}`
    });
    const updated = await db2.query.publicSupportRequests.findFirst({
      where: eq65(publicSupportRequests.id, id)
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
router38.post("/public-requests/:id/open-conversation", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const db2 = storage.db;
    const adminId = req.user?.id;
    const id = req.params.id;
    const requestRow = await db2.query.publicSupportRequests.findFirst({
      where: eq65(publicSupportRequests.id, id)
    });
    if (!requestRow) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }
    if (!requestRow.userId) {
      return res.status(400).json({ error: "La solicitud no est\xE1 vinculada a un usuario registrado" });
    }
    const conversation = await chatService.getOrCreateSupportConversationForAdmin(adminId, requestRow.userId);
    await db2.update(publicSupportRequests).set({
      conversationId: conversation.id,
      assignedAdminId: adminId,
      status: "in_progress"
    }).where(eq65(publicSupportRequests.id, id));
    await auditService.log({
      adminId,
      accion: "public_support_request_opened",
      targetId: id,
      detalle: `Conversaci\xF3n ${conversation.id}`
    });
    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});
router38.post("/public-requests/:id/reply", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const db2 = storage.db;
    const adminId = req.user?.id;
    const id = req.params.id;
    const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const markAsResolved = req.body?.markAsResolved === true;
    if (!subject || !message) {
      return res.status(400).json({ error: "subject y message son requeridos" });
    }
    const requestRow = await db2.query.publicSupportRequests.findFirst({
      where: eq65(publicSupportRequests.id, id)
    });
    if (!requestRow) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }
    await sendSupportReplyEmail(requestRow.email, subject, message);
    await db2.update(publicSupportRequests).set({
      assignedAdminId: adminId,
      status: markAsResolved ? "resolved" : "in_progress",
      resolvedAt: markAsResolved ? /* @__PURE__ */ new Date() : null
    }).where(eq65(publicSupportRequests.id, id));
    await auditService.log({
      adminId,
      accion: "public_support_request_replied",
      targetId: id,
      detalle: `Respuesta enviada a ${requestRow.email} con asunto: ${subject}`
    });
    const updated = await db2.query.publicSupportRequests.findFirst({
      where: eq65(publicSupportRequests.id, id)
    });
    res.status(201).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
router38.post("/conversations", requireAdminRole("admin_super", "admin_soporte"), async (req, res, next) => {
  try {
    const adminId = req.user?.id;
    const targetUserId = typeof req.body?.targetUserId === "string" ? req.body.targetUserId : "";
    if (!targetUserId) {
      return res.status(400).json({ error: "targetUserId es requerido" });
    }
    const conversation = await chatService.getOrCreateSupportConversationForAdmin(adminId, targetUserId);
    await auditService.log({
      adminId,
      accion: "support_chat_opened",
      targetId: targetUserId,
      detalle: `Conversaci\xF3n de soporte ${conversation.id}`
    });
    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});
var admin_support_routes_default = router38;

// server/admin/routes/admin-config.routes.ts
init_auth();
import { Router as Router39 } from "express";
import { z as z21 } from "zod";
init_database_storage();
var router39 = Router39();
router39.use(authenticate, requireAdmin);
router39.get("/overview", requireAdminRole("admin_super"), async (_req, res, next) => {
  try {
    const [roles2, permisos3, modulos2] = await Promise.all([
      storage.getLisRol(),
      storage.getPermisos(),
      storage.getModulos()
    ]);
    const rolesWithPerms = await Promise.all(
      roles2.map(async (rol) => ({
        ...rol,
        permisos: await storage.getPermisosByRol(rol.id)
      }))
    );
    res.json({ success: true, data: { roles: rolesWithPerms, permisos: permisos3, modulos: modulos2 } });
  } catch (err) {
    next(err);
  }
});
router39.get("/roles/:id", requireAdminRole("admin_super"), async (req, res, next) => {
  try {
    const roleId = Number(req.params.id);
    const [rol, assignedCodes, permisos3] = await Promise.all([
      storage.getRol(roleId),
      storage.getPermisosByRol(roleId),
      storage.getPermisos()
    ]);
    res.json({
      success: true,
      data: {
        rol,
        assignedCodes,
        permisos: permisos3
      }
    });
  } catch (err) {
    next(err);
  }
});
router39.put("/roles/:id/permisos", requireAdminRole("admin_super"), async (req, res, next) => {
  try {
    const roleId = Number(req.params.id);
    const { permisoIds } = z21.object({ permisoIds: z21.array(z21.number().int().positive()) }).parse(req.body);
    await storage.permisos.assignPermisosToRol(roleId, permisoIds);
    const assignedCodes = await storage.getPermisosByRol(roleId);
    res.json({ success: true, data: { assignedCodes } });
  } catch (err) {
    next(err);
  }
});
var admin_config_routes_default = router39;

// server/admin/routes/index.ts
var router40 = Router40();
router40.use("/stats", admin_stats_routes_default);
router40.use("/users", admin_users_routes_default);
router40.use("/plans", admin_plans_routes_default);
router40.use("/billing", admin_billing_routes_default);
router40.use("/processes", admin_processes_routes_default);
router40.use("/community", admin_community_routes_default);
router40.use("/support", admin_support_routes_default);
router40.use("/config", admin_config_routes_default);
var routes_default = router40;

// server/routes/index.ts
function registerAppRoutes(app2) {
  app2.use("/", health_default);
  app2.use("/api", apiRateLimiter);
  app2.use("/api", auth_default);
  app2.use("/api", clientes_default);
  app2.use("/api", procesos_default);
  app2.use("/api", documentos_default);
  app2.use("/api", roles_default);
  app2.use("/api", notificaciones_default);
  app2.use("/api", firm_profile_default);
  app2.use("/api", lawyer_profile_default);
  app2.use("/api", tipos_documento_default);
  app2.use("/api", ubicacion_default);
  app2.use("/api", lawyer_firma_history_default);
  app2.use("/api", dashboard_default);
  app2.use("/api", firm_invitations_default);
  app2.use("/api", firm_roles_default);
  app2.use("/api", chat_default);
  app2.use("/api", tareas_default);
  app2.use("/api", community_default);
  app2.use("/api", ratings_default);
  app2.use("/api", client_requests_default);
  app2.use("/api", password_reset_default);
  app2.use("/api", firm_clients_default);
  app2.use("/api", calendar_default);
  app2.use("/api", stage_task_templates_default);
  app2.use("/api", stage_events_default);
  app2.use("/api", proceso_etapa_historial_default);
  app2.use("/api", proceso_ownership_default);
  app2.use("/api", firm_settings_default);
  app2.use("/api", suscripciones_default);
  app2.use("/api", webhooks_default);
  app2.use("/api", public_support_default);
  app2.use("/api/admin", routes_default);
}

// server/routes.ts
async function registerRoutes(app2) {
  app2.use(cookieParser());
  registerAppRoutes(app2);
  const httpServer = createServer(app2);
  setupWebSocketServer(httpServer);
  return httpServer;
}

// server/index.ts
init_database_storage();
import * as fs2 from "fs";
import * as path3 from "path";

// server/db/seeds/legal-stages.seed.ts
init_schema();
var ETAPAS_GENERICAS = [
  { codigo: "PREPROCESS", nombre: "Etapa preprocesal", descripcion: "Recopilaci\xF3n de pruebas y preparaci\xF3n de la demanda", orden: 1, diasLegales: 15, color: "#6B7280" },
  { codigo: "FILED", nombre: "Demanda presentada", descripcion: "Demanda radicada ante el juzgado", orden: 2, diasLegales: 5, color: "#3B82F6" },
  { codigo: "ADMITTED", nombre: "Demanda admitida", descripcion: "Juzgado admite la demanda y ordena notificaci\xF3n", orden: 3, diasLegales: 10, color: "#8B5CF6" },
  { codigo: "NOTIFIED", nombre: "Demandado notificado", descripcion: "Notificaci\xF3n personal o por aviso al demandado", orden: 4, diasLegales: 20, color: "#F59E0B" },
  { codigo: "ANSWERED", nombre: "Contestaci\xF3n", descripcion: "Demandado presenta contestaci\xF3n de la demanda", orden: 5, diasLegales: 20, color: "#EF4444" },
  { codigo: "EVIDENCE", nombre: "Etapa probatoria", descripcion: "Presentaci\xF3n y pr\xE1ctica de pruebas", orden: 6, diasLegales: 30, color: "#10B981" },
  { codigo: "HEARING", nombre: "Audiencias", descripcion: "Realizaci\xF3n de audiencias programadas", orden: 7, diasLegales: 10, color: "#F97316" },
  { codigo: "CLOSING_ARGUMENTS", nombre: "Alegatos finales", descripcion: "Presentaci\xF3n de alegatos de conclusi\xF3n", orden: 8, diasLegales: 10, color: "#6366F1" },
  { codigo: "JUDGMENT", nombre: "Sentencia", descripcion: "El juez dicta sentencia", orden: 9, diasLegales: 0, color: "#22C55E" },
  { codigo: "APPEAL", nombre: "Apelaci\xF3n", descripcion: "Recurso de apelaci\xF3n ante tribunal superior", orden: 10, diasLegales: 10, color: "#EC4899" },
  { codigo: "ENFORCEMENT", nombre: "Ejecuci\xF3n", descripcion: "Ejecuci\xF3n de la sentencia", orden: 11, diasLegales: 0, color: "#14B8A6" }
];
var ETAPAS_CIVIL = [
  { codigo: "PREPROCESS", nombre: "Etapa preprocesal", descripcion: "Negociaci\xF3n previa y recopilaci\xF3n de pruebas", orden: 1, diasLegales: 15, color: "#6B7280" },
  { codigo: "FILED", nombre: "Demanda presentada", descripcion: "Demanda civil radicada ante el juzgado competente", orden: 2, diasLegales: 5, color: "#3B82F6" },
  { codigo: "ADMITTED", nombre: "Demanda admitida", descripcion: "Auto admisorio de la demanda", orden: 3, diasLegales: 10, color: "#8B5CF6" },
  { codigo: "NOTIFIED", nombre: "Demandado notificado", descripcion: "Notificaci\xF3n personal al demandado", orden: 4, diasLegales: 20, color: "#F59E0B" },
  { codigo: "ANSWERED", nombre: "Contestaci\xF3n", descripcion: "Contestaci\xF3n de la demanda y excepciones", orden: 5, diasLegales: 20, color: "#EF4444" },
  { codigo: "EVIDENCE", nombre: "Etapa probatoria", descripcion: "Decreto y pr\xE1ctica de pruebas", orden: 6, diasLegales: 30, color: "#10B981" },
  { codigo: "HEARING", nombre: "Audiencia de juicio", descripcion: "Audiencia de instrucci\xF3n y juzgamiento", orden: 7, diasLegales: 10, color: "#F97316" },
  { codigo: "CLOSING_ARGUMENTS", nombre: "Alegatos", descripcion: "Alegatos de conclusi\xF3n", orden: 8, diasLegales: 10, color: "#6366F1" },
  { codigo: "JUDGMENT", nombre: "Sentencia", descripcion: "Sentencia de primera instancia", orden: 9, diasLegales: 0, color: "#22C55E" },
  { codigo: "APPEAL", nombre: "Apelaci\xF3n", descripcion: "Recurso de apelaci\xF3n", orden: 10, diasLegales: 10, color: "#EC4899" },
  { codigo: "ENFORCEMENT", nombre: "Ejecuci\xF3n", descripcion: "Proceso ejecutivo de la sentencia", orden: 11, diasLegales: 0, color: "#14B8A6" }
];
var ETAPAS_LABORAL = [
  { codigo: "PREPROCESS", nombre: "Conciliaci\xF3n previa", descripcion: "Conciliaci\xF3n obligatoria ante inspector de trabajo", orden: 1, diasLegales: 10, color: "#6B7280" },
  { codigo: "FILED", nombre: "Demanda laboral", descripcion: "Demanda laboral radicada ante el juez del trabajo", orden: 2, diasLegales: 5, color: "#3B82F6" },
  { codigo: "ADMITTED", nombre: "Auto admisorio", descripcion: "Juzgado admite y cita a audiencia de conciliaci\xF3n", orden: 3, diasLegales: 10, color: "#8B5CF6" },
  { codigo: "NOTIFIED", nombre: "Notificaci\xF3n", descripcion: "Notificaci\xF3n al demandado", orden: 4, diasLegales: 10, color: "#F59E0B" },
  { codigo: "ANSWERED", nombre: "Contestaci\xF3n", descripcion: "Contestaci\xF3n de la demanda laboral", orden: 5, diasLegales: 10, color: "#EF4444" },
  { codigo: "HEARING", nombre: "Audiencia \xFAnica", descripcion: "Audiencia de tr\xE1mite, juzgamiento y fallo", orden: 6, diasLegales: 30, color: "#F97316" },
  { codigo: "JUDGMENT", nombre: "Sentencia", descripcion: "Sentencia laboral", orden: 7, diasLegales: 0, color: "#22C55E" },
  { codigo: "APPEAL", nombre: "Apelaci\xF3n / Consulta", descripcion: "Recurso de apelaci\xF3n o consulta obligatoria", orden: 8, diasLegales: 10, color: "#EC4899" },
  { codigo: "ENFORCEMENT", nombre: "Ejecuci\xF3n", descripcion: "Ejecutoria de la sentencia laboral", orden: 9, diasLegales: 0, color: "#14B8A6" }
];
var ETAPAS_PENAL = [
  { codigo: "PREPROCESS", nombre: "Indagaci\xF3n", descripcion: "Fase de indagaci\xF3n e investigaci\xF3n preliminar", orden: 1, diasLegales: 90, color: "#6B7280" },
  { codigo: "FILED", nombre: "Formulaci\xF3n de cargos", descripcion: "Audiencia de formulaci\xF3n de imputaci\xF3n", orden: 2, diasLegales: 30, color: "#3B82F6" },
  { codigo: "ADMITTED", nombre: "Acusaci\xF3n", descripcion: "Escrito de acusaci\xF3n radicado", orden: 3, diasLegales: 30, color: "#8B5CF6" },
  { codigo: "EVIDENCE", nombre: "Preparatoria", descripcion: "Audiencia preparatoria \u2014 descubrimiento probatorio", orden: 4, diasLegales: 30, color: "#10B981" },
  { codigo: "HEARING", nombre: "Juicio oral", descripcion: "Audiencia de juicio oral y p\xFAblico", orden: 5, diasLegales: 60, color: "#F97316" },
  { codigo: "JUDGMENT", nombre: "Sentencia", descripcion: "Sentencia condenatoria o absolutoria", orden: 6, diasLegales: 0, color: "#22C55E" },
  { codigo: "APPEAL", nombre: "Apelaci\xF3n", descripcion: "Recurso de apelaci\xF3n o casaci\xF3n", orden: 7, diasLegales: 15, color: "#EC4899" },
  { codigo: "ENFORCEMENT", nombre: "Ejecuci\xF3n de penas", descripcion: "Cumplimiento de la pena impuesta", orden: 8, diasLegales: 0, color: "#14B8A6" }
];
async function seedLegalStages(db2) {
  const existing = await db2.select({ id: etapasPorTipoProceso.id }).from(etapasPorTipoProceso).limit(1);
  if (existing.length > 0) {
    return;
  }
  console.log("[seed] Sembrando etapas procesales...");
  await insertEtapas(db2, null, ETAPAS_GENERICAS);
  const { tiposProceso: tiposProceso2 } = await Promise.resolve().then(() => (init_tipo_proceso_schema(), tipo_proceso_schema_exports));
  const tipos = await db2.select({ id: tiposProceso2.id, nombre: tiposProceso2.nombre }).from(tiposProceso2);
  for (const tipo of tipos) {
    const nombreNorm = tipo.nombre?.toLowerCase() ?? "";
    if (nombreNorm.includes("civil")) {
      await insertEtapas(db2, tipo.id, ETAPAS_CIVIL);
    } else if (nombreNorm.includes("laboral")) {
      await insertEtapas(db2, tipo.id, ETAPAS_LABORAL);
    } else if (nombreNorm.includes("penal")) {
      await insertEtapas(db2, tipo.id, ETAPAS_PENAL);
    }
  }
  console.log("[seed] Etapas procesales sembradas correctamente.");
}
async function insertEtapas(db2, tipoProcesoId, etapas) {
  for (const e of etapas) {
    await db2.insert(etapasPorTipoProceso).values({
      tipoProcesoId,
      codigo: e.codigo,
      nombre: e.nombre,
      descripcion: e.descripcion,
      orden: e.orden,
      diasLegales: e.diasLegales,
      color: e.color,
      activo: 1
    });
  }
}

// server/db/seeds/stage-templates.seed.ts
init_schema();
import { eq as eq66, and as and46 } from "drizzle-orm";
var PLANTILLAS_DEFAULT = [
  { legalStageCode: "FILED", titulo: "Revisar escrito de demanda", prioridad: "alta", requerida: true, orden: 1 },
  { legalStageCode: "ADMITTED", titulo: "Notificar al cliente de admisi\xF3n", prioridad: "alta", requerida: true, orden: 1 },
  { legalStageCode: "NOTIFIED", titulo: "Confirmar notificaci\xF3n al demandado", prioridad: "alta", requerida: true, orden: 1 },
  { legalStageCode: "ANSWERED", titulo: "Analizar contestaci\xF3n de demanda", prioridad: "alta", requerida: true, orden: 1 },
  { legalStageCode: "EVIDENCE", titulo: "Recopilar pruebas documentales", prioridad: "alta", requerida: true, orden: 1 },
  { legalStageCode: "EVIDENCE", titulo: "Preparar lista de testigos", prioridad: "media", requerida: false, orden: 2 },
  { legalStageCode: "HEARING", titulo: "Confirmar fecha de audiencia", prioridad: "urgente", requerida: true, orden: 1 },
  { legalStageCode: "HEARING", titulo: "Preparar argumentos para audiencia", prioridad: "alta", requerida: false, orden: 2 },
  { legalStageCode: "CLOSING_ARGUMENTS", titulo: "Redactar alegatos finales", prioridad: "alta", requerida: true, orden: 1 },
  { legalStageCode: "JUDGMENT", titulo: "Notificar sentencia al cliente", prioridad: "urgente", requerida: true, orden: 1 }
];
async function seedStageTemplates(db2) {
  const existing = await db2.select({ id: etapasTareasPlantilla.id }).from(etapasTareasPlantilla).limit(1);
  if (existing.length > 0) {
    return;
  }
  console.log("[seed] Sembrando plantillas de tareas por etapa...");
  for (const plantilla of PLANTILLAS_DEFAULT) {
    const alreadyExists = await db2.select().from(etapasTareasPlantilla).where(
      and46(
        eq66(etapasTareasPlantilla.legalStageCode, plantilla.legalStageCode),
        eq66(etapasTareasPlantilla.titulo, plantilla.titulo)
      )
    ).limit(1);
    if (alreadyExists.length === 0) {
      await db2.insert(etapasTareasPlantilla).values({
        tipoProcesoId: null,
        legalStageCode: plantilla.legalStageCode,
        titulo: plantilla.titulo,
        prioridad: plantilla.prioridad,
        requerida: plantilla.requerida ? 1 : 0,
        orden: plantilla.orden,
        activo: 1
      });
    }
  }
  console.log("[seed] Plantillas de tareas sembradas correctamente.");
}

// server/db/seeds/planes.seed.ts
init_schema();
import { eq as eq67 } from "drizzle-orm";
var PLANES_SEED = [
  // Abogado independiente
  {
    id: "plan-abogado-gratis",
    nombre: "Gratis",
    tipo: "abogado",
    precioMensualCop: "0",
    precioAnualCop: "0",
    precioMensualUsd: "0",
    precioAnualUsd: "0",
    maxProcesos: 5,
    maxClientes: 10,
    maxStorageGb: 0.5,
    includedUsers: 1,
    maxUsers: 1,
    precioUsuarioExtraCop: null,
    precioUsuarioExtraUsd: null,
    features: []
  },
  {
    id: "plan-abogado-esencial",
    nombre: "Esencial",
    tipo: "abogado",
    precioMensualCop: "29900",
    precioAnualCop: "287040",
    precioMensualUsd: "7",
    precioAnualUsd: "70",
    maxProcesos: 20,
    maxClientes: 30,
    maxStorageGb: 2,
    includedUsers: 1,
    maxUsers: 1,
    precioUsuarioExtraCop: null,
    precioUsuarioExtraUsd: null,
    features: [
      { code: "calendario", value: "true" },
      { code: "etapas_procesales", value: "true" },
      { code: "privacidad_basica", value: "5" }
    ]
  },
  {
    id: "plan-abogado-pro",
    nombre: "Pro",
    tipo: "abogado",
    precioMensualCop: "84900",
    precioAnualCop: "815040",
    precioMensualUsd: "21",
    precioAnualUsd: "199",
    maxProcesos: -1,
    maxClientes: -1,
    maxStorageGb: 15,
    includedUsers: 1,
    maxUsers: 1,
    precioUsuarioExtraCop: null,
    precioUsuarioExtraUsd: null,
    features: [
      { code: "calendario", value: "true" },
      { code: "etapas_procesales", value: "true" },
      { code: "privacidad_basica", value: "true" },
      { code: "privacidad_avanzada", value: "true" },
      { code: "comunidad", value: "true" },
      { code: "chat", value: "true" }
    ]
  },
  // Bufete
  {
    id: "plan-bufete-gratis",
    nombre: "Gratis",
    tipo: "bufete",
    precioMensualCop: "0",
    precioAnualCop: "0",
    precioMensualUsd: "0",
    precioAnualUsd: "0",
    maxProcesos: 5,
    maxClientes: 10,
    maxStorageGb: 0.5,
    includedUsers: 3,
    maxUsers: 3,
    precioUsuarioExtraCop: null,
    precioUsuarioExtraUsd: null,
    features: []
  },
  {
    id: "plan-bufete-starter",
    nombre: "Starter",
    tipo: "bufete",
    precioMensualCop: "180000",
    precioAnualCop: "1728000",
    precioMensualUsd: "44",
    precioAnualUsd: "422",
    maxProcesos: 60,
    maxClientes: 60,
    maxStorageGb: 10,
    includedUsers: 3,
    maxUsers: 8,
    precioUsuarioExtraCop: "45000",
    precioUsuarioExtraUsd: "11",
    features: [
      { code: "calendario", value: "true" },
      { code: "etapas_procesales", value: "true" },
      { code: "dashboard_bufete", value: "true" },
      { code: "privacidad_basica", value: "true" },
      { code: "privacidad_avanzada", value: "true" }
    ]
  },
  {
    id: "plan-bufete-business",
    nombre: "Business",
    tipo: "bufete",
    precioMensualCop: "350000",
    precioAnualCop: "3360000",
    precioMensualUsd: "85",
    precioAnualUsd: "816",
    maxProcesos: 300,
    maxClientes: 300,
    maxStorageGb: 30,
    includedUsers: 8,
    maxUsers: 20,
    precioUsuarioExtraCop: "35000",
    precioUsuarioExtraUsd: "9",
    features: [
      { code: "calendario", value: "true" },
      { code: "etapas_procesales", value: "true" },
      { code: "dashboard_bufete", value: "true" },
      { code: "privacidad_basica", value: "true" },
      { code: "privacidad_avanzada", value: "true" },
      { code: "comunidad", value: "true" },
      { code: "chat", value: "true" },
      { code: "roles_custom", value: "true" }
    ]
  },
  {
    id: "plan-bufete-enterprise",
    nombre: "Enterprise",
    tipo: "bufete",
    precioMensualCop: "600000",
    precioAnualCop: "5760000",
    precioMensualUsd: "146",
    precioAnualUsd: "1402",
    maxProcesos: -1,
    maxClientes: -1,
    maxStorageGb: 100,
    includedUsers: 15,
    maxUsers: -1,
    precioUsuarioExtraCop: "28000",
    precioUsuarioExtraUsd: "7",
    features: [
      { code: "calendario", value: "true" },
      { code: "etapas_procesales", value: "true" },
      { code: "dashboard_bufete", value: "true" },
      { code: "privacidad_basica", value: "true" },
      { code: "privacidad_avanzada", value: "true" },
      { code: "comunidad", value: "true" },
      { code: "chat", value: "true" },
      { code: "roles_custom", value: "true" },
      { code: "soporte_prioritario", value: "true" }
    ]
  }
];
var FEATURES_SEED = [
  { code: "calendario", nombre: "Calendario", descripcion: "Gesti\xF3n de eventos, tareas y vencimientos en calendario" },
  { code: "etapas_procesales", nombre: "Etapas procesales", descripcion: "Seguimiento jur\xEDdico del proceso con etapas y vencimientos" },
  { code: "comunidad", nombre: "Comunidad", descripcion: "Acceso a la comunidad de abogados y matching con clientes" },
  { code: "chat", nombre: "Chat con cliente", descripcion: "Mensajer\xEDa directa con clientes desde la plataforma" },
  { code: "privacidad_basica", nombre: "Privacidad b\xE1sica", descripcion: "Marcar clientes como privados (hasta el l\xEDmite del plan)" },
  { code: "privacidad_avanzada", nombre: "Privacidad avanzada", descripcion: "Clientes y procesos privados ilimitados con historial" },
  { code: "dashboard_bufete", nombre: "Dashboard de bufete", descripcion: "Panel de control con m\xE9tricas agregadas del bufete" },
  { code: "roles_custom", nombre: "Roles personalizados", descripcion: "Crear y asignar roles personalizados a abogados del bufete" },
  { code: "soporte_prioritario", nombre: "Soporte prioritario", descripcion: "Acceso a soporte con tiempo de respuesta garantizado" }
];
var PLANES_LEGACY_IDS = ["default-plan-id"];
async function seedPlanes(db2) {
  for (const legacyId of PLANES_LEGACY_IDS) {
    await db2.update(planes).set({ state: false }).where(eq67(planes.id, legacyId)).catch(() => {
    });
  }
  for (const f of FEATURES_SEED) {
    const existing = await db2.select().from(features).where(eq67(features.code, f.code)).limit(1).then((r) => r[0]);
    if (!existing) {
      await db2.insert(features).values({ ...f, state: true });
    }
  }
  for (const p of PLANES_SEED) {
    const { features: planFeaturesList, ...planData } = p;
    const existing = await db2.select().from(planes).where(eq67(planes.id, p.id)).limit(1).then((r) => r[0]);
    if (!existing) {
      await db2.insert(planes).values({ ...planData, state: true });
    } else {
      await db2.update(planes).set({
        maxStorageGb: planData.maxStorageGb,
        state: true
      }).where(eq67(planes.id, p.id));
    }
    for (const pf of planFeaturesList) {
      const existingPf = await db2.select().from(planFeatures).where(eq67(planFeatures.planId, p.id)).then((rows) => rows.find((r) => r.featureCode === pf.code));
      if (!existingPf) {
        await db2.insert(planFeatures).values({ planId: p.id, featureCode: pf.code, value: pf.value });
      }
    }
  }
  console.log("[seed:planes] Planes y features sembrados correctamente.");
}

// server/db/seeds/admin-roles.seed.ts
init_schema();
import { eq as eq68 } from "drizzle-orm";
var ADMIN_ROLES2 = [
  { nombre: "admin_super", descripcion: "Acceso total al portal de administraci\xF3n" },
  { nombre: "admin_soporte", descripcion: "Gesti\xF3n de usuarios y tickets de soporte" },
  { nombre: "admin_finanzas", descripcion: "Gesti\xF3n de planes y facturaci\xF3n" }
];
async function seedAdminRoles(db2) {
  for (const rol of ADMIN_ROLES2) {
    const existing = await db2.select({ id: roles.id }).from(roles).where(eq68(roles.nombre, rol.nombre)).limit(1);
    if (existing.length === 0) {
      await db2.insert(roles).values({
        nombre: rol.nombre,
        descripcion: rol.descripcion,
        activo: true,
        firmId: null
      });
      console.log(`[seed] Rol creado: ${rol.nombre}`);
    } else {
      console.log(`[seed] Rol ya existe: ${rol.nombre}`);
    }
  }
}

// server/index.ts
var app = express();
app.use(cookieParser2());
var log2 = console.log;
async function seedDatabase() {
  const defaultPlanId = "default-plan-id";
  const defaultPlan = await storage.getPlan(defaultPlanId);
  if (!defaultPlan) {
    log2("No default plan found, creating one.");
    await storage.createPlan({
      id: defaultPlanId,
      nombre: "B\xE1sico",
      precio: "0.00",
      caracteristicas: "Plan b\xE1sico gratuito"
    });
  }
  const estados = await storage.getEstadosProceso();
  if (estados.length === 0) {
    log2("No estados found, creating default estados.");
    await storage.createEstado({ nombre: "Activo", codigo: "activo", color: "#22c55e" });
    await storage.createEstado({ nombre: "En Tramite", codigo: "en_tramite", color: "#f59e0b" });
    await storage.createEstado({ nombre: "Finalizado", codigo: "finalizado", color: "#3b82f6" });
    await storage.createEstado({ nombre: "Archivado", codigo: "archivado", color: "#9ca3af" });
  }
  await seedLegalStages(db);
  await seedStageTemplates(db);
  await seedPlanes(db);
  await seedAdminRoles(db);
}
function shouldRunStartupSeeds() {
  if (process.env.RUN_STARTUP_SEEDS === "true") {
    log2("[seed] RUN_STARTUP_SEEDS=true, executing startup seeds.");
    return true;
  }
  if (process.env.NODE_ENV === "production") {
    log2("[seed] Startup seeds are disabled in production. Run migrations/seeds explicitly.");
    return false;
  }
  return true;
}
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    if (process.env.CORS_ALLOWED_ORIGINS) {
      process.env.CORS_ALLOWED_ORIGINS.split(",").forEach((origin2) => {
        const normalized = origin2.trim();
        if (normalized) origins.add(normalized);
      });
    }
    const origin = req.header("origin");
    const isProduction2 = process.env.NODE_ENV === "production";
    const isLocalhost = !isProduction2 && (origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:"));
    if (origin && (origins.has(origin) || isLocalhost)) {
      const requestedHeaders = req.header("access-control-request-headers");
      const allowedHeaders = requestedHeaders ? requestedHeaders : "Content-Type, Authorization, x-device-id, x-device-name, x-device-platform";
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", allowedHeaders);
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      limit: "1mb",
      // JSON payloads should never be large; files go via multer/S3
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false, limit: "1mb" }));
  const upload3 = multer4({
    storage: multer4.memoryStorage(),
    // Store files in memory for S3 upload
    limits: {
      fileSize: 50 * 1024 * 1024
      // 50MB limit
    }
  });
  app2.set("upload", upload3);
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path4 = req.path;
    let capturedJsonResponse = void 0;
    const isSensitivePath = /^\/(api\/)?(login|register|refresh|logout|password)/.test(path4);
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      if (!isSensitivePath) capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path4.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log2(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path3.resolve(process.cwd(), "app.json");
    const appJsonContent = fs2.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path3.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs2.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs2.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path3.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs2.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log2("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path === "/landing") {
      return res.redirect(301, "/");
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path3.resolve(process.cwd(), "assets")));
  app2.use(express.static(path3.resolve(process.cwd(), "static-build")));
  log2("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const duplicateEntry = error.code === "ER_DUP_ENTRY";
    const status = error.status || error.statusCode || (duplicateEntry ? 409 : 500);
    const isProduction2 = process.env.NODE_ENV === "production";
    if (!isProduction2) {
      console.error("Error:", err);
    }
    if (res.headersSent) {
      return next(err);
    }
    const message = isProduction2 && status >= 500 ? "Error interno del servidor" : duplicateEntry ? "Ya existe un registro con uno de los datos \xFAnicos enviados." : error.message || "Internal Server Error";
    return res.status(status).json({ message });
  });
}
(async () => {
  if (shouldRunStartupSeeds()) {
    await seedDatabase();
  }
  const isProduction2 = process.env.NODE_ENV === "production";
  if (isProduction2) app.set("trust proxy", 1);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // needed for Expo assets
    // Prevent clickjacking
    frameguard: { action: "deny" },
    // Hide X-Powered-By: Express
    hidePoweredBy: true,
    // Force HTTPS in production
    hsts: isProduction2 ? { maxAge: 31536e3, includeSubDomains: true } : false,
    // Prevent MIME sniffing
    noSniff: true,
    // Block XSS in older browsers
    xssFilter: true,
    // CSP: restrictive but compatible with React Native Web / Expo
    contentSecurityPolicy: isProduction2 ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        // RN Web requires inline scripts
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    } : false
  }));
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  if (!isProduction2) {
    configureExpoAndLanding(app);
  } else {
    app.get("/", (_req, res) => {
      res.json({ status: "ok", app: "ProcesoClaro API" });
    });
  }
  const server = await registerRoutes(app);
  setupWebSocketServer(server);
  setInterval(async () => {
    try {
      const pendientes = await storage.calendar.getPendingReminders();
      for (const evento of pendientes) {
        await storage.appNotifications.createNotification(
          evento.lawyerId,
          "calendar_reminder",
          `Recordatorio: ${evento.titulo}`,
          `Tienes un evento programado para hoy: ${evento.titulo}`,
          { eventoId: evento.id, tipo: evento.tipo }
        );
        await storage.calendar.markNotificado(evento.id);
      }
    } catch (err) {
      console.error("[cron:calendar] Error al procesar recordatorios:", err);
    }
  }, 60 * 60 * 1e3);
  setInterval(async () => {
    try {
      const vencidas = await storage.suscripciones.getVencidas();
      for (const s of vencidas) {
        await storage.suscripciones.updateEstado(s.id, "vencida");
        await subscriptionService.activatePlanGratis(s.userId);
        await storage.appNotifications.createNotification(
          s.userId,
          "subscription_expired",
          "Tu suscripci\xF3n ha vencido",
          "Tu plan ha sido degradado al plan gratuito. Renueva para seguir usando todas las funcionalidades.",
          { suscripcionId: s.id }
        );
        console.log(`[cron:suscripciones] Suscripci\xF3n ${s.id} degradada a gratis`);
      }
      const proximasAVencer = await storage.suscripciones.getProximasAVencer(3);
      for (const s of proximasAVencer) {
        await storage.appNotifications.createNotification(
          s.userId,
          "subscription_expiring_soon",
          "Tu suscripci\xF3n vence pronto",
          `Tu plan vence el ${s.fechaVencimiento.toLocaleDateString("es-CO")}. Renueva para no perder el acceso.`,
          { suscripcionId: s.id }
        );
      }
    } catch (err) {
      console.error("[cron:suscripciones] Error:", err);
    }
  }, 24 * 60 * 60 * 1e3);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log2(`express server serving on port ${port}`);
    }
  );
})();
