-- Create firm_invitations table
-- This table stores invitations from firms to lawyers

CREATE TABLE IF NOT EXISTS firm_invitations (
    id VARCHAR(36) PRIMARY KEY,
    firm_id VARCHAR(36) NOT NULL,
    lawyer_id VARCHAR(36) NOT NULL,
    invitado_por VARCHAR(36) NOT NULL,
    status ENUM('pendiente', 'aceptada', 'rechazada', 'cancelada') NOT NULL DEFAULT 'pendiente',
    mensaje TEXT,
    motivo_rechazo TEXT,
    expires_at TIMESTAMP NULL,
    responded_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_firm_invitations_firm_id (firm_id),
    INDEX idx_firm_invitations_lawyer_id (lawyer_id),
    INDEX idx_firm_invitations_status (status),
    INDEX idx_firm_invitations_invitado_por (invitado_por),
    
    FOREIGN KEY (firm_id) REFERENCES firm_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (lawyer_id) REFERENCES lawyer_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (invitado_por) REFERENCES users(id) ON DELETE CASCADE
);
