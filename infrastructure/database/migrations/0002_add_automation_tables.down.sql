-- Rollback: 0002_add_automation_tables

DROP INDEX IF EXISTS idx_resume_variants_job_id;
DROP INDEX IF EXISTS idx_resume_variants_company;
DROP INDEX IF EXISTS idx_platform_sessions_platform;
DROP INDEX IF EXISTS idx_job_matches_status;
DROP INDEX IF EXISTS idx_job_matches_run_id;
DROP INDEX IF EXISTS idx_automation_runs_status;
DROP INDEX IF EXISTS idx_automation_runs_platform;

DROP TABLE IF EXISTS resume_variants;
DROP TABLE IF EXISTS platform_sessions;
DROP TABLE IF EXISTS job_matches;
DROP TABLE IF EXISTS automation_runs;
