ALTER TABLE applications
  ADD COLUMN archived_at TIMESTAMP(3) NULL AFTER updated_at,
  ADD INDEX idx_applications_active_status_updated (archived_at, status, updated_at, id),
  ADD INDEX idx_applications_active_follow_up (archived_at, follow_up_at, id);
