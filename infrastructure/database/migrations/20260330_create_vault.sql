CREATE SCHEMA IF NOT EXISTS vault;

CREATE TABLE IF NOT EXISTS vault.secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  secret TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'platform_auth',
    'ci_cd',
    'monitoring',
    'cloud',
    'notification',
    'infra'
  )),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  CONSTRAINT secrets_name_version_unique UNIQUE (name, version)
);

CREATE TABLE IF NOT EXISTS vault.access_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  secret_id UUID,
  secret_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('get_secret', 'get_secrets', 'set_secret')),
  success BOOLEAN NOT NULL,
  actor_role TEXT NOT NULL DEFAULT current_user,
  actor_sub TEXT,
  error_message TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_secrets_active_name
  ON vault.secrets (name)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_vault_secrets_category
  ON vault.secrets (category);

CREATE INDEX IF NOT EXISTS idx_vault_access_log_secret_name
  ON vault.access_log (secret_name);

CREATE INDEX IF NOT EXISTS idx_vault_access_log_accessed_at
  ON vault.access_log (accessed_at DESC);

ALTER TABLE vault.secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault.secrets FORCE ROW LEVEL SECURITY;

ALTER TABLE vault.access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault.access_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vault_secrets_service_role_only ON vault.secrets;
CREATE POLICY vault_secrets_service_role_only
  ON vault.secrets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS vault_access_log_service_role_only ON vault.access_log;
CREATE POLICY vault_access_log_service_role_only
  ON vault.access_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON SCHEMA vault FROM PUBLIC;
REVOKE ALL ON SCHEMA vault FROM anon;
REVOKE ALL ON SCHEMA vault FROM authenticated;

REVOKE ALL ON TABLE vault.secrets FROM PUBLIC;
REVOKE ALL ON TABLE vault.secrets FROM anon;
REVOKE ALL ON TABLE vault.secrets FROM authenticated;

REVOKE ALL ON TABLE vault.access_log FROM PUBLIC;
REVOKE ALL ON TABLE vault.access_log FROM anon;
REVOKE ALL ON TABLE vault.access_log FROM authenticated;

GRANT USAGE ON SCHEMA vault TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE vault.secrets TO service_role;
GRANT SELECT, INSERT ON TABLE vault.access_log TO service_role;

CREATE OR REPLACE FUNCTION vault.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vault_secrets_updated_at ON vault.secrets;
CREATE TRIGGER trg_vault_secrets_updated_at
BEFORE UPDATE ON vault.secrets
FOR EACH ROW
EXECUTE FUNCTION vault.touch_updated_at();

CREATE OR REPLACE FUNCTION vault.log_access(
  p_secret_id UUID,
  p_secret_name TEXT,
  p_action TEXT,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, pg_catalog, public
AS $$
BEGIN
  INSERT INTO vault.access_log (
    secret_id,
    secret_name,
    action,
    success,
    actor_role,
    actor_sub,
    error_message
  )
  VALUES (
    p_secret_id,
    p_secret_name,
    p_action,
    p_success,
    current_user,
    current_setting('request.jwt.claim.sub', true),
    p_error_message
  );
END;
$$;

CREATE OR REPLACE FUNCTION vault.get_secret(secret_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, pg_catalog, public
AS $$
DECLARE
  v_secret_id UUID;
  v_secret TEXT;
BEGIN
  IF secret_name IS NULL OR btrim(secret_name) = '' THEN
    RAISE EXCEPTION 'secret_name must not be empty';
  END IF;

  SELECT s.id, s.secret
  INTO v_secret_id, v_secret
  FROM vault.secrets AS s
  WHERE s.name = secret_name
    AND s.is_active = true
  ORDER BY s.version DESC
  LIMIT 1;

  IF v_secret IS NULL THEN
    PERFORM vault.log_access(NULL, secret_name, 'get_secret', false, 'secret not found or inactive');
    RAISE EXCEPTION 'Secret not found or inactive: %', secret_name;
  END IF;

  PERFORM vault.log_access(v_secret_id, secret_name, 'get_secret', true, NULL);
  RETURN v_secret;
END;
$$;

CREATE OR REPLACE FUNCTION vault.get_secrets(secret_names TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, pg_catalog, public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF secret_names IS NULL OR array_length(secret_names, 1) IS NULL THEN
    RAISE EXCEPTION 'secret_names must not be empty';
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(s.name, s.secret),
    '{}'::jsonb
  )
  INTO v_result
  FROM (
    SELECT DISTINCT ON (name) name, secret, version
    FROM vault.secrets
    WHERE is_active = true
      AND name = ANY(secret_names)
    ORDER BY name, version DESC
  ) AS s;

  PERFORM vault.log_access(NULL, array_to_string(secret_names, ','), 'get_secrets', true, NULL);
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM vault.log_access(NULL, array_to_string(secret_names, ','), 'get_secrets', false, SQLERRM);
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION vault.set_secret(
  name TEXT,
  value TEXT,
  category TEXT,
  description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, pg_catalog, public
AS $$
DECLARE
  v_new_id UUID;
  v_next_version INTEGER;
BEGIN
  IF name IS NULL OR btrim(name) = '' THEN
    RAISE EXCEPTION 'name must not be empty';
  END IF;

  IF value IS NULL OR btrim(value) = '' THEN
    RAISE EXCEPTION 'value must not be empty';
  END IF;

  IF category IS NULL OR btrim(category) = '' THEN
    RAISE EXCEPTION 'category must not be empty';
  END IF;

  UPDATE vault.secrets
  SET is_active = false,
      rotated_at = now(),
      updated_at = now()
  WHERE vault.secrets.name = set_secret.name
    AND is_active = true;

  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_next_version
  FROM vault.secrets
  WHERE vault.secrets.name = set_secret.name;

  INSERT INTO vault.secrets (
    name,
    secret,
    description,
    category,
    version,
    is_active
  )
  VALUES (
    set_secret.name,
    set_secret.value,
    set_secret.description,
    set_secret.category,
    v_next_version,
    true
  )
  RETURNING id INTO v_new_id;

  PERFORM vault.log_access(v_new_id, set_secret.name, 'set_secret', true, NULL);
  RETURN v_new_id;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM vault.log_access(NULL, name, 'set_secret', false, SQLERRM);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION vault.touch_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION vault.touch_updated_at() FROM anon;
REVOKE ALL ON FUNCTION vault.touch_updated_at() FROM authenticated;

REVOKE ALL ON FUNCTION vault.log_access(UUID, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION vault.log_access(UUID, TEXT, TEXT, BOOLEAN, TEXT) FROM anon;
REVOKE ALL ON FUNCTION vault.log_access(UUID, TEXT, TEXT, BOOLEAN, TEXT) FROM authenticated;

REVOKE ALL ON FUNCTION vault.get_secret(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION vault.get_secret(TEXT) FROM anon;
REVOKE ALL ON FUNCTION vault.get_secret(TEXT) FROM authenticated;

REVOKE ALL ON FUNCTION vault.get_secrets(TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION vault.get_secrets(TEXT[]) FROM anon;
REVOKE ALL ON FUNCTION vault.get_secrets(TEXT[]) FROM authenticated;

REVOKE ALL ON FUNCTION vault.set_secret(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION vault.set_secret(TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION vault.set_secret(TEXT, TEXT, TEXT, TEXT) FROM authenticated;

GRANT EXECUTE ON FUNCTION vault.get_secret(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION vault.get_secrets(TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION vault.set_secret(TEXT, TEXT, TEXT, TEXT) TO service_role;
