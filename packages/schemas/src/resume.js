import { z } from 'zod';
import { koreanPhoneSchema, emailSchema } from './common.js';

/**
 * @resume/schemas/resume
 *
 * SCOPE — API boundary validation only.
 *
 * The CANONICAL resume validator is the JSON Schema at
 * `packages/data/resumes/master/resume_schema.json`, executed by
 * `tools/scripts/utils/validate-resume-data.js` and wired into the
 * `validate-data` CI job.
 *
 * These Zod schemas are intentionally MINIMAL and reflect the SSoT field
 * names (period strings, school/major, technologies, etc.) so they can be
 * used at HTTP boundaries (e.g. webhook payloads embedding resume slices,
 * MCP tool inputs accepting partial resume data).
 *
 * DO NOT expand these schemas to cover all 22 SSoT top-level keys — duplicate
 * validation against the same artifact creates drift. See:
 * docs/architecture/RESUME_SYNC_AUDIT_2026-04-29.md (Issue B).
 */

const periodStringSchema = z
  .string()
  .regex(
    /^(\d{4}\.\d{2}|\d{4})\s*[~\-–]\s*(\d{4}\.\d{2}|\d{4}|현재|Present|現在)$/,
    'must be "YYYY.MM ~ YYYY.MM" or "YYYY.MM ~ 현재/Present/現在"'
  );

const skillLevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert']);

export const resumeSkillItemSchema = z.object({
  name: z.string().min(1),
  level: skillLevelSchema.optional(),
  proficiency: z.number().int().min(0).max(100).optional(),
});

/**
 * Skills in SSoT are nested by category:
 *   { observability: { title, icon, items: [skillItem] }, cloud: {...}, ... }
 * Use `skillItemSchema` directly for flat skill arrays at API boundaries.
 */
export const resumeSkillCategorySchema = z.object({
  title: z.string().min(1),
  icon: z.string().optional(),
  items: z.array(resumeSkillItemSchema),
});

export const resumeCareerSchema = z.object({
  company: z.string().min(1),
  period: periodStringSchema,
  role: z.string().optional(),
  description: z.string().optional(),
});

export const resumeProjectSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  period: periodStringSchema.optional(),
  technologies: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const resumeCertificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1),
  date: z.string().min(1),
  expirationDate: z.string().nullable().optional(),
});

export const resumeEducationSchema = z.object({
  school: z.string().min(1),
  major: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
});

export const resumePersonalSchema = z.object({
  name: z.string().min(1),
  email: emailSchema,
  phone: koreanPhoneSchema.optional(),
  github: z.string().url().optional(),
  portfolio: z.string().url().optional(),
});

/**
 * Minimal resume slice for API payloads. Mirrors SSoT key names (`personal`,
 * `education`, NOT `profile`/`educations`). For full SSoT validation use the
 * JSON Schema validator instead.
 */
export const resumeSchema = z.object({
  personal: resumePersonalSchema,
  careers: z.array(resumeCareerSchema),
  projects: z.array(resumeProjectSchema).optional(),
  skills: z.array(resumeSkillItemSchema).optional(),
  certifications: z.array(resumeCertificationSchema).optional(),
  education: resumeEducationSchema.optional(),
});

// Backward-compat aliases — kept so any future API consumers that imported
// the old names continue to work after the field-name correction.
export const resumeProfileSchema = resumePersonalSchema;
export const resumeSkillSchema = resumeSkillItemSchema;
