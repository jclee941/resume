-- Rollback: 0004_add_sync_logs_table

DROP INDEX IF EXISTS idx_sync_logs_started_at;
DROP INDEX IF EXISTS idx_sync_logs_status;
DROP INDEX IF EXISTS idx_sync_logs_sync_type;

DROP TABLE IF EXISTS sync_logs;
