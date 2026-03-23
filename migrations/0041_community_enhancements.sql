-- ============================================================
-- Community Enhancements
-- ============================================================

-- 1. Add view count to posts
ALTER TABLE posts ADD COLUMN view_count INT NOT NULL DEFAULT 0;

-- 2. Post likes
CREATE TABLE post_likes (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  post_id     VARCHAR(36)  NOT NULL,
  user_id     VARCHAR(36)  NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE KEY  uq_post_like (post_id, user_id),
  INDEX       idx_likes_post (post_id),
  CONSTRAINT  fk_pl_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT  fk_pl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Post bookmarks
CREATE TABLE post_bookmarks (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  post_id     VARCHAR(36)  NOT NULL,
  user_id     VARCHAR(36)  NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE KEY  uq_bookmark (post_id, user_id),
  INDEX       idx_bookmarks_user (user_id),
  CONSTRAINT  fk_pb_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT  fk_pb_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Tags
CREATE TABLE tags (
  id    VARCHAR(36)  NOT NULL PRIMARY KEY,
  name  VARCHAR(50)  NOT NULL,
  slug  VARCHAR(50)  NOT NULL,
  UNIQUE KEY uq_tag_slug (slug)
);

-- 5. Post ↔ Tag relation
CREATE TABLE post_tags (
  post_id  VARCHAR(36) NOT NULL,
  tag_id   VARCHAR(36) NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  CONSTRAINT fk_pt_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_pt_tag  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);

-- 6. Post reports
CREATE TABLE post_reports (
  id               VARCHAR(36)   NOT NULL PRIMARY KEY,
  post_id          VARCHAR(36),
  comment_id       VARCHAR(36),
  reporter_user_id VARCHAR(36)   NOT NULL,
  reason           VARCHAR(50)   NOT NULL,
  detail           TEXT,
  created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
  INDEX idx_reports_post    (post_id),
  INDEX idx_reports_comment (comment_id),
  CONSTRAINT fk_pr_reporter FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Default tags
INSERT INTO tags (id, name, slug) VALUES
  (UUID(), 'Laboral',          'laboral'),
  (UUID(), 'Familia',          'familia'),
  (UUID(), 'Penal',            'penal'),
  (UUID(), 'Civil',            'civil'),
  (UUID(), 'Comercial',        'comercial'),
  (UUID(), 'Administrativo',   'administrativo'),
  (UUID(), 'Inmobiliario',     'inmobiliario'),
  (UUID(), 'Consulta general', 'consulta-general');
