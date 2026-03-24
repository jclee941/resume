-- Rollback: 0004_tighten_grants
-- Description: Remove the SELECT grants added by 0004.
-- Note: The migration chain (0001-0003) defines no explicit grants.
--       Supabase platform defaults may separately provide broader access,
--       but this rollback only reverses what 0004 explicitly changed.

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'resume_profiles',
    'resume_careers',
    'resume_projects',
    'resume_certifications',
    'resume_skill_categories',
    'resume_skills',
    'resume_personal_projects',
    'resume_languages',
    'resume_infrastructure',
    'resume_oss_contributions'
  ]) LOOP
    EXECUTE format('REVOKE SELECT ON %I FROM anon', tbl);
    EXECUTE format('REVOKE SELECT ON %I FROM authenticated', tbl);
  END LOOP;
END $$;
