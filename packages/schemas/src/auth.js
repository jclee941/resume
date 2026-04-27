import { z } from 'zod';
import { isoTimestampSchema, platformSchema } from './common.js';

export const adminLoginSchema = z.object({
  token: z.string().min(20),
});

export const platformSessionSchema = z.object({
  platform: platformSchema,
  cookies: z.string().min(1),
  token: z.string().optional(),
  email: z.string().email().optional(),
  expiresAt: z.number().int().positive(),
  refreshedAt: z.number().int().positive().optional(),
});

export const sessionStateSchema = z.object({
  userId: z.string().min(1),
  signedAt: isoTimestampSchema,
  expiresAt: z.number().int().positive(),
});
