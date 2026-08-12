ALTER TABLE applications
  ADD COLUMN next_action VARCHAR(240) NULL AFTER notes,
  ADD COLUMN follow_up_at DATE NULL AFTER next_action,
  ADD INDEX idx_applications_follow_up_at (follow_up_at, id);
