-- Migration: 0004_tighten_grants
-- Description: Restrict anon/authenticated to SELECT-only on resume tables
-- Reason: Initial setup granted ALL privileges; public roles should only read resume data

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
    EXECUTE format('REVOKE ALL ON %I FROM anon', tbl);
    EXECUTE format('REVOKE ALL ON %I FROM authenticated', tbl);
    EXECUTE format('GRANT SELECT ON %I TO anon', tbl);
    EXECUTE format('GRANT SELECT ON %I TO authenticated', tbl);
  END LOOP;
END $$;
