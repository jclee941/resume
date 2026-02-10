-- Migration: 0003_add_monitoring_tables
-- Description: Add error tracking and metrics persistence tables for monitoring
-- Date: 2026-02-10

-- Error logs table for structured error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  level TEXT NOT NULL DEFAULT 'error' CHECK (level IN ('error', 'warn', 'info')),
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  method TEXT,
  status_code INTEGER,
  client_ip TEXT,
  user_agent TEXT,
  country TEXT,
  colo TEXT,
  worker_version TEXT,
  context TEXT, -- JSON metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_url ON error_logs(url);

-- Metrics snapshots table for persisting in-memory metrics to D1
CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  snapshot_type TEXT NOT NULL DEFAULT 'periodic' CHECK (snapshot_type IN ('periodic', 'manual', 'shutdown')),
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  error_requests INTEGER NOT NULL DEFAULT 0,
  avg_response_time_ms REAL,
  p50_response_time_ms REAL,
  p95_response_time_ms REAL,
  p99_response_time_ms REAL,
  cache_hit_ratio REAL,
  web_vitals_lcp REAL,
  web_vitals_inp REAL,
  web_vitals_cls REAL,
  web_vitals_fcp REAL,
  web_vitals_ttfb REAL,
  top_countries TEXT, -- JSON: { "US": 100, "KR": 50 }
  top_colos TEXT, -- JSON: { "ICN": 80, "SFO": 40 }
  error_rate REAL,
  uptime_seconds REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_timestamp ON metrics_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_type ON metrics_snapshots(snapshot_type);

CREATE TABLE IF NOT EXISTS health_check_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  check_type TEXT NOT NULL CHECK (check_type IN ('http', 'd1', 'kv', 'overall')),
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  latency_ms REAL,
  error_message TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  escalation_level TEXT NOT NULL DEFAULT 'none' CHECK (escalation_level IN ('none', 'warning', 'critical', 'emergency')),
  metadata TEXT, -- JSON for extra context
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_health_check_details_timestamp ON health_check_details(timestamp);
CREATE INDEX IF NOT EXISTS idx_health_check_details_type ON health_check_details(check_type);
CREATE INDEX IF NOT EXISTS idx_health_check_details_status ON health_check_details(status);
