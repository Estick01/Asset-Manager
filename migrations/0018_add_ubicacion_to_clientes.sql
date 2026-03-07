-- Add departamento and municipio to clientes table
ALTER TABLE `clientes` ADD COLUMN `departamento_id` varchar(36) NULL;
ALTER TABLE `clientes` ADD COLUMN `municipio_id` varchar(36) NULL;

-- Add indexes for queries
CREATE INDEX `idx_clientes_departamento` ON clientes(`departamento_id`);
CREATE INDEX `idx_clientes_municipio` ON clientes(`municipio_id`);
