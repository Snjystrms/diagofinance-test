-- Migration: Create user_distribution table
-- Description: Stores user distribution data with sponsor ID chains
-- Date: 2024

CREATE TABLE IF NOT EXISTS `user_distribution` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `users_id` BIGINT UNSIGNED NOT NULL,
  `sponsor_id_chains` TEXT NULL COMMENT 'JSON array or comma-separated string of sponsor IDs in the chain',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_id` (`users_id`),
  CONSTRAINT `fk_user_distribution_users_id` 
    FOREIGN KEY (`users_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alternative: If using JSON column type (MySQL 5.7.8+)
-- `sponsor_id_chains` JSON NULL COMMENT 'Array of sponsor IDs in the chain'

-- Example data structure for sponsor_id_chains:
-- JSON format: ["sponsor1", "sponsor2", "sponsor3"]
-- Or comma-separated: "sponsor1,sponsor2,sponsor3"


