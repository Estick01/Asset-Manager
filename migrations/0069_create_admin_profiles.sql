CREATE TABLE `admin_profiles` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `display_name` varchar(120) NOT NULL,
  `admin_type` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `admin_profiles_id` PRIMARY KEY(`id`),
  CONSTRAINT `admin_profiles_user_id_unique` UNIQUE(`user_id`),
  CONSTRAINT `admin_profiles_user_id_users_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE cascade
    ON UPDATE no action
);
