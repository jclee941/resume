-- Migration: 0003_create_indexes_and_triggers.down
-- Description: Drops indexes, updated_at triggers, and trigger function for resume tables
-- Author: supabase-ssot-migration

DROP TRIGGER IF EXISTS set_updated_at ON resume_oss_contributions;
DROP TRIGGER IF EXISTS set_updated_at ON resume_infrastructure;
DROP TRIGGER IF EXISTS set_updated_at ON resume_languages;
DROP TRIGGER IF EXISTS set_updated_at ON resume_personal_projects;
DROP TRIGGER IF EXISTS set_updated_at ON resume_skills;
DROP TRIGGER IF EXISTS set_updated_at ON resume_skill_categories;
DROP TRIGGER IF EXISTS set_updated_at ON resume_certifications;
DROP TRIGGER IF EXISTS set_updated_at ON resume_projects;
DROP TRIGGER IF EXISTS set_updated_at ON resume_careers;
DROP TRIGGER IF EXISTS set_updated_at ON resume_profiles;

DROP INDEX IF EXISTS idx_resume_personal_projects_metrics;
DROP INDEX IF EXISTS idx_resume_projects_metrics;
DROP INDEX IF EXISTS idx_resume_profiles_achievements;
DROP INDEX IF EXISTS idx_resume_profiles_contact;
DROP INDEX IF EXISTS idx_resume_profiles_hero;
DROP INDEX IF EXISTS idx_resume_profiles_summary;
DROP INDEX IF EXISTS idx_resume_profiles_education;
DROP INDEX IF EXISTS idx_resume_profiles_personal;

DROP INDEX IF EXISTS idx_resume_oss_contributions_display_order;
DROP INDEX IF EXISTS idx_resume_oss_contributions_resume_id;
DROP INDEX IF EXISTS idx_resume_infrastructure_display_order;
DROP INDEX IF EXISTS idx_resume_infrastructure_resume_id;
DROP INDEX IF EXISTS idx_resume_languages_display_order;
DROP INDEX IF EXISTS idx_resume_languages_resume_id;
DROP INDEX IF EXISTS idx_resume_personal_projects_display_order;
DROP INDEX IF EXISTS idx_resume_personal_projects_resume_id;
DROP INDEX IF EXISTS idx_resume_skills_display_order;
DROP INDEX IF EXISTS idx_resume_skills_category_id;
DROP INDEX IF EXISTS idx_resume_skill_categories_display_order;
DROP INDEX IF EXISTS idx_resume_skill_categories_resume_id;
DROP INDEX IF EXISTS idx_resume_certifications_display_order;
DROP INDEX IF EXISTS idx_resume_certifications_resume_id;
DROP INDEX IF EXISTS idx_resume_projects_display_order;
DROP INDEX IF EXISTS idx_resume_projects_career_id;
DROP INDEX IF EXISTS idx_resume_projects_resume_id;
DROP INDEX IF EXISTS idx_resume_careers_display_order;
DROP INDEX IF EXISTS idx_resume_careers_resume_id;

DROP FUNCTION IF EXISTS update_updated_at_column();
