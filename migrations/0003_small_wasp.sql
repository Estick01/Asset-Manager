CREATE TABLE `modulos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(50) NOT NULL,
	`descripcion` text,
	`icono` varchar(50),
	`orden` int DEFAULT 0,
	`activo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modulos_id` PRIMARY KEY(`id`),
	CONSTRAINT `modulos_nombre_unique` UNIQUE(`nombre`)
);
--> statement-breakpoint
ALTER TABLE `permisos` ADD `modulo_id` int;--> statement-breakpoint
ALTER TABLE `permisos` DROP COLUMN `modulo`;