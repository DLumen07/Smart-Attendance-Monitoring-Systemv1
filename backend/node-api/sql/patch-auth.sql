-- Patch existing users table for auth parity (parents + reset code fields)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS parent_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS year_level VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS program VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS section VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS student_id VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS reset_code VARCHAR(12) NULL,
  ADD COLUMN IF NOT EXISTS reset_code_expires_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NULL;

UPDATE users
SET approval_status = CASE
  WHEN role = 'instructor' THEN 'approved'
  ELSE 'approved'
END
WHERE approval_status IS NULL;

ALTER TABLE users
  ALTER COLUMN approval_status SET DEFAULT 'approved',
  ALTER COLUMN approval_status SET NOT NULL;

DO $$
DECLARE
  role_constraint_name text;
BEGIN
  SELECT c.conname
  INTO role_constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'users'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%role IN%'
  LIMIT 1;

  IF role_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', role_constraint_name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'users'
      AND c.conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('instructor', 'student', 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'users'
      AND c.conname = 'users_approval_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  target_type VARCHAR(60) NULL,
  target_id VARCHAR(60) NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
