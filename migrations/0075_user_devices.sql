CREATE TABLE IF NOT EXISTS `user_devices` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `device_id` varchar(191) NOT NULL,
  `device_name` varchar(120) NULL,
  `platform` varchar(30) NULL,
  `user_agent` varchar(500) NULL,
  `last_ip` varchar(45) NULL,
  `first_seen_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `trusted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `user_devices_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `user_devices_user_device_unique` UNIQUE (`user_id`, `device_id`),
  CONSTRAINT `user_devices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX `user_devices_user_last_seen_idx` ON `user_devices` (`user_id`, `last_seen_at`);

ALTER TABLE `sessions`
  ADD COLUMN `device_id` varchar(191) NULL AFTER `user_agent`;
