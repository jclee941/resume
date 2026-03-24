-- Migration: 0003_create_indexes_and_triggers
-- Description: Creates indexes and updated_at triggers for resume tables
-- Author: supabase-ssot-migration

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON resume_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON resume_careers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON resume_projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON resume_certifications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON resume_skill_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON resume_skills
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON resume_personal_projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON resume_languages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON resume_infrastructure
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON resume_oss_contributions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_resume_careers_resume_id ON resume_careers(resume_id);
CREATE INDEX idx_resume_careers_display_order ON resume_careers(display_order);
CREATE INDEX idx_resume_projects_resume_id ON resume_projects(resume_id);
CREATE INDEX idx_resume_projects_career_id ON resume_projects(career_id);
CREATE INDEX idx_resume_projects_display_order ON resume_projects(display_order);
CREATE INDEX idx_resume_certifications_resume_id ON resume_certifications(resume_id);
CREATE INDEX idx_resume_certifications_display_order ON resume_certifications(display_order);
CREATE INDEX idx_resume_skill_categories_resume_id ON resume_skill_categories(resume_id);
CREATE INDEX idx_resume_skill_categories_display_order ON resume_skill_categories(display_order);
CREATE INDEX idx_resume_skills_category_id ON resume_skills(category_id);
CREATE INDEX idx_resume_skills_display_order ON resume_skills(display_order);
CREATE INDEX idx_resume_personal_projects_resume_id ON resume_personal_projects(resume_id);
CREATE INDEX idx_resume_personal_projects_display_order ON resume_personal_projects(display_order);
CREATE INDEX idx_resume_languages_resume_id ON resume_languages(resume_id);
CREATE INDEX idx_resume_languages_display_order ON resume_languages(display_order);
CREATE INDEX idx_resume_infrastructure_resume_id ON resume_infrastructure(resume_id);
CREATE INDEX idx_resume_infrastructure_display_order ON resume_infrastructure(display_order);
CREATE INDEX idx_resume_oss_contributions_resume_id ON resume_oss_contributions(resume_id);
CREATE INDEX idx_resume_oss_contributions_display_order ON resume_oss_contributions(display_order);

CREATE INDEX idx_resume_profiles_personal ON resume_profiles USING GIN (personal);
CREATE INDEX idx_resume_profiles_education ON resume_profiles USING GIN (education);
CREATE INDEX idx_resume_profiles_summary ON resume_profiles USING GIN (summary);
CREATE INDEX idx_resume_profiles_hero ON resume_profiles USING GIN (hero);
CREATE INDEX idx_resume_profiles_contact ON resume_profiles USING GIN (contact);
CREATE INDEX idx_resume_profiles_achievements ON resume_profiles USING GIN (achievements);
CREATE INDEX idx_resume_projects_metrics ON resume_projects USING GIN (metrics);
CREATE INDEX idx_resume_personal_projects_metrics ON resume_personal_projects USING GIN (metrics);
