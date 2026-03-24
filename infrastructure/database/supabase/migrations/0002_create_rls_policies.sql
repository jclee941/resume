-- Migration: 0002_create_rls_policies
-- Description: Enables row level security and public read policies for resume tables
-- Author: supabase-ssot-migration

ALTER TABLE resume_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON resume_profiles FOR SELECT USING (true);

ALTER TABLE resume_careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON resume_careers FOR SELECT USING (true);

ALTER TABLE resume_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON resume_projects FOR SELECT USING (true);

ALTER TABLE resume_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON resume_certifications FOR SELECT USING (true);

ALTER TABLE resume_skill_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON resume_skill_categories FOR SELECT USING (true);

ALTER TABLE resume_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON resume_skills FOR SELECT USING (true);

ALTER TABLE resume_personal_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON resume_personal_projects FOR SELECT USING (true);

ALTER TABLE resume_languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON resume_languages FOR SELECT USING (true);

ALTER TABLE resume_infrastructure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON resume_infrastructure FOR SELECT USING (true);

ALTER TABLE resume_oss_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON resume_oss_contributions FOR SELECT USING (true);
