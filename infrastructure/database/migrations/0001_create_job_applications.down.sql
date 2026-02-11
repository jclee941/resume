-- Rollback: 0001_create_job_applications

DROP INDEX IF EXISTS idx_job_applications_created_at;
DROP INDEX IF EXISTS idx_job_applications_status;
DROP INDEX IF EXISTS idx_job_applications_platform;

DROP TABLE IF EXISTS job_applications;
