CREATE TABLE `public_support_requests` (
  `id` varchar(36) NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(180) NOT NULL,
  `message` text NOT NULL,
  `source` enum('landing','login') NOT NULL,
  `status` enum('new','in_progress','resolved','spam') NOT NULL DEFAULT 'new',
  `user_id` varchar(36) DEFAULT NULL,
  `assigned_admin_id` varchar(36) DEFAULT NULL,
  `conversation_id` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_public_support_requests_status_created_at` (`status`, `created_at`),
  KEY `idx_public_support_requests_email` (`email`),
  KEY `idx_public_support_requests_assigned_admin` (`assigned_admin_id`)
);
