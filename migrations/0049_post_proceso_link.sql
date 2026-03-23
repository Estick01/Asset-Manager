-- Bidirectional link: posts ↔ procesos
-- A community post can originate a proceso (legal case)
-- A proceso records which post it came from

ALTER TABLE posts
  ADD COLUMN proceso_id VARCHAR(36) NULL,
  ADD INDEX idx_posts_proceso (proceso_id);

ALTER TABLE procesos
  ADD COLUMN community_post_id VARCHAR(36) NULL,
  ADD INDEX idx_procesos_post (community_post_id);
