-- Acceptance / expiry cycle for community post case-taking
ALTER TABLE posts
  ADD COLUMN taken_by_user_id  VARCHAR(36) NULL,            -- users.id del abogado que tomó el caso
  ADD COLUMN taken_expires_at  TIMESTAMP   NULL,            -- 48h window para que el cliente decida
  ADD COLUMN client_accepted   TINYINT     NULL;            -- NULL=pendiente, 1=aceptó, 0=rechazó
