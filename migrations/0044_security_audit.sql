-- Security audit log
CREATE TABLE IF NOT EXISTS security_events (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  ip          VARCHAR(45)  NOT NULL,
  user_agent  VARCHAR(500),
  event_type  VARCHAR(32)  NOT NULL,
  success     BOOLEAN      NOT NULL DEFAULT FALSE,
  metadata    TEXT,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sec_email     (email),
  INDEX idx_sec_ip        (ip),
  INDEX idx_sec_type      (event_type),
  INDEX idx_sec_created   (created_at)
);
