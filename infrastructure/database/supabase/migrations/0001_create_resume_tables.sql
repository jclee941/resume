-- Migration: 0001_create_resume_tables
-- Description: Creates the normalized resume tables for Supabase
-- Author: supabase-ssot-migration

CREATE TABLE resume_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL DEFAULT 'ko',
  slug text NOT NULL UNIQUE,
  personal jsonb,
  education jsonb,
  military jsonb,
  summary jsonb,
  current_employment jsonb,
  career_gap jsonb,
  hero jsonb,
  section_descriptions jsonb,
  contact jsonb,
  achievements text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resume_careers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resume_profiles(id) ON DELETE CASCADE,
  company text NOT NULL,
  period text,
  start_date date,
  end_date date,
  duration text,
  project text,
  role text,
  client text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resume_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resume_profiles(id) ON DELETE CASCADE,
  career_id uuid REFERENCES resume_careers(id) ON DELETE SET NULL,
  period text,
  start_date date,
  end_date date,
  name text NOT NULL,
  client text,
  technologies text[] DEFAULT '{}',
  os text,
  role text,
  description text,
  metrics jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resume_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resume_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  issuer text,
  date text,
  expiration_date text,
  credential_id text,
  credential_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'preparing')),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resume_skill_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resume_profiles(id) ON DELETE CASCADE,
  key text NOT NULL,
  title text NOT NULL,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resume_id, key)
);

CREATE TABLE resume_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES resume_skill_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  level text NOT NULL DEFAULT 'intermediate' CHECK (level IN ('expert', 'advanced', 'intermediate')),
  proficiency integer CHECK (proficiency >= 0 AND proficiency <= 100),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resume_personal_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resume_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  period text,
  description text,
  technologies text[] DEFAULT '{}',
  icon text,
  tagline text,
  stars integer DEFAULT 0,
  language text,
  forks integer DEFAULT 0,
  github_url text,
  demo_url text,
  metrics jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resume_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resume_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  level text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resume_infrastructure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resume_profiles(id) ON DELETE CASCADE,
  icon text,
  title text NOT NULL,
  description text,
  status text DEFAULT 'running' CHECK (status IN ('running', 'stopped', 'maintenance')),
  url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resume_oss_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resume_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
