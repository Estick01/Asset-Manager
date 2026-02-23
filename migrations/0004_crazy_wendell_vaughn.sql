CREATE TABLE `tipos_proceso` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`descripcion` text,
	`activo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tipos_proceso_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `procesos` MODIFY COLUMN `tipo_proceso` text;--> statement-breakpoint
ALTER TABLE `procesos` ADD `tipo_proceso_id` int;