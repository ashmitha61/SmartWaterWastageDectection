-- ============================================================================
-- RUN THIS IN MYSQL WORKBENCH AS 'root' TO GRANT PRIVILEGES TO job_portal_user
-- ============================================================================

CREATE DATABASE IF NOT EXISTS smart_waste_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON smart_waste_management.* TO 'job_portal_user'@'localhost';
GRANT ALL PRIVILEGES ON smart_waste_management.* TO 'job_portal_user'@'127.0.0.1';
FLUSH PRIVILEGES;

-- Verify access
SHOW GRANTS FOR 'job_portal_user'@'localhost';
