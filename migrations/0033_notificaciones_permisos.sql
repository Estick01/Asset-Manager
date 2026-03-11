-- Migration: Agregar permiso notificaciones.ver
-- Necesario para que abogados y bufetes puedan consultar y marcar notificaciones

-- 1. Insertar módulo notificaciones si no existe

INSERT INTO legacy.modulos 
(nombre, descripcion, icono, orden, activo, created_at, updated_at, state)
VALUES 
('notificaciones', 'Gestión de notificaciones', 'notifications-outline', 15, 1, NOW(), NOW(), 1)
ON DUPLICATE KEY UPDATE nombre = nombre;

INSERT INTO legacy.permisos 
(codigo, nombre, descripcion, activo, created_at, updated_at, modulo_id, state)
SELECT
  'notificaciones.ver',
  'Ver notificaciones',
  'Permite ver y marcar como leídas las notificaciones propias',
  1,
  NOW(),
  NOW(),
  m.id,
  1
FROM legacy.modulos m
WHERE m.nombre = 'notificaciones'
ON DUPLICATE KEY UPDATE codigo = codigo;

-- 3. Asignar permiso al rol ABOGADO
INSERT INTO legacy.roles_permisos (rol_id, permiso_id, created_at)
SELECT r.id, p.id, NOW()
FROM legacy.roles r
JOIN legacy.permisos p ON p.codigo = 'notificaciones.ver'
WHERE r.nombre = 'abogado';

-- 4. Asignar permiso al rol BUFETE
INSERT INTO legacy.roles_permisos (rol_id, permiso_id, created_at)
SELECT r.id, p.id, NOW()
FROM legacy.roles r
JOIN legacy.permisos p ON p.codigo = 'notificaciones.ver'
WHERE r.nombre = 'bufete';

