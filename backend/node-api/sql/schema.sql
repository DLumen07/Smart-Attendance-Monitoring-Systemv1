-- Minimal PostgreSQL schema for Smart Attendance Node API
-- Use this to create the initial users table used by the auth routes

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student',
  parent_name VARCHAR(255) NULL,
  parent_email VARCHAR(255) NULL,
  parent_phone VARCHAR(50) NULL,
  reset_code VARCHAR(12) NULL,
  reset_code_expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
