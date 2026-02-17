# LexTrack

## Overview

LexTrack is a legal case management SaaS application built for lawyers (abogados) in Latin America. It enables lawyers to manage their clients and legal cases/processes, track case updates and documents, and provide a client-facing portal where clients can log in to check the status of their cases. The app is designed with a multi-tenant architecture where each lawyer has their own isolated workspace with their own clients and cases.

The application is built as a React Native (Expo) mobile app with an Express.js backend server, targeting iOS, Android, and web platforms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture
- **Routing**: Expo Router v6 with file-based routing and typed routes
- **State Management**: React Query (@tanstack/react-query) for server state, React Context for auth state
- **UI**: Custom components using React Native primitives (no third-party UI library), with Inter font family from Google Fonts
- **Navigation Structure**:
  - `(tabs)/` — Main lawyer interface with 4 tabs: Dashboard (index), Clients, Cases, Settings
  - `(auth)/` — Login and registration screens for lawyers (modal presentation)
  - `client/` — Client detail and creation screens
  - `case/` — Case detail and creation screens
  - `update/` — New case update form (presented as a form sheet)
  - `portal/` — Separate client-facing portal with its own login, case list, and case detail views
- **Design Language**: Professional legal aesthetic with a navy/gold color palette defined in `constants/colors.ts`. Uses LinearGradient for headers, Ionicons for icons, and haptic feedback for interactions.

### Backend (Express.js)

- **Server**: Express v5 running on Node.js with TypeScript (compiled via tsx in dev, esbuild for production)
- **API Pattern**: RESTful API routes prefixed with `/api`, registered in `server/routes.ts`
- **CORS**: Dynamic CORS configuration supporting Replit domains and localhost for development
- **Storage**: Currently uses an in-memory storage implementation (`MemStorage` class in `server/storage.ts`) with an `IStorage` interface. This is designed to be swapped for a database-backed implementation.

### Data Storage

- **Current Client-Side Storage**: AsyncStorage (`@react-native-async-storage/async-storage`) is the primary data store right now. All data models (Abogado, Cliente, Proceso, Actualizacion, Documento) are defined in `lib/storage.ts` and stored locally on the device.
- **Database Schema (Prepared)**: Drizzle ORM is configured with PostgreSQL (`drizzle.config.ts`, `shared/schema.ts`). Currently only has a basic `users` table. The schema needs to be expanded to match the full data model.
- **Data Models**:
  - **Abogado** (Lawyer): id, nombre, correo, password, despacho, telefono, plan, activo, fechaRegistro
  - **Cliente** (Client): id, abogadoId, nombre, correo, telefono, documento, password, activo, fechaCreacion
  - **Proceso** (Case): id, abogadoId, clienteId, tipoProceso, radicado, juzgado, estadoActual, descripcionEstado, fechaCreacion
  - **Actualizacion** (Update): id, procesoId, fecha, titulo, descripcion, tipo, documentoId
  - **Documento** (Document): id, procesoId, nombre, tipo, tamaño, uri, fechaSubida

### Authentication

- **Lawyer Auth**: Email/password stored in AsyncStorage. Managed through `lib/auth-context.tsx` which provides login, register, logout, and profile update functions via React Context.
- **Client Portal Auth**: Separate authentication flow using documento (ID number) + password. Clients are created by lawyers with credentials. Has its own login/logout functions in `lib/storage.ts`.
- **Important**: Authentication is currently entirely client-side with no server-side session management or token-based auth. This needs to be migrated to server-side auth when the backend is fully implemented.

### Build & Deployment

- **Development**: Two processes run simultaneously — Expo dev server for the mobile app and tsx for the Express server
- **Production Build**: Custom build script (`scripts/build.js`) handles static web export. Server is bundled with esbuild.
- **Database Migrations**: `drizzle-kit push` command configured for schema synchronization

### Key Architectural Decisions

1. **Local-first with AsyncStorage**: Currently all data lives on the device. This was likely chosen for rapid prototyping. The Drizzle/PostgreSQL setup exists as the foundation for migrating to server-side storage.
2. **Multi-tenant by design**: All data models include `abogadoId` foreign keys to isolate lawyer data. The client portal uses `clienteId` to scope access.
3. **Dual auth systems**: Lawyers and clients have completely separate authentication flows and interfaces, reflecting different user roles.
4. **Spanish-language UI**: All user-facing text is in Spanish, targeting the Latin American legal market.

## External Dependencies

- **PostgreSQL**: Configured via `DATABASE_URL` environment variable, used with Drizzle ORM. Currently the schema is minimal and needs expansion.
- **Expo Services**: Standard Expo build and development infrastructure
- **Key npm packages**:
  - `drizzle-orm` + `drizzle-zod` — ORM and schema validation
  - `pg` — PostgreSQL client
  - `@tanstack/react-query` — Async state management
  - `expo-router` — File-based navigation
  - `expo-document-picker` — Document upload capability
  - `expo-haptics` — Tactile feedback
  - `expo-linear-gradient` — Visual styling
  - `http-proxy-middleware` — Development proxy configuration
  - `patch-package` — Applies patches to node_modules on install