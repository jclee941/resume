import { z } from 'zod';
import { koreanPhoneSchema, emailSchema, isoTimestampSchema } from './common.js';

export const skillLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

export const resumeSkillSchema = z.object({
  name: z.string().min(1),
  level: skillLevelSchema.optional(),
});

export const resumeCareerSchema = z.object({
  company: z.string().min(1),
  position: z.string().min(1),
  startDate: isoTimestampSchema,
  endDate: isoTimestampSchema.optional(),
  description: z.string().optional(),
});

export const resumeProjectSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  startDate: isoTimestampSchema,
  endDate: isoTimestampSchema.optional(),
  techStack: z.array(z.string()).optional(),
  description: z.string(),
});

export const resumeCertificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1),
  issueDate: isoTimestampSchema,
  expiryDate: isoTimestampSchema.optional(),
});

export const resumeEducationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  startDate: isoTimestampSchema,
  endDate: isoTimestampSchema.optional(),
});

export const resumeProfileSchema = z.object({
  name: z.string().min(1),
  email: emailSchema,
  phone: koreanPhoneSchema.optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
});

export const resumeSchema = z.object({
  profile: resumeProfileSchema,
  careers: z.array(resumeCareerSchema),
  projects: z.array(resumeProjectSchema),
  skills: z.array(resumeSkillSchema),
  certifications: z.array(resumeCertificationSchema).optional(),
  educations: z.array(resumeEducationSchema).optional(),
});
