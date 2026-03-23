-- client_requests: abogados/bufetes solicitan agregar un cliente
CREATE TABLE client_requests (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  from_user_id VARCHAR(36) NOT NULL,
  to_user_id   VARCHAR(36) NOT NULL,
  status ENUM('pending','accepted','rejected','expired') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMP NOT NULL,
  responded_at TIMESTAMP NULL,
  CONSTRAINT fk_cr_from   FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cr_to     FOREIGN KEY (to_user_id)   REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_cr_to      (to_user_id,   status),
  INDEX idx_cr_from_to (from_user_id, to_user_id, status)
);

-- app_notifications: notificaciones in-app genéricas (no requieren procesoId)
CREATE TABLE app_notifications (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  type       VARCHAR(50)  NOT NULL DEFAULT 'info',
  title      VARCHAR(255) NOT NULL,
  body       TEXT         NOT NULL,
  data       JSON,
  read_at    TIMESTAMP    NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_appnotif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_appnotif_user (user_id, read_at)
);

-- firm_clients: relación bufete-cliente (equivalente a lawyer_clients para bufetes)
CREATE TABLE firm_clients (
  id         VARCHAR(36) NOT NULL PRIMARY KEY,
  firm_id    VARCHAR(36) NOT NULL,
  client_id  VARCHAR(36) NOT NULL,
  status     ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_fc_firm   FOREIGN KEY (firm_id)   REFERENCES firm_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_fc_client FOREIGN KEY (client_id) REFERENCES clientes(id)      ON DELETE CASCADE,
  UNIQUE KEY uk_fc (firm_id, client_id),
  INDEX idx_fc_firm   (firm_id,   status),
  INDEX idx_fc_client (client_id, status)
);
