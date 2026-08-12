CREATE TABLE application_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  application_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(20) NULL,
  to_status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_status_history_application
    FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE,
  CONSTRAINT chk_status_history_from_status
    CHECK (from_status IS NULL OR from_status IN ('wishlist', 'applied', 'interview', 'offer', 'rejected')),
  CONSTRAINT chk_status_history_to_status
    CHECK (to_status IN ('wishlist', 'applied', 'interview', 'offer', 'rejected')),
  INDEX idx_status_history_application_changed (application_id, changed_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO application_status_history (application_id, from_status, to_status, changed_at)
SELECT id, NULL, status, created_at
FROM applications;
