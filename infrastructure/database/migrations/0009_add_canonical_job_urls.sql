ALTER TABLE applications ADD COLUMN canonical_url TEXT;

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

ALTER TABLE job_search_results ADD COLUMN canonical_url TEXT;
