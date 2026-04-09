# ProcesoClaro — Sistema de Gestión Jurídica

Plataforma LegalTech multiplataforma (iOS, Android, Web) que conecta bufetes de abogados, abogados independientes y clientes. Permite gestionar procesos legales, documentos, comunicaciones en tiempo real y comunidad jurídica.

---

## Tabla de contenidos

- [Stack tecnológico](#stack-tecnológico)
- [Requisitos previos](#requisitos-previos)
- [Instalación y configuración](#instalación-y-configuración)
- [Variables de entorno](#variables-de-entorno)
- [Comandos disponibles](#comandos-disponibles)
- [Arquitectura](#arquitectura)
- [Roles y permisos](#roles-y-permisos)
- [Módulos funcionales](#módulos-funcionales)
- [API — endpoints principales](#api--endpoints-principales)
- [Seguridad](#seguridad)
- [Base de datos y migraciones](#base-de-datos-y-migraciones)
- [WebSockets](#websockets)
- [Almacenamiento de archivos (AWS S3)](#almacenamiento-de-archivos-aws-s3)

---

## Stack tecnológico

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| Expo | 54.0 | Framework mobile/web |
| React Native | 0.81 | UI |
| React | 19.1 | UI |
| Expo Router | 6.0 | Enrutamiento basado en archivos |
| TanStack React Query | 5.83 | Estado del servidor |
| Victory Native | 41.20 | Gráficos y estadísticas |
| Sonner Native | 0.23 | Notificaciones toast |
| Expo Linear Gradient | — | Gradientes UI |
| Expo Blur | — | Efectos blur (iOS) |
| Expo SecureStore | — | Almacenamiento seguro local |

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js + TypeScript | 5.9 | Runtime + tipos |
| Express | 5.0 | Servidor HTTP |
| Drizzle ORM | 0.39 | ORM + query builder |
| MySQL 2 | — | Driver de base de datos |
| jsonwebtoken | 9.0 | JWT auth |
| bcryptjs | 3.0 | Hash de contraseñas |
| ws | 8.18 | WebSockets (chat) |
| nodemailer | 8.0 | Envío de emails |
| ioredis | 5.10 | Cliente Redis |
| helmet | 8.1 | Headers HTTP de seguridad |
| multer | 2.0 | Upload de archivos |
| Zod | 3.24 | Validación de esquemas |

### Infraestructura
| Servicio | Uso |
|---|---|
| MySQL | Base de datos principal |
| Redis | Rate limiting y caché (opcional en dev) |
| AWS S3 | Almacenamiento de documentos |
| Gmail SMTP | Envío de emails (OTP, notificaciones) |

---

## Requisitos previos

- Node.js 20+
- MySQL 8+
- Redis (opcional en desarrollo, obligatorio en producción)
- Cuenta AWS con bucket S3 configurado
- Cuenta Gmail con App Password activada (para SMTP)
- Expo CLI (`npm install -g expo-cli`)

---

## Instalación y configuración

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd Asset-Manager

# 2. Instalar dependencias
npm install

# 3. Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Crear la base de datos MySQL
mysql -u root -p -e "CREATE DATABASE legacy;"

# 5. Ejecutar migraciones
npm run db:migrate

# 6. Iniciar backend (puerto 5000)
npm run server:dev

# 7. Iniciar frontend Expo (nueva terminal)
npm run expo:dev
```

Para correr en dispositivo físico, actualizar `LOCAL_IP` y `EXPO_PUBLIC_LOCAL_IP` en `.env` con la IP de tu máquina en la red local.

---

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# ── Base de datos ──────────────────────────────────────────────────────────────
DATABASE_URL=mysql://usuario:contraseña@localhost:3306/legacy

# ── Seguridad JWT ──────────────────────────────────────────────────────────────
JWT_SECRET="clave-secreta-segura-cambiar-en-produccion"
BCRYPT_SALT_ROUNDS=12

# ── Redis (rate limiting) ──────────────────────────────────────────────────────
# Dejar vacío para usar fallback en memoria (solo dev, un servidor)
REDIS_URL=redis://localhost:6379

# ── Email (SMTP Gmail) ─────────────────────────────────────────────────────────
# Requiere una App Password de Google (no la contraseña normal)
# Activar en: https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx
SMTP_FROM="ProcesoClaro <soporte@procesoclaro.co>"
# URL pública de la app para links en correos de notificaciones
APP_URL=https://procesoclaro.co

# ── AWS S3 (documentos) ────────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_REGION=us-east-2
AWS_BUCKET_NAME=procesoclaro-documentos-prod

# ── Servidor ───────────────────────────────────────────────────────────────────
PORT=5000
LOCAL_IP=192.168.1.X          # IP de tu máquina en la red local
EXPO_PUBLIC_LOCAL_IP=192.168.1.X
# Frontend Expo: variable pública consumida por la app en producción
EXPO_PUBLIC_API_URL=https://api.procesoclaro.co
# Compatibilidad para procesos Node / scripts
PRODUCTION_API_URL=https://api.procesoclaro.co
# Orígenes permitidos para CORS en producción
CORS_ALLOWED_ORIGINS=https://procesoclaro.co,https://www.procesoclaro.co
# Mantener en false en producción; ejecutar seeds manualmente
RUN_STARTUP_SEEDS=false

# ── reCAPTCHA v3 (opcional) ────────────────────────────────────────────────────
# Si se configura, se valida en cada intento de login
# RECAPTCHA_SECRET_KEY=tu-secret-key-de-google
# RECAPTCHA_MIN_SCORE=0.5
```

`APP_URL` se usa para construir enlaces directos dentro de los correos de notificaciones. Si no se configura, el sistema seguirá enviando el correo, pero sin botón de acceso al detalle.

### Wompi — Pasarela de pagos

| Variable | Requerida | Descripción | Cómo obtenerla |
|---|---|---|---|
| `WOMPI_BASE_URL` | Sí | URL base de la API | Sandbox: `https://sandbox.wompi.co/v1` / Prod: `https://production.wompi.co/v1` |
| `WOMPI_PRIVATE_KEY` | Sí | Llave privada | Panel Wompi → Desarrolladores → Llaves |
| `WOMPI_EVENTS_SECRET` | Sí | Secret para verificar webhooks | Panel Wompi → Desarrolladores → Webhooks → Integrity secret |
| `WOMPI_REDIRECT_URL` | Sí | URL de retorno post-pago | Dev: `exp://localhost:8081/--/checkout/result` · Prod: `https://procesoclaro.co/checkout/result` |

> **Nota:** Para Gmail, se debe usar una **App Password** (no la contraseña de la cuenta). Activar en Google Account → Seguridad → Verificación en dos pasos → Contraseñas de aplicación.

---

## Comandos disponibles

```bash
# ── Desarrollo ─────────────────────────────────────────────────────────────────
npm run expo:dev          # Inicia Expo (frontend) con hot reload
npm run server:dev        # Inicia Express (backend) con hot reload en puerto 5000

# ── Producción ─────────────────────────────────────────────────────────────────
npm run server:build      # Compila backend con esbuild → dist/
npm run server:prod       # Ejecuta el build compilado
npm run expo:static:build # Build estático de Expo (web)
# Si necesitas poblar datos base manualmente:
RUN_STARTUP_SEEDS=true npm run server:dev

# ── Base de datos ──────────────────────────────────────────────────────────────
npm run db:push           # Sincroniza el schema Drizzle con la BD (dev)
npm run db:migrate        # Ejecuta migraciones SQL pendientes

# ── Calidad de código ──────────────────────────────────────────────────────────
npm run lint              # Verifica con ESLint
npm run lint:fix          # Corrige automáticamente con ESLint
```

---

## Arquitectura

```
procesoclaro/
├── app/                        # Frontend (Expo Router)
│   ├── (auth)/                 # Login, registro, recuperar contraseña
│   ├── (firm-tabs)/            # Panel bufete (tabs: Bufete, Procesos, Clientes, Chat, Comunidad)
│   ├── (lawyer-tabs)/          # Panel abogado (mismos tabs)
│   ├── portal/                 # Portal cliente (casos, chat, notificaciones)
│   ├── community/              # Foro legal (posts, comentarios, perfil)
│   ├── firm-components/        # Pantallas específicas del bufete (ajustes, equipo, roles, etc.)
│   ├── lawyer-componts/        # Pantallas específicas del abogado
│   ├── chat/[id].tsx           # Vista de conversación individual
│   ├── case/                   # Detalle de proceso legal
│   ├── profile/                # Perfil de usuario (abogado/firma)
│   └── _layout.tsx             # Root layout con autenticación unificada
│
├── server/                     # Backend (Express)
│   ├── routes/                 # Endpoints HTTP (22 módulos)
│   ├── services/               # Lógica de negocio
│   ├── middleware/             # Rate limiting, validación, errores
│   ├── storage/                # Capa de acceso a datos (Drizzle)
│   ├── websocket/              # Servidor WebSocket (chat tiempo real)
│   ├── lib/                    # Utilidades (Redis client)
│   └── auth.ts                 # Configuración JWT, cookies, bcrypt
│
├── shared/                     # Código compartido frontend/backend
│   └── schema/                 # Esquemas Drizzle + Zod (tablas y validaciones)
│
├── lib/                        # Servicios y contextos del frontend
│   ├── auth-context.tsx        # Contexto de autenticación unificado
│   ├── services/               # Llamadas a la API
│   └── *-context.tsx           # Contextos: chat, invitaciones, notificaciones
│
├── components/                 # Componentes React Native reutilizables
├── migrations/                 # 44 archivos SQL de migraciones
└── constants/                  # Colores, configuraciones globales
```

---

## Roles y permisos

### Roles del sistema

| Rol | Descripción | Panel |
|---|---|---|
| `bufete` | Administrador de firma legal | `/(firm-tabs)` |
| `abogado` | Abogado (independiente o en firma) | `/(lawyer-tabs)` |
| `cliente` | Cliente final (persona natural o empresa) | `/portal` |
| `admin` | Administrador del sistema | — |

### Roles personalizados por bufete

Cada bufete puede crear roles propios (ej: "Socio", "Abogado Senior", "Pasante") con permisos granulares. Estos conviven con el rol global `abogado`.

### Sistema de permisos

Los permisos están organizados por módulo:

```
procesos.ver      procesos.crear    procesos.editar    procesos.eliminar
clientes.ver      clientes.crear    clientes.editar    clientes.eliminar
chat.enviar       chat.ver
documentos.ver    documentos.subir  documentos.eliminar
tareas.ver        tareas.crear      tareas.editar
```

La asignación sigue este flujo:
```
Bufete crea rol personalizado
    → Asigna permisos al rol
        → Asigna el rol a un abogado de la firma
            → El JWT del abogado incluye firmRolId
                → El cliente verifica permisos antes de mostrar tabs/acciones
```

---

## Módulos funcionales

### Autenticación
- Login y registro para abogados, bufetes y clientes
- Tokens JWT (2 horas) + refresh tokens (30 días)
- Cookies HttpOnly para web, token en body para mobile
- Redirección automática según rol tras login

### Recuperación de contraseña (OTP)
1. El usuario solicita reset → se envía código de 6 dígitos por email
2. El código expira en 5 minutos con máximo 3 intentos
3. Al verificar el OTP → se genera un JWT de reset (15 minutos)
4. Con el token de reset → se actualiza la contraseña y se revocan todas las sesiones activas

### Procesos legales
- CRUD completo de casos (radicado, tipo, estado, municipio, juzgado)
- Múltiples responsables por proceso
- Actualizaciones con historial de cambios
- Documentos adjuntos vía S3
- Tareas asociadas con estados y prioridades

### Chat en tiempo real
- Conversaciones entre bufete↔abogado, abogado↔cliente
- Mensajes de texto y archivos adjuntos
- Indicador de último mensaje leído
- Notificaciones de mensajes no leídos en tiempo real via WebSocket

### Comunidad jurídica
- Foro de posts públicos o anónimos
- Comentarios anidados
- Likes, bookmarks y contador de vistas
- Etiquetas (tags) por área jurídica
- Ratings y reseñas de abogados

### Gestión de equipo (bufetes)
- Invitar abogados por email
- Asignar roles personalizados con permisos específicos
- Ver historial de relación abogado-firma

### Notificaciones
- Notificaciones in-app persistidas en base de datos
- Toast notifications en tiempo real (sonner-native)
- Tipos: invitaciones, actualizaciones de proceso, mensajes nuevos

---

## API — endpoints principales

Base URL: `http://localhost:5000/api`

### Autenticación
```
POST   /api/login                          Iniciar sesión
POST   /api/register/lawyer                Registrar abogado
POST   /api/register/firm                  Registrar bufete
POST   /api/auth/refresh                   Renovar access token
POST   /api/auth/logout                    Cerrar sesión
PUT    /api/auth/change-password           Cambiar contraseña (autenticado)
POST   /api/auth/request-password-reset    Solicitar OTP de reset
POST   /api/auth/verify-otp               Verificar OTP → obtener reset token
POST   /api/auth/reset-password            Establecer nueva contraseña
```

### Perfiles
```
GET    /api/lawyer-profile                 Perfil del abogado autenticado
PUT    /api/lawyer-profile                 Actualizar perfil del abogado
GET    /api/firm-profile                   Perfil del bufete autenticado
PUT    /api/firm-profile                   Actualizar perfil del bufete
```

### Procesos
```
GET    /api/procesos                       Listar procesos (paginado, filtros)
POST   /api/procesos                       Crear proceso
GET    /api/procesos/:id                   Detalle del proceso
PUT    /api/procesos/:id                   Actualizar proceso
DELETE /api/procesos/:id                   Eliminar proceso
```

### Clientes
```
GET    /api/clientes                       Listar clientes
POST   /api/clientes                       Crear cliente
GET    /api/clientes/:id                   Detalle del cliente
PUT    /api/clientes/:id                   Actualizar cliente
```

### Chat
```
GET    /api/conversations                  Listar conversaciones
POST   /api/conversations                  Crear conversación
GET    /api/conversations/:id/messages     Mensajes de una conversación
POST   /api/conversations/:id/messages     Enviar mensaje
```

### Comunidad
```
GET    /api/community/posts                Listar posts (sort, tag, search)
POST   /api/community/posts                Crear post
GET    /api/community/posts/:id            Detalle + comentarios
POST   /api/community/posts/:id/comments  Comentar
POST   /api/community/posts/:id/like      Toggle like
POST   /api/community/posts/:id/bookmark  Toggle bookmark
GET    /api/community/tags                 Listado de tags
```

### Roles del bufete
```
GET    /api/firm/roles                     Roles del bufete
POST   /api/firm/roles                     Crear rol personalizado
GET    /api/firm/roles/:rolId/permisos     Permisos de un rol
PUT    /api/firm/roles/:rolId/permisos     Actualizar permisos de un rol
PUT    /api/firm/lawyers/:lawyerId/firm-role  Asignar rol a abogado
```

### Invitaciones
```
POST   /api/firm/invite                    Invitar abogado por email
GET    /api/firm/invitations               Invitaciones enviadas
GET    /api/lawyer/invitations             Invitaciones recibidas
POST   /api/lawyer/invitations/:id/accept  Aceptar invitación
POST   /api/lawyer/invitations/:id/reject  Rechazar invitación
```

### Documentos
```
POST   /api/documentos/upload              Subir documento a S3
GET    /api/documentos/:id/url             URL pre-firmada de descarga
DELETE /api/documentos/:id                 Eliminar documento
```

---

## Seguridad

### Autenticación y sesiones
- **JWT** firmado con `JWT_SECRET`, expira en 2 horas
- **Refresh token** opaco (64 bytes random hex), expira en 30 días, rotación en cada uso
- **Cookies HttpOnly + Secure + SameSite=Strict** en web; token también en body para mobile
- Sesiones persistidas en base de datos — se pueden revocar individualmente o todas a la vez

### Contraseñas
- Hash **bcrypt** con 12 salt rounds
- Nunca se almacena ni transmite la contraseña en texto plano

### Rate limiting en login
El sistema combina dos dimensiones para bloquear ataques de fuerza bruta:

| Nivel | Clave | Umbral | Bloqueo |
|---|---|---|---|
| Combo | IP + email | 5 intentos fallidos | 15 minutos |
| Usuario global | email (cualquier IP) | 10 intentos fallidos | 1 hora |
| Usuario global | email (cualquier IP) | 20 intentos fallidos | 24 horas |

- Los contadores se almacenan en **Redis** (con fallback en memoria para desarrollo)
- Compatible con múltiples instancias del servidor
- **Detección de IP sospechosa**: si una IP intenta más de 10 emails distintos en 1 hora, se bloquea

### Audit trail de seguridad
Cada intento de login se registra en la tabla `security_events`:

| Campo | Descripción |
|---|---|
| `email` | Email intentado |
| `ip` | Dirección IP del cliente |
| `user_agent` | Navegador/dispositivo |
| `event_type` | `login_success`, `login_fail`, `login_blocked`, `suspicious_ip` |
| `success` | Si el intento fue exitoso |
| `created_at` | Timestamp |

### reCAPTCHA v3 (opcional)
Si se configura `RECAPTCHA_SECRET_KEY` en `.env`, el endpoint de login valida el token de reCAPTCHA antes de procesar las credenciales. Score mínimo configurable con `RECAPTCHA_MIN_SCORE` (default: 0.5).

Para activarlo en el cliente, agregar `recaptchaToken` al body del POST `/api/login`.

### Mensajes de error genéricos
Los errores de login siempre devuelven `"Credenciales inválidas"` — nunca se indica si el email existe o no en el sistema.

### Otras medidas
- **Helmet.js**: headers HTTP de seguridad (`X-Frame-Options`, `X-Content-Type-Options`, CSP)
- **Prepared statements** vía Drizzle ORM (protección contra SQL injection)
- **Validación de entrada** con Zod en todos los endpoints
- **CORS** con lista de orígenes permitidos
- **URLs pre-firmadas de S3**: los documentos no son accesibles públicamente, solo mediante URLs temporales

---

## Base de datos y migraciones

### Ejecutar migraciones

```bash
npm run db:migrate
```

### Historial de migraciones

| Migración | Descripción |
|---|---|
| `0000_wide_hellion.sql` | Tablas base: usuarios, abogados, clientes, procesos, documentos |
| `0002_permissions.sql` | Sistema de permisos y módulos |
| `0004_tipos_proceso.sql` | Tipos de procesos legales |
| `0010_lame_umar.sql` | Planes de suscripción |
| `0011_notificaciones.sql` | Notificaciones in-app |
| `0029_create_sessions.sql` | Sesiones HTTP persistidas |
| `0030_add_refresh_token.sql` | Refresh tokens en sesiones |
| `0031_create_tareas.sql` | Gestión de tareas |
| `0035_personas_clientes_refactor.sql` | Refactor modelo personas/clientes |
| `0036_chat_file_attachments.sql` | Archivos adjuntos en chat |
| `0037_firm_roles.sql` | Roles personalizados por bufete |
| `0038_community.sql` | Foro: posts, comentarios, likes, bookmarks |
| `0039_ratings.sql` | Ratings y reseñas de abogados |
| `0040_client_requests.sql` | Solicitudes de servicios |
| `0041_community_enhancements.sql` | Mejoras al foro |
| `0042_post_views.sql` | Contador de vistas en posts |
| `0043_password_reset_otp.sql` | OTP para recuperación de contraseña |
| `0044_security_audit.sql` | Audit trail de eventos de seguridad |

### Drizzle ORM — operaciones comunes

```bash
# Sincronizar schema directamente con la BD (solo dev, sin migraciones)
npm run db:push

# Generar nuevas migraciones a partir de cambios en el schema
npx drizzle-kit generate

# Ver el schema en UI interactiva
npx drizzle-kit studio
```

> **Nota:** Drizzle ORM con MySQL no soporta `.returning()`. Después de un `INSERT` o `UPDATE` es necesario hacer un `SELECT` adicional para obtener el registro resultante.

---

## WebSockets

El servidor WebSocket corre en el mismo puerto que Express (puerto 5000) mediante upgrade HTTP.

### Eventos del cliente → servidor

| Evento | Payload | Descripción |
|---|---|---|
| `join` | `{ conversationId }` | Unirse a una conversación |
| `message` | `{ conversationId, content, type }` | Enviar mensaje |
| `typing` | `{ conversationId, isTyping }` | Indicador de escritura |

### Eventos del servidor → cliente

| Evento | Payload | Descripción |
|---|---|---|
| `new_message` | `MessageDTO` | Nuevo mensaje en conversación |
| `typing` | `{ userId, conversationId, isTyping }` | Alguien está escribiendo |
| `error` | `{ message }` | Error de conexión/autorización |

### Rate limiting WebSocket
- Máximo 5 mensajes por segundo por usuario
- Bloqueo temporal de 2 segundos al exceder el límite

---

## Almacenamiento de archivos (AWS S3)

Los documentos se almacenan en S3 con las siguientes características:

- **Bucket**: configurado en `AWS_BUCKET_NAME`
- **Región**: configurada en `AWS_REGION`
- **Acceso**: Los archivos NO son públicos. Se generan URLs pre-firmadas con expiración para descargar
- **Upload**: El cliente hace `POST /api/documentos/upload` → el servidor sube a S3 y guarda la referencia en MySQL
- **Tipos soportados**: PDF, imágenes, documentos Office

---

## Notas de desarrollo

### Fallback Redis
Si `REDIS_URL` no está configurado, el sistema usa un store en memoria para el rate limiting. **Solo funciona para una instancia del servidor.** En producción con múltiples instancias, Redis es obligatorio.

### Tipado del campo `storeage`
El directorio de storage tiene un typo intencional heredado (`storeage` en lugar de `storage`). No renombrar para evitar romper imports existentes.

### Permisos en el frontend
El hook `useAuth()` expone `hasPermission(codigo)` que verifica si el usuario actual tiene el permiso indicado. Úsalo para mostrar/ocultar tabs y acciones:

```tsx
const { hasPermission } = useAuth();

// En un layout de tabs:
href: hasPermission("procesos.ver") ? undefined : null
```

### Roles de bufete en JWT
Cuando un abogado pertenece a un bufete con rol personalizado, su JWT incluye `firmRolId`. El servidor usa `firmRolId ?? role.id` para resolver los permisos efectivos.
