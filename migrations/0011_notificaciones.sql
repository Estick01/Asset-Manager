-- =========================================
-- TABLA DE NOTIFICACIONES
-- =========================================
CREATE TABLE IF NOT EXISTS `notificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proceso_id` varchar(255) NOT NULL,
  `cliente_id` varchar(255) NOT NULL,
  `abogado_id` varchar(255) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensaje` text NOT NULL,
  `tipo` varchar(50) NOT NULL DEFAULT 'estado_cambio',
  `leido_cliente` boolean NOT NULL DEFAULT false,
  `leido_abogado` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notificaciones_proceso` (`proceso_id`),
  KEY `idx_notificaciones_cliente` (`cliente_id`),
  KEY `idx_notificaciones_abogado` (`abogado_id`)
);

-- Agregar foreign keys
ALTER TABLE `notificaciones`
ADD CONSTRAINT `fk_notificaciones_proceso`
FOREIGN KEY (`proceso_id`) REFERENCES `procesos`(`id`) ON DELETE CASCADE;

ALTER TABLE `notificaciones`
ADD CONSTRAINT `fk_notificaciones_cliente`
FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON DELETE CASCADE;

ALTER TABLE `notificaciones`
ADD CONSTRAINT `fk_notificaciones_abogado`
FOREIGN KEY (`abogado_id`) REFERENCES `abogados`(`id`) ON DELETE CASCADE;
