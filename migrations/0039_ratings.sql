-- ============================================================
-- Ratings table
-- Clients can rate lawyers and firms after a completed proceso
-- ============================================================

CREATE TABLE ratings (
  id              VARCHAR(36)   NOT NULL PRIMARY KEY,
  from_user_id    VARCHAR(36)   NOT NULL,
  target_user_id  VARCHAR(36)   NOT NULL,
  target_type     ENUM('lawyer', 'firm') NOT NULL,
  score           TINYINT       NOT NULL,
  comment         TEXT,
  proceso_id      VARCHAR(36)   NOT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),

  -- One rating per (client, target, type)
  UNIQUE KEY uk_rating (from_user_id, target_user_id, target_type),

  CONSTRAINT fk_rating_from    FOREIGN KEY (from_user_id)   REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_rating_target  FOREIGN KEY (target_user_id) REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_rating_proceso FOREIGN KEY (proceso_id)     REFERENCES procesos(id) ON DELETE CASCADE,

  INDEX idx_ratings_target (target_user_id, target_type),
  INDEX idx_ratings_from   (from_user_id)
);
