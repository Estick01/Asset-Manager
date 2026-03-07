CREATE TABLE `client_profiles` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`lawyer_id` varchar(36),
	`firm_id` varchar(36),
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`document_type` varchar(20) NOT NULL DEFAULT 'CC',
	`document_number` varchar(50) NOT NULL,
	`phone` varchar(50),
	`address` text,
	`created_at` timestamp NOT NULL DEFAULT now(),
	`updated_at` timestamp NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_profiles_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `firm_profiles` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nit` varchar(50) NOT NULL,
	`address` text,
	`phone` varchar(50),
	`plan_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT now(),
	`updated_at` timestamp NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `firm_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `firm_profiles_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `lawyer_profiles` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`firm_id` varchar(36),
	`is_independent` boolean NOT NULL DEFAULT true,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`license_number` varchar(50) NOT NULL,
	`specialty` varchar(100),
	`phone` varchar(50),
	`address` text,
	`created_at` timestamp NOT NULL DEFAULT now(),
	`updated_at` timestamp NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lawyer_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `lawyer_profiles_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `notificaciones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`proceso_id` varchar(255) NOT NULL,
	`cliente_id` varchar(255) NOT NULL,
	`abogado_id` varchar(255) NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`mensaje` text NOT NULL,
	`tipo` varchar(50) NOT NULL DEFAULT 'estado_cambio',
	`leido_cliente` boolean NOT NULL DEFAULT false,
	`leido_abogado` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificaciones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` text NOT NULL,
	`role` varchar(20) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT now(),
	`updated_at` timestamp NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `abogados` ADD `state` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `actualizaciones` ADD `state` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `clientes` ADD `state` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `documentos` ADD `state` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `modulos` ADD `state` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `permisos` ADD `state` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `planes` ADD `state` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `procesos` ADD `state` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `roles` ADD `state` boolean DEFAULT true NOT NULL;