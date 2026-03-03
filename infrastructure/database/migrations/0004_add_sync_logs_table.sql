-- Migration: 0004_add_sync_logs_table
-- Description: Add sync_logs table for tracking queue batch processing and sync operations
-- Date: 2026-03-03

-- Sync logs table for tracking queue batch processing and sync operations
CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'pending')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at);
