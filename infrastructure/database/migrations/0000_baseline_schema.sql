-- Migration: 0000_baseline_schema
-- Captures the existing D1 schema as a baseline.
-- This migration is marked as applied automatically during init.

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  source TEXT,
  source_url TEXT,
  position TEXT,
  company TEXT,
  location TEXT,
  match_score INTEGER,
  status TEXT DEFAULT 'pending',
  priority TEXT,
  resume_id TEXT,
  cover_letter TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  applied_at TEXT
);

CREATE TABLE IF NOT EXISTS application_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL,
  status TEXT NOT NULL,
  previous_status TEXT,
  note TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  platform TEXT PRIMARY KEY,
  cookies TEXT,
  email TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profile_syncs (
  id TEXT PRIMARY KEY,
  platforms TEXT,
  profile_data TEXT,
  status TEXT DEFAULT 'pending',
  dry_run INTEGER DEFAULT 0,
  result TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_source ON applications(source);
CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);
CREATE INDEX IF NOT EXISTS idx_timeline_application_id ON application_timeline(application_id);
CREATE INDEX IF NOT EXISTS idx_profile_syncs_status ON profile_syncs(status);
CREATE INDEX IF NOT EXISTS idx_profile_syncs_created_at ON profile_syncs(created_at);
