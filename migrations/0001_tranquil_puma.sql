ALTER TABLE `estados_proceso` ADD `codigo` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `estados_proceso` ADD `color` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `estados_proceso` ADD `state` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `estados_proceso` ADD `created_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `estados_proceso` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `estados_proceso` ADD CONSTRAINT `estados_proceso_codigo_unique` UNIQUE(`codigo`);