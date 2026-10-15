-- Evara AI Database Schema
-- User Authentication & Anonymous / Registered Session-Based Symptom Tracking

CREATE DATABASE IF NOT EXISTS sakhiguide CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sakhiguide;

-- 1. Users table: authentication, credentials & preferences
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NULL,
  preferred_language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Sessions table: UUID identifiers; nullable user_id for optional guest/account tracking
CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY,
  user_id INT NULL,
  language VARCHAR(10) DEFAULT 'auto',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Messages table: transcript of conversation
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id),
  CONSTRAINT fk_messages_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Symptom reports table: structured clinical extraction per user turn
CREATE TABLE IF NOT EXISTS symptom_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  symptoms_json JSON,
  triage_level VARCHAR(20) DEFAULT 'self_care',
  suggested_specialist VARCHAR(50) DEFAULT 'gynecologist',
  summary_en TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_session (session_id),
  CONSTRAINT fk_reports_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Red flag events table: audit log for safety triggers
CREATE TABLE IF NOT EXISTS red_flag_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  matched_term VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_redflag_session (session_id),
  CONSTRAINT fk_redflag_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
