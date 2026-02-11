-- Rollback: 0003_add_monitoring_tables

DROP INDEX IF EXISTS idx_health_check_details_check_id;
DROP INDEX IF EXISTS idx_health_check_details_service;
DROP INDEX IF EXISTS idx_metrics_snapshots_type;
DROP INDEX IF EXISTS idx_metrics_snapshots_timestamp;
DROP INDEX IF EXISTS idx_error_logs_timestamp;
DROP INDEX IF EXISTS idx_error_logs_category;
DROP INDEX IF EXISTS idx_error_logs_level;

DROP TABLE IF EXISTS health_check_details;
DROP TABLE IF EXISTS metrics_snapshots;
DROP TABLE IF EXISTS error_logs;
