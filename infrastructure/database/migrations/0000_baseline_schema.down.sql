-- Rollback: 0000_baseline_schema
-- WARNING: Drops all baseline tables. Data will be lost.

DROP INDEX IF EXISTS idx_profile_syncs_created_at;
DROP INDEX IF EXISTS idx_profile_syncs_status;
DROP INDEX IF EXISTS idx_timeline_application_id;
DROP INDEX IF EXISTS idx_applications_created_at;
DROP INDEX IF EXISTS idx_applications_company;
DROP INDEX IF EXISTS idx_applications_source;
DROP INDEX IF EXISTS idx_applications_status;

DROP TABLE IF EXISTS profile_syncs;
DROP TABLE IF EXISTS config;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS application_timeline;
DROP TABLE IF EXISTS applications;
