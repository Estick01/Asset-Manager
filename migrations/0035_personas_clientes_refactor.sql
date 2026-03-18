-- ============================================================
-- Migration 0035: Personas + Clientes refactor
-- - Crea tabla personas (base para cliente natural, abogado, representante legal)
-- - Crea tabla representantes_legales
-- - Crea tabla clientes_natural (1:1 con clientes)
-- - Crea tabla clientes_empresa (1:1 con clientes)
-- - Migra datos existentes de clientes -> personas + clientes_natural
-- - Limpia columnas viejas de clientes
-- - Agrega personaId a lawyer_profiles
-- - Agrega representante_legal_id a firm_profiles
-- ============================================================

-- ------------------------------------------------------------
-- 1. Crear tabla personas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `personas` (
  `id`                VARCHAR(36)  NOT NULL,
  `nombre`            VARCHAR(100) NOT NULL,
  `apellido`          VARCHAR(100) NOT NULL,
  `telefono`          VARCHAR(50)  NOT NULL,
  `documento`         VARCHAR(50)  NOT NULL,
  `tipo_documento_id` INT          NOT NULL,
  `direccion`         TEXT,
  `departamento_id`   VARCHAR(36),
  `municipio_id`      VARCHAR(36),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_personas_tipo_doc`    FOREIGN KEY (`tipo_documento_id`) REFERENCES `tipos_documento`(`id`),
  CONSTRAINT `fk_personas_depto`       FOREIGN KEY (`departamento_id`)   REFERENCES `departamentos`(`id`),
  CONSTRAINT `fk_personas_municipio`   FOREIGN KEY (`municipio_id`)      REFERENCES `municipios`(`id`)
);

-- ------------------------------------------------------------
-- 2. Crear tabla representantes_legales
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `representantes_legales` (
  `id`         VARCHAR(36)  NOT NULL,
  `persona_id` VARCHAR(36)  NOT NULL,
  `cargo`      VARCHAR(100) NOT NULL,
  `email`      VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_rep_legal_persona` FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`)
);

-- ------------------------------------------------------------
-- 3. Crear tabla clientes_natural (1:1)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `clientes_natural` (
  `cliente_id` VARCHAR(36) NOT NULL,
  `persona_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`cliente_id`),
  UNIQUE KEY `uq_clientes_natural_persona` (`persona_id`),
  CONSTRAINT `fk_cn_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cn_persona` FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`)
);

-- ------------------------------------------------------------
-- 4. Crear tabla clientes_empresa (1:1)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `clientes_empresa` (
  `cliente_id`              VARCHAR(36)  NOT NULL,
  `razon_social`            VARCHAR(255) NOT NULL,
  `nit`                     VARCHAR(50)  NOT NULL,
  `sector`                  VARCHAR(100),
  `representante_legal_id`  VARCHAR(36),
  PRIMARY KEY (`cliente_id`),
  CONSTRAINT `fk_ce_cliente`  FOREIGN KEY (`cliente_id`)             REFERENCES `clientes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ce_rep_legal` FOREIGN KEY (`representante_legal_id`) REFERENCES `representantes_legales`(`id`)
);

-- ------------------------------------------------------------
-- 5. Agregar columna tipo a clientes
-- ------------------------------------------------------------
ALTER TABLE `clientes`
  ADD COLUMN `tipo` ENUM('natural','empresa') NOT NULL DEFAULT 'natural' AFTER `user_id`;

-- ------------------------------------------------------------
-- 6. Migrar datos existentes: clientes -> personas + clientes_natural
--    Todos los clientes actuales son personas naturales
-- ------------------------------------------------------------
INSERT INTO `personas` (
  `id`, `nombre`, `apellido`, `telefono`, `documento`,
  `tipo_documento_id`, `direccion`, `departamento_id`, `municipio_id`
)
SELECT
  UUID(),
  c.`nombre`,
  c.`apellido`,
  c.`telefono`,
  c.`documento`,
  c.`tipo_documento_id`,
  c.`direccion`,
  c.`departamento_id`,
  c.`municipio_id`
FROM `clientes` c;

-- Insertar en clientes_natural enlazando por documento (campo unico efectivo)
INSERT INTO `clientes_natural` (`cliente_id`, `persona_id`)
SELECT c.`id`, p.`id`
FROM `clientes` c
JOIN `personas` p
  ON p.`nombre`    = c.`nombre`
  AND p.`apellido` = c.`apellido`
  AND p.`documento`= c.`documento`;

-- ------------------------------------------------------------
-- 7. Eliminar columnas viejas de clientes
-- ------------------------------------------------------------
ALTER TABLE `clientes`
  DROP COLUMN `nombre`,
  DROP COLUMN `apellido`,
  DROP COLUMN `telefono`,
  DROP COLUMN `documento`,
  DROP COLUMN `tipo_documento_id`,
  DROP COLUMN `direccion`,
  DROP COLUMN `departamento_id`,
  DROP COLUMN `municipio_id`;

-- ------------------------------------------------------------
-- 8. Migrar lawyer_profiles: crear personas para abogados
--    y agregar columna persona_id
-- ------------------------------------------------------------
ALTER TABLE `lawyer_profiles`
  ADD COLUMN `persona_id` VARCHAR(36) UNIQUE AFTER `user_id`;

-- Insertar persona por cada abogado
INSERT INTO `personas` (`id`, `nombre`, `apellido`, `telefono`, `documento`, `tipo_documento_id`, `direccion`)
SELECT
  UUID(),
  lp.`first_name`,
  lp.`last_name`,
  COALESCE(lp.`phone`, ''),
  '',   -- documento vacío: deberá completarse posteriormente
  1,    -- tipo_documento_id default (CC); ajustar según datos reales
  lp.`address`
FROM `lawyer_profiles` lp;

-- Enlazar lawyer_profiles con la persona recién creada
UPDATE `lawyer_profiles` lp
JOIN `personas` p
  ON p.`nombre`    = lp.`first_name`
  AND p.`apellido` = lp.`last_name`
SET lp.`persona_id` = p.`id`
WHERE lp.`persona_id` IS NULL;

-- Hacer persona_id NOT NULL ahora que está poblado
ALTER TABLE `lawyer_profiles`
  MODIFY COLUMN `persona_id` VARCHAR(36) NOT NULL,
  DROP COLUMN `first_name`,
  DROP COLUMN `last_name`,
  DROP COLUMN `phone`,
  DROP COLUMN `address`;

-- ------------------------------------------------------------
-- 9. Agregar representante_legal_id a firm_profiles
-- ------------------------------------------------------------
ALTER TABLE `firm_profiles`
  ADD COLUMN `representante_legal_id` VARCHAR(36) AFTER `plan_id`,
  ADD CONSTRAINT `fk_firm_rep_legal`
    FOREIGN KEY (`representante_legal_id`) REFERENCES `representantes_legales`(`id`);

-- ------------------------------------------------------------
-- 10. Índices de rendimiento
-- ------------------------------------------------------------
CREATE INDEX `idx_personas_documento`           ON `personas`(`documento`);
CREATE INDEX `idx_rep_legal_persona`            ON `representantes_legales`(`persona_id`);
CREATE INDEX `idx_clientes_tipo`                ON `clientes`(`tipo`);
