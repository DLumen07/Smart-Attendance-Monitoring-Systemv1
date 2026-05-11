-- Patch existing users table for auth parity (parents + reset code fields)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS reset_code VARCHAR(12) NULL,
  ADD COLUMN IF NOT EXISTS reset_code_expires_at TIMESTAMPTZ NULL;
