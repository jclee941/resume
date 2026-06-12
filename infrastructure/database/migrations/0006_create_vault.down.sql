DROP POLICY IF EXISTS vault_access_log_service_role_only ON vault.access_log;
DROP POLICY IF EXISTS vault_secrets_service_role_only ON vault.secrets;

DROP TRIGGER IF EXISTS trg_vault_secrets_updated_at ON vault.secrets;

DROP FUNCTION IF EXISTS vault.set_secret(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS vault.get_secrets(TEXT[]);
DROP FUNCTION IF EXISTS vault.get_secret(TEXT);
DROP FUNCTION IF EXISTS vault.log_access(UUID, TEXT, TEXT, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS vault.touch_updated_at();

DROP TABLE IF EXISTS vault.access_log;
DROP TABLE IF EXISTS vault.secrets;

DROP SCHEMA IF EXISTS vault;
