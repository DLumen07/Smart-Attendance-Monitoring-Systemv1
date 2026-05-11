-- Create core tables for classes, sessions, attendance

CREATE TABLE IF NOT EXISTS classes (
  id BIGSERIAL PRIMARY KEY,
  instructor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  join_code VARCHAR(12) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_schedules (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS class_members (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_name VARCHAR(120) NOT NULL,
  session_code VARCHAR(12) NOT NULL UNIQUE,
  attendance_mode VARCHAR(20) NOT NULL DEFAULT 'qr_or_code'
    CHECK (attendance_mode IN ('qr_or_code', 'manual_only')),
  status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method VARCHAR(10) NOT NULL CHECK (method IN ('qr', 'code', 'manual')),
  status VARCHAR(10) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'present', 'late', 'absent')),
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (session_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance_alerts (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(40) NOT NULL DEFAULT 'consecutive_absent_3',
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('email', 'sms')),
  status VARCHAR(10) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'skipped', 'failed')),
  error_message VARCHAR(255) NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, session_id, student_id, alert_type, channel)
);
