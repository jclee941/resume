-- D1 Schema for Job Dashboard
-- Migration from JSON file-based storage

-- Applications table (main entity)
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  source TEXT NOT NULL,
  source_url TEXT,
  position TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  match_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  resume_id TEXT,
  cover_letter TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  applied_at TEXT
);

-- Timeline table (application status history)
CREATE TABLE IF NOT EXISTS application_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL,
  status TEXT NOT NULL,
  previous_status TEXT,
  note TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Sessions table (auth cookies per platform)
CREATE TABLE IF NOT EXISTS sessions (
  platform TEXT PRIMARY KEY,
  cookies TEXT,
  email TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Config table (key-value settings)
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_source ON applications(source);
CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);
CREATE INDEX IF NOT EXISTS idx_timeline_application_id ON application_timeline(application_id);

-- Default config values
INSERT OR IGNORE INTO config (key, value, updated_at) VALUES 
  ('auto_apply_enabled', 'false', datetime('now')),
  ('max_daily_applications', '10', datetime('now')),
  ('min_match_score', '70', datetime('now'));

-- Profile sync tracking table
CREATE TABLE IF NOT EXISTS profile_syncs (
  id TEXT PRIMARY KEY,
  platforms TEXT NOT NULL,  -- JSON array of platforms
  profile_data TEXT NOT NULL,  -- JSON profile data from SSOT
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
  dry_run INTEGER DEFAULT 1,
  result TEXT,  -- JSON result from automation
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profile_syncs_status ON profile_syncs(status);
CREATE INDEX IF NOT EXISTS idx_profile_syncs_created_at ON profile_syncs(created_at);
