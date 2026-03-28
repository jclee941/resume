-- Migration: 0005_add_resume_sync_tables
-- Purpose: Create tables required by ProfileSyncHandler
--   - resumes: stores SSOT resume JSON data for profile sync lookups
--   - profile_syncs: tracks profile sync execution history

CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    target_resume_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profile_syncs (
    id TEXT PRIMARY KEY,
    platforms TEXT,
    profile_data TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    dry_run INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
