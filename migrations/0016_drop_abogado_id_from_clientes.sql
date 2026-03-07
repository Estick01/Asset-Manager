-- Drop column lawyer_id from clientes table
-- Now using lawyer_clients table for relationships
ALTER TABLE `clientes` DROP COLUMN IF EXISTS `abogado_id`;
