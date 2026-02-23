-- =========================================
-- TABLA DE ROLES
-- =========================================
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text,
  `activo` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_nombre_unique` (`nombre`)
);

-- =========================================
-- TABLA DE PERMISOS
-- =========================================
CREATE TABLE IF NOT EXISTS `permisos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(100) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `modulo` varchar(50) NOT NULL,
  `activo` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permisos_codigo_unique` (`codigo`)
);

-- =========================================
-- TABLA ROLES-PERMISOS (RELACIÓN N:M)
-- =========================================
CREATE TABLE IF NOT EXISTS `roles_permisos` (
  `rol_id` int NOT NULL,
  `permiso_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`rol_id`, `permiso_id`),
  CONSTRAINT `fk_roles_permisos_rol`
    FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_roles_permisos_permiso`
    FOREIGN KEY (`permiso_id`) REFERENCES `permisos`(`id`)
    ON DELETE CASCADE
);

-- =========================================
-- AGREGAR ROL A ABOGADOS
-- =========================================
ALTER TABLE `abogados`
ADD COLUMN IF NOT EXISTS `rol_id` int NULL;

ALTER TABLE `abogados`
ADD CONSTRAINT `fk_abogados_rol`
FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`)
ON DELETE SET NULL;

-- =========================================
-- INSERTAR ROLES POR DEFECTO
-- =========================================
INSERT INTO `roles` (`nombre`, `descripcion`)
VALUES 
  ('admin', 'Administrador con acceso total'),
  ('abogado', 'Abogado con acceso estándar a sus propios datos')
ON DUPLICATE KEY UPDATE nombre = nombre;

-- =========================================
-- INSERTAR PERMISOS POR DEFECTO
-- =========================================
INSERT INTO `permisos` (`codigo`, `nombre`, `descripcion`, `modulo`)
VALUES
  -- Clientes
  ('clientes.ver', 'Ver clientes', 'Permite ver la lista de clientes', 'clientes'),
  ('clientes.crear', 'Crear clientes', 'Permite crear nuevos clientes', 'clientes'),
  ('clientes.editar', 'Editar clientes', 'Permite editar datos de clientes', 'clientes'),
  ('clientes.eliminar', 'Eliminar clientes', 'Permite eliminar clientes', 'clientes'),

  -- Procesos
  ('procesos.ver', 'Ver procesos', 'Permite ver la lista de procesos', 'procesos'),
  ('procesos.crear', 'Crear procesos', 'Permite crear nuevos procesos', 'procesos'),
  ('procesos.editar', 'Editar procesos', 'Permite editar datos de procesos', 'procesos'),
  ('procesos.eliminar', 'Eliminar procesos', 'Permite eliminar procesos', 'procesos'),

  -- Actualizaciones
  ('actualizaciones.ver', 'Ver actualizaciones', 'Permite ver actualizaciones de procesos', 'actualizaciones'),
  ('actualizaciones.crear', 'Crear actualizaciones', 'Permite crear actualizaciones', 'actualizaciones'),
  ('actualizaciones.eliminar', 'Eliminar actualizaciones', 'Permite eliminar actualizaciones', 'actualizaciones'),

  -- Documentos
  ('documentos.ver', 'Ver documentos', 'Permite ver documentos', 'documentos'),
  ('documentos.subir', 'Subir documentos', 'Permite subir documentos', 'documentos'),
  ('documentos.eliminar', 'Eliminar documentos', 'Permite eliminar documentos', 'documentos'),

  -- Configuración
  ('configuracion.ver', 'Ver configuración', 'Permite ver la configuración', 'configuracion'),
  ('configuracion.editar', 'Editar configuración', 'Permite editar la configuración', 'configuracion'),

  -- Usuarios
  ('usuarios.ver', 'Ver usuarios', 'Permite ver la lista de usuarios', 'usuarios'),
  ('usuarios.crear', 'Crear usuarios', 'Permite crear nuevos usuarios', 'usuarios'),
  ('usuarios.editar', 'Editar usuarios', 'Permite editar usuarios', 'usuarios'),
  ('usuarios.eliminar', 'Eliminar usuarios', 'Permite eliminar usuarios', 'usuarios'),

  -- Dashboard
  ('dashboard.ver', 'Ver dashboard', 'Permite ver el dashboard', 'dashboard'),

  -- Perfil
  ('perfil.ver', 'Ver perfil', 'Permite ver el perfil propio', 'perfil'),
  ('perfil.editar', 'Editar perfil', 'Permite editar el perfil propio', 'perfil')

ON DUPLICATE KEY UPDATE codigo = codigo;

-- =========================================
-- ASIGNAR TODOS LOS PERMISOS AL ADMIN
-- =========================================
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.id, p.id
FROM `roles` r
CROSS JOIN `permisos` p
WHERE r.nombre = 'admin';

-- Add usuarios permissions to admin if not already assigned
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permisos` p ON p.codigo LIKE 'usuarios.%'
WHERE r.nombre = 'admin';

-- =========================================
-- ASIGNAR PERMISOS ESTÁNDAR AL ABOGADO
-- =========================================
INSERT IGNORE INTO `roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.id, p.id
FROM `roles` r
JOIN `permisos` p ON p.codigo IN (
  'clientes.ver', 'clientes.crear', 'clientes.editar', 'clientes.eliminar',
  'procesos.ver', 'procesos.crear', 'procesos.editar', 'procesos.eliminar',
  'actualizaciones.ver', 'actualizaciones.crear', 'actualizaciones.eliminar',
  'documentos.ver', 'documentos.subir', 'documentos.eliminar',
  'dashboard.ver',
  'perfil.ver', 'perfil.editar'
)
WHERE r.nombre = 'abogado';

-- =========================================
-- ASIGNAR ROL ABOGADO A LOS QUE NO TIENEN
-- =========================================
UPDATE `abogados`
SET `rol_id` = (SELECT id FROM `roles` WHERE nombre = 'abogado' LIMIT 1)
WHERE `rol_id` IS NULL;
