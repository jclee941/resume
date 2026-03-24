-- Migration: 0001_create_resume_tables.down
-- Description: Drops the normalized resume tables for Supabase
-- Author: supabase-ssot-migration

DROP TABLE IF EXISTS resume_oss_contributions;
DROP TABLE IF EXISTS resume_infrastructure;
DROP TABLE IF EXISTS resume_languages;
DROP TABLE IF EXISTS resume_personal_projects;
DROP TABLE IF EXISTS resume_skills;
DROP TABLE IF EXISTS resume_skill_categories;
DROP TABLE IF EXISTS resume_certifications;
DROP TABLE IF EXISTS resume_projects;
DROP TABLE IF EXISTS resume_careers;
DROP TABLE IF EXISTS resume_profiles;
