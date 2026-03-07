-- Migración para arquitectura SaaS multi-tenant
-- Tablas: users, firm_profiles, lawyer_profiles, client_profiles

-- 1. Tabla base de usuarios
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(36) PRIMARY KEY NOT NULL,
  `email` varchar(255) NOT NULL UNIQUE,
  `password` text NOT NULL,
  `role` varchar(20) NOT NULL COMMENT '''LAWYER'' | ''FIRM'' | ''CLIENT''',
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  INDEX `users_email_idx` (`email`),
  INDEX `users_role_idx` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Perfiles de bufete (FIRM)
CREATE TABLE IF NOT EXISTS `firm_profiles` (
  `id` varchar(36) PRIMARY KEY NOT NULL,
  `user_id` varchar(36) NOT NULL UNIQUE,
  `name` varchar(255) NOT NULL,
  `nit` varchar(50) NOT NULL,
  `address` text,
  `phone` varchar(50),
  `plan_id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  INDEX `firm_profiles_user_id_idx` (`user_id`),
  INDEX `firm_profiles_plan_id_idx` (`plan_id`),
  CONSTRAINT `firm_profiles_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `firm_profiles_plan_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `planes` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Perfiles de abogado (LAWYER)
CREATE TABLE IF NOT EXISTS `lawyer_profiles` (
  `id` varchar(36) PRIMARY KEY NOT NULL,
  `user_id` varchar(36) NOT NULL UNIQUE,
  `firm_id` varchar(36),
  `is_independent` boolean NOT NULL DEFAULT true,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `license_number` varchar(50) NOT NULL,
  `specialty` varchar(100),
  `phone` varchar(50),
  `address` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  INDEX `lawyer_profiles_user_id_idx` (`user_id`),
  INDEX `lawyer_profiles_firm_id_idx` (`firm_id`),
  CONSTRAINT `lawyer_profiles_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lawyer_profiles_firm_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firm_profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Perfiles de cliente (CLIENT)
CREATE TABLE IF NOT EXISTS `client_profiles` (
  `id` varchar(36) PRIMARY KEY NOT NULL,
  `user_id` varchar(36) NOT NULL UNIQUE,
  `lawyer_id` varchar(36),
  `firm_id` varchar(36),
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `document_type` varchar(20) NOT NULL DEFAULT 'CC',
  `document_number` varchar(50) NOT NULL,
  `phone` varchar(50),
  `address` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  INDEX `client_profiles_user_id_idx` (`user_id`),
  INDEX `client_profiles_lawyer_id_idx` (`lawyer_id`),
  INDEX `client_profiles_firm_id_idx` (`firm_id`),
  CONSTRAINT `client_profiles_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_profiles_lawyer_id_fk` FOREIGN KEY (`lawyer_id`) REFERENCES `lawyer_profiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `client_profiles_firm_id_fk` FOREIGN KEY (`firm_id`) REFERENCES `firm_profiles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
