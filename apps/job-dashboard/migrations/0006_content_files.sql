-- Personal resume/portfolio content lives here instead of git (ADR 0011).
-- One row per repo-relative POSIX path; the content CLI materializes rows at build time.
CREATE TABLE IF NOT EXISTS content_files (
  path TEXT PRIMARY KEY,
  body BLOB NOT NULL,
  sha256 TEXT NOT NULL,
  size INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_content_files_updated_at ON content_files(updated_at);
