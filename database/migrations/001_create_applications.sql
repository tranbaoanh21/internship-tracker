CREATE TABLE IF NOT EXISTS applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company VARCHAR(120) NOT NULL,
  position VARCHAR(120) NOT NULL,
  job_url VARCHAR(2048) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'wishlist',
  applied_at DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT chk_applications_status
    CHECK (status IN ('wishlist', 'applied', 'interview', 'offer', 'rejected')),
  INDEX idx_applications_status (status),
  INDEX idx_applications_updated_at (updated_at),
  INDEX idx_applications_company_position (company, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
