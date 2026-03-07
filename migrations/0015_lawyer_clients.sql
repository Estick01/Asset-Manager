-- Create lawyer_clients table
-- Intermediate table for managing lawyer-client relationships

CREATE TABLE IF NOT EXISTS `lawyer_clients` (
  `id` varchar(36) NOT NULL PRIMARY KEY,
  `lawyer_id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `status` enum('active', 'inactive', 'terminated') NOT NULL DEFAULT 'active',
  `relationship_started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `relationship_ended_at` timestamp NULL,
  `created_by` varchar(36) NULL,
  `notes` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `lawyer_clients_lawyer_id` (`lawyer_id`),
  INDEX `lawyer_clients_client_id` (`client_id`),
  INDEX `lawyer_clients_status` (`status`)
);

-- Drop columns from clientes table that were removed from schema
-- Note: These columns should have been removed already or need to be removed manually
-- ALTER TABLE `clientes` DROP COLUMN IF EXISTS `state`;
-- ALTER TABLE `clientes` DROP COLUMN IF EXISTS `correo`;
-- ALTER TABLE `clientes` DROP COLUMN IF EXISTS `rol_id`;
