ALTER TABLE conversations
  MODIFY COLUMN type ENUM('firm_lawyer', 'lawyer_client', 'community', 'direct', 'admin_support') NOT NULL;
