CREATE TABLE IF NOT EXISTS `user_two_factor` (
  `user_id` varchar(36) NOT NULL,
  `secret` varchar(128) NOT NULL,
  `recovery_codes` text NULL,
  `enabled_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `user_two_factor_user_id_pk` PRIMARY KEY (`user_id`),
  CONSTRAINT `user_two_factor_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `auth_challenges` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `challenge_type` varchar(30) NOT NULL,
  `device_id` varchar(191) NULL,
  `ip_address` varchar(45) NULL,
  `user_agent` varchar(500) NULL,
  `expires_at` timestamp NOT NULL,
  `completed_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `auth_challenges_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `auth_challenges_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX `auth_challenges_user_type_idx` ON `auth_challenges` (`user_id`, `challenge_type`);
