-- Chat file attachments: make content nullable, add file metadata columns
ALTER TABLE `messages` MODIFY COLUMN `content` text NULL;
ALTER TABLE `messages` ADD COLUMN `file_key`  varchar(500) NULL;
ALTER TABLE `messages` ADD COLUMN `file_name` varchar(255) NULL;
ALTER TABLE `messages` ADD COLUMN `file_size` int          NULL;
ALTER TABLE `messages` ADD COLUMN `file_mime` varchar(100) NULL;
ALTER TABLE `messages` ADD COLUMN `file_hash` varchar(64)  NULL;

-- Index for efficient paginated history queries
CREATE INDEX `idx_messages_conversation_created`
  ON `messages` (`conversation_id`, `created_at`);
