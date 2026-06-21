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
CREATE TABLE IF NOT EXISTS application_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL,
  status TEXT NOT NULL,
  previous_status TEXT,
  note TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  platform TEXT PRIMARY KEY,
  cookies TEXT,
  email TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_source ON applications(source);
CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);
CREATE INDEX IF NOT EXISTS idx_timeline_application_id ON application_timeline(application_id);
CREATE TABLE IF NOT EXISTS wanted_application_history (
  wanted_application_id TEXT PRIMARY KEY,
  wanted_job_id TEXT,
  status TEXT NOT NULL,
  position TEXT NOT NULL,
  company TEXT NOT NULL,
  source_url TEXT,
  resume_id TEXT,
  applied_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  raw_payload TEXT NOT NULL,
  synced_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wanted_application_history_status ON wanted_application_history(status);
CREATE INDEX IF NOT EXISTS idx_wanted_application_history_applied_at ON wanted_application_history(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_wanted_application_history_job ON wanted_application_history(wanted_job_id);
CREATE TABLE IF NOT EXISTS job_search_results (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_url TEXT,
  position TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  description TEXT,
  tech_stack TEXT,
  experience_level TEXT,
  match_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  crawled_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_search_results_status ON job_search_results(status);
CREATE INDEX IF NOT EXISTS idx_job_search_results_source ON job_search_results(source);
CREATE INDEX IF NOT EXISTS idx_job_search_results_crawled_at ON job_search_results(crawled_at);
INSERT OR IGNORE INTO config (key, value, updated_at) VALUES
  ('auto_apply_enabled', 'false', datetime('now')),
  ('max_daily_applications', '10', datetime('now')),
  ('min_match_score', '70', datetime('now')),
  ('auto_apply_config', '{"skills":[],"preferredCompanies":[],"excludeCompanies":[],"preferredLocations":[],"experienceYears":null,"minMatchScore":70}', datetime('now'));
CREATE TABLE IF NOT EXISTS profile_syncs (
  id TEXT PRIMARY KEY,
  platforms TEXT NOT NULL,
  profile_data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  dry_run INTEGER DEFAULT 1,
  result TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profile_syncs_status ON profile_syncs(status);
CREATE INDEX IF NOT EXISTS idx_profile_syncs_created_at ON profile_syncs(created_at);
CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  target_resume_id TEXT,
  source TEXT NOT NULL DEFAULT 'dashboard',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resumes_updated_at ON resumes(updated_at);
CREATE TABLE IF NOT EXISTS resume_sync_history (
  id TEXT PRIMARY KEY,
  resume_id TEXT NOT NULL,
  platforms TEXT NOT NULL,
  changes TEXT,
  status TEXT NOT NULL,
  backup_id TEXT,
  error TEXT,
  dry_run INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resume_sync_history_created_at ON resume_sync_history(created_at);
CREATE TABLE IF NOT EXISTS application_workflows (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'running',
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  jobs_found INTEGER DEFAULT 0,
  jobs_approved INTEGER DEFAULT 0,
  jobs_applied INTEGER DEFAULT 0,
  jobs_failed INTEGER DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_application_workflows_status ON application_workflows(status);
CREATE INDEX IF NOT EXISTS idx_application_workflows_trigger ON application_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_application_workflows_started ON application_workflows(started_at);
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  platform TEXT NOT NULL,
  match_score INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TEXT,
  notes TEXT,
  approval_metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workflow_id) REFERENCES application_workflows(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_workflow ON approval_requests(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_job ON approval_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created ON approval_requests(created_at);
CREATE TABLE IF NOT EXISTS workflow_logs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workflow_id) REFERENCES application_workflows(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_workflow ON workflow_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_step ON workflow_logs(step_name);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_created ON workflow_logs(created_at);

ALTER TABLE applications ADD COLUMN workflow_id TEXT REFERENCES application_workflows(id);
CREATE INDEX IF NOT EXISTS idx_applications_workflow ON applications(workflow_id);

CREATE TABLE IF NOT EXISTS notification_history (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  data TEXT NOT NULL,
  channels TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  results TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notification_history_event_type ON notification_history(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_timestamp ON notification_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
CREATE INDEX IF NOT EXISTS idx_notification_history_created ON notification_history(created_at);

ALTER TABLE applications ADD COLUMN approved_at TEXT;
ALTER TABLE applications ADD COLUMN rejected_at TEXT;
