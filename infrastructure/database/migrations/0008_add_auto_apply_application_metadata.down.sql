DROP INDEX IF EXISTS idx_applications_auto_apply_action;
DROP INDEX IF EXISTS idx_applications_auto_apply_run;

ALTER TABLE applications DROP COLUMN apply_result;
ALTER TABLE applications DROP COLUMN approval_metadata;
ALTER TABLE applications DROP COLUMN decision_trace;
ALTER TABLE applications DROP COLUMN adapter_backed;
ALTER TABLE applications DROP COLUMN auto_apply_action;
ALTER TABLE applications DROP COLUMN auto_apply_dry_run;
ALTER TABLE applications DROP COLUMN auto_apply_run_id;
