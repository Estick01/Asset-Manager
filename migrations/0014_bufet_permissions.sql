-- =========================================
-- PERMISOS PARA ROL BUFETE (FIRMA JURÍDICA)
-- =========================================

-- 1. Agregar rol BUFETE si no existe
INSERT INTO `legacy`.`roles` (`nombre`, `descripcion`)
VALUES 
  ('bufete', 'Administrador de bufete/firma jurídica con acceso completo a todos los datos de la empresa')
ON DUPLICATE KEY UPDATE nombre = nombre;

-- =========================================
-- CREAR MÓDULOS NUEVOS PARA BUFETE
-- =========================================

-- 2. Insertar módulos para bufetes (si no existen)
INSERT INTO `legacy`.`modulos` (`nombre`, `descripcion`, `icono`, `orden`) VALUES
  ('equipo', 'Gestión de equipo de abogados', 'people', 10),
  ('firmas', 'Información de la firma', 'business', 11),
  ('planes', 'Gestión de planes de suscripción', 'card', 12),
  ('reportes', 'Reportes y estadísticas', 'stats-chart', 13),
  ('configuracionfirma', 'Configuración de la firma', 'settings-outline', 14)
ON DUPLICATE KEY UPDATE nombre = nombre;

SELECT id FROM legacy.modulos WHERE nombre = 'equipo';

-- =========================================
-- PERMISOS ESPECÍFICOS PARA BUFETE
-- Los bufetes tienen acceso total a todos los módulos
-- =========================================


INSERT INTO `legacy`.`permisos` (`codigo`, `nombre`, `descripcion`, `activo`, `created_at`, `updated_at`, `modulo_id`, `state`)
SELECT p.codigo, p.nombre, p.descripcion, 1, NOW(), NOW(), m.id, 1
FROM `legacy`.`modulos` m
JOIN (
    -- Permisos de Equipo
    SELECT 'equipo.ver'     AS codigo, 'Ver equipo'       AS nombre, 'Permite ver la lista de abogados del bufete' AS descripcion, 'equipo' AS modulo UNION ALL
    SELECT 'equipo.crear',             'Crear abogados',              'Permite invitar/crear nuevos abogados',                      'equipo' UNION ALL
    SELECT 'equipo.editar',            'Editar abogados',             'Permite editar datos de abogados',                           'equipo' UNION ALL
    SELECT 'equipo.eliminar',          'Eliminar abogados',           'Permite eliminar abogados del bufete',                       'equipo' UNION ALL

    -- Permisos de Firmas
    SELECT 'firmas.ver',               'Ver firmas',                  'Permite ver información de la firma',                        'firmas' UNION ALL
    SELECT 'firmas.editar',            'Editar firma',                'Permite editar información de la firma',                     'firmas' UNION ALL

    -- Permisos de Planes
    SELECT 'planes.ver',               'Ver planes',                  'Permite ver los planes disponibles',                         'planes' UNION ALL
    SELECT 'planes.editar',            'Editar plan',                 'Permite cambiar el plan de la firma',                        'planes' UNION ALL

    -- Permisos de Reportes
    SELECT 'reportes.ver',             'Ver reportes',                'Permite ver reportes de la firma',                           'reportes' UNION ALL
    SELECT 'reportes.exportar',        'Exportar reportes',           'Permite exportar reportes',                                  'reportes' UNION ALL

    -- Permisos de Configuración de Firma
    SELECT 'configuracionfirma.ver',   'Ver configuración de firma',  'Permite ver configuración de la firma',                      'configuracionfirma' UNION ALL
    SELECT 'configuracionfirma.editar','Editar configuración de firma','Permite editar configuración de la firma',                  'configuracionfirma'
) AS p ON m.nombre = p.modulo
ON DUPLICATE KEY UPDATE `legacy`.`permisos`.`id` = `legacy`.`permisos`.`id`;
-- =========================================
-- ASIGNAR TODOS LOS PERMISOS AL BUFETE
-- El bufete tiene acceso completo a todo
-- =========================================
INSERT IGNORE INTO `legacy`.`roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.id, p.id
FROM `legacy`.`roles` r
CROSS JOIN `legacy`.`permisos` p
WHERE r.nombre = 'bufete';

-- =========================================
-- AGREGAR PERMISOS DE EQUIPO A ROL ABOGADO
-- Los abogados también pueden ver el equipo (solo lectura)
-- =========================================
INSERT IGNORE INTO `legacy`.`roles_permisos` (`rol_id`, `permiso_id`)
SELECT r.id, p.id
FROM `legacy`.`roles` r
JOIN `legacy`.`permisos` p ON p.codigo = 'equipo.ver'
WHERE r.nombre = 'abogado';