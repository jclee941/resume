-- Rollback: 0005_add_resume_sync_tables
-- Drops tables created by the up migration

DROP TABLE IF EXISTS profile_syncs;
DROP TABLE IF EXISTS resumes;
