CREATE DATABASE IF NOT EXISTS smart_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_attendance;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('instructor','student') NOT NULL,
  parent_name VARCHAR(120) NULL,
  parent_email VARCHAR(190) NULL,
  parent_phone VARCHAR(40) NULL,
  reset_code VARCHAR(12) NULL,
  reset_code_expires_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  instructor_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  join_code VARCHAR(12) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_classes_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS class_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CONSTRAINT fk_schedules_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS class_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  student_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_class_student (class_id, student_id),
  CONSTRAINT fk_members_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_members_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  session_name VARCHAR(120) NOT NULL,
  session_code VARCHAR(12) NOT NULL UNIQUE,
  attendance_mode ENUM('qr_or_code','manual_only') NOT NULL DEFAULT 'qr_or_code',
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  student_id INT NOT NULL,
  method ENUM('qr','code','manual') NOT NULL,
  status ENUM('pending','present','late','absent') NOT NULL DEFAULT 'pending',
  checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  reviewed_by INT NULL,
  UNIQUE KEY uq_session_student (session_id, student_id),
  CONSTRAINT fk_attendance_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  session_id INT NOT NULL,
  student_id INT NOT NULL,
  alert_type VARCHAR(40) NOT NULL DEFAULT 'consecutive_absent_3',
  channel ENUM('email','sms') NOT NULL,
  status ENUM('sent','skipped','failed') NOT NULL DEFAULT 'sent',
  error_message VARCHAR(255) NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_alert (class_id, session_id, student_id, alert_type, channel),
  CONSTRAINT fk_alert_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_alert_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_alert_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
