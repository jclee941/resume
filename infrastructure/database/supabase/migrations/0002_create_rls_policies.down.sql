-- Migration: 0002_create_rls_policies.down
-- Description: Drops row level security policies and disables RLS for resume tables
-- Author: supabase-ssot-migration

DROP POLICY IF EXISTS "Allow public read access" ON resume_oss_contributions;
ALTER TABLE resume_oss_contributions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON resume_infrastructure;
ALTER TABLE resume_infrastructure DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON resume_languages;
ALTER TABLE resume_languages DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON resume_personal_projects;
ALTER TABLE resume_personal_projects DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON resume_skills;
ALTER TABLE resume_skills DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON resume_skill_categories;
ALTER TABLE resume_skill_categories DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON resume_certifications;
ALTER TABLE resume_certifications DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON resume_projects;
ALTER TABLE resume_projects DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON resume_careers;
ALTER TABLE resume_careers DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON resume_profiles;
ALTER TABLE resume_profiles DISABLE ROW LEVEL SECURITY;
