ALTER TABLE applications ADD COLUMN canonical_url TEXT;
ALTER TABLE job_search_results ADD COLUMN canonical_url TEXT;

CREATE TABLE IF NOT EXISTS health_check_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_type TEXT NOT NULL,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL,
  latency_ms REAL,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  escalation_level TEXT NOT NULL DEFAULT 'none',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_health_check_details_created_at ON health_check_details(created_at);
CREATE INDEX IF NOT EXISTS idx_health_check_details_check ON health_check_details(check_type, status);
