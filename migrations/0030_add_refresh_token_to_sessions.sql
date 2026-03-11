-- Add refresh token support to sessions table
ALTER TABLE `sessions`
  ADD COLUMN `refresh_token`      VARCHAR(64)  NULL UNIQUE AFTER `user_agent`,
  ADD COLUMN `refresh_expires_at` TIMESTAMP    NULL        AFTER `refresh_token`,
  ADD INDEX  `idx_sessions_refresh_token` (`refresh_token`);
