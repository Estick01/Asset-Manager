-- Migration: add case_type, is_urgent, city to posts
ALTER TABLE posts
  ADD COLUMN case_type VARCHAR(50)  NULL         AFTER visibility,
  ADD COLUMN is_urgent TINYINT(1)   NOT NULL DEFAULT 0 AFTER case_type,
  ADD COLUMN city      VARCHAR(100) NULL         AFTER is_urgent;
