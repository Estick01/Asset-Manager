-- =============================================================
-- Migration 0046: Community post → lawyer matching
-- Table: community_post_matches
-- =============================================================

CREATE TABLE IF NOT EXISTS community_post_matches (
  id          VARCHAR(36)  NOT NULL,
  post_id     VARCHAR(36)  NOT NULL,
  lawyer_id   VARCHAR(36)  NOT NULL,        -- references lawyer_profiles.id
  score       TINYINT      NOT NULL DEFAULT 0,  -- 1-10 relevance score
  notified    TINYINT(1)   NOT NULL DEFAULT 0,  -- 1 = WebSocket/push sent
  seen        TINYINT(1)   NOT NULL DEFAULT 0,  -- 1 = lawyer opened post
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE  KEY uq_post_lawyer (post_id, lawyer_id),
  INDEX idx_match_lawyer (lawyer_id),
  INDEX idx_match_post   (post_id),
  INDEX idx_match_score  (score, created_at),
  CONSTRAINT fk_match_post   FOREIGN KEY (post_id)   REFERENCES posts(id)            ON DELETE CASCADE,
  CONSTRAINT fk_match_lawyer FOREIGN KEY (lawyer_id) REFERENCES lawyer_profiles(id)  ON DELETE CASCADE
);
