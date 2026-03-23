-- Add case status tracking to posts
ALTER TABLE posts
  ADD COLUMN status              ENUM('open', 'in_progress', 'closed') NOT NULL DEFAULT 'open',
  ADD COLUMN taken_by_lawyer_id  VARCHAR(36) NULL,
  ADD COLUMN taken_at            TIMESTAMP   NULL,
  ADD INDEX  idx_posts_status (status);
