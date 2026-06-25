ALTER TABLE applications ADD COLUMN auto_apply_run_id TEXT;
ALTER TABLE applications ADD COLUMN auto_apply_dry_run INTEGER DEFAULT 0;
ALTER TABLE applications ADD COLUMN auto_apply_action TEXT;
ALTER TABLE applications ADD COLUMN adapter_backed INTEGER DEFAULT 0;
ALTER TABLE applications ADD COLUMN decision_trace TEXT;
ALTER TABLE applications ADD COLUMN approval_metadata TEXT;
ALTER TABLE applications ADD COLUMN apply_result TEXT;

CREATE INDEX IF NOT EXISTS idx_applications_auto_apply_run ON applications(auto_apply_run_id);
CREATE INDEX IF NOT EXISTS idx_applications_auto_apply_action ON applications(auto_apply_action);
