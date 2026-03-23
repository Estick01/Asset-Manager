CREATE TABLE password_reset_otps (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  code        VARCHAR(6)   NOT NULL,
  expires_at  DATETIME     NOT NULL,
  is_used     BOOLEAN      NOT NULL DEFAULT FALSE,
  attempts    INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_user_id (user_id),
  INDEX idx_otp_expires (expires_at)
);
