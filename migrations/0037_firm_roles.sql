-- Migration: 0037_firm_roles
-- Adds support for firm-specific custom roles (RBAC override model)
--
-- Changes:
--   1. roles.firm_id       → NULL = sistema global, valor = rol personalizado del bufete
--   2. roles.nombre        → unique constraint removed (nombres pueden repetirse entre firmas)
--   3. lawyer_firma_history.firm_rol_id → rol asignado por el bufete (override del rol global)

-- 1. Add firm_id to roles
ALTER TABLE `roles`
  ADD COLUMN `firm_id` VARCHAR(36) NULL DEFAULT NULL AFTER `activo`;

-- 2. Drop the global unique constraint on nombre (roles de distintas firmas pueden tener el mismo nombre)
--    First we re-create the index as a composite unique (nombre + firm_id) so names stay unique per firm.
ALTER TABLE `roles`
  DROP INDEX `roles_nombre_unique`;

-- Composite unique: mismo nombre no puede repetirse dentro de la misma firma (NULL = sistema)
-- MySQL trata NULLs como distintos en UNIQUE, así que múltiples roles globales no colisionan entre sí,
-- pero eso nunca ocurrirá en la práctica (los roles globales son un conjunto fijo).
ALTER TABLE `roles`
  ADD UNIQUE INDEX `roles_nombre_firm_unique` (`nombre`, `firm_id`);

-- 3. Add firm_rol_id to lawyer_firma_history
ALTER TABLE `lawyer_firma_history`
  ADD COLUMN `firm_rol_id` INT NULL DEFAULT NULL AFTER `estado`,
  ADD CONSTRAINT `fk_lawyer_firma_history_firm_rol`
    FOREIGN KEY (`firm_rol_id`) REFERENCES `roles` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
