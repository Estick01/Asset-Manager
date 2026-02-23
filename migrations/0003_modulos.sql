-- =========================================
-- TABLA DE MÓDULOS (Nueva tabla para organizar permisos)
-- =========================================
CREATE TABLE IF NOT EXISTS `modulos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text,
  `icono` varchar(50),
  `orden` int DEFAULT 0,
  `activo` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `modulos_nombre_unique` (`nombre`)
);

-- Insertar módulos base
INSERT INTO `modulos` (`nombre`, `descripcion`, `icono`, `orden`) VALUES
  ('admin', 'Administración del sistema', 'settings', 1),
  ('configuracion', 'Configuración del sistema', 'settings-outline', 2),
  ('usuarios', 'Gestión de usuarios', 'people', 3),
  ('clientes', 'Gestión de clientes', 'person', 4),
  ('procesos', 'Gestión de procesos', 'briefcase', 5),
  ('documentos', 'Gestión de documentos', 'document', 6),
  ('actualizaciones', 'Gestión de actualizaciones', 'refresh', 7),
  ('dashboard', 'Panel de control', 'grid', 8),
  ('perfil', 'Perfil de usuario', 'person-outline', 9)
ON DUPLICATE KEY UPDATE nombre = nombre;

-- =========================================
-- AGREGAR FK A PERMISOS (nullable para compatibilidad)
-- =========================================
ALTER TABLE `permisos`
ADD COLUMN IF NOT EXISTS `modulo_id` int NULL;

ALTER TABLE `permisos`
ADD CONSTRAINT `fk_permisos_modulo`
FOREIGN KEY (`modulo_id`) REFERENCES `modulos`(`id`)
ON DELETE SET NULL;

-- Actualizar permisos existentes con el módulo correcto
UPDATE `permisos` p SET modulo_id = (
  SELECT m.id FROM `modulos` m WHERE m.nombre = p.modulo
) WHERE p.modulo IS NOT NULL;
