-- Track unique views per user per post
CREATE TABLE post_views (
  post_id   VARCHAR(36) NOT NULL,
  user_id   VARCHAR(36) NOT NULL,
  viewed_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id)
);
