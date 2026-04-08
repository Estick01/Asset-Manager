ALTER TABLE users
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE lawyer_profiles
  ADD COLUMN professional_verification_status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  ADD COLUMN professional_reviewed_at TIMESTAMP NULL,
  ADD COLUMN professional_reviewed_by VARCHAR(36) NULL,
  ADD COLUMN professional_review_notes TEXT NULL;

CREATE TABLE email_verification_otps (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_verification_otps_user_id ON email_verification_otps(user_id);
CREATE INDEX idx_email_verification_otps_expires_at ON email_verification_otps(expires_at);
CREATE INDEX idx_lawyer_profiles_verification_status ON lawyer_profiles(professional_verification_status);
