CREATE TABLE `permisos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(100) NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`descripcion` text,
	`modulo` varchar(50) NOT NULL,
	`activo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permisos_id` PRIMARY KEY(`id`),
	CONSTRAINT `permisos_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(50) NOT NULL,
	`descripcion` text,
	`activo` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_nombre_unique` UNIQUE(`nombre`)
);
--> statement-breakpoint
CREATE TABLE `roles_permisos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rol_id` int NOT NULL,
	`permiso_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_permisos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `abogados` ADD `rol_id` int;