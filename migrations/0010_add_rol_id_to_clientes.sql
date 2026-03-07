-- Add rol_id column to clientes table
ALTER TABLE `clientes` ADD `rol_id` int NOT NULL DEFAULT 3;

-- Add foreign key constraint
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_rol_id_fkey` FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`);

-- Insert cliente role if it doesn't exist (assuming id 3 based on existing roles)
INSERT INTO `roles` (`nombre`, `descripcion`)
VALUES ('cliente', 'Cliente del abogado con acceso limitado a sus propios datos')
ON DUPLICATE KEY UPDATE nombre = nombre;