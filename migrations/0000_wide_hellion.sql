CREATE TABLE `abogados` (
	`id` varchar(36) NOT NULL,
	`nombre` text NOT NULL,
	`correo` text NOT NULL,
	`password` text NOT NULL,
	`despacho` text NOT NULL,
	`telefono` text NOT NULL,
	`plan_id` varchar(36) NOT NULL,
	`activo` boolean NOT NULL DEFAULT true,
	`fecha_registro` timestamp NOT NULL DEFAULT now(),
	CONSTRAINT `abogados_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `actualizaciones` (
	`id` varchar(36) NOT NULL,
	`proceso_id` varchar(36) NOT NULL,
	`fecha` timestamp NOT NULL DEFAULT now(),
	`titulo` text NOT NULL,
	`descripcion` text NOT NULL,
	`tipo_id` int NOT NULL,
	`documento_id` varchar(36),
	CONSTRAINT `actualizaciones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` varchar(36) NOT NULL,
	`abogado_id` varchar(36) NOT NULL,
	`nombre` text NOT NULL,
	`correo` text NOT NULL,
	`telefono` text NOT NULL,
	`documento` text NOT NULL,
	`password` text NOT NULL,
	`activo` boolean NOT NULL DEFAULT true,
	`fecha_creacion` timestamp NOT NULL DEFAULT now(),
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentos` (
	`id` varchar(36) NOT NULL,
	`proceso_id` varchar(36) NOT NULL,
	`nombre` text NOT NULL,
	`uri` text NOT NULL,
	`tipo` text NOT NULL,
	`tamano` int NOT NULL,
	`fecha_subida` timestamp NOT NULL DEFAULT now(),
	CONSTRAINT `documentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `estados_proceso` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(50) NOT NULL,
	CONSTRAINT `estados_proceso_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planes` (
	`id` varchar(36) NOT NULL,
	`nombre` varchar(50) NOT NULL,
	`precio` decimal(10,2) NOT NULL,
	`caracteristicas` text NOT NULL,
	CONSTRAINT `planes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procesos` (
	`id` varchar(36) NOT NULL,
	`abogado_id` varchar(36) NOT NULL,
	`cliente_id` varchar(36) NOT NULL,
	`tipo_proceso` text NOT NULL,
	`radicado` text NOT NULL,
	`juzgado` text NOT NULL,
	`estado_id` int NOT NULL,
	`descripcion_estado` text NOT NULL,
	`fecha_creacion` timestamp NOT NULL DEFAULT now(),
	CONSTRAINT `procesos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tipos_actualizacion` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(50) NOT NULL,
	CONSTRAINT `tipos_actualizacion_id` PRIMARY KEY(`id`)
);
