-- Seed data: Default configuration values
-- Run with: resume-cli db seed

INSERT OR IGNORE INTO config (key, value, updated_at)
VALUES
  ('auto_apply_enabled', 'false', datetime('now')),
  ('max_daily_applications', '10', datetime('now')),
  ('min_match_score', '70', datetime('now')),
  ('rate_limit_per_minute', '30', datetime('now')),
  ('default_resume_id', 'master', datetime('now')),
  ('notification_email', '', datetime('now'));
