-- =============================================================
-- Migration: Community module (posts + comments)
-- Also extends conversations table with sourcePostId and
-- adds the "community" type to the conversations enum.
-- =============================================================

-- 1. Extend conversations.type enum to include "community"
ALTER TABLE conversations
  MODIFY COLUMN type ENUM('firm_lawyer', 'lawyer_client', 'community') NOT NULL;

-- 2. Add sourcePostId column to conversations (nullable FK to posts,
--    added after the posts table is created below)
ALTER TABLE conversations
  ADD COLUMN source_post_id VARCHAR(36) NULL;

-- 3. Posts table
CREATE TABLE IF NOT EXISTS posts (
  id             VARCHAR(36)   NOT NULL,
  user_id        VARCHAR(36)   NOT NULL,
  title          VARCHAR(255)  NOT NULL,
  content        TEXT          NOT NULL,
  visibility     ENUM('public', 'anonymous') NOT NULL DEFAULT 'public',
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_posts_user    (user_id),
  INDEX idx_posts_created (created_at),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Comments table
CREATE TABLE IF NOT EXISTS comments (
  id         VARCHAR(36) NOT NULL,
  post_id    VARCHAR(36) NOT NULL,
  user_id    VARCHAR(36) NOT NULL,
  content    TEXT        NOT NULL,
  parent_id  VARCHAR(36) NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_comments_post   (post_id),
  INDEX idx_comments_parent (parent_id),
  CONSTRAINT fk_comments_post   FOREIGN KEY (post_id)   REFERENCES posts(id)    ON DELETE CASCADE,
  CONSTRAINT fk_comments_user   FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 5. Now that posts exists, add the FK on conversations.source_post_id
ALTER TABLE conversations
  ADD INDEX idx_conversations_source_post (source_post_id),
  ADD CONSTRAINT fk_conversations_source_post
    FOREIGN KEY (source_post_id) REFERENCES posts(id) ON DELETE SET NULL;
