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

CREATE INDEX IF NOT EXISTS idx_wanted_application_history_status
  ON wanted_application_history(status);
CREATE INDEX IF NOT EXISTS idx_wanted_application_history_applied_at
  ON wanted_application_history(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_wanted_application_history_job
  ON wanted_application_history(wanted_job_id);
