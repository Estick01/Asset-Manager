-- Create sessions table for JWT token revocation and session management
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`          VARCHAR(36)  NOT NULL,          -- JTI (JWT ID) - primary key
  `user_id`     VARCHAR(36)  NOT NULL,
  `expires_at`  TIMESTAMP    NOT NULL,
  `revoked_at`  TIMESTAMP    NULL DEFAULT NULL,
  `ip_address`  VARCHAR(45)  NULL DEFAULT NULL,
  `user_agent`  VARCHAR(500) NULL DEFAULT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sessions_user_id`   (`user_id`),
  INDEX `idx_sessions_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
